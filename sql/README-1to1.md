# 1:1 clients — what to run

**Close the app first.** Every tab, every phone. An open tab holds a
read lock and these migrations rebuild two views; that combination
deadlocks and you'll wait five seconds for an error instead.

Then, in the Supabase SQL editor:

1. `54_one_to_one.sql`
2. `57_name_the_programme.sql`
3. `58_full_body_week.sql`

**Skip `55_rakhee.sql` and `56_copy_everything.sql`.** Both matched
members by name, and there are two called "Luke" — so they attached
the programme to whichever row came back first, which is to say at
random. `58` matches on email instead. Nobody shares an email.

To write the same week onto somebody else, change the last line of
`58`:

```sql
select public.seed_full_body_week1('rakhee@herdomain.com');
```

Re-running rewrites that week rather than adding a second copy, so
once you've started editing her sessions by hand, leave it alone.

Both are safe to re-run. If you'd rather paste once, `00_run_all.sql`
now ends with both of them.

---

## What 54 does

- Adds `programmes.client_id`. A programme with one is private to that
  member. There is no "is private" flag to forget to tick — the
  attachment *is* the privacy.
- `visible_programmes` — what a member may see: every club block, plus
  their own 1:1, which it sorts first. Somebody else's 1:1 doesn't get
  filtered out at the app; it never arrives.
- Rebuilds `wotw_board` so a 1:1 session can't become the workout of
  the week. A session written for one person has no field to place in.
- `create_client_programme(client, name, weeks)` — makes the
  programme, builds and publishes its weeks, and moves the member onto
  it, in one transaction. Admin only.
- `client_programmes` — the back-office roster, with week, sessions
  written, sessions done and last trained.

## What 57 does

Names a 1:1 after the training rather than the client. It was
defaulting to "Rakhee Patel — 1:1", which says whose it is — something
the roster already says on the same row — and tells her nothing on her
own Train screen, where her own name isn't information. The default is
now **Full Body**, you can type anything you like when you create one,
and anything already made under the old default gets renamed.

## What 56 does

Two things.

First, it fixes `duplicate_week_to`, which "+ Copy week" in the back
office uses. It was written before blocks had formats and named its
columns one at a time, so every column added since was being dropped
on every copy — `format`, `rounds`, `work_s`, `rest_s`, `cap_s`,
`window_s`, `ladder`, `target_pct`, `target_rpe`, `pace_pct` on a
block, and `slot`, `focus`, `video_url`, `coach_id` and the whole run
plan on a session. A copied week came back with every AMRAP turned
into straight sets, every interval missing its clock, every superset
come apart into a list, and two sessions on one day colliding on slot.
It now reads the column list from the catalogue, so nothing added
later gets dropped again. `wotw` is deliberately not copied — two
sessions flagged as the workout of the week means the board picks one
at random.

Second, it gives Luke his own copy of Rakhee's week 1, so you can walk
through it on your own phone before she sees it.

**This moves you off Road to HYROX.** Switching programme resets the
week, so the script prints the line to put you back — look for it in
the Supabase output, something like:

```sql
update profiles set programme_id = '…', week_idx = 2 where id = '…';
```

Copy that somewhere before you close the tab.

## What 55 does

Seeds Rakhee's week 1 — Monday, Wednesday, Friday, with rest days
between. It looks her up by name (`like 'rakhee%'`) and raises a
notice rather than an error if she isn't there yet, so running it
before she's a member tells you so instead of failing the whole paste.

Each letter is **one block in superset format** holding its two or
three movements, which is what makes the app pair them as A1/A2
instead of stacking them. The D blocks are `intervals` — bike
5×(20s/40s), ski 4×(30s/60s), treadmill sled push 4×(20s/60s) — so
they run through the guided screen with the ring rather than sitting
on the set grid.

Re-running it deletes and rewrites that week's blocks, so editing a
session in the back office and then re-running this will lose the
edits. Once you've started changing her sessions by hand, don't run it
again.

---

## If something goes wrong

`relation "visible_programmes" does not exist` in the app — 54 hasn't
run. The app falls back to the plain programmes table so nothing
breaks, but private programmes aren't private until it has.

`not permitted` from `create_client_programme` — your profile's role
isn't `admin`.
