import { useState, useEffect, useRef } from 'react'
import { C, F, T } from '../lib/theme'
import { Ico, I } from '../components/ui'
import { listImages, uploadImage } from './api'

/* Saves when you stop typing, not on every keystroke. */
export function Save({ value, onSave, placeholder, rows, style, big }) {
  const [v, setV] = useState(value ?? '')
  const [state, setState] = useState('idle')
  const timer = useRef(null)
  const first = useRef(true)
  const focused = useRef(false)

  // Don't overwrite what someone is typing.
  //
  // The field autosaves after 550ms, the parent reloads, and the value
  // prop comes back — which used to reset the input to whatever had
  // been saved, losing anything typed in between. Which reads as the
  // field fighting you.
  useEffect(() => {
    if (focused.current) return
    setV(value ?? '')
  }, [value])
  useEffect(() => {
    if (first.current) { first.current = false; return }
    if ((value ?? '') === v) return
    clearTimeout(timer.current)
    setState('saving')
    timer.current = setTimeout(async () => {
      await onSave(v); setState('saved')
      setTimeout(() => setState('idle'), 1100)
    }, 550)
    return () => clearTimeout(timer.current)
  }, [v])

  const base = {
    width: '100%', background: C.card2, color: C.ink,
    border: `1px solid ${state === 'saved' ? C.gLine : C.line}`,
    borderRadius: 9, padding: big ? '12px 14px' : '9px 12px',
    fontSize: big ? 16 : 14, outline: 'none', fontFamily: F,
    lineHeight: 1.5, transition: 'border-color .3s', ...style,
  }
  const focus = {
    onFocus: e => {
      focused.current = true
      // Select what's there, so typing replaces rather than appends.
      // Same reason the number pad does it: correcting a field
      // shouldn't need clearing it first.
      requestAnimationFrame(() => e.target.select?.())
    },
    onBlur: () => { focused.current = false },
  }

  return (
    <div style={{ position: 'relative' }}>
      {rows
        ? <textarea value={v} placeholder={placeholder} rows={rows} {...focus}
            onChange={e => setV(e.target.value)}
            style={{ ...base, resize: 'vertical' }} />
        : <input value={v} placeholder={placeholder} {...focus}
            onChange={e => setV(e.target.value)} style={base} />}
      {state !== 'idle' && (
        <span style={{ position: 'absolute', right: 9, top: big ? 13 : 10,
          fontSize: 10, fontWeight: 700,
          color: state === 'saved' ? C.g : C.mute }}>
          {state === 'saved' ? '✓' : '…'}
        </span>
      )}
    </div>
  )
}

export const Field = ({ label, children, hint, style }) => (
  <div style={{ marginBottom: 12, ...style }}>
    <div style={{ fontSize: 11, fontWeight: 700, color: C.sub, marginBottom: 5,
      letterSpacing: '.03em' }}>{label}</div>
    {children}
    {hint && <div style={{ fontSize: 11, color: C.mute, marginTop: 4,
      lineHeight: 1.45 }}>{hint}</div>}
  </div>
)

export function Pick({ value, options, onChange, style }) {
  return (
    <select value={value ?? ''} onChange={e => onChange(e.target.value)}
      style={{ width: '100%', background: C.card2, color: C.ink,
        border: `1px solid ${C.line}`, borderRadius: 9, padding: '9px 11px',
        fontSize: 14, outline: 'none', fontFamily: F, ...style }}>
      {options.map(o => {
        const [val, label] = Array.isArray(o) ? o : [o, o]
        return <option key={val} value={val}>{label}</option>
      })}
    </select>
  )
}

export function Toggle({ on, onChange, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <button onClick={() => onChange(!on)} style={{
        width: 40, height: 24, borderRadius: 999, border: 'none', flexShrink: 0,
        cursor: 'pointer', padding: 3, display: 'flex',
        justifyContent: on ? 'flex-end' : 'flex-start',
        background: on ? C.g : C.card3, transition: 'all .18s' }}>
        <div style={{ width: 18, height: 18, borderRadius: 999,
          background: on ? C.bg : C.mute }} />
      </button>
      <span style={{ fontSize: 13.5, fontWeight: 500 }}>{label}</span>
    </div>
  )
}

export function Btn({ children, onClick, tone, small, style, disabled, title }) {
  const tones = {
    solid: { background: C.ink, color: C.bg },
    soft:  { background: C.card2, color: C.ink },
    line:  { background: 'transparent', color: C.sub, border: `1px solid ${C.line}` },
    warn:  { background: 'transparent', color: C.red, border: `1px solid ${C.line}` },
  }
  return (
    <button onClick={disabled ? undefined : onClick} disabled={disabled} title={title}
      style={{ border: 'none', borderRadius: 8, cursor: disabled ? 'default' : 'pointer',
        fontFamily: F, fontWeight: 600, opacity: disabled ? .4 : 1,
        whiteSpace: 'nowrap',
        padding: small ? '7px 12px' : '10px 16px',
        fontSize: small ? 12.5 : 14, ...tones[tone || 'soft'], ...style }}>
      {children}
    </button>
  )
}

export function Confirm({ label, onConfirm, small = true }) {
  const [armed, setArmed] = useState(false)
  useEffect(() => {
    if (!armed) return
    const t = setTimeout(() => setArmed(false), 3500)
    return () => clearTimeout(t)
  }, [armed])
  return armed
    ? <Btn small={small} tone="warn" onClick={onConfirm}>Sure?</Btn>
    : <Btn small={small} tone="line" onClick={() => setArmed(true)}>{label || 'Delete'}</Btn>
}

/* Drag to reorder. HTML5 drag events — no library, and it degrades to
   a plain list if drag isn't available. */
export function Sortable({ ids, onReorder, children }) {
  const [from, setFrom] = useState(null)
  const [over, setOver] = useState(null)

  const drop = () => {
    if (from == null || over == null || from === over) {
      setFrom(null); setOver(null); return
    }
    const next = [...ids]
    const [moved] = next.splice(from, 1)
    next.splice(over, 0, moved)
    onReorder(next)
    setFrom(null); setOver(null)
  }

  return children.map((child, i) => (
    <div key={ids[i]}
      draggable
      onDragStart={() => setFrom(i)}
      onDragOver={e => { e.preventDefault(); setOver(i) }}
      onDragEnd={drop}
      onDrop={drop}
      style={{
        opacity: from === i ? .35 : 1,
        borderTop: over === i && from !== null && from !== i
          ? `2px solid ${C.g}` : '2px solid transparent',
        transition: 'opacity .15s',
      }}>
      {child}
    </div>
  ))
}

export const Grip = () => (
  <div style={{ cursor: 'grab', color: C.mute, fontSize: 15, lineHeight: 1,
    padding: '0 2px', userSelect: 'none' }} title="Drag to reorder">⠿</div>
)

/* Upload or choose a photo.
   The file input is a real <label> wrapping a real <input>, rather than
   a hidden input triggered by a ref. Refs into hidden inputs fail
   silently in a few browsers and there is no error when they do — you
   just click and nothing happens. A label always opens the picker. */
export function ImagePicker({ value, onChange, wide, kind = 'image' }) {
  const [open, setOpen] = useState(false)
  const [files, setFiles] = useState([])
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const [note, setNote] = useState(null)
  const isVideo = kind === 'video'

  const refresh = () => listImages(kind).then(setFiles).catch(e => setErr(e.message))
  useEffect(() => { if (open) { setErr(null); setNote(null); refresh() } }, [open, kind])

  async function onFile(e) {
    const file = e.target.files?.[0]
    e.target.value = ''            // so picking the same file twice still fires
    if (!file) return

    const tooBig = file.size > (isVideo ? 20 : 8) * 1024 * 1024
    if (tooBig) {
      setErr(`That file is ${(file.size / 1024 / 1024).toFixed(1)}MB. ` +
        (isVideo ? 'Keep videos under 20MB — ideally under 2.'
                 : 'Keep photos under 8MB.'))
      return
    }

    setBusy(true); setErr(null); setNote(`Uploading ${file.name}…`)
    try {
      const url = await uploadImage(file)
      await onChange(url)
      await refresh()
      setNote(null)
      setOpen(false)
    } catch (e) {
      setErr(e.message || 'Upload failed.')
      setNote(null)
    }
    setBusy(false)
  }

  const uploadBtn = {
    display: 'inline-block', background: C.ink, color: C.bg, borderRadius: 8,
    padding: '7px 14px', fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
    fontFamily: F, opacity: busy ? .5 : 1,
  }

  return (
    <>
      <div style={{ display: 'flex', gap: 9, alignItems: 'center' }}>
        <button onClick={() => setOpen(true)} style={{
          width: wide ? '100%' : 92, height: wide ? 110 : 62, borderRadius: 10,
          border: `1px solid ${C.line}`, cursor: 'pointer', padding: 0,
          background: value && !isVideo
            ? `#0B0A09 url(${value}) center/cover` : C.card2,
          display: 'grid', placeItems: 'center', overflow: 'hidden' }}>
          {isVideo && value
            ? <video src={value} muted loop autoPlay playsInline
                style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : !value && <span style={{ fontSize: 11.5, color: C.mute,
                fontWeight: 600 }}>Choose {isVideo ? 'video' : 'photo'}</span>}
        </button>
        {value && !wide && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <Btn small tone="soft" onClick={() => setOpen(true)}>Change</Btn>
            <Btn small tone="line" onClick={() => onChange(null)}>Remove</Btn>
          </div>
        )}
      </div>

      {open && (
        <>
          <div onClick={() => !busy && setOpen(false)} style={{ position: 'fixed',
            inset: 0, background: 'rgba(26,22,19,.6)', zIndex: 200 }} />
          <div style={{ position: 'fixed', inset: '7% 8%', zIndex: 210,
            background: C.card, borderRadius: 16, padding: 22, overflowY: 'auto',
            maxWidth: 900, margin: '0 auto', border: `1px solid ${C.line}`,
            boxShadow: '0 24px 70px rgba(26,22,19,.28)' }}>

            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 6 }}>
              <div style={{ ...T.h3 }}>{isVideo ? 'Videos' : 'Photos'}</div>
              <div style={{ flex: 1 }} />
              <label style={uploadBtn}>
                {busy ? 'Uploading…' : `Upload ${isVideo ? 'a video' : 'a photo'}`}
                <input type="file" disabled={busy}
                  accept={isVideo ? 'video/mp4,video/webm' : 'image/*'}
                  onChange={onFile}
                  style={{ position: 'absolute', width: 1, height: 1,
                    opacity: 0, pointerEvents: 'none' }} />
              </label>
              <Btn small tone="line" style={{ marginLeft: 8 }}
                onClick={() => !busy && setOpen(false)}>Close</Btn>
            </div>

            <div style={{ fontSize: 11.5, color: C.mute, marginBottom: 16 }}>
              {isVideo
                ? 'MP4 or WebM. Under 2MB is the target — 20MB is the hard limit.'
                : 'JPEG or PNG, up to 8MB. Around 1400px wide is plenty.'}
            </div>

            {note && <div style={{ fontSize: 13, color: C.sub,
              marginBottom: 12 }}>{note}</div>}
            {err && <div style={{ fontSize: 13, color: C.red, marginBottom: 12,
              background: C.card2, borderRadius: 9, padding: '10px 12px',
              lineHeight: 1.5 }}>{err}</div>}

            <div style={{ display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: 11 }}>
              {files.map(f => (
                <button key={f.name} onClick={() => { onChange(f.url); setOpen(false) }}
                  style={{ border: `1.5px solid ${value === f.url ? C.g : C.line}`,
                    borderRadius: 10, overflow: 'hidden', cursor: 'pointer',
                    background: C.card2, padding: 0 }}>
                  {isVideo
                    ? <video src={f.url} muted loop autoPlay playsInline
                        style={{ width: '100%', height: 100, objectFit: 'cover',
                          display: 'block', background: '#0B0A09' }} />
                    : <div style={{ height: 100,
                        background: `#0B0A09 url(${f.url}) center/cover` }} />}
                  <div style={{ fontSize: 10, color: C.sub, padding: '6px 8px',
                    overflow: 'hidden', textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap' }}>{f.name}</div>
                </button>
              ))}
            </div>

            {files.length === 0 && !err && (
              <div style={{ ...T.body, padding: '40px 0', textAlign: 'center' }}>
                No {isVideo ? 'videos' : 'photos'} in the bucket yet.
              </div>
            )}
          </div>
        </>
      )}
    </>
  )
}


// A field with the usual answers as pills above it.
//
// Free text meant five spellings of "Straight sets" across a block and
// a chip row that never quite lined up. The pills are the ones that
// actually get used; typing still works for anything else, because a
// picker that can't be escaped is worse than no picker.
export function Suggest({ value, options = [], placeholder, onSave }) {
  return (
    <>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6,
        marginBottom: 7 }}>
        {options.map(o => {
          const on = value === o
          return (
            <button key={o} onClick={() => onSave(on ? '' : o)}
              style={{ borderRadius: 999, padding: '6px 11px', fontSize: 12,
                fontWeight: 600, cursor: 'pointer', fontFamily: F,
                background: on ? C.ink : C.card2,
                border: `1px solid ${on ? C.ink : C.line}`,
                color: on ? C.card : C.sub }}>{o}</button>
          )
        })}
      </div>
      <Save value={value} placeholder={placeholder} onSave={onSave} />
    </>
  )
}


// A real confirmation, for things that can't be undone.
//
// The two-tap Confirm above is right for deleting a line. It is not
// right for deleting a week that six members have logged sessions in,
// because "Sure?" doesn't say what is about to be lost. This one has
// room to state the cost, and makes the destructive button the
// quieter of the two.
export function Ask({ title, body, confirmLabel, danger, onConfirm, onCancel }) {
  return (
    <>
      <div onClick={onCancel} style={{ position: 'fixed', inset: 0,
        background: 'rgba(26,22,19,.55)', zIndex: 300 }} />
      <div style={{ position: 'fixed', left: '50%', top: '50%', zIndex: 310,
        transform: 'translate(-50%,-50%)', width: 'min(440px, calc(100vw - 40px))',
        background: C.card, border: `1px solid ${C.line}`, borderRadius: 16,
        padding: 24, boxShadow: '0 24px 60px rgba(26,22,19,.30)' }}>
        <div style={{ ...T.h3, fontSize: 18 }}>{title}</div>
        <div style={{ ...T.body, fontSize: 14, marginTop: 10,
          lineHeight: 1.55 }}>{body}</div>
        <div style={{ display: 'flex', gap: 9, marginTop: 22,
          justifyContent: 'flex-end' }}>
          <button onClick={onCancel} style={{ borderRadius: 9,
            padding: '11px 18px', fontSize: 14, fontWeight: 600,
            cursor: 'pointer', fontFamily: F, background: C.ink,
            border: 'none', color: C.card }}>Keep it</button>
          <button onClick={onConfirm} style={{ borderRadius: 9,
            padding: '11px 18px', fontSize: 14, fontWeight: 600,
            cursor: 'pointer', fontFamily: F, background: 'transparent',
            border: `1px solid ${danger ? C.red : C.line}`,
            color: danger ? C.red : C.sub }}>
            {confirmLabel || 'Delete'}
          </button>
        </div>
      </div>
    </>
  )
}
