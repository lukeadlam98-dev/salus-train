import { useState, useEffect } from 'react'
import { C, T } from '../lib/theme'
import { DAYS, daysUntil } from '../lib/format'
import { getSessions, getWeekOutline, getCompletions, getCoaches,
         getWeekDone } from '../lib/data'
import { Card, Label, Ico, I, page } from '../components/ui'
import Rearrange from './Rearrange'
import SessionCard from '../components/SessionCard'
import { SkeletonToday } from '../components/Skeleton'
import Empty from '../components/Empty'

export default function Today({ profile, week, programme, half, onOpen,
                                onSetRace, onTakeClubRace, onProgress, onCoaches, onPlan,
                                prediction, sections }) {
  const [sessions, setSessions] = useState([])
  const [day, setDay] = useState(new Date().getDay() || 7)
  const [ready, setReady] = useState(false)
  const [moving, setMoving] = useState(false)
  const [outline, setOutline] = useState({})
  const [completions, setCompletions] = useState({})
  const [coaches, setCoaches] = useState([])
  const [done, setDone] = useState(0)

  useEffect(() => {
    if (!week) { setReady(true); return }
    Promise.all([
      getSessions(week.id).then(async list => {
        setSessions(list)
        const ids = list.map(x => x.id)
        const [o, c, d] = await Promise.all([
          getWeekOutline(ids).catch(() => ({})),
          getCompletions(ids).catch(() => ({})),
          profile?.id ? getWeekDone(profile.id, ids).catch(() => 0) : 0,
        ])
        setOutline(o); setCompletions(c); setDone(d)
      }),
      getCoaches().then(setCoaches).catch(() => {}),
    ]).finally(() => setReady(true))
  }, [week])

  if (!ready) return <SkeletonToday />

  const h = new Date().getHours()
  const greeting = h < 12 ? 'Morning' : h < 18 ? 'Afternoon' : 'Evening'

  // Sessions logged in a row, ending today or yesterday. Not a count of
  // days — missing a rest day shouldn't break anything.
  const streak = done

  const days = daysUntil(profile?.race_date)
  const today = sessions.find(s => s.day === day)
  const first = profile?.name ? profile.name.split(' ')[0] : ''

  return (
    <div style={page} className="stagger">

      {/* ---- who, where, and how long ---- */}
      <div style={{ display: 'flex', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <h1 style={{ ...T.h1, fontSize: 24 }}>
            {greeting}, {profile.name?.split(' ')[0]}
          </h1>
          <div style={{ fontSize: 13, color: C.sub, marginTop: 3,
            fontWeight: 600 }}>
            Week {week?.idx ?? 1} of {programme?.total_weeks ?? 8}
            {days !== null && (
              <> · <span style={{ color: C.ink }}>{days} days</span> to{' '}
                {programme?.race_name || 'race day'}</>
            )}
          </div>
        </div>
        {streak > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6,
            background: C.card, border: `1px solid ${C.line}`, borderRadius: 999,
            padding: '7px 12px', flexShrink: 0 }}>
            <Ico d={I.bolt} s={13} c={C.g} w={2} />
            <span style={{ fontSize: 13.5, fontWeight: 800, ...T.num }}>
              {streak}
            </span>
          </div>
        )}
      </div>

      {/* ---- the week ---- */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)',
        marginTop: 20 }}>
        {DAYS.map((d, i) => {
          const on = day === i + 1
          const sess = sessions.find(x => x.day === i + 1)
          return (
            <button key={d} onClick={() => setDay(i + 1)} style={{
              border: 'none', background: 'transparent', cursor: 'pointer',
              display: 'grid', justifyItems: 'center', gap: 5, padding: '5px 0',
              fontFamily: 'inherit',
            }}>
              <span style={{ fontSize: 12.5, fontWeight: on ? 700 : 600,
                color: on ? C.ink : C.mute }}>{d}</span>
              <span style={{
                width: 5, height: 5, borderRadius: 999,
                background: !sess || sess.kind === 'rest' ? 'transparent'
                  : on ? C.ink
                  : sess.kind === 'strength' || sess.kind === 'half' ? C.sub
                  : C.card3,
                border: sess?.kind === 'rest'
                  ? `1px solid ${on ? C.sub : C.card3}` : 'none',
              }} />
            </button>
          )
        })}
      </div>

      {/* ---- the session. The reason the app exists. ---- */}
      {sessions.length === 0 && (
        <div style={{ marginTop: 18 }}>
          <Empty icon={I.cal}
            title="Your week isn't written yet"
            body="The coaches are still putting this block together. It'll be here before Monday." />
        </div>
      )}

      {today && today.kind === 'rest' && (
        <Card style={{ marginTop: 18 }}>
          <Label>{DAYS[today.day - 1].toUpperCase()} · RECOVERY</Label>
          <div style={{ ...T.h1, fontSize: 25, marginTop: 7 }}>{today.title}</div>
          {today.body && (
            <div style={{ ...T.body, color: C.ink, marginTop: 12,
              whiteSpace: 'pre-line' }}>{today.body}</div>
          )}
        </Card>
      )}

      {today && today.kind !== 'rest' && (
        <div style={{ marginTop: 18 }}>
          <SessionCard session={today} blocks={outline[today.id] || []}
            coach={coaches.find(c => c.id === today.coach_id)}
            completions={completions[today.id]}
            onOpen={() => onOpen(today)} />
        </div>
      )}

      {/* ---- everything else, as quiet links ----
          These were four chips taking a full row above the session, which
          put the reason you opened the app below the fold. They are things
          you do occasionally; they belong at the bottom, as text. */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center',
        gap: 4, marginTop: 26 }}>
        {[['The block', onPlan],
          ['Move my week', sessions.length ? () => setMoving(true) : null],
          ['Progress', onProgress],
          ['Ask a coach', onCoaches]].map(([label, fn], i, all) => (
          <span key={label} style={{ display: 'flex', alignItems: 'center' }}>
            <button onClick={fn || undefined} disabled={!fn}
              style={{ background: 'transparent', border: 'none',
                color: fn ? C.sub : C.mute, fontSize: 12.5, fontWeight: 600,
                cursor: fn ? 'pointer' : 'default', fontFamily: 'inherit',
                padding: '6px 8px' }}>{label}</button>
            {i < all.length - 1 && (
              <span style={{ color: C.line, fontSize: 11 }}>·</span>
            )}
          </span>
        ))}
      </div>

      {moving && week && (
        <Rearrange weekId={week.id} sessions={sessions}
          onClose={() => setMoving(false)}
          onSaved={() => {
            setMoving(false)
            getSessions(week.id).then(setSessions)
          }} />
      )}

    </div>
  )
}

const Chip = ({ icon, label, onClick, disabled }) => (
  <button onClick={disabled ? undefined : onClick} disabled={disabled}
    style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center', gap: 7,
      background: C.card, border: `1px solid ${C.line}`, borderRadius: 999,
      padding: '10px 14px', fontSize: 13, fontWeight: 600,
      color: disabled ? C.mute : C.ink, opacity: disabled ? .5 : 1,
      cursor: disabled ? 'default' : 'pointer', fontFamily: 'inherit',
      whiteSpace: 'nowrap' }}>
    <Ico d={icon} s={15} c={disabled ? C.mute : C.sub} w={1.9} />
    {label}
  </button>
)
