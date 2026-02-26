import React, { useState, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './utils/supabase'
import Login from './pages/Login'
import PatientApp from './pages/PatientApp'
import TherapistApp from './pages/TherapistApp'

export default function App() {
  const [session, setSession] = useState(null)
  const [userRole, setUserRole] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) fetchRole(session.user.id)
      else setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) fetchRole(session.user.id)
      else {
        setUserRole(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchRole(userId) {
    // Check if user is therapist
    const { data: therapist } = await supabase
      .from('therapists')
      .select('id')
      .eq('user_id', userId)
      .single()

    if (therapist) {
      setUserRole('therapist')
      setLoading(false)
      return
    }

    // Check if user is patient
    const { data: patient } = await supabase
      .from('patients')
      .select('id')
      .eq('user_id', userId)
      .single()

    if (patient) {
      setUserRole('patient')
    }
    setLoading(false)
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0f172a' }}>
        <div style={{ textAlign: 'center', color: '#94a3b8' }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#818cf8', marginBottom: 8 }}><img src="/logo.png" alt="Nexia" style={{ height: 48 }} /></div>
          <div>Cargando...</div>
        </div>
      </div>
    )
  }

  if (!session) return <Login />

  if (userRole === 'therapist') return <TherapistApp session={session} />
  if (userRole === 'patient') return <PatientApp session={session} />

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0f172a', color: '#94a3b8', textAlign: 'center', padding: 24 }}>
      <div>
        <div style={{ fontSize: 18, marginBottom: 12 }}>Tu cuenta no tiene un rol asignado.</div>
        <div style={{ fontSize: 14, marginBottom: 24 }}>Contacta con tu terapeuta para que te dé acceso.</div>
        <button className="btn btn-ghost" onClick={() => supabase.auth.signOut()}>Cerrar sesión</button>
      </div>
    </div>
  )
}
