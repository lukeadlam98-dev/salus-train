import { useState, useEffect } from 'react'
import { C, T } from '../lib/theme'
import { fmt, hhmm } from '../lib/format'
import { getBoards, getBoardRows } from '../lib/data'
import { Card, Label, Medal, Avatar, Btn, Ico, I, page } from '../components/ui'
import { SkeletonList } from '../components/Skeleton'
import Empty from '../components/Empty'

const show = (v, unit) =>
  v == null ? '—'
  : unit === 'time' ? (v > 3600 ? hhmm(v) : fmt(v))
  : unit === 'kg' ? `${v} kg`
  : String(v)

export default function Board({ profile, onShare }) {
  const [boards, setBoards] = useState([])
  const [sel, setSel] = useState(null)
  const [rows, setRows] = useState([])

  const [ready, setReady] = useState(false)

  useEffect(() => {
    getBoards().then(b => { setBoards(b); if (b.length) setSel(b[0]) })
      .finally(() => setReady(true))
  }, [])
  useEffect(() => { if (sel) getBoardRows(sel).then(setRows) }, [sel?.id])

  if (!ready) return <SkeletonList rows={6} />

  return (
    <div style={page}>
      <h1 style={T.h1}>Leaderboard</h1>

      {boards.length > 1 && (
        <div style={{ display: 'flex', gap: 7, marginTop: 16, overflowX: 'auto',
          paddingBottom: 4 }}>
          {boards.map(b => {
            const on = sel?.id === b.id
            return (
              <button key={b.id} onClick={() => setSel(b)}
                style={{ flex: '0 0 auto', border: 'none', borderRadius: 999,
                  padding: '9px 14px', fontSize: 13, fontWeight: 700,
                  cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
                  background: on ? C.ink : C.card2, color: on ? C.bg : C.sub }}>
                {b.label}
              </button>
            )
          })}
        </div>
      )}

      {sel?.note && (
        <p style={{ ...T.body, marginTop: 14 }}>{sel.note}</p>
      )}

      {!profile?.share_on_leaderboard && (
        <Card style={{ marginTop: 18, background: C.card2 }}>
          <div style={{ ...T.body, fontSize: 13.5 }}>
            You're not on the board. Sharing puts your name and numbers in front of
            everyone else training for December.
          </div>
          <Btn tone="soft" style={{ marginTop: 13, padding: '13px 0', fontSize: 14.5 }}
            onClick={onShare}>Share my numbers</Btn>
        </Card>
      )}

      {rows.length === 0 ? (
        <div style={{ marginTop: 18 }}>
          <Empty icon={I.chart}
            title="Nobody here yet"
            body={profile?.share_on_leaderboard
              ? 'Do the test and you\u2019ll be the first name on it.'
              : 'Be the first. Share your numbers and set the bar for everyone else.'}
            action={profile?.share_on_leaderboard ? null : 'Share my numbers'}
            onAction={onShare} />
        </div>
      ) : (
        <Card style={{ marginTop: 18, padding: '4px 15px' }} className="stagger">
          {rows.map((r, i) => {
            const me = r.name === profile?.name
            return (
              <div key={r.name + i} style={{ display: 'flex', alignItems: 'center',
                gap: 12, padding: '13px 0',
                borderTop: i ? `1px solid ${C.line}` : 'none' }}>
                <Medal rank={i + 1} />
                <Avatar name={r.name} size={30} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15.5, fontWeight: 700,
                    color: me ? C.g : C.ink }}>{r.name}{me ? ' · you' : ''}</div>
                  {r.sub && (
                    <div style={{ fontSize: 12, color: C.mute, marginTop: 1 }}>
                      {r.sub} tests
                    </div>
                  )}
                </div>
                <div style={{ fontSize: 16, fontWeight: 800,
                  fontVariantNumeric: 'tabular-nums' }}>
                  {show(r.v, sel?.unit)}
                </div>
              </div>
            )
          })}
        </Card>
      )}
    </div>
  )
}
