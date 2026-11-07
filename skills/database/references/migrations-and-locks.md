# Migrations and locks (PostgreSQL 17; Alembic, Prisma, Drizzle, Kysely; MySQL notes)

Tags: **[PG]** PostgreSQL 17 docs · **[SM]** ankane/strong_migrations · **[GL]** GitLab migration
style guide · **[RD]** Ambler & Sadalage, _Refactoring Databases_ · **[DRE]** Campbell & Majors,
_Database Reliability Engineering_ · **[def]** defaults from `init-project`'s `data-and-reliability.md` · **[mem]** from memory, not checked online this time.

Verified on 2026-11-07 against:

- https://www.postgresql.org/docs/17/explicit-locking.html
- https://www.postgresql.org/docs/17/sql-altertable.html
- https://www.postgresql.org/docs/17/sql-createindex.html
- https://www.postgresql.org/docs/17/runtime-config-client.html
- https://github.com/ankane/strong_migrations
- https://docs.gitlab.com/development/migration_style_guide/

## Contents

1. Why locks, not duration, cause outages
2. Lock level and rewrite per statement
3. Safe recipes for risky changes
4. Expand → migrate → contract
5. Backfills
6. Alembic patterns
7. Node migration tools (Prisma, drizzle-kit, Kysely)
8. Timeouts
9. Pre-flight and post-flight checks
10. MySQL differences

## 1. Why locks, not duration, cause outages

- Lock requests queue: a DDL waiting for `ACCESS EXCLUSIVE` behind one long-running transaction
  blocks every later query on that table, including plain `SELECT`s, until it gets the lock. A
  "fast" `ALTER` can therefore stall the app. Mitigation: `lock_timeout` so the DDL gives up and
  is retried. [PG] (queueing behaviour) [SM] [GL]
- Only `ACCESS EXCLUSIVE` conflicts with plain reads; `SHARE` (plain `CREATE INDEX`) blocks writes
  but not reads. [PG]
- Waits on locks are indefinite unless `lock_timeout` or a deadlock ends them. [PG]
- Rule of thumb: keep each regular migration to a few minutes and each query under about a second;
  move long data work out of the deploy path. GitLab's limits are ≤ 3 min regular, ≤ 10 min
  post-deploy, data work longer than that as batched background jobs. [GL]

## 2. Lock level and rewrite per statement

| Statement                                                                                       | Lock                                                        | Rewrite / scan                                             | Notes                                                                            |
| ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------- | ---------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `ADD COLUMN` (no default or non-volatile default)                                               | ACCESS EXCLUSIVE (brief)                                    | none — default kept in catalog                             | safe with `lock_timeout` [PG]                                                    |
| `ADD COLUMN … DEFAULT <volatile>` (`now()` is stable; `random()`, `gen_random_uuid()` volatile) | ACCESS EXCLUSIVE                                            | full rewrite + indexes                                     | add without default, backfill [PG] [SM]                                          |
| `ALTER COLUMN TYPE`                                                                             | ACCESS EXCLUSIVE                                            | rewrite unless binary-coercible (e.g. `varchar(n)`→`text`) | expand/contract [PG]                                                             |
| `SET NOT NULL`                                                                                  | ACCESS EXCLUSIVE                                            | full scan unless a valid `CHECK (col IS NOT NULL)` exists  | add CHECK `NOT VALID` → `VALIDATE` → `SET NOT NULL` → drop CHECK [PG] [SM]       |
| `ADD CONSTRAINT … CHECK`                                                                        | ACCESS EXCLUSIVE                                            | scan                                                       | use `NOT VALID` then `VALIDATE` [PG]                                             |
| `ADD FOREIGN KEY`                                                                               | SHARE ROW EXCLUSIVE on both tables                          | scan                                                       | use `NOT VALID` then `VALIDATE` [PG]                                             |
| `VALIDATE CONSTRAINT`                                                                           | SHARE UPDATE EXCLUSIVE (+ ROW SHARE on referenced table)    | scan, writes continue                                      | [PG]                                                                             |
| `ADD UNIQUE` / `PRIMARY KEY`                                                                    | ACCESS EXCLUSIVE + index build                              | build                                                      | `CREATE UNIQUE INDEX CONCURRENTLY` then `ADD CONSTRAINT … USING INDEX` [SM] [PG] |
| `CREATE INDEX`                                                                                  | SHARE (blocks writes)                                       | build                                                      | use `CONCURRENTLY` [PG]                                                          |
| `CREATE INDEX CONCURRENTLY`                                                                     | SHARE UPDATE EXCLUSIVE                                      | two scans, waits for old transactions                      | not in a transaction block; not on partitioned parents [PG]                      |
| `DROP INDEX`                                                                                    | ACCESS EXCLUSIVE                                            | —                                                          | `DROP INDEX CONCURRENTLY` [PG] [mem]                                             |
| `RENAME COLUMN/TABLE`                                                                           | ACCESS EXCLUSIVE (brief)                                    | none                                                       | breaks running code — expand/contract or a view [SM]                             |
| `DROP COLUMN`                                                                                   | ACCESS EXCLUSIVE (brief)                                    | none (space reclaimed later)                               | stop reading it first [SM]                                                       |
| `ATTACH PARTITION`                                                                              | SHARE UPDATE EXCLUSIVE on parent, ACCESS EXCLUSIVE on child | scan unless CHECK implies bounds                           | [PG]                                                                             |
| `CREATE TRIGGER`                                                                                | SHARE ROW EXCLUSIVE                                         | —                                                          | [PG]                                                                             |
| `REFRESH MATERIALIZED VIEW`                                                                     | ACCESS EXCLUSIVE                                            | —                                                          | `CONCURRENTLY` needs a unique index, takes EXCLUSIVE (reads continue) [PG]       |
| `VACUUM FULL`, `CLUSTER`, `TRUNCATE`                                                            | ACCESS EXCLUSIVE                                            | rewrite                                                    | never on a live hot table [PG]                                                   |

Several subcommands in one `ALTER TABLE` take the strictest lock among them. [PG]

## 3. Safe recipes for risky changes

- **New required column**: add nullable (or with constant default) → deploy code that writes it →
  backfill → `CHECK (col IS NOT NULL) NOT VALID` → `VALIDATE` → `SET NOT NULL` → drop the CHECK. [SM] [PG]
- **Rename column** (`title` → `name`): add `name` → code writes both, reads `title` → backfill →
  code reads `name` → stop writing `title` → drop `title` (contract, with an ADR). [RD] [SM]
- **Change type**: same as rename with a new column of the new type; compare counts before the switch. [SM]
- **Split or move a table**: new table → dual write (app or trigger) → backfill → switch reads →
  drop old. [RD] [SM]
- **Unique constraint**: clean duplicates first (query them), `CREATE UNIQUE INDEX CONCURRENTLY`,
  then `ADD CONSTRAINT … UNIQUE USING INDEX`. [SM]
- **Foreign key**: `ADD CONSTRAINT … FOREIGN KEY … NOT VALID` in one revision; `VALIDATE CONSTRAINT`
  in the next; add the index on the referencing column concurrently. [PG] [SM]
- **Remove column**: stop referencing it in code (SQLAlchemy `Table` definitions too) and deploy;
  then drop. [SM]
- **Enum value**: `ALTER TYPE … ADD VALUE` is cheap, but the new value cannot be used in the same
  transaction that adds it; removing a value requires a new type. Prefer `CHECK (col IN (…))` or a lookup
  table for sets that change. [mem]
- **Large table becoming partitioned**: new partitioned table + dual write + backfill + swap; not a
  single migration. [mem]

## 4. Expand → migrate → contract

- **Expand**: additive DDL only; old code keeps working. [RD]
- **Migrate**: deploy code that writes both shapes; backfill; switch reads; verify with a count
  or checksum query. [RD]
- **Contract**: remove the old shape in a later deploy, after the old code is gone everywhere
  (workers too). Dropping a column or table needs an ADR and a fresh backup, because it is the one step a
  redeploy cannot undo. [RD] [def]
- Each phase is its own revision and its own deploy; never expand and contract in one release. [RD]
- Transition period has an end date in the backlog, or the old column lives forever. [RD]

## 5. Backfills

- Run outside the DDL transaction: a script (`make backfill-<name>`) or a job on the Postgres queue. [SM] [GL]
- Batch by primary-key range (UUID v7 keys are time-ordered, so ranges are cheap):
  `UPDATE t SET new = … WHERE id > :last AND id <= :next AND new IS NULL` — 1–10 k rows per batch,
  commit each, sleep briefly between batches, log progress. [SM] [mem for batch sizes]
- Idempotent (the `IS NULL` guard) and resumable from the last key. [SM]
- Watch replication lag and autovacuum; large updates create dead tuples. [DRE] [mem]
- Verify: `SELECT count(*) FROM t WHERE new IS NULL` is 0 before the read switch. [mem]

## 6. Alembic patterns [mem — Alembic docs not re-fetched this session]

```python
def upgrade() -> None:
    op.execute("SET lock_timeout = '5s'")
    op.execute("SET statement_timeout = '15min'")
    op.add_column("orders", sa.Column("slug", sa.Text(), nullable=True))

# separate revision: concurrent index
def upgrade() -> None:
    with op.get_context().autocommit_block():
        op.create_index("ix_orders_slug", "orders", ["slug"], unique=False,
                        postgresql_concurrently=True, if_not_exists=True)

def downgrade() -> None:
    with op.get_context().autocommit_block():
        op.drop_index("ix_orders_slug", table_name="orders",
                      postgresql_concurrently=True, if_exists=True)
```

- `autocommit_block()` ends Alembic's transaction so `CONCURRENTLY` can run; keep such revisions to
  that one statement. Note `SET` inside the block applies to the session, so reset or set
  `lock_timeout` again inside it. [mem]
- A failed concurrent build leaves an INVALID index: drop it and retry, or `REINDEX INDEX
CONCURRENTLY`. `if_not_exists=True` alone would skip the broken index — check `indisvalid`. [PG]
- Use `alembic upgrade head --sql` to review the generated SQL; review autogenerate output by hand
  (it misses renames and server defaults). [mem]
- Data migrations that touch many rows do not belong in a revision; small reference-data inserts may. [GL]

## 7. Node migration tools (Prisma, drizzle-kit, Kysely) [mem — re-check flags against the installed version]

Every rule above is engine-level, so it applies unchanged; only the commands differ. The generated
SQL is a draft: open it and apply §2–3 by hand, because no generator adds `lock_timeout`,
`CONCURRENTLY` or `NOT VALID` for you.

| Step (Alembic)                         | Prisma Migrate                                                                                                                                                                        | drizzle-kit                                                                                             | Kysely `Migrator`                                                                                        |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Current head (`alembic heads/history`) | `npx prisma migrate status`                                                                                                                                                           | `drizzle.__drizzle_migrations` table; files in `drizzle/`                                               | `migrator.getMigrations()` (`kysely_migration` table)                                                    |
| New revision (`alembic revision`)      | `npx prisma migrate dev --create-only --name <n>`, then edit `migration.sql`                                                                                                          | `npx drizzle-kit generate --name <n>`; `--custom` for an empty file                                     | new file `migrations/<timestamp>_<n>.ts` with `up`/`down`                                                |
| Concurrent index (`autocommit_block`)  | a migration file holding only `CREATE INDEX CONCURRENTLY …`; if it reports "cannot run inside a transaction block", run that file with `npx prisma db execute --file` as its own step | a custom migration holding only that statement; same fallback if the migrator wraps it in a transaction | `up` runs the statement through the `sql` tag; construct the `Migrator` with `disableTransactions: true` |
| Apply (`alembic upgrade head`)         | `npx prisma migrate deploy` (one-off job, never `migrate dev` in production)                                                                                                          | `npx drizzle-kit migrate` or `migrate()` from `drizzle-orm/<driver>/migrator`                           | `migrator.migrateToLatest()`                                                                             |
| Down (`alembic downgrade -1`)          | none: write a forward "revert" migration, or `migrate diff` to produce one; test roll-forward                                                                                         | none: roll forward                                                                                      | `migrator.migrateDown()`                                                                                 |
| Drift (`alembic check`)                | `npx prisma migrate diff --from-migrations prisma/migrations --to-schema-datamodel prisma/schema.prisma --exit-code` (needs a shadow DB)                                              | `npx drizzle-kit check` and `generate` printing "No schema changes"                                     | compare `pg_dump --schema-only` before/after in CI                                                       |
| Review SQL (`upgrade --sql`)           | read `migration.sql`                                                                                                                                                                  | read the generated `.sql`                                                                               | the `up` source is the SQL                                                                               |
| Lint (`squawk`)                        | `squawk prisma/migrations/*/migration.sql`                                                                                                                                            | `squawk drizzle/*.sql`                                                                                  | lint the SQL you emit, or review by hand                                                                 |

- Prisma renames: the diff engine sees drop + add — data loss. Edit `migration.sql` into the
  expand/contract steps of §3 instead of accepting it.
- Put `SET lock_timeout = '5s';` at the top of each hand-reviewed SQL file (it is session-scoped in a
  migrator's connection; reset it afterwards if the migrator reuses the connection).
- With no real `down` (Prisma, drizzle-kit), "prove the migration" means: apply on a copy, run the
  old app version against the new schema, and apply the next forward migration cleanly.
- Backfills stay out of migrations in every tool: a script (`npm run backfill:<name>`) or a job.

## 8. Timeouts

- `lock_timeout`: per lock attempt; `statement_timeout`: per statement; both default 0 (off). [PG]
- `lock_timeout` ≥ `statement_timeout` never fires (statement timeout wins). [PG]
- `idle_in_transaction_session_timeout` kills sessions that hold locks while idle in a transaction and
  block vacuum. `transaction_timeout` is new in 17. [PG]
- Do not set `statement_timeout`/`lock_timeout` globally in `postgresql.conf`; set per session or per
  role (`ALTER ROLE app SET …`). [PG]
- Starting values: app role `statement_timeout` 15 s, `lock_timeout` 10 s (strong_migrations
  suggests these); migrations `lock_timeout` 5–10 s with a long `statement_timeout`. [SM]
- Retry a migration that hit `lock_timeout` (SQLSTATE `55P03`) a bounded number of times with
  backoff, as GitLab's `with_lock_retries` does (up to 50 attempts). [GL]

## 9. Pre-flight and post-flight checks

Pre-flight:

- Long transactions that would block the DDL:
  `SELECT pid, now() - xact_start, state, query FROM pg_stat_activity WHERE xact_start < now() - interval '1 min';` [mem]
- Table size: `SELECT pg_size_pretty(pg_total_relation_size('orders'));` [mem]
- Fresh backup or PITR window covers now (before any contract step). [DRE]

Post-flight:

- Invalid indexes: `SELECT indexrelid::regclass FROM pg_index WHERE NOT indisvalid;` [PG]
- Unvalidated constraints: `SELECT conname FROM pg_constraint WHERE NOT convalidated;` [mem]
- `ANALYZE <table>` after a type change or big backfill (type changes drop column statistics). [PG]
- Error rate and p95 latency unchanged on the dashboard for the next 15 minutes. [DRE]

## 10. MySQL differences

Postgres is the reference engine in these skills. On MySQL 8.0 / 8.4 (InnoDB) these rules change;
everything else holds. [mem — check against the MySQL 8.4 "Online DDL Operations" page for the server version in use]

- **Online DDL instead of `CONCURRENTLY`**: choose the algorithm explicitly so MySQL refuses rather
  than silently copying the table: `ALTER TABLE orders ADD INDEX ix_orders_slug (slug),
ALGORITHM=INPLACE, LOCK=NONE;`. `ALGORITHM=INSTANT` covers adding a column (any position since
  8.0.29), dropping a column, and changing a default — metadata only.
- **Metadata lock queue** is the same hazard as §1: every `ALTER` takes an exclusive metadata lock at
  start and end, and it queues behind any open transaction that touched the table. Set
  `SET SESSION lock_wait_timeout = 5;` (default is a year) before DDL.
- **Rewrites**: changing a column type, `NULL`→`NOT NULL`, changing a primary key and charset changes
  copy the table (`ALGORITHM=COPY`, writes blocked). For a large hot table use gh-ost or
  pt-online-schema-change, or expand/contract as in §3.
- **No transactional DDL**: each DDL statement commits implicitly, so a migration with several
  statements can fail half-applied. One DDL statement per migration; make each one re-runnable.
- **No `NOT VALID`**: adding a foreign key or `CHECK` validates immediately (FKs `INPLACE` only with
  `foreign_key_checks=0`, which skips validation entirely — then verify with a query). Adding a FK
  also requires an index on the column and creates one if missing.
- **Backfills**: batch by primary key as in §5; InnoDB locks the index ranges an `UPDATE` scans, so
  an unindexed `WHERE` in a backfill can lock far more rows than it changes.
- Lint with your migration tool's checks or review by hand; `squawk` is Postgres-only.
