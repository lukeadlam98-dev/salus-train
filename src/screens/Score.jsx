import { C, T } from '../lib/theme'
import { fmt, hhmm } from '../lib/format'
import { Card, Label } from '../components/ui'

const raw = (v, unit) =>
  unit === 'time' ? (v > 3600 ? hhmm(v) : fmt(v))
  : unit === 'ratio' ? `${Number(v)} kg`
  : String(v)

// The score, with its working shown. A single number nobody can
// interrogate is a number nobody trusts — so every test is listed
// with what it scored and why.
export default function Score({ score, compact }) {
  if (!score || !score.rows?.length) return null
  const { rows, overall, tests } = score

  const band =
    overall >= 80 ? 'Strong across the board'
    : overall >= 60 ? 'Solid, with room in places'
    : overall >= 40 ? 'The block will move this'
    : 'Early days — that is what week one is for'

  if (compact) return (
    <Card style={{ border: `1px solid ${C.gLine}` }}>
      <Label style={{ color: C.g }}>SALUS SCORE</Label>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 6 }}>
        <div style={{ fontSize: 40, fontWeight: 900, letterSpacing: '-.05em',
          lineHeight: 1, ...T.num }}>{overall}</div>
        <div style={{ fontSize: 15, fontWeight: 700, color: C.sub }}>/ 100</div>
      </div>
      <div style={{ ...T.body, fontSize: 13, marginTop: 6 }}>
        {tests} of 5 tests in. {band}.
      </div>
    </Card>
  )

  return (
    <>
      <Card style={{ border: `1px solid ${C.gLine}` }}>
        <Label style={{ color: C.g }}>SALUS SCORE</Label>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 6 }}>
          <div style={{ fontSize: 48, fontWeight: 900, letterSpacing: '-.05em',
            lineHeight: 1, ...T.num }}>{overall}</div>
          <div style={{ fontSize: 17, fontWeight: 700, color: C.sub }}>/ 100</div>
        </div>
        <div style={{ ...T.body, fontSize: 13.5, marginTop: 7 }}>
          The average of {tests} test{tests === 1 ? '' : 's'}, each scored against a
          fixed standard rather than against everyone else — so it only moves when
          you do.
        </div>
      </Card>

      <Label style={{ margin: '24px 0 11px' }}>WHERE IT COMES FROM</Label>
      <Card style={{ padding: '4px 15px' }}>
        {rows.map((r, i) => (
          <div key={r.key} style={{ padding: '13px 0',
            borderTop: i ? `1px solid ${C.line}` : 'none' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <div style={{ flex: 1, fontSize: 15, fontWeight: 600 }}>{r.label}</div>
              <div style={{ fontSize: 13, color: C.sub, ...T.num }}>
                {raw(Number(r.raw), r.unit)}
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, width: 34,
                textAlign: 'right', ...T.num,
                color: Number(r.score) >= 70 ? C.g : C.ink }}>
                {Number(r.score)}
              </div>
            </div>
            <div style={{ height: 4, background: C.card3, borderRadius: 999,
              marginTop: 8, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Number(r.score)}%`,
                background: Number(r.score) >= 70 ? C.g : C.mute,
                borderRadius: 999, transition: 'width .4s' }} />
            </div>
          </div>
        ))}
      </Card>

      {rows.length > 1 && (() => {
        const low = [...rows].sort((a, b) => a.score - b.score)[0]
        return (
          <Card style={{ marginTop: 12, background: C.card2 }}>
            <div style={{ ...T.body, fontSize: 13.5 }}>
              <b style={{ color: C.ink }}>{low.label}</b> is your lowest at{' '}
              {Number(low.score)}. Moving that one moves the whole score furthest —
              it's where the block should be pointed.
            </div>
          </Card>
        )
      })()}
    </>
  )
}
