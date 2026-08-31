import { useState } from 'react'
import { C, T, F } from '../lib/theme'
import { fmt, hhmm } from '../lib/format'
import { postToRoom } from '../lib/data'
import { Sheet, Btn, Ico, I, Avatar } from '../components/ui'

// Telling the room you've done it.
//
// The message is drafted for them rather than left blank — most people
// won't write anything from cold, and "Lower A done. 52:08." posted by
// four people on a Monday is the thing that makes a small club feel
// like one.
//
// What goes in is theirs to edit or delete before it sends. Nothing is
// posted automatically: a bad session is nobody else's business unless
// the person says so.
export default function ShareToRoom({ userId, profile, workout, session,
                                      result, effort, onClose, onPosted }) {
  const time = result?.elapsed || workout?.elapsed_s
  const draft = [
    `${session?.title || 'Session'} done.`,
    time ? fmt(time) + '.' : null,
    effort >= 9 ? 'That one hurt.' : effort <= 4 ? 'Felt easy today.' : null,
  ].filter(Boolean).join(' ')

  const [text, setText] = useState(draft)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)

  async function post() {
    setBusy(true); setErr(null)
    try { await postToRoom(userId, text.trim()); onPosted?.() }
    catch (e) { setErr(e.message); setBusy(false) }
  }

  return (
    <Sheet onClose={onClose}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 11,
        marginBottom: 6 }}>
        <Avatar name={profile?.name || 'You'} size={34} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15.5, fontWeight: 700 }}>
            {profile?.name || 'You'}
          </div>
          <div style={{ fontSize: 12, color: C.mute, marginTop: 1 }}>
            Posting to the room
          </div>
        </div>
      </div>

      <textarea value={text} onChange={e => setText(e.target.value)} rows={3}
        autoFocus
        style={{ width: '100%', background: C.card2, color: C.ink,
          border: `1px solid ${C.line}`, borderRadius: 14, padding: '14px 15px',
          fontSize: 15.5, outline: 'none', fontFamily: F, lineHeight: 1.5,
          resize: 'none', marginTop: 12 }} />

      {/* What the session actually was, so the message has something
          behind it without having to type the numbers out. */}
      {(time || session) && (
        <div style={{ display: 'flex', gap: 8, marginTop: 12,
          flexWrap: 'wrap' }}>
          {session?.title && <Chip label={session.title} />}
          {time && <Chip label={fmt(time)} />}
          {effort > 0 && <Chip label={`Effort ${effort}/10`} />}
        </div>
      )}

      {err && (
        <p style={{ fontSize: 12.5, color: C.red, marginTop: 12 }}>{err}</p>
      )}

      <Btn style={{ marginTop: 20 }} disabled={busy || !text.trim()}
        onClick={post}>{busy ? 'Posting…' : 'Post it'}</Btn>

      <button onClick={onClose} style={{ width: '100%',
        background: 'transparent', border: 'none', color: C.sub,
        fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: F,
        padding: '15px 0 0' }}>Keep it to myself</button>
    </Sheet>
  )
}

const Chip = ({ label }) => (
  <span style={{ background: C.card2, borderRadius: 999, padding: '7px 13px',
    fontSize: 12.5, fontWeight: 600, color: C.sub }}>{label}</span>
)
