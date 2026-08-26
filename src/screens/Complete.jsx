import { C, T } from '../lib/theme'
import { fmt } from '../lib/format'
import { Card, Label, Btn, page } from '../components/ui'
import { EFFORT } from './Effort'

export default function Complete({ session, result, effort, onDone }) {
  const { elapsed, sets, blocks } = result
  const E = EFFORT[effort] || EFFORT[0]

  const exercises = []
  let volume = 0, setCount = 0, repCount = 0

  ;(blocks || []).forEach(b => (b.block_items || []).forEach(item => {
    const logs = []
    Array.from({ length: item.sets }).forEach((_, i) => {
      const c = sets[`${item.id}.${i}`]
      if (!c?.done) return
      const reps = parseFloat(c.reps) || 0
      const kg = parseFloat(c.kg) || 0
      setCount++; repCount += reps; volume += reps * kg
      logs.push({ set: i + 1, reps: c.reps, kg: c.kg })
    })
    if (logs.length) exercises.push({ name: item.movements?.name, scheme: b.scheme, logs })
  }))

  return (
    <div style={page}>
      <div style={{ textAlign: 'center', fontSize: 16, fontWeight: 700 }}>
        Session complete
      </div>

      <div style={{ ...T.body, fontSize: 13.5, marginTop: 22 }}>
        Salus · {new Date().toLocaleDateString('en-GB',
          { weekday: 'short', day: 'numeric', month: 'short' })}
      </div>
      <h1 style={{ ...T.h1, marginTop: 4 }}>{session.title}</h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 16 }}>
        <Card>
          <div style={{ fontSize: 13.5, color: C.sub, fontWeight: 600 }}>Total time</div>
          <div style={{ fontSize: 25, fontWeight: 800, letterSpacing: '-.035em',
            marginTop: 4, ...T.num }}>{fmt(elapsed)}</div>
        </Card>
        <Card>
          <div style={{ fontSize: 13.5, color: C.sub, fontWeight: 600 }}>Effort</div>
          <div style={{ fontSize: 25, fontWeight: 800, letterSpacing: '-.035em',
            marginTop: 4, ...T.num }}>{effort} / 10</div>
          <div style={{ fontSize: 13, color: C.sub, marginTop: 5, fontWeight: 600 }}>{E.l}</div>
        </Card>
      </div>

      {setCount > 0 && (
        <>
          <Label style={{ margin: '26px 0 11px' }}>YOUR SESSION</Label>
          <Card style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr 1fr' }}>
            {[[Math.round(volume).toLocaleString(), 'Total weight', 'kg'],
              [String(setCount), 'Sets'], [String(Math.round(repCount)), 'Reps']]
              .map(([v, l, u]) => (
              <div key={l}>
                <div style={{ fontSize: 13, color: C.sub, fontWeight: 600 }}>{l}</div>
                <div style={{ fontSize: 23, fontWeight: 800, letterSpacing: '-.035em',
                  marginTop: 3, ...T.num }}>
                  {v}{u && <span style={{ fontSize: 13, color: C.sub, marginLeft: 3 }}>{u}</span>}
                </div>
              </div>
            ))}
          </Card>
        </>
      )}

      {exercises.length > 0 && (
        <>
          <Label style={{ margin: '26px 0 11px' }}>EXERCISES</Label>
          {exercises.map(ex => (
            <Card key={ex.name} style={{ marginBottom: 10 }}>
              <div style={{ ...T.h3 }}>{ex.name}</div>
              <div style={{ ...T.body, fontSize: 13.5, marginTop: 2 }}>{ex.scheme}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
                fontSize: 13, color: C.sub, fontWeight: 600, marginTop: 12,
                paddingBottom: 5 }}>
                <div>Set</div>
                <div style={{ textAlign: 'right' }}>Reps</div>
                <div style={{ textAlign: 'right' }}>Weight</div>
              </div>
              {ex.logs.map(l => (
                <div key={l.set} style={{ display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr', padding: '10px 0', fontSize: 15,
                  fontWeight: 600, borderTop: `1px solid ${C.line}` }}>
                  <div>{l.set}</div>
                  <div style={{ textAlign: 'right', ...T.num }}>{l.reps}</div>
                  <div style={{ textAlign: 'right', ...T.num }}>
                    {l.kg || '—'}<span style={{ fontSize: 12, color: C.sub }}> kg</span>
                  </div>
                </div>
              ))}
            </Card>
          ))}
        </>
      )}

      <Btn style={{ marginTop: 18 }} onClick={onDone}>Done</Btn>
    </div>
  )
}
