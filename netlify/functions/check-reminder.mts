// Nexia Recovery — Daily Check-in Reminder
// Scheduled: runs daily at 18:00 CET via Netlify Scheduled Functions
// Sends email to patients who haven't completed their daily check-in

import { schedule } from '@netlify/functions'

async function sendReminders() {
  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY
  const RESEND_KEY = process.env.RESEND_API_KEY
  const ALERT_FROM = process.env.ALERT_FROM_EMAIL || 'alertas@nexia.coach'

  if (!SUPABASE_URL || !SUPABASE_KEY || !RESEND_KEY) {
    console.error('Missing credentials')
    return { statusCode: 500, body: 'Config error' }
  }

  // Get today's date in ISO format
  const today = new Date().toISOString().split('T')[0]

  // Fetch all active patients
  const patientsRes = await fetch(`${SUPABASE_URL}/rest/v1/patients?select=id,name,email`, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`
    }
  })
  const patients = await patientsRes.json()

  if (!patients || patients.length === 0) {
    console.log('No patients found')
    return { statusCode: 200, body: 'No patients' }
  }

  // Fetch today's entries
  const entriesRes = await fetch(
    `${SUPABASE_URL}/rest/v1/daily_entries?created_at=gte.${today}T00:00:00&select=patient_id`,
    {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    }
  )
  const todayEntries = await entriesRes.json()
  const checkedInIds = new Set((todayEntries || []).map(e => e.patient_id))

  // Find patients who haven't checked in
  const missing = patients.filter(p => !checkedInIds.has(p.id))

  if (missing.length === 0) {
    console.log('All patients checked in today')
    return { statusCode: 200, body: 'All checked in' }
  }

  console.log(`${missing.length} patients haven't checked in: ${missing.map(p => p.name).join(', ')}`)

  // Send reminder to each
  let sent = 0
  for (const patient of missing) {
    if (!patient.email) continue

    const emailHtml = `
    <div style="font-family:-apple-system,sans-serif;max-width:500px;margin:0 auto;background:#1a202c;color:#e2e8f0;border-radius:12px;overflow:hidden;">
      <div style="background:#6366f1;padding:20px 24px;">
        <h1 style="margin:0;font-size:18px;color:white;">🕊️ Recordatorio Nexia</h1>
      </div>
      <div style="padding:24px;">
        <p style="font-size:15px;margin:0 0 16px;">Hola <strong>${patient.name}</strong>,</p>
        <p style="font-size:14px;color:#a0aec0;margin:0 0 16px;">
          Hoy aún no has registrado tu check-in diario E/A/C/N.
          Son solo 30 segundos y nos ayudan a acompañarte mejor.
        </p>
        <a href="https://nexia-adicciones.netlify.app" style="display:block;text-align:center;padding:14px;background:#6366f1;color:white;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;">
          Hacer mi check-in ahora
        </a>
        <p style="font-size:12px;color:#718096;margin:20px 0 0;text-align:center;">
          E — Emoción · A — Ánimo · C — Craving · N — Negociación
        </p>
      </div>
      <div style="padding:12px 24px;border-top:1px solid #2d3748;text-align:center;">
        <p style="margin:0;font-size:11px;color:#718096;">Nexia Recovery · Tu proceso importa 💪</p>
      </div>
    </div>`

    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${RESEND_KEY}`
        },
        body: JSON.stringify({
          from: ALERT_FROM,
          to: patient.email,
          subject: `🕊️ ${patient.name}, ¿cómo estás hoy?`,
          html: emailHtml
        })
      })
      sent++
      console.log(`Reminder sent to ${patient.name} (${patient.email})`)
    } catch (err) {
      console.error(`Failed to send to ${patient.name}:`, err)
    }
  }

  // Also notify therapist(s) about missing check-ins
  const ccEmails = process.env.ALERT_CC_EMAILS
    ? process.env.ALERT_CC_EMAILS.split(',').map(e => e.trim()).filter(Boolean)
    : []

  // Get all therapist emails
  const therapistsRes = await fetch(`${SUPABASE_URL}/rest/v1/therapists?select=email`, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`
    }
  })
  const therapists = await therapistsRes.json()
  const therapistEmails = [...new Set([...(therapists || []).map(t => t.email), ...ccEmails].filter(Boolean))]

  if (therapistEmails.length > 0) {
    const missingList = missing.map(p => `• ${p.name}`).join('\n')
    const therapistHtml = `
    <div style="font-family:-apple-system,sans-serif;max-width:500px;margin:0 auto;background:#1a202c;color:#e2e8f0;border-radius:12px;overflow:hidden;">
      <div style="background:#d69e2e;padding:16px 24px;">
        <h1 style="margin:0;font-size:16px;color:white;">🟡 Check-ins pendientes · ${today}</h1>
      </div>
      <div style="padding:24px;">
        <p style="font-size:14px;margin:0 0 12px;">${missing.length} paciente(s) no han hecho check-in hoy:</p>
        ${missing.map(p => `<div style="padding:6px 0;border-bottom:1px solid #2d3748;font-size:14px;">• ${p.name}</div>`).join('')}
        <p style="font-size:12px;color:#718096;margin:16px 0 0;">Se les ha enviado un recordatorio por email.</p>
      </div>
    </div>`

    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${RESEND_KEY}`
        },
        body: JSON.stringify({
          from: ALERT_FROM,
          to: therapistEmails,
          subject: `🟡 ${missing.length} check-in(s) pendiente(s) · ${today}`,
          html: therapistHtml
        })
      })
    } catch (err) {
      console.error('Failed to notify therapists:', err)
    }
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ missing: missing.length, sent })
  }
}

// Schedule: every day at 17:00 UTC = 18:00 CET
export const handler = schedule('0 17 * * *', sendReminders)
