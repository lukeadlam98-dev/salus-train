// The other half of push: actually sending one.
//
// Deno, not Postgres. Web Push requires signing a VAPID JWT and
// encrypting the payload with the subscription's own keys, which is
// not something to hand-roll and not something Postgres can do — so
// this is an edge function and it is the only part of Salus Train
// that has to be deployed with the CLI rather than pasted into the
// SQL editor.
//
// It has two modes:
//
//   { test: true }   send one push to the caller's own devices, so a
//                    member can prove the whole path works
//   (no body)        drain the outbox — everything the triggers have
//                    queued since the last run
//
// The second is what a cron job calls every minute.

import webpush from 'npm:web-push@3.6.7'
import { createClient } from 'npm:@supabase/supabase-js@2'

const VAPID_PUBLIC  = Deno.env.get('VAPID_PUBLIC')!
const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE')!
const SUBJECT       = Deno.env.get('VAPID_SUBJECT') || 'mailto:luke@salus.house'

webpush.setVapidDetails(SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE)

// Service role, because sending to a member means reading a table
// their own token can't see — everyone's subscriptions, not just
// theirs. This key never leaves the function.
const admin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false } },
)

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json',
               'Access-Control-Allow-Origin': '*',
               'Access-Control-Allow-Headers':
                 'authorization, x-client-info, apikey, content-type' },
  })

// Send to every device a member has, and clean up as we go.
//
// A 404 or 410 from the push service means that endpoint is dead —
// app deleted, browser cleared, subscription rotated. Deleting it is
// the correct response and the only thing that stops the table
// filling with endpoints that will never accept anything again.
async function sendToUser(userId: string, payload: Record<string, unknown>) {
  const { data: subs } = await admin
    .from('push_subs').select('*').eq('user_id', userId)

  if (!subs?.length) return { sent: 0, gone: 0 }

  let sent = 0, gone = 0
  await Promise.all(subs.map(async (s) => {
    try {
      await webpush.sendNotification({
        endpoint: s.endpoint,
        keys: { p256dh: s.p256dh, auth: s.auth },
      }, JSON.stringify(payload))
      sent++
      await admin.from('push_subs')
        .update({ last_ok: new Date().toISOString() }).eq('id', s.id)
    } catch (e) {
      const code = (e as { statusCode?: number }).statusCode
      if (code === 404 || code === 410) {
        gone++
        await admin.from('push_subs').delete().eq('id', s.id)
      }
    }
  }))
  return { sent, gone }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return json({}, 200)

  let body: { test?: boolean } = {}
  try { body = await req.json() } catch (_) { /* the cron sends nothing */ }

  // ---- a member testing their own phone ----
  if (body.test) {
    const auth = req.headers.get('Authorization') ?? ''
    const { data: { user } } = await admin.auth.getUser(auth.replace('Bearer ', ''))
    if (!user) return json({ error: 'not signed in' }, 401)

    const r = await sendToUser(user.id, {
      title: 'Salus Train',
      body: 'That worked. This is what one looks like.',
      tag: 'test', url: '/',
    })
    return json(r)
  }

  // ---- the cron, draining what the triggers queued ----
  //
  // Claimed in one statement so two overlapping runs can't send the
  // same notification twice. A minute is a long time and cron jobs
  // overlap more often than people expect.
  const { data: due, error } = await admin.rpc('claim_push_outbox', { p_limit: 200 })
  if (error) return json({ error: error.message }, 500)
  if (!due?.length) return json({ sent: 0, claimed: 0 })

  let sent = 0, gone = 0
  for (const row of due) {
    const r = await sendToUser(row.user_id, {
      title: row.title, body: row.body, tag: row.tag, url: row.url,
    })
    sent += r.sent; gone += r.gone
  }

  await admin.from('push_outbox')
    .update({ sent_at: new Date().toISOString() })
    .in('id', due.map((d: { id: string }) => d.id))

  return json({ claimed: due.length, sent, gone })
})
