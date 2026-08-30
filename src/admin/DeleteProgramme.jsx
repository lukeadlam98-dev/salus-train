import { useState, useEffect } from 'react'
import { C, T, F } from '../lib/theme'
import * as api from './api'
import { Btn, Pick } from './widgets'

// Deleting shows what will be lost, in numbers, before it happens.
// "This removes 8 weeks and 47 sessions" is a different sentence from
// "are you sure?" — and it's the one that stops the wrong click.
export default function DeleteProgramme({ programme, programmes, onClose, onDone }) {
  const [counts, setCounts] = useState(null)
  const [moveTo, setMoveTo] = useState('')
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)

  useEffect(() => {
    api.programmeContents(programme.id).then(setCounts).catch(e =>
      setErr(/schema cache|does not exist|programme_contents/i.test(e.message || '')
        ? 'This needs sql/13_programme_delete.sql running in Supabase first — it adds the archive column and the delete function.'
        : e.message))
  }, [programme.id])

  const others = programmes.filter(p => p.id !== programme.id)
  const hasContent = counts && (counts.weeks > 0 || counts.sessions > 0)
  const needsMove = counts && counts.members > 0
  const blocked = counts && counts.logs > 0
  const nameOk = !hasContent || typed.trim() === programme.name

  async function archive() {
    setBusy(true); setErr(null)
    try { await api.archiveProgramme(programme.id, true); onDone() }
    catch (e) { setErr(e.message); setBusy(false) }
  }

  async function remove() {
    setBusy(true); setErr(null)
    try { await api.deleteProgramme(programme.id, moveTo || null); onDone() }
    catch (e) { setErr(e.message); setBusy(false) }
  }

  const input = {
    width: '100%', background: C.card2, color: C.ink,
    border: `1px solid ${C.line}`, borderRadius: 9, padding: '11px 13px',
    fontSize: 14.5, outline: 'none', fontFamily: F,
  }

  return (
    <>
      <div onClick={() => !busy && onClose()} style={{ position: 'fixed', inset: 0,
        background: 'rgba(26,22,19,.55)', zIndex: 200 }} />
      <div style={{ position: 'fixed', top: '14%', left: '50%',
        transform: 'translateX(-50%)', width: 440, maxHeight: '72vh',
        overflowY: 'auto', zIndex: 210, background: C.card,
        border: `1px solid ${C.line}`, borderRadius: 16, padding: 22,
        boxShadow: '0 24px 70px rgba(26,22,19,.3)' }}>

        <div style={{ ...T.h2, fontSize: 19 }}>{programme.name}</div>

        {!counts ? (
          <div style={{ ...T.body, fontSize: 13.5, marginTop: 12 }}>
            Counting what's in it…
          </div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)',
              gap: 1, marginTop: 16, background: C.line, borderRadius: 11,
              overflow: 'hidden' }}>
              {[['Weeks', counts.weeks], ['Sessions', counts.sessions],
                ['Members', counts.members], ['Logged', counts.logs]].map(([l, n]) => (
                <div key={l} style={{ background: C.card2, padding: '11px 10px' }}>
                  <div style={{ fontSize: 18, fontWeight: 800,
                    letterSpacing: '-.03em',
                    fontVariantNumeric: 'tabular-nums' }}>{Number(n)}</div>
                  <div style={{ fontSize: 10.5, color: C.mute,
                    marginTop: 2 }}>{l}</div>
                </div>
              ))}
            </div>

            {/* ---- archive, the sensible one ---- */}
            <div style={{ marginTop: 20, paddingTop: 16,
              borderTop: `1px solid ${C.line}` }}>
              <div style={{ fontSize: 14.5, fontWeight: 700 }}>Archive it</div>
              <div style={{ ...T.body, fontSize: 12.5, marginTop: 5 }}>
                Disappears from the app and from this list, but everything stays —
                the weeks, the sessions, and anything members logged against it. You
                can bring it back.
              </div>
              <Btn tone="soft" style={{ marginTop: 11 }} disabled={busy}
                onClick={archive}>Archive {programme.name}</Btn>
            </div>

            {/* ---- delete, the one that needs guarding ---- */}
            <div style={{ marginTop: 20, paddingTop: 16,
              borderTop: `1px solid ${C.line}` }}>
              <div style={{ fontSize: 14.5, fontWeight: 700 }}>Delete it</div>

              {blocked ? (
                <div style={{ ...T.body, fontSize: 12.5, marginTop: 5 }}>
                  Can't. {Number(counts.logs)} logged session
                  {counts.logs === 1 ? '' : 's'} belong to this programme, and that's
                  a member's record of what they actually did. Archive it instead.
                </div>
              ) : (
                <>
                  <div style={{ ...T.body, fontSize: 12.5, marginTop: 5 }}>
                    Removes {Number(counts.weeks)} week
                    {counts.weeks === 1 ? '' : 's'} and{' '}
                    {Number(counts.sessions)} session
                    {counts.sessions === 1 ? '' : 's'}, with every prescription line
                    and coach's note in them. This can't be undone.
                  </div>

                  {needsMove && (
                    <div style={{ marginTop: 13 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: C.sub,
                        marginBottom: 5 }}>
                        Move {Number(counts.members)} member
                        {counts.members === 1 ? '' : 's'} to
                      </div>
                      <Pick value={moveTo}
                        options={[['', 'Choose a programme'],
                          ...others.map(p => [p.id, p.name])]}
                        onChange={setMoveTo} />
                      <div style={{ fontSize: 11, color: C.mute, marginTop: 5,
                        lineHeight: 1.45 }}>
                        Otherwise they open the app to nothing.
                      </div>
                    </div>
                  )}

                  {hasContent && (
                    <div style={{ marginTop: 13 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: C.sub,
                        marginBottom: 5 }}>
                        Type <b style={{ color: C.ink }}>{programme.name}</b> to confirm
                      </div>
                      <input value={typed} onChange={e => setTyped(e.target.value)}
                        placeholder={programme.name} style={input} />
                    </div>
                  )}

                  <Btn tone="warn" style={{ marginTop: 13 }}
                    disabled={busy || !nameOk || (needsMove && !moveTo)}
                    onClick={remove}>
                    {busy ? 'Deleting…' : 'Delete permanently'}
                  </Btn>
                </>
              )}
            </div>
          </>
        )}

        {err && (
          <div style={{ background: C.card2, borderRadius: 9, padding: '11px 13px',
            fontSize: 12.5, color: C.red, marginTop: 14, lineHeight: 1.5 }}>{err}</div>
        )}

        <Btn tone="line" style={{ marginTop: 16 }} disabled={busy}
          onClick={onClose}>Cancel</Btn>
      </div>
    </>
  )
}
