import { useState, useEffect } from 'react'
import { C, T } from '../lib/theme'
import { DAYS, daysUntil, hhmm } from '../lib/format'
import { getSessions, getNotices, getProgrammes, getWeekOutline,
         getCompletions, getCoaches, getWeekDone } from '../lib/data'
import { Card, Label, Btn, Tag, Ico, I, Mark, Sheet, page } from '../components/ui'
import Rearrange from './Rearrange'
import SessionCard from '../components/SessionCard'
import Insights from '../components/Insights'
import { SkeletonToday } from '../components/Skeleton'
import Empty from '../components/Empty'
import Photo from '../components/Photo'
import { P } from '../lib/theme'

export default function Today({ profile, week, programme, half, onOpen,
                                onSetRace, onTakeClubRace, onProgress, onCoaches, onPlan,
                                prediction, sections }) {
  const [sessions, setSessions] = useState([])
  const [notices, setNotices] = useState([])
  const [programmes, setProgrammes] = useState([])
  const [day, setDay] = useState(new Date().getDay() || 7)
  const [notice, setNotice] = useState(null)
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
      getNotices().then(setNotices),
      getProgrammes().then(setProgrammes),
      getCoaches().then(setCoaches).catch(() => {}),
    ]).finally(() => setReady(true))
  }, [week])

  if (!ready) return <SkeletonToday />

  const days = daysUntil(profile?.race_date)
  const today = sessions.find(s => s.day === day)
  const first = profile?.name ? profile.name.split(' ')[0] : ''

  return (
    <div style={page} className="stagger">
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-.035em' }}>
            Morning{first ? `, ${first}` : ''}
          </div>
          <div style={{ fontSize: 13, color: C.sub, marginTop: 2, fontWeight: 600 }}>
            Week {week?.idx ?? 1} of {programme?.total_weeks ?? 8} ·{' '}
            {programme?.name ?? week?.programmes?.name ?? 'Your programme'}
          </div>
        </div>
        <div style={{ flex: 1 }} />
        <Mark s={30} />
      </div>

      {/* day strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', marginTop: 20 }}>
        {DAYS.map((d, i) => {
          const on = day === i + 1
          const s = sessions.find(x => x.day === i + 1)
          return (
            <button key={d} onClick={() => setDay(i + 1)} style={{
              border: 'none', background: 'transparent', cursor: 'pointer',
              display: 'grid', justifyItems: 'center', gap: 5, padding: '5px 0',
              fontFamily: 'inherit',
            }}>
              <span style={{ fontSize: 12.5, fontWeight: on ? 700 : 600,
                color: on ? C.ink : C.mute }}>{d}</span>
              {/* A mark per day, saying what kind of session it is.
                  Filled for the hard days, outlined for recovery, nothing
                  for a day with nothing on it. Runna uses colour here;
                  without hue, fill carries it. */}
              <span style={{
                width: 5, height: 5, borderRadius: 999,
                background: !s ? 'transparent'
                  : s.kind === 'rest' ? 'transparent'
                  : on ? C.ink
                  : s.kind === 'strength' || s.kind === 'half' ? C.sub
                  : C.card3,
                border: s?.kind === 'rest'
                  ? `1px solid ${on ? C.sub : C.card3}` : 'none',
              }} />
            </button>
          )
        })}
      </div>

      {/* things you do to the week, rather than in it */}
      <div className="nb" style={{ display: 'flex', gap: 8, marginTop: 16,
        overflowX: 'auto', paddingBottom: 2, marginLeft: -16, marginRight: -16,
        paddingLeft: 16, paddingRight: 16 }}>
        <Chip icon={I.cal} label="The block" onClick={onPlan} />
        <Chip icon={I.swap} label="Move my week"
          onClick={() => setMoving(true)} disabled={sessions.length === 0} />
        <Chip icon={I.chart} label="Progress" onClick={onProgress} />
        <Chip icon={I.msg} label="Ask a coach" onClick={onCoaches} />
      </div>

      {/* countdown */}
      <div style={{ marginTop: 16 }}>
        <Insights days={days} half={half} programme={programme}
          prediction={prediction} week={week?.idx} sessions={sessions}
          done={done} onSetRace={onSetRace} onOpenRace={onPlan}
          onTakeClubRace={onTakeClubRace}
          raceDate={profile.race_date
            ? new Date(profile.race_date).toLocaleDateString('en-GB',
                { day: 'numeric', month: 'short' })
            : null} />
      </div>

      {/* today's session — the whole shape of it, not just a title */}
      {sessions.length === 0 && (
        <div style={{ marginTop: 11 }}>
          <Empty icon={I.cal}
            title="Your week isn't written yet"
            body="The coaches are still putting this block together. It'll be here before Monday." />
        </div>
      )}

      {today && today.kind === 'rest' && (
        <Card style={{ marginTop: 11 }}>
          <div style={{ fontSize: 12.5, color: C.sub, fontWeight: 600 }}>
            Salus · {DAYS[today.day - 1]}
          </div>
          <div style={{ ...T.h1, fontSize: 25, marginTop: 6 }}>{today.title}</div>
          {today.body && (
            <div style={{ ...T.body, color: C.ink, marginTop: 12,
              whiteSpace: 'pre-line' }}>{today.body}</div>
          )}
        </Card>
      )}

      {today && today.kind !== 'rest' && (
        <div style={{ marginTop: 11 }}>
          <SessionCard session={today} blocks={outline[today.id] || []}
            coach={coaches.find(c => c.id === today.coach_id)}
            completions={completions[today.id]}
            onOpen={() => onOpen(today)} />
        </div>
      )}

      {/* notices — a board, not a feed */}
      {notices.length > 0 && (
        <>
          <Label style={{ margin: '26px 0 12px' }}>
            {sections?.notices?.heading || "WHAT'S ON AT SALUS"}
          </Label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
            {notices.map(n => (
              <div key={n.id} onClick={() => setNotice(n)}
                style={{
                  position: 'relative',
                  background: C.card,
                  border: `1px solid ${n.pinned ? C.gLine : 'transparent'}`,
                  borderRadius: 14,
                  padding: '17px 15px 15px',
                  cursor: 'pointer',
                  boxShadow: C.shadow,
                }}>
                {/* the pin, so a pinned notice reads as pinned rather
                    than just being first */}
                {n.pinned && (
                  <div style={{ position: 'absolute', top: -8, right: 14,
                    width: 22, height: 22, borderRadius: 999, background: C.g,
                    display: 'grid', placeItems: 'center' }}>
                    <Ico d={I.pin} s={11} c={C.bg} w={2.2} />
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 9,
                  paddingRight: n.pinned ? 26 : 0 }}>
                  <span style={{ fontSize: 9.5, fontWeight: 800,
                    letterSpacing: '.13em',
                    color: n.pinned ? C.g : C.mute }}>{n.tag}</span>
                  <div style={{ flex: 1 }} />
                  <span style={{ fontSize: 10.5, color: C.mute }}>
                    {new Date(n.published_at).toLocaleDateString('en-GB',
                      { day: 'numeric', month: 'short' })}
                  </span>
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, marginTop: 7,
                  letterSpacing: '-.02em', lineHeight: 1.3 }}>{n.title}</div>
                {n.body && (
                  <div style={{ ...T.small, marginTop: 5,
                    display: '-webkit-box', WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {n.body}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* programmes */}
      {programmes.length > 0 && (
        <>
          <Label style={{ margin: '22px 0 11px' }}>PROGRAMMES</Label>
          {programmes.map(p => (
            <div key={p.id} style={{ marginBottom: 10, opacity: p.live ? 1 : .72 }}>
              <Photo src={p.cover_url} dim={p.live ? 1 : 1.3} radius={18}
                style={{ minHeight: 140 }}>
                <div style={{ height: '100%', display: 'flex', flexDirection: 'column',
                  padding: 15 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                    <span style={{ borderRadius: 999, padding: '5px 11px', fontSize: 10.5,
                      fontWeight: 800, letterSpacing: '.04em',
                      background: p.live ? C.g : 'rgba(0,0,0,.55)',
                      color: p.live ? '#0B0A09' : P.sub }}>
                      {p.live ? 'YOUR PROGRAMME' : 'COMING SOON'}
                    </span>
                    <div style={{ flex: 1 }} />
                    {!p.live && (
                      <div style={{ width: 25, height: 25, borderRadius: 999,
                        background: 'rgba(0,0,0,.5)', display: 'grid',
                        placeItems: 'center' }}>
                        <Ico d={I.lock} s={11} c={P.sub} w={2} />
                      </div>
                    )}
                  </div>
                  <div style={{ flex: 1, minHeight: 28 }} />
                  <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '.14em',
                    color: P.sub }}>{p.weeks} WEEKS</div>
                  <div style={{ fontSize: 19, fontWeight: 800, letterSpacing: '-.03em',
                    marginTop: 3 }}>{p.name}</div>
                  <div style={{ fontSize: 13, color: P.sub, marginTop: 3,
                    lineHeight: 1.4 }}>{p.blurb}</div>
                </div>
              </Photo>
            </div>
          ))}
        </>
      )}

      {moving && week && (
        <Rearrange weekId={week.id} sessions={sessions}
          onClose={() => setMoving(false)}
          onSaved={() => {
            setMoving(false)
            getSessions(week.id).then(setSessions)
          }} />
      )}

      {notice && (
        <Sheet onClose={() => setNotice(null)}>
          <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '.12em',
            color: notice.pinned ? C.g : C.mute }}>{notice.tag}</div>
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-.03em',
            marginTop: 9, lineHeight: 1.2 }}>{notice.title}</div>
          <div style={{ ...T.body, fontSize: 15, marginTop: 11 }}>{notice.body}</div>
          <Btn tone="soft" style={{ marginTop: 20 }}
            onClick={() => setNotice(null)}>Close</Btn>
        </Sheet>
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
