import { useState, useEffect } from 'react'
import { C, T, F } from '../lib/theme'
import { A, previewVars } from './theme'
import { fmt, hhmm } from '../lib/format'
import * as api from './api'
import { Save, Field, Pick, Toggle, Btn, Confirm, Sortable, Grip } from './widgets'

const show = (v, unit) =>
  v == null ? '—'
  : unit === 'time' ? (v > 3600 ? hhmm(v) : fmt(v))
  : unit === 'kg' ? `${v} kg`
  : String(v)

export default function Boards() {
  const [tab, setTab] = useState('boards')
  const [boards, setBoards] = useState([])
  const [people, setPeople] = useState([])
  const [sel, setSel] = useState(null)
  const [rows, setRows] = useState([])
  const [err, setErr] = useState(null)

  const load = () => api.listBoards().then(b => {
    setBoards(b)
    if (!sel && b.length) setSel(b[0])
  }).catch(e => setErr(e.message))

  useEffect(() => { load(); api.getBoardAdmin().then(setPeople).catch(() => {}) }, [])
  useEffect(() => { if (sel) api.getBoardRows(sel).then(setRows).catch(() => setRows([])) },
    [sel?.id, sel?.lower_wins])

  const sharing = people.filter(p => p.sharing).length
  const quiet = people.filter(p => !p.sharing)

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 300px',
      gap: 34, alignItems: 'start' }}>

      <div style={{ minWidth: 0 }}>
        <h1 style={T.h1}>Leaderboards</h1>
        <p style={{ ...T.body, marginTop: 7, maxWidth: 560 }}>
          Which boards members see, and in what order. Sharing is opt-in — a member
          who hasn't switched it on appears on none of these, however you configure
          them.
        </p>

        {err && <div style={{ color: C.red, fontSize: 13, marginTop: 14 }}>{err}</div>}

        <div style={{ display: 'flex', gap: 12, margin: '22px 0 20px' }}>
          <Stat n={sharing} label="Sharing" sub={`of ${people.length}`} />
          <Stat n={boards.filter(b => b.visible).length} label="Boards live"
            sub={`of ${boards.length}`} />
        </div>

        <div style={{ display: 'flex', gap: 7, marginBottom: 18 }}>
          {[['boards', 'Boards'], ['standards', 'Score standards']].map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)}
              style={{ borderRadius: 8, padding: '8px 14px', fontSize: 13,
                fontWeight: 600, cursor: 'pointer', fontFamily: F,
                background: tab === k ? C.ink : C.card,
                border: `1px solid ${tab === k ? C.ink : C.line}`,
                color: tab === k ? C.bg : C.sub }}>{l}</button>
          ))}
        </div>

        {tab === 'standards' && <Standards />}

        {tab === 'boards' && <Sortable ids={boards.map(b => b.id)}
          onReorder={ids => {
            api.reorderBoards(ids)
            setBoards(ids.map(id => boards.find(b => b.id === id)))
          }}>
          {boards.map(b => (
            <div key={b.id} onClick={() => setSel(b)}
              style={{ background: C.card, borderRadius: 13,
                border: `1.5px solid ${sel?.id === b.id ? C.g : C.line}`,
                boxShadow: C.shadow, padding: 14, marginBottom: 9,
                display: 'flex', alignItems: 'center', gap: 13,
                cursor: 'pointer', opacity: b.visible ? 1 : .55 }}>
              <Grip />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'grid',
                  gridTemplateColumns: 'minmax(0,1fr) 118px 108px', gap: 8 }}>
                  <Save value={b.label}
                    onSave={v => api.setBoard(b.id, { label: v })} />
                  <Pick value={b.unit || 'time'}
                    options={[['time', 'A time'], ['kg', 'Kilograms'],
                              ['reps', 'Reps']]}
                    onChange={async v => {
                      await api.setBoard(b.id, { unit: v })
                      await load()
                    }} />
                  <Pick value={b.lower_wins ? 'low' : 'high'}
                    options={[['low', 'Lower wins'], ['high', 'Higher wins']]}
                    onChange={v => {
                      const lw = v === 'low'
                      api.setBoard(b.id, { lower_wins: lw })
                      setBoards(boards.map(x =>
                        x.id === b.id ? { ...x, lower_wins: lw } : x))
                      if (sel?.id === b.id) setSel({ ...sel, lower_wins: lw })
                    }} />
                </div>
                <div style={{ marginTop: 7 }}>
                  <Save value={b.note} placeholder="A line explaining it"
                    onSave={v => api.setBoard(b.id, { note: v })} />
                </div>
                <div style={{ fontSize: 11, color: C.mute, marginTop: 6 }}>
                  Built from <b style={{ color: C.sub }}>{b.source}</b>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9,
                alignItems: 'flex-end' }}>
                <Toggle on={b.visible} label={b.visible ? 'On' : 'Off'}
                  onChange={v => {
                    api.setBoard(b.id, { visible: v })
                    setBoards(boards.map(x =>
                      x.id === b.id ? { ...x, visible: v } : x))
                  }} />
                <Confirm onConfirm={() => api.deleteBoard(b.id).then(load)} />
              </div>
            </div>
          ))}
        </Sortable>}

        {tab === 'boards' && quiet.length > 0 && (
          <div style={{ background: C.card, border: `1px solid ${C.line}`,
            borderRadius: 13, padding: 15, marginTop: 22, boxShadow: C.shadow,
            maxWidth: 620 }}>
            <div style={{ fontSize: 15, fontWeight: 700 }}>
              Not on the board
            </div>
            <div style={{ ...T.body, fontSize: 12.5, marginTop: 5 }}>
              {quiet.length} member{quiet.length === 1 ? ' hasn\u2019t' : 's haven\u2019t'} switched
              sharing on. That's their call — it isn't something to change for them.
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 11 }}>
              {quiet.map(p => (
                <span key={p.id} style={{ background: C.card2, borderRadius: 999,
                  padding: '5px 11px', fontSize: 12, color: C.sub }}>
                  {p.name || 'No name'}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* the board as members see it */}
      <div style={{ position: 'sticky', top: 24 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: A.mute,
          letterSpacing: '.1em', marginBottom: 10 }}>WHAT THEY SEE</div>
        <div style={{ ...previewVars, width: 300, background: '#0B0A09',
          borderRadius: 26, border: '1px solid #2B2926', padding: 8,
          boxShadow: '0 12px 40px rgba(26,22,19,.22)' }}>
          <div style={{ background: '#0B0A09', borderRadius: 20, height: 560,
            overflowY: 'auto', padding: 14, color: '#EFEAE1' }}>
            <div style={{ fontSize: 18, fontWeight: 800,
              letterSpacing: '-.03em' }}>Leaderboard</div>

            <div style={{ display: 'flex', gap: 6, margin: '13px 0 14px',
              overflowX: 'auto' }}>
              {boards.filter(b => b.visible).map(b => (
                <span key={b.id} style={{ flex: '0 0 auto', borderRadius: 999,
                  padding: '7px 12px', fontSize: 11, fontWeight: 700,
                  whiteSpace: 'nowrap',
                  background: sel?.id === b.id ? '#EFEAE1' : '#1F1D1A',
                  color: sel?.id === b.id ? '#0B0A09' : '#948D83' }}>
                  {b.label}
                </span>
              ))}
            </div>

            {sel?.note && (
              <div style={{ fontSize: 11.5, color: '#948D83', marginBottom: 12,
                lineHeight: 1.5 }}>{sel.note}</div>
            )}

            <div style={{ background: '#151412', borderRadius: 13,
              padding: '4px 13px' }}>
              {rows.slice(0, 8).map((r, i) => (
                <div key={r.name + i} style={{ display: 'flex', alignItems: 'center',
                  gap: 10, padding: '10px 0',
                  borderTop: i ? '1px solid #262421' : 'none' }}>
                  <div style={{ width: 16, fontSize: 11.5, fontWeight: 700,
                    color: i < 3 ? '#E8DCC8' : '#635C54' }}>{i + 1}</div>
                  <div style={{ flex: 1, fontSize: 12.5, fontWeight: 600 }}>
                    {r.name}
                  </div>
                  <div style={{ fontSize: 12.5, fontWeight: 800,
                    fontVariantNumeric: 'tabular-nums' }}>
                    {show(r.v, sel?.unit)}
                  </div>
                </div>
              ))}
              {rows.length === 0 && (
                <div style={{ fontSize: 12, color: '#635C54', padding: '18px 0',
                  textAlign: 'center' }}>
                  Nobody on this board yet.
                </div>
              )}
            </div>
          </div>
        </div>
        <div style={{ fontSize: 11, color: A.mute, marginTop: 11, lineHeight: 1.5,
          width: 300 }}>
          Real standings, live. Tap a board on the left to see it.
        </div>
      </div>
    </div>
  )
}

/* The standards behind the Salus Score. Editable, because they are
   judgements rather than facts — a coach should be able to argue
   with them and move them. */
function Standards() {
  const [rows, setRows] = useState([])
  const [err, setErr] = useState(null)
  const load = () => api.listStandards().then(setRows).catch(e => setErr(e.message))
  useEffect(() => { load() }, [])

  const asTime = r => r.unit === 'time'
  const fmtV = (v, r) => asTime(r) ? fmt(Number(v)) : String(v)

  const groups = ['m', 'f'].map(sex => ({
    sex, label: sex === 'm' ? 'Men' : 'Women',
    rows: rows.filter(r => r.sex === sex),
  }))

  return (
    <div>
      <p style={{ ...T.body, marginBottom: 18, maxWidth: 600 }}>
        Each test is scored 0 to 100 between a floor and a target. Floor is
        "just started", target is "genuinely strong for the Open category" —
        deliberately not elite, because a score nobody can reach is a score
        nobody engages with.
      </p>
      {err && <div style={{ color: C.red, fontSize: 13,
        marginBottom: 14 }}>{err}</div>}

      {groups.map(g => (
        <div key={g.sex} style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.13em',
            color: C.mute, marginBottom: 10 }}>{g.label.toUpperCase()}</div>
          <div style={{ display: 'grid',
            gridTemplateColumns: 'minmax(0,1fr) 110px 110px 96px', gap: 8,
            fontSize: 10.5, color: C.mute, fontWeight: 600, marginBottom: 6,
            padding: '0 2px' }}>
            <div>Test</div><div>Floor — 0 pts</div><div>Target — 100 pts</div>
            <div>Scored as</div>
          </div>
          {g.rows.map(r => (
            <div key={r.id} style={{ display: 'grid',
              gridTemplateColumns: 'minmax(0,1fr) 110px 110px 96px', gap: 8,
              marginBottom: 7, alignItems: 'center' }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, paddingLeft: 2 }}>
                {r.label}
              </div>
              <Save value={r.floor_v}
                onSave={v => api.setStandard(r.id, { floor_v: Number(v) })} />
              <Save value={r.target_v}
                onSave={v => api.setStandard(r.id, { target_v: Number(v) })} />
              <div style={{ fontSize: 11.5, color: C.sub }}>
                {r.per_kg ? 'per kg bodyweight'
                  : r.unit === 'time' ? 'seconds' : r.unit}
              </div>
            </div>
          ))}
        </div>
      ))}

      <div style={{ background: C.card, border: `1px solid ${C.line}`,
        borderRadius: 12, padding: 14, maxWidth: 600, boxShadow: C.shadow }}>
        <div style={{ fontSize: 13, fontWeight: 700 }}>Two things worth knowing</div>
        <div style={{ ...T.body, fontSize: 12.5, marginTop: 6 }}>
          Times are in seconds — 1200 is a twenty-minute 5km. And the squat is
          scored <b style={{ color: C.ink }}>per kilo of bodyweight</b>, so 1.75
          means one and three-quarter times what they weigh. Without that it's
          just a board for heavy people.
        </div>
      </div>
    </div>
  )
}

const Stat = ({ n, label, sub }) => (
  <div style={{ background: C.card, border: `1px solid ${C.line}`,
    borderRadius: 13, padding: '13px 16px', boxShadow: C.shadow, minWidth: 130 }}>
    <div style={{ fontSize: 23, fontWeight: 800, letterSpacing: '-.04em',
      fontVariantNumeric: 'tabular-nums' }}>{n}</div>
    <div style={{ fontSize: 12, color: C.sub, marginTop: 3, fontWeight: 600 }}>
      {label}{sub && <span style={{ color: C.mute }}> {sub}</span>}
    </div>
  </div>
)
