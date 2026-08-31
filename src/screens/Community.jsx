import { useState, useEffect } from 'react'
import { C, T, F } from '../lib/theme'
import { fmt } from '../lib/format'
import { getFeed, getClubWeek, getNotices, getCoaches, getPosts,
         toggleKudos } from '../lib/data'
import { Card, Label, Btn, Avatar, Sheet, Ico, I, page } from '../components/ui'
import { SkeletonList } from '../components/Skeleton'
import Empty from '../components/Empty'

const ago = d => {
  if (!d) return ''
  const mins = Math.floor((Date.now() - new Date(d)) / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return days === 1 ? 'yesterday' : `${days}d ago`
}

// The room, digitally.
//
// Training alone at six in the morning is the problem this solves:
// nothing here is a weight or a time, only that somebody else was
// in doing the same work. That's the thing a printed plan can't do.
export default function Community({ profile, userId, onCoach, onShare }) {
  const [feed, setFeed] = useState([])
  const [week, setWeek] = useState(null)
  const [notices, setNotices] = useState([])
  const [coaches, setCoaches] = useState([])
  const [notice, setNotice] = useState(null)
  const [posts, setPosts] = useState([])
  const [ready, setReady] = useState(false)

  useEffect(() => {
    Promise.all([
      getFeed().then(setFeed).catch(() => {}),
      getClubWeek().then(setWeek).catch(() => {}),
      getNotices().then(setNotices).catch(() => {}),
      getCoaches().then(setCoaches).catch(() => {}),
      getPosts().then(setPosts).catch(() => {}),
    ]).finally(() => setReady(true))
  }, [])

  // Optimistic. A kudos that waits for a round trip before it fills
  // feels broken, and the failure case is trivial.
  async function kudos(p) {
    const on = !p.mine
    setPosts(ps => ps.map(x => x.id === p.id
      ? { ...x, mine: on, kudos: Number(x.kudos) + (on ? 1 : -1) } : x))
    try { await toggleKudos(p.id, userId, on) }
    catch { getPosts().then(setPosts).catch(() => {}) }
  }

  if (!ready) return <SkeletonList rows={6} />

  const hrs = Math.floor((week?.minutes || 0) / 60)

  return (
    <div style={page}>
      <h1 style={T.h1}>Community</h1>

      {/* ---- the club, this week ---- */}
      {week?.sessions > 0 && (
        <Card style={{ marginTop: 18 }}>
          <Label>THE CLUB THIS WEEK</Label>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8,
            marginTop: 7 }}>
            <div style={{ ...T.display, fontSize: 38 }}>{week.sessions}</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: C.sub }}>
              session{week.sessions === 1 ? '' : 's'}
            </div>
          </div>
          <div style={{ ...T.small, marginTop: 7 }}>
            {week.people} {week.people === 1 ? 'person' : 'people'} in,
            {hrs > 0 ? ` ${hrs} hours` : ` ${week.minutes} minutes`} on the floor
            between you.
          </div>
        </Card>
      )}

      {/* ---- the board ---- */}
      {notices.length > 0 && (
        <>
          <Label style={{ margin: '26px 0 12px' }}>WHAT'S ON AT SALUS</Label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
            {notices.map(n => (
              <div key={n.id} onClick={() => setNotice(n)}
                style={{ position: 'relative', background: C.card,
                  border: `1px solid ${n.pinned ? C.gLine : 'transparent'}`,
                  borderRadius: 14, padding: '17px 15px 15px', cursor: 'pointer' }}>
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
                  <div style={{ ...T.small, marginTop: 5, display: '-webkit-box',
                    WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                    overflow: 'hidden' }}>{n.body}</div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* ---- who's been in ---- */}
      <Label style={{ margin: '26px 0 12px' }}>WHO'S BEEN IN</Label>

      {!profile?.share_on_leaderboard && (
        <Card style={{ background: C.card2, marginBottom: 12 }}>
          <div style={{ ...T.small }}>
            You're not showing up here. Sharing puts your name in the feed when
            you train — no weights, no times, just that you were in.
          </div>
          <Btn tone="soft" style={{ marginTop: 13, padding: '13px 0',
            fontSize: 14.5 }} onClick={onShare}>Join in</Btn>
        </Card>
      )}

      {posts.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 11,
          marginBottom: 14 }}>
          {posts.map(p => {
            const me = p.user_id === userId
            return (
              <div key={p.id} style={{ background: C.card, borderRadius: 16,
                overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 11,
                  padding: '14px 15px 12px' }}>
                  <Avatar name={p.name} size={34} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14.5, fontWeight: 700,
                      color: me ? C.g : C.ink }}>{me ? 'You' : p.name}</div>
                    <div style={{ fontSize: 12, color: C.mute, marginTop: 2,
                      overflow: 'hidden', textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap' }}>
                      {p.session_title || 'A session'}
                      {p.elapsed_s ? ` · ${fmt(p.elapsed_s)}` : ''}
                      {p.distance_m ? ` · ${(p.distance_m / 1000).toFixed(1)}km` : ''}
                    </div>
                  </div>
                  <div style={{ fontSize: 11.5, color: C.mute }}>
                    {ago(p.created_at)}
                  </div>
                </div>

                {p.body && (
                  <div style={{ padding: '0 15px 13px', fontSize: 14.5,
                    lineHeight: 1.5, color: C.ink }}>{p.body}</div>
                )}

                {p.photo_url && (
                  <div style={{ height: 210,
                    background: `#0A0A09 url(${p.photo_url}) center/cover` }} />
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: 10,
                  padding: '11px 15px', borderTop: `1px solid ${C.line}` }}>
                  <button onClick={() => kudos(p)} style={{ display: 'flex',
                    alignItems: 'center', gap: 8, background: 'transparent',
                    border: 'none', cursor: 'pointer', fontFamily: F, padding: 0 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 999,
                      display: 'grid', placeItems: 'center',
                      background: p.mine ? C.g : C.card2,
                      animation: p.mine ? 'pop .26s cubic-bezier(.2,.8,.3,1)' : 'none' }}>
                      <Ico d={I.kudos} s={15} c={p.mine ? C.bg : C.sub} w={1.9} />
                    </div>
                    <span style={{ fontSize: 13.5, fontWeight: 600,
                      color: p.mine ? C.ink : C.sub }}>
                      {Number(p.kudos) || ''}
                    </span>
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {feed.length === 0 && posts.length === 0 ? (
        <Empty icon={I.user}
          title="Quiet in here"
          body="When members finish a session it shows up here. Be the first one in this week." />
      ) : (
        <Card style={{ padding: '4px 15px' }} className="stagger">
          {feed.map((f, i) => {
            const me = f.name === profile?.name
            return (
              <div key={f.id} style={{ display: 'flex', alignItems: 'center',
                gap: 12, padding: '13px 0',
                borderTop: i ? `1px solid ${C.line}` : 'none' }}>
                <Avatar name={f.name} size={34} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14.5, fontWeight: 700,
                    color: me ? C.g : C.ink }}>
                    {me ? 'You' : f.name}
                  </div>
                  <div style={{ fontSize: 12.5, color: C.sub, marginTop: 2,
                    overflow: 'hidden', textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap' }}>
                    {f.session_title || 'a session'}
                    {f.week_idx ? ` · week ${f.week_idx}` : ''}
                  </div>
                </div>
                <div style={{ fontSize: 11.5, color: C.mute, flexShrink: 0 }}>
                  {ago(f.ended_at)}
                </div>
              </div>
            )
          })}
        </Card>
      )}

      {/* ---- the coaches ---- */}
      {coaches.length > 0 && (
        <>
          <Label style={{ margin: '26px 0 12px' }}>THE COACHES</Label>
          <div className="nb" style={{ display: 'flex', gap: 10,
            overflowX: 'auto', paddingBottom: 4, marginLeft: -16, marginRight: -16,
            paddingLeft: 16, paddingRight: 16 }}>
            {coaches.map(c => (
              <button key={c.id} onClick={() => onCoach(c)}
                style={{ flex: '0 0 auto', width: 108, background: C.card,
                  border: 'none', borderRadius: 15, padding: '16px 12px',
                  cursor: 'pointer', fontFamily: F, textAlign: 'center' }}>
                {c.photo_url ? (
                  <div style={{ width: 52, height: 52, borderRadius: 999,
                    margin: '0 auto',
                    background: `#0A0A09 url(${c.photo_url}) center/cover` }} />
                ) : (
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <Avatar name={c.name} tint={c.tint} size={52} />
                  </div>
                )}
                <div style={{ fontSize: 14, fontWeight: 700, marginTop: 10,
                  color: C.ink }}>{c.name}</div>
                <div style={{ fontSize: 11, color: C.mute, marginTop: 3,
                  overflow: 'hidden', textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap' }}>
                  {(c.spec || [])[0] || 'Coach'}
                </div>
              </button>
            ))}
          </div>
          <div style={{ ...T.small, fontSize: 12, marginTop: 12 }}>
            Tap any of them to ask something. Private, and they'll usually get
            back to you the same day.
          </div>
        </>
      )}

      {notice && (
        <Sheet onClose={() => setNotice(null)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '.12em',
              color: notice.pinned ? C.g : C.mute }}>{notice.tag}</span>
            <div style={{ flex: 1 }} />
            <span style={{ fontSize: 12.5, color: C.mute }}>
              {new Date(notice.published_at).toLocaleDateString('en-GB',
                { day: 'numeric', month: 'short' })}
            </span>
          </div>
          <div style={{ ...T.h2, marginTop: 9 }}>{notice.title}</div>
          <div style={{ ...T.body, marginTop: 11 }}>{notice.body}</div>
          <Btn tone="soft" style={{ marginTop: 20 }}
            onClick={() => setNotice(null)}>Close</Btn>
        </Sheet>
      )}
    </div>
  )
}
