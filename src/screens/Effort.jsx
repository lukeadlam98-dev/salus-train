import { useRef } from 'react'
import { C, T } from '../lib/theme'
import { Btn, page } from '../components/ui'

export const EFFORT = [
  { l: 'Not rated',   c: '#7E8B94' }, { l: 'Very easy',   c: '#8A9490' },
  { l: 'Easy',        c: '#9AA08E' }, { l: 'Comfortable', c: '#AEAC91' },
  { l: 'Moderate',    c: '#C4B79A' }, { l: 'Challenging', c: '#D6BE9A' },
  { l: 'Hard',        c: '#D8A87C' }, { l: 'Very hard',   c: '#D18F66' },
  { l: 'Severe',      c: '#C77556' }, { l: 'Near max',    c: '#BC604C' },
  { l: 'Maximal',     c: '#AE4E44' },
]

export default function Effort({ value, setValue, onDone }) {
  const track = useRef(null)
  const E = EFFORT[value]

  const set = e => {
    const r = track.current.getBoundingClientRect()
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - r.left
    setValue(Math.max(0, Math.min(10, Math.round((x / r.width) * 10))))
  }

  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column',
      background: `linear-gradient(180deg,${E.c}22 0%,${C.bg} 45%,${C.bg} 100%)`,
      transition: 'background .4s' }}>
      <div style={{ padding: '70px 20px 0', textAlign: 'center' }}>
        <div style={{ fontSize: 16, color: C.sub, fontWeight: 600 }}>This session felt</div>
        <div style={{ fontSize: 36, fontWeight: 800, letterSpacing: '-.04em',
          marginTop: 7 }}>{E.l}</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: E.c, marginTop: 4,
          ...T.num }}>{value} / 10</div>
      </div>

      <div style={{ flex: 1, display: 'grid', placeItems: 'center' }}>
        <div ref={track}
          onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); set(e) }}
          onPointerMove={e => { if (e.buttons) set(e) }}
          style={{ width: '100%', maxWidth: 460, height: 130, display: 'flex',
            alignItems: 'center', padding: '0 20px', cursor: 'pointer',
            touchAction: 'none' }}>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', position: 'relative', height: '100%' }}>
            {Array.from({ length: 39 }).map((_, i) => {
              const pos = i / 38, val = pos * 10
              const on = val <= value, idx = Math.round(val)
              const act = Math.abs(val - value) < 0.6
              return <div key={i} style={{ width: 3, borderRadius: 999,
                height: act ? 46 : on ? 22 + Math.sin(pos * Math.PI) * 18 : 14,
                background: on ? EFFORT[idx].c : C.card3, transition: 'all .18s' }} />
            })}
            <div style={{ position: 'absolute', left: `calc(${(value / 10) * 100}% - 29px)`,
              width: 58, height: 66, borderRadius: 17, border: `1.5px solid ${E.c}`,
              background: `${E.c}1C`, display: 'grid', placeItems: 'center',
              transition: 'left .18s', pointerEvents: 'none' }}>
              <div style={{ display: 'flex', gap: 4 }}>
                {[0, 1, 2].map(i => <div key={i} style={{ width: 3, height: 17,
                  background: C.sub, borderRadius: 999 }} />)}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: '0 20px calc(28px + env(safe-area-inset-bottom))',
        maxWidth: 480, margin: '0 auto', width: '100%' }}>
        <Btn disabled={value === 0} onClick={onDone}>Save effort score</Btn>
        <button onClick={onDone} style={{ width: '100%', marginTop: 11, border: 'none',
          background: 'transparent', color: C.sub, fontSize: 15.5, fontWeight: 700,
          cursor: 'pointer', fontFamily: 'inherit', padding: '8px 0' }}>Skip</button>
      </div>
    </div>
  )
}
