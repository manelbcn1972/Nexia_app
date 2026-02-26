import React, { useState, useEffect, useCallback } from 'react'
import { supabase } from '../utils/supabase'
import { MOODS, PHASES, TASK_TYPES, formatDate, getCravingColor, timeAgo } from '../utils/constants'
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

// ==================== HOME TAB ====================
function HomeTab({ patient, todayEntries, onSaveEntry }) {
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [mood, setMood] = useState('')
  const [craving, setCraving] = useState(3)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const phase = PHASES[patient?.current_phase || 0]
  const sobrietyDays = patient?.sobriety_start
    ? Math.floor((new Date() - new Date(patient.sobriety_start)) / 86400000)
    : 0

  const timeSlots = [
    { id: 'mañana', label: 'Mañana', emoji: '🌅', hours: '6:00 - 13:00' },
    { id: 'tarde', label: 'Tarde', emoji: '☀️', hours: '13:00 - 20:00' },
    { id: 'noche', label: 'Noche', emoji: '🌙', hours: '20:00 - 6:00' }
  ]

  const filledCount = Object.values(todayEntries).filter(Boolean).length

  async function handleSave() {
    if (!mood || !selectedSlot) return
    setSaving(true)
    await onSaveEntry({ mood, craving_level: craving, notes, time_of_day: selectedSlot })
    setSaving(false)
    setMood('')
    setCraving(3)
    setNotes('')
    setSelectedSlot(null)
  }

  return (
    <div className="fade-in">
      {/* Sobriety counter */}
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

      {/* Time slots overview */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-title" style={{ marginBottom: 12 }}>Registros de hoy ({filledCount}/3)</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {timeSlots.map(slot => {
            const entry = todayEntries[slot.id]
            const isSelected = selectedSlot === slot.id
            return (
              <button key={slot.id} onClick={() => !entry && setSelectedSlot(isSelected ? null : slot.id)}
                style={{
                  padding: '12px 8px', borderRadius: 12, border: isSelected ? '2px solid var(--accent)' : '2px solid var(--border)',
                  background: entry ? 'rgba(34, 197, 94, 0.1)' : isSelected ? 'rgba(99, 102, 241, 0.1)' : 'var(--bg-input)',
                  cursor: entry ? 'default' : 'pointer', textAlign: 'center', fontFamily: 'inherit',
                  opacity: entry ? 0.8 : 1, transition: 'all 0.2s'
                }}>
                <div style={{ fontSize: 24 }}>{entry ? '✅' : slot.emoji}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginTop: 4 }}>{slot.label}</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{slot.hours}</div>
                {entry && (
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
                    {MOODS.find(m => m.id === entry.mood)?.emoji} · {entry.craving_level}/10
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Check-in form for selected slot */}
      {selectedSlot && !todayEntries[selectedSlot] && (
        <div className="card fade-in">
          <div className="card-title" style={{ marginBottom: 16 }}>
            {timeSlots.find(s => s.id === selectedSlot)?.emoji} ¿Cómo te encuentras esta {selectedSlot}?
          </div>

          <div className="grid-3" style={{ gridTemplateColumns: 'repeat(5, 1fr)', marginBottom: 16 }}>
            {MOODS.map(m => (
              <button key={m.id} className={`mood-option ${mood === m.id ? 'selected' : ''}`} onClick={() => setMood(m.id)}>
                <span className="emoji">{m.emoji}</span>
                <span className="mood-label">{m.label}</span>
              </button>
            ))}
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span className="label" style={{ margin: 0 }}>Nivel de craving</span>
              <span style={{ fontSize: 20, fontWeight: 700, color: getCravingColor(craving) }}>{craving}</span>
            </div>
            <input
              type="range" min="0" max="10" value={craving}
              onChange={e => setCraving(Number(e.target.value))}
              className="craving-slider"
              style={{ background: `linear-gradient(to right, #22c55e, #eab308, #ef4444)` }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)' }}>
              <span>Sin craving</span><span>Máximo</span>
            </div>
          </div>

          <div className="field">
            <label className="label">Notas (opcional)</label>
            <textarea className="textarea" value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="¿Qué ha pasado? ¿Cómo te sientes?" rows={3} />
          </div>

          <button className="btn btn-primary btn-block" onClick={handleSave} disabled={!mood || saving}>
            {saving ? 'Guardando...' : `Guardar registro (${timeSlots.find(s => s.id === selectedSlot)?.label})`}
          </button>
        </div>
      )}

      {filledCount === 3 && (
        <div className="card" style={{ textAlign: 'center' }}>
          <IconCheck style={{ width: 32, height: 32, color: 'var(--success)', marginBottom: 8 }} />
          <div style={{ fontSize: 15, fontWeight: 600 }}>Todos los registros de hoy completados</div>
          <div style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>¡Gran trabajo! 💪</div>
        </div>
      )}
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

          {/* Mood history */}
          <div className="card">
            <div className="card-title" style={{ marginBottom: 12 }}>Historial de ánimo</div>
            {entries.slice(0, 10).map((entry, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 0', borderBottom: i < 9 ? '1px solid var(--border)' : 'none'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 24 }}>{MOODS.find(m => m.id === entry.mood)?.emoji || '❓'}</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>
                      {MOODS.find(m => m.id === entry.mood)?.label}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      Craving: {entry.craving_level}/10{entry.time_of_day ? ` · ${entry.time_of_day}` : ''}
                    </div>
                  </div>
                </div>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{formatDate(entry.created_at)}</span>
              </div>
            ))}
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
  const [todayEntries, setTodayEntries] = useState({ mañana: null, tarde: null, noche: null })
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

    // Check which time slots are filled today
    const today = new Date().toISOString().split('T')[0]
    const todayEnts = (ent || []).filter(e => e.created_at?.startsWith(today))
    setTodayEntries({
      mañana: todayEnts.find(e => e.time_of_day === 'mañana') || null,
      tarde: todayEnts.find(e => e.time_of_day === 'tarde') || null,
      noche: todayEnts.find(e => e.time_of_day === 'noche') || null
    })

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
    const { error } = await supabase.from('daily_entries').insert({
      patient_id: patient.id,
      time_of_day: data.time_of_day,
      mood: data.mood,
      craving_level: data.craving_level,
      notes: data.notes
    })
    if (!error) loadData()
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
        {tab === 'home' && <HomeTab patient={patient} todayEntries={todayEntries} onSaveEntry={handleSaveEntry} />}
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
