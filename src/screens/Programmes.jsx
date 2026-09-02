import { useState, useEffect } from 'react'
import { C, T, F } from '../lib/theme'
import { getProgrammes, joinProgramme } from '../lib/data'
import { Card, Label, Back, Ico, I, Sheet, Btn, page } from '../components/ui'
import Img from '../components/Img'

// What else there is to do.
//
// One block is the answer for most members most of the time, but
// somebody finishing in December wants to know what January looks
// like, and somebody who is not racing at all shouldn't be looking at
// a HYROX countdown for eight weeks.
//
// Switching resets the week. Week five of one block has nothing to do
// with week five of another, and carrying it across would drop
// somebody into the middle of something they hadn't built up to.
export default function Programmes({ userId, profile, onBack, onJoined }) {
  const [rows, setRows] = useState([])
  const [ready, setReady] = useState(false)
  const [ask, setAsk] = useState(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    getProgrammes().then(setRows).finally(() => setReady(true))
  }, [])

  const mine = profile?.programme_id

  return (
    <div style={page}>
      <Back onClick={onBack} />
      <h1 style={{ ...T.h1, marginTop: 20 }}>Blocks</h1>
      <p style={{ ...T.body, marginTop: 6 }}>
        What the coaches are running. You can only be on one at a time.
      </p>

      {!ready && <p style={{ ...T.body, marginTop: 20 }}>Loading…</p>}

      <div style={{ marginTop: 20 }}>
        {rows.map(p => {
          const on = p.id === mine
          return (
            <div key={p.id} style={{ background: C.card, borderRadius: 18,
              overflow: 'hidden', marginBottom: 12,
              border: `1px solid ${on ? C.gLine : 'transparent'}` }}>

              {p.race_image && (
                <div style={{ position: 'relative', height: 116 }}>
                  <Img src={p.race_image}
                    style={{ position: 'absolute', inset: 0 }} />
                  <div style={{ position: 'absolute', inset: 0,
                    background: 'linear-gradient(180deg,rgba(9,9,8,.15),' +
                                'rgba(9,9,8,.88) 82%)' }} />
                </div>
              )}

              <div style={{ padding: '15px 16px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                  <div style={{ ...T.h2, fontSize: 19 }}>{p.name}</div>
                  {on && (
                    <span style={{ fontSize: 9.5, fontWeight: 800,
                      letterSpacing: '.1em', color: C.g }}>YOU'RE ON THIS</span>
                  )}
                </div>

                {p.blurb && (
                  <div style={{ ...T.small, marginTop: 7, lineHeight: 1.55 }}>
                    {p.blurb}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 7, marginTop: 12,
                  flexWrap: 'wrap' }}>
                  <Tag>{p.weeks} weeks</Tag>
                  {p.sessions_per_week && (
                    <Tag>{p.sessions_per_week} a week</Tag>
                  )}
                  {p.race_name && <Tag>{p.race_name}</Tag>}
                </div>

                {!on && (
                  <button onClick={() => setAsk(p)} style={{ width: '100%',
                    marginTop: 15, background: C.card2,
                    border: `1px solid ${C.line}`, borderRadius: 999,
                    padding: '13px 0', fontSize: 14.5, fontWeight: 700,
                    color: C.ink, cursor: 'pointer', fontFamily: F }}>
                    Switch to this
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {ask && (
        <Sheet onClose={() => setAsk(null)}>
          <div style={{ ...T.h2 }}>Switch to {ask.name}?</div>
          <p style={{ ...T.body, marginTop: 10, lineHeight: 1.6 }}>
            You'll start at week one. Everything you've logged stays where
            it is — your tests, your races and your numbers all carry over.
            It's the weeks that reset, because week five of one block isn't
            week five of another.
          </p>
          <Btn style={{ marginTop: 22 }} disabled={busy}
            onClick={async () => {
              setBusy(true)
              try {
                await joinProgramme(userId, ask.id)
                setAsk(null)
                onJoined?.()
              } catch (_) { setBusy(false) }
            }}>{busy ? 'Switching…' : `Start ${ask.name}`}</Btn>
          <button onClick={() => setAsk(null)} style={{ width: '100%',
            background: 'transparent', border: 'none', color: C.sub,
            fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: F,
            padding: '15px 0 0' }}>Stay where I am</button>
        </Sheet>
      )}
    </div>
  )
}

const Tag = ({ children }) => (
  <span style={{ background: C.card2, borderRadius: 7, padding: '5px 10px',
    fontSize: 11.5, fontWeight: 600, color: C.sub }}>{children}</span>
)
