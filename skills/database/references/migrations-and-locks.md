# Migrations and locks (PostgreSQL 17 + Alembic)

Tags: **[PG]** PostgreSQL 17 docs · **[SM]** ankane/strong_migrations · **[GL]** GitLab migration
style guide · **[RD]** Ambler & Sadalage, _Refactoring Databases_ · **[DRE]** Campbell & Majors,
_Database Reliability Engineering_ · **[house]** Kiln ADRs/conventions · **[mem]** from memory, not checked online this time.

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
7. Timeouts
8. Pre-flight and post-flight checks

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
  code reads `name` → stop writing `title` → drop `title` (contract, with ADR per Kiln conventions). [RD] [SM]
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
  (workers too). Kiln: dropping a column/table needs an ADR and a fresh backup. [RD] [house]
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
    op.add_column("asset", sa.Column("slug", sa.Text(), nullable=True))

# separate revision: concurrent index
def upgrade() -> None:
    with op.get_context().autocommit_block():
        op.create_index("ix_asset_slug", "asset", ["slug"], unique=False,
                        postgresql_concurrently=True, if_not_exists=True)

def downgrade() -> None:
    with op.get_context().autocommit_block():
        op.drop_index("ix_asset_slug", table_name="asset",
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

## 7. Timeouts

- `lock_timeout`: per lock attempt; `statement_timeout`: per statement; both default 0 (off). [PG]
- `lock_timeout` ≥ `statement_timeout` never fires (statement timeout wins). [PG]
- `idle_in_transaction_session_timeout` kills sessions that hold locks while idle in a transaction and
  block vacuum. `transaction_timeout` is new in 17. [PG]
- Do not set `statement_timeout`/`lock_timeout` globally in `postgresql.conf`; set per session or per
  role (`ALTER ROLE app SET …`). [PG]
- Starting values: app role `statement_timeout` 15 s, `lock_timeout` 10 s (strong_migrations
  suggests these); migrations `lock_timeout` 5–10 s with a long `statement_timeout`. [SM] Kiln already
  uses `lock_timeout` 5 s for idempotency waits (ADR 0006). [house]
- Retry a migration that hit `lock_timeout` (SQLSTATE `55P03`) a bounded number of times with
  backoff, as GitLab's `with_lock_retries` does (up to 50 attempts). [GL]

## 8. Pre-flight and post-flight checks

Pre-flight:

- Long transactions that would block the DDL:
  `SELECT pid, now() - xact_start, state, query FROM pg_stat_activity WHERE xact_start < now() - interval '1 min';` [mem]
- Table size: `SELECT pg_size_pretty(pg_total_relation_size('asset'));` [mem]
- Fresh backup or PITR window covers now (before any contract step). [DRE]

Post-flight:

- Invalid indexes: `SELECT indexrelid::regclass FROM pg_index WHERE NOT indisvalid;` [PG]
- Unvalidated constraints: `SELECT conname FROM pg_constraint WHERE NOT convalidated;` [mem]
- `ANALYZE <table>` after a type change or big backfill (type changes drop column statistics). [PG]
- Error rate and p95 latency unchanged on the dashboard for the next 15 minutes. [DRE]
