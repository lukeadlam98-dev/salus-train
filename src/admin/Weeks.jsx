import { useState, useEffect } from 'react'
import { C, T, F } from '../lib/theme'
import * as api from './api'
import { Save, Toggle, Btn, Ask } from './widgets'


// Full control of the block.
//
// Everything here was already possible through the database and
// nowhere in the interface, which meant a coach who got a week wrong
// had to ask someone with SQL. Adding, reordering, emptying,
// duplicating and deleting all live in one place now.
//
// Deleting says what it costs before it does it. A week with logged
// sessions in it belongs to the members who did them, and removing it
// takes their history with it — so that case is guarded harder than
// the rest.
export default function Weeks({ programmeId, programmes, onOpenWeek }) {
  const [weeks, setWeeks] = useState([])
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const [confirm, setConfirm] = useState(null)
  const [contents, setContents] = useState({})

  const load = () => api.listWeeks(programmeId).then(setWeeks).catch(
    e => setErr(e.message))

  useEffect(() => { load() }, [programmeId])

  const run = async fn => {
    setBusy(true); setErr(null)
    try { await fn(); await load() }
    catch (e) { setErr(e.message || 'That didn\u2019t work.') }
    setBusy(false)
  }

  async function askDelete(w) {
    const c = await api.weekContents(w.id)
    setContents({ ...contents, [w.id]: c })
    setConfirm({ kind: 'delete', week: w, c })
  }

  const programme = programmes?.find(p => p.id === programmeId)

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        <div style={{ flex: 1 }}>
          <h1 style={T.h1}>Weeks</h1>
          <p style={{ ...T.body, marginTop: 7, maxWidth: 540 }}>
            The shape of {programme?.name || 'the block'}. Add, reorder, empty
            or remove a week — and publish it when it's ready for members to
            see.
          </p>
        </div>
        <Btn onClick={() => run(() => api.addWeek(programmeId))} disabled={busy}
          style={{ flexShrink: 0, width: 'auto', padding: '12px 20px' }}>
          Add a week
        </Btn>
      </div>

      {err && (
        <div style={{ background: C.card, border: `1px solid ${C.line}`,
          borderRadius: 10, padding: '11px 14px', fontSize: 13, color: C.red,
          marginTop: 16 }}>{err}</div>
      )}

      <div style={{ marginTop: 22 }}>
        {weeks.length === 0 && (
          <div style={{ background: C.card, border: `1px dashed ${C.line}`,
            borderRadius: 14, padding: '34px 20px', textAlign: 'center' }}>
            <div style={{ ...T.h3 }}>No weeks yet</div>
            <div style={{ ...T.body, fontSize: 13.5, marginTop: 7 }}>
              Add the first one and start writing sessions into it.
            </div>
          </div>
        )}

        {weeks.map((w, i) => (
          <div key={w.id} style={{ background: C.card, borderRadius: 14,
            border: `1px solid ${C.line}`, boxShadow: C.shadow,
            padding: 15, marginBottom: 10,
            opacity: w.published ? 1 : .72 }}>

            <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
              {/* order */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2,
                flexShrink: 0 }}>
                <Arrow dir={-1} disabled={i === 0 || busy}
                  onClick={() => run(() => api.moveWeek(programmeId, w.id, -1))} />
                <Arrow dir={1} disabled={i === weeks.length - 1 || busy}
                  onClick={() => run(() => api.moveWeek(programmeId, w.id, 1))} />
              </div>

              <div style={{ width: 38, height: 38, borderRadius: 999,
                background: C.card2, display: 'grid', placeItems: 'center',
                fontSize: 15, fontWeight: 800, flexShrink: 0 }}>{w.idx}</div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', gap: 9, alignItems: 'center' }}>
                  <div style={{ width: 150 }}>
                    <Save value={w.phase || ''} placeholder="Foundation"
                      onSave={v => run(() => api.setWeek(w.id, { phase: v }))} />
                  </div>
                  <div style={{ fontSize: 12.5, color: C.sub }}>
                    {w.sessions ?? '—'} sessions
                  </div>
                </div>
                <div style={{ marginTop: 8, maxWidth: 420 }}>
                  <Save value={w.note || ''} rows={1}
                    placeholder="A line for members — what this week is for"
                    onSave={v => run(() => api.setWeek(w.id, { note: v }))} />
                </div>
              </div>

              <Toggle on={w.published}
                label={w.published ? 'Live' : 'Draft'}
                onChange={v => run(() => api.setWeek(w.id, { published: v }))} />
            </div>

            {/* ---- what you can do to it ---- */}
            <div style={{ display: 'flex', gap: 7, marginTop: 13,
              paddingTop: 13, borderTop: `1px solid ${C.line}`,
              flexWrap: 'wrap' }}>
              <Small onClick={() => onOpenWeek(w)}>Open sessions</Small>
              <Small onClick={() => run(() =>
                api.duplicateWeek(w.id, programmeId))}>Duplicate</Small>
              <Small onClick={() => run(async () => {
                for (const p of (programmes || [])) {
                  if (p.id !== programmeId) return api.duplicateWeek(w.id, p.id)
                }
              })} hide={!(programmes?.length > 1)}>Copy to another block</Small>
              <div style={{ flex: 1 }} />
              <Small tone="quiet" onClick={async () => {
                const c = await api.weekContents(w.id)
                setConfirm({ kind: 'clear', week: w, c })
              }}>Empty it</Small>
              <Small tone="danger"
                onClick={() => askDelete(w)}>Delete</Small>
            </div>
          </div>
        ))}
      </div>

      {/* ---- deleting, with the cost stated ---- */}
      {confirm?.kind === 'delete' && (
        <Ask
          title={`Delete week ${confirm.week.idx}?`}
          body={describe(confirm.c, 'removed with it')}
          danger={confirm.c.logs > 0}
          confirmLabel={confirm.c.logs > 0
            ? `Delete anyway` : 'Delete the week'}
          onCancel={() => setConfirm(null)}
          onConfirm={() => {
            setConfirm(null)
            run(async () => {
              await api.deleteWeek(confirm.week.id)
              await api.resequenceWeeks(programmeId)
            })
          }} />
      )}

      {confirm?.kind === 'clear' && (
        <Ask
          title={`Empty week ${confirm.week.idx}?`}
          body={describe(confirm.c, 'deleted') +
            ' The week itself stays, so you can write into it again.'}
          danger={confirm.c.logs > 0}
          confirmLabel="Empty it"
          onCancel={() => setConfirm(null)}
          onConfirm={() => {
            setConfirm(null)
            run(() => api.clearWeek(confirm.week.id))
          }} />
      )}
    </div>
  )
}

// Say what a delete actually costs. "Are you sure" about an unknown
// quantity is not a safeguard.
function describe(c, verb) {
  const bits = []
  if (c.sessions.length) bits.push(`${c.sessions.length} session${
    c.sessions.length === 1 ? '' : 's'}`)
  if (c.blocks) bits.push(`${c.blocks} block${c.blocks === 1 ? '' : 's'}`)
  if (!bits.length) return 'It\u2019s empty, so nothing is lost.'

  let s = `${bits.join(' and ')} will be ${verb}.`
  if (c.logs > 0) {
    s += ` ${c.people} member${c.people === 1 ? ' has' : 's have'} logged ` +
         `${c.logs} session${c.logs === 1 ? '' : 's'} in this week — that ` +
         `history goes too, and it can't be recovered.`
  }
  return s
}

const Arrow = ({ dir, onClick, disabled }) => (
  <button onClick={disabled ? undefined : onClick} disabled={disabled}
    style={{ width: 20, height: 16, border: 'none', background: 'transparent',
      cursor: disabled ? 'default' : 'pointer', padding: 0,
      opacity: disabled ? .25 : 1, display: 'grid', placeItems: 'center' }}>
    <svg width="11" height="7" viewBox="0 0 12 8" fill="none"
      style={{ transform: dir === 1 ? 'rotate(180deg)' : 'none' }}>
      <path d="M1 7L6 2l5 5" stroke={C.sub} strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  </button>
)

const Small = ({ children, onClick, tone, hide }) => hide ? null : (
  <button onClick={onClick} style={{
    borderRadius: 8, padding: '8px 13px', fontSize: 12.5, fontWeight: 600,
    cursor: 'pointer', fontFamily: F,
    background: tone === 'danger' ? 'transparent' : C.card2,
    border: `1px solid ${tone === 'danger' ? 'transparent' : C.line}`,
    color: tone === 'danger' ? C.red : tone === 'quiet' ? C.sub : C.ink,
  }}>{children}</button>
)
