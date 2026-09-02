import { useState, useEffect } from 'react'
import { C, T, F } from '../lib/theme'
import { Ico, I } from '../components/ui'
import * as api from './api'
import { Save, Btn, Confirm } from './widgets'

const TAGS = ['RACE DAY', 'TIMETABLE', 'THE ROOM', 'PROGRAMME', 'SOCIAL']

// A board, not a list.
//
// Notices are short and unrelated to each other — a list implies a
// sequence they don't have. Cards on a board is closer to what this
// actually is, and it's what the thing on the wall at Salus looks
// like, which is the point of reference members already have.
export default function Notices() {
  const [rows, setRows] = useState([])
  const [err, setErr] = useState(null)
  const [busy, setBusy] = useState(null)

  const load = () => api.listNotices().then(setRows).catch(e => setErr(e.message))
  useEffect(() => { load() }, [])

  // Optimistic. Pinning reorders the board, and waiting for a round
  // trip before the card moves makes the click feel ignored.
  async function togglePin(n) {
    const next = !n.pinned
    setBusy(n.id)
    setRows(rs => sort(rs.map(r => r.id === n.id ? { ...r, pinned: next } : r)))
    try { await api.setNotice(n.id, { pinned: next }) }
    catch (e) { setErr(e.message); await load() }
    setBusy(null)
  }

  const sort = rs => [...rs].sort((a, b) =>
    (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) ||
    new Date(b.published_at) - new Date(a.published_at))

  async function add() {
    try { await api.addNotice(); await load() }
    catch (e) { setErr(e.message) }
  }

  const pinned = rows.filter(r => r.pinned)
  const rest = rows.filter(r => !r.pinned)

  return (
    <div style={{ maxWidth: 900 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20,
        marginBottom: 22 }}>
        <div style={{ flex: 1 }}>
          <h1 style={T.h1}>The board</h1>
          <p style={{ ...T.body, marginTop: 7, maxWidth: 520 }}>
            What members see under "What's on at Salus". Pinned notices sit at
            the top of their Today screen until you unpin them.
          </p>
        </div>
        <Btn tone="solid" onClick={add}>Pin something up</Btn>
      </div>

      {err && (
        <div style={{ background: C.card, border: `1px solid ${C.line}`,
          borderRadius: 10, padding: '11px 14px', fontSize: 13, color: C.red,
          marginBottom: 18 }}>{err}</div>
      )}

      {pinned.length > 0 && (
        <>
          <Label>PINNED</Label>
          <Grid>
            {pinned.map(n => (
              <NoteCard key={n.id} n={n} busy={busy === n.id}
                onPin={() => togglePin(n)} onChanged={load} />
            ))}
          </Grid>
        </>
      )}

      {rest.length > 0 && (
        <>
          <Label style={{ marginTop: pinned.length ? 30 : 0 }}>
            {pinned.length ? 'EVERYTHING ELSE' : 'ON THE BOARD'}
          </Label>
          <Grid>
            {rest.map(n => (
              <NoteCard key={n.id} n={n} busy={busy === n.id}
                onPin={() => togglePin(n)} onChanged={load} />
            ))}
          </Grid>
        </>
      )}

      {rows.length === 0 && (
        <div onClick={add} style={{ border: `1px dashed ${C.line}`,
          borderRadius: 14, padding: '46px 20px', textAlign: 'center',
          cursor: 'pointer' }}>
          <div style={{ fontSize: 15.5, fontWeight: 700 }}>Nothing on the board</div>
          <div style={{ ...T.body, fontSize: 13, marginTop: 6 }}>
            Race day logistics, a timetable change, new kit in the room.
          </div>
        </div>
      )}
    </div>
  )
}

const Label = ({ children, style }) => (
  <div style={{ ...T.label, marginBottom: 11, ...style }}>{children}</div>
)

const Grid = ({ children }) => (
  <div style={{ display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill,minmax(272px,1fr))', gap: 14 }}>
    {children}
  </div>
)

function NoteCard({ n, busy, onPin, onChanged }) {
  const [open, setOpen] = useState(false)

  return (
    <div style={{
      position: 'relative',
      background: C.card,
      border: `1px solid ${n.pinned ? C.gLine : C.line}`,
      borderRadius: 12,
      padding: '18px 15px 14px',
      boxShadow: n.pinned
        ? '0 4px 16px rgba(26,22,19,.09)'
        : C.shadow,
      transition: 'box-shadow .2s, border-color .2s',
    }}>
      {/* the pin itself — the whole point of the metaphor */}
      <button onClick={onPin} disabled={busy} title={n.pinned ? 'Unpin' : 'Pin'}
        style={{
          position: 'absolute', top: -9, right: 13,
          width: 26, height: 26, borderRadius: 999, cursor: 'pointer',
          border: `1px solid ${n.pinned ? 'transparent' : C.line}`,
          background: n.pinned ? C.g : C.card,
          display: 'grid', placeItems: 'center',
          opacity: busy ? .5 : 1, transition: 'all .18s',
          boxShadow: n.pinned ? '0 2px 8px rgba(26,22,19,.18)' : 'none',
        }}>
        <Ico d={I.pin} s={13} c={n.pinned ? C.card : C.mute} w={2} />
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8,
        paddingRight: 30 }}>
        <span style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '.13em',
          color: n.pinned ? C.g : C.mute }}>{n.tag}</span>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 10.5, color: C.mute }}>
          {new Date(n.published_at).toLocaleDateString('en-GB',
            { day: 'numeric', month: 'short' })}
        </span>
      </div>

      {open ? (
        <div style={{ marginTop: 11 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5,
            marginBottom: 9 }}>
            {TAGS.map(t => (
              <button key={t} onClick={() => {
                  api.setNotice(n.id, { tag: t }).then(onChanged)
                }}
                style={{ borderRadius: 999, padding: '4px 9px', fontSize: 9.5,
                  fontWeight: 800, letterSpacing: '.05em', cursor: 'pointer',
                  fontFamily: F,
                  background: n.tag === t ? C.ink : 'transparent',
                  border: `1px solid ${n.tag === t ? C.ink : C.line}`,
                  color: n.tag === t ? C.bg : C.sub }}>{t}</button>
            ))}
          </div>
          <Save value={n.title} placeholder="Headline"
            onSave={v => api.setNotice(n.id, { title: v })} />
          <div style={{ marginTop: 7 }}>
            <Save value={n.body} rows={4} placeholder="The detail…"
              onSave={v => api.setNotice(n.id, { body: v })} />
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 11 }}>
            <Btn small tone="soft" style={{ flex: 1 }}
              onClick={() => setOpen(false)}>Done</Btn>
            <Confirm onConfirm={() => api.deleteNotice(n.id).then(onChanged)} />
          </div>
        </div>
      ) : (
        <div onClick={() => setOpen(true)} style={{ cursor: 'pointer' }}>
          <div style={{ fontSize: 15.5, fontWeight: 700, marginTop: 7,
            letterSpacing: '-.02em', lineHeight: 1.3 }}>
            {n.title || <span style={{ color: C.mute }}>Untitled</span>}
          </div>
          <div style={{ ...T.body, fontSize: 12.5, marginTop: 6,
            display: '-webkit-box', WebkitLineClamp: 4,
            WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {n.body || <span style={{ color: C.mute }}>No detail yet.</span>}
          </div>
          <div style={{ fontSize: 11, color: C.mute, marginTop: 10,
            fontWeight: 600 }}>Click to edit</div>
        </div>
      )}
    </div>
  )
}
