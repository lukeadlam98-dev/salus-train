import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { C, T, F } from '../lib/theme'
import { fmt, hhmm } from '../lib/format'
import { saveBenchmark, getMyScore } from '../lib/data'
import { Card, Label, Btn, Avatar, Ico, I, page } from '../components/ui'
import Score from './Score'
import Paces from './Paces'
import Keypad from '../components/Keypad'

const BM = [
  { key: 'squat', name: 'Back squat 5RM', unit: 'kg', ph: '100' },
  { key: 'fivek', name: '5km time trial', time: true, ph: '27:00' },
  { key: 'ski',   name: '1,000m SkiErg',  time: true, ph: '4:20' },
  { key: 'row',   name: '1,000m Row',     time: true, ph: '3:55' },
  { key: 'bw',    name: 'Bodyweight',     unit: 'kg', ph: '80' },
]

// Me.
//
// Four things in descending order of how often anyone looks at them:
// who you are and what you're on for, your numbers, where to go from
// here, and the settings nobody opens twice.
export default function You({ userId, profile, benchmarks, setBenchmarks,
                              half, onUpdate, onCoaches, onRaces, onProgress,
                              onHalf }) {
  const [pad, setPad] = useState(null)
  const [score, setScore] = useState(null)
  const [tab, setTab] = useState('numbers')

  useEffect(() => { getMyScore(userId).then(setScore).catch(() => {}) },
    [userId, benchmarks, half?.total])

  const squat = benchmarks.squat?.value_num
  const bw = benchmarks.bw?.value_num
  const si = squat && bw ? squat / bw : null
  // A row that exists with a null value is not a test that's been
  // done. Counting it as done is what hid the bug above for a week.
  const has = b => {
    const v = benchmarks[b.key]
    return !!v && (b.time ? v.value_s != null : v.value_num != null)
  }
  const done = BM.filter(has).length

  async function save(b, v) {
    // saveBenchmark takes { num, secs } — passing { value_num } wrote
    // a null and the row came back blank while still counting as done.
    const row = await saveBenchmark(userId, b.key,
      b.time ? { secs: v } : { num: v })
    if (row) setBenchmarks({ ...benchmarks, [b.key]: row })
  }

  return (
    <div style={page}>

      {/* ---- who ---- */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
        <Avatar name={profile?.name || '?'} size={62} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ ...T.h1, fontSize: 23 }}>{profile?.name || 'You'}</div>
          <div style={{ ...T.small, marginTop: 4 }}>
            {profile?.race_division || 'Open'}
            {profile?.created_at &&
              ` · since ${new Date(profile.created_at)
                .toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}`}
          </div>
        </div>
      </div>

      {/* ---- the two numbers that matter ---- */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10,
        marginTop: 20 }}>
        <Card style={{ padding: 15 }}>
          <Label>SALUS SCORE</Label>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4,
            marginTop: 7 }}>
            <div style={{ fontSize: 31, fontWeight: 900, letterSpacing: '-.045em',
              lineHeight: 1, ...T.num,
              color: score?.overall ? C.ink : C.mute }}>
              {score?.overall ?? '—'}
            </div>
            {score?.overall && (
              <div style={{ fontSize: 14, fontWeight: 700, color: C.mute }}>
                /100
              </div>
            )}
          </div>
          <div style={{ fontSize: 11.5, color: C.mute, marginTop: 6 }}>
            {score?.tests ? `from ${score.tests} tests` : 'test to find out'}
          </div>
        </Card>

        <Card style={{ padding: 15 }}>
          <Label style={{ color: half?.projected ? C.g : C.mute }}>
            {half?.projected ? 'PROJECTED' : 'NO HALF YET'}
          </Label>
          <div style={{ fontSize: half?.projected ? 24 : 31, fontWeight: 900,
            letterSpacing: '-.045em', lineHeight: 1, marginTop: 7, ...T.num,
            color: half?.projected ? C.g : C.mute }}>
            {half?.projected ? hhmm(half.projected) : '—'}
          </div>
          <div style={{ fontSize: 11.5, color: C.mute, marginTop: 6 }}>
            {half?.projected ? 'at HYROX pace' : 'run the Salus Half'}
          </div>
        </Card>
      </div>

      {/* ---- numbers or paces ---- */}
      <div style={{ display: 'flex', background: C.card2, borderRadius: 999,
        padding: 4, marginTop: 22 }}>
        {[['numbers', `Tests ${done + (half?.total ? 1 : 0)}/6`], ['paces', 'Paces'],
          ['score', 'Score']].map(([k, l]) => {
          const on = tab === k
          return (
            <button key={k} onClick={() => setTab(k)}
              style={{ flex: 1, border: 'none', borderRadius: 999,
                padding: '10px 0', fontSize: 13.5, fontWeight: 700,
                cursor: 'pointer', fontFamily: F,
                background: on ? C.ink : 'transparent',
                color: on ? C.bg : C.sub }}>{l}</button>
          )
        })}
      </div>

      {tab === 'numbers' && (
        <>
          <Card style={{ padding: '3px 15px', marginTop: 14 }}>
            {BM.map((b, i) => {
              const v = benchmarks[b.key]
              const filled = has(b)
              return (
                <div key={b.key} onClick={() => setPad({ b,
                    value: filled ? (b.time ? v.value_s : v.value_num) : null })}
                  style={{ display: 'flex', alignItems: 'center', gap: 12,
                    padding: '15px 0', cursor: 'pointer',
                    borderTop: i ? `1px solid ${C.line}` : 'none' }}>
                  <div style={{ flex: 1, fontSize: 15.5,
                    fontWeight: filled ? 600 : 500,
                    color: filled ? C.ink : C.sub }}>{b.name}</div>
                  <div style={{ fontSize: 17, fontWeight: 800, ...T.num,
                    color: filled ? C.ink : C.mute }}>
                    {filled ? (b.time ? fmt(v.value_s) : v.value_num) : b.ph}
                    {filled && b.unit && (
                      <span style={{ fontSize: 12, color: C.sub,
                        marginLeft: 4 }}>{b.unit}</span>
                    )}
                  </div>
                  <Ico d={I.chev} s={13} c={C.mute} w={2} />
                </div>
              )
            })}

            {/* The half isn't a benchmark — it's a session, stored with
                its splits. But it's the sixth thing on the testing list
                and a member looking for it looks here, so it gets a row
                that opens the real thing. */}
            <div onClick={onHalf} style={{ display: 'flex',
              alignItems: 'center', gap: 12, padding: '15px 0',
              cursor: 'pointer', borderTop: `1px solid ${C.line}` }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15.5,
                  fontWeight: half?.total ? 600 : 500,
                  color: half?.total ? C.ink : C.sub }}>The Salus Half</div>
                <div style={{ ...T.small, fontSize: 12, marginTop: 3 }}>
                  {half?.total
                    ? 'Run it again any time — the newest one counts.'
                    : 'Four runs, four stations. Turns the estimate into a projection.'}
                </div>
              </div>
              <div style={{ fontSize: 17, fontWeight: 800, ...T.num,
                color: half?.total ? C.ink : C.mute }}>
                {half?.total ? fmt(half.total) : 'not yet'}
              </div>
              <Ico d={I.chev} s={13} c={C.mute} w={2} />
            </div>
          </Card>

          {si && (
            <Card style={{ marginTop: 10, background: C.card2 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14.5, fontWeight: 700 }}>
                    Strength index {si.toFixed(2)}×
                  </div>
                  <div style={{ ...T.small, fontSize: 12.5, marginTop: 3 }}>
                    Your squat as a multiple of what you weigh. Around 1.5 is
                    where the sleds stop being the problem.
                  </div>
                </div>
              </div>
            </Card>
          )}
        </>
      )}

      {tab === 'paces' && (
        <div style={{ marginTop: 14 }}>
          <Paces fivekSeconds={benchmarks?.fivek?.value_s} compact={false} />
          {!benchmarks?.fivek && (
            <Card style={{ marginTop: 4 }}>
              <div style={{ ...T.small }}>
                Put your 5km in and every pace in the block is worked out from it.
              </div>
            </Card>
          )}
        </div>
      )}

      {tab === 'score' && (
        <div style={{ marginTop: 14 }}>
          {score?.rows?.length
            ? <Score score={score} />
            : <Card><div style={{ ...T.small }}>
                Do the tests and this fills in — every one scored against a fixed
                standard, so it only moves when you do.
              </div></Card>}
        </div>
      )}

      {/* ---- where to go ---- */}
      <Label style={{ margin: '28px 0 11px' }}>YOUR TRAINING</Label>
      <Card style={{ padding: '3px 15px' }}>
        <Row icon={I.cal}   label="My races"
          sub="What's booked, and how the done ones went" onClick={onRaces} />
        <Row icon={I.chart} label="Progress"
          sub="Every movement, and whether it's going up" onClick={onProgress} top />
        <Row icon={I.msg}   label="Ask a coach"
          sub="Loads, swaps, a session you had to miss" onClick={onCoaches} top />
      </Card>

      {/* ---- settings ---- */}
      <Label style={{ margin: '28px 0 11px' }}>SETTINGS</Label>
      <Card style={{ padding: '3px 15px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 13,
          padding: '15px 0' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15.5, fontWeight: 600 }}>
              Show me on the board
            </div>
            <div style={{ ...T.small, fontSize: 12.5, marginTop: 3 }}>
              Your name and numbers, to everyone else training here.
            </div>
          </div>
          <button onClick={() => onUpdate({
              share_on_leaderboard: !profile?.share_on_leaderboard })}
            style={{ width: 46, height: 28, borderRadius: 999, border: 'none',
              flexShrink: 0, cursor: 'pointer', padding: 3, display: 'flex',
              justifyContent: profile?.share_on_leaderboard
                ? 'flex-end' : 'flex-start',
              background: profile?.share_on_leaderboard ? C.g : C.card3,
              transition: 'all .18s' }}>
            <div style={{ width: 22, height: 22, borderRadius: 999,
              background: profile?.share_on_leaderboard ? C.bg : C.mute }} />
          </button>
        </div>

        {profile?.role === 'admin' && (
          <Row icon={I.lock} label="Back office"
            sub="Write sessions, add photos, publish weeks" top
            onClick={() => { window.location.search = '?admin' }} />
        )}
      </Card>

      <button onClick={() => supabase.auth.signOut()}
        style={{ width: '100%', background: 'transparent', border: 'none',
          color: C.mute, fontSize: 14, fontWeight: 600, cursor: 'pointer',
          fontFamily: F, padding: '24px 0 0' }}>Sign out</button>

      {pad && (
        <Keypad label={pad.b.unit || 'time'} value={pad.value} time={pad.b.time}
          onClose={() => setPad(null)}
          onSave={v => { save(pad.b, v); setPad(null) }} />
      )}
    </div>
  )
}

const Row = ({ icon, label, sub, onClick, top }) => (
  <div onClick={onClick} style={{ display: 'flex', alignItems: 'center',
    gap: 13, padding: '15px 0', cursor: 'pointer',
    borderTop: top ? `1px solid ${C.line}` : 'none' }}>
    <Ico d={icon} s={17} c={C.sub} w={1.9} />
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 15.5, fontWeight: 600 }}>{label}</div>
      <div style={{ ...T.small, fontSize: 12.5, marginTop: 3 }}>{sub}</div>
    </div>
    <Ico d={I.chev} s={13} c={C.mute} w={2} />
  </div>
)
