import { useState, useEffect, useRef } from 'react'
import { C, T, F, FLOAT } from '../lib/theme'
import { supabase } from '../lib/supabase'
import { getChat, postToRoom, removeMessage, onNewMessage,
         getNotices, getRoomMembers, joinRoom, getCoaches } from '../lib/data'
import { Avatar, Ico, I, Sheet, Btn } from '../components/ui'
import Img from '../components/Img'

const when = d => {
  const t = new Date(d)
  const mins = Math.floor((Date.now() - t) / 60000)
  if (mins < 1) return 'now'
  if (mins < 60) return `${mins}m`
  return t.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

const sameDay = (a, b) =>
  new Date(a).toDateString() === new Date(b).toDateString()

const dayLabel = d => {
  const t = new Date(d), now = new Date()
  const diff = Math.floor((now - t) / 86400000)
  if (sameDay(d, now)) return 'Today'
  if (diff < 2) return 'Yesterday'
  return t.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric',
    month: 'short' })
}

// One room, everyone in it.
//
// The WhatsApp group already exists and works. The only reason to have
// this instead is that it sits next to the training — a question about
// Monday's loads is asked in the same place Monday's loads live.
//
// Notices are pinned above it and kept deliberately small. They're the
// things that need to still be true tomorrow; the chat is everything
// else, and it should look like everything else.
export default function Community({ profile, userId, onCoach }) {
  const [msgs, setMsgs] = useState([])
  const [notices, setNotices] = useState([])
  const [text, setText] = useState('')
  const [ready, setReady] = useState(false)
  const [busy, setBusy] = useState(false)
  const [open, setOpen] = useState(null)
  const [notice, setNotice] = useState(null)
  const [members, setMembers] = useState([])
  const [here, setHere] = useState([])
  const [who, setWho] = useState(false)
  const [coaches, setCoaches] = useState([])
  const bottom = useRef(null)
  const scroller = useRef(null)

  const load = () => getChat().then(setMsgs)

  useEffect(() => {
    Promise.all([
      load(),
      getNotices().then(setNotices).catch(() => {}),
      getRoomMembers().then(setMembers).catch(() => {}),
      getCoaches().then(setCoaches).catch(() => {}),
    ]).finally(() => setReady(true))

    const offChat = onNewMessage(load)
    const offRoom = profile?.id
      ? joinRoom({ id: profile.id, name: profile.name,
                   photo_url: profile.photo_url }, setHere)
      : () => {}
    return () => { offChat(); offRoom() }
  }, [profile?.id])

  // Stay pinned to the bottom, the way a chat should.
  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: msgs.length ? 'smooth' : 'auto' })
  }, [msgs.length])

  async function send() {
    const body = text.trim()
    if (!body || busy) return
    setBusy(true)
    setText('')
    // Optimistic: the message appears the moment it's sent, because a
    // chat that waits for a round trip feels broken even when it isn't.
    const temp = {
      id: `temp-${Date.now()}`, user_id: userId, name: profile?.name,
      body, created_at: new Date().toISOString(), mine: true, pending: true,
    }
    setMsgs(m => [...m, temp])
    try { await postToRoom(userId, body); await load() }
    catch { setMsgs(m => m.filter(x => x.id !== temp.id)); setText(body) }
    setBusy(false)
  }

  const pinned = notices.filter(n => n.pinned)

  return (
    // Fixed rather than flowing, so the composer stays put when the
    // keyboard opens and the list scrolls underneath it. 100dvh follows
    // the visible viewport on iOS, which 100vh does not.
    <div style={{ position: 'fixed', inset: 0, display: 'flex',
      flexDirection: 'column', background: C.bg }}>

      {/* ---- pinned, small ---- */}
      <div style={{ padding: '46px 16px 0', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
          <h1 style={{ ...T.h1, fontSize: 22 }}>The room</h1>
          <div style={{ flex: 1 }} />

          {/* Faces and a count. Tapping opens the list, with whoever is
              reading right now at the top. */}
          <button onClick={() => setWho(true)} style={{ display: 'flex',
            alignItems: 'center', gap: 9, background: 'transparent',
            border: 'none', cursor: 'pointer', fontFamily: F, padding: 0 }}>
            <div style={{ display: 'flex' }}>
              {members.slice(0, 4).map((m, i) => (
                <div key={m.id} style={{ marginLeft: i ? -9 : 0,
                  border: `2px solid ${C.bg}`, borderRadius: 999,
                  display: 'flex' }}>
                  <Avatar name={m.name} photo={m.photo_url} size={26}
                    online={here.some(h => h.id === m.id)} />
                </div>
              ))}
            </div>
            <span style={{ fontSize: 12.5, color: C.sub, fontWeight: 600 }}>
              {members.length}
            </span>
          </button>
        </div>

        {/* Who is actually reading. Live, not a last-seen timestamp. */}
        {here.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 7,
            marginTop: 7 }}>
            <span style={{ width: 6, height: 6, borderRadius: 999,
              background: C.g }} />
            <span style={{ fontSize: 12.5, color: C.sub }}>
              {here.length === 1 && here[0].id === profile?.id
                ? 'Just you in here'
                : here
                    .filter(h => h.id !== profile?.id)
                    .slice(0, 3)
                    .map(h => (h.name || '').split(' ')[0])
                    .join(', ')
                  + (here.length - 1 > 3
                      ? ` and ${here.length - 4} more` : '')
                  + (here.length - 1 === 1 ? ' is here' : ' are here')}
            </span>
          </div>
        )}

        {pinned.length > 0 && (
          <div className="nb" style={{ display: 'flex', gap: 8, marginTop: 12,
            overflowX: 'auto', paddingBottom: 2,
            marginLeft: -16, marginRight: -16, paddingLeft: 16, paddingRight: 16 }}>
            {pinned.map(n => (
              <button key={n.id} onClick={() => setNotice(n)}
                style={{ flex: '0 0 auto', maxWidth: 250, display: 'flex',
                  alignItems: 'center', gap: 8, background: C.card2,
                  border: 'none', borderRadius: 999,
                  padding: '9px 15px', cursor: 'pointer', fontFamily: F }}>
                <Ico d={I.pin} s={11} c={C.sub} w={2.2} />
                <span style={{ fontSize: 12.5, fontWeight: 600, color: C.ink,
                  overflow: 'hidden', textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap' }}>{n.title}</span>
              </button>
            ))}
          </div>
        )}
      </div>

        {/* Ask a coach privately.
            The room is everyone; a question about a niggle, a weight
            you can't hit, or a week you had to miss is often not for
            everyone. One tap out of the public thread. */}
        {coaches.length > 0 && (
          <div className="nb" style={{ display: 'flex', gap: 8, marginTop: 12,
            overflowX: 'auto', paddingBottom: 2,
            marginLeft: -16, marginRight: -16,
            paddingLeft: 16, paddingRight: 16 }}>
            {coaches.map(c => (
              <button key={c.id} onClick={() => onCoach?.(c)}
                style={{ flex: '0 0 auto', display: 'flex',
                  alignItems: 'center', gap: 9, background: C.card,
                  border: `1px solid ${C.line}`, borderRadius: 999,
                  padding: '7px 14px 7px 7px', cursor: 'pointer',
                  fontFamily: F }}>
                <Avatar name={c.name} photo={c.photo_url} tint={c.tint}
                  size={28} />
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: 13, fontWeight: 700,
                    color: C.ink }}>{c.name}</div>
                  <div style={{ fontSize: 10.5, color: C.mute,
                    marginTop: 1 }}>
                    {(c.spec || [])[0] || 'Coach'}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

      {/* ---- the room ---- */}
      <div ref={scroller} className="nb" style={{ flex: 1, overflowY: 'auto',
        padding: '16px 16px 0',
        paddingBottom: 'calc(146px + env(safe-area-inset-bottom))' }}>
        {!ready && (
          <div style={{ ...T.body, textAlign: 'center', padding: '30px 0' }}>
            …
          </div>
        )}

        {ready && msgs.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 20px' }}>
            <div style={{ ...T.h3, fontSize: 16 }}>Nothing said yet</div>
            <div style={{ ...T.small, marginTop: 8, maxWidth: 260,
              margin: '8px auto 0' }}>
              Ask about a load, sort a lift share to ExCeL, or say how this
              morning went.
            </div>
          </div>
        )}

        {msgs.map((m, i) => {
          const prev = msgs[i - 1]
          const newDay = !prev || !sameDay(prev.created_at, m.created_at)
          // Group consecutive messages from the same person within a few
          // minutes — the name and avatar only need saying once.
          const grouped = prev && !newDay && prev.user_id === m.user_id &&
            (new Date(m.created_at) - new Date(prev.created_at)) < 5 * 60000
          const after = msgs[i + 1]
          const last = !after || after.user_id !== m.user_id ||
            (new Date(after.created_at) - new Date(m.created_at)) >= 5 * 60000

          return (
            <div key={m.id}>
              {newDay && (
                <div style={{ textAlign: 'center', margin: '18px 0 14px' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: C.mute,
                    background: 'transparent', letterSpacing: '.06em',
                    padding: '5px 12px' }}>{dayLabel(m.created_at)}</span>
                </div>
              )}

              <div onClick={() => (m.mine || profile?.role === 'admin') &&
                  !m.deleted && setOpen(m)}
                style={{ display: 'flex', gap: 10,
                  marginTop: grouped ? 3 : 12,
                  flexDirection: m.mine ? 'row-reverse' : 'row',
                  cursor: m.mine ? 'pointer' : 'default' }}>

                <div style={{ width: 30, flexShrink: 0 }}>
                  {!grouped && !m.mine && (
                    <Avatar name={m.name || '?'} size={30}
                      photo={members.find(x => x.id === m.user_id)?.photo_url}
                      online={here.some(h => h.id === m.user_id)} />
                  )}
                </div>

                <div style={{ maxWidth: '76%', minWidth: 0 }}>
                  {!grouped && !m.mine && (
                    <div style={{ display: 'flex', alignItems: 'baseline',
                      gap: 7, marginBottom: 4, paddingLeft: 2 }}>
                      <span style={{ fontSize: 12.5, fontWeight: 700,
                        color: m.is_coach ? C.g : C.sub }}>{m.name}</span>
                      {m.is_coach && (
                        <span style={{ fontSize: 9, fontWeight: 800,
                          letterSpacing: '.1em', color: C.mute }}>COACH</span>
                      )}
                    </div>
                  )}

                  {/* Lighter, and the tail only on the last of a run.
                      Every bubble having a corner cut made a column of
                      notches down the screen — the tail should mark
                      where somebody stopped talking, which is once. */}
                  <div style={{
                    background: m.mine ? C.g : C.card3,
                    color: m.mine ? C.bg : C.ink,
                    borderRadius: 18,
                    borderBottomRightRadius: m.mine && last ? 6 : 18,
                    borderBottomLeftRadius: !m.mine && last ? 6 : 18,
                    padding: m.body ? '12px 15px' : 0,
                    fontSize: 15.5, lineHeight: 1.5,
                    opacity: m.pending ? .55 : 1,
                    wordBreak: 'break-word',
                    display: m.body || m.deleted ? 'block' : 'none',
                  }}>
                    {m.deleted
                      ? <span style={{ fontStyle: 'italic', opacity: .6 }}>
                          Message removed</span>
                      : m.body}
                  </div>

                  {m.photo_url && !m.deleted && (
                    <Img src={m.photo_url}
                      style={{ marginTop: 5, height: 190, borderRadius: 16,
                        borderBottomRightRadius: m.mine ? 5 : 16,
                        borderBottomLeftRadius: m.mine ? 16 : 5 }} />
                  )}

                  {/* Once per run, not under every line. Six bubbles
                      from the same person a minute apart don't need six
                      timestamps. */}
                  {(last || m.pending) && (
                    <div style={{ fontSize: 10.5, color: C.mute, marginTop: 4,
                      textAlign: m.mine ? 'right' : 'left', padding: '0 4px' }}>
                      {m.pending ? 'sending' : when(m.created_at)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
        <div ref={bottom} />
      </div>

      {/* ---- send ---- */}
      {/* Same size and the same distance from the tab bar as the
          testing nudge, which sits in this exact spot on every other
          screen. Two floating bars an inch apart looked accidental. */}
      <div style={{ position: 'fixed', left: 14, right: 14,
        bottom: FLOAT.above, maxWidth: 492, margin: '0 auto', zIndex: 40 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9,
          background: C.sheet, border: `1px solid ${C.line}`, borderRadius: 999,
          padding: '10px 10px 10px 18px',
          boxShadow: '0 8px 30px rgba(0,0,0,.5)' }}>
          <textarea value={text} rows={1}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
            }}
            placeholder="Say something"
            style={{ flex: 1, background: 'transparent', border: 'none',
              color: C.ink, fontSize: 15.5, fontWeight: 600, outline: 'none',
              fontFamily: F, resize: 'none', lineHeight: 1.4, padding: '9px 0',
              maxHeight: 96 }} />
          <button onClick={send} disabled={!text.trim() || busy}
            style={{ width: 38, height: 38, borderRadius: 999, border: 'none',
              flexShrink: 0, cursor: text.trim() ? 'pointer' : 'default',
              background: text.trim() ? C.g : C.card2,
              display: 'grid', placeItems: 'center', transition: 'background .2s' }}>
            <Ico d={I.send} s={16} c={text.trim() ? C.bg : C.mute} w={2} />
          </button>
        </div>
      </div>

      {/* ---- a message you can remove ---- */}
      {open && (
        <Sheet onClose={() => setOpen(null)}>
          <div style={{ ...T.small, marginBottom: 16 }}>
            {open.mine ? 'Your message' : `${open.name}'s message`}
          </div>
          <div style={{ background: C.card2, borderRadius: 14, padding: 14,
            fontSize: 15, lineHeight: 1.45 }}>{open.body}</div>
          <Btn tone="line" style={{ marginTop: 18, color: C.red }}
            onClick={async () => {
              await removeMessage(open.id); setOpen(null); load()
            }}>Remove it</Btn>
          <button onClick={() => setOpen(null)} style={{ width: '100%',
            background: 'transparent', border: 'none', color: C.sub,
            fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: F,
            padding: '15px 0 0' }}>Cancel</button>
        </Sheet>
      )}

      {/* ---- everyone ---- */}
      {who && (
        <Sheet onClose={() => setWho(false)}>
          <div style={{ ...T.h2 }}>
            {members.length} at Salus
          </div>
          <p style={{ ...T.small, marginTop: 7 }}>
            {here.length} reading right now.
          </p>
          <div style={{ marginTop: 18, maxHeight: '58vh',
            overflowY: 'auto' }} className="nb">
            {[...members]
              .sort((a, b) => {
                const ao = here.some(h => h.id === a.id) ? 0 : 1
                const bo = here.some(h => h.id === b.id) ? 0 : 1
                return ao - bo
              })
              .map((m, i) => {
                const online = here.some(h => h.id === m.id)
                return (
                  <div key={m.id} style={{ display: 'flex',
                    alignItems: 'center', gap: 13, padding: '12px 0',
                    borderTop: i ? `1px solid ${C.line}` : 'none' }}>
                    <Avatar name={m.name} photo={m.photo_url} size={38}
                      online={online} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 600 }}>
                        {m.name}
                        {m.id === profile?.id && (
                          <span style={{ color: C.mute,
                            fontWeight: 500 }}> (you)</span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: C.mute,
                        marginTop: 2 }}>
                        {online ? 'Here now'
                          : m.last_trained
                            ? `Last trained ${when(m.last_trained)}`
                            : 'Not started yet'}
                      </div>
                    </div>
                    {m.is_coach && (
                      <span style={{ fontSize: 9, fontWeight: 800,
                        letterSpacing: '.1em', color: C.g }}>COACH</span>
                    )}
                  </div>
                )
              })}
          </div>
          <Btn tone="soft" style={{ marginTop: 18 }}
            onClick={() => setWho(false)}>Close</Btn>
        </Sheet>
      )}

      {notice && (
        <Sheet onClose={() => setNotice(null)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <Ico d={I.pin} s={12} c={C.g} w={2.2} />
            <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '.12em',
              color: C.g }}>{notice.tag}</span>
            <div style={{ flex: 1 }} />
            <span style={{ fontSize: 12.5, color: C.mute }}>
              {new Date(notice.published_at).toLocaleDateString('en-GB',
                { day: 'numeric', month: 'short' })}
            </span>
          </div>
          <div style={{ ...T.h2, marginTop: 11 }}>{notice.title}</div>
          <div style={{ ...T.body, marginTop: 11 }}>{notice.body}</div>
          <Btn tone="soft" style={{ marginTop: 20 }}
            onClick={() => setNotice(null)}>Close</Btn>
        </Sheet>
      )}
    </div>
  )
}
