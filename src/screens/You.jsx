import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { C, T } from '../lib/theme'
import { fmt, hhmm, toSecs, daysUntil } from '../lib/format'
import { saveBenchmark, getMyScore } from '../lib/data'
import { Card, Label, Btn, Avatar, Ico, I, page } from '../components/ui'
import Empty from '../components/Empty'
import { RACE_DAYS, DIVISIONS } from './Onboard'
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

export default function You({ userId, profile, benchmarks, setBenchmarks,
                              half, onUpdate, onCoaches, onRaces }) {
  const [pad, setPad] = useState(null)
  const [editRace, setEditRace] = useState(false)
  const [score, setScore] = useState(null)

  useEffect(() => { getMyScore(userId).then(setScore).catch(() => {}) },
    [userId, benchmarks, half?.total])

  const squat = benchmarks.squat?.value_num
  const bw = benchmarks.bw?.value_num
  const si = squat && bw ? squat / bw : null
  const days = daysUntil(profile?.race_date)

  const show = b => {
    const m = benchmarks[b.key]
    if (!m) return null
    return b.time ? fmt(m.value_s) : `${m.value_num} ${b.unit}`
  }

  async function save(b, raw) {
    const v = String(raw).trim()
    if (!v) return
    const row = await saveBenchmark(userId, b.key, {
      num: b.time ? null : Number(v),
      secs: b.time ? toSecs(v) : null,
    }).catch(console.error)
    if (row) setBenchmarks({ ...benchmarks, [b.key]: row })
  }

  return (
    <div style={page}>
      <h1 style={T.h1}>You</h1>

      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 18 }}>
        <Avatar name={profile?.name} size={54} />
        <div>
          <div style={{ fontSize: 19, fontWeight: 800,
            letterSpacing: '-.025em' }}>{profile?.name || 'Member'}</div>
          <div style={{ ...T.body, fontSize: 13.5, marginTop: 2 }}>
            {profile?.race_date
              ? `Racing ${RACE_DAYS.find(d => d[0] === profile.race_date)?.[1]} · ${days} days`
              : 'No race set'}
          </div>
        </div>
      </div>

      {!half?.projected && Object.keys(benchmarks).length === 0 && (
        <div style={{ marginTop: 22 }}>
          <Empty icon={I.target}
            title="Nothing measured yet"
            body="Week one is five tests. Put the numbers in as you do them and every weight and pace in the block calculates itself." />
        </div>
      )}

      {half?.projected && (
        <Card style={{ marginTop: 20, border: `1px solid ${C.gLine}` }}>
          <Label style={{ color: C.g }}>PROJECTED FINISH</Label>
          <div style={{ fontSize: 38, fontWeight: 900, letterSpacing: '-.05em',
            lineHeight: 1, marginTop: 6, ...T.num }}>{hhmm(half.projected)}</div>
          <div style={{ ...T.body, fontSize: 13.5, marginTop: 7 }}>
            From your week 1 half of {hhmm(half.total)}
          </div>
        </Card>
      )}

      {score?.rows?.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <Score score={score} />
        </div>
      )}

      <Label style={{ margin: '26px 0 11px' }}>YOUR BENCHMARKS</Label>
      <Card style={{ padding: '3px 15px' }}>
        {BM.map((b, i) => (
          <div key={b.key} onClick={() => setPad({ b, value: show(b) || '' })}
            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 0',
              borderTop: i ? `1px solid ${C.line}` : 'none', cursor: 'pointer' }}>
            <div style={{ flex: 1, fontSize: 15.5, fontWeight: 600 }}>{b.name}</div>
            <div style={{ fontSize: 16.5, fontWeight: 800, ...T.num,
              color: show(b) ? C.ink : C.mute }}>{show(b) || b.ph}</div>
            <Ico d={I.chev} s={14} c={C.mute} w={2} />
          </div>
        ))}
      </Card>

      {si && (
        <Card style={{ marginTop: 12, border: `1px solid ${C.gLine}` }}>
          <Label style={{ color: C.g }}>STRENGTH INDEX</Label>
          <div style={{ fontSize: 32, fontWeight: 900, letterSpacing: '-.04em',
            marginTop: 5, ...T.num }}>{si.toFixed(2)}×</div>
          <div style={{ ...T.body, fontSize: 13.5, marginTop: 6 }}>
            Your squat over your bodyweight. Every sled, carry and lunge in the block is
            scored off this.
          </div>
        </Card>
      )}

      <Label style={{ margin: '26px 0 11px' }}>LEADERBOARD</Label>
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15.5, fontWeight: 600 }}>Share my time</div>
            <div style={{ ...T.body, fontSize: 13, marginTop: 3 }}>
              Your name and projected finish become visible to other members.
            </div>
          </div>
          <button onClick={() => onUpdate({
            share_on_leaderboard: !profile?.share_on_leaderboard
          })} style={{
            width: 50, height: 30, borderRadius: 999, border: 'none', flexShrink: 0,
            cursor: 'pointer', padding: 3, display: 'flex',
            justifyContent: profile?.share_on_leaderboard ? 'flex-end' : 'flex-start',
            background: profile?.share_on_leaderboard ? C.g : C.card3,
            transition: 'all .2s',
          }}>
            <div style={{ width: 24, height: 24, borderRadius: 999,
              background: profile?.share_on_leaderboard ? C.bg : C.mute }} />
          </button>
        </div>
      </Card>

      <Label style={{ margin: '26px 0 11px' }}>RACE</Label>
      <Card onClick={() => setEditRace(!editRace)}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ flex: 1, fontSize: 15.5, fontWeight: 600 }}>
            {profile?.race_date
              ? `${RACE_DAYS.find(d => d[0] === profile.race_date)?.[1]} · ${profile.race_division || 'No division'}`
              : 'Set your race day'}
          </div>
          <Ico d={I.chev} s={14} c={C.mute} w={2} />
        </div>
      </Card>

      {editRace && (
        <div style={{ marginTop: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}>
            {RACE_DAYS.map(([d, label]) => {
              const on = profile?.race_date === d
              return (
                <button key={d} onClick={() => onUpdate({ race_date: d })}
                  style={{ border: `1.5px solid ${on ? C.g : C.line}`, borderRadius: 13,
                    padding: '13px 0', fontSize: 14.5, fontWeight: 700,
                    cursor: 'pointer', fontFamily: 'inherit',
                    background: on ? C.gDeep : 'transparent',
                    color: on ? C.g : C.ink }}>{label}</button>
              )
            })}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
            {DIVISIONS.map(d => {
              const on = profile?.race_division === d
              return (
                <button key={d} onClick={() => onUpdate({ race_division: d })}
                  style={{ border: `1.5px solid ${on ? C.g : C.line}`, borderRadius: 999,
                    padding: '11px 15px', fontSize: 14, fontWeight: 700,
                    cursor: 'pointer', fontFamily: 'inherit',
                    background: on ? C.gDeep : 'transparent',
                    color: on ? C.g : C.ink }}>{d}</button>
              )
            })}
          </div>
        </div>
      )}

      <Paces fivekSeconds={benchmarks?.fivek?.value_s} />

      <Label style={{ margin: '26px 0 11px' }}>RACES</Label>
      <Card onClick={onRaces}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15.5, fontWeight: 600 }}>My races</div>
            <div style={{ ...T.small, marginTop: 3 }}>
              What's booked, and how the ones you've done went.
            </div>
          </div>
          <Ico d={I.chev} s={14} c={C.mute} w={2} />
        </div>
      </Card>

      <Label style={{ margin: '26px 0 11px' }}>COACHES</Label>
      <Card onClick={onCoaches}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15.5, fontWeight: 600 }}>Message a coach</div>
            <div style={{ ...T.small, marginTop: 3 }}>
              Loads, swaps, a session you had to miss.
            </div>
          </div>
          <Ico d={I.chev} s={14} c={C.mute} w={2} />
        </div>
      </Card>

      {profile?.role === 'admin' && (
        <>
          <Paces fivekSeconds={benchmarks?.fivek?.value_s} />

      <Label style={{ margin: '26px 0 11px' }}>RACES</Label>
      <Card onClick={onRaces}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15.5, fontWeight: 600 }}>My races</div>
            <div style={{ ...T.small, marginTop: 3 }}>
              What's booked, and how the ones you've done went.
            </div>
          </div>
          <Ico d={I.chev} s={14} c={C.mute} w={2} />
        </div>
      </Card>

      <Label style={{ margin: '26px 0 11px' }}>COACHES</Label>
          <Card onClick={() => { window.location.search = '?admin' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15.5, fontWeight: 600 }}>Back office</div>
                <div style={{ ...T.body, fontSize: 13, marginTop: 3 }}>
                  Write sessions, add photos, publish weeks.
                </div>
              </div>
              <Ico d={I.chev} s={14} c={C.mute} w={2} />
            </div>
          </Card>
        </>
      )}

      <Btn tone="soft" style={{ marginTop: 18 }}
        onClick={() => supabase.auth.signOut()}>Sign out</Btn>

      {pad && (
        <Keypad label={pad.b.unit || 'time'} value={pad.value} time={pad.b.time}
          onClose={() => setPad(null)}
          onSave={v => { save(pad.b, v); setPad(null) }} />
      )}
    </div>
  )
}
