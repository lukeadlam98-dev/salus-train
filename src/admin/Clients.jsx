import { useState, useEffect } from 'react'
import { C, T, F } from '../lib/theme'
import * as api from './api'
import { Btn, Confirm } from './widgets'

/* ---------------- 1:1 clients ----------------
   A roster, not a programme editor. Opening a client hands you to the
   same weeks and the same session editor the club programmes use —
   there is no second way to write a session, which is the only reason
   this screen is short. */

export default function Clients({ onOpen, me }) {
  const [rows, setRows] = useState([])
  const [members, setMembers] = useState([])
  const [err, setErr] = useState(null)
  const [memberErr, setMemberErr] = useState(null)
  const [adding, setAdding] = useState(false)
  const [ready, setReady] = useState(false)
  const [gotMembers, setGotMembers] = useState(false)

  const load = () => api.listClientProgrammes()
    .then(r => { setRows(r); setErr(null) })
    .catch(e => setErr(e.message))
    .finally(() => setReady(true))

  useEffect(() => {
    load()
    // This used to swallow its error. When the member list failed to
    // load there was nothing to pick, so the button greyed itself out
    // and said nothing — indistinguishable from the feature being
    // broken, which is how it was reported.
    api.listMembers()
      .then(m => { setMembers(m); setMemberErr(null) })
      .catch(e => setMemberErr(e.message))
      .finally(() => setGotMembers(true))
  }, [])

  // Somebody already on a 1:1 shouldn't appear in the picker — two
  // private programmes for one person means the app has to choose
  // between them, and it would choose wrong.
  const taken = new Set(rows.filter(r => !r.archived).map(r => r.client_id))
  const free = members.filter(m => !taken.has(m.id))
  const live = rows.filter(r => !r.archived)
  const past = rows.filter(r => r.archived)

  return (
    <div style={{ maxWidth: 900 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20,
        marginBottom: 22 }}>
        <div style={{ flex: 1 }}>
          <h1 style={T.h1}>1:1 clients</h1>
          <p style={{ ...T.body, marginTop: 7, maxWidth: 580 }}>
            A programme written for one person. It never appears in anyone
            else's picker, never counts towards a programme's members, and
            can't become the workout of the week — so you can write whatever
            that client needs without it leaking into the club.
          </p>
        </div>
        <Btn tone="solid" onClick={() => setAdding(true)}
          disabled={!gotMembers || free.length === 0}>
          New 1:1
        </Btn>
      </div>

      {err && <Note tone="bad">{err}</Note>}

      {/* A disabled button with no reason next to it is the worst thing
          this screen can do: there's nothing to read and nothing to try. */}
      {memberErr && (
        <Note tone="bad">
          Couldn't load the member list, so there's nobody to attach a
          programme to: {memberErr}
        </Note>
      )}
      {!memberErr && gotMembers && members.length === 0 && (
        <Note>No members found at all. If the app has members, this is
          usually a permissions problem — check your profile's role is
          admin.</Note>
      )}
      {!memberErr && gotMembers && members.length > 0 && free.length === 0 && (
        <Note>Every member already has a 1:1. End one below to free
          somebody up, or add the member first.</Note>
      )}

      {ready && !err && live.length === 0 && (
        <div style={{ border: `1px dashed ${C.line}`, borderRadius: 14,
          padding: '34px 22px', textAlign: 'center' }}>
          <div style={{ fontSize: 15, fontWeight: 700 }}>Nobody on a 1:1 yet</div>
          <p style={{ ...T.body, fontSize: 13, margin: '7px auto 0',
            maxWidth: 380 }}>
            Pick a member and the programme is made, the weeks are built, and
            they're put on it. Then you write the sessions the usual way.
          </p>
        </div>
      )}

      <div style={{ display: 'grid', gap: 10 }}>
        {live.map(r => (
          <Row key={r.id} r={r} onOpen={onOpen} me={me}
            onCopied={load}
            onEnd={() => api.endClientProgramme(r.id).then(load)} />
        ))}
      </div>

      {past.length > 0 && (
        <>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.13em',
            color: C.mute, margin: '28px 0 10px' }}>FINISHED</div>
          <div style={{ display: 'grid', gap: 10 }}>
            {past.map(r => (
              <Row key={r.id} r={r} muted onOpen={onOpen} />
            ))}
          </div>
        </>
      )}

      {adding && (
        <NewClient members={free} onClose={() => setAdding(false)}
          onDone={async () => { setAdding(false); await load() }} />
      )}
    </div>
  )
}

const Note = ({ children, tone }) => (
  <div style={{ background: C.card2, border: `1px solid ${C.line}`,
    borderRadius: 10, padding: '12px 15px', fontSize: 13,
    color: tone === 'bad' ? C.red : C.sub, marginBottom: 18,
    lineHeight: 1.5 }}>{children}</div>
)

function Row({ r, onOpen, onEnd, onCopied, me, muted }) {
  // Sessions written versus sessions done. A 1:1 that's been written
  // and never trained is the thing worth seeing from across the room.
  const pct = r.sessions ? Math.round((r.done / r.sessions) * 100) : 0
  const since = r.last_trained
    ? Math.floor((Date.now() - new Date(r.last_trained)) / 86400000)
    : null

  return (
    <div style={{ background: C.card, border: `1px solid ${C.line}`,
      borderRadius: 14, padding: '14px 16px', display: 'flex',
      alignItems: 'center', gap: 14, boxShadow: C.shadow,
      opacity: muted ? .6 : 1 }}>
      <div style={{ width: 40, height: 40, borderRadius: 999, flexShrink: 0,
        background: r.client_photo
          ? `#0B0A09 url(${r.client_photo}) center/cover`
          : C.card3,
        display: 'grid', placeItems: 'center', fontSize: 14, fontWeight: 800,
        color: C.sub }}>
        {!r.client_photo && (r.client_name || '?').slice(0, 1).toUpperCase()}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15.5, fontWeight: 700,
          letterSpacing: '-.01em' }}>{r.client_name}</div>
        <div style={{ fontSize: 12.5, color: C.sub, marginTop: 2,
          overflow: 'hidden', textOverflow: 'ellipsis',
          whiteSpace: 'nowrap' }}>
          {r.name} · week {r.week_idx} of {r.weeks}
          {since != null
            ? ` · trained ${since === 0 ? 'today' : since === 1 ? 'yesterday' : `${since} days ago`}`
            : ' · not started'}
        </div>
      </div>

      <div style={{ width: 92, textAlign: 'right' }}>
        <div style={{ fontSize: 15, fontWeight: 800, ...T.num }}>
          {r.done}<span style={{ color: C.mute, fontWeight: 600 }}>/{r.sessions}</span>
        </div>
        <div style={{ height: 3, borderRadius: 999, background: C.card3,
          marginTop: 5, overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, height: '100%', background: C.g }} />
        </div>
      </div>

      <Btn small tone="line" onClick={() => onOpen(r.id)}>Write sessions</Btn>
      {me && me !== r.client_id && onCopied && (
        <TryIt r={r} me={me} onDone={onCopied} />
      )}
      {onEnd && <Confirm label="End" onConfirm={onEnd} />}
    </div>
  )
}

// Copies the week onto you and moves you onto it, which means moving
// you off whatever you were on. Saying so first, with the way back,
// because a switch resets the week and finding that out afterwards is
// no use.
function TryIt({ r, me, onDone }) {
  const [ask, setAsk] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)

  async function go() {
    setBusy(true); setErr(null)
    try { await api.copyClientWeek(r.client_id, me, r.week_idx); setAsk(false); onDone() }
    catch (e) { setErr(e.message) } finally { setBusy(false) }
  }

  if (!ask) return (
    <Btn small tone="line" onClick={() => setAsk(true)}>Try it myself</Btn>
  )

  return (
    <>
      <div onClick={() => setAsk(false)} style={{ position: 'fixed', inset: 0,
        background: 'rgba(26,22,19,.5)', zIndex: 200 }} />
      <div style={{ position: 'fixed', top: '22%', left: '50%',
        transform: 'translateX(-50%)', width: 420, zIndex: 210,
        background: C.card, border: `1px solid ${C.line}`, borderRadius: 16,
        padding: 22, boxShadow: '0 20px 60px rgba(26,22,19,.25)' }}>
        <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-.03em' }}>
          Copy week {r.week_idx} onto yourself?
        </div>
        <p style={{ ...T.body, fontSize: 13, margin: '8px 0 14px' }}>
          You get your own private copy of {r.client_name}'s week {r.week_idx}
          {' '}— editing it won't touch hers. It moves you onto it, which
          means off whatever you're on now, and switching resets the week.
          Your tests and numbers all stay where they are.
        </p>
        {err && <div style={{ color: C.red, fontSize: 13,
          marginBottom: 10 }}>{err}</div>}
        <div style={{ display: 'flex', gap: 8 }}>
          <Btn tone="solid" disabled={busy} onClick={go} style={{ flex: 1 }}>
            {busy ? 'Copying\u2026' : 'Copy it to me'}
          </Btn>
          <Btn tone="line" onClick={() => setAsk(false)}>Cancel</Btn>
        </div>
      </div>
    </>
  )
}

function NewClient({ members, onClose, onDone }) {
  const [who, setWho] = useState('')
  const [name, setName] = useState('Full Body')
  const [weeks, setWeeks] = useState('4')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)

  const member = members.find(m => m.id === who)

  async function go() {
    setBusy(true); setErr(null)
    try {
      await api.createClientProgramme(who, name.trim() || null, weeks)
      onDone()
    } catch (e) { setErr(e.message); setBusy(false) }
  }

  const inp = { width: '100%', background: C.card2, color: C.ink,
    border: `1px solid ${C.line}`, borderRadius: 9, padding: '11px 13px',
    fontSize: 14.5, outline: 'none', fontFamily: F, marginBottom: 10 }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0,
        background: 'rgba(26,22,19,.5)', zIndex: 200 }} />
      <div style={{ position: 'fixed', top: '16%', left: '50%',
        transform: 'translateX(-50%)', width: 420, zIndex: 210,
        background: C.card, border: `1px solid ${C.line}`, borderRadius: 16,
        padding: 22, boxShadow: '0 20px 60px rgba(26,22,19,.25)' }}>
        <div style={{ fontSize: 19, fontWeight: 800,
          letterSpacing: '-.03em' }}>New 1:1</div>
        <p style={{ ...T.body, fontSize: 13, margin: '7px 0 16px' }}>
          The programme is made, its weeks are built and published, and this
          member is moved onto it straight away. Only they will ever see it.
        </p>

        <select value={who} onChange={e => setWho(e.target.value)}
          style={{ ...inp, fontWeight: 600 }}>
          <option value="">Which member…</option>
          {members.map(m => (
            <option key={m.id} value={m.id}>{m.name || 'Unnamed'}</option>
          ))}
        </select>

        <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.1em',
          color: C.mute, margin: '2px 0 6px' }}>
          WHAT IT'S CALLED — THIS IS WHAT THEY SEE ON TRAIN
        </div>
        <input value={name} onChange={e => setName(e.target.value)}
          placeholder="Full Body" style={inp} />
        <input value={weeks} onChange={e => setWeeks(e.target.value)}
          placeholder="How many weeks" style={inp} />

        {err && <div style={{ color: C.red, fontSize: 13,
          marginBottom: 10 }}>{err}</div>}

        <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
          <Btn tone="solid" disabled={busy || !who} onClick={go}
            style={{ flex: 1 }}>
            {busy ? 'Making…' : `Create ${weeks || 4} weeks`}
          </Btn>
          <Btn tone="line" onClick={onClose}>Cancel</Btn>
        </div>
      </div>
    </>
  )
}
