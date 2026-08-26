import { useState, useEffect, useRef } from 'react'
import { C, T, F } from '../lib/theme'
import { fmt, hhmm, toSecs } from '../lib/format'
import { LEGS, summarise } from '../lib/half'
import { saveHalfSplit } from '../lib/data'
import { Card, Label, Btn, Back, page } from '../components/ui'
import Keypad from '../components/Keypad'

export default function Half({ userId, splits, setSplits, multiplier, onBack }) {
  const [pad, setPad] = useState(null)
  const [t, setT] = useState(0)
  const [running, setRunning] = useState(false)
  const started = useRef(0)

  useEffect(() => {
    if (!running) return
    const x = setInterval(() => setT(Math.floor((Date.now() - started.current) / 1000)), 500)
    return () => clearInterval(x)
  }, [running])

  const r = summarise(splits, multiplier)

  async function save(key, raw) {
    const s = toSecs(raw)
    if (s == null) return
    const next = { ...splits, [key]: s }
    setSplits(next)
    await saveHalfSplit(userId, 1, key, s, multiplier).catch(console.error)
  }

  return (
    <div style={page}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <Back onClick={onBack} />
        <div style={{ flex: 1 }} />
        <div style={{ fontSize: 21, fontWeight: 800, letterSpacing: '-.03em',
          ...T.num }}>{fmt(t)}</div>
        <button onClick={() => {
          if (!running) { started.current = Date.now() - t * 1000 }
          setRunning(!running)
        }} style={{ marginLeft: 12, border: 'none', background: C.card2, color: C.ink,
          borderRadius: 999, padding: '9px 16px', fontSize: 14, fontWeight: 700,
          cursor: 'pointer', fontFamily: F }}>
          {running ? 'Pause' : t ? 'Resume' : 'Start'}
        </button>
      </div>

      <h1 style={{ ...T.h1, marginTop: 16 }}>The Salus Half</h1>
      <p style={{ ...T.body, marginTop: 5 }}>
        Half of everything, full race weight, in race order.
      </p>

      <Card style={{ marginTop: 18 }}>
        <Label>{r.complete ? 'PROJECTED FINISH' : 'ELAPSED'}</Label>
        <div key={r.complete ? 'done' : r.done}
          style={{ fontSize: 46, fontWeight: 900, letterSpacing: '-.05em',
            lineHeight: 1, marginTop: 7, ...T.num,
            animation: 'rise .45s ease-out' }}>
          {r.complete ? hhmm(r.projected) : (hhmm(r.total) || '0:00')}
        </div>
        <div style={{ ...T.body, fontSize: 13.5, marginTop: 7 }}>
          {r.complete
            ? `Half ${hhmm(r.total)} × ${multiplier}`
            : `${r.done} of ${LEGS.length} splits in`}
        </div>

        <div style={{ display: 'flex', height: 7, borderRadius: 999, overflow: 'hidden',
          marginTop: 14, background: C.card3 }}>
          <div style={{ width: `${r.total ? r.runs / r.total * 100 : 0}%`, background: C.g }} />
          <div style={{ width: `${r.total ? r.stns / r.total * 100 : 0}%`, background: C.mute }} />
        </div>
        <div style={{ display: 'flex', gap: 18, marginTop: 11 }}>
          {[['Running', r.runs], ['Stations', r.stns]].map(([l, x]) => (
            <div key={l}>
              <div style={{ fontSize: 12, color: C.sub, fontWeight: 600 }}>{l}</div>
              <div style={{ fontSize: 17, fontWeight: 800, marginTop: 2, ...T.num }}>
                {fmt(x)}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Label style={{ margin: '26px 0 11px' }}>SPLITS</Label>
      <Card style={{ padding: '3px 14px' }}>
        {LEGS.map((l, i) => {
          const s = splits[l.key]
          return (
            <div key={l.key} onClick={() => setPad({ key: l.key, name: l.name,
              value: s != null ? fmt(s) : '' })}
              style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '12px 0',
                borderTop: i ? `1px solid ${C.line}` : 'none', cursor: 'pointer' }}>
              <div style={{ width: 24, height: 24, borderRadius: 7, flexShrink: 0,
                display: 'grid', placeItems: 'center', fontSize: 10.5, fontWeight: 800,
                background: l.type === 'run' ? 'transparent' : C.card3,
                border: l.type === 'run' ? `1px solid ${C.line}` : 'none',
                color: l.type === 'run' ? C.mute : C.ink }}>
                {l.type === 'run' ? 'R' : Math.ceil((i + 1) / 2)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 600 }}>{l.name}</div>
                <div style={{ fontSize: 12, color: C.mute, marginTop: 1 }}>
                  {l.dist}{l.load ? ` · ${l.load}` : ''}
                </div>
              </div>
              <div style={{ fontSize: 16.5, fontWeight: 800, ...T.num,
                color: s != null ? C.ink : C.mute }}>{s != null ? fmt(s) : '—'}</div>
            </div>
          )
        })}
      </Card>

      {r.weakest && (
        <>
          <Label style={{ margin: '26px 0 11px' }}>YOUR WEAKEST STATION</Label>
          <Card>
            <div style={{ ...T.h2 }}>{r.weakest.name}</div>
            <div style={{ ...T.body, marginTop: 5 }}>
              {fmt(r.weakest.s)} — {fmt(r.weakest.over)} slower than your average station.
              At full distance that gap roughly doubles.
            </div>
          </Card>
        </>
      )}

      <Card style={{ background: C.card2, marginTop: 18 }}>
        <div style={{ ...T.body, fontSize: 12.5 }}>
          <b style={{ color: C.ink }}>About the ×{multiplier}.</b> Derived from one member's
          full race, not from anyone yet doing this half. Every athlete who runs it in week 1,
          again in week 6, then races gives us a paired data point — and the multiplier
          becomes ours.
        </div>
      </Card>

      {pad && (
        <Keypad label={pad.name} value={pad.value} time
          onClose={() => setPad(null)}
          onSave={v => { save(pad.key, v); setPad(null) }} />
      )}
    </div>
  )
}
