import { C, F } from '../lib/theme'
import { Ico, I, Mark } from './ui'

// Four, not five.
//
// Coaches came out. Messaging is one-way until a coach can reply, and
// even then it isn't a daily-use destination — it's something you do
// when you have a question. It lives on You, and next to the coach's
// notes inside a session, which is where the question actually occurs
// to someone.
const ITEMS = [
  ['today', 'Today', null],
  ['plan',  'Plan',  I.cal],
  ['board', 'Board', I.chart],
  ['you',   'You',   I.user],
]

export default function Tabs({ tab, setTab }) {
  return (
    <div style={{
      position: 'fixed', left: 14, right: 14,
      bottom: 'calc(13px + env(safe-area-inset-bottom))',
      maxWidth: 492, margin: '0 auto',
      background: C.sheet, border: `1px solid ${C.line}`, borderRadius: 999,
      padding: 5, display: 'grid', gridTemplateColumns: 'repeat(4,1fr)',
      zIndex: 60, boxShadow: C.shadow,
    }}>
      {ITEMS.map(([k, label, d]) => {
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
