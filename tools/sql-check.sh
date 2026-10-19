#!/bin/bash
# Run the migrations against a real Postgres before pasting them into
# Supabase.
#
# Nine SQL errors reached the Supabase editor before this existed —
# invented table names, invented columns, functions whose return type
# had changed, a round() that needed a cast. Every one of them would
# have failed here in two seconds instead.
#
# tools/sql-stub.sql stands in for the base tables, which live in
# Supabase rather than in sql/ — profiles, programmes, weeks, sessions,
# blocks and the rest, plus auth.uid() and the authenticated role. It
# is not the real schema; it is the shape the migrations rely on. When
# a migration needs something the stub hasn't got, add it there.
#
#   bash tools/sql-check.sh 54_one_to_one 55_rakhee 56_copy_everything
#
set -e
cd "$(dirname "$0")/.."

BIN=$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | tail -1)
[ -n "$BIN" ] || { echo "no postgres server found — apt install postgresql"; exit 1; }
DIR=${PGTESTDIR:-/tmp/salus-pgtest}
USER_=${PGTESTUSER:-$(id -un)}
AS_ROOT=0
if [ "$(id -u)" = "0" ]; then
  id -u pgt >/dev/null 2>&1 || useradd -m pgt
  USER_=pgt; AS_ROOT=1
fi

# Postgres refuses to run as root, so when this is root it drops to a
# throwaway user. One function, an if rather than a && chain: chained,
# a failed su falls through and runs the command as root anyway.
q() {
  if [ "$AS_ROOT" = "1" ]; then su pgt -c "$1"; else eval "$1"; fi
}

if [ -d "$DIR/data" ] && ! q "$BIN/pg_isready -h $DIR -p 55432" >/dev/null 2>&1; then
  q "$BIN/pg_ctl -D $DIR/data -o '-p 55432 -k $DIR' -l $DIR/log start" >/dev/null || true
  sleep 2
fi

if [ ! -d "$DIR/data" ]; then
  rm -rf "$DIR"; mkdir -p "$DIR"
  [ "$AS_ROOT" = "1" ] && chown -R pgt:pgt "$DIR"
  q "$BIN/initdb -D $DIR/data -U $USER_ --auth=trust" >/dev/null
  q "$BIN/pg_ctl -D $DIR/data -o '-p 55432 -k $DIR' -l $DIR/log start" >/dev/null
  sleep 2
fi
P="$BIN/psql -h $DIR -p 55432 -U $USER_"

cp tools/sql-stub.sql sql/*.sql "$DIR/" 2>/dev/null || true
[ "$AS_ROOT" = "1" ] && chown pgt:pgt "$DIR"/*.sql || true

q "$P -d postgres -q -c 'drop database if exists salus' -c 'create database salus'" 2>&1 | grep -v NOTICE || true
q "$P -d salus -v ON_ERROR_STOP=1 -q -f $DIR/sql-stub.sql" 2>&1 | grep -v NOTICE || true

fail=0
for f in "$@"; do
  printf '  %-24s ' "$f"
  out=$(q "$P -d salus -v ON_ERROR_STOP=1 -q -f $DIR/$f.sql" 2>&1 | grep -v 'skipping' || true)
  if echo "$out" | grep -q ERROR; then
    echo "FAILED"; echo "$out" | tail -8 | sed 's/^/      /'; fail=1
  else
    echo "ok"; echo "$out" | grep NOTICE | sed 's/^/      /' || true
  fi
done
# Twice, because a migration that only works on a clean database is a
# migration you can't re-run when half of it has already landed.
echo "  --- again, for idempotency ---"
for f in "$@"; do
  printf '  %-24s ' "$f"
  out=$(q "$P -d salus -v ON_ERROR_STOP=1 -q -f $DIR/$f.sql" 2>&1 | grep -v 'skipping' || true)
  echo "$out" | grep -q ERROR && { echo "FAILED"; echo "$out"|tail -6|sed 's/^/      /'; fail=1; } || echo ok
done
exit $fail
