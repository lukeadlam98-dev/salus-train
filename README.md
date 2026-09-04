# Salus Train — LATEST BUILD

If you are unsure whether you have the right files, check this:

    grep -c "signInWithPassword" src/screens/Auth.jsx

It should print 1. And this folder must exist: src/admin

## Installing

Delete the old src first — copying over the top merges rather than
replaces, and leaves stale files behind.

    cd ~/Documents/salus-train
    rm -rf src
    cp -r ~/Downloads/salus-latest/src ./src
    npm run dev

## SQL

Run sql/00_run_all.sql in the Supabase SQL Editor. It contains
everything in order and is safe to run more than once.

Then uncomment the last two lines of that file, put your email in,
and run them — that is what makes you an admin.

## What's in this build

- Email and password login. No inbox round trip.
- Back office at ?admin, or You → Back office.
- Week duplicator: copy a whole week, then change the loads.
- Photo upload from inside the session editor.
- Draft weeks, so half-written sessions stay hidden.
- Video splash with a photo poster underneath.
- Logo as a PNG, inverted on the light theme.

## Still to do

- Weeks 2–8 have no content yet. Use Duplicate.
- Coaches can't reply to messages — no coach-side view yet.
- No offline handling. Gym wifi will drop sets.
- No reordering of blocks or lines in the back office.
