import { useState, useEffect } from 'react'
import { C, T, F } from '../lib/theme'
import { DAYS, daysUntil } from '../lib/format'
import { getMyBlock, getWeekSessions } from '../lib/data'
import { Card, Label, Back, Ico, I, page } from '../components/ui'
import { SkeletonList } from '../components/Skeleton'

const KIND = { strength: 'strength', run: 'running', erg: 'ergs',
               half: 'the half', rest: 'recovery' }

// The whole block, in one screen.
//
// A member could see this week and nothing else, which is why eight
// weeks felt like a series of unrelated Mondays. Laid out end to end
// it becomes a shape: three weeks building, three loading, a peak and
// a taper, with the race at the bottom.
//
// Done weeks show what was actually done rather than what was
// prescribed. A week where someone managed three of five is a week
// they trained three times, and pretending otherwise helps nobody.
export default function Block({ profile, programme, onBack, onOpen }) {
  const [weeks, setWeeks] = useState([])
  const [open, setOpen] = useState(null)
  const [sessions, setSessions] = useState({})
  const [ready, setReady] = useState(false)

  useEffect(() => {
    getMyBlock().then(setWeeks).finally(() => setReady(true))
  }, [])

  async function toggle(w) {
    if (open === w.id) return setOpen(null)
    setOpen(w.id)
    if (!sessions[w.id]) {
      const rows = await getWeekSessions(w.id)
      setSessions(s => ({ ...s, [w.id]: rows }))
    }
  }

  if (!ready) return <div style={page}><SkeletonList rows={6} /></div>

  const days = daysUntil(profile?.race_date)
  const current = weeks.find(w => w.done < w.sessions && w.published)?.idx
    ?? weeks.filter(w => w.published).at(-1)?.idx ?? 1

  const totalDone = weeks.reduce((a, w) => a + Number(w.done), 0)
  const totalSessions = weeks.reduce((a, w) => a + Number(w.sessions), 0)
  const totalHours = Math.round(
    weeks.reduce((a, w) => a + Number(w.minutes), 0) / 60)

  return (
    <div style={page}>
      <Back onClick={onBack} />

      <h1 style={{ ...T.h1, marginTop: 20 }}>
        {weeks[0]?.programme || 'The block'}
      </h1>
      <div style={{ ...T.small, marginTop: 5 }}>
        {weeks.length} weeks
        {days !== null && ` · ${days} days to race day`}
      </div>

      {/* ---- what you've done so far ---- */}
      {totalDone > 0 && (
        <Card style={{ marginTop: 18, display: 'flex', gap: 20 }}>
          <Stat n={totalDone} of={totalSessions} label="SESSIONS" />
          <Stat n={totalHours} label="HOURS" />
          <Stat n={weeks.filter(w => w.done >= w.sessions && w.sessions > 0).length}
            of={weeks.length} label="WEEKS FULL" />
        </Card>
      )}

      {/* ---- the weeks ---- */}
      <div style={{ marginTop: 22 }}>
        {weeks.map((w, i) => {
          const isNow = w.idx === current
          const past = w.idx < current
          const shut = !w.published
          const complete = w.sessions > 0 && w.done >= w.sessions
          const expanded = open === w.id
          const rows = sessions[w.id] || []

          return (
            <div key={w.id}>
              {/* the phase changes, so say so */}
              {w.phase !== weeks[i - 1]?.phase && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10,
                  margin: i ? '22px 0 12px' : '0 0 12px' }}>
                  <Label>{(w.phase || '').toUpperCase()}</Label>
                  <div style={{ flex: 1, height: 1, background: C.line }} />
                </div>
              )}

              <div onClick={() => !shut && toggle(w)}
                style={{ background: isNow ? C.card2 : C.card, borderRadius: 14,
                  border: `1px solid ${isNow ? C.gLine : 'transparent'}`,
                  padding: '14px 15px', marginBottom: 8,
                  cursor: shut ? 'default' : 'pointer',
                  opacity: shut ? .45 : 1 }}>

                <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 999,
                    flexShrink: 0, display: 'grid', placeItems: 'center',
                    background: complete ? C.g : isNow ? C.card3 : 'transparent',
                    border: complete || isNow ? 'none' : `1.5px solid ${C.card3}`,
                    fontSize: 13.5, fontWeight: 800,
                    color: complete ? C.bg : isNow ? C.ink : C.mute }}>
                    {complete ? <Ico d={I.check} s={15} c={C.bg} w={2.8} />
                              : w.idx}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center',
                      gap: 8 }}>
                      <div style={{ fontSize: 15.5, fontWeight: 700,
                        color: shut ? C.mute : C.ink }}>
                        Week {w.idx}
                      </div>
                      {isNow && (
                        <span style={{ fontSize: 9.5, fontWeight: 800,
                          letterSpacing: '.1em', color: C.g }}>NOW</span>
                      )}
                      {w.tests > 0 && (
                        <span style={{ background: shut ? C.card3 : C.g,
                          color: shut ? C.mute : C.bg, borderRadius: 6,
                          padding: '3px 7px', fontSize: 9.5, fontWeight: 800,
                          letterSpacing: '.06em' }}>TEST</span>
                      )}
                    </div>
                    <div style={{ fontSize: 12.5, color: C.sub, marginTop: 3 }}>
                      {shut ? 'Not written yet'
                        : past || isNow
                          ? `${w.done} of ${w.sessions} done`
                          : `${w.sessions} sessions`}
                      {(w.kinds || []).length > 0 && !shut &&
                        ` · ${(w.kinds || []).map(k => KIND[k] || k).join(', ')}`}
                    </div>
                  </div>

                  {!shut && (
                    <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
                      {Array.from({ length: Math.min(w.sessions, 6) }).map((_, j) => (
                        <div key={j} style={{ width: 5, height: 5,
                          borderRadius: 999,
                          background: j < w.done ? C.g : C.card3 }} />
                      ))}
                    </div>
                  )}
                </div>

                {/* ---- the week's sessions ---- */}
                {expanded && rows.length > 0 && (
                  <div style={{ marginTop: 14, paddingTop: 4,
                    borderTop: `1px solid ${C.line}` }}>
                    {rows.map(r => (
                      <div key={r.id}
                        onClick={e => { e.stopPropagation(); onOpen?.(r) }}
                        style={{ display: 'flex', alignItems: 'center', gap: 11,
                          padding: '11px 0', cursor: 'pointer' }}>
                        <div style={{ width: 34, fontSize: 11.5,
                          fontWeight: 700, color: C.mute }}>
                          {DAYS[r.day - 1]}
                          {r.slot === 2 && (
                            <span style={{ fontSize: 9, marginLeft: 3,
                              opacity: .7 }}>pm</span>
                          )}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 14.5, fontWeight: 600,
                            color: r.done ? C.sub : C.ink,
                            textDecoration: r.done ? 'line-through' : 'none',
                            textDecorationColor: C.mute }}>
                            {r.title}
                          </div>
                          {r.focus && (
                            <div style={{ fontSize: 11.5, color: C.mute,
                              marginTop: 2 }}>{r.focus}</div>
                          )}
                        </div>
                        {r.done
                          ? <Ico d={I.check} s={14} c={C.g} w={2.6} />
                          : <div style={{ fontSize: 11.5, color: C.mute }}>
                              {r.est_min ? `${r.est_min}m` : ''}
                            </div>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* ---- and then the race ---- */}
      {days !== null && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 13,
          marginTop: 20, padding: '16px 15px', background: C.card,
          border: `1px solid ${C.gLine}`, borderRadius: 14 }}>
          <div style={{ width: 34, height: 34, borderRadius: 999, flexShrink: 0,
            background: C.g, display: 'grid', placeItems: 'center' }}>
            <Ico d={I.target} s={17} c={C.bg} w={2} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15.5, fontWeight: 700 }}>
              {programme?.race_name || 'Race day'}
            </div>
            <div style={{ fontSize: 12.5, color: C.sub, marginTop: 3 }}>
              {new Date(profile.race_date).toLocaleDateString('en-GB',
                { weekday: 'long', day: 'numeric', month: 'long' })}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 20, fontWeight: 800, ...T.num }}>{days}</div>
            <div style={{ fontSize: 10.5, color: C.mute }}>days</div>
          </div>
        </div>
      )}
    </div>
  )
}

const Stat = ({ n, of, label }) => (
  <div style={{ flex: 1 }}>
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
      <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-.04em',
        ...T.num }}>{n}</div>
      {of != null && (
        <div style={{ fontSize: 13, fontWeight: 600, color: C.mute,
          ...T.num }}>/{of}</div>
      )}
    </div>
    <div style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '.12em',
      color: C.mute, marginTop: 5 }}>{label}</div>
  </div>
)
