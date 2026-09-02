import { C, T, F } from '../lib/theme'
import { Field, Save, Suggest } from './widgets'

// How a block is run, as fields the app can act on.
//
// The scheme used to be free text — a coach typed "AMRAP 12" and the
// app printed it back. Structured, the same thing gives the member a
// countdown that stops at twelve minutes, and gives the coach one
// place to change it.
//
// Each format asks only for what it needs. An EMOM has no rest field
// because the rest is whatever's left of the minute; a straight set
// has no window because it isn't against a clock.
export const FORMATS = [
  { key: 'sets',      label: 'Straight sets',
    hint: 'Do the reps, rest, repeat.',
    fields: ['rounds', 'rest_s'] },
  { key: 'superset',  label: 'Superset',
    hint: 'Two or more movements back to back, then rest.',
    fields: ['rounds', 'rest_s'] },
  { key: 'circuit',   label: 'Circuit',
    hint: 'A lap of everything, for rounds.',
    fields: ['rounds', 'rest_s'] },
  { key: 'amrap',     label: 'AMRAP',
    hint: 'As many rounds as possible in the window. The app counts down.',
    fields: ['window_s'] },
  { key: 'emom',      label: 'EMOM',
    hint: 'Every minute on the minute. The app marks each minute.',
    fields: ['window_s'] },
  { key: 'intervals', label: 'Intervals',
    hint: 'Work, rest, repeat. The app runs both clocks.',
    fields: ['rounds', 'work_s', 'rest_s'] },
  { key: 'fortime',   label: 'For time',
    hint: 'Finish it. The clock runs up, and stops at the cap.',
    fields: ['cap_s'] },
  { key: 'ladder',    label: 'Ladder',
    hint: 'Reps climb or fall each round — 21-15-9.',
    fields: ['ladder', 'cap_s'] },
]

const FIELDS = {
  rounds:   { label: 'Rounds',   hint: 'How many.',            ph: '3' },
  window_s: { label: 'Minutes',  hint: 'The window.',          ph: '12', mins: true },
  work_s:   { label: 'Work',     hint: 'Seconds on.',          ph: '40' },
  rest_s:   { label: 'Rest',     hint: 'Seconds between.',     ph: '90' },
  cap_s:    { label: 'Time cap', hint: 'Minutes. Blank for none.', ph: '30', mins: true },
  ladder:   { label: 'Reps',     hint: 'Separated by dashes.', ph: '21-15-9' },
}

export default function BlockFormat({ block, onChange }) {
  const fmt = FORMATS.find(f => f.key === (block.format || 'sets')) || FORMATS[0]

  const set = (k, v, mins) => {
    const n = v === '' ? null : Number(v)
    onChange({ [k]: n === null ? null : (mins ? n * 60 : n) })
  }

  return (
    <>
      <Field label="How it's run" hint={fmt.hint}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {FORMATS.map(f => {
            const on = f.key === fmt.key
            return (
              <button key={f.key}
                onClick={() => onChange({
                  format: f.key,
                  // Clear what the new format doesn't use, so an AMRAP
                  // turned into straight sets doesn't keep a window
                  // nobody can see but the chip still reads from.
                  ...Object.fromEntries(
                    ['rounds','window_s','work_s','rest_s','cap_s','ladder']
                      .filter(k => !f.fields.includes(k))
                      .map(k => [k, null])),
                })}
                style={{ borderRadius: 999, padding: '8px 14px', fontSize: 12.5,
                  fontWeight: 600, cursor: 'pointer', fontFamily: F,
                  background: on ? C.ink : C.card2,
                  border: `1px solid ${on ? C.ink : C.line}`,
                  color: on ? C.card : C.sub }}>{f.label}</button>
            )
          })}
        </div>
      </Field>

      {fmt.fields.length > 0 && (
        <div style={{ display: 'grid',
          gridTemplateColumns: `repeat(${Math.min(fmt.fields.length, 3)},1fr)`,
          gap: 10, marginTop: 12 }}>
          {fmt.fields.map(k => {
            const f = FIELDS[k]
            const raw = block[k]
            const shown = raw == null ? ''
              : f.mins ? Math.round(raw / 60) : raw
            return (
              <Field key={k} label={f.label} hint={f.hint}>
                <Save value={shown} placeholder={f.ph}
                  onSave={v => k === 'ladder'
                    ? onChange({ ladder: v || null })
                    : set(k, v, f.mins)} />
              </Field>
            )
          })}
        </div>
      )}

      {/* ---- how hard ---- */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10,
        marginTop: 12 }}>
        <Field label="Target weight"
          hint="Percent of their tested max. 75 means 75%.">
          <Save value={block.target_pct != null
              ? Math.round(block.target_pct * 100) : ''}
            placeholder="75"
            onSave={v => onChange({
              target_pct: v === '' ? null : Number(v) / 100 })} />
        </Field>
        <Field label="Or an RPE"
          hint="Where there's no test to work from. 1 to 10.">
          <Save value={block.target_rpe ?? ''} placeholder="8"
            onSave={v => onChange({
              target_rpe: v === '' ? null : Number(v) })} />
        </Field>
      </div>

      <div style={{ fontSize: 11.5, color: C.sub, lineHeight: 1.5,
        marginTop: 10 }}>
        A percentage becomes an actual weight on each member's screen,
        worked out from what they tested. Leave both blank and they'll
        pick their own.
      </div>
    </>
  )
}

// The chip, built the same way the database builds it — so the preview
// and the member's card can't disagree.
export function schemeOf(b) {
  const m = s => Math.round(s / 60)
  switch (b.format) {
    case 'amrap':     return `AMRAP ${b.window_s ? m(b.window_s) : '?'} min`
    case 'emom':      return `EMOM ${b.window_s ? m(b.window_s) : '?'} min`
    case 'fortime':   return 'For time' + (b.cap_s ? ` · ${m(b.cap_s)} min cap` : '')
    case 'intervals': return [b.rounds && `${b.rounds} ×`, b.work_s && `${b.work_s}s`,
                              b.rest_s && `/ ${b.rest_s}s`].filter(Boolean).join(' ')
    case 'circuit':   return 'Circuit' + (b.rounds ? ` · ${b.rounds} rounds` : '')
    case 'superset':  return 'Superset' + (b.rounds ? ` · ${b.rounds} sets` : '')
    case 'ladder':    return b.ladder || 'Ladder'
    default:          return 'Straight sets' + (b.rounds ? ` · ${b.rounds} sets` : '')
  }
}
