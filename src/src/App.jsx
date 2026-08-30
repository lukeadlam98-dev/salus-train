import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import { PAL, vars, C, F, T } from './lib/theme'
import {
  getProfile, updateProfile, getBenchmarks, getWeek,
  getHalf, getMultiplier,
} from './lib/data'
import { summarise, DEFAULT_MULTIPLIER } from './lib/half'

import Auth     from './screens/Auth'
import Onboard  from './screens/Onboard'
import Today    from './screens/Today'
import Plan     from './screens/Plan'
import Board    from './screens/Board'
import Coaches  from './screens/Coaches'
import You      from './screens/You'
import Session  from './screens/Session'
import Half     from './screens/Half'
import Effort   from './screens/Effort'
import Complete from './screens/Complete'
import Tabs     from './components/Tabs'
import Admin    from './admin/Admin'

export default function App() {
  const [session, setSession] = useState(null)
  const [ready, setReady] = useState(false)

  const [profile, setProfile] = useState(null)
  const [benchmarks, setBenchmarks] = useState({})
  const [week, setWeek] = useState(null)
  const [splits, setSplits] = useState({})
  const [multiplier, setMultiplier] = useState(DEFAULT_MULTIPLIER)

  const [tab, setTab] = useState('today')
  const [screen, setScreen] = useState(null)   // null | session | half | effort | done
  const [active, setActive] = useState(null)   // the session being worked
  const [result, setResult] = useState(null)
  const [effort, setEffort] = useState(0)
  // ?admin in the URL, so there's no route to stumble into by accident
  const [admin, setAdmin] = useState(
    () => new URLSearchParams(window.location.search).has('admin'))

  /* ---------- auth ---------- */
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setReady(true) })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s)
      // Once the link has been swapped for a session, take the token out
      // of the address bar — a spent link left in history is just clutter.
      if (s && (window.location.hash.includes('access_token') ||
                window.location.search.includes('code='))) {
        window.history.replaceState({}, '', window.location.pathname)
      }
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  /* ---------- load everything once signed in ---------- */
  useEffect(() => {
    if (!session) { setProfile(null); return }
    const uid = session.user.id
    let cancelled = false

    ;(async () => {
      try {
        const [p, b, w, m] = await Promise.all([
          getProfile(uid), getBenchmarks(uid), getWeek(1), getMultiplier(),
        ])
        if (cancelled) return
        setProfile(p); setBenchmarks(b); setWeek(w); setMultiplier(m)
        const h = await getHalf(uid)
        if (!cancelled) setSplits(h.splits)
      } catch (e) { console.error(e) }
    })()

    return () => { cancelled = true }
  }, [session])

  const theme = profile?.theme && PAL[profile.theme] ? profile.theme : 'bone'
  const half = summarise(splits, multiplier)

  async function patch(p) {
    setProfile({ ...profile, ...p })
    await updateProfile(session.user.id, p).catch(console.error)
  }

  const Shell = ({ children }) => (
    <div style={{
      ...vars(PAL[theme]), minHeight: '100dvh', background: C.bg, color: C.ink,
      fontFamily: F,
    }}>{children}</div>
  )

  if (!ready) return <div style={{ minHeight: '100dvh', background: '#0B0A09' }} />
  if (!session) return <Shell><Auth /></Shell>
  if (!profile) return (
    <Shell><div style={{ padding: 46 }}><p style={T.body}>Loading…</p></div></Shell>
  )

  /* ---------- back office ---------- */
  if (admin) return (
    <Shell><Admin profile={profile} onExit={() => {
      setAdmin(false)
      window.history.replaceState({}, '', window.location.pathname)
    }} /></Shell>
  )

  /* ---------- first run ---------- */
  if (!profile.name) return (
    <Shell><Onboard onDone={patch} /></Shell>
  )

  /* ---------- session flow ---------- */
  if (screen === 'session') return (
    <Shell>
      <Session session={active} userId={session.user.id} benchmarks={benchmarks}
        onBack={() => { setScreen(null); setActive(null) }}
        onFinished={r => { setResult(r); setScreen('effort') }} />
    </Shell>
  )

  if (screen === 'half') return (
    <Shell>
      <Half userId={session.user.id} splits={splits} setSplits={setSplits}
        multiplier={multiplier} onBack={() => setScreen(null)} />
    </Shell>
  )

  if (screen === 'effort') return (
    <Shell>
      <Effort value={effort} setValue={setEffort} onDone={() => setScreen('done')} />
    </Shell>
  )

  if (screen === 'done') return (
    <Shell>
      <Complete session={active} result={result} effort={effort}
        onDone={() => {
          setScreen(null); setActive(null); setResult(null); setEffort(0)
        }} />
    </Shell>
  )

  /* ---------- tabs ---------- */
  const open = s => {
    setActive(s)
    setScreen(s.kind === 'half' ? 'half' : 'session')
  }

  return (
    <Shell>
      {tab === 'today'   && <Today profile={profile} week={week} half={half} onOpen={open} />}
      {tab === 'plan'    && <Plan week={week} onOpen={open} />}
      {tab === 'board'   && <Board profile={profile}
                              onShare={() => patch({ share_on_leaderboard: true })} />}
      {tab === 'coaches' && <Coaches userId={session.user.id} profile={profile} />}
      {tab === 'you'     && <You userId={session.user.id} profile={profile}
                              benchmarks={benchmarks} setBenchmarks={setBenchmarks}
                              theme={theme} setTheme={t => patch({ theme: t })}
                              half={half} onUpdate={patch} />}
      <Tabs tab={tab} setTab={setTab} />
    </Shell>
  )
}
