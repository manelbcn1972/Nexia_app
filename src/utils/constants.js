export const PHASES = [
  { id: 0, name: 'Evaluación', color: '#94a3b8', description: 'Valoración inicial del paciente' },
  { id: 1, name: 'Contención', color: '#f97316', description: 'Estabilización y control de impulsos' },
  { id: 2, name: 'Comprensión', color: '#eab308', description: 'Identificación de patrones y triggers' },
  { id: 3, name: 'Reconstrucción', color: '#3b82f6', description: 'Desarrollo de estrategias alternativas' },
  { id: 4, name: 'Integración', color: '#8b5cf6', description: 'Consolidación de cambios' },
  { id: 5, name: 'Autonomía', color: '#22c55e', description: 'Seguimiento supervisado' }
]

export const MOODS = [
  { id: 'muy_mal', emoji: '😞', label: 'Muy mal', value: 1 },
  { id: 'mal', emoji: '😟', label: 'Mal', value: 2 },
  { id: 'regular', emoji: '😐', label: 'Regular', value: 3 },
  { id: 'bien', emoji: '🙂', label: 'Bien', value: 4 },
  { id: 'muy_bien', emoji: '😊', label: 'Muy bien', value: 5 }
]

export const TASK_TYPES = [
  { id: 'emocional', label: 'Emocional', color: '#ec4899' },
  { id: 'conductual', label: 'Conductual', color: '#f97316' },
  { id: 'cognitiva', label: 'Cognitiva', color: '#3b82f6' },
  { id: 'exposicion', label: 'Exposición', color: '#8b5cf6' },
  { id: 'social', label: 'Social', color: '#22c55e' }
]

export function formatDate(dateStr) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
}

export function formatDateTime(dateStr) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export function timeAgo(dateStr) {
  const now = new Date()
  const d = new Date(dateStr)
  const diff = Math.floor((now - d) / 1000)
  if (diff < 60) return 'Ahora'
  if (diff < 3600) return `Hace ${Math.floor(diff / 60)} min`
  if (diff < 86400) return `Hace ${Math.floor(diff / 3600)}h`
  return formatDate(dateStr)
}

export function getCravingColor(level) {
  if (level <= 3) return '#22c55e'
  if (level <= 5) return '#eab308'
  if (level <= 7) return '#f97316'
  return '#ef4444'
}
