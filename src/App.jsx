import React, { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import { PAL, vars, C, F, T } from './lib/theme'
import {
  getProfile, updateProfile, getBenchmarks, getWeek, setMyWeek,
  getHalf, getMultiplier, getMyProgramme, getConfig, getPrediction, getTabs,
  getUnread, markRoomSeen,
} from './lib/data'
import { summarise, DEFAULT_MULTIPLIER } from './lib/half'

import Auth     from './screens/Auth'
import SetPassword from './screens/SetPassword'
import Onboard  from './screens/Onboard'
import Today    from './screens/Today'
import Plan     from './screens/Plan'
import Block    from './screens/Block'
import Programmes from './screens/Programmes'
import Notifications from './screens/Notifications'
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
import { page } from './components/ui'
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

  // The splash stays until the first screen has its data, then fades.
  // Splash, then a skeleton, then content is two transitions for one
  // wait — and the second one is the flash.
  const [painted, setPainted] = useState(false)

  // The mark is already on screen, drawn by index.html before any
  // JavaScript ran. This takes it down rather than drawing a second
  // one over the top — which is what made it flash.
  useEffect(() => {
    if (!painted) return
    const boot = document.getElementById('boot')
    if (!boot) return
    boot.classList.add('ready')
    const t = setTimeout(() => boot.remove(), 500)
    return () => clearTimeout(t)
  }, [painted])

  // The splash lifts on its own after two seconds no matter what.
  // A loading screen that depends on one callback firing is a loading
  // screen that will eventually get stuck, and a stuck one looks like
  // a broken app rather than a slow one.
  useEffect(() => {
    const t = setTimeout(() => setPainted(true), 2000)
    return () => clearTimeout(t)
  }, [])
  const [unread, setUnread] = useState(0)

  // Polled rather than pushed. Realtime for a badge would mean holding
  // a socket open on every screen for a number that can be a minute
  // stale without anyone minding.
  useEffect(() => {
    if (!profile) return
    const read = () => getUnread().then(u => setUnread(Number(u.room) || 0))
      .catch(() => {})
    read()
    const t = setInterval(read, 45000)
    return () => clearInterval(t)
  }, [profile?.id])

  const [recovery, setRecovery] = useState(false)
  const [linkErr, setLinkErr] = useState(null)

  const [tab, setTab] = useState('today')

  // Opening the room clears the badge.
  //
  // This sat above the declaration of `tab` and threw "cannot access
  // before initialization" on every render — which is a black screen,
  // because it happens before any error boundary is mounted.
  useEffect(() => {
    if (tab !== 'community') return
    markRoomSeen().then(() => setUnread(0)).catch(() => {})
  }, [tab])
  const [plan, setPlan] = useState(false)
  const [coaches, setCoaches] = useState(false)
  const [progress, setProgress] = useState(false)
  const [races, setRaces] = useState(false)
  const [blocks, setBlocks] = useState(false)
  const [notifs, setNotifs] = useState(false)
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
  // Keep the screen on while the app is open, if they've asked for it.
  // A phone that sleeps between sets means unlocking it with chalk on
  // your hands, every set, for an hour.
  useEffect(() => {
    if (!profile || profile.keep_awake === false) return
    if (!('wakeLock' in navigator)) return
    let lock = null
    const ask = async () => {
      try { lock = await navigator.wakeLock.request('screen') } catch (_) {}
    }
    ask()
    // Safari drops the lock when the tab is backgrounded, so take it
    // again on return rather than leaving the screen dying mid-session.
    const again = () => {
      if (document.visibilityState === 'visible') ask()
    }
    document.addEventListener('visibilitychange', again)
    return () => {
      document.removeEventListener('visibilitychange', again)
      lock?.release?.().catch(() => {})
    }
  }, [profile?.keep_awake])

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

  // A dark rectangle then the whole app at once is the flash. Showing
  // the mark while auth and the profile resolve gives the eye
  // something to hold, and means the app appears to arrive rather than
  // to blink.
  // index.html is still showing the mark at this point, so rendering
  // nothing is correct — anything here would be a second thing fading
  // over the first.
  if (!ready) return null
  if (!session) return <Shell><Auth cfg={cfg} linkErr={linkErr}
    clearLinkErr={() => setLinkErr(null)} /></Shell>

  /* ---------- arrived from a reset link ---------- */
  if (recovery) return (
    <Shell><SetPassword cfg={cfg} onDone={() => setRecovery(false)} /></Shell>
  )
  if (!profile) return null

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

  /* ---------- notifications ---------- */
  if (notifs) return (
    <Shell>
      <Notifications userId={session.user.id}
        onBack={() => setNotifs(false)} />
    </Shell>
  )

  /* ---------- other blocks ---------- */
  if (blocks) return (
    <Shell>
      <Programmes userId={session.user.id} profile={profile}
        onBack={() => setBlocks(false)}
        onJoined={() => { setBlocks(false); window.location.reload() }} />
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
        <Guard><Today profile={profile} week={week} onReady={() => setPainted(true)}
          programme={programme} half={half} onOpen={open}
          onSetRace={() => setRaces(true)}
          onTakeClubRace={() => programme?.race_date &&
            patch({ race_date: programme.race_date })}
          onProgress={() => setProgress(true)}
          onCoaches={() => setCoaches(true)}
          onPlan={() => setPlan(true)}
          prediction={prediction} /></Guard>
      </Keep>

      <Keep on={tab === 'community'}>
        <Guard><Community profile={profile} userId={session.user.id}
          onCoach={() => setCoaches(true)} /></Guard>
      </Keep>

      <Keep on={tab === 'leaderboard'}>
        <Guard><Board profile={profile} userId={session.user.id}
          onShare={() => patch({ share_on_leaderboard: true })} /></Guard>
      </Keep>

      <Keep on={tab === 'me'}>
        <Guard><You userId={session.user.id}
          profile={{ ...profile, email: session.user.email,
                     programme_name: programme?.name }}
          benchmarks={benchmarks} setBenchmarks={setBenchmarks}
          half={half} onUpdate={patch}
          onCoaches={() => setCoaches(true)}
          onRaces={() => setRaces(true)}
          onProgress={() => setProgress(true)}
          onHalf={() => setScreen('half')}
          onBlocks={() => setBlocks(true)}
          onNotifs={() => setNotifs(true)} /></Guard>
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
      <Tabs tab={tab} setTab={setTab} items={tabItems} unread={unread} />
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

// A crash in one screen shouldn't take the app with it.
//
// Without this, an error anywhere below renders nothing at all — which
// is indistinguishable from a blank screen and gives nobody anything
// to report. This says what happened and leaves the tabs working.
class Guard extends React.Component {
  constructor(p) { super(p); this.state = { err: null } }
  static getDerivedStateFromError(err) { return { err } }
  componentDidCatch(err) { console.error('screen crashed:', err) }
  render() {
    if (!this.state.err) return this.props.children
    return (
      <div style={{ ...page, paddingTop: 80 }}>
        <div style={{ ...T.h2 }}>Something went wrong on this screen</div>
        <div style={{ ...T.body, marginTop: 10, lineHeight: 1.6 }}>
          The other tabs still work. If it keeps happening, tell Luke what
          you were doing.
        </div>
        <div style={{ ...T.small, fontSize: 12, marginTop: 14,
          fontFamily: 'ui-monospace, monospace', color: C.mute }}>
          {String(this.state.err?.message || this.state.err)}
        </div>
        <button onClick={() => this.setState({ err: null })}
          style={{ marginTop: 22, background: C.card2,
            border: `1px solid ${C.line}`, borderRadius: 999,
            padding: '13px 22px', fontSize: 14.5, fontWeight: 600,
            color: C.ink, cursor: 'pointer', fontFamily: F }}>
          Try again
        </button>
      </div>
    )
  }
}
