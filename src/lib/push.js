import { supabase } from './supabase'

// Push, from the phone's side.
//
// The order matters and is not obvious:
//
//   1. the app has to be installed to a home screen (iOS only, but
//      that's most of the club)
//   2. a service worker has to be registered
//   3. the member has to grant permission
//   4. only then can you subscribe, and only inside a user gesture
//
// Skip any step and the failure is silent — no error, no buzz, and a
// settings screen full of switches that do nothing. So each one is
// checked separately and reported separately.

// The public half of the VAPID pair. Public by design — it goes to
// every browser that subscribes. The private half lives in Supabase's
// secrets and never appears in this repo.
const VAPID_PUBLIC =
  import.meta.env.VITE_VAPID_PUBLIC ||
  'BPgfbXFARYBPKXnSxFjfVYPAQyRwqIohxBC3a3QvRggZjpXXJBEA-Exw_qoO3f7q2D-iUfStS8pLjY0oE9kavrA'

// Push wants the key as raw bytes; VAPID keys travel as base64url.
function urlBase64ToUint8Array(base64) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(b64)
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)))
}

const b64 = buf =>
  btoa(String.fromCharCode(...new Uint8Array(buf)))

// Is this even possible on this device, and if not, why not.
//
// "Notifications aren't supported" is a useless thing to tell someone
// holding an iPhone that supports them perfectly well once the app is
// on the home screen. The distinction is the whole message.
export function pushState() {
  if (typeof window === 'undefined') return { can: false, reason: 'ssr' }

  const standalone = window.matchMedia?.('(display-mode: standalone)').matches
    || window.navigator.standalone === true
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent)

  if (!('serviceWorker' in navigator)) return { can: false, reason: 'no-sw', standalone, ios }
  if (!('PushManager' in window))      return { can: false, reason: ios && !standalone ? 'ios-install' : 'no-push', standalone, ios }
  if (!('Notification' in window))     return { can: false, reason: 'no-push', standalone, ios }
  if (ios && !standalone)              return { can: false, reason: 'ios-install', standalone, ios }

  return { can: true, standalone, ios, permission: Notification.permission }
}

export async function registerWorker() {
  if (!('serviceWorker' in navigator)) return null
  return navigator.serviceWorker.register('/sw.js', { scope: '/' })
}

// Ask, subscribe, and store — in that order, in one user gesture.
//
// Safari requires the permission prompt to come directly from a tap.
// Doing the awaits first and calling requestPermission afterwards
// works on Chrome and fails on the phones most of the club uses.
export async function subscribe(userId) {
  const state = pushState()
  if (!state.can) return { ok: false, reason: state.reason }

  const perm = await Notification.requestPermission()
  if (perm !== 'granted') return { ok: false, reason: perm }

  const reg = await registerWorker()
  await navigator.serviceWorker.ready

  // An existing subscription is reused rather than replaced. Calling
  // subscribe twice with different keys throws, and the second call is
  // the one a member makes by tapping Allow again.
  let sub = await reg.pushManager.getSubscription()
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC),
    })
  }

  const json = sub.toJSON()
  const { error } = await supabase.from('push_subs').upsert({
    user_id: userId,
    endpoint: sub.endpoint,
    p256dh: json.keys?.p256dh || b64(sub.getKey('p256dh')),
    auth: json.keys?.auth || b64(sub.getKey('auth')),
    agent: navigator.userAgent.slice(0, 200),
    last_ok: new Date().toISOString(),
  }, { onConflict: 'endpoint' })

  if (error) return { ok: false, reason: 'save', message: error.message }
  return { ok: true, endpoint: sub.endpoint }
}

// Turning it off on this device only. Somebody with a phone and a
// laptop who silences the laptop still wants the phone.
export async function unsubscribe() {
  if (!('serviceWorker' in navigator)) return { ok: true }
  const reg = await navigator.serviceWorker.getRegistration()
  const sub = await reg?.pushManager.getSubscription()
  if (!sub) return { ok: true }
  await supabase.from('push_subs').delete().eq('endpoint', sub.endpoint)
  await sub.unsubscribe()
  return { ok: true }
}

// Whether this particular device is currently subscribed. The
// settings screen shows preferences, which are per member; this is
// the one thing on it that's per device.
export async function isSubscribed() {
  if (!('serviceWorker' in navigator)) return false
  const reg = await navigator.serviceWorker.getRegistration()
  const sub = await reg?.pushManager.getSubscription()
  return !!sub
}

// A push sent from the device to itself, through the server, so it
// exercises the whole path — key, subscription, edge function,
// worker. A local showNotification would prove none of it.
export async function sendTest() {
  const { data, error } = await supabase.functions.invoke('send-push', {
    body: { test: true },
  })
  if (error) return { ok: false, message: error.message }
  return { ok: true, ...data }
}
