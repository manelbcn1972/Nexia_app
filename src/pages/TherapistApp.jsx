import React, { useState, useEffect, useCallback } from 'react'
import { supabase } from '../utils/supabase'
import { PHASES, MOODS, EMOTIONS, TASK_TYPES, formatDate, formatDateTime, getCravingColor } from '../utils/constants'
import { IconUsers, IconPlus, IconX, IconEdit, IconTrash, IconChart, IconTasks, IconAlert, IconLogout, IconMenu, IconCheck, IconPhone } from '../components/Icons'

// ==================== ADD PATIENT MODAL ====================
function AddPatientModal({ onClose, onSave }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [addiction, setAddiction] = useState('')
  const [phone, setPhone] = useState('')
  const [emergencyName, setEmergencyName] = useState('')
  const [emergencyPhone, setEmergencyPhone] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSave(e) {
    e.preventDefault()
    setError('')
    setSaving(true)

    // Save current therapist session before signUp changes it
    const { data: { session: therapistSession } } = await supabase.auth.getSession()

    // Create auth user for patient
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { role: 'patient' } }
    })

    if (authError) {
      setError(authError.message)
      setSaving(false)
      // Restore therapist session
      if (therapistSession) {
        await supabase.auth.setSession(therapistSession)
      }
      return
    }

    const newPatientUserId = authData.user.id

    // Restore therapist session so RLS allows the insert
    if (therapistSession) {
      await supabase.auth.setSession({
        access_token: therapistSession.access_token,
        refresh_token: therapistSession.refresh_token
      })
    }

    // Create patient record (now as therapist)
    const contacts = emergencyName ? [{ name: emergencyName, phone: emergencyPhone }] : []
    const { error: patError } = await supabase.from('patients').insert({
      user_id: newPatientUserId,
      name,
      email,
      phone,
      addiction_type: addiction,
      current_phase: 0,
      sobriety_start: new Date().toISOString(),
      emergency_contacts: contacts
    })

    if (patError) {
      setError(patError.message)
      setSaving(false)
      return
    }

    setSaving(false)
    onSave()
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 className="modal-title" style={{ margin: 0 }}>Nuevo paciente</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <IconX style={{ width: 20, height: 20 }} />
          </button>
        </div>

        <form onSubmit={handleSave}>
          <div className="field">
            <label className="label">Nombre completo *</label>
            <input className="input" value={name} onChange={e => setName(e.target.value)} required />
          </div>
          <div className="grid-2">
            <div className="field">
              <label className="label">Email (acceso app) *</label>
              <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div className="field">
              <label className="label">Contraseña inicial *</label>
              <input className="input" type="text" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
            </div>
          </div>
          <div className="grid-2">
            <div className="field">
              <label className="label">Tipo de adicción</label>
              <input className="input" value={addiction} onChange={e => setAddiction(e.target.value)} placeholder="Alcohol, sustancias, juego..." />
            </div>
            <div className="field">
              <label className="label">Teléfono</label>
              <input className="input" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+34 600..." />
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--border)', margin: '16px 0', paddingTop: 16 }}>
            <div className="label" style={{ marginBottom: 8 }}>Contacto de emergencia</div>
            <div className="grid-2">
              <div className="field">
                <input className="input" value={emergencyName} onChange={e => setEmergencyName(e.target.value)} placeholder="Nombre" />
              </div>
              <div className="field">
                <input className="input" value={emergencyPhone} onChange={e => setEmergencyPhone(e.target.value)} placeholder="Teléfono" />
              </div>
            </div>
          </div>

          {error && <div style={{ color: '#ef4444', fontSize: 13, marginBottom: 12 }}>{error}</div>}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Creando...' : 'Crear paciente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ==================== EDIT PATIENT MODAL ====================
function EditPatientModal({ patient, onClose, onSave }) {
  const [name, setName] = useState(patient.name || '')
  const [phone, setPhone] = useState(patient.phone || '')
  const [addiction, setAddiction] = useState(patient.addiction_type || '')
  const [sobrietyStart, setSobrietyStart] = useState(patient.sobriety_start ? patient.sobriety_start.substring(0, 10) : '')
  const [emergencyContacts, setEmergencyContacts] = useState(patient.emergency_contacts || [])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function addContact() {
    setEmergencyContacts([...emergencyContacts, { name: '', phone: '' }])
  }

  function updateContact(index, field, value) {
    const updated = [...emergencyContacts]
    updated[index] = { ...updated[index], [field]: value }
    setEmergencyContacts(updated)
  }

  function removeContact(index) {
    setEmergencyContacts(emergencyContacts.filter((_, i) => i !== index))
  }

  async function handleSave(e) {
    e.preventDefault()
    setError('')
    setSaving(true)

    const validContacts = emergencyContacts.filter(c => c.name && c.phone)

    const { error: updateError } = await supabase.from('patients').update({
      name,
      phone,
      addiction_type: addiction,
      sobriety_start: sobrietyStart ? new Date(sobrietyStart).toISOString() : patient.sobriety_start,
      emergency_contacts: validContacts
    }).eq('id', patient.id)

    if (updateError) {
      setError(updateError.message)
      setSaving(false)
      return
    }

    setSaving(false)
    onSave()
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 className="modal-title" style={{ margin: 0 }}>Editar paciente</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <IconX style={{ width: 20, height: 20 }} />
          </button>
        </div>

        {error && <div style={{ color: 'var(--danger)', marginBottom: 12, fontSize: 13 }}>{error}</div>}

        <form onSubmit={handleSave}>
          <div className="label">Nombre</div>
          <input className="input" value={name} onChange={e => setName(e.target.value)} required />

          <div className="label">Email</div>
          <input className="input" value={patient.email} disabled style={{ opacity: 0.5 }} />

          <div className="label">Teléfono</div>
          <input className="input" value={phone} onChange={e => setPhone(e.target.value)} />

          <div className="label">Tipo de adicción</div>
          <input className="input" value={addiction} onChange={e => setAddiction(e.target.value)} />

          <div className="label">Inicio sobriedad</div>
          <input className="input" type="date" value={sobrietyStart} onChange={e => setSobrietyStart(e.target.value)} />

          <div className="label" style={{ marginTop: 8 }}>Contactos de emergencia</div>
          {emergencyContacts.map((c, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <input className="input" placeholder="Nombre" value={c.name} onChange={e => updateContact(i, 'name', e.target.value)} style={{ flex: 1 }} />
              <input className="input" placeholder="Teléfono" value={c.phone} onChange={e => updateContact(i, 'phone', e.target.value)} style={{ flex: 1 }} />
              <button type="button" onClick={() => removeContact(i)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: 4 }}>
                <IconX style={{ width: 16, height: 16 }} />
              </button>
            </div>
          ))}
          <button type="button" className="btn btn-ghost btn-sm" onClick={addContact} style={{ marginBottom: 16 }}>
            + Añadir contacto
          </button>

          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" className="btn btn-primary" disabled={saving} style={{ flex: 1 }}>
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </button>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ==================== ADD TASK MODAL ====================
function AddTaskModal({ patientId, onClose, onSave, taskLibrary }) {
  const [description, setDescription] = useState('')
  const [taskType, setTaskType] = useState('conductual')
  const [priority, setPriority] = useState('normal')
  const [saving, setSaving] = useState(false)
  const [showLibrary, setShowLibrary] = useState(false)

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    const { error } = await supabase.from('therapy_tasks').insert({
      patient_id: patientId,
      description,
      task_type: taskType,
      priority,
      status: 'pending'
    })

    // Save to library for reuse
    if (!error) {
      const exists = taskLibrary.some(t => t.description === description)
      if (!exists) {
        await supabase.from('task_library').insert({ description, task_type: taskType })
      }
    }

    setSaving(false)
    if (!error) { onSave(); onClose() }
  }

  function selectFromLibrary(task) {
    setDescription(task.description)
    setTaskType(task.task_type)
    setShowLibrary(false)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 className="modal-title" style={{ margin: 0 }}>Nueva tarea</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <IconX style={{ width: 20, height: 20 }} />
          </button>
        </div>

        {taskLibrary.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowLibrary(!showLibrary)}>
              📋 Usar tarea existente ({taskLibrary.length})
            </button>
            {showLibrary && (
              <div style={{ marginTop: 8, maxHeight: 200, overflowY: 'auto' }}>
                {taskLibrary.map((t, i) => (
                  <button key={i} onClick={() => selectFromLibrary(t)} style={{
                    display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px',
                    background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 6,
                    color: 'var(--text-primary)', cursor: 'pointer', marginBottom: 4, fontFamily: 'inherit', fontSize: 13
                  }}>
                    {t.description}
                    <span className="task-type" style={{
                      background: TASK_TYPES.find(tt => tt.id === t.task_type)?.color || '#6366f1',
                      marginLeft: 8
                    }}>{t.task_type}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSave}>
          <div className="field">
            <label className="label">Descripción de la tarea *</label>
            <textarea className="textarea" value={description} onChange={e => setDescription(e.target.value)}
              placeholder="Ej: Registrar emoción tras logro laboral" required rows={3} />
          </div>
          <div className="grid-2">
            <div className="field">
              <label className="label">Tipo</label>
              <select className="select" value={taskType} onChange={e => setTaskType(e.target.value)}>
                {TASK_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </div>
            <div className="field">
              <label className="label">Prioridad</label>
              <select className="select" value={priority} onChange={e => setPriority(e.target.value)}>
                <option value="low">Baja</option>
                <option value="normal">Normal</option>
                <option value="high">Alta</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Guardando...' : 'Asignar tarea'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ==================== PATIENT DETAIL VIEW ====================
function PatientDetail({ patient, onBack, onRefresh }) {
  const [entries, setEntries] = useState([])
  const [tasks, setTasks] = useState([])
  const [taskLibrary, setTaskLibrary] = useState([])
  const [showAddTask, setShowAddTask] = useState(false)
  const [editPhase, setEditPhase] = useState(false)
  const [showEditPatient, setShowEditPatient] = useState(false)
  const [newPhase, setNewPhase] = useState(patient.current_phase)
  const [notes, setNotes] = useState('')
  const [savingNote, setSavingNote] = useState(false)
  const [clinicalNotes, setClinicalNotes] = useState([])

  const phase = PHASES[patient.current_phase || 0]

  const loadPatientData = useCallback(async () => {
    const { data: ent } = await supabase
      .from('daily_entries')
      .select('*')
      .eq('patient_id', patient.id)
      .order('created_at', { ascending: false })
      .limit(30)
    setEntries(ent || [])

    const { data: tsk } = await supabase
      .from('therapy_tasks')
      .select('*')
      .eq('patient_id', patient.id)
      .order('created_at', { ascending: false })
    setTasks(tsk || [])

    const { data: lib } = await supabase
      .from('task_library')
      .select('*')
      .order('created_at', { ascending: false })
    setTaskLibrary(lib || [])

    const { data: cn } = await supabase
      .from('clinical_notes')
      .select('*')
      .eq('patient_id', patient.id)
      .order('created_at', { ascending: false })
      .limit(20)
    setClinicalNotes(cn || [])
  }, [patient.id])

  useEffect(() => { loadPatientData() }, [loadPatientData])

  async function handlePhaseChange() {
    await supabase.from('patients').update({ current_phase: newPhase }).eq('id', patient.id)
    setEditPhase(false)
    onRefresh()
  }

  async function handleDeleteTask(taskId) {
    await supabase.from('therapy_tasks').delete().eq('id', taskId)
    loadPatientData()
  }

  async function handleSaveNote() {
    if (!notes.trim()) return
    setSavingNote(true)
    await supabase.from('clinical_notes').insert({
      patient_id: patient.id,
      content: notes
    })
    setNotes('')
    setSavingNote(false)
    loadPatientData()
  }

  // Stats
  const last7Entries = entries.filter(e => {
    const d = new Date(e.created_at)
    const week = new Date()
    week.setDate(week.getDate() - 7)
    return d >= week
  })
  const avgCraving = last7Entries.length > 0
    ? (last7Entries.reduce((sum, e) => sum + e.craving_level, 0) / last7Entries.length).toFixed(1)
    : '-'
  const avgAnimo = last7Entries.length > 0
    ? (last7Entries.reduce((sum, e) => sum + (e.mood_score || 0), 0) / last7Entries.length).toFixed(1)
    : '-'
  const hasNegotiation = last7Entries.filter(e => e.negotiation && e.negotiation !== '(sin negociación detectada)').length
  const pendingTasks = tasks.filter(t => t.status === 'pending').length
  const completedTasks = tasks.filter(t => t.status === 'completed').length
  const taskRate = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <button className="btn btn-ghost btn-sm" onClick={onBack}>← Volver</button>
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700 }}>{patient.name}</h2>
          <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{patient.addiction_type || 'Sin especificar'} · {patient.email}</span>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => setShowEditPatient(true)} title="Editar paciente">
          <IconEdit style={{ width: 16, height: 16 }} /> Editar
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="phase-badge" style={{ background: phase.color }}>{phase.name}</span>
          <button className="btn btn-ghost btn-sm" onClick={() => { setEditPhase(true); setNewPhase(patient.current_phase) }}>
            <IconEdit style={{ width: 14, height: 14 }} />
          </button>
        </div>
      </div>

      {/* Phase editor */}
      {editPhase && (
        <div className="card" style={{ marginBottom: 16, borderColor: 'var(--accent)' }}>
          <div className="label" style={{ marginBottom: 8 }}>Cambiar fase terapéutica</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
            {PHASES.map(p => (
              <button key={p.id} onClick={() => setNewPhase(p.id)}
                className="btn btn-sm"
                style={{
                  background: newPhase === p.id ? p.color : 'var(--bg-input)',
                  color: 'white', border: 'none', fontSize: 12
                }}>
                {p.id}. {p.name}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary btn-sm" onClick={handlePhaseChange}>Guardar</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setEditPhase(false)}>Cancelar</button>
          </div>
        </div>
      )}

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-value" style={{ color: getCravingColor(parseFloat(avgCraving) || 0) }}>{avgCraving}</div>
          <div className="stat-label">Craving (7d)</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: parseFloat(avgAnimo) <= 3 ? 'var(--danger)' : parseFloat(avgAnimo) <= 6 ? 'var(--warning)' : 'var(--success)' }}>{avgAnimo}</div>
          <div className="stat-label">Ánimo (7d)</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: hasNegotiation > 3 ? 'var(--danger)' : hasNegotiation > 0 ? 'var(--warning)' : 'var(--success)' }}>{hasNegotiation}/{last7Entries.length}</div>
          <div className="stat-label">Negociaciones</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{last7Entries.length}/7</div>
          <div className="stat-label">Check-ins</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: taskRate >= 70 ? 'var(--success)' : taskRate >= 40 ? 'var(--warning)' : 'var(--danger)' }}>{taskRate}%</div>
          <div className="stat-label">Tareas</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Left column - Entries & Notes */}
        <div>
          {/* Entries */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Check-ins (E/A/C/N)</span>
            </div>
            {entries.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: 20 }}>Sin registros aún</div>
            ) : (
              <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                {entries.slice(0, 14).map((entry, i) => {
                  const emo = EMOTIONS.find(e => e.id === entry.emotion_word)
                  const isAlert = entry.craving_level >= 7 || (entry.negotiation && entry.negotiation !== '(sin negociación detectada)')
                  return (
                    <div key={i} style={{
                      padding: '10px 0', borderBottom: '1px solid var(--border)',
                      borderLeft: isAlert ? '3px solid var(--danger)' : '3px solid transparent',
                      paddingLeft: 10
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 18 }}>{emo?.emoji || MOODS.find(m => m.id === entry.mood)?.emoji || '📝'}</span>
                          <span style={{ fontSize: 14, fontWeight: 600 }}>
                            {emo?.label || entry.emotion_word || MOODS.find(m => m.id === entry.mood)?.label || '—'}
                          </span>
                        </div>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{formatDate(entry.created_at)}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 16, fontSize: 12, marginBottom: 4 }}>
                        <span style={{ color: 'var(--text-secondary)' }}>
                          <strong>A:</strong> {entry.mood_score ?? '—'}/10
                        </span>
                        <span style={{ color: getCravingColor(entry.craving_level), fontWeight: entry.craving_level >= 7 ? 700 : 400 }}>
                          <strong>C:</strong> {entry.craving_level}/10
                          {entry.craving_level >= 7 && ' ⚠️'}
                        </span>
                      </div>
                      {entry.negotiation && entry.negotiation !== '(sin negociación detectada)' && (
                        <div style={{ fontSize: 12, color: '#f59e0b', fontStyle: 'italic', marginTop: 2 }}>
                          <strong>N:</strong> "{entry.negotiation}"
                        </div>
                      )}
                      {entry.notes && (
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                          {entry.notes.substring(0, 80)}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Clinical notes */}
          <div className="card" style={{ marginTop: 12 }}>
            <div className="card-title" style={{ marginBottom: 12 }}>Notas clínicas</div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <textarea className="textarea" value={notes} onChange={e => setNotes(e.target.value)}
                placeholder="Añadir nota clínica..." rows={2} style={{ minHeight: 48 }} />
              <button className="btn btn-primary btn-sm" onClick={handleSaveNote} disabled={savingNote || !notes.trim()}
                style={{ alignSelf: 'flex-end' }}>
                {savingNote ? '...' : 'Guardar'}
              </button>
            </div>
            {clinicalNotes.map((note, i) => (
              <div key={i} style={{ padding: '8px 0', borderTop: '1px solid var(--border)', fontSize: 13 }}>
                <div style={{ color: 'var(--text-secondary)', marginBottom: 4 }}>{note.content}</div>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{formatDateTime(note.created_at)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right column - Tasks */}
        <div>
          <div className="card">
            <div className="card-header">
              <span className="card-title">Tareas asignadas</span>
              <button className="btn btn-primary btn-sm" onClick={() => setShowAddTask(true)}>
                <IconPlus style={{ width: 14, height: 14 }} /> Añadir
              </button>
            </div>

            {tasks.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: 20 }}>Sin tareas asignadas</div>
            ) : (
              <div style={{ maxHeight: 500, overflowY: 'auto' }}>
                {tasks.map(task => (
                  <div key={task.id} style={{
                    display: 'flex', alignItems: 'flex-start', gap: 10,
                    padding: '10px 0', borderBottom: '1px solid var(--border)'
                  }}>
                    <div style={{
                      width: 8, height: 8, borderRadius: '50%', marginTop: 6, flexShrink: 0,
                      background: task.status === 'completed' ? 'var(--success)' : 'var(--warning)'
                    }} />
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontSize: 13, fontWeight: 500,
                        textDecoration: task.status === 'completed' ? 'line-through' : 'none',
                        color: task.status === 'completed' ? 'var(--text-muted)' : 'var(--text-primary)'
                      }}>
                        {task.description}
                      </div>
                      <div style={{ display: 'flex', gap: 6, marginTop: 4, alignItems: 'center' }}>
                        <span className="task-type" style={{
                          background: TASK_TYPES.find(t => t.id === task.task_type)?.color || '#6366f1'
                        }}>{task.task_type}</span>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          {task.status === 'completed' ? '✓ Completada' : task.priority === 'high' ? '⚡ Alta' : ''}
                        </span>
                      </div>
                    </div>
                    <button onClick={() => handleDeleteTask(task.id)}
                      style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}>
                      <IconTrash style={{ width: 14, height: 14 }} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Emergency contacts */}
          {patient.emergency_contacts?.length > 0 && (
            <div className="card" style={{ marginTop: 12 }}>
              <div className="card-title" style={{ marginBottom: 8 }}>Contactos emergencia</div>
              {patient.emergency_contacts.map((c, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                  <IconPhone style={{ width: 14, height: 14, color: 'var(--text-muted)' }} />
                  <span>{c.name}: {c.phone}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showAddTask && (
        <AddTaskModal
          patientId={patient.id}
          taskLibrary={taskLibrary}
          onClose={() => setShowAddTask(false)}
          onSave={loadPatientData}
        />
      )}

      {showEditPatient && (
        <EditPatientModal
          patient={patient}
          onClose={() => setShowEditPatient(false)}
          onSave={() => { setShowEditPatient(false); onRefresh() }}
        />
      )}
    </div>
  )
}

// ==================== THERAPIST APP ====================
export default function TherapistApp({ session }) {
  const [patients, setPatients] = useState([])
  const [selectedPatient, setSelectedPatient] = useState(null)
  const [showAddPatient, setShowAddPatient] = useState(false)
  const [showSidebar, setShowSidebar] = useState(false)

  const loadPatients = useCallback(async () => {
    const { data } = await supabase
      .from('patients')
      .select('*')
      .order('name')
    setPatients(data || [])
  }, [])

  useEffect(() => { loadPatients() }, [loadPatients])

  function handleSelectPatient(p) {
    setSelectedPatient(p)
    setShowSidebar(false)
  }

  const colors = ['#6366f1', '#ec4899', '#f97316', '#22c55e', '#eab308', '#3b82f6', '#8b5cf6']

  return (
    <div className="therapist-layout" style={{ background: 'var(--bg-primary)' }}>
      {/* Sidebar */}
      <aside className={`therapist-sidebar ${showSidebar ? 'show' : ''}`}>
        <div style={{ padding: '0 20px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <img src="/logo.png" alt="Nexia" style={{ height: 32 }} />
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Panel clínico</div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => supabase.auth.signOut()}>
            <IconLogout style={{ width: 16, height: 16 }} />
          </button>
        </div>

        <div style={{ padding: '0 12px', marginBottom: 12 }}>
          <button className="btn btn-primary btn-block btn-sm" onClick={() => setShowAddPatient(true)}>
            <IconPlus style={{ width: 14, height: 14 }} /> Nuevo paciente
          </button>
          <button className="btn btn-block btn-sm" onClick={() => {
            const msg = encodeURIComponent('🕊️ Recordatorio diario\n\nHola equipo, recordad hacer vuestro check-in E/A/C/N en Nexia.\n\n📱 Abrir Nexia: https://nexia-adicciones.netlify.app\n\nE — Emoción predominante\nA — Ánimo (0-10)\nC — Craving (0-10)\nN — Negociación\n\n2 minutos que marcan la diferencia 💪')
            window.open('https://web.whatsapp.com/send?text=' + msg, '_blank')
          }} style={{ marginTop: 8, background: '#25D366', border: 'none', color: 'white' }}>
            📱 Recordatorio grupo
          </button>
        </div>

        <div style={{ padding: '0 12px', marginBottom: 8 }}>
          <span className="label">Pacientes ({patients.length})</span>
        </div>

        {patients.map((p, i) => (
          <div key={p.id}
            className={`patient-list-item ${selectedPatient?.id === p.id ? 'active' : ''}`}
            onClick={() => handleSelectPatient(p)}>
            <div className="patient-avatar" style={{ background: colors[i % colors.length] }}>
              {p.name?.[0]?.toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500 }}>{p.name}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                Fase {p.current_phase}: {PHASES[p.current_phase]?.name}
              </div>
            </div>
          </div>
        ))}
      </aside>

      {/* Main */}
      <main className="therapist-main">
        {/* Mobile menu button - fixed top */}
        <button
          className="btn btn-primary btn-sm mobile-menu-btn"
          onClick={() => setShowSidebar(!showSidebar)}
          style={{
            position: 'fixed', top: 12, left: 12, zIndex: 1000,
            padding: '10px 16px', borderRadius: 12,
            boxShadow: '0 4px 16px rgba(99, 102, 241, 0.4)',
            fontSize: 14, fontWeight: 600
          }}
        >
          <IconMenu style={{ width: 18, height: 18 }} /> {showSidebar ? 'Cerrar' : 'Pacientes'}
        </button>

        {/* Overlay to close sidebar on mobile */}
        {showSidebar && (
          <div onClick={() => setShowSidebar(false)} style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.5)', zIndex: 49
          }} />
        )}

        {selectedPatient ? (
          <PatientDetail
            patient={selectedPatient}
            onBack={() => setSelectedPatient(null)}
            onRefresh={() => {
              loadPatients()
              // Refresh selected patient data
              supabase.from('patients').select('*').eq('id', selectedPatient.id).single()
                .then(({ data }) => { if (data) setSelectedPatient(data) })
            }}
          />
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', textAlign: 'center' }}>
            <div>
              <IconUsers style={{ width: 48, height: 48, color: 'var(--text-muted)', marginBottom: 12 }} />
              <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>
                {patients.length === 0 ? 'Añade tu primer paciente' : 'Selecciona un paciente'}
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: 14, maxWidth: 400 }}>
                {patients.length === 0
                  ? 'Haz clic en "Nuevo paciente" para crear la cuenta de tu primer paciente piloto.'
                  : 'Selecciona un paciente de la lista para ver su seguimiento completo.'
                }
              </p>
              {patients.length === 0 && (
                <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setShowAddPatient(true)}>
                  <IconPlus style={{ width: 16, height: 16 }} /> Nuevo paciente
                </button>
              )}
            </div>
          </div>
        )}
      </main>

      {showAddPatient && (
        <AddPatientModal onClose={() => setShowAddPatient(false)} onSave={loadPatients} />
      )}
    </div>
  )
}
