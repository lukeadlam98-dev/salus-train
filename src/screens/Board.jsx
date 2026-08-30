import { useState, useEffect } from 'react'
import { C, T } from '../lib/theme'
import { fmt, hhmm } from '../lib/format'
import { getBoards, getBoardRows, getMyLeaderboardRow } from '../lib/data'
import { Card, Label, Medal, Avatar, Btn, Ico, I, page } from '../components/ui'
import { SkeletonList } from '../components/Skeleton'
import Empty from '../components/Empty'

const TESTS = [
  { key: 'squat', short: 'SQ', name: 'Back squat' },
  { key: 'fivek', short: '5K', name: '5km' },
  { key: 'ski',   short: 'SKI', name: '1k ski' },
  { key: 'row',   short: 'ROW', name: '1k row' },
  { key: 'half',  short: 'HALF', name: 'The Half' },
]

const show = (v, unit) =>
  v == null ? '—'
  : unit === 'points' ? String(v)
  : unit === 'time' ? (v > 3600 ? hhmm(v) : fmt(v))
  : unit === 'kg' ? `${v} kg`
  : String(v)

export default function Board({ profile, userId, onShare }) {
  const [boards, setBoards] = useState([])
  const [sel, setSel] = useState(null)
  const [rows, setRows] = useState([])
  const [mine, setMine] = useState(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    getBoards().then(b => { setBoards(b); if (b.length) setSel(b[0]) })
      .finally(() => setReady(true))
    if (userId) getMyLeaderboardRow(userId).then(setMine).catch(() => {})
  }, [userId])
  useEffect(() => { if (sel) getBoardRows(sel).then(setRows) }, [sel?.id])

  if (!ready) return <SkeletonList rows={6} />

  const isSalus = sel?.source === 'salus'

  return (
    <div style={page}>
      <h1 style={T.h1}>{isSalus ? 'Salus Leaderboard' : 'Leaderboard'}</h1>

      {boards.length > 1 && (
        <div className="nb" style={{ display: 'flex', gap: 7, marginTop: 16,
          overflowX: 'auto', paddingBottom: 4 }}>
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

      {sel?.note && <p style={{ ...T.small, marginTop: 14 }}>{sel.note}</p>}

      {/* ---- your card, on the Salus board ---- */}
      {isSalus && mine && profile?.share_on_leaderboard && (
        <Card style={{ marginTop: 18, border: `1px solid ${C.gLine}` }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            <div>
              <Label style={{ color: C.g }}>YOUR PLACE</Label>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 7,
                marginTop: 6 }}>
                <div style={{ ...T.display, fontSize: 38 }}>{mine.place}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.sub }}>
                  of {mine.field}
                </div>
              </div>
            </div>
            <div style={{ flex: 1 }} />
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 22, fontWeight: 800, ...T.num }}>
                {mine.points}
              </div>
              <div style={{ fontSize: 11, color: C.mute, marginTop: 2 }}>points</div>
            </div>
          </div>

          {/* the five placings, which is where the argument actually is */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)',
            gap: 6, marginTop: 16 }}>
            {TESTS.map(t => {
              const r = mine[`r_${t.key === 'row' ? 'row' : t.key}`]
              const best = r === 1
              return (
                <div key={t.key} style={{ background: C.card2, borderRadius: 10,
                  padding: '10px 6px', textAlign: 'center' }}>
                  <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '.08em',
                    color: C.mute }}>{t.short}</div>
                  <div style={{ fontSize: 17, fontWeight: 800, marginTop: 4,
                    ...T.num, color: best ? C.g : C.ink }}>{r ?? '—'}</div>
                </div>
              )
            })}
          </div>

          <div style={{ ...T.small, fontSize: 12, marginTop: 12 }}>
            {mine.tests_done < 5
              ? `${5 - mine.tests_done} test${5 - mine.tests_done === 1 ? '' : 's'} still to do. Each one you haven't done takes last place.`
              : (() => {
                  const worst = TESTS.reduce((a, t) => {
                    const r = mine[`r_${t.key}`]
                    return r > (mine[`r_${a.key}`] ?? 0) ? t : a
                  }, TESTS[0])
                  return `${worst.name} is your weakest placing. Moving that one moves your total furthest.`
                })()}
          </div>
        </Card>
      )}

      {!profile?.share_on_leaderboard && (
        <Card style={{ marginTop: 18, background: C.card2 }}>
          <div style={{ ...T.small }}>
            You're not on the board. Sharing puts your name and placings in front
            of everyone else training here.
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
              ? 'Do the tests and you\u2019ll be the first name on it.'
              : 'Be the first. Share your numbers and set the bar.'}
            action={profile?.share_on_leaderboard ? null : 'Share my numbers'}
            onAction={onShare} />
        </div>
      ) : (
        <>
          {isSalus && (
            <div style={{ display: 'grid',
              gridTemplateColumns: '30px 30px minmax(0,1fr) repeat(5,26px) 40px',
              gap: 6, padding: '0 15px', margin: '20px 0 6px',
              fontSize: 9, fontWeight: 800, letterSpacing: '.06em',
              color: C.mute }}>
              <div /><div /><div />
              {TESTS.map(t => (
                <div key={t.key} style={{ textAlign: 'center' }}>{t.short}</div>
              ))}
              <div style={{ textAlign: 'right' }}>PTS</div>
            </div>
          )}

          <Card style={{ marginTop: isSalus ? 0 : 18, padding: '4px 15px' }}
            className="stagger">
            {rows.map((r, i) => {
              const me = r.name === profile?.name
              if (!isSalus) return (
                <div key={r.name + i} style={{ display: 'flex', alignItems: 'center',
                  gap: 12, padding: '13px 0',
                  borderTop: i ? `1px solid ${C.line}` : 'none' }}>
                  <Medal rank={i + 1} />
                  <Avatar name={r.name} size={30} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15.5, fontWeight: 700,
                      color: me ? C.g : C.ink }}>{r.name}{me ? ' · you' : ''}</div>
                    {r.sub && <div style={{ fontSize: 12, color: C.mute,
                      marginTop: 1 }}>{r.sub}</div>}
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 800, ...T.num }}>
                    {show(r.v, sel?.unit)}
                  </div>
                </div>
              )

              return (
                <div key={r.name + i} style={{ display: 'grid',
                  gridTemplateColumns: '30px 30px minmax(0,1fr) repeat(5,26px) 40px',
                  gap: 6, alignItems: 'center', padding: '12px 0',
                  borderTop: i ? `1px solid ${C.line}` : 'none' }}>
                  <Medal rank={r.position} size={24} />
                  <Avatar name={r.name} size={26} />
                  <div style={{ minWidth: 0, overflow: 'hidden',
                    textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    fontSize: 14, fontWeight: 700,
                    color: me ? C.g : C.ink }}>{r.name}</div>
                  {(r.ranks || []).map((rank, j) => (
                    <div key={j} style={{ textAlign: 'center', fontSize: 12.5,
                      fontWeight: 700, ...T.num,
                      color: rank === 1 ? C.g : rank <= 3 ? C.ink : C.mute }}>
                      {rank}
                    </div>
                  ))}
                  <div style={{ textAlign: 'right', fontSize: 15, fontWeight: 800,
                    ...T.num }}>{r.v}</div>
                </div>
              )
            })}
          </Card>

          {isSalus && (
            <div style={{ ...T.small, fontSize: 12, marginTop: 14,
              lineHeight: 1.55 }}>
              A placing in each of the five tests, added together. Lowest wins.
              A test you haven't done takes last place, so the board rewards
              being complete as much as being fast.
            </div>
          )}
        </>
      )}
    </div>
  )
}
