// Nexia Recovery — Alert System
// Triggered by Supabase webhook on new daily_entry
// Evaluates risk rules and sends email to therapist via Resend

export async function handler(event) {
  // Only accept POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' }
  }

  try {
    const payload = JSON.parse(event.body)
    const entry = payload.record || payload

    // Validate we have the data we need
    if (!entry || !entry.patient_id) {
      return { statusCode: 400, body: 'Missing entry data' }
    }

    const SUPABASE_URL = process.env.VITE_SUPABASE_URL
    const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY
    const RESEND_KEY = process.env.RESEND_API_KEY
    const ALERT_FROM = process.env.ALERT_FROM_EMAIL || 'alertas@nexia.coach'

    if (!SUPABASE_URL || !SUPABASE_KEY) {
      console.error('Missing Supabase credentials')
      return { statusCode: 500, body: 'Config error' }
    }

    // Fetch patient + therapist info
    const patientRes = await fetch(`${SUPABASE_URL}/rest/v1/patients?id=eq.${entry.patient_id}&select=*`, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    })
    const patients = await patientRes.json()
    const patient = patients[0]

    if (!patient) {
      console.log('Patient not found')
      return { statusCode: 200, body: 'Patient not found' }
    }

    // Fetch therapist
    let therapistEmail = null
    if (patient.therapist_id) {
      const therapistRes = await fetch(`${SUPABASE_URL}/rest/v1/therapists?id=eq.${patient.therapist_id}&select=*`, {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`
        }
      })
      const therapists = await therapistRes.json()
      if (therapists[0]) {
        therapistEmail = therapists[0].email
      }
    }

    if (!therapistEmail) {
      // Fallback: get first therapist
      const fallbackRes = await fetch(`${SUPABASE_URL}/rest/v1/therapists?limit=1`, {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`
        }
      })
      const fallback = await fallbackRes.json()
      therapistEmail = fallback[0]?.email
    }

    if (!therapistEmail) {
      console.log('No therapist email found')
      return { statusCode: 200, body: 'No therapist email' }
    }

    // Fetch last 7 entries for pattern detection
    const entriesRes = await fetch(
      `${SUPABASE_URL}/rest/v1/daily_entries?patient_id=eq.${entry.patient_id}&order=created_at.desc&limit=7`,
      {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`
        }
      }
    )
    const recentEntries = await entriesRes.json()

    // ============ RISK RULES ============
    const alerts = []
    const craving = entry.craving_level || 0
    const animo = entry.mood_score || 5
    const negotiation = entry.negotiation || ''
    const hasNegotiation = negotiation && negotiation !== '(sin negociación detectada)'
    const emotionWord = entry.emotion_word || ''

    // Rule 1: High craving (≥7)
    if (craving >= 7) {
      alerts.push({
        level: craving >= 9 ? '🔴 CRÍTICO!!' : '🟠 ALTO',
        rule: 'Craving elevado',
        detail: `Nivel de craving: ${craving}/10`
      })
    }

    // Rule 2: Very low mood (≤2)
    if (animo <= 2) {
      alerts.push({
        level: '🟠 ALTO',
        rule: 'Ánimo muy bajo',
        detail: `Nivel de ánimo: ${animo}/10`
      })
    }

    // Rule 3: Active negotiation + medium craving
    if (hasNegotiation && craving >= 5) {
      alerts.push({
        level: '🟠 ALTO',
        rule: 'Negociación activa con craving',
        detail: `Negociación: "${negotiation}" — Craving: ${craving}/10`
      })
    }

    // Rule 4: Craving trending up (3 days consecutive increase)
    if (recentEntries.length >= 3) {
      const last3 = recentEntries.slice(0, 3)
      if (last3[0].craving_level > last3[1].craving_level && last3[1].craving_level > last3[2].craving_level) {
        alerts.push({
          level: '🟡 PATRÓN',
          rule: 'Craving en ascenso (3 días)',
          detail: `Tendencia: ${last3[2].craving_level} → ${last3[1].craving_level} → ${last3[0].craving_level}`
        })
      }
    }

    // Rule 5: High-risk emotions combined with medium+ craving
    const highRiskEmotions = ['vacio', 'soledad', 'culpa']
    if (highRiskEmotions.includes(emotionWord) && craving >= 5) {
      alerts.push({
        level: '🟡 ATENCIÓN',
        rule: 'Emoción de riesgo + craving',
        detail: `Emoción: ${emotionWord} — Craving: ${craving}/10`
      })
    }

    // No alerts? Exit
    if (alerts.length === 0) {
      console.log(`Check-in OK for ${patient.name} — no alerts`)
      return { statusCode: 200, body: 'No alerts triggered' }
    }

    // ============ BUILD EMAIL ============
    const maxLevel = alerts.some(a => a.level.includes('CRÍTICO')) ? '🔴 CRÍTICO'
      : alerts.some(a => a.level.includes('ALTO')) ? '🟠 ALTO'
      : '🟡 ATENCIÓN'

    const emotionDisplay = entry.emotion_word || '—'
    const today = new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })

    const alertRows = alerts.map(a =>
      `<tr>
        <td style="padding:8px 12px;border-bottom:1px solid #2d3748;font-size:14px;">${a.level}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #2d3748;font-size:14px;">${a.rule}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #2d3748;font-size:13px;color:#a0aec0;">${a.detail}</td>
      </tr>`
    ).join('')

    const emailHtml = `
    <div style="font-family:-apple-system,sans-serif;max-width:600px;margin:0 auto;background:#1a202c;color:#e2e8f0;border-radius:12px;overflow:hidden;">
      <div style="background:${maxLevel.includes('CRÍTICO') ? '#c53030' : maxLevel.includes('ALTO') ? '#dd6b20' : '#d69e2e'};padding:20px 24px;">
        <h1 style="margin:0;font-size:18px;color:white;">${maxLevel} — Alerta Nexia Recovery</h1>
        <p style="margin:4px 0 0;font-size:14px;color:rgba(255,255,255,0.85);">Paciente: <strong>${patient.name}</strong> · ${today}</p>
      </div>

      <div style="padding:24px;">
        <h2 style="font-size:15px;color:#a0aec0;margin:0 0 12px;">Check-in de hoy</h2>
        <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
          <tr>
            <td style="padding:8px;background:#2d3748;border-radius:8px 0 0 8px;text-align:center;width:25%;">
              <div style="font-size:11px;color:#a0aec0;">E · Emoción</div>
              <div style="font-size:15px;font-weight:600;margin-top:4px;">${emotionDisplay}</div>
            </td>
            <td style="padding:8px;background:#2d3748;text-align:center;width:25%;">
              <div style="font-size:11px;color:#a0aec0;">A · Ánimo</div>
              <div style="font-size:15px;font-weight:600;margin-top:4px;">${animo}/10</div>
            </td>
            <td style="padding:8px;background:#2d3748;text-align:center;width:25%;">
              <div style="font-size:11px;color:#a0aec0;">C · Craving</div>
              <div style="font-size:15px;font-weight:600;margin-top:4px;color:${craving >= 7 ? '#fc8181' : craving >= 5 ? '#f6e05e' : '#68d391'};">${craving}/10</div>
            </td>
            <td style="padding:8px;background:#2d3748;border-radius:0 8px 8px 0;text-align:center;width:25%;">
              <div style="font-size:11px;color:#a0aec0;">N · Negociación</div>
              <div style="font-size:13px;font-weight:500;margin-top:4px;">${hasNegotiation ? negotiation : '—'}</div>
            </td>
          </tr>
        </table>

        <h2 style="font-size:15px;color:#a0aec0;margin:0 0 8px;">Alertas detectadas</h2>
        <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
          ${alertRows}
        </table>

        <a href="https://nexia-adicciones.netlify.app" style="display:block;text-align:center;padding:12px;background:#6366f1;color:white;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px;">
          Abrir panel de ${patient.name}
        </a>
      </div>

      <div style="padding:16px 24px;border-top:1px solid #2d3748;text-align:center;">
        <p style="margin:0;font-size:11px;color:#718096;">Nexia Recovery · Sistema de alertas automáticas</p>
      </div>
    </div>`

    const emailSubject = `${maxLevel} ${patient.name} — Craving ${craving}/10${hasNegotiation ? ' + Negociación activa' : ''}`

    // ============ SEND EMAIL ============
    if (RESEND_KEY) {
      // Build recipients list: therapist + supervisor CC
      const ccEmails = process.env.ALERT_CC_EMAILS
        ? process.env.ALERT_CC_EMAILS.split(',').map(e => e.trim()).filter(Boolean)
        : []
      const allRecipients = [therapistEmail, ...ccEmails]

      const emailRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${RESEND_KEY}`
        },
        body: JSON.stringify({
          from: ALERT_FROM,
          to: allRecipients,
          subject: emailSubject,
          html: emailHtml
        })
      })

      const emailResult = await emailRes.json()
      console.log(`Alert email sent to ${allRecipients.join(', ')}:`, emailResult)
    } else {
      console.log('RESEND_API_KEY not configured — alert would have been:', emailSubject)
      console.log('Alerts:', JSON.stringify(alerts))
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ alerts: alerts.length, sent: !!RESEND_KEY })
    }

  } catch (err) {
    console.error('Alert function error:', err)
    return { statusCode: 500, body: err.message }
  }
}