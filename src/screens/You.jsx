import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { C, T, F } from '../lib/theme'
import { fmt, hhmm } from '../lib/format'
import { saveBenchmark, getMyScore, setPhoto,
         getAerobicZone, setBirthYear } from '../lib/data'
import { Card, Label, Btn, Avatar, Ico, I, page } from '../components/ui'
import Paces from './Paces'
import Pillars from './Pillars'
import Keypad from '../components/Keypad'

const BM = [
  { key: 'bw',       name: 'Bodyweight',         unit: 'kg', ph: '80' },
  { key: 'squat',    name: 'Back squat 3RM',     unit: 'kg', ph: '110' },
  { key: 'deadlift', name: 'Deadlift 5RM',       unit: 'kg', ph: '130' },
  { key: 'press',    name: 'Shoulder press 1RM', unit: 'kg', ph: '60' },
  { key: 'fivek',    name: '5km',                time: true, ph: '24:00' },
  { key: 'ski',      name: '1,000m SkiErg',      time: true, ph: '4:00' },
  { key: 'row',      name: '1,000m Row',         time: true, ph: '3:45' },
  { key: 'wallball', name: 'Wall balls unbroken', unit: 'reps', ph: '50' },
]

// Me.
//
// Laid out the way a settings screen should be: who you are at the
// top, then labelled sections you can scan rather than one long list
// where a toggle and a benchmark look the same.
export default function You({ userId, profile, benchmarks, setBenchmarks,
                              half, onUpdate, onCoaches, onRaces, onProgress,
                              onHalf, onBlocks }) {
  const [pad, setPad] = useState(null)
  const [score, setScore] = useState(null)
  const [zone, setZone] = useState(null)
  const [tab, setTab] = useState('numbers')
  const [busy, setBusy] = useState(false)

  const has = b => {
    const v = benchmarks[b.key]
    return !!v && (b.time ? v.value_s != null : v.value_num != null)
  }
  const done = BM.filter(has).length

  const bmKey = BM.map(b => {
    const v = benchmarks[b.key]
    return v ? (b.time ? v.value_s : v.value_num) : ''
  }).join('|')

  useEffect(() => { getMyScore(userId).then(setScore).catch(() => {}) },
    [userId, bmKey, half?.total])
  useEffect(() => { getAerobicZone(userId).then(setZone).catch(() => {}) },
    [userId, profile?.birth_year])

  const squat = benchmarks.squat?.value_num
  const bw = benchmarks.bw?.value_num
  const si = squat && bw ? squat / bw : null

  async function save(b, v) {
    const row = await saveBenchmark(userId, b.key,
      b.time ? { secs: v } : { num: v })
    if (row) setBenchmarks({ ...benchmarks, [b.key]: row })
  }

  async function pickPhoto(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || file.size > 8 * 1024 * 1024) return
    setBusy(true)
    try {
      const name = `avatars/${userId}.jpg`
      await supabase.storage.from('Photos')
        .upload(name, file, { upsert: true, cacheControl: '60' })
      const url = supabase.storage.from('Photos')
        .getPublicUrl(name).data.publicUrl + '?v=' + Date.now()
      await setPhoto(userId, url)
      onUpdate({ photo_url: url })
    } catch (_) {}
    setBusy(false)
  }

  return (
    <div style={page}>

      {/* ---- who ---- */}
      <div style={{ textAlign: 'center' }}>
        <label style={{ position: 'relative', display: 'inline-block',
          cursor: 'pointer', opacity: busy ? .5 : 1 }}>
          <Avatar name={profile?.name || '?'} size={92}
            photo={profile?.photo_url} />
          <div style={{ position: 'absolute', bottom: 2, right: 2,
            width: 30, height: 30, borderRadius: 999, background: C.card3,
            display: 'grid', placeItems: 'center',
            border: `3px solid ${C.bg}` }}>
            <Ico d={I.camera} s={14} c={C.ink} w={2} />
          </div>
          <input type="file" accept="image/*" onChange={pickPhoto}
            style={{ position: 'absolute', width: 1, height: 1, opacity: 0 }} />
        </label>

        <div style={{ ...T.h1, fontSize: 26, marginTop: 14 }}>
          {profile?.name || 'You'}
        </div>
        <div style={{ ...T.small, marginTop: 4 }}>
          {profile?.email || ''}
        </div>

        <div style={{ display: 'flex', gap: 9, justifyContent: 'center',
          marginTop: 16 }}>
          <Pill onClick={onBlocks}>
            {profile?.programme_name || 'My block'}
          </Pill>
          <Pill onClick={onRaces}>My races</Pill>
        </div>
      </div>

      {/* ---- where you're at ---- */}
      <Section title="WHERE YOU'RE AT" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
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

      {/* ---- the numbers ---- */}
      <Section title="YOUR NUMBERS" />
      <div style={{ display: 'flex', background: C.card2, borderRadius: 999,
        padding: 4 }}>
        {[['numbers', `Tests ${done + (half?.total ? 1 : 0)}/9`],
          ['paces', 'Paces'], ['score', 'Where to work']].map(([k, l]) => {
          const on = tab === k
          return (
            <button key={k} onClick={() => setTab(k)}
              style={{ flex: 1, border: 'none', borderRadius: 999,
                padding: '10px 0', fontSize: 13, fontWeight: 700,
                cursor: 'pointer', fontFamily: F,
                background: on ? C.ink : 'transparent',
                color: on ? C.bg : C.sub }}>{l}</button>
          )
        })}
      </div>

      {tab === 'numbers' && (
        <>
          <Card style={{ padding: '3px 15px', marginTop: 12 }}>
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

            <div onClick={onHalf} style={{ display: 'flex',
              alignItems: 'center', gap: 12, padding: '15px 0',
              cursor: 'pointer', borderTop: `1px solid ${C.line}` }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15.5,
                  fontWeight: half?.total ? 600 : 500,
                  color: half?.total ? C.ink : C.sub }}>The Salus Half</div>
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
              <div style={{ fontSize: 14.5, fontWeight: 700 }}>
                Strength index {si.toFixed(2)}×
              </div>
              <div style={{ ...T.small, fontSize: 12.5, marginTop: 3 }}>
                Your squat as a multiple of what you weigh. Around 1.5 is
                where the sleds stop being the problem.
              </div>
            </Card>
          )}
        </>
      )}

      {tab === 'paces' && (
        <div style={{ marginTop: 12 }}>
          <Card>
            <Label>YOUR AEROBIC ZONE</Label>
            {zone ? (
              <>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8,
                  marginTop: 8 }}>
                  <div style={{ fontSize: 30, fontWeight: 900,
                    letterSpacing: '-.045em', ...T.num, color: C.g }}>
                    {zone.low}–{zone.high}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.sub }}>
                    bpm
                  </div>
                </div>
                <div style={{ ...T.small, fontSize: 12.5, marginTop: 8,
                  lineHeight: 1.55 }}>
                  180 minus {zone.age}, five beats either side. Ten in the
                  heat. Every easy run sits in here — if you can't hold a
                  conversation, walk until you can.
                </div>
              </>
            ) : (
              <>
                <div style={{ ...T.small, marginTop: 8, lineHeight: 1.55 }}>
                  Your easy runs are set by heart rate, not pace. One number
                  and the app can work it out.
                </div>
                <input inputMode="numeric" placeholder="Birth year, e.g. 1991"
                  onKeyDown={async e => {
                    if (e.key !== 'Enter') return
                    const y = Number(e.currentTarget.value)
                    if (y > 1920 && y < 2015) {
                      await setBirthYear(userId, y)
                      onUpdate({ birth_year: y })
                      getAerobicZone(userId).then(setZone)
                    }
                  }}
                  style={{ width: '100%', background: C.card2, color: C.ink,
                    border: `1px solid ${C.line}`, borderRadius: 12,
                    padding: '13px 15px', fontSize: 16, outline: 'none',
                    fontFamily: F, marginTop: 14 }} />
              </>
            )}
          </Card>
          <div style={{ marginTop: 12 }}>
            <Paces fivekSeconds={benchmarks?.fivek?.value_s} compact={false} />
          </div>
        </div>
      )}

      {tab === 'score' && (
        <div style={{ marginTop: 12 }}>
          <Pillars userId={userId} />
        </div>
      )}

      {/* ---- training ---- */}
      <Section title="TRAINING" />
      <Card style={{ padding: '3px 15px' }}>
        <Row icon={I.chart} label="Progress"
          sub="Every movement, and whether it's going up" onClick={onProgress} />
        <Row icon={I.msg} label="Ask a coach"
          sub="Loads, swaps, a session you had to miss" onClick={onCoaches} top />
      </Card>

      {/* ---- display ---- */}
      <Section title="DISPLAY" />
      <Card style={{ padding: '3px 15px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 13,
          padding: '15px 0' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15.5, fontWeight: 600 }}>Units</div>
            <div style={{ ...T.small, fontSize: 12.5, marginTop: 3 }}>
              Showing {profile?.units === 'imperial'
                ? 'lb and miles' : 'kg and km'}
            </div>
          </div>
          <Segment value={profile?.units || 'metric'}
            options={[['metric', 'Metric'], ['imperial', 'Imperial']]}
            onChange={v => onUpdate({ units: v })} />
        </div>

        <Toggle top label="Keep the screen on"
          sub="Stops your phone sleeping between sets. You'll still be able to lock it yourself."
          on={profile?.keep_awake !== false}
          onChange={v => onUpdate({ keep_awake: v })} />

        <Toggle top label="Timer sounds"
          sub="A beep at the end of a round. Right in an empty gym, less so in a class."
          on={!!profile?.timer_sounds}
          onChange={v => onUpdate({ timer_sounds: v })} />
      </Card>

      {/* ---- account ---- */}
      <Section title="ACCOUNT" />
      <Card style={{ padding: '3px 15px' }}>
        <Toggle label="Show me on the board"
          sub="Your name and your numbers, to everyone else training here."
          on={!!profile?.share_on_leaderboard}
          onChange={v => onUpdate({ share_on_leaderboard: v })} />

        {profile?.role === 'admin' && (
          <Row icon={I.lock} label="Back office"
            sub="Write sessions, add photos, publish weeks" top
            onClick={() => { window.location.search = '?admin' }} />
        )}
      </Card>

      <button onClick={() => supabase.auth.signOut()}
        style={{ width: '100%', background: 'transparent', border: 'none',
          color: C.mute, fontSize: 14, fontWeight: 600, cursor: 'pointer',
          fontFamily: F, padding: '26px 0 0' }}>Sign out</button>

      {pad && (
        <Keypad label={pad.b.unit || 'time'} value={pad.value} time={pad.b.time}
          onClose={() => setPad(null)}
          onSave={v => { save(pad.b, v); setPad(null) }} />
      )}
    </div>
  )
}

const Section = ({ title }) => (
  <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.14em',
    color: C.mute, margin: '30px 0 11px' }}>{title}</div>
)

const Pill = ({ children, onClick }) => (
  <button onClick={onClick} style={{ background: 'transparent',
    border: `1px solid ${C.line}`, borderRadius: 999, padding: '11px 20px',
    fontSize: 14, fontWeight: 600, color: C.ink, cursor: 'pointer',
    fontFamily: F, maxWidth: 170, overflow: 'hidden',
    textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{children}</button>
)

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

const Toggle = ({ label, sub, on, onChange, top }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 13,
    padding: '15px 0', borderTop: top ? `1px solid ${C.line}` : 'none' }}>
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 15.5, fontWeight: 600 }}>{label}</div>
      <div style={{ ...T.small, fontSize: 12.5, marginTop: 3,
        lineHeight: 1.5 }}>{sub}</div>
    </div>
    <button onClick={() => onChange(!on)}
      style={{ width: 46, height: 28, borderRadius: 999, border: 'none',
        flexShrink: 0, cursor: 'pointer', padding: 3, display: 'flex',
        justifyContent: on ? 'flex-end' : 'flex-start',
        background: on ? C.g : C.card3, transition: 'all .18s' }}>
      <div style={{ width: 22, height: 22, borderRadius: 999,
        background: on ? C.bg : C.mute }} />
    </button>
  </div>
)

const Segment = ({ value, options, onChange }) => (
  <div style={{ display: 'flex', background: C.card2, borderRadius: 999,
    padding: 3, flexShrink: 0 }}>
    {options.map(([k, l]) => {
      const on = value === k
      return (
        <button key={k} onClick={() => onChange(k)}
          style={{ border: 'none', borderRadius: 999, padding: '8px 14px',
            fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: F,
            background: on ? C.card3 : 'transparent',
            color: on ? C.ink : C.mute }}>{l}</button>
      )
    })}
  </div>
)
