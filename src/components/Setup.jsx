import { useState } from 'react'
import { C, T, F, FLOAT } from '../lib/theme'
import { fmt } from '../lib/format'
import { Ico, I, Sheet, Btn } from './ui'

// A persistent nudge, above the tabs, until the tests are done.
//
// The five tests are what every weight, pace and projection in the
// block is calculated from — a member who skips them gets a programme
// full of guesses and never knows it. So this doesn't go away on its
// own and isn't dismissible: it goes away when it's finished.
//
// It does disappear the moment they're done, which is the part that
// makes it a nudge rather than nagging.

const TESTS = [
  { key: 'bw',       label: 'Bodyweight',         why: 'Everything relative is worked out from it.',
    fmt: v => `${v.value_num} kg` },
  { key: 'squat',    label: 'Back squat 3RM',     why: 'Sets every squat, lunge and step-up in the block.',
    fmt: v => `${v.value_num} kg` },
  { key: 'deadlift', label: 'Deadlift 5RM',       why: 'Sets the pulls.',
    fmt: v => `${v.value_num} kg` },
  { key: 'press',    label: 'Shoulder press 1RM', why: 'Sets the overhead work.',
    fmt: v => `${v.value_num} kg` },
  { key: 'fivek',    label: '5km',                why: 'Sets every running pace, and half the projection.',
    fmt: v => fmt(v.value_s) },
  { key: 'ski',      label: '1,000m SkiErg',      why: 'Station one, and a read on your engine.',
    fmt: v => fmt(v.value_s) },
  { key: 'row',      label: '1,000m Row',         why: 'Station five, fresh.',
    fmt: v => fmt(v.value_s) },
  { key: 'wallball', label: 'Wall balls unbroken', why: 'How many before you put the ball down. Decides how the last station goes.',
    fmt: v => `${v.value_num} reps` },
]

const Ring = ({ done, total, size = 38 }) => {
  const r = (size - 4.5) / 2
  const c = 2 * Math.PI * r
  return (
    <div style={{ position: 'relative', width: size, height: size,
      flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={C.card3} strokeWidth="3" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={C.g} strokeWidth="3" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - done / total)}
          style={{ transition: 'stroke-dashoffset .45s' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'grid',
        placeItems: 'center', fontSize: 10.5, fontWeight: 800, ...T.num }}>
        {done}/{total}
      </div>
    </div>
  )
}

export default function Setup({ benchmarks = {}, half, onGoToTests,
                                onGoToHalf }) {
  const [open, setOpen] = useState(false)

  const items = [
    // A row with a null value is not a test that's been done.
    ...TESTS.map(t => {
      const v = benchmarks[t.key]
      const filled = !!v && (v.value_num != null || v.value_s != null)
      return { ...t, done: filled, value: filled ? t.fmt(v) : null }
    }),
    { key: 'half', label: 'The Salus Half', why: 'The one that turns a guess into a projection.',
      done: !!half?.total, value: half?.total ? fmt(half.total) : null },
  ]
  const done = items.filter(i => i.done).length
  const next = items.find(i => !i.done)

  if (done === items.length) return null

  return (
    <>
      <button onClick={() => setOpen(true)} style={{
        position: 'fixed', left: 14, right: 14,
        bottom: FLOAT.above, zIndex: 40,
        background: C.sheet, border: `1px solid ${C.line}`, borderRadius: 999,
        padding: '10px 10px 10px 18px', display: 'flex', alignItems: 'center',
        gap: 12, cursor: 'pointer', fontFamily: F, maxWidth: 492,
        margin: '0 auto',
        boxShadow: '0 8px 30px rgba(0,0,0,.5)',
        animation: 'up .35s ease',
      }}>
        <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
          <div style={{ fontSize: 15.5, fontWeight: 600, color: C.ink }}>
            Finish your testing
          </div>
          <div style={{ fontSize: 12.5, color: C.mute, marginTop: 2,
            overflow: 'hidden', textOverflow: 'ellipsis',
            whiteSpace: 'nowrap' }}>
            Next: {next.label}
          </div>
        </div>
        <Ring done={done} total={items.length} />
      </button>

      {open && (
        <Sheet onClose={() => setOpen(false)}>
          <div style={{ ...T.h2 }}>Your nine tests</div>
          <p style={{ ...T.small, marginTop: 7 }}>
            Every weight, every pace and the projection are worked out from
            these. Until they're in, the block is running on defaults.
          </p>

          <div style={{ marginTop: 20 }}>
            {items.map((t, i) => (
              <div key={t.key} style={{ display: 'flex', alignItems: 'flex-start',
                gap: 13, padding: '14px 0',
                borderTop: i ? `1px solid ${C.line}` : 'none' }}>
                <div style={{ width: 24, height: 24, borderRadius: 999,
                  flexShrink: 0, marginTop: 1,
                  background: t.done ? C.g : 'transparent',
                  border: t.done ? 'none' : `1.5px solid ${C.card3}`,
                  display: 'grid', placeItems: 'center' }}>
                  {t.done && <Ico d={I.check} s={12} c={C.bg} w={2.8} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 700,
                    color: t.done ? C.sub : C.ink }}>{t.label}</div>
                  <div style={{ fontSize: 12, color: C.mute, marginTop: 3,
                    lineHeight: 1.45 }}>{t.why}</div>
                </div>
                {t.done && (
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.sub,
                    ...T.num, flexShrink: 0 }}>{t.value}</div>
                )}
              </div>
            ))}
          </div>

          <Btn style={{ marginTop: 22 }}
            onClick={() => {
              setOpen(false)
              // The half is a session, not a number to type — send them
              // to the thing itself rather than to a list with no row
              // for it.
              next.key === 'half' ? onGoToHalf?.() : onGoToTests()
            }}>
            {next.key === 'half' ? 'Run the Salus Half' : `Put in ${next.label}`}
          </Btn>
          <button onClick={() => setOpen(false)} style={{ width: '100%',
            background: 'transparent', border: 'none', color: C.sub,
            fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: F,
            padding: '15px 0 0' }}>Not now</button>
        </Sheet>
      )}
    </>
  )
}
