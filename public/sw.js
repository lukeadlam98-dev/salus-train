// The service worker.
//
// Two jobs, and deliberately only two. It receives a push and shows
// it, and it decides where a tap lands. It does not cache anything —
// offline is a separate problem with its own answer, and a worker
// that caches badly is worse than one that doesn't cache at all.
//
// Lives in public/ rather than src/ because it has to be served from
// the site root: a worker's scope can't be broader than its own path,
// and one served from /assets/ could only control /assets/.

// A new worker takes over immediately rather than waiting for every
// tab to close. Push handlers that ship a fix and then sit behind an
// old worker for a week are their own kind of bug.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()))

self.addEventListener('push', event => {
  let d = {}
  try { d = event.data ? event.data.json() : {} } catch (_) {
    d = { title: 'Salus Train', body: event.data ? event.data.text() : '' }
  }

  const title = d.title || 'Salus Train'
  const options = {
    body: d.body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    // Same tag replaces rather than stacks. Three room messages
    // should be one line on the lock screen, not three.
    tag: d.tag || 'salus',
    renotify: !!d.renotify,
    data: { url: d.url || '/' },
    // Silent between ten at night and seven in the morning is handled
    // where it's sent, not here — the worker doesn't know the
    // member's timezone and shouldn't guess.
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || '/'

  // Focus a tab that's already open before opening another. Somebody
  // tapping a notification while the app is in the background should
  // land in the app they already have, mid-session, rather than a
  // fresh boot that loses where they were.
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(list => {
        for (const c of list) {
          if ('focus' in c) {
            if ('navigate' in c && url !== '/') c.navigate(url).catch(() => {})
            return c.focus()
          }
        }
        return self.clients.openWindow(url)
      })
  )
})

// A subscription can be rotated by the browser without the user doing
// anything. When that happens the old endpoint is dead and the new
// one is unknown to us, so tell the page to re-register next time it
// opens rather than silently going quiet.
self.addEventListener('pushsubscriptionchange', event => {
  event.waitUntil(
    self.clients.matchAll({ includeUncontrolled: true }).then(list =>
      list.forEach(c => c.postMessage({ type: 'resubscribe' })))
  )
})
