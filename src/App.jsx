import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import { PAL, vars, C, F, T } from './lib/theme'
import {
  getProfile, updateProfile, getBenchmarks, getWeek,
  getHalf, getMultiplier, getMyProgramme, getConfig,
} from './lib/data'
import { summarise, DEFAULT_MULTIPLIER } from './lib/half'

import Auth     from './screens/Auth'
import SetPassword from './screens/SetPassword'
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
import { SkeletonToday } from './components/Skeleton'
import Admin    from './admin/Admin'

export default function App() {
  const [session, setSession] = useState(null)
  const [ready, setReady] = useState(false)

  const [profile, setProfile] = useState(null)
  const [benchmarks, setBenchmarks] = useState({})
  const [week, setWeek] = useState(null)
  const [programme, setProgramme] = useState(null)
  const [splits, setSplits] = useState({})
  const [multiplier, setMultiplier] = useState(DEFAULT_MULTIPLIER)
  const [cfg, setCfg] = useState({})
  const [recovery, setRecovery] = useState(false)
  const [linkErr, setLinkErr] = useState(null)

  const [tab, setTab] = useState('today')
  const [coaches, setCoaches] = useState(false)
  const [screen, setScreen] = useState(null)   // null | session | half | effort | done
  const [active, setActive] = useState(null)   // the session being worked
  const [result, setResult] = useState(null)
  const [effort, setEffort] = useState(0)
  // ?admin in the URL, so there's no route to stumble into by accident
  const [admin, setAdmin] = useState(
    () => new URLSearchParams(window.location.search).has('admin'))

  /* ---------- auth ---------- */
  // The splash needs the media config before anyone has signed in,
  // so this runs on its own rather than waiting for a session.
  useEffect(() => { getConfig().then(setCfg).catch(() => {}) }, [])

  useEffect(() => {
    // A link that has expired or been used comes back with the reason
    // in the URL. Without this the app just shows the login screen
    // again and the member has no idea why.
    const hash = new URLSearchParams(window.location.hash.slice(1))
    if (hash.get('error_description')) {
      setLinkErr(hash.get('error_description').replace(/\+/g, ' '))
      window.history.replaceState({}, '', window.location.pathname)
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session); setReady(true)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s)

      // Arriving from a reset link. Supabase has signed them in with a
      // recovery session; the app owes them a screen to set the password
      // on, or they land in the app with the old one still live.
      if (event === 'PASSWORD_RECOVERY') setRecovery(true)

      // Clear a spent token out of the address bar.
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
        const [p, b, m, prog] = await Promise.all([
          getProfile(uid), getBenchmarks(uid), getMultiplier(), getMyProgramme(),
        ])
        if (cancelled) return
        setProfile(p); setBenchmarks(b); setMultiplier(m); setProgramme(prog)
        const w = await getWeek(1, prog?.programme_id)
        if (!cancelled) setWeek(w)
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
  if (!session) return <Shell><Auth cfg={cfg} linkErr={linkErr}
    clearLinkErr={() => setLinkErr(null)} /></Shell>

  /* ---------- arrived from a reset link ---------- */
  if (recovery) return (
    <Shell><SetPassword cfg={cfg} onDone={() => setRecovery(false)} /></Shell>
  )
  if (!profile) return <Shell><SkeletonToday /></Shell>

  /* ---------- back office ---------- */
  // Deliberately outside Shell: the member layout is phone-width, and
  // writing a training block wants the whole screen.
  if (admin) return (
    <div style={{ ...vars(PAL[theme]), minHeight: '100dvh', background: C.bg,
      color: C.ink, fontFamily: F }}>
      <Admin profile={profile} onExit={() => {
        setAdmin(false)
        window.history.replaceState({}, '', window.location.pathname)
      }} />
    </div>
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

  /* ---------- coaches, reached from You ---------- */
  if (coaches) return (
    <Shell>
      <Coaches userId={session.user.id} profile={profile}
        onBack={() => setCoaches(false)} />
    </Shell>
  )

  /* ---------- tabs ---------- */
  const open = s => {
    setActive(s)
    setScreen(s.kind === 'half' ? 'half' : 'session')
  }

  return (
    <Shell>
      {tab === 'today'   && <Today profile={profile} week={week}
                              programme={programme} half={half} onOpen={open}
                              onSetRace={() => setTab('you')} />}
      {tab === 'plan'    && <Plan week={week} programme={programme} onOpen={open} />}
      {tab === 'board'   && <Board profile={profile}
                              onShare={() => patch({ share_on_leaderboard: true })} />}

      {tab === 'you'     && <You userId={session.user.id} profile={profile}
                              benchmarks={benchmarks} setBenchmarks={setBenchmarks}
                              theme={theme} setTheme={t => patch({ theme: t })}
                              half={half} onUpdate={patch}
                              onCoaches={() => setCoaches(true)} />}
      <Tabs tab={tab} setTab={setTab} />
    </Shell>
  )
}
