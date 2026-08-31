import { useState, useEffect } from 'react'
import { C, T, F } from '../lib/theme'
import { hhmm, fmt } from '../lib/format'
import { getRaces, addRace, updateRace, deleteRace, setTargetRace } from '../lib/data'
import { Card, Label, Btn, Back, Sheet, Ico, I, page } from '../components/ui'
import Keypad from '../components/Keypad'
import Empty from '../components/Empty'

const DIVISIONS = ['Open', 'Pro', 'Doubles', 'Relay']

const nice = d => new Date(d).toLocaleDateString('en-GB',
  { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })

// A member's races — the ones coming and the ones done.
//
// The done ones matter more than they look. A recorded finish next to
// what we predicted is the only way anyone finds out whether the model
// is any good, and at the moment it has been checked against exactly
// one race.
export default function Races({ userId, prediction, onBack }) {
  const [races, setRaces] = useState([])
  const [ready, setReady] = useState(false)
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState(null)

  const load = () => getRaces().then(setRaces).finally(() => setReady(true))
  useEffect(() => { load() }, [])

  if (!ready) return <div style={page}><p style={T.body}>Loading…</p></div>

  const upcoming = races.filter(r => !r.done)
  const done = races.filter(r => r.done).reverse()

  return (
    <div style={page}>
      <Back onClick={onBack} />
      <div style={{ display: 'flex', alignItems: 'flex-start', marginTop: 20 }}>
        <h1 style={{ ...T.h1, flex: 1 }}>My races</h1>
        <Btn tone="soft" small onClick={() => setAdding(true)}
          style={{ padding: '10px 16px' }}>Add one</Btn>
      </div>

      {races.length === 0 && (
        <div style={{ marginTop: 22 }}>
          <Empty icon={I.cal}
            title="Nothing booked"
            body="Add a race and the countdown, the phases and the taper all line up behind it."
            action="Add a race" onAction={() => setAdding(true)} />
        </div>
      )}

      {upcoming.length > 0 && (
        <>
          <Label style={{ margin: '26px 0 11px' }}>COMING UP</Label>
          {upcoming.map(r => (
            <Card key={r.id} onClick={() => setEditing(r)}
              style={{ marginBottom: 10,
                border: `1px solid ${r.is_next ? C.gLine : 'transparent'}` }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  {r.is_next && (
                    <div style={{ ...T.label, color: C.g, marginBottom: 6 }}>
                      COUNTING DOWN TO THIS
                    </div>
                  )}
                  <div style={{ fontSize: 17, fontWeight: 700 }}>{r.name}</div>
                  <div style={{ ...T.small, marginTop: 4 }}>
                    {nice(r.race_date)}
                    {r.location ? ` · ${r.location}` : ''}
                  </div>
                  {r.division && (
                    <div style={{ fontSize: 12, color: C.mute, marginTop: 3 }}>
                      {r.division}{r.wave ? ` · ${r.wave}` : ''}
                    </div>
                  )}
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 24, fontWeight: 800, ...T.num }}>
                    {r.days_away}
                  </div>
                  <div style={{ fontSize: 11, color: C.mute }}>days</div>
                </div>
              </div>
            </Card>
          ))}
        </>
      )}

      {done.length > 0 && (
        <>
          <Label style={{ margin: '26px 0 11px' }}>DONE</Label>
          {done.map(r => {
            const off = r.result_s && r.predicted_s
              ? r.result_s - r.predicted_s : null
            return (
              <Card key={r.id} onClick={() => setEditing(r)}
                style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 17, fontWeight: 700 }}>{r.name}</div>
                    <div style={{ ...T.small, marginTop: 4 }}>
                      {nice(r.race_date)}
                    </div>
                    {r.result_place && (
                      <div style={{ fontSize: 12.5, color: C.sub, marginTop: 5 }}>
                        {r.result_place}
                        {r.result_field ? ` of ${r.result_field}` : ''}
                        {r.result_ag ? ` · ${r.result_ag} in age group` : ''}
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 20, fontWeight: 800, ...T.num,
                      color: r.result_s ? C.g : C.mute }}>
                      {r.result_s ? hhmm(r.result_s) : 'add time'}
                    </div>
                    {off !== null && (
                      <div style={{ fontSize: 11, color: C.mute, marginTop: 3 }}>
                        {off > 0 ? '+' : ''}{fmt(Math.abs(off))} on predicted
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            )
          })}
        </>
      )}

      {(adding || editing) && (
        <RaceSheet userId={userId} race={editing} prediction={prediction}
          onClose={() => { setAdding(false); setEditing(null) }}
          onSaved={() => { setAdding(false); setEditing(null); load() }} />
      )}
    </div>
  )
}

function RaceSheet({ userId, race, prediction, onClose, onSaved }) {
  const isNew = !race
  const past = race && new Date(race.race_date) < new Date()

  const [name, setName] = useState(race?.name || '')
  const [date, setDate] = useState(race?.race_date || '')
  const [place, setPlace] = useState(race?.location || '')
  const [div, setDiv] = useState(race?.division || 'Open')
  const [result, setResult] = useState(race?.result_s || null)
  const [pos, setPos] = useState(race?.result_place || '')
  const [field, setField] = useState(race?.result_field || '')
  const [pad, setPad] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)

  const ok = name.trim().length > 1 && /^\d{4}-\d{2}-\d{2}$/.test(date)

  async function save() {
    setBusy(true); setErr(null)
    try {
      const body = {
        name: name.trim(), race_date: date, location: place.trim() || null,
        division: div,
        result_s: result || null,
        result_place: pos ? Number(pos) : null,
        result_field: field ? Number(field) : null,
      }
      if (isNew) {
        // Keep what we predicted at the time it was booked. Comparing a
        // result against a projection that has since moved tells you
        // nothing.
        const created = await addRace(userId, {
          ...body,
          predicted_s: prediction?.seconds || null,
        })
        const all = await getRaces()
        if (all.filter(r => !r.done).length === 1) await setTargetRace(created.id)
      } else {
        await updateRace(race.id, body)
      }
      onSaved()
    } catch (e) { setErr(e.message); setBusy(false) }
  }

  const input = {
    width: '100%', background: C.card2, color: C.ink,
    border: `1px solid ${C.line}`, borderRadius: 12, padding: '14px 15px',
    fontSize: 15.5, outline: 'none', fontFamily: F, marginBottom: 10,
  }

  return (
    <Sheet onClose={onClose}>
      <div style={{ ...T.h2 }}>{isNew ? 'Add a race' : race.name}</div>

      <div style={{ marginTop: 18 }}>
        <input value={name} onChange={e => setName(e.target.value)}
          placeholder="HYROX London" style={input} autoFocus={isNew} />
        <input value={date} onChange={e => setDate(e.target.value)}
          placeholder="2026-12-03" style={input} />
        <input value={place} onChange={e => setPlace(e.target.value)}
          placeholder="ExCeL, London" style={input} />

        <div style={{ display: 'flex', gap: 7, marginBottom: 4 }}>
          {DIVISIONS.map(d => (
            <button key={d} onClick={() => setDiv(d)}
              style={{ flex: 1, borderRadius: 999, padding: '11px 0',
                fontSize: 13.5, fontWeight: 700, cursor: 'pointer', fontFamily: F,
                background: div === d ? C.ink : C.card2,
                border: `1px solid ${div === d ? C.ink : C.line}`,
                color: div === d ? C.bg : C.sub }}>{d}</button>
          ))}
        </div>
      </div>

      {/* ---- how it went ---- */}
      {(past || race?.result_s) && (
        <>
          <Label style={{ margin: '24px 0 11px' }}>HOW IT WENT</Label>
          <Card onClick={() => setPad(true)} style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ flex: 1, ...T.small }}>Finish time</div>
              <div style={{ fontSize: 21, fontWeight: 800, ...T.num,
                color: result ? C.ink : C.mute }}>
                {result ? hhmm(result) : '—'}
              </div>
            </div>
          </Card>
          <div style={{ display: 'flex', gap: 10 }}>
            <input value={pos} onChange={e => setPos(e.target.value)}
              placeholder="Position" inputMode="numeric"
              style={{ ...input, marginBottom: 0 }} />
            <input value={field} onChange={e => setField(e.target.value)}
              placeholder="Out of" inputMode="numeric"
              style={{ ...input, marginBottom: 0 }} />
          </div>
          {race?.predicted_s && result && (
            <div style={{ ...T.small, fontSize: 12.5, marginTop: 12 }}>
              We said {hhmm(race.predicted_s)}. You ran {hhmm(result)} —{' '}
              {fmt(Math.abs(result - race.predicted_s))}{' '}
              {result > race.predicted_s ? 'slower' : 'faster'}. That gets fed
              back into everyone's projection.
            </div>
          )}
        </>
      )}

      {err && <p style={{ fontSize: 12.5, color: C.red, marginTop: 12 }}>{err}</p>}

      <Btn style={{ marginTop: 20 }} disabled={busy || !ok} onClick={save}>
        {busy ? 'Saving…' : isNew ? 'Add it' : 'Save'}
      </Btn>

      {!isNew && !race.is_next && !past && (
        <button onClick={async () => { await setTargetRace(race.id); onSaved() }}
          style={{ width: '100%', background: 'transparent', border: 'none',
            color: C.g, fontSize: 14, fontWeight: 600, cursor: 'pointer',
            fontFamily: F, padding: '15px 0 0' }}>
          Count down to this one instead
        </button>
      )}

      {!isNew && (
        <button onClick={async () => { await deleteRace(race.id); onSaved() }}
          style={{ width: '100%', background: 'transparent', border: 'none',
            color: C.mute, fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
            fontFamily: F, padding: '14px 0 0' }}>Remove this race</button>
      )}

      {pad && (
        <Keypad label="Finish time" time value={result}
          onClose={() => setPad(false)}
          onSave={v => { setResult(v); setPad(false) }} />
      )}
    </Sheet>
  )
}
