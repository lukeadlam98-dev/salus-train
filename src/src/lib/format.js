// Time and number helpers. Times are stored as integer seconds.

export const fmt = s => {
  if (s == null || !isFinite(s)) return '—'
  s = Math.max(0, Math.round(s))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export const hhmm = s => {
  if (s == null || !isFinite(s)) return '—'
  s = Math.round(s)
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60
  return h
    ? `${h}:${String(m).padStart(2, '0')}:${String(x).padStart(2, '0')}`
    : `${m}:${String(x).padStart(2, '0')}`
}

export const toSecs = t => {
  if (t == null || t === '') return null
  const p = String(t).trim().split(':')
  if (p.length === 1) return Number(p[0]) || null
  const v = Number(p[0]) * 60 + Number(p[1] || 0)
  return isFinite(v) ? v : null
}

export const daysUntil = date => date
  ? Math.max(0, Math.ceil((new Date(date) - new Date()) / 86400000))
  : null

export const round2h = n => Math.round(n / 2.5) * 2.5

export const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
