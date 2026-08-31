import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import { PAL, vars, C, F, T } from './lib/theme'
import {
  getProfile, updateProfile, getBenchmarks, getWeek, setMyWeek,
  getHalf, getMultiplier, getMyProgramme, getConfig, getPrediction, getTabs,
} from './lib/data'
import { summarise, DEFAULT_MULTIPLIER } from './lib/half'

import Auth     from './screens/Auth'
import SetPassword from './screens/SetPassword'
import Onboard  from './screens/Onboard'
import Today    from './screens/Today'
import Plan     from './screens/Plan'
import Block    from './screens/Block'
import Community from './screens/Community'
import Board    from './screens/Board'
import Coaches  from './screens/Coaches'
import Progress from './screens/Progress'
import Races    from './screens/Races'
import Run      from './screens/Run'
import You      from './screens/You'
import Session  from './screens/Session'
import Half     from './screens/Half'
import Effort   from './screens/Effort'
import Complete from './screens/Complete'
import Tabs     from './components/Tabs'
import Setup    from './components/Setup'
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
  const [prediction, setPrediction] = useState(null)
  const [tabItems, setTabItems] = useState(null)
  const [recovery, setRecovery] = useState(false)
  const [linkErr, setLinkErr] = useState(null)

  const [tab, setTab] = useState('today')
  const [plan, setPlan] = useState(false)
  const [coaches, setCoaches] = useState(false)
  const [progress, setProgress] = useState(false)
  const [races, setRaces] = useState(false)
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
  useEffect(() => {
    getConfig().then(setCfg).catch(() => {})
    getTabs().then(setTabItems).catch(() => {})
  }, [])

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
        getPrediction(uid).then(setPrediction).catch(() => {})
        // Their week, not week one. This was hardcoded and would
        // have kept saying week one in November.
        const w = await getWeek(p?.week_idx || 1, prog?.programme_id)
        if (!cancelled) setWeek(w)
        const h = await getHalf(uid)
        if (!cancelled) setSplits(h.splits)
      } catch (e) { console.error(e) }
    })()

    return () => { cancelled = true }
  }, [session])


  const half = summarise(splits, multiplier)

  async function patch(p) {
    setProfile({ ...profile, ...p })
    await updateProfile(session.user.id, p).catch(console.error)
  }

  const Shell = ({ children }) => (
    <div style={{
      ...vars(), minHeight: '100dvh', background: C.bg, color: C.ink,
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
    <div style={{ ...vars(), minHeight: '100dvh', background: C.bg,
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
      <Complete userId={session.user.id} profile={profile}
        workout={result?.log || null}
        session={active} result={result} effort={effort}
        onDone={() => {
          setScreen(null); setActive(null); setResult(null); setEffort(0)
        }} />
    </Shell>
  )

  /* ---------- the whole block, reached from Today ---------- */
  if (plan) return (
    <Shell>
      <Block profile={profile} programme={programme}
        onBack={() => setPlan(false)}
        onOpen={s => { setPlan(false); open(s) }}
        onWeekChange={async idx => {
          setProfile(p => ({ ...p, week_idx: idx }))
          const w = await getWeek(idx, programme?.programme_id)
          setWeek(w)
        }} />
    </Shell>
  )

  /* ---------- races ---------- */
  if (races) return (
    <Shell>
      <Races userId={session.user.id} prediction={prediction}
        onBack={() => { setRaces(false); reload() }} />
    </Shell>
  )

  /* ---------- progress ---------- */
  if (progress) return (
    <Shell>
      <Progress userId={session.user.id} onBack={() => setProgress(false)} />
    </Shell>
  )

  /* ---------- coaches, reached from You ---------- */
  if (coaches) return (
    <Shell>
      <Coaches userId={session.user.id} profile={profile}
        onBack={() => setCoaches(false)} />
    </Shell>
  )

  /* ---------- a run ---------- */
  if (screen === 'run' && active) return (
    <Shell>
      <Run userId={session.user.id} session={active}
        onBack={() => setScreen(null)}
        onDone={() => { setScreen(null); setActive(null) }} />
    </Shell>
  )

  /* ---------- tabs ---------- */
  const open = s => {
    setActive(s)
    // Running sessions get the clock rather than the set logger — a
    // member on the road needs a lap button, not a list of kilos.
    setScreen(s.kind === 'half' ? 'half' : s.kind === 'run' ? 'run' : 'session')
  }

  return (
    <Shell>
      {/* Tabs stay mounted once visited.
          Unmounting throws away the screen's data, so coming back
          refetches and shows a skeleton — which is the flash between
          tabs. Hiding rather than unmounting makes the second visit
          instant, and the cost is a few components sitting in memory. */}
      <Keep on={tab === 'today'}>
        <Today profile={profile} week={week}
          programme={programme} half={half} onOpen={open}
          onSetRace={() => setRaces(true)}
          onTakeClubRace={() => programme?.race_date &&
            patch({ race_date: programme.race_date })}
          onProgress={() => setProgress(true)}
          onCoaches={() => setCoaches(true)}
          onPlan={() => setPlan(true)}
          prediction={prediction} />
      </Keep>

      <Keep on={tab === 'community'}>
        <Community profile={profile} userId={session.user.id} />
      </Keep>

      <Keep on={tab === 'leaderboard'}>
        <Board profile={profile} userId={session.user.id}
          onShare={() => patch({ share_on_leaderboard: true })} />
      </Keep>

      <Keep on={tab === 'me'}>
        <You userId={session.user.id} profile={profile}
          benchmarks={benchmarks} setBenchmarks={setBenchmarks}
          half={half} onUpdate={patch}
          onCoaches={() => setCoaches(true)}
          onRaces={() => setRaces(true)}
          onProgress={() => setProgress(true)}
          onHalf={() => setScreen('half')} />
      </Keep>
      {/* The nudge sits above the tabs and disappears once the five
          tests are in. Not dismissible on purpose: a member who skips
          them gets a block full of defaults and never finds out. */}
      {/* Not on Community — the send box lives where this sits, and a
          nudge covering the text field is worse than no nudge. */}
      {tab !== 'community' && (
        <Setup benchmarks={benchmarks} half={half}
          onGoToTests={() => setTab('me')}
          onGoToHalf={() => setScreen('half')} />
      )}
      <Tabs tab={tab} setTab={setTab} items={tabItems} />
    </Shell>
  )
}

// Mount a tab the first time it's opened, then keep it.
//
// display:none rather than unmounting: React keeps the component's
// state and its fetched data, so switching back is instant instead of
// a skeleton and a refetch. Nothing renders until first visit, so the
// app still starts on one screen's worth of work.
function Keep({ on, children }) {
  const [seen, setSeen] = useState(on)
  useEffect(() => { if (on) setSeen(true) }, [on])
  if (!seen) return null
  return <div style={{ display: on ? 'block' : 'none' }}>{children}</div>
}
