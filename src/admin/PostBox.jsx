import { useState } from 'react'
import { C, T, F } from '../lib/theme'
import * as api from './api'
import { Btn } from './widgets'

const TAGS = ['RACE DAY', 'TIMETABLE', 'THE ROOM', 'PROGRAMME', 'SOCIAL']

// Posting to the board shouldn't mean navigating somewhere first.
// Most notices are two lines written in thirty seconds — the friction
// of finding the right page is what stops them being written at all.
export default function PostBox({ onPosted }) {
  const [open, setOpen] = useState(false)
  const [tag, setTag] = useState('THE ROOM')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [pinned, setPinned] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const [done, setDone] = useState(false)

  const ok = title.trim().length > 2

  async function post() {
    setBusy(true); setErr(null)
    try {
      await api.addNotice({
        tag, title: title.trim(), body: body.trim(), pinned,
      })
      setTitle(''); setBody(''); setPinned(false); setOpen(false)
      setDone(true); setTimeout(() => setDone(false), 2600)
      onPosted?.()
    } catch (e) { setErr(e.message || 'That didn\u2019t post.') }
    setBusy(false)
  }

  const input = {
    width: '100%', background: C.card2, color: C.ink,
    border: `1px solid ${C.line}`, borderRadius: 9, padding: '11px 13px',
    fontSize: 14.5, outline: 'none', fontFamily: F, lineHeight: 1.5,
  }

  if (!open) return (
    <div style={{ background: C.card, border: `1px solid ${C.line}`,
      borderRadius: 13, padding: 15, boxShadow: C.shadow }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14.5, fontWeight: 800,
            letterSpacing: '-.02em' }}>
            {done ? 'Posted.' : 'Post to the board'}
          </div>
          <div style={{ fontSize: 11.5, color: C.mute, marginTop: 3,
            lineHeight: 1.45 }}>
            {done
              ? 'It\u2019s on everyone\u2019s Today screen now.'
              : 'Appears under "What\u2019s on at Salus" on every member\u2019s home.'}
          </div>
        </div>
        <Btn small tone={done ? 'line' : 'solid'} onClick={() => setOpen(true)}>
          {done ? 'Post another' : 'Write one'}
        </Btn>
      </div>
    </div>
  )

  return (
    <div style={{ background: C.card, border: `1px solid ${C.line}`,
      borderRadius: 13, padding: 15, boxShadow: C.shadow }}>
      <div style={{ fontSize: 14.5, fontWeight: 800, letterSpacing: '-.02em',
        marginBottom: 12 }}>Post to the board</div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
        {TAGS.map(t => (
          <button key={t} onClick={() => setTag(t)}
            style={{ borderRadius: 999, padding: '6px 11px', fontSize: 10.5,
              fontWeight: 800, letterSpacing: '.05em', cursor: 'pointer',
              fontFamily: F,
              background: tag === t ? C.ink : 'transparent',
              border: `1px solid ${tag === t ? C.ink : C.line}`,
              color: tag === t ? C.bg : C.sub }}>{t}</button>
        ))}
      </div>

      <input value={title} onChange={e => setTitle(e.target.value)} autoFocus
        placeholder="Headline — ExCeL group travel is open" style={input} />
      <textarea value={body} onChange={e => setBody(e.target.value)} rows={3}
        placeholder="The detail. Two or three lines is plenty."
        style={{ ...input, marginTop: 8, resize: 'vertical' }} />

      {err && <div style={{ fontSize: 12.5, color: C.red, marginTop: 10 }}>{err}</div>}

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12 }}>
        <button onClick={() => setPinned(!pinned)} style={{
          display: 'flex', alignItems: 'center', gap: 8, background: 'transparent',
          border: 'none', cursor: 'pointer', fontFamily: F, padding: 0 }}>
          <div style={{ width: 34, height: 20, borderRadius: 999, padding: 3,
            display: 'flex', justifyContent: pinned ? 'flex-end' : 'flex-start',
            background: pinned ? C.g : C.card3, transition: 'all .18s' }}>
            <div style={{ width: 14, height: 14, borderRadius: 999,
              background: pinned ? C.card : C.mute }} />
          </div>
          <span style={{ fontSize: 12.5, color: C.sub, fontWeight: 600 }}>
            Pin to the top
          </span>
        </button>
        <div style={{ flex: 1 }} />
        <Btn small tone="line" onClick={() => { setOpen(false); setErr(null) }}>
          Cancel
        </Btn>
        <Btn small tone="solid" disabled={busy || !ok} onClick={post}>
          {busy ? 'Posting\u2026' : 'Post'}
        </Btn>
      </div>
    </div>
  )
}
