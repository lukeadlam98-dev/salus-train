import { useState, useEffect } from 'react'
import { C, T, F } from '../lib/theme'
import { A } from './theme'
import * as api from './api'
import { Btn } from './widgets'

const ago = d => {
  if (!d) return 'never'
  const days = Math.floor((Date.now() - new Date(d)) / 86400000)
  if (days === 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 7) return `${days} days ago`
  if (days < 14) return 'last week'
  return `${Math.floor(days / 7)} weeks ago`
}

// The morning view.
//
// Everything else in the back office describes what the programme
// says. This is the only screen that answers what a coach actually
// wants to know before opening the doors: who is in, who has gone
// quiet, and who is training on numbers they never set.
//
// Ordered by how much it matters. Somebody who hasn't been in for
// twelve days is a conversation this week; somebody who missed
// Tuesday is not.
export default function Floor({ onOpenMember }) {
  const [rows, setRows] = useState([])
  const [today, setToday] = useState(null)
  const [ready, setReady] = useState(false)
  const [err, setErr] = useState(null)

  useEffect(() => {
    Promise.all([
      api.getFloor().then(setRows),
      api.getFloorToday().then(setToday),
    ]).catch(e => setErr(e.message)).finally(() => setReady(true))
  }, [])

  if (err) return <div style={{ color: C.red }}>{err}</div>
  if (!ready) return <div style={T.body}>Loading…</div>

  const inToday  = rows.filter(r => r.sessions_today > 0)
  const gone     = rows.filter(r => (r.days_since ?? 99) >= 5)
                       .sort((a, b) => (b.days_since ?? 99) - (a.days_since ?? 99))
  const untested = rows.filter(r => r.tests_done < 5)
  const behind   = rows.filter(r =>
    r.sessions_this_week > 0 &&
    r.done_this_week === 0 &&
    (r.days_since ?? 99) < 5)

  const hrs = Math.round((today?.minutes_today || 0) / 60)

  return (
    <div>
      <h1 style={T.h1}>The floor</h1>
      <p style={{ ...T.body, marginTop: 7, maxWidth: 560 }}>
        {new Date().toLocaleDateString('en-GB',
          { weekday: 'long', day: 'numeric', month: 'long' })}
      </p>

      {/* ---- today ---- */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)',
        gap: 12, marginTop: 22 }}>
        <Stat n={today?.trained_today ?? 0} of={today?.members}
          label="IN TODAY" />
        <Stat n={today?.sessions_today ?? 0} label="SESSIONS" />
        <Stat n={hrs} label="HOURS" />
        <Stat n={gone.length} label="GONE QUIET" warn={gone.length > 0} />
      </div>

      {/* ---- who's been in ---- */}
      <Section title="IN TODAY"
        empty="Nobody yet. It's early.">
        {inToday.map(r => (
          <Row key={r.id} r={r} onClick={() => onOpenMember(r.id)}
            right={<span style={{ fontSize: 13, color: C.g, fontWeight: 700 }}>
              {r.sessions_today} {r.sessions_today === 1 ? 'session' : 'sessions'}
            </span>} />
        ))}
      </Section>

      {/* ---- who's gone ---- */}
      {gone.length > 0 && (
        <Section title="GONE QUIET"
          note="Five days or more since they last logged. Worth a message before it becomes a month.">
          {gone.map(r => (
            <Row key={r.id} r={r} onClick={() => onOpenMember(r.id)}
              right={<span style={{ fontSize: 13, color: C.red,
                fontWeight: 600 }}>{ago(r.last_trained)}</span>} />
          ))}
        </Section>
      )}

      {/* ---- not started the week ---- */}
      {behind.length > 0 && (
        <Section title="NOTHING THIS WEEK YET"
          note="In recently, but hasn't started the week they're on.">
          {behind.map(r => (
            <Row key={r.id} r={r} onClick={() => onOpenMember(r.id)}
              right={<span style={{ fontSize: 13, color: C.sub }}>
                0 of {r.sessions_this_week}
              </span>} />
          ))}
        </Section>
      )}

      {/* ---- untested ---- */}
      {untested.length > 0 && (
        <Section title="STILL TESTING"
          note="Training on default weights until these are in. This is the one that quietly wastes a block.">
          {untested.map(r => (
            <Row key={r.id} r={r} onClick={() => onOpenMember(r.id)}
              right={<span style={{ fontSize: 13, color: C.sub }}>
                {r.tests_done} of 5
              </span>} />
          ))}
        </Section>
      )}
    </div>
  )
}

const Stat = ({ n, of, label, warn }) => (
  <div style={{ background: C.card, border: `1px solid ${C.line}`,
    borderRadius: 12, padding: 16, boxShadow: C.shadow }}>
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
      <div style={{ fontSize: 27, fontWeight: 800, letterSpacing: '-.04em',
        color: warn ? C.red : C.ink }}>{n}</div>
      {of != null && (
        <div style={{ fontSize: 14, fontWeight: 600, color: A.mute }}>/{of}</div>
      )}
    </div>
    <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.13em',
      color: A.mute, marginTop: 7 }}>{label}</div>
  </div>
)

const Section = ({ title, note, empty, children }) => (
  <>
    <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.13em',
      color: A.mute, margin: '30px 0 4px' }}>{title}</div>
    {note && (
      <div style={{ fontSize: 12.5, color: C.sub, marginBottom: 11,
        maxWidth: 520, lineHeight: 1.5 }}>{note}</div>
    )}
    <div style={{ background: C.card, border: `1px solid ${C.line}`,
      borderRadius: 12, boxShadow: C.shadow, padding: '2px 15px',
      marginTop: note ? 0 : 11 }}>
      {children?.length ? children : (
        <div style={{ ...T.body, fontSize: 13.5, padding: '16px 0' }}>
          {empty || 'Nobody.'}
        </div>
      )}
    </div>
  </>
)

const Row = ({ r, right, onClick }) => (
  <div onClick={onClick} style={{ display: 'flex', alignItems: 'center',
    gap: 13, padding: '13px 0', cursor: 'pointer',
    borderTop: `1px solid ${C.line}` }}>
    <div style={{ width: 32, height: 32, borderRadius: 999, flexShrink: 0,
      background: C.card2, display: 'grid', placeItems: 'center',
      fontSize: 13, fontWeight: 800, color: C.sub }}>
      {(r.name || '?')[0]}
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 14.5, fontWeight: 600 }}>{r.name}</div>
      <div style={{ fontSize: 12, color: A.mute, marginTop: 2 }}>
        Week {r.week_idx} of {r.total_weeks || 8}
        {r.done_this_week > 0 &&
          ` · ${r.done_this_week} of ${r.sessions_this_week} done`}
      </div>
    </div>
    {right}
  </div>
)
