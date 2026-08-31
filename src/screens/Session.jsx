import { useState, useEffect, useRef } from 'react'
import { C, T, F } from '../lib/theme'
import { fmt, DAYS, round2h } from '../lib/format'
import { getSessionDetail, startWorkout, saveSet, finishWorkout } from '../lib/data'
import { Card, Label, Btn, Chip, Back, Ico, I, page } from '../components/ui'
import Photo from '../components/Photo'
import { P } from '../lib/theme'
import Keypad from '../components/Keypad'
import BlockTimer from '../components/BlockTimer'
import { SkeletonSession } from '../components/Skeleton'
import { getCoaches } from '../lib/data'

// Loads calculate from the member's benchmarks — never stored as kilos,
// so a week 8 re-test doesn't rewrite week 2's history.
function targetKg(movement, benchmarks) {
  if (!movement?.pct_of || !movement?.pct) return null
  const base = benchmarks[movement.pct_of]?.value_num
  if (!base) return null
  return round2h(base * movement.pct)
}

export default function Session({ session, userId, benchmarks, onBack, onFinished }) {
  const [blocks, setBlocks] = useState(null)
  const [coach, setCoach] = useState(null)
  const [playing, setPlaying] = useState(false)
  const [log, setLog] = useState(null)          // workout_logs row
  const [sets, setSets] = useState({})          // "itemId.idx" -> {reps,kg,done}
  const [bi, setBi] = useState(0)
  const [t, setT] = useState(0)
  const [rest, setRest] = useState(null)
  const [pad, setPad] = useState(null)
  const [live, setLive] = useState(false)
  const started = useRef(0)

  useEffect(() => { getSessionDetail(session.id).then(setBlocks) }, [session.id])
  useEffect(() => {
    if (!session.coach_id) return
    getCoaches().then(cs => setCoach(cs.find(c => c.id === session.coach_id)))
      .catch(() => {})
  }, [session.coach_id])

  useEffect(() => {
    if (!live) return
    const x = setInterval(() => setT(Math.floor((Date.now() - started.current) / 1000)), 500)
    return () => clearInterval(x)
  }, [live])

  useEffect(() => {
    if (rest == null) return
    const x = setInterval(() => setRest(r => (r > 1 ? r - 1 : null)), 1000)
    return () => clearInterval(x)
  }, [rest == null])

  async function begin() {
    const row = await startWorkout(userId, session.id)
    setLog(row); started.current = Date.now(); setT(0); setLive(true)
    const firstReal = blocks.findIndex(b => (b.block_items || []).length)
    setBi(firstReal > -1 ? firstReal : 0)
  }

  const cell = (itemId, i) => sets[`${itemId}.${i}`] || {}

  // Autofill: carry the last logged value down the sets.
  const ghost = (item, i, field) => {
    for (let j = i - 1; j >= 0; j--) {
      const c = cell(item.id, j)
      if (c[field] != null && c[field] !== '') return String(c[field])
    }
    if (field === 'reps') return item.reps != null ? String(item.reps) : ''
    const kg = targetKg(item.movements, benchmarks)
    return kg ? String(kg) : ''
  }

  async function writeSet(item, i, patch) {
    const key = `${item.id}.${i}`
    const next = { ...sets, [key]: { ...cell(item.id, i), ...patch } }
    setSets(next)
    if (log) {
      const c = next[key]
      await saveSet(log.id, item.id, i, {
        reps: c.reps ? Number(c.reps) : null,
        kg: c.kg ? Number(c.kg) : null,
        seconds: c.seconds ?? null,
        done: !!c.done,
      }).catch(console.error)
    }
  }

  async function logSet(item, i) {
    const c = cell(item.id, i)
    await writeSet(item, i, {
      done: true,
      reps: c.reps ?? ghost(item, i, 'reps'),
      kg: c.kg ?? ghost(item, i, 'kg'),
    })
    setRest(item.rest_s || 90)
  }

  async function end() {
    if (log) await finishWorkout(log.id, { elapsed_s: t, effort: null }).catch(console.error)
    onFinished({ log, elapsed: t, sets, blocks })
  }

  if (!blocks) return <SkeletonSession />

  /* ---------------- preview ---------------- */
  if (!live) return (
    <div style={{ ...page, paddingTop: session.cover_url ? 0 : 46 }}>
      {session.cover_url ? (
        <div style={{ margin: '0 -16px 18px' }}>
          <Photo src={session.cover_url} dim={.95} style={{ minHeight: 240 }}>
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column',
              padding: '46px 16px 18px' }}>
              <button onClick={onBack} style={{ alignSelf: 'flex-start', border: 'none',
                background: 'rgba(0,0,0,.5)', width: 36, height: 36, borderRadius: 999,
                display: 'grid', placeItems: 'center', cursor: 'pointer' }}>
                <Ico d={I.back} s={17} c={P.ink} w={2.2} />
              </button>
              <div style={{ flex: 1, minHeight: 60 }} />
              <div style={{ fontSize: 12.5, color: P.sub, fontWeight: 700,
                letterSpacing: '.1em' }}>
                {DAYS[session.day - 1].toUpperCase()} · WEEK 1
              </div>
              <div style={{ fontSize: 27, fontWeight: 800, letterSpacing: '-.035em',
                marginTop: 4 }}>{session.title}</div>
              <div style={{ fontSize: 14, color: P.sub, marginTop: 3 }}>
                {session.tag}{session.est_min ? ` · ${session.est_min} min` : ''}
              </div>
            </div>
          </Photo>
        </div>
      ) : (
        <>
          <Back onClick={onBack} />
          <Label style={{ marginTop: 20 }}>
            {DAYS[session.day - 1].toUpperCase()} · WEEK 1
          </Label>
          <h1 style={{ ...T.h1, marginTop: 8 }}>{session.title}</h1>
          <p style={{ ...T.body, marginTop: 5 }}>
            {session.tag}{session.est_min ? ` · ${session.est_min} min` : ''}
          </p>
          {session.focus && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8,
              marginTop: 10 }}>
              <span style={{ background: C.card3, borderRadius: 7,
                padding: '4px 9px', fontSize: 11.5, fontWeight: 700 }}>Focus</span>
              <span style={{ fontSize: 14, color: C.sub }}>{session.focus}</span>
            </div>
          )}
        </>
      )}

      {/* the coach, saying what today is for.
          A written note tells you the standard; hearing it tells you
          the intent, and it's the closest thing to them being there. */}
      {session.video_url && (
        <div style={{ marginTop: 18, borderRadius: 16, overflow: 'hidden',
          background: '#000', position: 'relative' }}>
          {playing ? (
            <video src={session.video_url} controls autoPlay playsInline
              style={{ width: '100%', display: 'block', maxHeight: 420 }} />
          ) : (
            <button onClick={() => setPlaying(true)} style={{ width: '100%',
              border: 'none', padding: 0, cursor: 'pointer', display: 'block',
              background: coach?.photo_url
                ? `#0B0A09 url(${coach.photo_url}) center/cover`
                : 'linear-gradient(150deg,#312A22,#191714)',
              minHeight: 190, position: 'relative' }}>
              <div style={{ position: 'absolute', inset: 0,
                background: 'linear-gradient(180deg,rgba(0,0,0,.1),rgba(0,0,0,.75))' }} />
              <div style={{ position: 'relative', height: '100%', display: 'flex',
                flexDirection: 'column', justifyContent: 'flex-end',
                alignItems: 'flex-start', padding: 16, minHeight: 190 }}>
                <div style={{ width: 46, height: 46, borderRadius: 999,
                  background: 'rgba(255,255,255,.16)',
                  backdropFilter: 'blur(14px)', display: 'grid',
                  placeItems: 'center', marginBottom: 12 }}>
                  <span style={{ color: '#F6F2EC', fontSize: 15,
                    marginLeft: 3 }}>▶</span>
                </div>
                <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.13em',
                  color: 'rgba(246,242,236,.7)' }}>
                  {coach ? coach.name.toUpperCase() : 'YOUR COACH'}
                </div>
                <div style={{ fontSize: 17, fontWeight: 700, color: '#F6F2EC',
                  marginTop: 4, letterSpacing: '-.02em' }}>
                  What today is for
                </div>
              </div>
            </button>
          )}
        </div>
      )}

      {session.body && (
        <Card style={{ marginTop: 20 }}>
          <div style={{ ...T.body, color: C.ink, whiteSpace: 'pre-line' }}>{session.body}</div>
        </Card>
      )}

      {blocks.map(b => (
        <Card key={b.id} style={{ marginTop: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 12 }}>
            <div style={{ width: 28, height: 28, borderRadius: 999, background: C.card3,
              display: 'grid', placeItems: 'center', fontSize: 12.5,
              fontWeight: 800 }}>{b.letter}</div>
            <div style={{ ...T.h3 }}>{b.label}</div>
          </div>

          {b.scheme && <Chip>{b.scheme}</Chip>}

          {/* A clock, where the format needs one. Straight sets get
              nothing — a rest timer nobody asked for is just noise. */}
          <BlockTimer block={b} />

          <div style={{ marginTop: b.scheme ? 4 : 0 }}>
            {b.block_lines.map(l => {
              const item = b.block_items.find(x => x.movements?.name === l.movement)
              const kg = item ? targetKg(item.movements, benchmarks) : null
              return (
                <div key={l.id} style={{ marginTop: 11 }}>
                  <span style={{ color: C.g, fontSize: 16.5, fontWeight: 800 }}>
                    {l.prescription}
                  </span>{' '}
                  <span style={{ fontSize: 16.5, fontWeight: 700 }}>{l.movement}</span>
                  {kg && <span style={{ fontSize: 15, color: C.g, fontWeight: 700 }}>
                    {' '}· {kg}kg</span>}
                  {l.sub && <div style={{ fontSize: 13.5, color: C.sub,
                    marginTop: 2 }}>{l.sub}</div>}
                </div>
              )
            })}
          </div>

          {b.rest_note && (
            <div style={{ marginTop: 13, paddingTop: 11, textAlign: 'center',
              fontSize: 13, fontWeight: 600, color: C.sub,
              borderTop: `1px solid ${C.line}` }}>{b.rest_note}</div>
          )}

          {b.coach_notes.length > 0 && (
            <div style={{ marginTop: 15, paddingTop: 14, borderTop: `1px solid ${C.line}` }}>
              <Chip>Coach's notes</Chip>
              {b.coach_notes.map(n => (
                <div key={n.id} style={{ marginTop: 12 }}>
                  <div style={{ fontSize: 14.5, fontWeight: 700 }}>{n.heading}</div>
                  <div style={{ ...T.body, fontSize: 14, marginTop: 4 }}>{n.body}</div>
                </div>
              ))}
            </div>
          )}
        </Card>
      ))}

      <Btn style={{ marginTop: 18 }} onClick={begin}>Start workout</Btn>
    </div>
  )

  /* ---------------- live ---------------- */
  const B = blocks[bi]
  const items = B.block_items || []

  return (
    <div style={{ ...page, paddingBottom: 130 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ fontSize: 23, fontWeight: 800, letterSpacing: '-.03em',
          ...T.num }}>{fmt(t)}</div>
        <div style={{ flex: 1 }} />
        <button onClick={end} style={{ border: 'none', background: C.card2, color: C.red,
          borderRadius: 999, padding: '10px 17px', fontSize: 14.5, fontWeight: 700,
          cursor: 'pointer', fontFamily: F }}>Finish</button>
      </div>

      <div style={{ ...T.h2, marginTop: 12 }}>{session.title}</div>

      <div style={{ display: 'flex', gap: 10, marginTop: 14, overflowX: 'auto' }}>
        {blocks.map((b, i) => {
          const on = bi === i
          const its = b.block_items || []
          const done = its.length > 0 && its.every(it =>
            Array.from({ length: it.sets }).every((_, k) => cell(it.id, k).done))
          return (
            <button key={b.id} onClick={() => setBi(i)} style={{
              position: 'relative', flex: '0 0 auto', border: 'none',
              background: 'transparent', padding: 0, cursor: 'pointer',
            }}>
              <div style={{ width: 46, height: 46, borderRadius: 999, display: 'grid',
                placeItems: 'center', background: on ? C.g : C.card2,
                color: on ? C.bg : done ? C.ink : C.sub, fontSize: 17,
                fontWeight: 800, fontFamily: F }}>{b.letter}</div>
              {done && !on && (
                <div style={{ position: 'absolute', bottom: -2, right: -2, width: 18,
                  height: 18, borderRadius: 999, background: C.g, display: 'grid',
                  placeItems: 'center', border: `2.5px solid ${C.bg}` }}>
                  <Ico d={I.check} s={8} c={C.bg} w={4} />
                </div>
              )}
            </button>
          )
        })}
      </div>

      <div style={{ ...T.h2, marginTop: 18 }}>{B.label}</div>

      <Card style={{ marginTop: 12 }}>
        {B.scheme && <Chip>{B.scheme}</Chip>}
        {B.block_lines.map(l => (
          <div key={l.id} style={{ marginTop: 11 }}>
            <span style={{ color: C.g, fontSize: 16, fontWeight: 800 }}>{l.prescription}</span>{' '}
            <span style={{ fontSize: 16, fontWeight: 700 }}>{l.movement}</span>
          </div>
        ))}
        {B.rest_note && (
          <div style={{ marginTop: 12, paddingTop: 10, textAlign: 'center', fontSize: 13,
            fontWeight: 600, color: C.sub, borderTop: `1px solid ${C.line}` }}>
            {B.rest_note}
          </div>
        )}
      </Card>

      {B.coach_notes.length > 0 && (
        <Card style={{ marginTop: 10 }}>
          <Chip>Coach's notes</Chip>
          {B.coach_notes.map(n => (
            <div key={n.id} style={{ marginTop: 12 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{n.heading}</div>
              <div style={{ ...T.body, fontSize: 13.5, marginTop: 4 }}>{n.body}</div>
            </div>
          ))}
        </Card>
      )}

      {items.map(item => {
        const mv = item.movements
        const next = Array.from({ length: item.sets })
          .findIndex((_, i) => !cell(item.id, i).done)
        const kgTarget = targetKg(mv, benchmarks)
        return (
          <Card key={item.id} style={{ marginTop: 10 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <div style={{ flex: 1, ...T.h3 }}>{mv?.name}</div>
              {kgTarget && (
                <div style={{ fontSize: 18, fontWeight: 800, color: C.g, ...T.num }}>
                  {kgTarget}<span style={{ fontSize: 12 }}>kg</span>
                </div>
              )}
            </div>
            <div style={{ ...T.body, fontSize: 13.5, marginTop: 3 }}>
              {item.sets} × {mv?.has_time ? 'max' : item.reps}
              {kgTarget ? ' · from your 5RM' : ''}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '18px 1fr 1fr 48px',
              gap: 8, fontSize: 13, fontWeight: 700, color: C.sub, margin: '13px 0 7px' }}>
              <div />
              <div style={{ textAlign: 'center' }}>{mv?.has_time ? 'Time' : 'Reps'}</div>
              <div style={{ textAlign: 'center' }}>Weight</div>
              <div />
            </div>

            {Array.from({ length: item.sets }).map((_, i) => {
              const c = cell(item.id, i)
              const on = !!c.done, act = i === next
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ width: 3.5, height: 38, borderRadius: 999, marginRight: 7,
                    flexShrink: 0, background: on ? C.g : act ? C.ink : 'transparent' }} />
                  <div style={{ width: 12, fontSize: 14, fontWeight: 700,
                    color: C.sub }}>{i + 1}</div>
                  <div style={{ flex: 1, display: 'grid',
                    gridTemplateColumns: '1fr 1fr 48px', gap: 8, marginLeft: 7,
                    alignItems: 'center' }}>
                    <Cell v={c.reps} ph={ghost(item, i, 'reps')} on={on} act={act}
                      onTap={() => setPad({ item, i, field: 'reps',
                        label: mv?.has_time ? 'sec' : 'reps', time: mv?.has_time,
                        value: c.reps ?? '' })} />
                    <Cell v={c.kg} ph={ghost(item, i, 'kg')} on={on} unit="kg"
                      onTap={() => setPad({ item, i, field: 'kg', label: 'kg',
                        value: c.kg ?? '' })} />
                    <button onClick={() => on
                        ? writeSet(item, i, { done: false })
                        : logSet(item, i)}
                      style={{ width: 45, height: 45, borderRadius: 999, border: 'none',
                        cursor: 'pointer', background: on ? C.g : C.card2,
                        display: 'grid', placeItems: 'center',
                        animation: on ? 'pop .26s cubic-bezier(.2,.8,.3,1)' : 'none' }}>
                      <Ico d={I.check} s={17} c={on ? C.bg : C.mute} w={2.6} />
                    </button>
                  </div>
                </div>
              )
            })}
          </Card>
        )
      })}

      <Btn tone="soft" style={{ marginTop: 12 }}
        onClick={() => bi < blocks.length - 1 ? setBi(bi + 1) : end()}>
        {bi < blocks.length - 1 ? `Next — ${blocks[bi + 1].label}` : 'Finish workout'}
      </Btn>

      {/* rest bar */}
      <div style={{ position: 'fixed', left: 14, right: 14, maxWidth: 492,
        margin: '0 auto', bottom: 'calc(14px + env(safe-area-inset-bottom))',
        background: C.card, border: `1px solid ${C.line}`, borderRadius: 999,
        padding: 8, display: 'flex', alignItems: 'center', gap: 11, zIndex: 40 }}>
        <button onClick={() => setRest(rest == null ? 150 : null)} style={{
          width: 44, height: 44, borderRadius: 999, border: 'none', background: C.g,
          display: 'grid', placeItems: 'center', cursor: 'pointer', flexShrink: 0,
        }}>
          <span style={{ color: C.bg, fontSize: 15, fontWeight: 800 }}>
            {rest != null ? '❙❙' : '▶'}
          </span>
        </button>
        <div style={{ flex: 1 }} />
        <div style={{ fontSize: 14, fontWeight: 700, color: C.sub }}>Rest</div>
        <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-.03em',
          paddingRight: 13, ...T.num, color: rest != null ? C.g : C.ink }}>
          {rest != null ? fmt(rest) : '2:30'}
        </div>
      </div>

      {pad && (
        <Keypad label={pad.label} value={pad.value} time={pad.time}
          onClose={() => setPad(null)}
          onSave={v => { writeSet(pad.item, pad.i, { [pad.field]: v }); setPad(null) }} />
      )}
    </div>
  )
}

function Cell({ v, ph, on, act, unit, onTap }) {
  const filled = v != null && v !== ''
  return (
    <button onClick={onTap} style={{
      height: 45, borderRadius: 12, cursor: 'pointer', fontFamily: F,
      // Fill does the work colour used to: done is filled and
      // inverted, next is outlined, waiting is flat.
      background: on ? C.g : C.card2,
      border: `1.5px solid ${on ? C.g : act ? C.ink : 'transparent'}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3,
      padding: '0 8px',
    }}>
      <span style={{ fontSize: 16.5, fontWeight: on ? 800 : 700, ...T.num,
        color: on ? C.bg : filled ? C.ink : C.mute }}>{filled ? v : (ph || '—')}</span>
      {unit && <span style={{ fontSize: 11.5, color: on ? C.bg : C.mute,
        fontWeight: 600, opacity: on ? .65 : .8 }}>{unit}</span>}
    </button>
  )
}
