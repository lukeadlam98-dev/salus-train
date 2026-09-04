# Backing up Salus Train

## Run this weekly

Install the CLI once:

```
brew install supabase/tap/supabase
```

Then, from anywhere:

```
supabase db dump \
  --db-url "postgresql://postgres.tnxkdmxsdedjkxgoqgjc:YOUR-DB-PASSWORD@aws-0-eu-west-2.pooler.supabase.com:5432/postgres" \
  -f ~/Documents/salus-backups/salus-$(date +%Y-%m-%d).sql
```

The password is in Supabase → Settings → Database → Database password.
Use the **Session Pooler** connection string, not the direct one.

Make the folder first:

```
mkdir -p ~/Documents/salus-backups
```

## What that captures

Every table, every row, the schema, the policies, the functions. Everything
members have logged.

## What it does not capture

The `Photos` storage bucket. Session images, race photos, coach headshots
and anything posted to the room live outside the database and have to be
copied separately:

```
supabase storage cp -r ss://Photos ~/Documents/salus-backups/photos
```

## Restoring

```
psql "YOUR-CONNECTION-STRING" -f ~/Documents/salus-backups/salus-2026-08-31.sql
```

Worth actually trying this once against a scratch project rather than
finding out it doesn't work on the day you need it.
