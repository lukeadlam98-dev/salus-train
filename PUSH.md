# Turning push on

Four steps. Three are one-offs, and the second is the only part of
Salus Train that can't be pasted into the Supabase SQL editor.

---

## 1. The keys

Already generated. The public one is in `src/lib/push.js` and is
public by design — it goes to every browser that subscribes. The
private one is below and belongs in Supabase's secrets, nowhere else.
Don't commit it.

```
VAPID_PUBLIC  = BPgfbXFARYBPKXnSxFjfVYPAQyRwqIohxBC3a3QvRggZjpXXJBEA-Exw_qoO3f7q2D-iUfStS8pLjY0oE9kavrA
VAPID_PRIVATE = _jL9lU0tk5YrkvxincBJyGRaH_cWJEl_TVyEj3fs6GQ
```

If these ever leak, generate a new pair — every existing subscription
dies with the old key and every member has to tap Allow again, so it's
worth not leaking.

## 2. Deploy the function

Needs the CLI, which `BACKUP.md` already has you installing.

```
cd ~/Documents/salus-train
supabase login
supabase link --project-ref tnxkdmxsdedjkxgoqgjc

supabase secrets set \
  VAPID_PUBLIC="BPgfbXFARYBPKXnSxFjfVYPAQyRwqIohxBC3a3QvRggZjpXXJBEA-Exw_qoO3f7q2D-iUfStS8pLjY0oE9kavrA" \
  VAPID_PRIVATE="_jL9lU0tk5YrkvxincBJyGRaH_cWJEl_TVyEj3fs6GQ" \
  VAPID_SUBJECT="mailto:luke@salus.house"

supabase functions deploy send-push
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set for you inside
edge functions — you don't add those.

## 3. Run the SQL

`53_push.sql` is in `00_run_all.sql`. Close every tab with the app
open first, as always.

## 4. Schedule it

Supabase dashboard → Integrations → Cron. New job, every minute,
type "Supabase Edge Function", pick `send-push`, no body.

That's the thing that drains the outbox. Without it, notifications
queue up in `push_outbox` and never leave — which is a useful failure,
because you can read the table and see exactly what would have sent.

---

## Testing it

On your phone, not a laptop, and it has to be on the home screen:

1. Open `salus-train.vercel.app` in Safari
2. Share → **Add to Home Screen**
3. Open it from the home screen
4. Me → Notifications → **Allow**, then **Test**

The test push goes out through the edge function and back, so it
proves the key, the subscription, the function and the service worker
in one tap. A notification that appears means the whole path works.

If nothing arrives, check in this order: `push_subs` has a row for
you, the function logs in the dashboard, then `push_outbox`.

---

## What sends

| Kind | When | Default |
|---|---|---|
| `coach_reply` | a coach answers your message | on |
| `room` | anyone posts in the room | on |
| `week_live` | the week opens | on |
| `race_soon` | logistics before the race | on |
| `notices` | a pinned notice | on |
| `wod`, `kudos`, `weekly` | — | off |

The first two are wired to triggers. The rest have preferences and no
trigger yet — they're either manual or wait on the Sunday summary.

Nothing sends between 22:00 and 07:00 London. Queued rows wait for
morning, except room, WOD and kudos, which expire after three hours
because a notification about a message nine hours ago is noise.

There is deliberately no "you haven't trained in five days". It's the
one every fitness app sends and the one that makes people delete it.
