import { useState, useEffect } from 'react'
import { C, T, F } from '../lib/theme'
import { A } from './theme'
import { fmt, hhmm, DAYS } from '../lib/format'
import { LEGS } from '../lib/half'
import * as api from './api'
import { Btn } from './widgets'

const ago = d => {
  if (!d) return null
  const days = Math.floor((Date.now() - new Date(d)) / 86400000)
  return days === 0 ? 'today' : days === 1 ? 'yesterday' : `${days}d ago`
}

export default function Members() {
  const [rows, setRows] = useState([])
  const [stations, setStations] = useState([])
  const [open, setOpen] = useState(null)
  const [err, setErr] = useState(null)

  useEffect(() => {
    api.listMembers().then(setRows).catch(e => setErr(e.message))
    api.getStationAverages().then(setStations).catch(() => {})
  }, [])

  if (open) return <Member id={open} onBack={() => setOpen(null)} />

  const members = rows.filter(r => r.role !== 'admin')
  const withHalf = members.filter(m => m.projected_s)
  const avgProjected = withHalf.length
    ? Math.round(withHalf.reduce((a, b) => a + b.projected_s, 0) / withHalf.length)
    : null
  const tested = members.filter(m => m.tests_done >= 5).length

  // The station the cohort is worst at, relative to the others.
  const worst = (() => {
    if (stations.length < 4) return null
    const avg = stations.reduce((a, b) => a + b.avg_s, 0) / stations.length
    return stations.map(s => ({ ...s, over: s.avg_s - avg }))
      .sort((a, b) => b.over - a.over)[0]
  })()

  return (
    <div>
      <h1 style={T.h1}>Members</h1>
      <p style={{ ...T.body, marginTop: 7, maxWidth: 560 }}>
        Everyone on the block, and where they are. Nothing here is editable —
        if a number looks wrong, ask them.
      </p>

      {err && <div style={{ color: C.red, fontSize: 13, marginTop: 14 }}>{err}</div>}

      <div style={{ display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 12,
        margin: '22px 0 26px' }}>
        <Stat n={members.length} label="Members" />
        <Stat n={tested} label="Tested all five" sub={`of ${members.length}`} />
        <Stat n={withHalf.length} label="Done the half" sub={`of ${members.length}`} />
        <Stat n={avgProjected ? hhmm(avgProjected) : '—'} label="Average projection" />
      </div>

      {worst && (
        <div style={{ background: C.card, border: `1px solid ${C.line}`,
          borderRadius: 13, padding: 15, marginBottom: 22, boxShadow: C.shadow,
          maxWidth: 620 }}>
          <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '.13em',
            color: C.g }}>THE COHORT'S WEAKEST STATION</div>
          <div style={{ fontSize: 19, fontWeight: 800, letterSpacing: '-.03em',
            marginTop: 6 }}>
            {LEGS.find(l => l.key === worst.leg_key)?.name || worst.leg_key}
          </div>
          <div style={{ ...T.body, fontSize: 13, marginTop: 5 }}>
            Averaging {fmt(worst.avg_s)}, which is {fmt(worst.over)} above the
            average station. If that holds, it's a programming problem rather than
            eight individual ones.
          </div>
        </div>
      )}

      <div style={{ background: C.card, border: `1px solid ${C.line}`,
        borderRadius: 14, overflow: 'hidden', boxShadow: C.shadow }}>
        <Row head cells={['Name', 'Race', 'Tests', 'Half', 'Projected',
          'Sessions', 'Last seen', '']} />
        {members.map(m => (
          <Row key={m.id} onClick={() => setOpen(m.id)} cells={[
            <b style={{ fontWeight: 700 }}>{m.name || 'No name yet'}</b>,
            m.race_date
              ? new Date(m.race_date).toLocaleDateString('en-GB',
                  { day: 'numeric', month: 'short' })
              : dim('—'),
            m.tests_done >= 5
              ? <Tick />
              : <span style={{ color: C.mute }}>{m.tests_done}/5</span>,
            m.half_s ? hhmm(m.half_s) : dim('—'),
            m.projected_s
              ? <b style={{ fontWeight: 700 }}>{hhmm(m.projected_s)}</b>
              : dim('—'),
            m.sessions_done || dim('0'),
            ago(m.last_trained) || dim('never'),
            <span style={{ color: C.mute, fontSize: 15 }}>›</span>,
          ]} />
        ))}
        {members.length === 0 && !err && (
          <div style={{ ...T.body, padding: 20 }}>Nobody has signed up yet.</div>
        )}
      </div>
    </div>
  )
}

const dim = t => <span style={{ color: C.mute }}>{t}</span>
const Tick = () => <span style={{ color: C.g, fontWeight: 700 }}>✓</span>

const Stat = ({ n, label, sub }) => (
  <div style={{ background: C.card, border: `1px solid ${C.line}`,
    borderRadius: 13, padding: 15, boxShadow: C.shadow }}>
    <div style={{ fontSize: 25, fontWeight: 800, letterSpacing: '-.04em',
      fontVariantNumeric: 'tabular-nums' }}>{n}</div>
    <div style={{ fontSize: 12, color: C.sub, marginTop: 4, fontWeight: 600 }}>
      {label}{sub && <span style={{ color: C.mute }}> {sub}</span>}
    </div>
  </div>
)

const Row = ({ cells, head, onClick }) => (
  <div onClick={onClick} style={{
    display: 'grid',
    gridTemplateColumns: 'minmax(0,1.6fr) 90px 62px 82px 92px 78px 92px 24px',
    gap: 12, padding: head ? '11px 16px' : '13px 16px', alignItems: 'center',
    cursor: onClick ? 'pointer' : 'default',
    borderTop: head ? 'none' : `1px solid ${C.line}`,
    background: head ? C.card2 : 'transparent',
    fontSize: head ? 11 : 13.5,
    fontWeight: head ? 700 : 500,
    color: head ? C.sub : C.ink,
    letterSpacing: head ? '.03em' : 0,
  }}>
    {cells.map((c, i) => <div key={i} style={{ overflow: 'hidden',
      textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c}</div>)}
  </div>
)

/* ---------------- one member ---------------- */
function Member({ id, onBack }) {
  const [d, setD] = useState(null)
  const [err, setErr] = useState(null)
  useEffect(() => { api.getMember(id).then(setD).catch(e => setErr(e.message)) }, [id])

  if (err) return <div style={{ color: C.red }}>{err}</div>
  if (!d) return <div style={T.body}>Loading…</div>

  const p = d.profile
  const si = p.squat_kg && p.bodyweight_kg ? p.squat_kg / p.bodyweight_kg : null
  const bm = k => d.benchmarks.find(b => b.key === k && b.week === 1)
  const half = d.halves.find(h => h.week_idx === 1)

  const splits = LEGS.map(l => ({
    ...l,
    s: d.splits.find(x => x.leg_key === l.key)?.seconds ?? null,
  }))
  const stns = splits.filter(x => x.type === 'stn' && x.s != null)
  const avgStn = stns.length ? stns.reduce((a, b) => a + b.s, 0) / stns.length : null
  const weakest = avgStn
    ? stns.map(x => ({ ...x, over: x.s - avgStn })).sort((a, b) => b.over - a.over)[0]
    : null

  return (
    <div>
      <Btn small tone="line" onClick={onBack} style={{ marginBottom: 18 }}>
        ← All members
      </Btn>

      {/* Which week they're on. A coach needs to move this for someone
          joining late, coming back from a fortnight off, or repeating a
          week that didn't land. */}
      <WeekControl id={id} idx={p.week_idx || 1}
        onSet={v => setD({ ...d, profile: { ...p, week_idx: v } })} />

      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16 }}>
        <div style={{ flex: 1 }}>
          <h1 style={T.h1}>{p.name || 'No name yet'}</h1>
          <p style={{ ...T.body, marginTop: 6 }}>
            {p.race_date
              ? `Racing ${new Date(p.race_date).toLocaleDateString('en-GB',
                  { weekday: 'short', day: 'numeric', month: 'long' })}`
              : 'No race set'}
            {p.race_division && ` · ${p.race_division}`}
          </p>
        </div>
        <div style={{ flex: 1 }} />
        {p.projected_s && (
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '.13em',
              color: C.g }}>PROJECTED</div>
            <div style={{ fontSize: 30, fontWeight: 900, letterSpacing: '-.04em',
              fontVariantNumeric: 'tabular-nums' }}>{hhmm(p.projected_s)}</div>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16,
        marginTop: 26, alignItems: 'start' }}>

        <Panel title="Benchmarks"
          sub={si ? `Strength index ${si.toFixed(2)}× bodyweight` : 'Not all set yet'}>
          {[['squat', 'Back squat 5RM', v => `${v.value_num} kg`],
            ['bw', 'Bodyweight', v => `${v.value_num} kg`],
            ['fivek', '5km', v => fmt(v.value_s)],
            ['ski', '1k SkiErg', v => fmt(v.value_s)],
            ['row', '1k Row', v => fmt(v.value_s)]].map(([k, label, show], i) => {
            const v = bm(k)
            return (
              <div key={k} style={{ display: 'flex', padding: '11px 0',
                borderTop: i ? `1px solid ${C.line}` : 'none' }}>
                <div style={{ flex: 1, fontSize: 13.5 }}>{label}</div>
                <div style={{ fontSize: 14.5, fontWeight: 700,
                  fontVariantNumeric: 'tabular-nums',
                  color: v ? C.ink : C.mute }}>{v ? show(v) : '—'}</div>
              </div>
            )
          })}
        </Panel>

        <Panel title="The Salus Half"
          sub={half ? `${hhmm(half.total_s)} → ${hhmm(half.projected_s)}`
                    : 'Not done yet'}>
          {half ? (
            <>
              {weakest && (
                <div style={{ background: C.card2, borderRadius: 10, padding: 12,
                  marginBottom: 12 }}>
                  <div style={{ fontSize: 10.5, fontWeight: 800,
                    letterSpacing: '.12em', color: C.g }}>WEAKEST STATION</div>
                  <div style={{ fontSize: 15.5, fontWeight: 700, marginTop: 4 }}>
                    {weakest.name} · {fmt(weakest.s)}
                  </div>
                  <div style={{ fontSize: 12, color: C.sub, marginTop: 3 }}>
                    {fmt(weakest.over)} above their own station average.
                  </div>
                </div>
              )}
              {splits.map((l, i) => (
                <div key={l.key} style={{ display: 'flex', alignItems: 'center',
                  gap: 10, padding: '8px 0',
                  borderTop: i ? `1px solid ${C.line}` : 'none' }}>
                  <div style={{ width: 20, fontSize: 10, fontWeight: 800,
                    color: C.mute }}>{l.type === 'run' ? 'R' : '•'}</div>
                  <div style={{ flex: 1, fontSize: 13,
                    color: l.type === 'run' ? C.sub : C.ink }}>{l.name}</div>
                  <div style={{ fontSize: 13.5, fontWeight: 700,
                    fontVariantNumeric: 'tabular-nums',
                    color: l.s ? C.ink : C.mute }}>{l.s ? fmt(l.s) : '—'}</div>
                </div>
              ))}
            </>
          ) : (
            <div style={{ ...T.body, fontSize: 13 }}>
              Once they run it, this shows all sixteen splits and names the
              station costing them most.
            </div>
          )}
        </Panel>
      </div>

      <Panel title="Recent sessions"
        sub={`${p.sessions_done || 0} logged`} style={{ marginTop: 16 }}>
        {d.workouts.length === 0 && (
          <div style={{ ...T.body, fontSize: 13 }}>Nothing logged yet.</div>
        )}
        {d.workouts.map((w, i) => (
          <div key={w.id} style={{ display: 'flex', alignItems: 'center', gap: 12,
            padding: '10px 0', borderTop: i ? `1px solid ${C.line}` : 'none' }}>
            <div style={{ width: 78, fontSize: 12, color: C.mute }}>
              {new Date(w.started_at).toLocaleDateString('en-GB',
                { day: 'numeric', month: 'short' })}
            </div>
            <div style={{ flex: 1, fontSize: 13.5, fontWeight: 600 }}>
              {w.sessions?.title || 'Session'}
              {w.sessions?.weeks?.idx &&
                <span style={{ color: C.mute, fontWeight: 500 }}>
                  {' '}· week {w.sessions.weeks.idx}</span>}
            </div>
            {w.effort != null && (
              <div style={{ fontSize: 12, color: C.sub }}>{w.effort}/10</div>
            )}
            <div style={{ fontSize: 13, fontWeight: 700,
              fontVariantNumeric: 'tabular-nums',
              color: w.ended_at ? C.ink : C.mute }}>
              {w.elapsed_s ? fmt(w.elapsed_s) : 'unfinished'}
            </div>
          </div>
        ))}
      </Panel>
    </div>
  )
}

const Panel = ({ title, sub, children, style }) => (
  <div style={{ background: C.card, border: `1px solid ${C.line}`,
    borderRadius: 14, padding: 16, boxShadow: C.shadow, ...style }}>
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 10,
      marginBottom: 12 }}>
      <div style={{ fontSize: 15.5, fontWeight: 800,
        letterSpacing: '-.02em' }}>{title}</div>
      {sub && <div style={{ fontSize: 12.5, color: C.sub }}>{sub}</div>}
    </div>
    {children}
  </div>
)


function WeekControl({ id, idx, onSet }) {
  const [busy, setBusy] = useState(false)
  const go = async v => {
    setBusy(true)
    try { const n = await api.setMemberWeek(id, v); onSet(n) }
    catch {}
    setBusy(false)
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12,
      background: C.card, border: `1px solid ${C.line}`, borderRadius: 12,
      padding: '12px 15px', marginBottom: 18 }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14.5, fontWeight: 700 }}>On week {idx}</div>
        <div style={{ fontSize: 12, color: C.sub, marginTop: 2 }}>
          What they see on Train. Move it if they've joined late or missed time.
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
          <button key={n} disabled={busy} onClick={() => go(n)}
            style={{ width: 32, height: 32, borderRadius: 8, fontSize: 13,
              fontWeight: 700, cursor: 'pointer', fontFamily: F,
              background: n === idx ? C.ink : C.card2,
              border: `1px solid ${n === idx ? C.ink : C.line}`,
              color: n === idx ? C.card : C.sub }}>{n}</button>
        ))}
      </div>
    </div>
  )
}
