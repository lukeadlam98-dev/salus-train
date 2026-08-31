import { C, T, F } from '../lib/theme'
import { hhmm } from '../lib/format'
import { Ico, I } from './ui'

// One card, not three tiles.
//
// The race, the week and the estimate were three separate objects
// saying things about the same thing. A member reads them together
// anyway, so they belong together — the photo across the top, the
// numbers under it, one bar for the block.
export default function Insights({ days, raceDate, programme, half, prediction,
                                   week, sessions = [], done = 0, onSetRace,
                                   onTakeClubRace, onOpenRace }) {
  const set = days !== null && days !== undefined
  const total = programme?.total_weeks || 8
  const real = sessions.filter(s => s.kind !== 'rest')

  const band = (() => {
    if (half?.projected) return { text: hhmm(half.projected), exact: true }
    if (!prediction?.seconds) return null
    const spread = prediction.confidence === 'good' ? .022
                 : prediction.confidence === 'rough' ? .045 : .075
    return { text: `${hhmm(Math.round(prediction.seconds * (1 - spread)))}–` +
                   `${hhmm(Math.round(prediction.seconds * (1 + spread)))}`,
             exact: false }
  })()

  return (
    <div style={{ background: C.card, borderRadius: 18, overflow: 'hidden' }}>

      {/* ---- the race, across the top ---- */}
      <div style={{ position: 'relative', minHeight: set ? 132 : 118 }}>
        {programme?.race_image && (
          <>
            <div style={{ position: 'absolute', inset: 0,
              background: `#0A0A09 url(${programme.race_image}) center/cover` }} />
            <div style={{ position: 'absolute', inset: 0,
              background: 'linear-gradient(180deg,rgba(10,10,9,.2),' +
                          'rgba(10,10,9,.9) 82%)' }} />
          </>
        )}
        <div style={{ position: 'relative', minHeight: set ? 132 : 118,
          display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
          padding: '16px 16px 14px' }}>
          {set ? (
            <>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10 }}>
                <div style={{ fontSize: 40, fontWeight: 900, letterSpacing: '-.05em',
                  lineHeight: .9, ...T.num }}>{days}</div>
                <div style={{ paddingBottom: 3 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.sub }}>
                    days to go
                  </div>
                </div>
              </div>
              <div style={{ fontSize: 12.5, color: C.mute, marginTop: 8 }}>
                {programme?.race_name || 'Your competition'} · {raceDate}
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 19, fontWeight: 800, letterSpacing: '-.03em' }}>
                Add my competition
              </div>
              <div style={{ fontSize: 12.5, color: C.sub, marginTop: 5 }}>
                and the whole block lines up behind it
              </div>
            </>
          )}
        </div>
      </div>

      {/* ---- the block, as one bar ---- */}
      <div style={{ padding: '15px 16px 16px', borderTop: `1px solid ${C.line}` }}>
        <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 700 }}>
            Week {week ?? 1} of {total}
          </div>
          <div style={{ flex: 1 }} />
          <div style={{ fontSize: 12.5, color: C.sub, ...T.num }}>
            {done}/{real.length} this week
          </div>
        </div>

        <div style={{ display: 'flex', gap: 3 }}>
          {Array.from({ length: total }).map((_, i) => {
            const past = i < (week ?? 1) - 1
            const now = i === (week ?? 1) - 1
            return (
              <div key={i} style={{ flex: 1, height: 5, borderRadius: 999,
                background: past ? C.g : C.card3, position: 'relative',
                overflow: 'hidden' }}>
                {/* the current week fills as the sessions get done */}
                {now && real.length > 0 && (
                  <div style={{ position: 'absolute', inset: 0,
                    width: `${(done / real.length) * 100}%`, background: C.g,
                    borderRadius: 999, transition: 'width .4s' }} />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ---- the one thing to do about it ---- */}
      {!set && programme?.race_date ? (
        <div style={{ background: C.card2, borderTop: `1px solid ${C.line}`,
          padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.35 }}>
              The block is aimed at {programme.race_name}
            </div>
            <div style={{ fontSize: 11.5, color: C.mute, marginTop: 3 }}>
              {new Date(programme.race_date).toLocaleDateString('en-GB',
                { weekday: 'long', day: 'numeric', month: 'long' })}
            </div>
          </div>
          <button onClick={onTakeClubRace} style={{ border: 'none',
            borderRadius: 999, padding: '10px 16px', fontSize: 13, fontWeight: 700,
            cursor: 'pointer', fontFamily: F, background: C.g, color: C.bg,
            flexShrink: 0 }}>That's me</button>
        </div>
      ) : !set ? (
        <div onClick={onSetRace} style={{ background: C.card2,
          borderTop: `1px solid ${C.line}`, padding: '14px 16px', display: 'flex',
          alignItems: 'center', gap: 11, cursor: 'pointer' }}>
          <div style={{ flex: 1, fontSize: 13.5, fontWeight: 600 }}>
            Set your race day
          </div>
          <Ico d={I.chev} s={13} c={C.mute} w={2} />
        </div>
      ) : band ? (
        <div onClick={onOpenRace} style={{ background: C.card2,
          borderTop: `1px solid ${C.line}`, padding: '14px 16px', display: 'flex',
          alignItems: 'center', gap: 11, cursor: 'pointer' }}>
          <Ico d={I.chart} s={15} c={C.g} w={2} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 700 }}>
              {band.exact ? 'Projected' : 'Estimated'} {band.text}
            </div>
            <div style={{ fontSize: 11.5, color: C.mute, marginTop: 2 }}>
              {band.exact
                ? `from your half in week ${half.week ?? 1}`
                : `${prediction.basis} · the half tightens it`}
            </div>
          </div>
          <Ico d={I.chev} s={13} c={C.mute} w={2} />
        </div>
      ) : (
        <div onClick={onOpenRace} style={{ background: C.card2,
          borderTop: `1px solid ${C.line}`, padding: '14px 16px', display: 'flex',
          alignItems: 'center', gap: 11, cursor: 'pointer' }}>
          <div style={{ flex: 1, fontSize: 13.5, color: C.sub, lineHeight: 1.5 }}>
            Do the five tests and this shows what you're on for.
          </div>
          <Ico d={I.chev} s={13} c={C.mute} w={2} />
        </div>
      )}
    </div>
  )
}
