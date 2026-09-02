import { C, T, P, F } from '../lib/theme'
import { DAYS } from '../lib/format'
import { Ico, I, Avatar } from './ui'
import Img from './Img'

// The whole session, on the card.
//
// A photo and a title tell a member almost nothing — they open it to
// find out what today is, then come back out. Showing every block
// with its scheme and its movements means they know before they tap,
// and can decide whether they have the hour.
export default function SessionCard({ session, blocks = [], coach,
                                      completions, onOpen }) {
  const s = session
  if (!s) return null
  const kind = (s.kind || 'strength').toUpperCase()

  return (
    <div style={{ background: C.card, borderRadius: 18, overflow: 'hidden',
      position: 'relative' }}>


      {/* ---- who and what ---- */}
      <div style={{ padding: '15px 16px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.13em',
            color: C.mute }}>{kind}</div>
          <span style={{ color: C.mute, fontSize: 10 }}>·</span>
          <div style={{ fontSize: 12.5, color: C.sub, fontWeight: 600 }}>
            {DAYS[s.day - 1]}
          </div>
          {s.moved && (
            <span style={{ fontSize: 11, color: C.g }}>
              moved from {DAYS[s.coach_day - 1]}
            </span>
          )}
          <div style={{ flex: 1 }} />
          {completions?.people > 0 && (
            <div style={{ fontSize: 12, color: C.sub }}>
              <b style={{ color: C.g, fontWeight: 700 }}>{completions.people}</b>
              {' '}{completions.people === 1 ? 'has' : 'have'} done this
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 13,
          marginTop: 12 }}>
          {/* a coach's face, if this session has a video */}
          {(s.video_url || coach) && (
            <div style={{ position: 'relative', flexShrink: 0 }}>
              {coach?.photo_url ? (
                <Img src={coach.photo_url} radius={11}
                  style={{ width: 54, height: 62 }} />
              ) : (
                <Avatar name={coach?.name || 'S'} tint={coach?.tint} size={54} />
              )}
              {s.video_url && (
                <div style={{ position: 'absolute', bottom: -4, right: -4,
                  width: 22, height: 22, borderRadius: 999, background: C.g,
                  display: 'grid', placeItems: 'center',
                  border: `2px solid ${C.card}` }}>
                  <span style={{ color: C.bg, fontSize: 8, marginLeft: 1 }}>▶</span>
                </div>
              )}
            </div>
          )}

          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Title, then the focus pill. Nothing else — a line of
                explanation under every session title was one line too
                many, and the pill already says what the day is about. */}
            <div style={{ ...T.h1, fontSize: 25 }}>{s.title}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8,
              marginTop: 7, flexWrap: 'wrap' }}>
              {/* A test is the one thing worth marking on the title row —
                  it's the session whose number everything else is set
                  from, and a member should know before they start. */}
              {s.is_test && (
                <span style={{ background: C.g, color: C.bg, borderRadius: 8,
                  padding: '4px 9px', fontSize: 11, fontWeight: 800,
                  letterSpacing: '.04em' }}>TEST</span>
              )}
              {s.focus && (
                <>
                  <span style={{ background: C.card3, borderRadius: 8,
                    padding: '4px 9px', fontSize: 11.5, fontWeight: 700 }}>
                    Focus
                  </span>
                  <span style={{ fontSize: 13.5, color: C.sub }}>{s.focus}</span>
                </>
              )}
              {!s.focus && s.tag && (
                <span style={{ fontSize: 13.5, color: C.sub }}>{s.tag}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ---- the shape of it ---- */}
      {blocks.length > 0 && (
        <div>
          {blocks.map(b => (
            <div key={b.id} style={{ display: 'flex', gap: 12,
              padding: '13px 16px', background: C.card2,
              borderTop: `1px solid ${C.line}` }}>
              <div style={{ width: 27, height: 27, borderRadius: 999, flexShrink: 0,
                background: C.card3, display: 'grid', placeItems: 'center',
                fontSize: 11.5, fontWeight: 800, color: C.sub }}>{b.letter}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 16.5, fontWeight: 700,
                  letterSpacing: '-.02em', color: C.ink }}>{b.label}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8,
                  marginTop: 6 }}>
                  {b.scheme && (
                    <span style={{ background: C.card3, borderRadius: 7,
                      padding: '3px 9px', fontSize: 11, fontWeight: 700,
                      color: C.ink, flexShrink: 0,
                      whiteSpace: 'nowrap' }}>{b.scheme}</span>
                  )}
                  <div style={{ fontSize: 12.5, color: C.sub, overflow: 'hidden',
                    textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {b.movements.join(', ')}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ---- in ---- */}
      <div style={{ padding: 14, background: C.card2,
        borderTop: `1px solid ${C.line}` }}>
        <button onClick={onOpen} style={{ width: '100%', border: 'none',
          borderRadius: 999, padding: '16px 0', fontSize: 15.5, fontWeight: 700,
          cursor: 'pointer', fontFamily: F, background: C.ink, color: C.bg }}>
          {s.kind === 'half' ? 'Start the half' : 'Start the workout'}
        </button>
        {s.est_min && (
          <div style={{ textAlign: 'center', fontSize: 12, color: C.mute,
            marginTop: 9 }}>About {s.est_min} minutes</div>
        )}
      </div>
    </div>
  )
}
