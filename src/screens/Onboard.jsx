import { useState, useEffect } from 'react'
import { C, T, P } from '../lib/theme'
import { daysUntil } from '../lib/format'
import { Btn, Pill, Label, Card, Ico, I, Mark, page } from '../components/ui'

const QS = [
  { key: 'goal', q: 'What are you here for?', s: 'Pick the closest one', opts: [
    ['race',   'Get race ready for HYROX',      "There's a date and you want a time"],
    ['fit',    'Get fitter using the format',   'No race booked, the training appeals'],
    ['strong', 'Build strength and an engine',  'The race is a maybe'],
  ]},
  { key: 'exp', q: 'Have you raced before?', s: 'It changes how week one is written', opts: [
    ['never', 'This would be my first', "We'll teach the movements in week one"],
    ['once',  "I've done one or two",   "You know the stations, we'll test properly"],
    ['few',   'I race regularly',       'Straight in, full weights from day one'],
  ]},
  { key: 'days', q: 'How many days can you train?', s: 'Be honest — the plan bends to fit', opts: [
    ['3', 'Three',          'The two leg days and one run'],
    ['4', 'Four',           'Adds the compromised running session'],
    ['6', 'Five or six',    'The full block as written'],
  ]},
]

export const RACE_DAYS = [
  ['2026-12-02', 'Wed 2 Dec'], ['2026-12-03', 'Thu 3 Dec'],
  ['2026-12-04', 'Fri 4 Dec'], ['2026-12-05', 'Sat 5 Dec'],
  ['2026-12-06', 'Sun 6 Dec'],
]
export const DIVISIONS = ['Individual', 'Individual Pro', 'Doubles', 'Relay']

export default function Onboard({ onDone }) {
  const [step, setStep] = useState('name')
  const [qi, setQi] = useState(0)
  const [name, setName] = useState('')
  const [ans, setAns] = useState({})
  const [race, setRace] = useState({})

  useEffect(() => {
    if (step !== 'building') return
    const t = setTimeout(() => setStep('programme'), 1900)
    return () => clearTimeout(t)
  }, [step])

  const days = daysUntil(race.date || '2026-12-02')

  const Prog = ({ i, n, back }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 15, marginBottom: 26 }}>
      <button onClick={back} style={{ border: 'none', background: 'transparent',
        cursor: 'pointer', width: 28, height: 28, display: 'grid',
        placeItems: 'center', marginLeft: -5 }}>
        <Ico d={I.back} s={18} c={C.ink} w={2.2} />
      </button>
      <div style={{ flex: 1, height: 3, background: C.card2, borderRadius: 999,
        overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${((i + 1) / n) * 100}%`,
          background: C.g, borderRadius: 999, transition: 'width .3s' }} />
      </div>
      <div style={{ width: 20 }} />
    </div>
  )

  if (step === 'name') return (
    <div style={{ ...page, paddingTop: 80 }}>
      <h1 style={{ ...T.h1, textAlign: 'center' }}>What should we call you?</h1>
      <p style={{ ...T.body, textAlign: 'center', marginTop: 10 }}>
        Other members see this on the leaderboard.
      </p>
      <input value={name} onChange={e => setName(e.target.value)} autoFocus
        placeholder="First name"
        style={{ width: '100%', marginTop: 26, background: 'transparent', color: C.ink,
          border: `1.5px solid ${C.line}`, borderRadius: 999, padding: '18px',
          fontSize: 17, fontWeight: 600, outline: 'none', textAlign: 'center' }} />
      <Btn disabled={name.trim().length < 2} onClick={() => setStep('q')}
        style={{ marginTop: 20 }}>Continue</Btn>
    </div>
  )

  if (step === 'q') {
    const Q = QS[qi]
    return (
      <div style={{ ...page, paddingTop: 56 }}>
        <Prog i={qi} n={QS.length + 1} back={() => qi ? setQi(qi - 1) : setStep('name')} />
        <h1 style={{ ...T.h1, lineHeight: 1.15 }}>{Q.q}</h1>
        <p style={{ ...T.body, margin: '9px 0 22px' }}>{Q.s}</p>
        {Q.opts.map(([k, label, sub]) => (
          <Pill key={k} sub={sub} on={ans[Q.key] === k}
            onClick={() => {
              setAns({ ...ans, [Q.key]: k })
              setTimeout(() => qi < QS.length - 1 ? setQi(qi + 1) : setStep('race'), 190)
            }}>{label}</Pill>
        ))}
      </div>
    )
  }

  if (step === 'race') return (
    <div style={{ ...page, paddingTop: 56 }}>
      <Prog i={QS.length} n={QS.length + 1}
        back={() => { setStep('q'); setQi(QS.length - 1) }} />
      <h1 style={{ ...T.h1, lineHeight: 1.15 }}>Which day are you racing?</h1>
      <p style={{ ...T.body, margin: '9px 0 20px' }}>
        HYROX London runs across five days at ExCeL.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {RACE_DAYS.map(([d, label]) => {
          const on = race.date === d
          return (
            <button key={d} onClick={() => setRace({ ...race, date: d, label })}
              style={{ border: `1.5px solid ${on ? C.g : C.line}`, borderRadius: 14,
                padding: '15px 0', fontSize: 15, fontWeight: 700, cursor: 'pointer',
                fontFamily: 'inherit', background: on ? C.gDeep : 'transparent',
                color: on ? C.g : C.ink }}>{label}</button>
          )
        })}
      </div>

      <Label style={{ margin: '24px 0 11px' }}>DIVISION</Label>
      {DIVISIONS.map(d => (
        <Pill key={d} on={race.div === d}
          onClick={() => setRace({ ...race, div: d })}>{d}</Pill>
      ))}

      {race.date && (
        <Card style={{ marginTop: 8 }}>
          <Label style={{ color: C.g }}>THAT GIVES YOU</Label>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 5 }}>
            <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-.04em',
              ...T.num }}>{days}</div>
            <div style={{ fontSize: 14.5, fontWeight: 700, color: C.sub }}>
              days · {Math.floor(days / 7)} weeks
            </div>
          </div>
        </Card>
      )}

      <Btn disabled={!race.date || !race.div} onClick={() => setStep('building')}
        style={{ marginTop: 20 }}>Continue</Btn>
    </div>
  )

  if (step === 'building') return (
    <div style={{ height: '100dvh', display: 'grid', placeItems: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ animation: 'spin 2.4s linear infinite', display: 'inline-block' }}>
          <Mark s={42} />
        </div>
        <div style={{ fontSize: 18, fontWeight: 700, marginTop: 20,
          letterSpacing: '-.02em' }}>Building your block</div>
        <div style={{ ...T.body, marginTop: 7 }}>
          Eight weeks, back from {race.label}
        </div>
      </div>
    </div>
  )

  if (step === 'programme') return (
    <div style={{ ...page, paddingTop: 56 }}>
      <Label style={{ color: C.g }}>YOUR PROGRAMME</Label>
      <h1 style={{ ...T.h1, fontSize: 32, marginTop: 10 }}>Road to HYROX</h1>
      <p style={{ ...T.body, marginTop: 6 }}>
        Eight weeks · {ans.days === '3' ? 'three' : ans.days === '4' ? 'four' : 'six'} sessions
        a week · ends {race.label}
      </p>
      <p style={{ ...T.body, color: C.ink, marginTop: 18 }}>
        Two leg days, three runs and the Engine Room every Friday. The first week is
        testing — five numbers that set every weight and every pace for the seven weeks
        after it.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1,
        marginTop: 20, background: C.line, borderRadius: 14, overflow: 'hidden' }}>
        {[['8', 'weeks'], ['5', 'tests'], [String(days), 'days to go']].map(([v, l]) => (
          <div key={l} style={{ background: C.card, padding: '14px 12px' }}>
            <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-.03em',
              ...T.num }}>{v}</div>
            <div style={{ fontSize: 12.5, color: C.sub, marginTop: 3 }}>{l}</div>
          </div>
        ))}
      </div>

      <Label style={{ margin: '24px 0 10px' }}>THE PHASES</Label>
      <Card style={{ padding: '3px 15px' }}>
        {[['1', 'Test week', 'Five measurements'],
          ['2–3', 'Foundation', 'Groove the movements'],
          ['4–5', 'Build', 'Heaviest weeks of the block'],
          ['6–7', 'Sharpen', 'Half sim, then the full one'],
          ['8', 'Taper and re-test', 'Volume halves, then you race']].map(([w, t, d], i) => (
          <div key={t} style={{ display: 'flex', gap: 13, padding: '13px 0',
            borderTop: i ? `1px solid ${C.line}` : 'none' }}>
            <div style={{ width: 34, fontSize: 12.5, fontWeight: 800, color: C.mute }}>{w}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 700 }}>{t}</div>
              <div style={{ fontSize: 13, color: C.sub, marginTop: 2 }}>{d}</div>
            </div>
          </div>
        ))}
      </Card>

      <Btn onClick={() => setStep('testweek')} style={{ marginTop: 22 }}>
        Start the block
      </Btn>
    </div>
  )

  // test week primer
  return (
    <div style={{ ...page, paddingTop: 56 }}>
      <Label style={{ color: C.g }}>WEEK ONE</Label>
      <h1 style={{ ...T.h1, marginTop: 9, lineHeight: 1.15 }}>
        This week you're being measured, not trained
      </h1>
      <p style={{ ...T.body, marginTop: 11 }}>
        Four days, five numbers. Everything after this is calculated from them — so give
        each one a real effort, and don't stack them.
      </p>

      <div style={{ marginTop: 20 }}>
        {[['Mon', 'Back squat 5RM', 'Sets every leg weight for seven weeks'],
          ['Tue', 'The Salus Half', '4km and all eight stations at half volume'],
          ['Thu', '1k ski and 1k row', 'Your erg pacing'],
          ['Sat', '5km time trial', 'Every running pace in the block']].map(([d, t, s], i) => (
          <div key={t} style={{ display: 'flex', gap: 13, alignItems: 'flex-start' }}>
            <div style={{ width: 22, display: 'flex', flexDirection: 'column',
              alignItems: 'center', flexShrink: 0 }}>
              <div style={{ width: 10, height: 10, borderRadius: 999, marginTop: 15,
                background: i === 1 ? C.g : C.card3,
                border: i === 1 ? 'none' : `1.5px solid ${C.line}` }} />
              {i < 3 && <div style={{ width: 1.5, flex: 1, background: C.line,
                marginTop: 5, marginBottom: -6, minHeight: 32 }} />}
            </div>
            <Card style={{ flex: 1, marginBottom: 10, padding: '13px 14px',
              border: `1px solid ${i === 1 ? C.gLine : 'transparent'}` }}>
              <Label style={{ color: i === 1 ? C.g : C.mute }}>{d.toUpperCase()}</Label>
              <div style={{ fontSize: 16.5, fontWeight: 800, letterSpacing: '-.025em',
                marginTop: 4 }}>{t}</div>
              <div style={{ fontSize: 13, color: C.sub, marginTop: 3, lineHeight: 1.45 }}>{s}</div>
            </Card>
          </div>
        ))}
      </div>

      <Card style={{ background: C.card2, marginTop: 4 }}>
        <div style={{ ...T.body, fontSize: 13.5 }}>
          <b style={{ color: C.ink }}>Tuesday is the one that matters.</b> Half of everything
          at full race weight, on one clock. Doubled, it's your projected finish — and it
          names the station costing you most.
        </div>
      </Card>

      <Btn style={{ marginTop: 22 }} onClick={() => onDone({
        name: name.trim(),
        race_date: race.date,
        race_division: race.div,
      })}>I'm ready</Btn>
    </div>
  )
}
