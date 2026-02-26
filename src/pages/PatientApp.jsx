import React, { useState, useEffect, useCallback } from 'react'
import { supabase } from '../utils/supabase'
import { MOODS, EMOTIONS, NEGOTIATION_EXAMPLES, PHASES, TASK_TYPES, formatDate, getCravingColor, timeAgo } from '../utils/constants'
import { IconHome, IconTasks, IconChart, IconUser, IconAlert, IconCheck, IconClock, IconWind, IconPhone, IconLogout, IconX } from '../components/Icons'

// ==================== CRISIS MODE ====================
function CrisisMode({ onClose, contacts }) {
  const [seconds, setSeconds] = useState(1800) // 30 minutes
  const [step, setStep] = useState(0)

  const messages = [
    'Respira. Este momento va a pasar.',
    'Inhala 4 segundos... Mantén 4... Exhala 6...',
    'Estás aquí porque eres fuerte. Ya has resistido antes.',
    'No tienes que decidir nada ahora. Solo respira.',
    'Piensa en una persona que te importa. Visualiza su cara.',
    'El impulso es una ola. Sube, pero siempre baja.',
    '¿Puedes moverte? Camina unos pasos. Cambia de espacio.',
    'Recuerda por qué empezaste este camino.',
    'Ya llevas unos minutos resistiendo. Eso es una victoria.',
    'Cada segundo que pasa, el impulso se debilita.'
  ]

  useEffect(() => {
    const timer = setInterval(() => {
      setSeconds(s => {
        if (s <= 0) { clearInterval(timer); return 0 }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      setStep(s => (s + 1) % messages.length)
    }, 15000)
    return () => clearInterval(interval)
  }, [])

  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60

  return (
    <div className="crisis-overlay fade-in">
      <button onClick={onClose} style={{ position: 'absolute', top: 20, right: 20, background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
        <IconX style={{ width: 28, height: 28 }} />
      </button>

      <IconWind style={{ width: 48, height: 48, color: '#818cf8' }} />
      <div className="crisis-timer">
        {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
      </div>
      <p className="crisis-message fade-in" key={step}>{messages[step]}</p>

      {contacts && contacts.length > 0 && (
        <div style={{ marginTop: 40 }}>
          <p style={{ color: '#64748b', fontSize: 13, marginBottom: 12 }}>Contactos de emergencia</p>
          {contacts.map((c, i) => (
            <a key={i} href={`tel:${c.phone}`} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 20px', background: '#1e293b', borderRadius: 10,
              color: '#f1f5f9', textDecoration: 'none', marginBottom: 8
            }}>
              <IconPhone style={{ width: 18, height: 18 }} />
              <span>{c.name}</span>
            </a>
          ))}
        </div>
      )}
    </div>
  )
}

// ==================== HOME TAB — EACN CHECK-IN ====================
function HomeTab({ patient, todayEntry, onSaveEntry }) {
  const [emotion, setEmotion] = useState('')
  const [customEmotion, setCustomEmotion] = useState('')
  const [showCustom, setShowCustom] = useState(false)
  const [animo, setAnimo] = useState(5)
  const [craving, setCraving] = useState(3)
  const [negotiation, setNegotiation] = useState('')
  const [noNegotiation, setNoNegotiation] = useState(false)
  const [saving, setSaving] = useState(false)
  const [step, setStep] = useState(1)

  const phase = PHASES[patient?.current_phase || 0]
  const sobrietyDays = patient?.sobriety_start
    ? Math.floor((new Date() - new Date(patient.sobriety_start)) / 86400000)
    : 0

  const [placeholderIdx, setPlaceholderIdx] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setPlaceholderIdx(i => (i + 1) % NEGOTIATION_EXAMPLES.length), 4000)
    return () => clearInterval(t)
  }, [])

  const selectedEmotion = showCustom ? customEmotion : emotion

  async function handleSave() {
    if (!selectedEmotion) return
    setSaving(true)
    await onSaveEntry({
      mood: 'custom',
      craving_level: craving,
      animo_level: animo,
      emotion_word: selectedEmotion,
      negotiation: noNegotiation ? '(sin negociación detectada)' : negotiation,
      notes: ''
    })
    setSaving(false)
  }

  if (todayEntry) {
    const entryEmotion = EMOTIONS.find(e => e.id === todayEntry.emotion_word)
    return (
      <div className="fade-in">
        <div style={{
          background: 'linear-gradient(135deg, #312e81, #4338ca)',
          borderRadius: 'var(--radius)', padding: 28, textAlign: 'center', marginBottom: 16,
          boxShadow: '0 8px 32px rgba(67, 56, 202, 0.25)'
        }}>
          <div style={{ fontSize: 52, fontWeight: 700 }}>{sobrietyDays}</div>
          <div style={{ color: '#c7d2fe', fontSize: 15 }}>días de recuperación</div>
          <div style={{ marginTop: 12 }}>
            <span className="phase-badge" style={{ background: phase.color }}>{phase.name}</span>
          </div>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <IconCheck style={{ width: 32, height: 32, color: 'var(--success)', marginBottom: 8 }} />
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Check-in de hoy completado</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, textAlign: 'left' }}>
            <div style={{ background: 'var(--bg-primary)', borderRadius: 10, padding: 14 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>E · Emoción</div>
              <div style={{ fontSize: 15, fontWeight: 600 }}>
                {entryEmotion ? `${entryEmotion.emoji} ${entryEmotion.label}` : todayEntry.emotion_word || '—'}
              </div>
            </div>
            <div style={{ background: 'var(--bg-primary)', borderRadius: 10, padding: 14 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>A · Ánimo</div>
              <div style={{ fontSize: 15, fontWeight: 600 }}>{todayEntry.mood_score ?? todayEntry.animo_level ?? '—'}/10</div>
            </div>
            <div style={{ background: 'var(--bg-primary)', borderRadius: 10, padding: 14 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>C · Craving</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: getCravingColor(todayEntry.craving_level) }}>
                {todayEntry.craving_level}/10
              </div>
            </div>
            <div style={{ background: 'var(--bg-primary)', borderRadius: 10, padding: 14 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>N · Negociación</div>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{todayEntry.negotiation || '—'}</div>
            </div>
          </div>

          {/* WhatsApp share button */}
          {(() => {
            const emoLabel = entryEmotion ? `${entryEmotion.emoji} ${entryEmotion.label}` : (todayEntry.emotion_word || '—')
            const animoVal = todayEntry.mood_score ?? todayEntry.animo_level ?? '—'
            const msg = encodeURIComponent(
              `🕊️ Mi check-in de hoy\n\n` +
              `E: ${emoLabel}\n` +
              `A: ${animoVal}/10\n` +
              `C: ${todayEntry.craving_level}/10\n` +
              `N: ${todayEntry.negotiation || '—'}\n\n` +
              `#NexiaRecovery`
            )
            return (
              <a href={`https://api.whatsapp.com/send?text=${msg}`} target="_blank" rel="noopener noreferrer"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  marginTop: 16, padding: '12px', borderRadius: 10,
                  background: '#25D366', color: 'white', textDecoration: 'none',
                  fontSize: 14, fontWeight: 600
                }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                Compartir en WhatsApp
              </a>
            )
          })()}
        </div>
      </div>
    )
  }

  return (
    <div className="fade-in">
      <div style={{
        background: 'linear-gradient(135deg, #312e81, #4338ca)',
        borderRadius: 'var(--radius)', padding: 28, textAlign: 'center', marginBottom: 16,
        boxShadow: '0 8px 32px rgba(67, 56, 202, 0.25)'
      }}>
        <div style={{ fontSize: 52, fontWeight: 700 }}>{sobrietyDays}</div>
        <div style={{ color: '#c7d2fe', fontSize: 15 }}>días de recuperación</div>
        <div style={{ marginTop: 12 }}>
          <span className="phase-badge" style={{ background: phase.color }}>{phase.name}</span>
        </div>
      </div>

      <div className="card">
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 18, fontWeight: 700 }}>Check-in diario 🕊️</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
            E / A / C / N — 2 minutos para conectar contigo
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 24, justifyContent: 'center' }}>
          {['E', 'A', 'C', 'N'].map((letter, i) => (
            <button key={letter} onClick={() => { if (i + 1 < step || i + 1 === 1) setStep(i + 1) }} style={{
              width: 36, height: 36, borderRadius: '50%',
              border: step === i + 1 ? '2px solid var(--accent)' : '2px solid var(--border)',
              background: step > i + 1 ? 'var(--accent)' : step === i + 1 ? 'rgba(99,102,241,0.15)' : 'transparent',
              color: step > i + 1 ? 'white' : step === i + 1 ? 'var(--accent-light)' : 'var(--text-muted)',
              fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.3s'
            }}>
              {step > i + 1 ? '✓' : letter}
            </button>
          ))}
        </div>

        {step === 1 && (
          <div className="fade-in">
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>E · ¿Qué emoción predomina?</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>1 palabra real, no "bien" o "mal"</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
              {EMOTIONS.map(e => (
                <button key={e.id} onClick={() => { setEmotion(e.id); setShowCustom(false) }}
                  style={{
                    padding: '8px 14px', borderRadius: 20,
                    border: emotion === e.id && !showCustom ? '2px solid var(--accent)' : '2px solid var(--border)',
                    background: emotion === e.id && !showCustom ? 'rgba(99,102,241,0.15)' : 'var(--bg-primary)',
                    color: emotion === e.id && !showCustom ? 'var(--accent-light)' : 'var(--text-secondary)',
                    fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s',
                    display: 'flex', alignItems: 'center', gap: 6
                  }}>
                  <span>{e.emoji}</span> {e.label}
                </button>
              ))}
            </div>
            {!showCustom ? (
              <button onClick={() => { setShowCustom(true); setEmotion('') }}
                style={{ padding: '8px 14px', borderRadius: 20, fontSize: 13, border: '2px dashed var(--border)',
                  background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'inherit' }}>
                + otra emoción
              </button>
            ) : (
              <input type="text" value={customEmotion} onChange={e => setCustomEmotion(e.target.value)}
                placeholder="Escribe tu emoción..." autoFocus
                style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '2px solid var(--accent)',
                  background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: 14, fontFamily: 'inherit', outline: 'none' }} />
            )}
            <button onClick={() => selectedEmotion && setStep(2)} disabled={!selectedEmotion}
              style={{ marginTop: 20, width: '100%', padding: '12px', borderRadius: 10,
                background: selectedEmotion ? 'var(--accent)' : 'var(--border)',
                color: selectedEmotion ? 'white' : 'var(--text-muted)', border: 'none',
                fontSize: 14, fontWeight: 600, cursor: selectedEmotion ? 'pointer' : 'default', fontFamily: 'inherit' }}>
              Siguiente →
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="fade-in">
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>A · Ánimo</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 20 }}>Energía funcional para afrontar el día</div>
            <div style={{ textAlign: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 40, fontWeight: 700, color: animo <= 3 ? '#ef4444' : animo <= 6 ? '#eab308' : '#22c55e' }}>{animo}</span>
              <span style={{ fontSize: 16, color: 'var(--text-muted)' }}>/10</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <span style={{ fontSize: 20 }}>😩</span>
              <input type="range" min="0" max="10" value={animo} onChange={e => setAnimo(Number(e.target.value))}
                className="craving-slider" style={{ flex: 1, background: 'linear-gradient(to right, #ef4444, #eab308, #22c55e)' }} />
              <span style={{ fontSize: 20 }}>😊</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginBottom: 24 }}>
              <span>No puedo levantarme</span><span>Pleno</span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setStep(1)} style={{ flex: 1, padding: '12px', borderRadius: 10,
                background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-secondary)',
                fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>← Atrás</button>
              <button onClick={() => setStep(3)} style={{ flex: 2, padding: '12px', borderRadius: 10,
                background: 'var(--accent)', border: 'none', color: 'white', fontSize: 14, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'inherit' }}>Siguiente →</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="fade-in">
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>C · Craving</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 20 }}>
              Fuerza de la enfermedad: consumir, aislarse, evitar, huir, romper rutinas
            </div>
            <div style={{ textAlign: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 40, fontWeight: 700, color: getCravingColor(craving) }}>{craving}</span>
              <span style={{ fontSize: 16, color: 'var(--text-muted)' }}>/10</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <span style={{ fontSize: 20 }}>🟢</span>
              <input type="range" min="0" max="10" value={craving} onChange={e => setCraving(Number(e.target.value))}
                className="craving-slider" style={{ flex: 1, background: 'linear-gradient(to right, #22c55e, #eab308, #ef4444)' }} />
              <span style={{ fontSize: 20 }}>🔴</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>
              <span>Nada</span><span>Negociación clara</span><span>Consumiría</span>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 24 }}>
              <button onClick={() => setStep(2)} style={{ flex: 1, padding: '12px', borderRadius: 10,
                background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-secondary)',
                fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>← Atrás</button>
              <button onClick={() => setStep(4)} style={{ flex: 2, padding: '12px', borderRadius: 10,
                background: 'var(--accent)', border: 'none', color: 'white', fontSize: 14, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'inherit' }}>Siguiente →</button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="fade-in">
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>N · Negociación</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>¿Qué te estás negociando hoy?</div>
            {!noNegotiation && (
              <div style={{ position: 'relative', marginBottom: 12 }}>
                <div style={{ position: 'absolute', top: 12, left: 14, fontSize: 13,
                  color: 'var(--text-muted)', pointerEvents: 'none',
                  opacity: negotiation ? 0 : 0.6, transition: 'opacity 0.3s' }}>
                  "{NEGOTIATION_EXAMPLES[placeholderIdx]}"
                </div>
                <textarea value={negotiation} onChange={e => setNegotiation(e.target.value)} rows={2}
                  style={{ width: '100%', padding: '12px 14px', borderRadius: 10,
                    border: '2px solid var(--border)', background: 'var(--bg-primary)',
                    color: 'var(--text-primary)', fontSize: 14, fontFamily: 'inherit',
                    outline: 'none', resize: 'none' }}
                  onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border)'} />
              </div>
            )}
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0',
              cursor: 'pointer', fontSize: 13, color: 'var(--text-secondary)' }}>
              <input type="checkbox" checked={noNegotiation}
                onChange={e => { setNoNegotiation(e.target.checked); if (e.target.checked) setNegotiation('') }}
                style={{ width: 18, height: 18, accentColor: 'var(--accent)' }} />
              No detecto negociación hoy
            </label>
            <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
              <button onClick={() => setStep(3)} style={{ flex: 1, padding: '12px', borderRadius: 10,
                background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-secondary)',
                fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>← Atrás</button>
              <button onClick={handleSave} disabled={(!negotiation && !noNegotiation) || saving}
                style={{ flex: 2, padding: '12px', borderRadius: 10,
                  background: (negotiation || noNegotiation) && !saving ? '#22c55e' : 'var(--border)', border: 'none',
                  color: (negotiation || noNegotiation) ? 'white' : 'var(--text-muted)',
                  fontSize: 14, fontWeight: 600, cursor: (negotiation || noNegotiation) ? 'pointer' : 'default',
                  fontFamily: 'inherit' }}>
                {saving ? 'Guardando...' : '✓ Guardar check-in'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ==================== TASKS TAB ====================
function TasksTab({ tasks, onToggleTask }) {
  const pending = tasks.filter(t => t.status === 'pending')
  const completed = tasks.filter(t => t.status === 'completed')

  return (
    <div className="fade-in">
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>Mis tareas</h2>

      {pending.length === 0 && completed.length === 0 ? (
        <div className="empty-state">
          <IconTasks style={{ width: 48, height: 48 }} />
          <p style={{ marginTop: 8 }}>Tu terapeuta aún no te ha asignado tareas</p>
        </div>
      ) : (
        <>
          {pending.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <div className="label" style={{ marginBottom: 8 }}>Pendientes ({pending.length})</div>
              {pending.map(task => (
                <div key={task.id} className="task-item">
                  <button className="task-check" onClick={() => onToggleTask(task.id, 'completed')}>
                  </button>
                  <div className="task-content">
                    <div className="task-name">{task.description}</div>
                    <span className="task-type" style={{
                      background: TASK_TYPES.find(t => t.id === task.task_type)?.color || '#6366f1'
                    }}>
                      {TASK_TYPES.find(t => t.id === task.task_type)?.label || task.task_type}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {completed.length > 0 && (
            <div>
              <div className="label" style={{ marginBottom: 8 }}>Completadas ({completed.length})</div>
              {completed.map(task => (
                <div key={task.id} className="task-item" style={{ opacity: 0.6 }}>
                  <button className="task-check done" onClick={() => onToggleTask(task.id, 'pending')}>
                    <IconCheck style={{ width: 14, height: 14, color: 'white' }} />
                  </button>
                  <div className="task-content">
                    <div className="task-name done">{task.description}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ==================== PROGRESS TAB ====================
function ProgressTab({ entries }) {
  const last7 = entries.slice(0, 7).reverse()

  return (
    <div className="fade-in">
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>Mi progreso</h2>

      {entries.length === 0 ? (
        <div className="empty-state">
          <IconChart style={{ width: 48, height: 48 }} />
          <p style={{ marginTop: 8 }}>Registra tu estado diario para ver tu progreso</p>
        </div>
      ) : (
        <>
          {/* Craving chart - simple bar visualization */}
          <div className="card">
            <div className="card-title" style={{ marginBottom: 16 }}>Craving últimos 7 días</div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 120 }}>
              {last7.map((entry, i) => (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: getCravingColor(entry.craving_level) }}>
                    {entry.craving_level}
                  </span>
                  <div style={{
                    width: '100%', borderRadius: 4,
                    height: `${(entry.craving_level / 10) * 100}%`,
                    minHeight: 4,
                    background: getCravingColor(entry.craving_level),
                    transition: 'height 0.5s'
                  }} />
                  <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                    {formatDate(entry.created_at)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Historial EACN */}
          <div className="card">
            <div className="card-title" style={{ marginBottom: 12 }}>Historial de check-ins</div>
            {entries.slice(0, 10).map((entry, i) => {
              const emo = EMOTIONS.find(e => e.id === entry.emotion_word)
              return (
                <div key={i} style={{
                  padding: '12px 0', borderBottom: i < 9 ? '1px solid var(--border)' : 'none'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 20 }}>{emo?.emoji || '📝'}</span>
                      <span style={{ fontSize: 14, fontWeight: 600 }}>{emo?.label || entry.emotion_word || MOODS.find(m => m.id === entry.mood)?.label || '—'}</span>
                    </div>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{formatDate(entry.created_at)}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--text-secondary)' }}>
                    <span>A: {entry.mood_score ?? '—'}/10</span>
                    <span style={{ color: getCravingColor(entry.craving_level) }}>C: {entry.craving_level}/10</span>
                    {entry.negotiation && <span style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>N: {entry.negotiation.substring(0, 30)}{entry.negotiation.length > 30 ? '...' : ''}</span>}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

// ==================== PROFILE TAB ====================
function ProfileTab({ patient, session }) {
  const phase = PHASES[patient?.current_phase || 0]

  return (
    <div className="fade-in">
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{
          width: 72, height: 72, borderRadius: '50%',
          background: 'linear-gradient(135deg, #6366f1, #818cf8)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 12px', fontSize: 28, fontWeight: 700
        }}>
          {patient?.name?.[0]?.toUpperCase() || '?'}
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 700 }}>{patient?.name || 'Paciente'}</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{session.user.email}</p>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
          <span className="label" style={{ margin: 0 }}>Fase actual</span>
          <span className="phase-badge" style={{ background: phase.color }}>{phase.name}</span>
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{phase.description}</p>
      </div>

      {patient?.emergency_contacts && patient.emergency_contacts.length > 0 && (
        <div className="card">
          <div className="card-title" style={{ marginBottom: 12 }}>Contactos de emergencia</div>
          {patient.emergency_contacts.map((c, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0' }}>
              <span style={{ fontSize: 14 }}>{c.name}</span>
              <a href={`tel:${c.phone}`} style={{ color: 'var(--accent-light)', fontSize: 13 }}>{c.phone}</a>
            </div>
          ))}
        </div>
      )}

      <button className="btn btn-ghost btn-block" onClick={() => supabase.auth.signOut()} style={{ marginTop: 16 }}>
        <IconLogout style={{ width: 18, height: 18 }} /> Cerrar sesión
      </button>
    </div>
  )
}

// ==================== PATIENT APP SHELL ====================
export default function PatientApp({ session }) {
  const [tab, setTab] = useState('home')
  const [patient, setPatient] = useState(null)
  const [entries, setEntries] = useState([])
  const [tasks, setTasks] = useState([])
  const [todayEntry, setTodayEntry] = useState(null)
  const [showCrisis, setShowCrisis] = useState(false)

  const loadData = useCallback(async () => {
    // Load patient profile
    const { data: pat } = await supabase
      .from('patients')
      .select('*')
      .eq('user_id', session.user.id)
      .single()
    setPatient(pat)

    if (!pat) return

    // Load daily entries
    const { data: ent } = await supabase
      .from('daily_entries')
      .select('*')
      .eq('patient_id', pat.id)
      .order('created_at', { ascending: false })
      .limit(60)
    setEntries(ent || [])

    // Check if already checked in today
    const today = new Date().toISOString().split('T')[0]
    const todayEnt = (ent || []).find(e => e.created_at?.startsWith(today))
    setTodayEntry(todayEnt || null)

    // Load tasks
    const { data: tsk } = await supabase
      .from('therapy_tasks')
      .select('*')
      .eq('patient_id', pat.id)
      .order('created_at', { ascending: false })
    setTasks(tsk || [])
  }, [session])

  useEffect(() => { loadData() }, [loadData])

  async function handleSaveEntry(data) {
    const insertData = {
      patient_id: patient.id,
      mood: data.mood,
      craving_level: data.craving_level,
      mood_score: data.animo_level,
      emotion_word: data.emotion_word,
      negotiation: data.negotiation,
      notes: data.notes
    }
    const { error } = await supabase.from('daily_entries').insert(insertData)
    if (!error) {
      loadData()
      // Trigger alert check (fire and forget)
      try {
        fetch('/.netlify/functions/check-alert', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ record: insertData })
        })
      } catch (e) { /* silent */ }
    }
  }

  async function handleToggleTask(taskId, newStatus) {
    await supabase.from('therapy_tasks').update({
      status: newStatus,
      completed_at: newStatus === 'completed' ? new Date().toISOString() : null
    }).eq('id', taskId)
    loadData()
  }

  const tabs = [
    { id: 'home', label: 'Inicio', icon: IconHome },
    { id: 'tasks', label: 'Tareas', icon: IconTasks },
    { id: 'progress', label: 'Progreso', icon: IconChart },
    { id: 'profile', label: 'Perfil', icon: IconUser }
  ]

  return (
    <div className="app-shell">
      <div className="page">
        {tab === 'home' && <HomeTab patient={patient} todayEntry={todayEntry} onSaveEntry={handleSaveEntry} />}
        {tab === 'tasks' && <TasksTab tasks={tasks} onToggleTask={handleToggleTask} />}
        {tab === 'progress' && <ProgressTab entries={entries} />}
        {tab === 'profile' && <ProfileTab patient={patient} session={session} />}
      </div>

      {/* Crisis button */}
      <button className="crisis-btn" onClick={() => setShowCrisis(true)} title="Modo Crisis">
        <IconAlert style={{ width: 24, height: 24 }} />
      </button>

      {/* Bottom navigation */}
      <nav className="bottom-nav">
        {tabs.map(t => (
          <button key={t.id} className={`nav-item ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
            <t.icon />
            <span>{t.label}</span>
          </button>
        ))}
      </nav>

      {/* Crisis overlay */}
      {showCrisis && (
        <CrisisMode
          onClose={() => setShowCrisis(false)}
          contacts={patient?.emergency_contacts || []}
        />
      )}
    </div>
  )
}
