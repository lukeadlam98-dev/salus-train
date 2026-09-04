import { useState, useEffect } from 'react'
import { C, T, F } from '../lib/theme'
import { getNotifyPrefs, setNotifyPref } from '../lib/data'
import { subscribe, unsubscribe, isSubscribed, sendTest } from '../lib/push'
import { Card, Label, Back, page } from '../components/ui'

// What the app is allowed to interrupt for.
//
// Four on by default and three off. The discipline is having few — an
// app that buzzes about everything gets its notifications turned off
// entirely, which loses the four that mattered along with the ones
// that didn't.
//
// There is deliberately no "you haven't trained in five days". It's
// the notification every fitness app sends and the one that makes
// people delete it. Someone who has fallen off knows. A coach
// messaging them is worth ten of those.
const GROUPS = [
  {
    title: 'WORTH INTERRUPTING FOR',
    note: 'On by default. Each of these is something you asked for or something you’d want to know today.',
    items: [
      ['coach_reply', 'A coach replies',
       'You asked something and they answered.'],
      ['week_live', 'Your week goes live',
       'Sunday evening, when the coaches publish. The one that makes Monday happen.'],
      ['race_soon', 'Race day approaching',
       'A week out, then the night before. Waves, travel, what to bring.'],
      ['notices', 'Something gets pinned',
       'Rare on purpose, so it still means something when it happens.'],
    ],
  },
  {
    title: 'THE ROOM',
    note: 'Forty people chatting is a lot of buzzing. Off means you still get the count on the tab — you just find out when you look.',
    items: [
      ['room', 'Messages in the room',
       'Every message from anyone at Salus.'],
    ],
  },
  {
    title: 'IF YOU WANT THEM',
    note: 'Off unless you turn them on.',
    items: [
      ['wod', 'Someone beats your WOD time',
       'Competitive. Not for everyone.'],
      ['kudos', 'Kudos on something you posted',
       'Pleasant. Not important.'],
      ['weekly', 'Your Sunday summary',
       'What moved this week — your 5km, your projection, what you got through.'],
    ],
  },
]

export default function Notifications({ userId, onBack }) {
  const [p, setP] = useState(null)
  const [ready, setReady] = useState(false)
  const [perm, setPerm] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'unsupported')
  // Permission is per member; a subscription is per device. Somebody
  // who allowed notifications on their phone hasn't allowed them on
  // the laptop they're reading this on, and the screen should say so.
  const [subbed, setSubbed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [said, setSaid] = useState(null)

  useEffect(() => {
    getNotifyPrefs(userId).then(setP).finally(() => setReady(true))
    isSubscribed().then(setSubbed).catch(() => {})
  }, [userId])

  // Asking and subscribing are one action from a tap. Safari will
  // only show the permission prompt inside a user gesture, so
  // everything that has to happen happens in this handler.
  async function allow() {
    setBusy(true); setSaid(null)
    const r = await subscribe(userId)
    setBusy(false)
    setPerm(typeof Notification !== 'undefined'
      ? Notification.permission : 'unsupported')
    if (r.ok) { setSubbed(true); setSaid('This device is set up.') }
    else if (r.reason === 'denied') setSaid('You said no — it has to go back on in your phone settings.')
    else setSaid(r.message || 'That didn’t work.')
  }

  async function off() {
    setBusy(true)
    await unsubscribe().catch(() => {})
    setBusy(false); setSubbed(false); setSaid('This device is silenced.')
  }

  async function test() {
    setBusy(true); setSaid(null)
    const r = await sendTest()
    setBusy(false)
    setSaid(r.ok
      ? (r.sent ? 'Sent — it should arrive in a second.'
                : 'Nothing to send to. Try Allow first.')
      : 'Couldn’t send it: ' + (r.message || 'unknown'))
  }

  // Push on iOS only exists for a home-screen app. In a browser tab
  // the API isn't there at all, so there's no point offering it —
  // better to say why.
  const standalone = typeof window !== 'undefined' &&
    (window.matchMedia?.('(display-mode: standalone)').matches ||
     window.navigator?.standalone)
  const canPush = typeof window !== 'undefined' && 'Notification' in window
  const isIOS = typeof navigator !== 'undefined' &&
    /iPad|iPhone|iPod/.test(navigator.userAgent)

  const set = async (k, on) => {
    setP(x => ({ ...x, [k]: on }))
    try { await setNotifyPref(userId, k, on) } catch (_) {}
  }

  if (!ready) return <div style={page} />

  return (
    <div style={page}>
      <Back onClick={onBack} />
      <h1 style={{ ...T.h1, marginTop: 20 }}>Notifications</h1>
      <p style={{ ...T.body, marginTop: 7 }}>
        What the app is allowed to interrupt you for.
      </p>

      {/* ---- whether it can reach you at all ---- */}
      {isIOS && !standalone ? (
        <Card style={{ marginTop: 20, background: C.card2 }}>
          <div style={{ fontSize: 15, fontWeight: 700 }}>
            Add Salus Train to your home screen
          </div>
          <div style={{ ...T.small, marginTop: 8, lineHeight: 1.6 }}>
            Apple only allows notifications for apps on your home screen —
            in a browser tab they don't exist at all. Tap the share button
            at the bottom of Safari, then <b style={{ color: C.ink }}>Add
            to Home Screen</b>, and open it from there.
          </div>
          <div style={{ ...T.small, fontSize: 12.5, marginTop: 10,
            color: C.mute }}>
            The settings below still work — they just won't buzz until
            then.
          </div>
        </Card>
      ) : canPush ? (
        <Card style={{ marginTop: 20, background: C.card2 }}>
          <div style={{ fontSize: 15, fontWeight: 700 }}>
            {perm === 'denied' ? 'Notifications are blocked'
              : subbed ? 'This device is set up'
              : 'Allow notifications'}
          </div>
          <div style={{ ...T.small, marginTop: 8, lineHeight: 1.6 }}>
            {perm === 'denied'
              ? 'You said no at some point. It has to be turned back on in your phone’s settings for this app — the browser won’t ask twice.'
              : subbed
              ? 'Every device you use needs turning on separately, so a phone and a laptop are two decisions.'
              : 'One tap, then the settings below take effect.'}
          </div>

          {perm !== 'denied' && (
            <div style={{ display: 'flex', gap: 9, marginTop: 14 }}>
              <button onClick={subbed ? off : allow} disabled={busy}
                style={{ flex: 1, border: subbed ? `1px solid ${C.line}` : 'none',
                  borderRadius: 999, padding: '14px 0', fontSize: 15,
                  fontWeight: 700, cursor: 'pointer', fontFamily: F,
                  background: subbed ? 'transparent' : C.g,
                  color: subbed ? C.sub : C.bg, opacity: busy ? .5 : 1 }}>
                {busy ? '…' : subbed ? 'Silence this device' : 'Allow'}
              </button>
              {subbed && (
                /* A push sent from the phone to itself through the
                   server, so it proves the key, the subscription, the
                   function and the worker — not just that the browser
                   can draw a notification. */
                <button onClick={test} disabled={busy}
                  style={{ border: `1px solid ${C.line}`, borderRadius: 999,
                    padding: '14px 18px', fontSize: 15, fontWeight: 700,
                    background: 'transparent', color: C.sub,
                    cursor: 'pointer', fontFamily: F, opacity: busy ? .5 : 1 }}>
                  Test
                </button>
              )}
            </div>
          )}

          {said && (
            <div style={{ ...T.small, fontSize: 12.5, marginTop: 11,
              color: C.sub }}>{said}</div>
          )}
        </Card>
      ) : null}

      {GROUPS.map(g => (
        <div key={g.title}>
          <Label style={{ margin: '30px 0 6px' }}>{g.title}</Label>
          <div style={{ ...T.small, fontSize: 12.5, marginBottom: 12,
            lineHeight: 1.55 }}>{g.note}</div>
          <Card style={{ padding: '3px 15px' }}>
            {g.items.map(([k, label, sub], i) => (
              <div key={k} style={{ display: 'flex', alignItems: 'center',
                gap: 13, padding: '15px 0',
                borderTop: i ? `1px solid ${C.line}` : 'none' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15.5, fontWeight: 600 }}>{label}</div>
                  <div style={{ ...T.small, fontSize: 12.5, marginTop: 3,
                    lineHeight: 1.5 }}>{sub}</div>
                </div>
                <button onClick={() => set(k, !p?.[k])}
                  style={{ width: 46, height: 28, borderRadius: 999,
                    border: 'none', flexShrink: 0, cursor: 'pointer',
                    padding: 3, display: 'flex',
                    justifyContent: p?.[k] ? 'flex-end' : 'flex-start',
                    background: p?.[k] ? C.g : C.card3,
                    transition: 'all .18s' }}>
                  <div style={{ width: 22, height: 22, borderRadius: 999,
                    background: p?.[k] ? C.bg : C.mute }} />
                </button>
              </div>
            ))}
          </Card>
        </div>
      ))}

      <div style={{ ...T.small, fontSize: 12.5, marginTop: 26,
        lineHeight: 1.6 }}>
        There's no "you haven't trained in a while" here on purpose. If
        you fall off, you'll know — and a coach messaging you is worth
        more than a phone buzzing.
      </div>
    </div>
  )
}
