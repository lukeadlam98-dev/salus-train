import { useState } from 'react'
import { C, F } from '../lib/theme'
import { Ico, I } from './ui'

// Custom numeric pad. The system keyboard never opens mid-set.
export default function Keypad({ label, value, time, onClose, onSave }) {
  const [v, setV] = useState(String(value ?? ''))
  const sep = time ? ':' : '.'

  const tap = k => {
    if (k === 'del') setV(s => s.slice(0, -1))
    else if (k === sep) { if (!v.includes(sep)) setV(s => s + sep) }
    else setV(s => (s + k).slice(0, 6))
  }

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

        <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '0 7px 12px' }}>
          <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-.04em',
            fontVariantNumeric: 'tabular-nums', color: v ? C.ink : C.mute }}>
            {v || (time ? '0:00' : '0')}
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.sub }}>{label}</div>
          <div style={{ flex: 1 }} />
          <button onClick={() => onSave(v)} style={{
            width: 48, height: 48, borderRadius: 999, border: `1.5px solid ${C.line}`,
            background: 'transparent', display: 'grid', placeItems: 'center',
            cursor: 'pointer',
          }}>
            <Ico d={I.arrow} s={19} c={C.ink} w={2.2} />
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          {['1','2','3','4','5','6','7','8','9', sep, '0', 'del'].map(k => (
            <button key={k} onClick={() => tap(k)} style={{
              height: 54, borderRadius: 12, border: 'none', background: C.card2,
              color: C.ink, fontSize: 22, fontWeight: 700, cursor: 'pointer',
              fontFamily: F,
            }}>{k === 'del' ? '⌫' : k}</button>
          ))}
        </div>
      </div>
    </>
  )
}
