import { useState, useEffect, useRef } from 'react'
import { C, T, F } from '../lib/theme'
import { getCoaches, getMessages, sendMessage } from '../lib/data'
import { Card, Label, Btn, Avatar, Back, Ico, I, Chip, page } from '../components/ui'

export default function Coaches({ userId, profile, onBack }) {
  const [coaches, setCoaches] = useState([])
  const [msgs, setMsgs] = useState({})
  const [view, setView] = useState({ screen: 'list' })

  useEffect(() => {
    getCoaches().then(setCoaches)
    getMessages(userId).then(setMsgs)
  }, [userId])

  async function send(coachId, body) {
    const row = await sendMessage(userId, coachId, body).catch(console.error)
    if (row) setMsgs({ ...msgs, [coachId]: [...(msgs[coachId] || []), row] })
  }

  if (view.screen === 'thread') return (
    <Thread coach={view.coach} messages={msgs[view.coach.id] || []}
      onSend={body => send(view.coach.id, body)}
      onBack={() => setView({ screen: 'profile', coach: view.coach })} />
  )

  if (view.screen === 'profile') {
    const c = view.coach
    return (
      <div style={page}>
        <Back onClick={() => setView({ screen: 'list' })} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 15, marginTop: 20 }}>
          <Avatar name={c.name} tint={c.tint} size={68} />
          <div>
            <div style={{ ...T.h1, fontSize: 23 }}>{c.name}</div>
            <div style={{ ...T.body, fontSize: 13.5, marginTop: 3 }}>{c.role}</div>
          </div>
        </div>
        <p style={{ ...T.body, color: C.ink, marginTop: 18 }}>{c.bio}</p>
        <div style={{ display: 'flex', gap: 8, marginTop: 15, flexWrap: 'wrap' }}>
          {(c.spec || []).map(s => <Chip key={s}>{s}</Chip>)}
        </div>
        <Btn style={{ marginTop: 22 }}
          onClick={() => setView({ screen: 'thread', coach: c })}>
          Message {c.name}
        </Btn>
        <div style={{ textAlign: 'center', fontSize: 12.5, color: C.mute, marginTop: 9 }}>
          {c.replies}
        </div>
      </div>
    )
  }

  return (
    <div style={page}>
      <Back onClick={onBack} />
      <h1 style={{ ...T.h1, marginTop: 20 }}>Coaches</h1>
      <p style={{ ...T.body, marginTop: 5 }}>Message any of the team directly.</p>
      <div style={{ marginTop: 18 }}>
        {coaches.map(c => {
          const th = msgs[c.id] || []
          const last = th[th.length - 1]
          return (
            <Card key={c.id} onClick={() => setView({ screen: 'profile', coach: c })}
              style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 13 }}>
              <Avatar name={c.name} tint={c.tint} size={46} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 16.5, fontWeight: 800,
                  letterSpacing: '-.02em' }}>{c.name}</div>
                <div style={{ fontSize: 12.5, color: C.sub, marginTop: 2,
                  overflow: 'hidden', textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap' }}>{c.role}</div>
                {last && (
                  <div style={{ fontSize: 12.5, color: C.mute, marginTop: 4,
                    overflow: 'hidden', textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap' }}>
                    {last.from_member ? 'You: ' : ''}{last.body}
                  </div>
                )}
              </div>
              <Ico d={I.chev} s={15} c={C.mute} w={2.2} />
            </Card>
          )
        })}
      </div>
      <div style={{ fontSize: 12.5, color: C.mute, marginTop: 6, lineHeight: 1.5 }}>
        Private between you and that coach. For anything urgent, catch them in the room.
      </div>
    </div>
  )
}

function Thread({ coach, messages, onSend, onBack }) {
  const [txt, setTxt] = useState('')
  const end = useRef(null)
  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages.length])

  const go = () => { const v = txt.trim(); if (!v) return; onSend(v); setTxt('') }

  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flexShrink: 0, borderBottom: `1px solid ${C.line}`,
        padding: '46px 16px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <Back onClick={onBack} />
        <div style={{ flex: 1 }} />
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 15.5, fontWeight: 800,
            letterSpacing: '-.02em' }}>{coach.name}</div>
          <div style={{ fontSize: 12, color: C.mute }}>{(coach.role || '').split(' ')[0]}</div>
        </div>
        <Avatar name={coach.name} tint={coach.tint} size={36} />
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 10px' }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', padding: '36px 20px' }}>
            <Avatar name={coach.name} tint={coach.tint} size={60} />
            <div style={{ fontSize: 17.5, fontWeight: 800, marginTop: 13 }}>{coach.name}</div>
            <div style={{ ...T.body, fontSize: 13.5, marginTop: 6 }}>
              {coach.replies}. Ask about anything in the plan — loads, swaps, a session you
              had to miss.
            </div>
          </div>
        )}
        {messages.map(m => (
          <div key={m.id} style={{ display: 'flex',
            justifyContent: m.from_member ? 'flex-end' : 'flex-start', marginBottom: 9 }}>
            <div style={{ maxWidth: '80%' }}>
              <div style={{ background: m.from_member ? C.ink : C.card,
                color: m.from_member ? C.bg : C.ink,
                borderRadius: m.from_member ? '17px 17px 5px 17px' : '17px 17px 17px 5px',
                padding: '11px 14px', fontSize: 14.5, lineHeight: 1.45, fontWeight: 500 }}>
                {m.body}
              </div>
              <div style={{ fontSize: 11, color: C.mute, marginTop: 4,
                textAlign: m.from_member ? 'right' : 'left' }}>
                {new Date(m.created_at).toLocaleTimeString('en-GB',
                  { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}
        <div ref={end} />
      </div>

      <div style={{ flexShrink: 0, borderTop: `1px solid ${C.line}`, background: C.bg,
        padding: '10px 14px calc(13px + env(safe-area-inset-bottom))', display: 'flex',
        alignItems: 'flex-end', gap: 9 }}>
        <input value={txt} onChange={e => setTxt(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && go()}
          placeholder={`Message ${coach.name}…`}
          style={{ flex: 1, background: C.card2, border: `1px solid ${C.line}`,
            borderRadius: 999, padding: '13px 17px', fontSize: 14.5, color: C.ink,
            outline: 'none', fontFamily: F }} />
        <button onClick={go} disabled={!txt.trim()} style={{ width: 44, height: 44,
          borderRadius: 999, border: 'none', flexShrink: 0,
          background: txt.trim() ? C.g : C.card2, display: 'grid', placeItems: 'center',
          cursor: txt.trim() ? 'pointer' : 'default' }}>
          <Ico d={I.send} s={17} c={txt.trim() ? C.bg : C.mute} w={2} />
        </button>
      </div>
    </div>
  )
}
