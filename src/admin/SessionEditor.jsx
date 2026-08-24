import { useState, useEffect } from 'react'
import { C, T, F } from '../lib/theme'
import { DAYS } from '../lib/format'
import * as api from './api'
import { Save, Row, Pick, Toggle, Btn, ImagePicker, Confirm } from './widgets'

const KINDS = [
  ['strength', 'Strength'], ['half', 'The Salus Half'], ['erg', 'Ergs'],
  ['run', 'Running'], ['rest', 'Rest / recovery'],
]

export default function SessionEditor({ session, week, onBack }) {
  const [s, setS] = useState(session)
  const [blocks, setBlocks] = useState([])
  const [movements, setMovements] = useState([])

  const load = () => api.getBlocks(session.id).then(setBlocks)
  useEffect(() => { load(); api.listMovements().then(setMovements) }, [session.id])

  const patch = p => { api.setSession(s.id, p); setS({ ...s, ...p }) }
  const isRest = s.kind === 'rest'

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 18px 60px' }}>
      <Btn small tone="line" onClick={onBack} style={{ marginBottom: 18 }}>
        ← Week {week.idx}
      </Btn>

      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.14em',
        color: C.mute }}>{DAYS[s.day - 1].toUpperCase()} · WEEK {week.idx}</div>
      <h1 style={{ ...T.h1, marginTop: 7 }}>{s.title}</h1>

      {/* ---- the session itself ---- */}
      <div style={{ background: C.card, borderRadius: 16, padding: 17, marginTop: 18 }}>
        <Row label="Title">
          <Save value={s.title} onSave={v => patch({ title: v })} />
        </Row>
        <Row label="Tag" hint="The line under the title — 'Strength baseline · 50 min'.">
          <Save value={s.tag} placeholder="Strength baseline"
            onSave={v => patch({ tag: v })} />
        </Row>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: 12 }}>
          <Row label="Kind"
            hint="Half opens the sixteen-split screen. Rest shows copy instead of blocks.">
            <Pick value={s.kind} options={KINDS} onChange={v => patch({ kind: v })} />
          </Row>
          <Row label="Minutes">
            <Save value={s.est_min ?? ''} placeholder="50"
              onSave={v => patch({ est_min: v === '' ? null : Number(v) })} />
          </Row>
        </div>
        <Row label="Photo" hint="Shown behind the session card and as the header.">
          <ImagePicker value={s.cover_url} onChange={v => patch({ cover_url: v })} />
        </Row>
        <div style={{ marginTop: 4 }}>
          <Toggle on={s.is_test} label="This is a test — badges it on Today and Plan"
            onChange={v => patch({ is_test: v })} />
        </div>
      </div>

      {/* ---- rest days get copy, not blocks ---- */}
      {isRest ? (
        <div style={{ background: C.card, borderRadius: 16, padding: 17, marginTop: 14 }}>
          <Row label="Rest day copy"
            hint="Blank lines become paragraphs. This is what members read instead of a workout.">
            <Save value={s.body} multiline={7} onSave={v => patch({ body: v })} />
          </Row>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'center', margin: '28px 0 14px' }}>
            <div style={{ ...T.h3, flex: 1 }}>Blocks</div>
            <Btn small tone="solid"
              onClick={() => api.addBlock(s.id, blocks.length + 1).then(load)}>
              Add block
            </Btn>
          </div>

          {blocks.map(b => (
            <Block key={b.id} b={b} movements={movements} reload={load} />
          ))}

          {blocks.length === 0 && (
            <div style={{ ...T.body, padding: '24px 0' }}>
              No blocks yet. A block is a chunk of the session — warm up, the main
              work, accessories.
            </div>
          )}
        </>
      )}

      <div style={{ marginTop: 34, paddingTop: 20, borderTop: `1px solid ${C.line}`,
        display: 'flex' }}>
        <div style={{ flex: 1 }} />
        <Confirm label="Delete session"
          onConfirm={() => api.deleteSession(s.id).then(onBack)} />
      </div>
    </div>
  )
}

function Block({ b, movements, reload }) {
  const [open, setOpen] = useState(false)

  return (
    <div style={{ background: C.card, borderRadius: 16, marginBottom: 11,
      overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 15,
        cursor: 'pointer' }} onClick={() => setOpen(!open)}>
        <div style={{ width: 30, height: 30, borderRadius: 999, background: C.card3,
          display: 'grid', placeItems: 'center', fontSize: 13,
          fontWeight: 800 }}>{b.letter}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>{b.label}</div>
          <div style={{ fontSize: 12.5, color: C.sub, marginTop: 2 }}>
            {b.block_lines.length} line{b.block_lines.length === 1 ? '' : 's'}
            {b.block_items.length > 0 && ` · ${b.block_items.length} loggable`}
            {b.coach_notes.length > 0 && ` · ${b.coach_notes.length} note${b.coach_notes.length === 1 ? '' : 's'}`}
          </div>
        </div>
        <span style={{ fontSize: 13, color: C.mute }}>{open ? 'Close' : 'Open'}</span>
      </div>

      {open && (
        <div style={{ padding: '0 15px 16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '70px 1fr', gap: 10 }}>
            <Row label="Letter">
              <Save value={b.letter} onSave={v => api.setBlock(b.id, { letter: v })} />
            </Row>
            <Row label="Label">
              <Save value={b.label} onSave={v => api.setBlock(b.id, { label: v })} />
            </Row>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Row label="Scheme" hint="The chip — 'Build over 5 sets'.">
              <Save value={b.scheme} onSave={v => api.setBlock(b.id, { scheme: v })} />
            </Row>
            <Row label="Rest note" hint="The hatched strip under the prescription.">
              <Save value={b.rest_note}
                onSave={v => api.setBlock(b.id, { rest_note: v })} />
            </Row>
          </div>

          {/* prescription lines */}
          <Section title="What it says"
            hint="How the work reads on screen. The prescription shows in cream."
            onAdd={() => api.addLine(b.id, b.block_lines.length + 1).then(reload)}>
            {b.block_lines.map(l => (
              <div key={l.id} style={{ display: 'grid',
                gridTemplateColumns: '150px 1fr 34px', gap: 8, marginBottom: 8,
                alignItems: 'start' }}>
                <Save value={l.prescription} placeholder="5 × 5"
                  onSave={v => api.setLine(l.id, { prescription: v })} />
                <div>
                  <Save value={l.movement} placeholder="Barbell Back Squat"
                    onSave={v => api.setLine(l.id, { movement: v })} />
                  <div style={{ marginTop: 6 }}>
                    <Save value={l.sub} placeholder="Optional note under the line"
                      onSave={v => api.setLine(l.id, { sub: v })} />
                  </div>
                </div>
                <button onClick={() => api.deleteLine(l.id).then(reload)}
                  style={{ background: 'transparent', border: `1px solid ${C.line}`,
                    borderRadius: 9, color: C.mute, cursor: 'pointer', height: 41,
                    fontSize: 16, fontFamily: F }}>×</button>
              </div>
            ))}
          </Section>

          {/* loggable items */}
          <Section title="What members log"
            hint="Only these produce set-by-set logging. Leave empty for a warm up."
            onAdd={() => movements[0] &&
              api.addItem(b.id, movements[0].id, b.block_items.length + 1).then(reload)}>
            {b.block_items.map(it => (
              <div key={it.id} style={{ display: 'grid',
                gridTemplateColumns: '1fr 70px 70px 80px 34px', gap: 8,
                marginBottom: 8, alignItems: 'center' }}>
                <Pick value={it.movement_id}
                  options={movements.map(m => [m.id, m.name])}
                  onChange={v => { api.setItem(it.id, { movement_id: v }); reload() }} />
                <Save value={it.sets ?? ''} placeholder="5"
                  onSave={v => api.setItem(it.id, { sets: Number(v) || 1 })} />
                <Save value={it.reps ?? ''} placeholder="5"
                  onSave={v => api.setItem(it.id,
                    { reps: v === '' ? null : Number(v) })} />
                <Save value={it.rest_s ?? ''} placeholder="150"
                  onSave={v => api.setItem(it.id,
                    { rest_s: v === '' ? null : Number(v) })} />
                <button onClick={() => api.deleteItem(it.id).then(reload)}
                  style={{ background: 'transparent', border: `1px solid ${C.line}`,
                    borderRadius: 9, color: C.mute, cursor: 'pointer', height: 41,
                    fontSize: 16, fontFamily: F }}>×</button>
              </div>
            ))}
            {b.block_items.length > 0 && (
              <div style={{ display: 'grid',
                gridTemplateColumns: '1fr 70px 70px 80px 34px', gap: 8,
                fontSize: 11.5, color: C.mute, padding: '0 2px' }}>
                <div>Movement</div><div>Sets</div><div>Reps</div><div>Rest</div><div />
              </div>
            )}
          </Section>

          {/* coach notes */}
          <Section title="Coach's notes"
            hint="Standard, Loading, Execution, Options — whatever the session needs."
            onAdd={() => api.addNote(b.id, b.coach_notes.length + 1).then(reload)}>
            {b.coach_notes.map(n => (
              <div key={n.id} style={{ display: 'grid',
                gridTemplateColumns: '150px 1fr 34px', gap: 8, marginBottom: 8,
                alignItems: 'start' }}>
                <Save value={n.heading} placeholder="Standard"
                  onSave={v => api.setNote(n.id, { heading: v })} />
                <Save value={n.body} multiline={2}
                  placeholder="Hip crease below the knee on every rep…"
                  onSave={v => api.setNote(n.id, { body: v })} />
                <button onClick={() => api.deleteNote(n.id).then(reload)}
                  style={{ background: 'transparent', border: `1px solid ${C.line}`,
                    borderRadius: 9, color: C.mute, cursor: 'pointer', height: 41,
                    fontSize: 16, fontFamily: F }}>×</button>
              </div>
            ))}
          </Section>

          <div style={{ display: 'flex', marginTop: 16 }}>
            <div style={{ flex: 1 }} />
            <Confirm label="Delete block"
              onConfirm={() => api.deleteBlock(b.id).then(reload)} />
          </div>
        </div>
      )}
    </div>
  )
}

function Section({ title, hint, onAdd, children }) {
  return (
    <div style={{ marginTop: 18, paddingTop: 15, borderTop: `1px solid ${C.line}` }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
        <div style={{ fontSize: 14, fontWeight: 700, flex: 1 }}>{title}</div>
        <Btn small tone="line" onClick={onAdd}>Add</Btn>
      </div>
      {hint && <div style={{ fontSize: 11.5, color: C.mute, marginBottom: 11,
        lineHeight: 1.45 }}>{hint}</div>}
      {children}
    </div>
  )
}
