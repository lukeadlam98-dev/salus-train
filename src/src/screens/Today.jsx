import { useState, useEffect } from 'react'
import { C, T } from '../lib/theme'
import { DAYS, daysUntil, hhmm } from '../lib/format'
import { getSessions, getNotices, getProgrammes } from '../lib/data'
import { Card, Label, Btn, Tag, Ico, I, Mark, Sheet, page } from '../components/ui'
import Photo from '../components/Photo'
import { P } from '../lib/theme'

export default function Today({ profile, week, half, onOpen }) {
  const [sessions, setSessions] = useState([])
  const [notices, setNotices] = useState([])
  const [programmes, setProgrammes] = useState([])
  const [day, setDay] = useState(new Date().getDay() || 7)
  const [notice, setNotice] = useState(null)

  useEffect(() => {
    if (!week) return
    getSessions(week.id).then(setSessions)
    getNotices().then(setNotices)
    getProgrammes().then(setProgrammes)
  }, [week])

  const days = daysUntil(profile?.race_date)
  const today = sessions.find(s => s.day === day)
  const first = profile?.name ? profile.name.split(' ')[0] : ''

  return (
    <div style={page}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-.035em' }}>
            Morning{first ? `, ${first}` : ''}
          </div>
          <div style={{ fontSize: 13, color: C.sub, marginTop: 2, fontWeight: 600 }}>
            Week {week?.idx ?? 1} of 8 · {week?.programmes?.name ?? 'Road to HYROX'}
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
              <span style={{ width: 5, height: 5, borderRadius: 999,
                background: on ? C.ink : s?.is_test ? C.card3 : 'transparent' }} />
            </button>
          )
        })}
      </div>

      {/* countdown */}
      {days !== null && (
        <Card style={{ marginTop: 16 }}>
          <Label style={{ color: C.g }}>
            {profile.race_date ? 'YOUR RACE' : 'HYROX LONDON EXCEL'}
          </Label>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 9, marginTop: 5 }}>
            <div style={{ fontSize: 44, fontWeight: 900, letterSpacing: '-.05em',
              lineHeight: 1, ...T.num }}>{days}</div>
            <div style={{ fontSize: 15.5, fontWeight: 700, color: C.sub }}>days to go</div>
          </div>
          {profile.race_division && (
            <div style={{ fontSize: 13, color: C.sub, marginTop: 6 }}>
              {profile.race_division}
            </div>
          )}
          <div style={{ display: 'flex', gap: 4, marginTop: 14 }}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} style={{ flex: 1, height: 5, borderRadius: 999,
                background: i < (week?.idx ?? 1) ? C.gLine : C.card3 }} />
            ))}
          </div>
          {half?.projected && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginTop: 14,
              padding: '12px 13px', background: C.card2, borderRadius: 12 }}>
              <div style={{ flex: 1, fontSize: 13, color: C.sub, lineHeight: 1.4 }}>
                Projected finish from your half
              </div>
              <div style={{ fontSize: 19, fontWeight: 800, color: C.g, ...T.num }}>
                {hhmm(half.projected)}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* today's session */}
      {today && (today.cover_url && today.kind !== 'rest' ? (
        <div style={{ marginTop: 11 }}>
          <Photo src={today.cover_url} dim={1.05} radius={18} style={{ minHeight: 258 }}>
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column',
              padding: 16 }}>
              <div style={{ display: 'flex', gap: 7 }}>
                <span style={{ background: 'rgba(0,0,0,.5)', borderRadius: 999,
                  padding: '6px 12px', fontSize: 12, fontWeight: 700 }}>
                  Week {week?.idx ?? 1}
                </span>
                {today.is_test && (
                  <span style={{ borderRadius: 999, padding: '6px 12px', fontSize: 12,
                    fontWeight: 800,
                    background: today.kind === 'half' ? C.g : 'rgba(0,0,0,.5)',
                    color: today.kind === 'half' ? '#0B0A09' : P.ink }}>
                    {today.kind === 'half' ? 'KEY TEST' : 'Test'}
                  </span>
                )}
              </div>
              <div style={{ flex: 1, minHeight: 88 }} />
              <div style={{ fontSize: 13, color: P.sub, fontWeight: 600 }}>
                Salus · {DAYS[today.day - 1]}
              </div>
              <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-.035em',
                marginTop: 2 }}>{today.title}</div>
              <div style={{ fontSize: 14, color: P.sub, marginTop: 3,
                fontWeight: 600 }}>
                {today.tag}{today.est_min ? ` · ${today.est_min} min` : ''}
              </div>
              <button onClick={() => onOpen(today)} style={{ marginTop: 15,
                border: 'none', background: P.ink, color: '#0B0A09', borderRadius: 999,
                padding: '14px 0', fontSize: 15, fontWeight: 700, cursor: 'pointer',
                fontFamily: 'inherit', width: '100%' }}>
                {today.kind === 'half' ? 'Start the half' : 'View session'}
              </button>
            </div>
          </Photo>
        </div>
      ) : (
        <Card style={{ marginTop: 11 }}>
          {today.is_test && (
            <div style={{ marginBottom: 10 }}>
              <Tag tone={today.kind === 'half' ? 'key' : undefined}>
                {today.kind === 'half' ? 'KEY TEST' : 'TEST'}
              </Tag>
            </div>
          )}
          <div style={{ fontSize: 13, color: C.sub, fontWeight: 600 }}>
            Salus · {DAYS[today.day - 1]}
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-.03em',
            marginTop: 3 }}>{today.title}</div>
          <div style={{ ...T.body, fontSize: 14, marginTop: 3 }}>
            {today.tag}{today.est_min ? ` · ${today.est_min} min` : ''}
          </div>
          {today.kind !== 'rest' && (
            <Btn style={{ marginTop: 15 }} onClick={() => onOpen(today)}>
              {today.kind === 'half' ? 'Start the half' : 'View session'}
            </Btn>
          )}
          {today.body && (
            <div style={{ ...T.body, color: C.ink, marginTop: 13,
              whiteSpace: 'pre-line' }}>{today.body}</div>
          )}
        </Card>
      ))}

      {/* notices */}
      {notices.length > 0 && (
        <>
          <Label style={{ margin: '26px 0 11px' }}>WHAT'S ON AT SALUS</Label>
          {notices.map(n => (
            <Card key={n.id} onClick={() => setNotice(n)}
              style={{ marginBottom: 10, padding: '14px 15px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                {n.pinned && <span style={{ width: 5, height: 5, borderRadius: 999,
                  background: C.g }} />}
                <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.12em',
                  color: n.pinned ? C.g : C.mute }}>{n.tag}</span>
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, marginTop: 6,
                letterSpacing: '-.02em', lineHeight: 1.3 }}>{n.title}</div>
              <div style={{ fontSize: 13, color: C.sub, marginTop: 4, lineHeight: 1.45,
                display: '-webkit-box', WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{n.body}</div>
            </Card>
          ))}
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
