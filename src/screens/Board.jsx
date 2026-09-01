import { useState, useEffect } from 'react'
import { C, T, F } from '../lib/theme'
import { fmt, hhmm } from '../lib/format'
import { getBoardRows, getMyLeaderboardRow, getWotw } from '../lib/data'
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
  const [tab, setTab] = useState('salus')
  const [rows, setRows] = useState([])
  const [mine, setMine] = useState(null)
  const [wotw, setWotw] = useState([])
  const [ready, setReady] = useState(false)

  useEffect(() => {
    Promise.all([
      getBoardRows('salus').then(setRows).catch(() => {}),
      getMyLeaderboardRow(userId).then(setMine).catch(() => {}),
      getWotw().then(setWotw).catch(() => {}),
    ]).finally(() => setReady(true))
  }, [userId])

  if (!ready) return <div style={page}><SkeletonList rows={8} /></div>

  const w = wotw[0]

  return (
    <div style={page}>
      <h1 style={T.h1}>Leaderboard</h1>

      {/* Two boards, not five. One that takes a block to earn and one
          that resets on Monday — a standing table nobody can move this
          week is not a reason to open the tab twice. */}
      <div style={{ display: 'flex', background: C.card2, borderRadius: 999,
        padding: 4, marginTop: 18 }}>
        {[['salus', 'Salus Test'], ['wotw', 'WOD']].map(([k, l]) => {
          const on = tab === k
          return (
            <button key={k} onClick={() => setTab(k)}
              style={{ flex: 1, border: 'none', borderRadius: 999,
                padding: '11px 0', fontSize: 14, fontWeight: 700,
                cursor: 'pointer', fontFamily: F,
                background: on ? C.ink : 'transparent',
                color: on ? C.bg : C.sub }}>{l}</button>
          )
        })}
      </div>

      {!profile?.share_on_leaderboard && (
        <Card style={{ marginTop: 16, background: C.card2 }}>
          <div style={{ ...T.small }}>
            You're not on either board. Sharing puts your name and your test
            numbers up for everyone else training here.
          </div>
          <Btn tone="soft" style={{ marginTop: 13, padding: '13px 0',
            fontSize: 14.5 }} onClick={onShare}>Join in</Btn>
        </Card>
      )}

      {/* ---------------- the Salus ---------------- */}
      {tab === 'salus' && (
        <>
          <p style={{ ...T.small, margin: '18px 0 4px', lineHeight: 1.55 }}>
            Your placing in each of the five tests, added up. Lowest total
            wins. A test you haven't done counts as last, so finishing them
            all is most of it.
          </p>

          {mine && (
            <Card style={{ marginTop: 14 }}>
              <Label>YOU</Label>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 9,
                marginTop: 7 }}>
                <div style={{ fontSize: 34, fontWeight: 900,
                  letterSpacing: '-.05em', ...T.num }}>{mine.place}</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: C.sub }}>
                  of {mine.field}
                </div>
              </div>
              <div style={{ display: 'grid',
                gridTemplateColumns: 'repeat(5,1fr)', gap: 7, marginTop: 16 }}>
                {[['SQUAT', mine.r_squat], ['5KM', mine.r_fivek],
                  ['SKI', mine.r_ski], ['ROW', mine.r_row],
                  ['HALF', mine.r_half]].map(([l, v]) => (
                  <div key={l} style={{ background: C.card2, borderRadius: 10,
                    padding: '11px 0', textAlign: 'center' }}>
                    <div style={{ fontSize: 17, fontWeight: 800, ...T.num,
                      color: v ? C.ink : C.mute }}>{v || '—'}</div>
                    <div style={{ fontSize: 8.5, fontWeight: 800,
                      letterSpacing: '.1em', color: C.mute,
                      marginTop: 4 }}>{l}</div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <Card style={{ marginTop: 12, padding: '2px 15px' }}>
            {rows.length === 0 && (
              <div style={{ ...T.body, fontSize: 13.5, padding: '18px 0' }}>
                Nobody has finished their testing yet.
              </div>
            )}
            {rows.map((r, i) => (
              <div key={r.user_id} style={{ display: 'flex',
                alignItems: 'center', gap: 13, padding: '13px 0',
                borderTop: i ? `1px solid ${C.line}` : 'none' }}>
                <Medal place={r.place} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14.5, fontWeight: 700,
                    color: r.user_id === userId ? C.g : C.ink }}>
                    {r.user_id === userId ? 'You' : r.name}
                  </div>
                  <div style={{ fontSize: 12, color: C.mute, marginTop: 2 }}>
                    {r.tests_done} of 5 tests
                  </div>
                </div>
                <div style={{ fontSize: 16, fontWeight: 800, ...T.num }}>
                  {r.points}
                </div>
              </div>
            ))}
          </Card>
        </>
      )}

      {/* ---------------- this week ---------------- */}
      {tab === 'wotw' && (
        <>
          {!w ? (
            <Empty icon={I.chart} title="No WOD set this week"
              body="A coach picks one session as the WOD. When they do, everyone's score on it lands here." />
          ) : (
            <>
              <Card style={{ marginTop: 16 }}>
                <Label>THIS WEEK'S WOD</Label>
                <div style={{ ...T.h1, fontSize: 24, marginTop: 7 }}>
                  {w.session_title}
                </div>
                <div style={{ ...T.small, marginTop: 6 }}>
                  {w.metric === 'rounds' ? 'Most rounds wins.'
                    : w.metric === 'weight' ? 'Heaviest wins.'
                    : 'Fastest wins.'} Resets Monday.
                </div>
              </Card>

              <Card style={{ marginTop: 12, padding: '2px 15px' }}>
                {wotw.map((r, i) => (
                  <div key={r.user_id} style={{ display: 'flex',
                    alignItems: 'center', gap: 13, padding: '13px 0',
                    borderTop: i ? `1px solid ${C.line}` : 'none' }}>
                    <Medal place={r.place} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14.5, fontWeight: 700,
                        color: r.mine ? C.g : C.ink }}>
                        {r.mine ? 'You' : r.name}
                      </div>
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 800, ...T.num }}>
                      {r.metric === 'rounds' ? r.reps
                        : r.metric === 'weight' ? `${r.kg}kg`
                        : fmt(r.seconds)}
                    </div>
                  </div>
                ))}
              </Card>
            </>
          )}
        </>
      )}
    </div>
  )
}
