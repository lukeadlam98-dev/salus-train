import { useState, useEffect, useRef } from 'react'
import { C, F, T } from '../lib/theme'
import { Ico, I } from '../components/ui'
import { listImages, uploadImage } from './api'

/* A text field that saves when you stop typing, not on every keystroke. */
export function Save({ value, onSave, placeholder, multiline, style, mono }) {
  const [v, setV] = useState(value ?? '')
  const [state, setState] = useState('idle')   // idle | saving | saved
  const timer = useRef(null)
  const first = useRef(true)

  useEffect(() => { setV(value ?? '') }, [value])

  useEffect(() => {
    if (first.current) { first.current = false; return }
    if ((value ?? '') === v) return
    clearTimeout(timer.current)
    setState('saving')
    timer.current = setTimeout(async () => {
      await onSave(v)
      setState('saved')
      setTimeout(() => setState('idle'), 1200)
    }, 600)
    return () => clearTimeout(timer.current)
  }, [v])

  const base = {
    width: '100%', background: C.card2, color: C.ink,
    border: `1px solid ${state === 'saved' ? C.gLine : C.line}`,
    borderRadius: 10, padding: '11px 13px', fontSize: 15, outline: 'none',
    fontFamily: mono ? 'ui-monospace, monospace' : F, lineHeight: 1.5,
    transition: 'border-color .3s', ...style,
  }

  return (
    <div style={{ position: 'relative' }}>
      {multiline
        ? <textarea value={v} placeholder={placeholder} rows={multiline}
            onChange={e => setV(e.target.value)} style={{ ...base, resize: 'vertical' }} />
        : <input value={v} placeholder={placeholder}
            onChange={e => setV(e.target.value)} style={base} />}
      {state !== 'idle' && (
        <span style={{ position: 'absolute', right: 10, top: 11, fontSize: 11,
          fontWeight: 700, color: state === 'saved' ? C.g : C.mute }}>
          {state === 'saved' ? 'saved' : '…'}
        </span>
      )}
    </div>
  )
}

export function Row({ label, children, hint }) {
  return (
    <div style={{ marginBottom: 13 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: C.sub, marginBottom: 6 }}>
        {label}
      </div>
      {children}
      {hint && <div style={{ fontSize: 11.5, color: C.mute, marginTop: 5,
        lineHeight: 1.45 }}>{hint}</div>}
    </div>
  )
}

export function Pick({ value, options, onChange }) {
  return (
    <select value={value ?? ''} onChange={e => onChange(e.target.value)}
      style={{ width: '100%', background: C.card2, color: C.ink,
        border: `1px solid ${C.line}`, borderRadius: 10, padding: '11px 13px',
        fontSize: 15, outline: 'none', fontFamily: F }}>
      {options.map(o => {
        const [val, label] = Array.isArray(o) ? o : [o, o]
        return <option key={val} value={val}>{label}</option>
      })}
    </select>
  )
}

export function Toggle({ on, onChange, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
      <button onClick={() => onChange(!on)} style={{
        width: 46, height: 28, borderRadius: 999, border: 'none', flexShrink: 0,
        cursor: 'pointer', padding: 3, display: 'flex',
        justifyContent: on ? 'flex-end' : 'flex-start',
        background: on ? C.g : C.card3, transition: 'all .2s',
      }}>
        <div style={{ width: 22, height: 22, borderRadius: 999,
          background: on ? C.bg : C.mute }} />
      </button>
      <span style={{ fontSize: 14.5, fontWeight: 600 }}>{label}</span>
    </div>
  )
}

export function Btn({ children, onClick, tone, small, style, disabled }) {
  const tones = {
    solid: { background: C.ink, color: C.bg },
    soft:  { background: C.card2, color: C.ink },
    line:  { background: 'transparent', color: C.sub, border: `1px solid ${C.line}` },
    warn:  { background: 'transparent', color: C.red, border: `1px solid ${C.line}` },
  }
  return (
    <button onClick={disabled ? undefined : onClick} disabled={disabled}
      style={{ border: 'none', borderRadius: 999, cursor: disabled ? 'default' : 'pointer',
        fontFamily: F, fontWeight: 700, opacity: disabled ? .4 : 1,
        padding: small ? '9px 15px' : '13px 20px',
        fontSize: small ? 13 : 15, ...tones[tone || 'soft'], ...style }}>
      {children}
    </button>
  )
}

/* Upload or choose an existing photo. Writes the public URL back. */
export function ImagePicker({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const [files, setFiles] = useState([])
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const input = useRef(null)

  useEffect(() => {
    if (!open) return
    listImages().then(setFiles).catch(e => setErr(e.message))
  }, [open])

  async function upload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setBusy(true); setErr(null)
    try {
      const url = await uploadImage(file)
      await onChange(url)
      setFiles(await listImages())
    } catch (e) { setErr(e.message) }
    setBusy(false)
  }

  return (
    <>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <div style={{ width: 74, height: 52, borderRadius: 9, flexShrink: 0,
          border: `1px solid ${C.line}`,
          background: value ? `#0B0A09 url(${value}) center/cover` : C.card2 }} />
        <Btn small tone="soft" onClick={() => setOpen(true)}>
          {value ? 'Change' : 'Choose photo'}
        </Btn>
        {value && <Btn small tone="line" onClick={() => onChange(null)}>Remove</Btn>}
      </div>

      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,.7)', zIndex: 200 }} />
          <div style={{ position: 'fixed', inset: '6% 5%', zIndex: 210,
            background: C.card, borderRadius: 18, padding: 20, overflowY: 'auto',
            maxWidth: 760, margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ ...T.h3 }}>Photos</div>
              <div style={{ flex: 1 }} />
              <Btn small tone="solid" onClick={() => input.current?.click()}
                disabled={busy}>{busy ? 'Uploading…' : 'Upload new'}</Btn>
              <Btn small tone="line" style={{ marginLeft: 8 }}
                onClick={() => setOpen(false)}>Close</Btn>
            </div>
            <input ref={input} type="file" accept="image/*" onChange={upload}
              style={{ display: 'none' }} />
            {err && <div style={{ color: C.red, fontSize: 13, marginBottom: 12 }}>{err}</div>}
            <div style={{ display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill,minmax(130px,1fr))', gap: 10 }}>
              {files.map(f => (
                <button key={f.name} onClick={() => { onChange(f.url); setOpen(false) }}
                  style={{ border: `1.5px solid ${value === f.url ? C.g : C.line}`,
                    borderRadius: 11, overflow: 'hidden', cursor: 'pointer',
                    background: C.card2, padding: 0 }}>
                  <div style={{ height: 92,
                    background: `#0B0A09 url(${f.url}) center/cover` }} />
                  <div style={{ fontSize: 10.5, color: C.sub, padding: '7px 8px',
                    overflow: 'hidden', textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap' }}>{f.name}</div>
                </button>
              ))}
            </div>
            {files.length === 0 && !err && (
              <div style={{ ...T.body, padding: '30px 0', textAlign: 'center' }}>
                Nothing uploaded yet.
              </div>
            )}
          </div>
        </>
      )}
    </>
  )
}

export function Confirm({ label, onConfirm }) {
  const [armed, setArmed] = useState(false)
  useEffect(() => {
    if (!armed) return
    const t = setTimeout(() => setArmed(false), 4000)
    return () => clearTimeout(t)
  }, [armed])
  return armed
    ? <Btn small tone="warn" onClick={onConfirm}>Really delete?</Btn>
    : <Btn small tone="line" onClick={() => setArmed(true)}>{label || 'Delete'}</Btn>
}
