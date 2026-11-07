---
name: database
description: Designs and changes relational schemas and queries in PostgreSQL — data model with constraints in the database, zero-downtime Alembic migrations (expand → migrate → contract, lock timeouts, CREATE INDEX CONCURRENTLY, batched backfills), indexes proven with EXPLAIN (ANALYZE, BUFFERS), query review (N+1, keyset pagination, bounded results), transaction and locking choices with retries, connection pooling, backups with a tested restore, and PII retention. Produces a migration that is safe to run on a live table, the plans that prove each hot query, and notes in the delivery folder. Use when a change adds or alters a table, column, constraint or index, when a query is slow ("query chậm", "tối ưu database", "thêm index", "migration", "đổi schema", "database"), when concurrent writes can collide, or before launch to check backups and retention. Inside a delivery, `ship` and `deliver-loop` call this skill.
---

# database — schema changes that never lock production, queries proven by their plans

House defaults (Kiln ADR 0001): Postgres 17, SQLAlchemy 2 Core, Alembic as the only schema path,
UUID v7 ids, UTC timestamps, a Postgres job queue with `SKIP LOCKED`. Design-level choices (which store,
aggregate boundaries, idempotency) belong to `architect` step 4 and
`init-project/references/data-and-reliability.md`; this skill does the hands-on work below that line.
Evidence goes to `docs/delivery/<NNN-slug>/evidence/db/` (or the story's QA section on a Quick path).

## Workflow

1. **Load the context.** Read the ADRs that touch data, `docs/conventions.md`, the current Alembic
   head (`alembic heads`, `alembic history -r -3:`) and the tables involved (`\d+ <table>` via
   `psql "$DATABASE_URL"`, or `docker compose exec db psql -U <user> <db>` when `psql` is not installed on the host). Note row counts (`SELECT reltuples FROM pg_class WHERE relname = …`).
   _Evidence_: one paragraph "current shape" in `evidence/db/notes.md`.
2. **Model the change.** Write the target tables as DDL first: keys, `NOT NULL`, `CHECK`, `UNIQUE`,
   foreign keys with an explicit `ON DELETE`, `timestamptz`, enums as `CHECK` or lookup tables. Start in
   3NF; denormalise only with a measured read problem and a named owner of the copy (trigger, job or
   materialised view). Classify every new column that holds personal data and give it a retention rule.
   _Evidence_: DDL block + PII table in `notes.md`. → `references/modelling-and-queries.md` §1–2.
3. **Plan the migration as phases.** Classify each DDL statement by the lock it takes and whether it
   rewrites or scans the table (`references/migrations-and-locks.md` §2). Anything that is not
   metadata-only on a non-empty table becomes expand → migrate → contract across separate deploys;
   renames and type changes are add-new + dual-write + backfill + switch reads + drop-old.
   _Evidence_: phase table (statement, lock, rewrite?, deploy n) in `notes.md`.
4. **Write the Alembic revisions.** One concern per revision; `SET lock_timeout` (e.g. 5 s) and a
   `statement_timeout` at the top; indexes with `postgresql_concurrently=True` inside
   `op.get_context().autocommit_block()`; foreign keys and checks `NOT VALID` then `VALIDATE` in a
   second revision; backfills as a separate idempotent batched script, not inside the DDL transaction.
   A real `downgrade()` for every revision; a destructive contract step needs an ADR and a backup.
   _Evidence_: the revision files.
5. **Prove the migration.** Against a local database seeded to realistic size: `alembic upgrade head`,
   `alembic downgrade -1`, `alembic upgrade head` again; `alembic check` (model and schema agree);
   while it runs, a second session doing writes must not block longer than `lock_timeout`
   (watch `pg_locks`/`pg_stat_activity`). Optional linter: `squawk` on `alembic upgrade --sql` output.
   _Evidence_: command output + timings in `evidence/db/migration.txt`.
6. **Prove each hot query.** For every new or changed query on a table that can grow: run
   `EXPLAIN (ANALYZE, BUFFERS, SERIALIZE)` on seeded data (DML inside `BEGIN … ROLLBACK`), compare
   estimated vs actual rows, find the node with most time × loops and most `shared read`. Add or adjust
   the index (equality columns first, range/sort last; partial or `INCLUDE` when it removes heap
   visits); re-run and keep before/after. → `references/modelling-and-queries.md` §3–4.
   _Evidence_: `evidence/db/plans/<query>.txt` with both plans and the timing delta.
7. **Review the access code.** Search the diff for loops that query (`for … in …:` around
   `execute`), unbounded `SELECT` without `LIMIT`, `OFFSET` pagination on growing lists, `SELECT *`
   in hot paths, string-built SQL. Fix with set-based queries (`IN`/`ANY`, joins, `selectinload`-style
   batch loads), keyset pagination and a hard page-size cap. Add a test that counts statements for
   the endpoint (SQLAlchemy `before_cursor_execute` listener) so an N+1 fails CI.
   _Evidence_: the test, green.
8. **Choose the concurrency control.** For each write path that can race: atomic single statement
   (`UPDATE … SET n = n + 1`, `INSERT … ON CONFLICT`) → optimistic `version` column with
   `WHERE version = :v` → `SELECT … FOR UPDATE` (rows locked in a consistent order) → `SERIALIZABLE`
   with retry on SQLSTATE `40001`/`40P01`. Queues use `FOR UPDATE SKIP LOCKED`. Write a test that runs
   two transactions concurrently and asserts the invariant.
   → `references/transactions-and-operations.md` §1–2. _Evidence_: the race test, green.
9. **Check the connection budget.** Sum pool sizes across processes (API workers × (`pool_size` +
   `max_overflow`) + worker processes + migrations + admin) and compare with `max_connections` minus
   reserved; confirm `pool_pre_ping`, timeouts and `idle_in_transaction_session_timeout`.
   _Evidence_: the arithmetic in `notes.md`. → `references/transactions-and-operations.md` §3.
10. **Before launch or when PII changes**: confirm backups are taken and a restore was drilled
    (PITR to a timestamp into a scratch instance, row counts compared), and that the delete/retention
    job for each PII column exists and is tested. → `references/transactions-and-operations.md` §4–5.
    _Evidence_: restore log with duration in `docs/runbook.md`.
11. **Hand back.** Update the ADR if a decision changed, `docs/architecture` if the model did; then
    return to the calling phase (`deliver-loop` review, `verify-app`).

## Core checklist

1. Every invariant the database can check is a constraint (`NOT NULL`, `CHECK`, `UNIQUE`, FK), not only app code.
2. Every foreign key column has an index (Postgres does not create one).
3. Every migration sets `lock_timeout`; nothing waits behind a long transaction holding up all traffic.
4. No `CREATE INDEX` without `CONCURRENTLY` on a table that has rows in production.
5. No table rewrite (`ALTER COLUMN TYPE`, volatile default) on a live table — expand/contract instead.
6. FKs and CHECKs on existing tables go in `NOT VALID`, then `VALIDATE` separately; `SET NOT NULL` after a validated CHECK.
7. Backfills run in batches by key range with commits between, idempotent and resumable.
8. Each phase is deployable alone: old code runs on the new schema, new code on the old schema.
9. Hot queries have a saved `EXPLAIN (ANALYZE, BUFFERS)` on realistic data; estimates within ~10× of actuals.
10. Composite index order: equality columns, then range or `ORDER BY` columns; the sort includes a unique tiebreaker.
11. Every list endpoint is bounded (`LIMIT` ≤ cap) and paginates by keyset, not `OFFSET`.
12. No query inside a loop; N+1 guarded by a statement-count test.
13. Concurrent writes to the same row use atomic SQL, a version column or `FOR UPDATE` — and retries are bounded and only for `40001`/`40P01`/`55P03`.
14. Transactions are short: no network call, model call or user wait inside one.
15. A restore has been performed, timed and written down — a backup nobody restored is a hope.

## Anti-patterns

- EAV tables, polymorphic FKs (`owner_type` + `owner_id`), comma-separated ids in a column (Karwin).
- `FLOAT` for money; `timestamp` without time zone; `varchar(n)` limits standing in for validation.
- Auto-generated migration accepted unread; one revision that mixes DDL and a million-row `UPDATE`.
- Renaming a column in place while the old code is still running.
- Adding an index "just in case" — each one slows every write and must be justified by a plan.
- `SELECT … FOR UPDATE` on rows read in different orders by different paths (deadlocks).
- Retrying a whole request on any DB error, or retrying non-idempotent work outside the transaction.
- Session-level `SET`, advisory locks or `LISTEN` through a transaction-mode pooler.
- Soft-delete flags on every table "just in case"; PII copied into logs, caches or analytics tables.
- Replica or volume snapshot treated as the backup; `pg_dump` treated as point-in-time recovery.

## Evidence before "done"

- `alembic upgrade head && alembic downgrade -1 && alembic upgrade head` — all green, output saved.
- `alembic check` — "No new upgrade operations detected."
- Per hot query: before/after `EXPLAIN (ANALYZE, BUFFERS)` showing the intended index scan, actual rows,
  `Execution Time`, on a seeded dataset of stated size.
- During the migration on seeded data: a concurrent writer's max wait ≤ `lock_timeout`
  (`SELECT … FROM pg_stat_activity WHERE wait_event_type = 'Lock'` sampled, or the writer's latency log).
- Race test and N+1 statement-count test pass in `make ci`.
- `SELECT indexrelid::regclass FROM pg_index WHERE NOT indisvalid;` returns no rows after concurrent builds.
- For launch: restore drill log (target time, duration, row-count check) in `docs/runbook.md`.

## References

- `references/migrations-and-locks.md` — lock levels per DDL, safe recipes for each risky change,
  Alembic patterns, backfills, timeouts.
- `references/modelling-and-queries.md` — modelling rules, keys and UUID v7, index types and order,
  reading plans, query review, pagination.
- `references/transactions-and-operations.md` — isolation and anomalies, locking patterns, retries,
  pooling, backups/PITR, retention and PII.
- `../init-project/references/data-and-reliability.md` — the house design rules this skill applies.
