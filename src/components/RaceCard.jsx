import { C, T, F } from '../lib/theme'
import { hhmm } from '../lib/format'
import { Ico, I } from './ui'

// Segments, not a bar.
//
// A solid bar filling up is a loading indicator — it says wait. Eight
// discrete marks say eight weeks, and a member can count the ones
// they've done. Same information, completely different feeling.
const Weeks = ({ total, done }) => (
  <div style={{ display: 'flex', gap: 4 }}>
    {Array.from({ length: total }).map((_, i) => (
      <div key={i} style={{ flex: 1, height: 4, borderRadius: 999,
        background: i < done ? C.g : C.card3,
        transition: 'background .35s' }} />
    ))}
  </div>
)

const Stat = ({ label, value, unit, icon }) => (
  <div style={{ flex: 1, minWidth: 0 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      {icon && <Ico d={icon} s={12} c={C.mute} w={1.9} />}
      <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.14em',
        color: C.mute }}>{label}</div>
    </div>
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, marginTop: 7 }}>
      <div style={{ fontSize: 27, fontWeight: 800, letterSpacing: '-.04em',
        lineHeight: 1, ...T.num }}>{value}</div>
      {unit && <div style={{ fontSize: 13, fontWeight: 600,
        color: C.sub }}>{unit}</div>}
    </div>
  </div>
)

export default function RaceCard({ days, race, raceDate, programme, half, phase,
                                   week, prediction, sessionsDone, sessionsTotal,
                                   onSetRace, onOpenRace }) {
  const total = programme?.total_weeks || 8
  const set = days !== null && days !== undefined

  // A range rather than a point.
  //
  // A single predicted time invites an argument about the seconds. A
  // range says what the model actually knows — and how wide it is,
  // which is information in itself. A half narrows it to nothing,
  // because that's a measurement rather than a guess.
  const band = (() => {
    if (half?.projected) return { lo: half.projected, hi: null,
      note: `from your half in week ${half.week ?? 1}` }
    if (!prediction?.seconds) return null
    const spread = prediction.confidence === 'good' ? .022
                 : prediction.confidence === 'rough' ? .045 : .075
    const s = prediction.seconds
    return {
      lo: Math.round(s * (1 - spread)),
      hi: Math.round(s * (1 + spread)),
      note: prediction.basis,
    }
  })()

  return (
    <div style={{ background: C.card, borderRadius: 18, overflow: 'hidden' }}>

      {/* ---- the race ---- */}
      <div style={{ position: 'relative', padding: '17px 16px 16px' }}>
        {programme?.race_image && (
          <>
            <div style={{ position: 'absolute', inset: 0,
              background: `#0A0A09 url(${programme.race_image}) center/cover`,
              opacity: .3 }} />
            <div style={{ position: 'absolute', inset: 0,
              background: 'linear-gradient(100deg,rgba(10,10,9,.95) 42%,' +
                          'rgba(10,10,9,.55) 100%)' }} />
          </>
        )}

        <div style={{ position: 'relative' }}>
          <div style={{ ...T.h2, fontSize: 19 }}>
            {programme?.name || 'Your block'}
          </div>
          <div style={{ fontSize: 13, color: C.sub, marginTop: 5 }}>
            {set ? <>Your race: <b style={{ color: C.ink, fontWeight: 600 }}>
              {raceDate}</b></> : 'No date in the diary yet'}
          </div>
          {programme?.race_name && (
            <div style={{ fontSize: 13, color: C.sub, marginTop: 2 }}>
              {programme.race_name}
              {programme.race_location && (
                <span style={{ color: C.mute }}> · {programme.race_location}</span>
              )}
            </div>
          )}

          <div style={{ marginTop: 15 }}>
            <Weeks total={total} done={week ?? 0} />
          </div>

          <div style={{ display: 'flex', gap: 16, marginTop: 17 }}>
            <Stat label="WEEK" value={`${week ?? 1}/${total}`}
              unit={phase ? phase.toLowerCase() : null} icon={I.cal} />
            {set ? (
              <Stat label="DAYS TO GO" value={days} icon={I.target} />
            ) : (
              <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end' }}>
                <button onClick={onSetRace} style={{ border: 'none',
                  borderRadius: 999, padding: '11px 18px', fontSize: 13.5,
                  fontWeight: 700, cursor: 'pointer', fontFamily: F,
                  background: C.g, color: C.bg }}>Add my competition</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ---- what it's projecting to ---- */}
      <div onClick={band?.hi ? onOpenRace : (band ? undefined : onOpenRace)}
        style={{ background: C.card2, borderTop: `1px solid ${C.line}`,
          padding: '15px 16px', cursor: band?.hi === null ? 'default' : 'pointer' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <Ico d={I.chart} s={13} c={C.g} w={2} />
          <div style={{ fontSize: 12.5, fontWeight: 700, color: C.g }}>
            {half?.projected ? 'Projected finish' : 'Estimated finish'}
          </div>
          <div style={{ flex: 1 }} />
          {!half?.projected && band && (
            <div style={{ fontSize: 10.5, color: C.mute }}>
              tighten it with the half
            </div>
          )}
        </div>

        {band ? (
          <>
            <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-.035em',
              marginTop: 9, ...T.num }}>
              {hhmm(band.lo)}{band.hi ? ` – ${hhmm(band.hi)}` : ''}
            </div>
            <div style={{ fontSize: 11.5, color: C.mute, marginTop: 4 }}>
              {band.note}
            </div>
          </>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10,
            marginTop: 8 }}>
            <div style={{ flex: 1, fontSize: 13.5, color: C.sub, lineHeight: 1.5 }}>
              Do the five tests and this fills in.
            </div>
            <Ico d={I.chev} s={14} c={C.mute} w={2} />
          </div>
        )}
      </div>

      {/* ---- this week ---- */}
      {sessionsTotal > 0 && (
        <div style={{ padding: '13px 16px', borderTop: `1px solid ${C.line}`,
          display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.14em',
            color: C.mute }}>THIS WEEK</div>
          <div style={{ flex: 1, display: 'flex', gap: 3 }}>
            {Array.from({ length: sessionsTotal }).map((_, i) => (
              <div key={i} style={{ flex: 1, height: 4, borderRadius: 999,
                background: i < (sessionsDone || 0) ? C.g : C.card3 }} />
            ))}
          </div>
          <div style={{ fontSize: 12.5, fontWeight: 700, ...T.num }}>
            {sessionsDone || 0}/{sessionsTotal}
          </div>
        </div>
      )}
    </div>
  )
}
