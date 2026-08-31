import { C, F } from '../lib/theme'
import { Ico, I, Mark } from './ui'

// Four, not five.
//
// Coaches came out. Messaging is one-way until a coach can reply, and
// even then it isn't a daily-use destination — it's something you do
// when you have a question. It lives on You, and next to the coach's
// notes inside a session, which is where the question actually occurs
// to someone.
// Train, Community, Leaderboard, Me.
//
// "Train" rather than "Today": it's a verb, and it says what the tab is
// for rather than when. Today is a fact about the calendar; Train is the
// thing you opened the app to do.
//
// Plan came out: it was the same week scrolled sideways, and it's
// reachable from the chip row where it belongs. Community went
// in because that's the thing a club app has that a training app
// doesn't — the room, when you're training alone at six.
// Keyed by route, so a renamed tab keeps its icon.
const ICONS = {
  today: null, community: I.users, leaderboard: I.chart, me: I.user,
}

const ITEMS = [
  ['today',       'Train',       null],
  ['community',   'Community',   I.users],
  ['leaderboard', 'Leaderboard', I.chart],
  ['me',          'Me',          I.user],
]

export default function Tabs({ tab, setTab, items }) {
  // Labels come from the database when they're there; ITEMS is the
  // fallback so the app still works before the migration has run.
  const rows = items?.length
    ? items.map(t => [t.key, t.label, ICONS[t.key] ?? null])
    : ITEMS
  return (
    <div style={{
      position: 'fixed', left: 14, right: 14,
      bottom: 'calc(13px + env(safe-area-inset-bottom))',
      maxWidth: 492, margin: '0 auto',
      // Glass, as close as a web app gets.
      //
      // iOS 26's Liquid Glass does real refraction — the content behind
      // it bends. backdrop-filter can only blur and shift colour, so the
      // convincing part has to come from the edges: a bright inner line
      // along the top where light would catch, a darker one along the
      // bottom, and a shadow underneath so the bar sits above the page
      // rather than on it.
      background: 'linear-gradient(160deg,rgba(255,252,246,.10),rgba(255,252,246,.04))',
      backdropFilter: 'blur(28px) saturate(180%)',
      WebkitBackdropFilter: 'blur(28px) saturate(180%)',
      border: '1px solid rgba(255,252,246,.12)',
      boxShadow: 'inset 0 1px 0 rgba(255,252,246,.20),' +
                 'inset 0 -1px 0 rgba(0,0,0,.35),' +
                 '0 8px 32px rgba(0,0,0,.55)',
      borderRadius: 999,
      padding: 5, display: 'grid',
      gridTemplateColumns: `repeat(${(items?.length || 4)},1fr)`,
      zIndex: 60,
    }}>
      {rows.map(([k, label, d]) => {
        const on = tab === k
        return (
          <button key={k} onClick={() => setTab(k)} style={{
            border: 'none', borderRadius: 999, padding: '8px 0 7px',
            cursor: 'pointer', background: on ? C.card3 : 'transparent',
            display: 'grid', justifyItems: 'center', gap: 3, fontFamily: F,
            transition: 'background .18s',
          }}>
            {d
              ? <Ico d={d} s={18} c={on ? C.ink : C.mute} w={on ? 2.2 : 1.9} />
              : <span style={{ opacity: on ? 1 : .42, display: 'block' }}>
                  <Mark s={19} />
                </span>}
            <span style={{ fontSize: 10, fontWeight: on ? 700 : 600,
              color: on ? C.ink : C.mute }}>{label}</span>
          </button>
        )
      })}
    </div>
  )
}
