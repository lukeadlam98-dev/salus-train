import { useState, useEffect } from 'react'
import { C, T, F } from '../lib/theme'
import { A } from './theme'
import { fmt, hhmm } from '../lib/format'
import * as api from './api'
import { Save, Field, Btn } from './widgets'

// The number every projection rests on.
//
// The Salus Half is exactly half a race — four runs, four stations. So
// doubling it would be right if the back half were run at the same
// pace as the front, which nobody manages. The multiplier is entirely
// an assumption about how much a member fades.
//
// It starts at 2.12, from published HYROX split data. It should end up
// at whatever this club's members actually produce, which is why the
// evidence sits underneath rather than in a spreadsheet somewhere.
export default function Multiplier() {
  const [state, setState] = useState(null)
  const [rows, setRows] = useState([])
  const [err, setErr] = useState(null)
  const [busy, setBusy] = useState(false)

  const load = () => Promise.all([
    api.getMultiplierState().then(setState),
    api.getMultiplierEvidence().then(setRows),
  ]).catch(e => setErr(e.message))

  useEffect(() => { load() }, [])

  const inUse = Number(state?.in_use ?? 2.12)
  const fade = ((inUse / 2 - 1) * 100)

  return (
    <div style={{ maxWidth: 640 }}>
      <h1 style={T.h1}>The half multiplier</h1>
      <p style={{ ...T.body, marginTop: 7 }}>
        What a Salus Half gets multiplied by to project a full race.
      </p>

      {err && <div style={{ color: C.red, fontSize: 13, marginTop: 14 }}>{err}</div>}

      {/* ---- the number ---- */}
      <div style={{ background: C.card, border: `1px solid ${C.line}`,
        borderRadius: 14, padding: 20, marginTop: 22, boxShadow: C.shadow }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 18 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.13em',
              color: A.mute }}>IN USE</div>
            <div style={{ fontSize: 38, fontWeight: 900, letterSpacing: '-.05em',
              lineHeight: 1, marginTop: 8 }}>{inUse.toFixed(2)}</div>
          </div>
          <div style={{ paddingBottom: 5, flex: 1 }}>
            <div style={{ fontSize: 13.5, color: C.sub, lineHeight: 1.5 }}>
              Says the back half of a race is{' '}
              <b style={{ color: C.ink }}>{fade.toFixed(0)}% slower</b> than
              the front. That is the whole assumption.
            </div>
          </div>
          <div style={{ width: 110 }}>
            <Save value={inUse.toFixed(2)}
              onSave={v => api.setMultiplier(Number(v)).then(load)} />
          </div>
        </div>

        {/* what it does to a real number */}
        <div style={{ marginTop: 18, paddingTop: 16,
          borderTop: `1px solid ${C.line}` }}>
          <div style={{ fontSize: 12, color: A.mute, marginBottom: 10 }}>
            A 39:14 half projects to:
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {[2.00, 2.06, 2.12, 2.18, 2.25].map(m => {
              const t = Math.round((39 * 60 + 14) * m)
              const on = Math.abs(m - inUse) < 0.03
              return (
                <button key={m} onClick={() => api.setMultiplier(m).then(load)}
                  style={{ flex: 1, borderRadius: 10, padding: '11px 0',
                    cursor: 'pointer', fontFamily: F,
                    background: on ? C.ink : C.card2,
                    border: `1px solid ${on ? C.ink : C.line}`,
                    color: on ? C.card : C.sub }}>
                  <div style={{ fontSize: 14.5, fontWeight: 800 }}>{hhmm(t)}</div>
                  <div style={{ fontSize: 10.5, marginTop: 3, opacity: .7 }}>
                    {m.toFixed(2)}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* ---- what the evidence says ---- */}
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.13em',
        color: A.mute, margin: '30px 0 4px' }}>WHAT YOUR RACES SAY</div>
      <div style={{ fontSize: 12.5, color: C.sub, marginBottom: 12,
        lineHeight: 1.5, maxWidth: 520 }}>
        {state?.source || '—'}
      </div>

      <div style={{ background: C.card, border: `1px solid ${C.line}`,
        borderRadius: 14, padding: '4px 16px', boxShadow: C.shadow }}>
        {rows.length === 0 && (
          <div style={{ ...T.body, fontSize: 13.5, padding: '18px 0' }}>
            Nobody has run a Salus Half and then a race yet. Once a few
            have, the real number appears here and you can switch to it.
          </div>
        )}
        {rows.map((r, i) => (
          <div key={r.id} style={{ display: 'flex', alignItems: 'center',
            gap: 14, padding: '13px 0',
            borderTop: i ? `1px solid ${C.line}` : 'none' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14.5, fontWeight: 600 }}>{r.name}</div>
              <div style={{ fontSize: 12, color: A.mute, marginTop: 2 }}>
                {r.race} · {new Date(r.race_date).toLocaleDateString('en-GB',
                  { day: 'numeric', month: 'short', year: 'numeric' })}
              </div>
            </div>
            <div style={{ fontSize: 13, color: C.sub }}>
              {fmt(r.half_s)} → {hhmm(r.result_s)}
            </div>
            <div style={{ width: 56, textAlign: 'right', fontSize: 16,
              fontWeight: 800 }}>{Number(r.ratio).toFixed(2)}</div>
          </div>
        ))}
      </div>

      {state?.samples >= 5 && (
        <Btn style={{ marginTop: 18 }} disabled={busy}
          onClick={() => {
            setBusy(true)
            api.adoptMeasuredMultiplier()
              .then(load).catch(e => setErr(e.message))
              .finally(() => setBusy(false))
          }}>
          Use {Number(state.measured).toFixed(2)}, from your {state.samples} races
        </Btn>
      )}

      {state?.samples > 0 && state?.spread > 0.15 && (
        <div style={{ fontSize: 12.5, color: C.sub, marginTop: 14,
          lineHeight: 1.55, maxWidth: 520 }}>
          Worth knowing: your results are spread {Number(state.spread).toFixed(2)}
          {' '}between the tenth and ninetieth percentile. A single number for
          everyone will be wrong for the ends of that range — the fitter the
          member, the less they fade.
        </div>
      )}
    </div>
  )
}
