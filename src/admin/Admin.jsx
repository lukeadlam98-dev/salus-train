import { useState, useEffect } from 'react'
import { C, T, F } from '../lib/theme'
import { DAYS } from '../lib/format'
import { Ico, I } from '../components/ui'
import * as api from './api'
import { Save, Row, Pick, Toggle, Btn, ImagePicker, Confirm } from './widgets'
import SessionEditor from './SessionEditor'

export default function Admin({ profile, onExit }) {
  const [view, setView] = useState({ screen: 'weeks' })
  const [tab, setTab] = useState('plan')

  if (profile?.role !== 'admin') return (
    <div style={{ padding: 46, maxWidth: 520, margin: '0 auto' }}>
      <h1 style={T.h1}>Not your door</h1>
      <p style={{ ...T.body, marginTop: 8 }}>
        This area is for coaches. If that should be you, ask Luke to set your role.
      </p>
      <Btn tone="soft" style={{ marginTop: 20 }} onClick={onExit}>Back to the app</Btn>
    </div>
  )

  if (view.screen === 'session') return (
    <SessionEditor session={view.session} week={view.week}
      onBack={() => setView({ screen: 'week', week: view.week })} />
  )

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 18px 60px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.16em',
            color: C.g }}>BACK OFFICE</div>
          <h1 style={{ ...T.h1, marginTop: 6 }}>Salus Train</h1>
        </div>
        <div style={{ flex: 1 }} />
        <Btn small tone="line" onClick={onExit}>View as member</Btn>
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 22, marginBottom: 24 }}>
        {[['plan', 'The plan'], ['notices', 'Notices'], ['movements', 'Movements']]
          .map(([k, l]) => (
          <button key={k} onClick={() => { setTab(k); setView({ screen: 'weeks' }) }}
            style={{ border: 'none', borderRadius: 999, padding: '11px 17px',
              fontSize: 14.5, fontWeight: 700, cursor: 'pointer', fontFamily: F,
              background: tab === k ? C.ink : C.card2,
              color: tab === k ? C.bg : C.sub }}>{l}</button>
        ))}
      </div>

      {tab === 'plan' && (
        view.screen === 'week'
          ? <WeekEditor week={view.week}
              onBack={() => setView({ screen: 'weeks' })}
              onOpen={s => setView({ screen: 'session', session: s, week: view.week })} />
          : <WeekList onOpen={w => setView({ screen: 'week', week: w })} />
      )}
      {tab === 'notices' && <Notices />}
      {tab === 'movements' && <Movements />}
    </div>
  )
}

/* ---------------- weeks ---------------- */
function WeekList({ onOpen }) {
  const [weeks, setWeeks] = useState([])
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)

  const load = () => api.listWeeks().then(setWeeks).catch(e => setErr(e.message))
  useEffect(() => { load() }, [])

  const next = weeks.length ? Math.max(...weeks.map(w => w.idx)) + 1 : 1

  async function dup(src) {
    setBusy(true); setErr(null)
    try { await api.duplicateWeek(src, next); await load() }
    catch (e) { setErr(e.message) }
    setBusy(false)
  }

  return (
    <div>
      <p style={{ ...T.body, marginBottom: 18 }}>
        Weeks 2–8 are the same shape with different loads. Duplicate the closest
        one, then change what differs — it's far quicker than building from scratch.
      </p>

      {err && <div style={{ color: C.red, fontSize: 13.5, marginBottom: 14 }}>{err}</div>}

      {weeks.map(w => (
        <div key={w.id} style={{ background: C.card, borderRadius: 16, padding: 16,
          marginBottom: 11, display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 42, height: 42, borderRadius: 11, flexShrink: 0,
            background: w.published ? C.gDeep : C.card2, display: 'grid',
            placeItems: 'center', fontSize: 17, fontWeight: 800,
            color: w.published ? C.g : C.mute }}>{w.idx}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16.5, fontWeight: 700 }}>
              {w.phase || `Week ${w.idx}`}
            </div>
            <div style={{ fontSize: 13, color: C.sub, marginTop: 2,
              overflow: 'hidden', textOverflow: 'ellipsis',
              whiteSpace: 'nowrap' }}>{w.note || 'No description'}</div>
          </div>
          {!w.published && (
            <span style={{ background: C.card3, color: C.sub, borderRadius: 5,
              padding: '3px 9px', fontSize: 10.5, fontWeight: 800 }}>DRAFT</span>
          )}
          <Btn small tone="soft" onClick={() => onOpen(w)}>Edit</Btn>
          <Btn small tone="line" disabled={busy}
            onClick={() => dup(w.idx)}>Duplicate</Btn>
        </div>
      ))}

      {weeks.length === 0 && (
        <div style={{ ...T.body, padding: '30px 0' }}>No weeks yet.</div>
      )}
    </div>
  )
}

function WeekEditor({ week, onBack, onOpen }) {
  const [sessions, setSessions] = useState([])
  const [w, setW] = useState(week)

  const load = () => api.listSessions(week.id).then(setSessions)
  useEffect(() => { load() }, [week.id])

  const missing = [1, 2, 3, 4, 5, 6, 7].filter(d => !sessions.some(s => s.day === d))

  return (
    <div>
      <Btn small tone="line" onClick={onBack} style={{ marginBottom: 18 }}>
        ← All weeks
      </Btn>

      <div style={{ background: C.card, borderRadius: 16, padding: 17,
        marginBottom: 20 }}>
        <Row label="Phase">
          <Save value={w.phase} placeholder="Build"
            onSave={v => { api.setWeek(w.id, { phase: v }); setW({ ...w, phase: v }) }} />
        </Row>
        <Row label="Note"
          hint="Shown under the heading on the Plan tab.">
          <Save value={w.note} multiline={2}
            onSave={v => { api.setWeek(w.id, { note: v }); setW({ ...w, note: v }) }} />
        </Row>
        <Toggle on={w.published} label="Published — members can see this week"
          onChange={v => { api.setWeek(w.id, { published: v }); setW({ ...w, published: v }) }} />
      </div>

      {sessions.map(s => (
        <div key={s.id} style={{ background: C.card, borderRadius: 16, padding: 15,
          marginBottom: 10, display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 38, fontSize: 12.5, fontWeight: 800,
            color: C.mute }}>{DAYS[s.day - 1]}</div>
          <div style={{ width: 56, height: 40, borderRadius: 8, flexShrink: 0,
            border: `1px solid ${C.line}`,
            background: s.cover_url
              ? `#0B0A09 url(${s.cover_url}) center/cover` : C.card2 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 700 }}>{s.title}</div>
            <div style={{ fontSize: 12.5, color: C.sub, marginTop: 2 }}>
              {s.tag || '—'} · {s.kind}
            </div>
          </div>
          {s.is_test && (
            <span style={{ background: s.kind === 'half' ? C.g : C.card3,
              color: s.kind === 'half' ? C.bg : C.sub, borderRadius: 5,
              padding: '3px 9px', fontSize: 10.5, fontWeight: 800 }}>
              {s.kind === 'half' ? 'KEY' : 'TEST'}
            </span>
          )}
          <Btn small tone="soft" onClick={() => onOpen(s)}>Edit</Btn>
        </div>
      ))}

      {missing.length > 0 && (
        <div style={{ marginTop: 16, display: 'flex', gap: 8, alignItems: 'center',
          flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, color: C.sub, fontWeight: 600 }}>Add a day:</span>
          {missing.map(d => (
            <Btn key={d} small tone="line"
              onClick={() => api.addSession(week.id, d).then(load)}>
              {DAYS[d - 1]}
            </Btn>
          ))}
        </div>
      )}
    </div>
  )
}

/* ---------------- notices ---------------- */
function Notices() {
  const [rows, setRows] = useState([])
  const load = () => api.listNotices().then(setRows)
  useEffect(() => { load() }, [])

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
        <p style={{ ...T.body, flex: 1 }}>
          These appear on the Today screen under "What's on at Salus".
        </p>
        <Btn small tone="solid" onClick={() => api.addNotice().then(load)}>Add</Btn>
      </div>

      {rows.map(n => (
        <div key={n.id} style={{ background: C.card, borderRadius: 16, padding: 16,
          marginBottom: 11 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: 10 }}>
            <Save value={n.tag} placeholder="RACE DAY"
              onSave={v => api.setNotice(n.id, { tag: v.toUpperCase() })} />
            <Save value={n.title} placeholder="Headline"
              onSave={v => api.setNotice(n.id, { title: v })} />
          </div>
          <div style={{ marginTop: 10 }}>
            <Save value={n.body} multiline={3} placeholder="The detail…"
              onSave={v => api.setNotice(n.id, { body: v })} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 13 }}>
            <Toggle on={n.pinned} label="Pinned"
              onChange={v => { api.setNotice(n.id, { pinned: v }); load() }} />
            <div style={{ flex: 1 }} />
            <Confirm onConfirm={() => api.deleteNotice(n.id).then(load)} />
          </div>
        </div>
      ))}
    </div>
  )
}

/* ---------------- movements ---------------- */
function Movements() {
  const [rows, setRows] = useState([])
  const [name, setName] = useState('')
  const load = () => api.listMovements().then(setRows)
  useEffect(() => { load() }, [])

  async function create() {
    const n = name.trim()
    if (!n) return
    await api.addMovement({ name: n })
    setName(''); load()
  }

  return (
    <div>
      <p style={{ ...T.body, marginBottom: 16 }}>
        A movement is the thing a member logs sets against. Give it a percentage
        and the app calculates the weight from their benchmark — so a re-test in
        week 8 never rewrites what week 2 actually said.
      </p>

      <div style={{ display: 'flex', gap: 9, marginBottom: 20 }}>
        <input value={name} onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && create()}
          placeholder="New movement name"
          style={{ flex: 1, background: C.card2, color: C.ink,
            border: `1px solid ${C.line}`, borderRadius: 10, padding: '12px 14px',
            fontSize: 15, outline: 'none', fontFamily: F }} />
        <Btn tone="solid" onClick={create}>Add</Btn>
      </div>

      {rows.map(m => (
        <div key={m.id} style={{ background: C.card, borderRadius: 14, padding: 14,
          marginBottom: 9, display: 'grid',
          gridTemplateColumns: '1fr 130px 90px 110px', gap: 10, alignItems: 'center' }}>
          <Save value={m.name} onSave={v => api.setMovement(m.id, { name: v })} />
          <Pick value={m.pct_of || ''}
            options={[['', 'No benchmark'], ['squat', 'Squat 5RM']]}
            onChange={v => api.setMovement(m.id, { pct_of: v || null })} />
          <Save value={m.pct ?? ''} placeholder="0.90"
            onSave={v => api.setMovement(m.id, { pct: v === '' ? null : Number(v) })} />
          <Save value={m.default_rest_s ?? ''} placeholder="90"
            onSave={v => api.setMovement(m.id,
              { default_rest_s: v === '' ? null : Number(v) })} />
        </div>
      ))}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 130px 90px 110px',
        gap: 10, fontSize: 11.5, color: C.mute, padding: '4px 14px' }}>
        <div>Name</div><div>Calculated from</div><div>Percent</div><div>Rest (sec)</div>
      </div>
    </div>
  )
}
