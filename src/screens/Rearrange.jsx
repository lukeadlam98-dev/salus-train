import { useState } from 'react'
import { C, T, F } from '../lib/theme'
import { DAYS } from '../lib/format'
import { rearrangeWeek, resetWeek } from '../lib/data'
import { Btn, Ico, I } from '../components/ui'

// A member moving their own week.
//
// The coach writes Monday, Tuesday, Thursday. A member works Tuesdays.
// Right now they skip it and it's gone. This moves the session, not
// the programme — an override on their account, so what the coach
// wrote stays intact and Reset puts it back.
// A double moves as a day, not as two sessions. Splitting a hard
// morning and an easy evening across two days is not a rearrangement,
// it's a different programme.
export default function Rearrange({ weekId, sessions, onClose, onSaved }) {
  const [order, setOrder] = useState(() =>
    Array.from({ length: 7 }, (_, i) =>
      sessions.find(s => s.day === i + 1) || null))
  const [from, setFrom] = useState(null)
  const [over, setOver] = useState(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)

  const dirty = order.some((s, i) => s && s.day !== i + 1)

  const drop = () => {
    if (from == null || over == null || from === over) {
      setFrom(null); setOver(null); return
    }
    const next = [...order]
    const [moved] = next.splice(from, 1)
    next.splice(over, 0, moved)
    setOrder(next)
    setFrom(null); setOver(null)
  }

  async function save() {
    setBusy(true); setErr(null)
    const payload = order
      .map((s, i) => s ? { id: s.id, day: i + 1 } : null)
      .filter(Boolean)
    try { await rearrangeWeek(weekId, payload); onSaved() }
    catch (e) { setErr(e.message); setBusy(false) }
  }

  async function reset() {
    setBusy(true); setErr(null)
    try { await resetWeek(weekId); onSaved() }
    catch (e) { setErr(e.message); setBusy(false) }
  }

  return (
    <>
      <div onClick={() => !busy && onClose()} style={{ position: 'fixed',
        inset: 0, background: 'rgba(0,0,0,.66)', zIndex: 80,
        animation: 'fade .2s ease' }} />
      <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 90,
        background: C.sheet, borderRadius: '22px 22px 0 0',
        padding: '12px 18px calc(22px + env(safe-area-inset-bottom))',
        maxHeight: '88dvh', overflowY: 'auto',
        animation: 'sheet .27s cubic-bezier(.2,.85,.25,1)' }}>

        <div style={{ width: 38, height: 4.5, background: C.card3,
          borderRadius: 999, margin: '0 auto 16px' }} />

        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 6 }}>
          <div style={{ ...T.h2, flex: 1 }}>Move your week</div>
          <button onClick={onClose} style={{ background: 'transparent',
            border: 'none', cursor: 'pointer', padding: 6 }}>
            <Ico d={I.close} s={17} c={C.sub} w={2.2} />
          </button>
        </div>
        <p style={{ ...T.small, marginBottom: 18 }}>
          Your week, not the coach's. Moving a session here changes it for you
          alone — what they wrote stays as it is.
        </p>

        <div>
          {order.map((s, i) => {
            const dragging = from === i
            const target = over === i && from !== null && from !== i
            return (
              <div key={s?.id || `empty-${i}`}
                draggable={!!s}
                onDragStart={() => s && setFrom(i)}
                onDragOver={e => { e.preventDefault(); setOver(i) }}
                onDragEnd={drop}
                onDrop={drop}
                style={{
                  display: 'flex', alignItems: 'center', gap: 13,
                  marginBottom: 8, opacity: dragging ? .35 : 1,
                  borderTop: target ? `2px solid ${C.g}` : '2px solid transparent',
                  paddingTop: 2, transition: 'opacity .15s',
                }}>
                <div style={{ width: 34, flexShrink: 0, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.mute }}>
                    {DAYS[i]}
                  </div>
                </div>

                {s ? (
                  <div style={{ flex: 1, background: C.card, borderRadius: 13,
                    padding: '15px 15px', display: 'flex', alignItems: 'center',
                    gap: 12, cursor: 'grab',
                    border: `1px solid ${s.moved ? C.gLine : 'transparent'}` }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 15.5, fontWeight: 700,
                        overflow: 'hidden', textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap' }}>{s.title}</div>
                      {s.moved && (
                        <div style={{ fontSize: 11.5, color: C.g, marginTop: 3 }}>
                          moved from {DAYS[s.coach_day - 1]}
                        </div>
                      )}
                    </div>
                    <div style={{ color: C.mute, fontSize: 15,
                      userSelect: 'none' }}>⠿</div>
                  </div>
                ) : (
                  <div style={{ flex: 1, border: `1px dashed ${C.line}`,
                    borderRadius: 13, padding: '15px 15px', fontSize: 14.5,
                    color: C.mute }}>Rest day</div>
                )}
              </div>
            )
          })}
        </div>

        <div style={{ textAlign: 'center', fontSize: 12.5, color: C.mute,
          margin: '14px 0 16px' }}>Hold and drag to reorder</div>

        {err && (
          <p style={{ fontSize: 12.5, color: C.red, textAlign: 'center',
            marginBottom: 12 }}>{err}</p>
        )}

        <Btn disabled={busy || !dirty} onClick={save}>
          {busy ? 'Saving…' : 'Save changes'}
        </Btn>
        <button onClick={reset} disabled={busy}
          style={{ width: '100%', background: 'transparent', border: 'none',
            color: C.sub, fontSize: 14, fontWeight: 600, cursor: 'pointer',
            fontFamily: F, padding: '15px 0 0' }}>
          Put it back the way it was written
        </button>
      </div>
    </>
  )
}
