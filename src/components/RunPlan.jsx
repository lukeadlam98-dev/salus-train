import { C, T } from '../lib/theme'

// What a run session is actually asking for.
//
// Each of the three does a different job and needs saying differently.
// An easy run is a heart rate and a duration; intervals are a shape;
// speed is a list of reps. Printing "45 min run" for all three is how
// people end up doing the same moderate slog three times a week.
export default function RunPlan({ session, zone }) {
  const k = session?.run_kind
  if (!k) return null

  if (k === 'easy' || k === 'long') return (
    <div style={{ background: C.card2, borderRadius: 14, padding: 16,
      marginTop: 12 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.14em',
            color: C.mute }}>TIME IN ZONE</div>
          <div style={{ fontSize: 34, fontWeight: 900, letterSpacing: '-.05em',
            lineHeight: 1, marginTop: 7, ...T.num }}>
            {session.run_minutes}<span style={{ fontSize: 16,
              color: C.sub, marginLeft: 3 }}>min</span>
          </div>
        </div>
        <div style={{ flex: 1 }} />
        {zone ? (
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.14em',
              color: C.mute }}>HEART RATE</div>
            <div style={{ fontSize: 24, fontWeight: 800, marginTop: 7,
              ...T.num, color: C.g }}>
              {zone.low}–{zone.high}
            </div>
          </div>
        ) : (
          <div style={{ fontSize: 12, color: C.mute, textAlign: 'right',
            maxWidth: 130, lineHeight: 1.4 }}>
            Add your birth year on Me and this becomes a number
          </div>
        )}
      </div>

      <div style={{ ...T.small, fontSize: 12.5, marginTop: 14,
        lineHeight: 1.55 }}>
        {zone
          ? `180 minus your age, five beats either side — ten if it's hot. `
          : ''}
        You should be able to hold a conversation. If you can't, walk until
        you can. That's the session working, not failing.
      </div>

      {session.run_minutes >= 40 && (
        <div style={{ ...T.small, fontSize: 12.5, marginTop: 10,
          paddingTop: 12, borderTop: `1px solid ${C.line}`, lineHeight: 1.55 }}>
          You're past forty minutes, so the rule changes: hold the same heart
          rate and let the pace come up on its own. That's the adaptation
          showing.
        </div>
      )}
    </div>
  )

  if (k === 'intervals') {
    const blocks = session.run_blocks || 4
    const long = session.run_minutes >= 60
    return (
      <div style={{ background: C.card2, borderRadius: 14, padding: 16,
        marginTop: 12 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <div style={{ fontSize: 34, fontWeight: 900, letterSpacing: '-.05em',
            lineHeight: 1, ...T.num }}>{session.run_minutes}</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.sub }}>
            minutes of work
          </div>
        </div>

        <div style={{ fontSize: 12.5, color: C.mute, marginTop: 6 }}>
          After six minutes of warm-up, building to race pace
        </div>

        {/* The shape of it. Three bars per block, getting brighter —
            two minutes each, stepping up to race pace. */}
        <div style={{ marginTop: 16 }}>
          {Array.from({ length: blocks }).map((_, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center',
              gap: 10, marginBottom: 8 }}>
              <div style={{ width: 16, fontSize: 11, fontWeight: 700,
                color: C.mute, ...T.num }}>{i + 1}</div>
              <div style={{ flex: 1, display: 'flex', gap: 3 }}>
                {(long ? [3, 3, 4] : [2, 2, 2]).map((m, j) => (
                  <div key={j} style={{ flex: m, height: 22, borderRadius: 5,
                    background: [C.card3, 'rgba(255,255,255,.34)', C.g][j],
                    display: 'grid', placeItems: 'center',
                    fontSize: 9.5, fontWeight: 800,
                    color: j === 2 ? C.bg : C.sub }}>
                    {m}m
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 14, marginTop: 12,
          paddingTop: 12, borderTop: `1px solid ${C.line}` }}>
          {[['−2 km/h', C.card3], ['−1 km/h', 'rgba(255,255,255,.34)'],
            ['race pace', C.g]].map(([l, c]) => (
            <div key={l} style={{ display: 'flex', alignItems: 'center',
              gap: 6 }}>
              <span style={{ width: 10, height: 10, borderRadius: 3,
                background: c }} />
              <span style={{ fontSize: 11.5, color: C.sub }}>{l}</span>
            </div>
          ))}
        </div>

        <div style={{ ...T.small, fontSize: 12.5, marginTop: 12,
          lineHeight: 1.55 }}>
          {long
            ? 'Ten-minute blocks now — three easy, three moderate, four at or above race pace.'
            : 'Each block can hold the last one\u2019s pace or nudge it up. As the weeks go on the gap between the three narrows.'}
        </div>
      </div>
    )
  }

  if (k === 'speed') return (
    <div style={{ background: C.card2, borderRadius: 14, padding: 16,
      marginTop: 12 }}>
      <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.14em',
        color: C.mute }}>THE LADDER</div>
      <div style={{ ...T.h2, fontSize: 21, marginTop: 8 }}>
        {session.run_ladder}
      </div>
      <div style={{ ...T.small, fontSize: 12.5, marginTop: 10,
        lineHeight: 1.55 }}>
        Above race pace, sixty seconds walking or jogging between. The
        shorter the rep the faster it goes — a 200 should be quicker than
        a 400.
      </div>
      <div style={{ ...T.small, fontSize: 12.5, marginTop: 10,
        paddingTop: 12, borderTop: `1px solid ${C.line}`, lineHeight: 1.55 }}>
        Every rep should feel the same. If the last one is slower than the
        first, the recovery was too short — take longer rather than running
        the next one tired.
      </div>
    </div>
  )

  return null
}
