import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'

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
      .then(({ data, error }) => {
        if (error) console.error(error)
        setProfile(data)
      })
  }, [session])

  async function save(patch) {
    setSaving(true)
    const { error } = await supabase.from('profiles')
      .update(patch).eq('id', session.user.id)
    if (error) console.error(error)
    else setProfile({ ...profile, ...patch })
    setSaving(false)
  }

  const daysToGo = profile?.race_date
    ? Math.max(0, Math.ceil((new Date(profile.race_date) - new Date()) / 86400000))
    : null

  const box = { padding: 40, fontFamily: 'system-ui', maxWidth: 460 }
  const pill = on => ({
    padding: '12px 16px', marginRight: 8, marginBottom: 8, borderRadius: 999,
    border: `1.5px solid ${on ? '#1a1512' : '#ddd'}`,
    background: on ? '#1a1512' : 'transparent',
    color: on ? '#fff' : '#1a1512',
    cursor: 'pointer', fontSize: 14, fontWeight: 600, fontFamily: 'inherit',
  })

  if (!session) return (
    <div style={box}>
      <h1>Salus Train</h1>
      {sent ? <p>Check your email for the link.</p> : (
        <>
          <input value={email} onChange={e => setEmail(e.target.value)}
            placeholder="your@email.com" style={{ padding: 10, width: 240 }} />
          <button onClick={async () => {
            await supabase.auth.signInWithOtp({ email }); setSent(true)
          }} style={{ padding: 10, marginLeft: 8 }}>Send link</button>
        </>
      )}
    </div>
  )

  if (!profile) return <div style={box}><p>Loading…</p></div>

  return (
    <div style={box}>
      <h1>Salus Train</h1>
      <p>Morning{profile.name ? `, ${profile.name.split(' ')[0]}` : ''}.</p>

      {daysToGo !== null && (
        <div style={{ background: '#f4f0ea', borderRadius: 16, padding: 20, margin: '24px 0' }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.14em', color: '#6d6156' }}>
            HYROX LONDON EXCEL
          </div>
          <div style={{ fontSize: 48, fontWeight: 900, letterSpacing: '-.04em', lineHeight: 1, marginTop: 6 }}>
            {daysToGo}
          </div>
          <div style={{ fontSize: 15, color: '#6d6156', marginTop: 4 }}>
            days to go · {RACE_DAYS.find(d => d[0] === profile.race_date)?.[1]}
            {profile.race_division ? ` · ${profile.race_division}` : ''}
          </div>
        </div>
      )}

      <h3 style={{ marginTop: 28, fontSize: 13, letterSpacing: '.1em', color: '#6d6156' }}>
        RACE DAY
      </h3>
      <div>
        {RACE_DAYS.map(([date, label]) => (
          <button key={date} style={pill(profile.race_date === date)}
            onClick={() => save({ race_date: date })}>{label}</button>
        ))}
      </div>

      <h3 style={{ marginTop: 24, fontSize: 13, letterSpacing: '.1em', color: '#6d6156' }}>
        DIVISION
      </h3>
      <div>
        {DIVISIONS.map(d => (
          <button key={d} style={pill(profile.race_division === d)}
            onClick={() => save({ race_division: d })}>{d}</button>
        ))}
      </div>

      <p style={{ marginTop: 20, fontSize: 13, color: '#999' }}>
        {saving ? 'Saving…' : 'Saved'}
      </p>

      <button onClick={() => supabase.auth.signOut()}
        style={{ marginTop: 20, padding: 10 }}>Sign out</button>
    </div>
  )
}