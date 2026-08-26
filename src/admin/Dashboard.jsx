import { useState, useEffect } from 'react'
import { C, T, F } from '../lib/theme'
import { fmt, hhmm, DAYS, daysUntil } from '../lib/format'
import { LEGS } from '../lib/half'
import * as api from './api'
import { Btn } from './widgets'
import { Bars, Columns, Ring } from './charts'

// Deliberately short. The temptation with a coach dashboard is to put
// everything on it — Trainerize did, and their own users describe it as
// messy and hard to find the important thing in. So: three numbers, two
// charts, and a list of what actually needs doing. Everything else has
// its own page.
export default function Dashboard({ programme, onGo }) {
  const [members, setMembers] = useState([])
  const [weeks, setWeeks] = useState([])
  const [activity, setActivity] = useState([])
  const [work, setWork] = useState([])
  const [stations, setStations] = useState([])
  const [volume, setVolume] = useState([])

  useEffect(() => {
    api.listMembers().then(setMembers).catch(() => {})
    api.getRecentActivity(6).then(setActivity).catch(() => {})
    api.getStationAverages().then(setStations).catch(() => {})
    api.getWeeklyVolume(8).then(setVolume).catch(() => {})
  }, [])
  useEffect(() => {
    if (!programme) return
    api.listWeeks(programme.id).then(setWeeks).catch(() => {})
    api.getNeedsWork(programme.id).then(setWork).catch(() => {})
  }, [programme?.id])

  const people = members.filter(m => m.role !== 'admin')
  const tested = people.filter(m => m.tests_done >= 5).length
  const withHalf = people.filter(m => m.projected_s)
  const avg = withHalf.length
    ? Math.round(withHalf.reduce((a, b) => a + b.projected_s, 0) / withHalf.length)
    : null
  const active = people.filter(m => m.last_trained &&
    (Date.now() - new Date(m.last_trained)) < 7 * 86400000).length
  const days = daysUntil(people.map(m => m.race_date).filter(Boolean).sort()[0])

  // ---- stations, worst first ----
  const stationRows = (() => {
    if (stations.length < 2) return []
    const mean = stations.reduce((a, b) => a + b.avg_s, 0) / stations.length
    return stations
      .map(s => ({
        label: LEGS.find(l => l.key === s.leg_key)?.name || s.leg_key,
        v: s.avg_s,
        flag: s.avg_s > mean,
      }))
      .sort((a, b) => b.v - a.v)
  })()

  // ---- what needs doing, ranked, capped at three ----
  const todo = []
  const empty = work.filter(s => s.blocks === 0 && s.published)
  if (empty.length) todo.push({ urgent: true,
    text: `${empty.length} live session${empty.length === 1 ? '' : 's'} with no blocks`,
    why: 'These open to a blank screen.',
    go: () => onGo('week', empty[0].week_idx) })

  const untested = people.filter(m => (m.tests_done || 0) < 5)
  if (untested.length) todo.push({
    text: `${untested.length} still testing`,
    why: 'Their loads are guesses until they finish.',
    go: () => onGo('members') })

  const quiet = people.filter(m => !m.last_trained ||
    (Date.now() - new Date(m.last_trained)) > 7 * 86400000)
  if (quiet.length) todo.push({
    text: `${quiet.length} quiet for a week`,
    why: quiet.slice(0, 3).map(m => m.name || 'unnamed').join(', '),
    go: () => onGo('members') })

  const drafts = weeks.filter(w => !w.published)
  if (drafts.length) todo.push({
    text: `${drafts.length} week${drafts.length === 1 ? '' : 's'} in draft`,
    why: 'Nobody can see these yet.',
    go: () => onGo('week', drafts[0].idx) })

  const top = todo.slice(0, 3)

  return (
    <div style={{ maxWidth: 1040 }}>
      {/* ---- header ---- */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 20,
        marginBottom: 26 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.13em',
            color: C.mute }}>{(programme?.name || 'SALUS TRAIN').toUpperCase()}</div>
          <h1 style={{ ...T.h1, marginTop: 6 }}>
            {new Date().getHours() < 12 ? 'Morning'
              : new Date().getHours() < 18 ? 'Afternoon' : 'Evening'}
          </h1>
        </div>
        {days != null && (
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 30, fontWeight: 900, letterSpacing: '-.045em',
              fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{days}</div>
            <div style={{ fontSize: 11.5, color: C.sub, marginTop: 3 }}>
              days to the first race
            </div>
          </div>
        )}
      </div>

      {/* ---- three numbers, not five ---- */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)',
        gap: 12, marginBottom: 18 }}>
        <RingStat value={active} total={people.length} label="Trained this week"
          sub={`${people.length - active} haven't`} />
        <RingStat value={tested} total={people.length} label="Fully tested"
          sub={`${people.length - tested} to go`} />
        <Panel>
          <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-.04em',
            fontVariantNumeric: 'tabular-nums' }}>{avg ? hhmm(avg) : '—'}</div>
          <div style={{ fontSize: 12, color: C.sub, marginTop: 5,
            fontWeight: 600 }}>Average projection</div>
          <div style={{ fontSize: 11.5, color: C.mute, marginTop: 2 }}>
            from {withHalf.length} half{withHalf.length === 1 ? '' : 's'}
          </div>
        </Panel>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.3fr) minmax(0,1fr)',
        gap: 18, alignItems: 'start' }}>

        <div>
          {/* ---- the chart that changes what you programme ---- */}
          {stationRows.length > 0 && (
            <Panel style={{ marginBottom: 18 }}>
              <Head>Stations, slowest first</Head>
              <div style={{ ...T.body, fontSize: 12.5, marginBottom: 14 }}>
                Averaged across everyone who has run a half. The lit bars are
                above the group's own average.
              </div>
              <Bars rows={stationRows} format={fmt} />
            </Panel>
          )}

          {/* ---- engagement over time ---- */}
          {volume.length > 0 && (
            <Panel>
              <Head>Sessions logged</Head>
              <div style={{ ...T.body, fontSize: 12.5, marginBottom: 16 }}>
                Across the club, by week. The shape matters more than the numbers.
              </div>
              <Columns
                rows={volume.map((v, i) => ({
                  label: i === volume.length - 1 ? 'now' : `-${volume.length - 1 - i}`,
                  v, flag: i === volume.length - 1,
                }))} />
            </Panel>
          )}
        </div>

        <div>
          {/* ---- what needs doing ---- */}
          <Panel style={{ marginBottom: 18, padding: '4px 15px' }}>
            <div style={{ padding: '12px 0 4px' }}>
              <Head style={{ marginBottom: 0 }}>Needs you</Head>
            </div>
            {top.length === 0 ? (
              <div style={{ ...T.body, fontSize: 13, padding: '4px 0 14px' }}>
                Nothing outstanding.
              </div>
            ) : top.map((t, i) => (
              <div key={i} onClick={t.go} style={{ display: 'flex',
                alignItems: 'flex-start', gap: 10, padding: '13px 0',
                cursor: 'pointer', borderTop: `1px solid ${C.line}` }}>
                <div style={{ width: 6, height: 6, borderRadius: 999, marginTop: 5,
                  flexShrink: 0, background: t.urgent ? C.red : C.g }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700 }}>{t.text}</div>
                  <div style={{ fontSize: 11.5, color: C.mute, marginTop: 3,
                    lineHeight: 1.45 }}>{t.why}</div>
                </div>
                <span style={{ color: C.mute, fontSize: 14 }}>›</span>
              </div>
            ))}
            {todo.length > 3 && (
              <div style={{ fontSize: 11.5, color: C.mute, padding: '10px 0 14px',
                borderTop: `1px solid ${C.line}` }}>
                and {todo.length - 3} more, less pressing
              </div>
            )}
          </Panel>

          {/* ---- lately ---- */}
          <Panel style={{ padding: '4px 15px' }}>
            <div style={{ padding: '12px 0 4px' }}>
              <Head style={{ marginBottom: 0 }}>Lately</Head>
            </div>
            {activity.length === 0 && (
              <div style={{ ...T.body, fontSize: 13, padding: '4px 0 14px' }}>
                Nothing logged yet.
              </div>
            )}
            {activity.map(a => (
              <div key={a.id} style={{ display: 'flex', alignItems: 'center',
                gap: 10, padding: '11px 0', borderTop: `1px solid ${C.line}` }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, overflow: 'hidden',
                    textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {a.name || 'Someone'}
                  </div>
                  <div style={{ fontSize: 11.5, color: C.mute, marginTop: 2,
                    overflow: 'hidden', textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap' }}>{a.session_title || 'A session'}</div>
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, flexShrink: 0,
                  fontVariantNumeric: 'tabular-nums',
                  color: a.ended_at ? C.ink : C.mute }}>
                  {a.elapsed_s ? fmt(a.elapsed_s) : '—'}
                </div>
              </div>
            ))}
          </Panel>
        </div>
      </div>
    </div>
  )
}

const Head = ({ children, style }) => (
  <div style={{ fontSize: 14.5, fontWeight: 800, letterSpacing: '-.02em',
    marginBottom: 5, ...style }}>{children}</div>
)

const Panel = ({ children, style }) => (
  <div style={{ background: C.card, border: `1px solid ${C.line}`,
    borderRadius: 13, padding: 16, boxShadow: C.shadow, ...style }}>{children}</div>
)

const RingStat = ({ value, total, label, sub }) => (
  <Panel style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
    <Ring value={value} total={total} label={value} />
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: 12.5, fontWeight: 700 }}>{label}</div>
      <div style={{ fontSize: 11.5, color: C.mute, marginTop: 3 }}>{sub}</div>
    </div>
  </Panel>
)
