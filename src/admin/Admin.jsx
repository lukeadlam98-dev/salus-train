import { useState, useEffect } from 'react'
import { C, T, F } from '../lib/theme'
import { DAYS, hhmm } from '../lib/format'
import { Ico, I, Mark } from '../components/ui'
import * as api from './api'
import { adminVars } from './theme'
import { Save, Field, Pick, Toggle, Btn, ImagePicker, Confirm } from './widgets'
import SessionEditor from './SessionEditor'
import Home from './Home'
import Members from './Members'
import Boards from './Boards'

export default function Admin({ profile, onExit }) {
  const [programmes, setProgrammes] = useState([])
  const [prog, setProg] = useState(null)
  const [weeks, setWeeks] = useState([])
  const [nav, setNav] = useState({ view: 'week', idx: 1 })
  const [session, setSession] = useState(null)
  const [newProg, setNewProg] = useState(false)
  const [err, setErr] = useState(null)

  const loadProgrammes = async () => {
    const list = await api.listProgrammes()
    setProgrammes(list)
    setProg(p => p ? list.find(x => x.id === p.id) || list[0] : list[0])
  }
  const loadWeeks = () => prog
    ? api.listWeeks(prog.id).then(setWeeks).catch(e => setErr(e.message))
    : Promise.resolve()

  useEffect(() => { if (profile?.role === 'admin') loadProgrammes() }, [profile])
  useEffect(() => { if (prog) { loadWeeks(); setNav({ view: 'week', idx: 1 });
    setSession(null) } }, [prog?.id])

  if (profile?.role !== 'admin') return (
    <div style={{ padding: 60, maxWidth: 460, margin: '0 auto' }}>
      <h1 style={T.h1}>Not your door</h1>
      <p style={{ ...T.body, marginTop: 8 }}>
        This is the coaches' side. If it should be yours, ask Luke to set your role.
      </p>
      <Btn tone="soft" style={{ marginTop: 20 }} onClick={onExit}>
        Back to the app
      </Btn>
    </div>
  )

  const week = weeks.find(w => w.idx === nav.idx)
  const nextIdx = weeks.length ? Math.max(...weeks.map(w => w.idx)) + 1 : 1

  async function duplicate(w) {
    if (!w) return
    setErr(null)
    try {
      await api.duplicateWeek(w.id, prog.id)
      await loadWeeks()
      setNav({ view: 'week', idx: nextIdx })
    } catch (e) { setErr(e.message) }
  }

  async function blankWeek() {
    setErr(null)
    try { await api.addWeek(prog.id); await loadWeeks()
          setNav({ view: 'week', idx: nextIdx }) }
    catch (e) { setErr(e.message) }
  }

  const go = (view, idx) => { setSession(null); setNav({ view, idx: idx ?? nav.idx }) }

  return (
    <div style={{ ...adminVars, display: 'grid',
      gridTemplateColumns: '212px minmax(0,1fr)', minHeight: '100dvh',
      background: C.bg, color: C.ink }}>

      {/* ---------------- sidebar ---------------- */}
      <div style={{ borderRight: `1px solid ${C.line}`, padding: '26px 14px',
        position: 'sticky', top: 0, height: '100dvh', overflowY: 'auto',
        background: C.card }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9,
          padding: '0 6px 20px' }}>
          <Mark s={20} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '-.01em' }}>
              Salus Train
            </div>
            <div style={{ fontSize: 10.5, color: C.mute }}>Back office</div>
          </div>
        </div>

        <SideLabel>PROGRAMME</SideLabel>
        <select value={prog?.id || ''}
          onChange={e => setProg(programmes.find(p => p.id === e.target.value))}
          style={{ width: '100%', background: C.card2, color: C.ink,
            border: `1px solid ${C.line}`, borderRadius: 8, padding: '9px 10px',
            fontSize: 13, fontWeight: 600, outline: 'none', fontFamily: F,
            marginBottom: 6 }}>
          {programmes.map(p => (
            <option key={p.id} value={p.id}>
              {p.name}{p.live ? '' : ' · draft'}
            </option>
          ))}
        </select>
        <button onClick={() => setNewProg(true)} style={{ width: '100%',
          background: 'transparent', border: `1px dashed ${C.line}`,
          borderRadius: 8, padding: '8px 0', fontSize: 11.5, fontWeight: 600,
          color: C.sub, cursor: 'pointer', fontFamily: F, marginBottom: 16 }}>
          + New programme
        </button>

        <SideLabel>WEEKS</SideLabel>
        {weeks.map(w => (
          <SideItem key={w.id} on={nav.view === 'week' && nav.idx === w.idx}
            onClick={() => go('week', w.idx)}>
            <span style={{ width: 17, fontWeight: 800, fontSize: 12,
              color: nav.idx === w.idx ? 'inherit' : C.mute }}>{w.idx}</span>
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis',
              whiteSpace: 'nowrap' }}>{w.phase || `Week ${w.idx}`}</span>
            {!w.published && <Dot />}
          </SideItem>
        ))}
        <div style={{ display: 'flex', gap: 5, marginTop: 6 }}>
          <button onClick={() => duplicate(week)} style={{ flex: 1,
            background: 'transparent', border: `1px dashed ${C.line}`,
            borderRadius: 8, padding: '9px 0', fontSize: 11.5, fontWeight: 600,
            color: C.sub, cursor: 'pointer', fontFamily: F }}>
            + Copy {nav.idx}
          </button>
          <button onClick={blankWeek} style={{ flex: 1,
            background: 'transparent', border: `1px dashed ${C.line}`,
            borderRadius: 8, padding: '9px 0', fontSize: 11.5, fontWeight: 600,
            color: C.sub, cursor: 'pointer', fontFamily: F }}>
            + Blank
          </button>
        </div>

        <SideLabel style={{ marginTop: 24 }}>THE APP</SideLabel>
        {[['home', 'Members\u2019 home'], ['boards', 'Leaderboards'],
          ['notices', 'Notices'], ['movements', 'Movements'],
          ['photos', 'Photos'], ['members', 'Members']].map(([k, l]) => (
          <SideItem key={k} on={nav.view === k} onClick={() => go(k)}>
            <span style={{ flex: 1 }}>{l}</span>
          </SideItem>
        ))}

        <div style={{ marginTop: 24, paddingTop: 16,
          borderTop: `1px solid ${C.line}` }}>
          <Btn small tone="line" style={{ width: '100%' }} onClick={onExit}>
            View as member
          </Btn>
        </div>
      </div>

      {/* ---------------- main ---------------- */}
      <div style={{ padding: '30px 34px 70px', maxWidth: 1180 }}>
        {err && (
          <div style={{ background: C.card2, border: `1px solid ${C.line}`,
            borderRadius: 10, padding: '11px 14px', fontSize: 13, color: C.red,
            marginBottom: 18 }}>{err}</div>
        )}

        {session
          ? <SessionEditor session={session} week={week}
              onBack={() => setSession(null)} />
          : nav.view === 'week' && week
            ? <WeekView week={week} programme={prog} onOpen={setSession}
                onChanged={() => { loadWeeks(); loadProgrammes() }} />
            : nav.view === 'home'      ? <Home />
            : nav.view === 'boards'    ? <Boards />
            : nav.view === 'notices'   ? <Notices />
            : nav.view === 'movements' ? <Movements />
            : nav.view === 'photos'    ? <Photos />
            : nav.view === 'members'   ? <Members />
            : <div style={T.body}>Nothing here.</div>}
      </div>

      {newProg && (
        <NewProgramme onClose={() => setNewProg(false)}
          onDone={async () => { setNewProg(false); await loadProgrammes() }} />
      )}
    </div>
  )
}

function NewProgramme({ onClose, onDone }) {
  const [name, setName] = useState('')
  const [weeks, setWeeks] = useState('8')
  const [blurb, setBlurb] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)

  async function go() {
    setBusy(true); setErr(null)
    try { await api.createProgramme(name.trim(), Number(weeks) || 8,
            blurb.trim() || null); onDone() }
    catch (e) { setErr(e.message); setBusy(false) }
  }

  const inp = { width: '100%', background: C.card2, color: C.ink,
    border: `1px solid ${C.line}`, borderRadius: 9, padding: '11px 13px',
    fontSize: 14.5, outline: 'none', fontFamily: F, marginBottom: 10 }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0,
        background: 'rgba(26,22,19,.5)', zIndex: 200 }} />
      <div style={{ position: 'fixed', top: '18%', left: '50%',
        transform: 'translateX(-50%)', width: 400, zIndex: 210,
        background: C.card, border: `1px solid ${C.line}`, borderRadius: 16,
        padding: 22, boxShadow: '0 20px 60px rgba(26,22,19,.25)' }}>
        <div style={{ fontSize: 19, fontWeight: 800,
          letterSpacing: '-.03em' }}>New programme</div>
        <p style={{ ...T.body, fontSize: 13, margin: '7px 0 16px' }}>
          It arrives with its weeks already made, all unpublished, so nothing
          shows until you're ready.
        </p>
        <input value={name} onChange={e => setName(e.target.value)} autoFocus
          placeholder="Name — ATHX" style={inp} />
        <input value={weeks} onChange={e => setWeeks(e.target.value)}
          placeholder="How many weeks" style={inp} />
        <input value={blurb} onChange={e => setBlurb(e.target.value)}
          placeholder="One line about it" style={inp} />
        {err && <div style={{ color: C.red, fontSize: 13,
          marginBottom: 10 }}>{err}</div>}
        <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
          <Btn tone="solid" disabled={busy || name.trim().length < 2}
            onClick={go} style={{ flex: 1 }}>
            {busy ? 'Making\u2026' : `Create ${weeks || 8} weeks`}
          </Btn>
          <Btn tone="line" onClick={onClose}>Cancel</Btn>
        </div>
      </div>
    </>
  )
}

const SideLabel = ({ children, style }) => (
  <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.13em',
    color: C.mute, padding: '0 6px 8px', ...style }}>{children}</div>
)
const SideItem = ({ children, on, onClick }) => (
  <button onClick={onClick} style={{ width: '100%', display: 'flex',
    alignItems: 'center', gap: 8, border: 'none', borderRadius: 8,
    padding: '9px 9px', marginBottom: 2, cursor: 'pointer', fontFamily: F,
    fontSize: 13.5, fontWeight: on ? 700 : 500, textAlign: 'left',
    background: on ? C.card3 : 'transparent',
    color: on ? C.ink : C.sub }}>{children}</button>
)
const Dot = () => (
  <span style={{ width: 5, height: 5, borderRadius: 999, background: C.mute }} />
)
const Panel = ({ children, style }) => (
  <div style={{ background: C.card, borderRadius: 14, padding: 16,
    border: `1px solid ${C.line}`, boxShadow: C.shadow, ...style }}>{children}</div>
)

/* ---------------- a week ---------------- */
function WeekView({ week, programme, onOpen, onChanged }) {
  const [sessions, setSessions] = useState([])
  const [w, setW] = useState(week)

  const load = () => api.listSessions(week.id).then(setSessions)
  useEffect(() => { setW(week); load() }, [week.id])

  const missing = [1, 2, 3, 4, 5, 6, 7].filter(d => !sessions.some(s => s.day === d))
  const patch = p => { api.setWeek(w.id, p); setW({ ...w, ...p }); onChanged?.() }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20,
        marginBottom: 22 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.13em',
            color: C.mute }}>
            {(programme?.name || '').toUpperCase()} · WEEK {w.idx}
          </div>
          <h1 style={{ ...T.h1, marginTop: 6 }}>{w.phase || `Week ${w.idx}`}</h1>
        </div>
        <Panel style={{ width: 320, padding: 14 }}>
          <Toggle on={w.published}
            label={w.published ? 'Live to members' : 'Draft — hidden'}
            onChange={v => patch({ published: v })} />
          <div style={{ marginTop: 11 }}>
            <Save value={w.phase} placeholder="Phase — Build"
              onSave={v => patch({ phase: v })} />
          </div>
          <div style={{ marginTop: 7 }}>
            <Save value={w.note} rows={2} placeholder="A line about this week"
              onSave={v => patch({ note: v })} />
          </div>
        </Panel>
      </div>

      <div style={{ display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill,minmax(230px,1fr))', gap: 12 }}>
        {sessions.map(s => (
          <button key={s.id} onClick={() => onOpen(s)} style={{ textAlign: 'left',
            background: C.card, border: `1px solid ${C.line}`, borderRadius: 14,
            padding: 0, cursor: 'pointer', overflow: 'hidden', fontFamily: F,
            boxShadow: C.shadow }}>
            <div style={{ height: 96, position: 'relative',
              background: s.cover_url
                ? `#0B0A09 url(${s.cover_url}) center/cover`
                : 'linear-gradient(150deg,#312A22,#191714)' }}>
              <div style={{ position: 'absolute', inset: 0, padding: 11,
                display: 'flex', alignItems: 'flex-start' }}>
                <span style={{ background: 'rgba(0,0,0,.55)', color: '#F6F2EC',
                  borderRadius: 6, padding: '3px 8px', fontSize: 10.5,
                  fontWeight: 700 }}>{DAYS[s.day - 1]}</span>
                <div style={{ flex: 1 }} />
                {s.is_test && (
                  <span style={{ background: s.kind === 'half' ? C.g : 'rgba(0,0,0,.55)',
                    color: s.kind === 'half' ? '#0B0A09' : '#F6F2EC', borderRadius: 6,
                    padding: '3px 8px', fontSize: 10, fontWeight: 800 }}>
                    {s.kind === 'half' ? 'KEY' : 'TEST'}
                  </span>
                )}
              </div>
            </div>
            <div style={{ padding: '11px 13px 13px' }}>
              <div style={{ fontSize: 14.5, fontWeight: 700, color: C.ink }}>
                {s.title}
              </div>
              <div style={{ fontSize: 12, color: C.sub, marginTop: 2,
                overflow: 'hidden', textOverflow: 'ellipsis',
                whiteSpace: 'nowrap' }}>
                {s.tag || s.kind}{s.est_min ? ` · ${s.est_min} min` : ''}
              </div>
            </div>
          </button>
        ))}

        {missing.map(d => (
          <button key={d} onClick={() => api.addSession(week.id, d).then(load)}
            style={{ background: 'transparent', border: `1px dashed ${C.line}`,
              borderRadius: 14, minHeight: 152, cursor: 'pointer', fontFamily: F,
              color: C.mute, fontSize: 13, fontWeight: 600 }}>
            + {DAYS[d - 1]}
          </button>
        ))}
      </div>
    </div>
  )
}

/* ---------------- notices ---------------- */
function Notices() {
  const [rows, setRows] = useState([])
  const load = () => api.listNotices().then(setRows)
  useEffect(() => { load() }, [])
  return (
    <div style={{ maxWidth: 720 }}>
      <Head title="Notices"
        sub="These appear on Today under 'What's on at Salus'."
        action={<Btn small tone="solid"
          onClick={() => api.addNotice().then(load)}>Add notice</Btn>} />
      {rows.map(n => (
        <Panel key={n.id} style={{ marginBottom: 11 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr',
            gap: 9 }}>
            <Save value={n.tag} placeholder="RACE DAY"
              onSave={v => api.setNotice(n.id, { tag: v.toUpperCase() })} />
            <Save value={n.title} placeholder="Headline"
              onSave={v => api.setNotice(n.id, { title: v })} />
          </div>
          <div style={{ marginTop: 9 }}>
            <Save value={n.body} rows={3} placeholder="The detail…"
              onSave={v => api.setNotice(n.id, { body: v })} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14,
            marginTop: 12 }}>
            <Toggle on={n.pinned} label="Pinned"
              onChange={async v => {
                await api.setNotice(n.id, { pinned: v })
                await load()
              }} />
            <div style={{ flex: 1 }} />
            <Confirm onConfirm={() => api.deleteNotice(n.id).then(load)} />
          </div>
        </Panel>
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
    const n = name.trim(); if (!n) return
    await api.addMovement({ name: n }); setName(''); load()
  }

  return (
    <div style={{ maxWidth: 760 }}>
      <Head title="Movements"
        sub="Give a movement a percentage and the app works out each member's weight from their own benchmark — so a week 8 re-test never rewrites what week 2 said." />
      <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
        <input value={name} onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && create()}
          placeholder="New movement"
          style={{ flex: 1, background: C.card2, color: C.ink,
            border: `1px solid ${C.line}`, borderRadius: 9, padding: '10px 13px',
            fontSize: 14, outline: 'none', fontFamily: F }} />
        <Btn tone="solid" onClick={create}>Add</Btn>
      </div>
      <div style={{ display: 'grid',
        gridTemplateColumns: 'minmax(0,1fr) 150px 80px 80px 36px', gap: 8,
        fontSize: 10.5, color: C.mute, fontWeight: 600, marginBottom: 6,
        padding: '0 2px' }}>
        <div>Name</div><div>Calculated from</div><div>Percent</div>
        <div>Rest s</div><div />
      </div>
      {rows.map(m => (
        <div key={m.id} style={{ display: 'grid',
          gridTemplateColumns: 'minmax(0,1fr) 150px 80px 80px 36px', gap: 8,
          marginBottom: 7, alignItems: 'center' }}>
          <Save value={m.name} onSave={v => api.setMovement(m.id, { name: v })} />
          <Pick value={m.pct_of || ''}
            options={[['', 'Nothing'], ['squat', 'Squat 5RM']]}
            onChange={v => api.setMovement(m.id, { pct_of: v || null })} />
          <Save value={m.pct ?? ''} placeholder="0.90"
            onSave={v => api.setMovement(m.id,
              { pct: v === '' ? null : Number(v) })} />
          <Save value={m.default_rest_s ?? ''} placeholder="90"
            onSave={v => api.setMovement(m.id,
              { default_rest_s: v === '' ? null : Number(v) })} />
          <Confirm label="×" onConfirm={() =>
            api.deleteMovement(m.id).then(load)} />
        </div>
      ))}
    </div>
  )
}

/* ---------------- photos ---------------- */
function Photos() {
  const [files, setFiles] = useState([])
  const [err, setErr] = useState(null)
  const load = () => api.listImages().then(setFiles).catch(e => setErr(e.message))
  useEffect(() => { load() }, [])

  return (
    <div>
      <Head title="Photos" sub="Everything in the bucket. Sessions and programmes point at these." />
      {err && <div style={{ color: C.red, fontSize: 13, marginBottom: 14 }}>{err}</div>}
      <div style={{ display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill,minmax(170px,1fr))', gap: 12 }}>
        {files.map(f => (
          <div key={f.name} style={{ background: C.card, borderRadius: 12,
            border: `1px solid ${C.line}`, overflow: 'hidden' }}>
            <div style={{ height: 118,
              background: `#0B0A09 url(${f.url}) center/cover` }} />
            <div style={{ padding: '8px 10px 10px' }}>
              <div style={{ fontSize: 10.5, color: C.sub, overflow: 'hidden',
                textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</div>
              <div style={{ display: 'flex', gap: 6, marginTop: 7 }}>
                <Btn small tone="line"
                  onClick={() => navigator.clipboard?.writeText(f.url)}>Copy URL</Btn>
                <Confirm label="×" onConfirm={() =>
                  api.deleteImage(f.name).then(load)} />
              </div>
            </div>
          </div>
        ))}
      </div>
      {files.length === 0 && !err && (
        <div style={{ ...T.body }}>Nothing uploaded yet. Add photos from a session.</div>
      )}
    </div>
  )
}

const Head = ({ title, sub, action }) => (
  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20,
    marginBottom: 22 }}>
    <div style={{ flex: 1 }}>
      <h1 style={T.h1}>{title}</h1>
      {sub && <p style={{ ...T.body, marginTop: 7, maxWidth: 560 }}>{sub}</p>}
    </div>
    {action}
  </div>
)
