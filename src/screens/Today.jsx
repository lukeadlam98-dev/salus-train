import { useState, useEffect } from 'react'
import { C, T } from '../lib/theme'
import { DAYS, daysUntil } from '../lib/format'
import { getSessions, getWeekOutline, getCompletions, getCoaches,
         getWeekDone, getRunningWeek } from '../lib/data'
import { Card, Label, Ico, I, page } from '../components/ui'
import Rearrange from './Rearrange'
import SessionCard from '../components/SessionCard'
import Insights from '../components/Insights'
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
  const [running, setRunning] = useState([])

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
      getRunningWeek().then(setRunning).catch(() => {}),
    ]).finally(() => setReady(true))
    // Keyed on the id, not the object. App re-renders on every profile
    // patch, and depending on `week` itself meant a fresh object could
    // refire all four queries — skeleton, then content, again.
  }, [week?.id, profile?.id])

  if (!ready) return <SkeletonToday />

  const h = new Date().getHours()
  const greeting = h < 12 ? 'Morning' : h < 18 ? 'Afternoon' : 'Evening'

  // Sessions logged in a row, ending today or yesterday. Not a count of
  // days — missing a rest day shouldn't break anything.
  const streak = done

  const days = daysUntil(profile?.race_date)
  // A day can hold a morning and an evening session. Ordered by slot,
  // so the hard one always comes first.
  const todays = sessions
    .filter(s => s.day === day)
    .sort((a, b) => (a.slot || 1) - (b.slot || 1))
  const first = profile?.name ? profile.name.split(' ')[0] : ''

  return (
    <div style={page} className="stagger">

      {/* ---- header ---- */}
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <div style={{ flex: 1 }}>
          <h1 style={{ ...T.h1 }}>
            {greeting}, {profile.name?.split(' ')[0]}
          </h1>
        </div>
        {streak > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 7,
            background: C.card, border: `1px solid ${C.line}`, borderRadius: 999,
            padding: '8px 12px', flexShrink: 0 }}>
            <Ico d={I.bolt} s={13} c={C.g} w={2} />
            <span style={{ fontSize: 14, fontWeight: 800, ...T.num }}>
              {streak}
            </span>
          </div>
        )}
      </div>

      {/* ---- the week, with dates ---- */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)',
        marginTop: 22 }}>
        {DAYS.map((d, i) => {
          const on = day === i + 1
          const sess = sessions.find(x => x.day === i + 1 && (x.slot || 1) === 1)
          const date = new Date()
          date.setDate(date.getDate() - ((date.getDay() || 7) - 1) + i)
          return (
            <button key={d} onClick={() => setDay(i + 1)} style={{
              border: 'none', background: 'transparent', cursor: 'pointer',
              display: 'grid', justifyItems: 'center', gap: 6, padding: '4px 0',
              fontFamily: 'inherit',
            }}>
              <span style={{ fontSize: 12.5, fontWeight: on ? 700 : 500,
                color: on ? C.ink : C.mute }}>{d}</span>
              <span style={{ fontSize: 15, fontWeight: on ? 800 : 600,
                color: on ? C.ink : C.mute, ...T.num }}>{date.getDate()}</span>
              <span style={{
                width: 5, height: 5, borderRadius: 999, marginTop: 1,
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

      {/* ---- what you can do to the week ---- */}
      <div className="nb" style={{ display: 'flex', gap: 9, marginTop: 20,
        overflowX: 'auto', paddingBottom: 3,
        marginLeft: -16, marginRight: -16, paddingLeft: 16, paddingRight: 16 }}>
        <Chip icon={I.cal}   label="The block"    onClick={onPlan} />
        <Chip icon={I.swap}  label="Move my week"
          onClick={() => setMoving(true)} disabled={sessions.length === 0} />
        <Chip icon={I.chart} label="Progress"     onClick={onProgress} />
        <Chip icon={I.msg}   label="Ask a coach"  onClick={onCoaches} />
      </div>

      {/* ---- the race ---- */}
      <div style={{ marginTop: 18 }}>
        <Insights days={days} half={half} programme={programme}
          prediction={prediction} week={week?.idx} sessions={sessions}
          done={done} onSetRace={onSetRace} onOpenRace={onPlan}
          onTakeClubRace={onTakeClubRace}
          raceDate={profile.race_date
            ? new Date(profile.race_date).toLocaleDateString('en-GB',
                { day: 'numeric', month: 'short', year: 'numeric' })
            : null} />
      </div>

      {/* ---- the session ---- */}
      {sessions.length === 0 && (
        <div style={{ marginTop: 14 }}>
          <Empty icon={I.cal}
            title="Your week isn't written yet"
            body="The coaches are still putting this block together. It'll be here before Monday." />
        </div>
      )}

      {todays.length === 1 && todays[0].kind === 'rest' && (
        <Card style={{ marginTop: 14 }}>
          <Label>{DAYS[todays[0].day - 1].toUpperCase()} · RECOVERY</Label>
          <div style={{ ...T.h1, marginTop: 8 }}>{todays[0].title}</div>
          {todays[0].body && (
            <div style={{ ...T.body, color: C.ink, marginTop: 13,
              whiteSpace: 'pre-line' }}>{todays[0].body}</div>
          )}
        </Card>
      )}

      {/* A day can have two sessions — a hard one in the morning and
          something easy in the evening. They're separate cards on
          purpose: the second only works if it stays easy, and burying
          it inside the first hides whether it did. */}
      {todays.filter(t => t.kind !== 'rest').map((t, i) => (
        <div key={t.id} style={{ marginTop: i ? 11 : 14 }}>
          <SessionCard session={t} blocks={outline[t.id] || []}
            coach={coaches.find(c => c.id === t.coach_id)}
            completions={completions[t.id]}
            onOpen={() => onOpen(t)} />
        </div>
      ))}

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
    style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center', gap: 9,
      background: C.card, border: `1px solid ${C.line}`, borderRadius: 999,
      padding: '11px 16px', fontSize: 13.5, fontWeight: 600,
      color: disabled ? C.mute : C.ink, opacity: disabled ? .5 : 1,
      cursor: disabled ? 'default' : 'pointer', fontFamily: 'inherit',
      whiteSpace: 'nowrap' }}>
    <Ico d={icon} s={15} c={disabled ? C.mute : C.sub} w={1.9} />
    {label}
  </button>
)
