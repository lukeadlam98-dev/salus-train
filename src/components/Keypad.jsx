import { useState, useRef } from 'react'
import { C, F } from '../lib/theme'
import { Ico, I } from './ui'

// The number pad. The system keyboard never opens mid-set.
//
// Two things it gets right that the last version didn't.
//
// The first key press replaces what's there. Opening on 4:02 and
// typing 5 used to give "4:025" — it appended. Every calculator and
// every phone works the other way, and having to clear a field before
// correcting it is the kind of friction nobody reports, they just stop
// using the app.
//
// Times are typed as digits, filling from the right. 4-0-2 becomes
// 4:02 and 2-4-1-2 becomes 24:12, so nobody hunts for a colon key with
// chalk on their hands. It's how a stopwatch works and how everybody
// already expects to enter a time.

// Digits in, seconds out. Two digits are seconds, four are m:ss, six
// are h:mm:ss — the same rule reading right to left.
const digitsToSecs = d => {
  if (!d) return null
  const n = d.padStart(2, '0')
  const s = Number(n.slice(-2))
  const m = Number(n.slice(-4, -2) || 0)
  const h = Number(n.slice(0, -4) || 0)
  return h * 3600 + m * 60 + s
}

const showTime = d => {
  if (!d) return '0:00'
  const n = d.padStart(3, '0')
  const s = n.slice(-2)
  const rest = n.slice(0, -2)
  if (rest.length <= 2) return `${Number(rest)}:${s}`
  const m = rest.slice(-2)
  const h = rest.slice(0, -2)
  return `${Number(h)}:${m}:${s}`
}

// Seconds back to digits, so an existing value can be edited rather
// than retyped from nothing.
const secsToDigits = v => {
  if (v == null) return ''
  const h = Math.floor(v / 3600)
  const m = Math.floor((v % 3600) / 60)
  const s = v % 60
  return (h ? String(h) + String(m).padStart(2, '0')
            : String(m)) + String(s).padStart(2, '0')
}

export default function Keypad({ label, value, time, onClose, onSave }) {
  const [d, setD] = useState(() =>
    value == null || value === '' ? ''
      : time ? secsToDigits(Number(value))
      : String(value))

  // Until the first key is pressed the field still holds the old
  // value. Pressing a digit clears it; pressing backspace edits it.
  const fresh = useRef(value != null && value !== '')

  const tap = k => {
    if (k === 'del') {
      fresh.current = false
      return setD(s => s.slice(0, -1))
    }
    if (k === 'clear') {
      fresh.current = false
      return setD('')
    }
    if (k === '.') {
      fresh.current = false
      return setD(s => (s.includes('.') ? s : (s || '0') + '.'))
    }

    if (fresh.current) {            // first digit replaces
      fresh.current = false
      return setD(k)
    }
    setD(s => (s + k).slice(0, time ? 6 : 6))
  }

  const shown = time ? showTime(d) : (d || '0')
  const result = time ? digitsToSecs(d)
                      : (d === '' ? null : Number(d))

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 80 }} />
      <div style={{
        position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 90,
        background: C.sheet, borderRadius: '20px 20px 0 0',
        borderTop: `1px solid ${C.line}`,
        padding: '11px 11px calc(14px + env(safe-area-inset-bottom))',
        animation: 'sheet .24s cubic-bezier(.2,.85,.25,1)',
      }}>
        <div style={{ width: 38, height: 4.5, background: C.card3,
          borderRadius: 999, margin: '0 auto 12px' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 11,
          padding: '0 7px 12px' }}>
          <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-.04em',
            fontVariantNumeric: 'tabular-nums',
            // Dimmed until they touch it, so it's obvious the old
            // value is about to be replaced rather than added to.
            color: d && !fresh.current ? C.ink : C.mute }}>
            {shown}
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.sub }}>
            {label}
          </div>
          <div style={{ flex: 1 }} />
          <button onClick={() => onSave(result)}
            style={{ width: 48, height: 48, borderRadius: 999,
              border: 'none', background: C.g, display: 'grid',
              placeItems: 'center', cursor: 'pointer' }}>
            <Ico d={I.arrow} s={19} c={C.bg} w={2.2} />
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
          gap: 8 }}>
          {/* onPointerDown rather than onClick: a click on mobile fires
              about 100ms after the finger lands, which on a number pad
              reads as the key sticking. */}
          {['1','2','3','4','5','6','7','8','9',
            time ? 'clear' : '.', '0', 'del'].map(k => (
            <button key={k} onPointerDown={e => { e.preventDefault(); tap(k) }}
              style={{ height: 54, borderRadius: 12, border: 'none',
                background: C.card2, color: k === 'clear' ? C.sub : C.ink,
                fontSize: k === 'clear' ? 14 : 22,
                fontWeight: 700, cursor: 'pointer', fontFamily: F }}>
              {k === 'del' ? '⌫' : k === 'clear' ? 'CLEAR' : k}
            </button>
          ))}
        </div>
      </div>
    </>
  )
}
