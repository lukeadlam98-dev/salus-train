import { useState, useEffect } from 'react'
import { C, T } from '../lib/theme'
import { getActivity, getMovements } from '../lib/data'
import { Card, Label, Back, Ico, I, page } from '../components/ui'
import { SkeletonList } from '../components/Skeleton'
import Empty from '../components/Empty'

const round2h = n => Math.round(n / 2.5) * 2.5

// A line, for shape rather than reading values off.
const Spark = ({ points, w = 60, h = 22 }) => {
  if (!points || points.length < 2) return null
  const max = Math.max(...points), min = Math.min(...points)
  const span = max - min || 1
  const d = points.map((v, i) =>
    `${(i / (points.length - 1)) * w},${h - ((v - min) / span) * h}`).join(' ')
  const rising = points[points.length - 1] >= points[0]
  return (
    <svg width={w} height={h} style={{ display: 'block' }}>
      <polyline points={d} fill="none"
        stroke={rising ? C.g : C.mute} strokeWidth="1.6"
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function Progress({ userId, onBack }) {
  const [range, setRange] = useState('week')
  const [act, setAct] = useState(null)
  const [movements, setMovements] = useState([])
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const since = range === 'week'
      ? new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10)
      : null
    getActivity(userId, since).then(setAct).catch(() => {})
  }, [userId, range])

  useEffect(() => {
    getMovements(userId).then(setMovements).catch(() => {})
      .finally(() => setReady(true))
  }, [userId])

  if (!ready) return <SkeletonList rows={6} />

  const hrs = Math.floor((act?.minutes || 0) / 60)
  const mins = (act?.minutes || 0) % 60

  return (
    <div style={page}>
      <Back onClick={onBack} />
      <h1 style={{ ...T.h1, marginTop: 20 }}>Progress</h1>

      <div style={{ display: 'flex', background: C.card2, borderRadius: 999,
        padding: 4, marginTop: 18 }}>
        {[['week', 'This week'], ['all', 'All time']].map(([k, l]) => {
          const on = range === k
          return (
            <button key={k} onClick={() => setRange(k)}
              style={{ flex: 1, border: 'none', borderRadius: 999, padding: '10px 0',
                fontSize: 14, fontWeight: 700, cursor: 'pointer',
                fontFamily: 'inherit',
                background: on ? C.ink : 'transparent',
                color: on ? C.bg : C.sub }}>{l}</button>
          )
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10,
        marginTop: 14 }}>
        <Stat label="Training time"
          value={hrs ? `${hrs}h ${mins}m` : `${mins}m`} />
        <Stat label="Sessions" value={String(act?.sessions ?? 0)} />
        <Stat label="Total weight"
          value={Math.round(act?.volume || 0).toLocaleString()} unit="kg" />
        <Stat label="Sets" value={String(act?.sets ?? 0)} />
      </div>

      <Label style={{ margin: '30px 0 12px' }}>MOVEMENTS</Label>

      {movements.length === 0 ? (
        <Empty icon={I.chart}
          title="Nothing to show yet"
          body="Log a few sessions and every movement appears here with what you lifted and whether it's going up." />
      ) : (
        <Card style={{ padding: '4px 15px' }} className="stagger">
          {movements.map((m, i) => (
            <div key={m.movement} style={{ display: 'flex', alignItems: 'center',
              gap: 13, padding: '14px 0',
              borderTop: i ? `1px solid ${C.line}` : 'none' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 700, overflow: 'hidden',
                  textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {m.movement}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7,
                  marginTop: 5 }}>
                  <span style={{ background: C.card3, borderRadius: 5,
                    padding: '2px 6px', fontSize: 9.5, fontWeight: 800,
                    letterSpacing: '.04em', color: C.sub }}>e1RM</span>
                  <span style={{ fontSize: 13.5, fontWeight: 700, ...T.num }}>
                    {round2h(Number(m.best_e1rm))} kg
                  </span>
                </div>
              </div>
              <Spark points={(m.points || []).map(Number)} />
            </div>
          ))}
        </Card>
      )}

      {movements.length > 0 && (
        <div style={{ ...T.small, fontSize: 12, marginTop: 14, lineHeight: 1.55 }}>
          e1RM is an estimate from what you actually lifted, not a max you've
          tested. It's reasonable up to about six reps and gets optimistic
          after that.
        </div>
      )}
    </div>
  )
}

const Stat = ({ label, value, unit }) => (
  <Card>
    <div style={{ ...T.small, fontSize: 13 }}>{label}</div>
    <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-.04em',
      marginTop: 5, ...T.num }}>
      {value}{unit && <span style={{ fontSize: 13, color: C.sub,
        marginLeft: 4 }}>{unit}</span>}
    </div>
  </Card>
)
