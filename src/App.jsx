import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import { C, F, T, btn } from './lib/theme'

const RACE_DAYS = [
  ['2026-12-02', 'Wed 2 Dec'], ['2026-12-03', 'Thu 3 Dec'],
  ['2026-12-04', 'Fri 4 Dec'], ['2026-12-05', 'Sat 5 Dec'],
  ['2026-12-06', 'Sun 6 Dec'],
]
const DIVISIONS = ['Individual', 'Individual Pro', 'Doubles', 'Relay']

export default function App() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [saving, setSaving] = useState(false)
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session) { setProfile(null); return }
    supabase.from('profiles').select('*').eq('id', session.user.id).single()
      .then(({ data, error }) => { if (error) console.error(error); setProfile(data) })
  }, [session])

  async function save(patch) {
    setSaving(true)
    const { error } = await supabase.from('profiles')
      .update(patch).eq('id', session.user.id)
    if (error) console.error(error); else setProfile({ ...profile, ...patch })
    setSaving(false)
  }

  const days = profile?.race_date
    ? Math.max(0, Math.ceil((new Date(profile.race_date) - new Date()) / 86400000))
    : null

  const page = { minHeight: '100%', padding: '52px 20px 40px', maxWidth: 480, margin: '0 auto' }

  if (!session) return (
    <div style={page}>
      <div style={{ ...T.label, marginBottom: 10 }}>SALUS HOUSE</div>
      <h1 style={T.h1}>Salus Train</h1>
      {sent
        ? <p style={{ ...T.body, marginTop: 20 }}>Check your email for the link.</p>
        : (
          <div style={{ marginTop: 24 }}>
            <input value={email} onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com"
              style={{
                width: '100%', background: 'transparent', color: C.ink,
                border: `1.5px solid ${C.line}`, borderRadius: 999,
                padding: '17px 20px', fontSize: 16, outline: 'none',
              }} />
            <button style={{ ...btn.primary, marginTop: 12 }}
              onClick={async () => { await supabase.auth.signInWithOtp({ email }); setSent(true) }}>
              Send link
            </button>
          </div>
        )}
    </div>
  )

  if (!profile) return <div style={page}><p style={T.body}>Loading…</p></div>

  return (
    <div style={page}>
      <div style={T.label}>WEEK 1 OF 8 · ROAD TO HYROX</div>
      <h1 style={{ ...T.h1, marginTop: 8 }}>
        Morning{profile.name ? `, ${profile.name.split(' ')[0]}` : ''}
      </h1>

      {days !== null && (
        <div style={{
          background: C.card, borderRadius: 18, padding: '18px 18px 20px', marginTop: 22,
        }}>
          <div style={{ ...T.label, color: C.g }}>HYROX LONDON EXCEL</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 9, marginTop: 6 }}>
            <div style={{ fontSize: 46, fontWeight: 900, letterSpacing: '-.05em', lineHeight: 1, ...T.num }}>
              {days}
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.sub }}>days to go</div>
          </div>
          <div style={{ fontSize: 13.5, color: C.sub, marginTop: 7 }}>
            {RACE_DAYS.find(d => d[0] === profile.race_date)?.[1]}
            {profile.race_division ? ` · ${profile.race_division}` : ''}
          </div>
          <div style={{ display: 'flex', gap: 4, marginTop: 15 }}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} style={{
                flex: 1, height: 5, borderRadius: 999,
                background: i === 0 ? 'rgba(232,220,200,.4)' : C.card3,
              }} />
            ))}
          </div>
        </div>
      )}

      <div style={{ ...T.label, marginTop: 28, marginBottom: 12 }}>RACE DAY</div>
      {RACE_DAYS.map(([date, label]) => (
        <button key={date} style={btn.pill(profile.race_date === date)}
          onClick={() => save({ race_date: date })}>{label}</button>
      ))}

      <div style={{ ...T.label, marginTop: 22, marginBottom: 12 }}>DIVISION</div>
      {DIVISIONS.map(d => (
        <button key={d} style={btn.pill(profile.race_division === d)}
          onClick={() => save({ race_division: d })}>{d}</button>
      ))}

      <div style={{ fontSize: 12.5, color: C.mute, marginTop: 20 }}>
        {saving ? 'Saving…' : 'Saved'}
      </div>

      <button onClick={() => supabase.auth.signOut()}
        style={{
          marginTop: 28, background: 'transparent', border: `1px solid ${C.line}`,
          color: C.sub, borderRadius: 999, padding: '13px 22px', fontSize: 14,
          fontWeight: 600, cursor: 'pointer', fontFamily: F,
        }}>Sign out</button>
    </div>
  )
}