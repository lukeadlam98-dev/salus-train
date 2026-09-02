import { useState, useEffect } from 'react'
import { C, T, F } from '../lib/theme'
import { fmt, hhmm } from '../lib/format'
import * as api from './api'
import { Btn } from './widgets'
import { Columns, Ring } from './charts'
import PostBox from './PostBox'

// The club, not one programme. Where the coach dashboard answers
// "what needs doing in Road to HYROX", this answers "how is Salus
// Train doing" — which programmes are carrying people, which are
// sitting unpublished, and whether the whole thing is being used.
export default function Club({ onOpenProgramme, onGo }) {
  const [progs, setProgs] = useState([])
  const [members, setMembers] = useState([])
  const [volume, setVolume] = useState([])
  const [activity, setActivity] = useState([])
  const [notices, setNotices] = useState([])

  const loadNotices = () => api.listNotices().then(setNotices).catch(() => {})

  const [err, setErr] = useState(null)

  useEffect(() => {
    api.getClubOverview().then(setProgs).catch(e => setErr(e.message))
    api.listMembers().then(setMembers).catch(() => {})
    api.getWeeklyVolume(8).then(setVolume).catch(() => {})
    api.getRecentActivity(5).then(setActivity).catch(() => {})
    loadNotices()
  }, [])

  const people = members.filter(m => m.role !== 'admin')
  const active = people.filter(m => m.last_trained &&
    (Date.now() - new Date(m.last_trained)) < 7 * 86400000).length
  const live = progs.filter(p => p.live)
  const unplaced = people.filter(m => !m.programme_id).length
  const thisWeek = volume[volume.length - 1] ?? 0
  const lastWeek = volume[volume.length - 2] ?? 0
  const trend = lastWeek ? Math.round(((thisWeek - lastWeek) / lastWeek) * 100) : null

  return (
    <div style={{ maxWidth: 1040 }}>
      <div style={{ marginBottom: 26 }}>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.13em',
          color: C.mute }}>THE CLUB</div>
        <h1 style={{ ...T.h1, marginTop: 6 }}>Salus Train</h1>
      </div>

      {err && (
        <div style={{ background: C.card, border: `1px solid ${C.line}`,
          borderRadius: 11, padding: '12px 15px', fontSize: 13, color: C.red,
          marginBottom: 18, lineHeight: 1.5 }}>{err}</div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)',
        gap: 12, marginBottom: 18 }}>
        <Panel style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Ring value={active} total={people.length || 1} label={active} />
          <div>
            <div style={{ fontSize: 12.5, fontWeight: 700 }}>Training this week</div>
            <div style={{ fontSize: 11.5, color: C.mute, marginTop: 3 }}>
              of {people.length} member{people.length === 1 ? '' : 's'}
            </div>
          </div>
        </Panel>
        <Panel>
          <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-.04em',
            fontVariantNumeric: 'tabular-nums' }}>{live.length}</div>
          <div style={{ fontSize: 12, color: C.sub, marginTop: 5,
            fontWeight: 600 }}>Programmes live</div>
          <div style={{ fontSize: 11.5, color: C.mute, marginTop: 2 }}>
            {progs.length - live.length} in draft
          </div>
        </Panel>
        <Panel>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-.04em',
              fontVariantNumeric: 'tabular-nums' }}>{thisWeek}</div>
            {trend != null && (
              <div style={{ fontSize: 12.5, fontWeight: 700,
                color: trend >= 0 ? C.g : C.red }}>
                {trend >= 0 ? '+' : ''}{trend}%
              </div>
            )}
          </div>
          <div style={{ fontSize: 12, color: C.sub, marginTop: 5,
            fontWeight: 600 }}>Sessions this week</div>
          <div style={{ fontSize: 11.5, color: C.mute, marginTop: 2 }}>
            {lastWeek} last week
          </div>
        </Panel>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.3fr) minmax(0,1fr)',
        gap: 18, alignItems: 'start' }}>

        <div>
          <Panel style={{ marginBottom: 18, padding: '4px 15px' }}>
            <div style={{ padding: '13px 0 5px' }}>
              <Head style={{ marginBottom: 0 }}>Programmes</Head>
            </div>
            {progs.map(p => (
              <div key={p.id} onClick={() => onOpenProgramme(p)}
                style={{ display: 'flex', alignItems: 'center', gap: 13,
                  padding: '13px 0', cursor: 'pointer',
                  borderTop: `1px solid ${C.line}` }}>
                <div style={{ width: 52, height: 38, borderRadius: 8, flexShrink: 0,
                  border: `1px solid ${C.line}`,
                  background: p.cover_url
                    ? `#0B0A09 url(${p.cover_url}) center/cover`
                    : C.card2 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ fontSize: 14.5, fontWeight: 700 }}>{p.name}</div>
                    {!p.live && (
                      <span style={{ background: C.card3, color: C.sub,
                        borderRadius: 5, padding: '2px 7px', fontSize: 9.5,
                        fontWeight: 800 }}>DRAFT</span>
                    )}
                  </div>
                  <div style={{ fontSize: 11.5, color: C.mute, marginTop: 3 }}>
                    {p.weeksLive} of {p.weeksTotal} weeks published
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 800,
                    fontVariantNumeric: 'tabular-nums',
                    color: p.members ? C.ink : C.mute }}>{p.members}</div>
                  <div style={{ fontSize: 10.5, color: C.mute }}>
                    {p.members === 1 ? 'member' : 'members'}
                  </div>
                </div>
                <span style={{ color: C.mute, fontSize: 14 }}>›</span>
              </div>
            ))}
            {progs.length === 0 && (
              <div style={{ ...T.body, fontSize: 13, padding: '4px 0 14px' }}>
                No programmes yet.
              </div>
            )}
          </Panel>

          {volume.length > 0 && (
            <Panel>
              <Head>Sessions logged</Head>
              <div style={{ ...T.body, fontSize: 12.5, marginBottom: 16 }}>
                Every programme, by week. The shape matters more than the numbers.
              </div>
              <Columns rows={volume.map((v, i) => ({
                label: i === volume.length - 1 ? 'now' : `-${volume.length - 1 - i}`,
                v, flag: i === volume.length - 1,
              }))} />
            </Panel>
          )}
        </div>

        <div>
          <div style={{ marginBottom: 18 }}>
            <PostBox onPosted={loadNotices} />
          </div>

          {notices.length > 0 && (
            <Panel style={{ marginBottom: 18, padding: '4px 15px' }}>
              <div style={{ padding: '13px 0 5px', display: 'flex',
                alignItems: 'center' }}>
                <Head style={{ marginBottom: 0, flex: 1 }}>On the board</Head>
                <button onClick={() => onGo('notices')}
                  style={{ background: 'transparent', border: 'none',
                    color: C.mute, fontSize: 11.5, fontWeight: 600,
                    cursor: 'pointer', fontFamily: F, padding: 0 }}>
                  All {notices.length} ›
                </button>
              </div>
              {notices.slice(0, 3).map(n => (
                <div key={n.id} onClick={() => onGo('notices')}
                  style={{ padding: '11px 0', cursor: 'pointer',
                    borderTop: `1px solid ${C.line}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {n.pinned && <span style={{ width: 5, height: 5,
                      borderRadius: 999, background: C.g }} />}
                    <span style={{ fontSize: 9.5, fontWeight: 800,
                      letterSpacing: '.12em',
                      color: n.pinned ? C.g : C.mute }}>{n.tag}</span>
                    <div style={{ flex: 1 }} />
                    <span style={{ fontSize: 10.5, color: C.mute }}>
                      {new Date(n.published_at).toLocaleDateString('en-GB',
                        { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, marginTop: 4,
                    overflow: 'hidden', textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap' }}>{n.title}</div>
                </div>
              ))}
            </Panel>
          )}

          {unplaced > 0 && (
            <Panel style={{ marginBottom: 18 }}>
              <Head>Not on a programme</Head>
              <div style={{ ...T.body, fontSize: 13, marginTop: 4 }}>
                {unplaced} member{unplaced === 1 ? '' : 's'} signed up but{' '}
                {unplaced === 1 ? 'isn\u2019t' : 'aren\u2019t'} following anything.
                They open the app to nothing.
              </div>
              <Btn small tone="line" style={{ marginTop: 12 }}
                onClick={() => onGo('members')}>See who</Btn>
            </Panel>
          )}

          <Panel style={{ padding: '4px 15px' }}>
            <div style={{ padding: '13px 0 5px' }}>
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
                    whiteSpace: 'nowrap' }}>
                    {a.programme || a.session_title || 'A session'}
                  </div>
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, flexShrink: 0,
                  fontVariantNumeric: 'tabular-nums',
                  color: a.ended_at ? C.ink : C.mute }}>
                  {a.elapsed_s ? fmt(a.elapsed_s) : '—'}
                </div>
              </div>
            ))}
          </Panel>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 18 }}>
            <Btn small tone="soft" onClick={() => onGo('members')}>All members</Btn>
            <Btn small tone="soft" onClick={() => onGo('boards')}>Leaderboards</Btn>
            <Btn small tone="soft" onClick={() => onGo('notices')}>Post a notice</Btn>
          </div>
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
