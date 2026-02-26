import React, { useState } from 'react'
import { supabase } from '../utils/supabase'
import { IconShield } from '../components/Icons'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('Email o contraseña incorrectos')
    }
    setLoading(false)
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      background: 'linear-gradient(180deg, #0f172a 0%, #1e1b4b 100%)',
      padding: 24
    }}>
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <div style={{
          width: 64, height: 64, borderRadius: 16,
          background: 'linear-gradient(135deg, #6366f1, #818cf8)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 16px',
          boxShadow: '0 8px 32px rgba(99, 102, 241, 0.3)'
        }}>
          <IconShield style={{ width: 32, height: 32, color: 'white' }} />
        </div>
        <img src="/logo.png" alt="Nexia Recovery Coach" style={{ height: 56, marginBottom: 8 }} />
        <p style={{ color: '#94a3b8', fontSize: 14, marginTop: 4 }}>Tu compañero en la recuperación</p>
      </div>

      <form onSubmit={handleLogin} style={{ width: '100%', maxWidth: 360 }}>
        <div className="field">
          <label className="label">Email</label>
          <input
            className="input"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="tu@email.com"
            required
          />
        </div>

        <div className="field">
          <label className="label">Contraseña</label>
          <input
            className="input"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />
        </div>

        {error && (
          <div style={{ color: '#ef4444', fontSize: 13, marginBottom: 16, textAlign: 'center' }}>{error}</div>
        )}

        <button
          type="submit"
          className="btn btn-primary btn-block"
          disabled={loading}
          style={{ marginTop: 8, height: 48, fontSize: 15 }}
        >
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
      </form>

      <p style={{ color: '#64748b', fontSize: 12, marginTop: 32 }}>
        Acceso solo con invitación de tu terapeuta
      </p>
    </div>
  )
}
