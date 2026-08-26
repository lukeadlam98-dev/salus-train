import { useState, useEffect } from 'react'
import { C, T, F } from '../lib/theme'
import { DAYS } from '../lib/format'
import * as api from './api'
import { Save, Field, Pick, Toggle, Btn, ImagePicker, Confirm,
         Sortable, Grip } from './widgets'
import Preview from './Preview'

const KINDS = [
  ['strength', 'Strength'], ['half', 'The Salus Half'], ['erg', 'Ergs'],
  ['run', 'Running'], ['rest', 'Rest / recovery'],
]

export default function SessionEditor({ session, week, onBack }) {
  const [s, setS] = useState(session)
  const [blocks, setBlocks] = useState([])
  const [movements, setMovements] = useState([])

  const load = () => api.getBlocks(session.id).then(setBlocks)
  useEffect(() => { setS(session); load(); api.listMovements().then(setMovements) },
    [session.id])

  // Optimistic: show it straight away, then write. If the write fails
  // the next load corrects it — better than a field that appears to do
  // nothing for half a second.
  const patch = async p => {
    setS(prev => ({ ...prev, ...p }))
    await api.setSession(s.id, p)
  }
  const isRest = s.kind === 'rest'

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 300px',
      gap: 34, alignItems: 'start' }}>

      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12,
          marginBottom: 20 }}>
          <Btn small tone="line" onClick={onBack}>← Week {week.idx}</Btn>
          <div style={{ fontSize: 12, color: C.mute, fontWeight: 600 }}>
            {DAYS[s.day - 1]}
          </div>
          <div style={{ flex: 1 }} />
          <Confirm label="Delete session"
            onConfirm={() => api.deleteSession(s.id).then(onBack)} />
        </div>

        {/* ---- the session ---- */}
        <Card>
          <div style={{ display: 'grid', gridTemplateColumns: '92px minmax(0,1fr)',
            gap: 16 }}>
            <ImagePicker value={s.cover_url} onChange={v => patch({ cover_url: v })} />
            <div>
              <Field label="Title">
                <Save big value={s.title} onSave={v => patch({ title: v })} />
              </Field>
              <div style={{ display: 'grid',
                gridTemplateColumns: '1fr 150px 82px', gap: 10 }}>
                <Field label="Tag">
                  <Save value={s.tag} placeholder="Strength baseline"
                    onSave={v => patch({ tag: v })} />
                </Field>
                <Field label="Kind">
                  <Pick value={s.kind} options={KINDS}
                    onChange={v => patch({ kind: v })} />
                </Field>
                <Field label="Minutes">
                  <Save value={s.est_min ?? ''} placeholder="50"
                    onSave={v => patch({ est_min: v === '' ? null : Number(v) })} />
                </Field>
              </div>
              <Toggle on={s.is_test} label="This is a test"
                onChange={v => patch({ is_test: v })} />
            </div>
          </div>
        </Card>

        {/* ---- rest days take copy instead of blocks ---- */}
        {isRest ? (
          <Card style={{ marginTop: 14 }}>
            <Field label="Rest day copy"
              hint="Blank lines become paragraphs. This is what they read instead of a workout.">
              <Save value={s.body} rows={8} onSave={v => patch({ body: v })} />
            </Field>
          </Card>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center',
              margin: '30px 0 14px' }}>
              <div style={{ ...T.h3, flex: 1 }}>Blocks</div>
              <Btn small tone="solid"
                onClick={() => api.addBlock(s.id, blocks.length + 1).then(load)}>
                Add block
              </Btn>
            </div>

            <Sortable ids={blocks.map(b => b.id)}
              onReorder={ids => { api.reorder('blocks', ids); 
                setBlocks(ids.map(id => blocks.find(b => b.id === id))) }}>
              {blocks.map(b => (
                <Block key={b.id} b={b} movements={movements} reload={load} />
              ))}
            </Sortable>

            {blocks.length === 0 && (
              <div style={{ ...T.body, padding: '22px 2px' }}>
                A block is a chunk of the session — warm up, the main work,
                accessories.
              </div>
            )}
          </>
        )}
      </div>

      <Preview session={s} blocks={blocks} benchmarks={{ squat: 120 }} />
    </div>
  )
}

const Card = ({ children, style }) => (
  <div style={{ background: C.card, borderRadius: 14, padding: 16,
    border: `1px solid ${C.line}`, boxShadow: C.shadow, ...style }}>{children}</div>
)

function Block({ b, movements, reload }) {
  const [open, setOpen] = useState(true)

  return (
    <div style={{ background: C.card, borderRadius: 14, marginBottom: 10,
      border: `1px solid ${C.line}`, overflow: 'hidden', boxShadow: C.shadow }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: 13 }}>
        <Grip />
        <input value={b.letter} onChange={e =>
            api.setBlock(b.id, { letter: e.target.value.toUpperCase().slice(0, 2) })}
          style={{ width: 32, height: 32, borderRadius: 999, background: C.card3,
            border: 'none', textAlign: 'center', fontSize: 13, fontWeight: 800,
            color: C.ink, outline: 'none', fontFamily: F }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <Save value={b.label} onSave={v => api.setBlock(b.id, { label: v })}
            style={{ background: 'transparent', border: 'none', fontSize: 15.5,
              fontWeight: 700, padding: '2px 0' }} />
        </div>
        <div style={{ fontSize: 11.5, color: C.mute }}>
          {b.block_lines.length} line{b.block_lines.length === 1 ? '' : 's'}
          {b.block_items.length > 0 && ` · ${b.block_items.length} logged`}
        </div>
        <Btn small tone="line" onClick={() => setOpen(!open)}>
          {open ? 'Collapse' : 'Open'}
        </Btn>
      </div>

      {open && (
        <div style={{ padding: '0 13px 14px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label="Scheme" hint="The chip — 'Build over 5 sets'.">
              <Save value={b.scheme} onSave={v => api.setBlock(b.id, { scheme: v })} />
            </Field>
            <Field label="Rest note" hint="The strip under the prescription.">
              <Save value={b.rest_note}
                onSave={v => api.setBlock(b.id, { rest_note: v })} />
            </Field>
          </div>

          <Sec title="What it says"
            onAdd={() => api.addLine(b.id, b.block_lines.length + 1).then(reload)}>
            <Sortable ids={b.block_lines.map(l => l.id)}
              onReorder={ids => { api.reorder('block_lines', ids); reload() }}>
              {b.block_lines.map(l => (
                <div key={l.id} style={{ display: 'grid',
                  gridTemplateColumns: '16px 140px minmax(0,1fr) minmax(0,1fr) 30px',
                  gap: 7, marginBottom: 7, alignItems: 'center' }}>
                  <Grip />
                  <Save value={l.prescription} placeholder="5 × 5"
                    onSave={v => api.setLine(l.id, { prescription: v })} />
                  <Save value={l.movement} placeholder="Barbell Back Squat"
                    onSave={v => api.setLine(l.id, { movement: v })} />
                  <Save value={l.sub} placeholder="Note underneath (optional)"
                    onSave={v => api.setLine(l.id, { sub: v })} />
                  <X onClick={() => api.deleteLine(l.id).then(reload)} />
                </div>
              ))}
            </Sortable>
          </Sec>

          <Sec title="What they log"
            hint="Only these produce set-by-set logging. Leave empty for a warm up."
            onAdd={() => movements[0] &&
              api.addItem(b.id, movements[0].id, b.block_items.length + 1).then(reload)}>
            {b.block_items.length > 0 && (
              <div style={{ display: 'grid',
                gridTemplateColumns: '16px minmax(0,1fr) 62px 62px 72px 30px',
                gap: 7, fontSize: 10.5, color: C.mute, marginBottom: 5,
                fontWeight: 600 }}>
                <div /><div>Movement</div><div>Sets</div><div>Reps</div>
                <div>Rest s</div><div />
              </div>
            )}
            {b.block_items.map(it => (
              <div key={it.id} style={{ display: 'grid',
                gridTemplateColumns: '16px minmax(0,1fr) 62px 62px 72px 30px',
                gap: 7, marginBottom: 7, alignItems: 'center' }}>
                <div />
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
                <X onClick={() => api.deleteItem(it.id).then(reload)} />
              </div>
            ))}
          </Sec>

          <Sec title="Coach's notes"
            onAdd={() => api.addNote(b.id, b.coach_notes.length + 1).then(reload)}>
            <Sortable ids={b.coach_notes.map(n => n.id)}
              onReorder={ids => { api.reorder('coach_notes', ids); reload() }}>
              {b.coach_notes.map(n => (
                <div key={n.id} style={{ display: 'grid',
                  gridTemplateColumns: '16px 140px minmax(0,1fr) 30px',
                  gap: 7, marginBottom: 7, alignItems: 'start' }}>
                  <div style={{ paddingTop: 9 }}><Grip /></div>
                  <Save value={n.heading} placeholder="Standard"
                    onSave={v => api.setNote(n.id, { heading: v })} />
                  <Save value={n.body} rows={2}
                    placeholder="Hip crease below the knee on every rep…"
                    onSave={v => api.setNote(n.id, { body: v })} />
                  <X onClick={() => api.deleteNote(n.id).then(reload)}
                    style={{ marginTop: 4 }} />
                </div>
              ))}
            </Sortable>
          </Sec>

          <div style={{ display: 'flex', marginTop: 14 }}>
            <div style={{ flex: 1 }} />
            <Confirm label="Delete block"
              onConfirm={() => api.deleteBlock(b.id).then(reload)} />
          </div>
        </div>
      )}
    </div>
  )
}

const X = ({ onClick, style }) => (
  <button onClick={onClick} style={{ background: 'transparent',
    border: `1px solid ${C.line}`, borderRadius: 7, color: C.mute,
    cursor: 'pointer', height: 34, fontSize: 14, fontFamily: F, ...style }}>×</button>
)

const Sec = ({ title, hint, onAdd, children }) => (
  <div style={{ marginTop: 16, paddingTop: 13, borderTop: `1px solid ${C.line}` }}>
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: hint ? 3 : 9 }}>
      <div style={{ fontSize: 13, fontWeight: 700, flex: 1 }}>{title}</div>
      <Btn small tone="line" onClick={onAdd}>Add</Btn>
    </div>
    {hint && <div style={{ fontSize: 11, color: C.mute, marginBottom: 9,
      lineHeight: 1.45 }}>{hint}</div>}
    {children}
  </div>
)
