---
name: database
description: Use when a change adds or alters a table, column, constraint or index, when a query is slow, when concurrent writes can collide, or before launch to check backups and data retention — even if the request only says "migration", "schema", "add an index", "the query is slow" or "database". Produces a migration that is safe on a live table (expand → migrate → contract, lock timeouts, concurrent indexes, batched backfills) with Alembic, Prisma, drizzle-kit or Kysely, EXPLAIN plans proving each hot query, N+1 and race tests, a connection budget and a tested restore. Postgres is the reference engine; MySQL differences are noted. Inside a delivery, `ship` and `deliver-loop` call this skill.
---

# database — schema changes that never lock production, queries proven by their plans

Defaults when the repo has none: Postgres (the reference engine here), one migration tool as the
only schema path, UUID v7 ids, UTC timestamps, a Postgres job queue with `SKIP LOCKED`. Follow the
repo's conventions where they exist. Both stacks are first-class:

| Step              | Python (SQLAlchemy + Alembic)                         | Node (Prisma / drizzle-kit / Kysely)                                                       |
| ----------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Current head      | `alembic heads`, `alembic history -r -3:`             | `prisma migrate status` · `drizzle/` + `__drizzle_migrations` · `migrator.getMigrations()` |
| New migration     | `alembic revision -m <n>`                             | `prisma migrate dev --create-only` · `drizzle-kit generate` · a Kysely migration file      |
| Concurrent index  | `autocommit_block()` + `postgresql_concurrently=True` | a migration holding only `CREATE INDEX CONCURRENTLY` (outside a transaction)               |
| Apply / roll back | `alembic upgrade head` / `downgrade -1`               | `prisma migrate deploy` · `drizzle-kit migrate` · `migrateToLatest()` / `migrateDown()`    |
| Drift check       | `alembic check`                                       | `prisma migrate diff … --exit-code` · `drizzle-kit check`                                  |
| N+1 guard         | `before_cursor_execute` statement counter             | Prisma `$on('query')` / Drizzle `logger` / Kysely `log` counter                            |

Full mapping and caveats: `references/migrations-and-locks.md` §6–7; MySQL: §10 there and
`references/transactions-and-operations.md` §6. Design-level choices (which store, aggregate
boundaries, idempotency) belong to `architect` and `init-project`'s `data-and-reliability.md`; this
skill does the hands-on work below that line.
Evidence goes to `docs/delivery/<NNN-slug>/evidence/db/` (or the story's QA section on a Quick path).

## Workflow

1. **Load the context.** Read the ADRs that touch data, `docs/conventions.md`, the current
   migration head (table above) and the tables involved (`\d+ <table>` via
   `psql "$DATABASE_URL"`, or `docker compose exec db psql -U <user> <db>` when `psql` is not on the host; MySQL: `SHOW CREATE TABLE`).
   Note row counts (`SELECT reltuples FROM pg_class WHERE relname = …`).
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
4. **Write the migrations.** One concern per migration; `SET lock_timeout` (e.g. 5 s) and a
   `statement_timeout` at the top; concurrent indexes in a migration of their own, outside a
   transaction (Alembic `autocommit_block()`; Prisma/drizzle-kit/Kysely as in the table); foreign keys
   and checks `NOT VALID` then `VALIDATE` in a second migration; backfills as a separate idempotent
   batched script, not inside the DDL transaction. Read generated SQL line by line — generators turn
   a rename into drop + add. A real `downgrade()`/`down` where the tool has one, else a tested
   roll-forward; a destructive contract step needs an ADR and a backup. On MySQL, use explicit
   `ALGORITHM=INSTANT|INPLACE, LOCK=NONE` and `lock_wait_timeout` instead (migrations §10).
   _Evidence_: the migration files.
5. **Prove the migration.** Against a local database seeded to realistic size: apply, roll back,
   apply again (Python: `alembic upgrade head && alembic downgrade -1 && alembic upgrade head`; Node:
   apply, run the previous app version against the new schema, apply the next migration cleanly);
   the drift check passes (model and schema agree);
   while it runs, a second session doing writes must not block longer than `lock_timeout`
   (watch `pg_locks`/`pg_stat_activity`). Optional linter: `squawk` on the migration SQL.
   _Evidence_: command output + timings in `evidence/db/migration.txt`.
6. **Prove each hot query.** For every new or changed query on a table that can grow: run
   `EXPLAIN (ANALYZE, BUFFERS, SERIALIZE)` on seeded data (DML inside `BEGIN … ROLLBACK`), compare
   estimated vs actual rows, find the node with most time × loops and most `shared read`. Add or adjust
   the index (equality columns first, range/sort last; partial or `INCLUDE` when it removes heap
   visits); re-run and keep before/after. → `references/modelling-and-queries.md` §3–4.
   _Evidence_: `evidence/db/plans/<query>.txt` with both plans and the timing delta.
7. **Review the access code.** Search the diff for loops that query (`for` around `execute`,
   `await` of a repository call inside `for`/`map`), unbounded `SELECT` without `LIMIT`, `OFFSET` pagination on growing lists, `SELECT *`
   in hot paths, string-built SQL. Fix with set-based queries (`IN`/`ANY`, joins, `selectinload`,
   Prisma `include`, Drizzle `with`), keyset pagination and a hard page-size cap. Add a test that
   counts statements for the endpoint (SQLAlchemy `before_cursor_execute`; Prisma `$on('query')`,
   Drizzle `logger`, Kysely `log`) so an N+1 fails CI. → `references/modelling-and-queries.md` §7.
   _Evidence_: the test, green.
8. **Choose the concurrency control.** For each write path that can race: atomic single statement
   (`UPDATE … SET n = n + 1`, `INSERT … ON CONFLICT`) → optimistic `version` column with
   `WHERE version = :v` → `SELECT … FOR UPDATE` (rows locked in a consistent order) → `SERIALIZABLE`
   with retry on SQLSTATE `40001`/`40P01` (MySQL: errors 1213/1205, and gap locks — transactions §6). Queues use `FOR UPDATE SKIP LOCKED`. Write a test that runs
   two transactions concurrently and asserts the invariant.
   → `references/transactions-and-operations.md` §1–2. _Evidence_: the race test, green.
9. **Check the connection budget.** Sum pool sizes across processes (API workers × (`pool_size` +
   `max_overflow`, or `pg.Pool` `max` / Prisma `connection_limit`) + worker processes + migrations +
   admin) and compare with `max_connections` minus
   reserved; confirm dead-connection checks, pool acquire timeouts and
   `idle_in_transaction_session_timeout`.
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
- Auto-generated migration accepted unread (Alembic autogenerate, `prisma migrate dev`, `drizzle-kit
generate` all emit drop + add for a rename); one migration that mixes DDL and a million-row `UPDATE`.
- `prisma db push` or `drizzle-kit push` against a shared or production database — no reviewable file.
- Renaming a column in place while the old code is still running.
- Adding an index "just in case" — each one slows every write and must be justified by a plan.
- `SELECT … FOR UPDATE` on rows read in different orders by different paths (deadlocks).
- Retrying a whole request on any DB error, or retrying non-idempotent work outside the transaction.
- Session-level `SET`, advisory locks or `LISTEN` through a transaction-mode pooler.
- Soft-delete flags on every table "just in case"; PII copied into logs, caches or analytics tables.
- Replica or volume snapshot treated as the backup; `pg_dump` treated as point-in-time recovery.

## Evidence before "done"

- Apply → roll back (or old app on new schema) → apply again — all green, output saved.
- Drift check clean (`alembic check`, `prisma migrate diff --exit-code`, `drizzle-kit check`).
- Per hot query: before/after `EXPLAIN (ANALYZE, BUFFERS)` showing the intended index scan, actual rows,
  `Execution Time`, on a seeded dataset of stated size.
- During the migration on seeded data: a concurrent writer's max wait ≤ `lock_timeout`
  (`SELECT … FROM pg_stat_activity WHERE wait_event_type = 'Lock'` sampled, or the writer's latency log).
- Race test and N+1 statement-count test pass in `make ci`.
- `SELECT indexrelid::regclass FROM pg_index WHERE NOT indisvalid;` returns no rows after concurrent builds.
- For launch: restore drill log (target time, duration, row-count check) in `docs/runbook.md`.

## References

- `references/migrations-and-locks.md` — lock levels per DDL, safe recipes for each risky change,
  Alembic and Node migration tools, backfills, timeouts, MySQL online DDL.
- `references/modelling-and-queries.md` — modelling rules, keys and UUID v7, index types and order,
  reading plans, query review, pagination, statement-count tests (Python and Node).
- `references/transactions-and-operations.md` — isolation and anomalies, locking patterns, retries,
  pooling (SQLAlchemy and Node), backups/PITR, retention and PII, MySQL locking differences.
- [`init-project`'s data-and-reliability.md](../init-project/references/data-and-reliability.md) — the design rules this skill applies.
