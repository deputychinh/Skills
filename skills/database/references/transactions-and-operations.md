# Transactions, pooling and operations

Tags: **[PG]** PostgreSQL 17 docs · **[DDIA]** Kleppmann, _DDIA_ ch. 7 · **[DRE]** Campbell & Majors,
_Database Reliability Engineering_ · **[SA]** SQLAlchemy 2.0 docs · **[PGB]** PgBouncer docs ·
**[def]** defaults from `init-project`'s `data-and-reliability.md` · **[mem]** from memory, not checked online this time.

Verified on 2026-11-07 against:

- https://www.postgresql.org/docs/17/transaction-iso.html
- https://www.postgresql.org/docs/17/explicit-locking.html
- https://www.postgresql.org/docs/17/sql-select.html (locking clause)
- https://www.postgresql.org/docs/17/runtime-config-client.html
- https://www.postgresql.org/docs/17/continuous-archiving.html
- https://docs.sqlalchemy.org/en/20/core/pooling.html
- https://www.pgbouncer.org/features.html

## Contents

1. Isolation levels and anomalies
2. Concurrency patterns
3. Connection pooling
4. Backups, PITR and restore drills
5. Retention and personal data
6. MySQL differences

## 1. Isolation levels and anomalies

| Level in Postgres          | Dirty read | Non-repeatable read | Phantom                         | Serialization anomaly |
| -------------------------- | ---------- | ------------------- | ------------------------------- | --------------------- |
| Read Committed (default)   | no         | possible            | possible                        | possible              |
| Repeatable Read (snapshot) | no         | no                  | no (stricter than the standard) | possible              |
| Serializable (SSI)         | no         | no                  | no                              | no                    |

[PG] Read Uncommitted behaves as Read Committed.

- Read Committed: each statement sees a fresh snapshot, so two reads in one transaction can disagree;
  read-modify-write in application code loses updates. [PG] [DDIA]
- Repeatable Read: updating a row that a concurrent transaction changed and committed fails with
  "could not serialize access due to concurrent update". [PG]
- Serializable also detects read/write dependency cycles (write skew: two doctors both go off call,
  two bookings for one room). [PG] [DDIA]
- Serialization failures are SQLSTATE `40001`; retry the **whole** transaction and discard anything
  read in the failed attempt. Deadlocks are `40P01` and also retryable. [PG] (40P01 code [mem])
- Anomalies to name in review [DDIA]: lost update, write skew, phantom causing write skew, read skew
  (inconsistent snapshot across two reads in Read Committed).

## 2. Concurrency patterns

Prefer the first that fits:

1. **Single atomic statement**: `UPDATE stock SET qty = qty - :n WHERE id = :id AND qty >= :n
RETURNING qty` — zero rows means "not enough". `INSERT … ON CONFLICT (key) DO UPDATE/NOTHING`. [DDIA] [mem]
2. **Constraint as arbiter**: unique or exclusion constraint makes the second writer fail; map the
   error to a domain conflict (409). [DDIA] [def]
3. **Optimistic concurrency**: `version int NOT NULL`; `UPDATE … SET …, version = version + 1 WHERE
id = :id AND version = :expected`; zero rows → conflict returned to the client (HTTP `If-Match`/ETag
   maps naturally). No locks held across user think time. [DDIA] [mem]
4. **Pessimistic row lock**: `SELECT … FOR UPDATE` (or `FOR NO KEY UPDATE` when key columns are not
   changing — it does not block FK checks) inside a short transaction. Lock rows in a consistent order
   (sort by id) to avoid deadlocks; take the most restrictive lock first. [PG]
5. **Serializable** for invariants spanning many rows (money, stock, scheduling) with an automatic
   retry wrapper. [PG] [def]
6. **Advisory locks** for "one runner at a time" jobs: prefer `pg_advisory_xact_lock` (released at
   commit); session-level ones survive rollback and break under transaction pooling. [PG] [PGB]

Queues (a jobs table on Postgres): claim with
one statement that claims and leases: `UPDATE jobs SET status = 'running', attempts = attempts + 1, leased_until = now() + <lease> WHERE id = (SELECT id FROM jobs WHERE ((status = 'queued' AND run_after <= now()) OR (status = 'running' AND leased_until < now())) AND attempts < <max> ORDER BY run_after FOR UPDATE SKIP LOCKED LIMIT 1) RETURNING *` (this form also reclaims expired leases). `SKIP LOCKED`
gives an intentionally inconsistent view — right for queue consumers, wrong for general reads. Back it
with a partial index on the queued rows. `NOWAIT` errors instead of waiting. [PG] [def]

Retry wrapper rules [mem unless tagged]:

- Retry only `40001`, `40P01`, and `55P03` (lock_timeout) — never constraint violations or 4xx-type
  errors. [def]
- Bounded attempts (3–5), exponential backoff with jitter. [def]
- The retried unit is the whole transaction function; side effects outside the DB (emails, HTTP,
  object storage) happen after commit or through the outbox. [DDIA] [def]
- Keep transactions short: no network or model calls inside; Postgres waits on locks indefinitely
  unless told otherwise. [PG]

Timeouts per role (`ALTER ROLE app SET …`) [PG] [mem for values]: `statement_timeout` 15 s (API),
`lock_timeout` 5–10 s, `idle_in_transaction_session_timeout` 60 s; the worker role may need longer
statements. Also set libpq keepalives and `tcp_user_timeout` so a dead link fails in ~30 s instead
of hanging a worker until the OS gives up (often 15+ minutes). [def]

## 3. Connection pooling

- Each Postgres connection is a backend process with its own memory; hundreds of mostly idle
  connections cost RAM and hurt throughput. Size pools from the work, not from traffic. [mem] [DRE]
- SQLAlchemy `QueuePool` defaults: `pool_size` 5, `max_overflow` 10 (15 total per engine),
  `pool_timeout` 30 s, `pool_recycle` off. `pool_pre_ping=True` replaces dead connections at checkout
  but does not save a transaction already in flight. [SA]
- Budget: Σ over processes of (`pool_size` + `max_overflow`) + workers + migrations + psql headroom
  < `max_connections` − `superuser_reserved_connections` (default 100 and 3 [mem]). Uvicorn/Gunicorn
  with N workers = N engines. [SA] [mem]
- Never share a pool across `fork()`: call `engine.dispose(close=False)` in the child initialiser, or
  create the engine after fork; worker child processes must follow this, or two processes share one
  socket and corrupt each other's protocol state. [SA]
- Set `pool_timeout` well below the request timeout, so pool exhaustion fails fast as 503 rather than
  queueing forever. [def] [mem]
- PgBouncer: session, transaction or statement mode. Transaction mode breaks `SET`/`RESET`,
  `LISTEN`, `WITH HOLD` cursors, SQL `PREPARE`, session advisory locks; protocol-level prepared
  statements need `max_prepared_statements` > 0. Put timeouts on the role, not in `SET`. With an
  external pooler, SQLAlchemy can use `NullPool` or a small pool. [PGB] [SA] [mem for NullPool advice]
- Node: `pg.Pool` `max` (default 10), `idleTimeoutMillis`, `connectionTimeoutMillis` (default 0 =
  wait forever — set it below the request timeout); Prisma `connection_limit` in the URL or the
  driver adapter's pool in v7+; one pool per process, closed on `SIGTERM`. Same budget arithmetic. [mem]
- A small app with one API and one worker usually needs no PgBouncer; add it with an ADR when the
  connection budget is the limiting number. [mem]

## 4. Backups, PITR and restore drills

- Logical dumps (`pg_dump`) are portable and selective but cannot do point-in-time recovery. [PG]
- PITR = base backup (`pg_basebackup -X stream`) + continuous WAL archiving (`wal_level=replica`,
  `archive_mode=on`, an `archive_command` that returns 0 only on success and never overwrites);
  `archive_timeout` around a minute bounds the data-loss window. Managed hosts do this for you —
  confirm the retention window and that PITR is enabled. [PG]
- Restore = restore base backup, set `restore_command` and `recovery_target_time`, create
  `recovery.signal`, start, verify, then promote. Each recovery starts a new timeline. [PG]
- Monitor archiving: `pg_stat_archiver` failure counts plus the server log (some failures do not
  show in the view). Force a test with `SELECT pg_switch_wal();`. [PG]
- Restore drill (quarterly, and before launch): restore to a scratch instance at "10 minutes ago",
  compare row counts / a checksum query against production, record the time to restore. The time is
  your real RTO; the archive gap is your real RPO. [PG] [DRE]
- Replicas, RAID and volume snapshots are not backups: they replicate `DROP TABLE` too. [DRE] [def]
- Backups contain all PII: encrypt, restrict access, and apply the same retention. Object storage
  (S3 or compatible) needs its own backup or versioning — metadata without files is not a restore. [DRE] [def]

## 5. Retention and personal data

- For each PII column: purpose, legal basis, retention period, deletion path (hard delete,
  anonymise, or crypto-shred). Write it in `docs/security.md` or a data inventory. [def: GDPR and
  whichever local data-protection law applies]
- Retention job on the Postgres queue: deletes in batches by key range, idempotent, logs counts not
  content. [def] [mem]
- Deletion reaches derived copies: caches, search index, analytics tables, object storage, logs; backups
  age out on their own schedule — document that window. [DRE] [mem]
- Keep PII out of logs, error messages, cache keys, URLs and object keys. [def]
- Prefer column-level separation (a `person` table) so a deletion is one join path; encrypt sensitive
  columns at the application layer when the threat model asks for it. [mem]
- Test: a "delete my account" integration test asserts no row in any table still references the user. [mem]

## 6. MySQL differences

Postgres is the reference engine; on MySQL 8 (InnoDB) these rules change. [mem]

- Default isolation is **Repeatable Read**, but plain reads are snapshots while locking reads
  (`FOR UPDATE`, `UPDATE`, `DELETE`) see the latest committed rows — so read-then-update in code can
  still lose updates. Use the same patterns as §2 (atomic statement, version column, `FOR UPDATE`).
- InnoDB **next-key and gap locks**: in Repeatable Read, a locking read or an `UPDATE` with a range
  or unindexed predicate locks the gaps between index records, blocking inserts there. Index the
  predicate, keep ranges tight, or use Read Committed for the session where phantoms are acceptable.
- Deadlocks are detected and one transaction rolls back with error 1213 (`40001`); lock wait timeout
  is 1205 (`innodb_lock_wait_timeout`, default 50 s — lower it per session). Retry 1213 and, for
  idempotent units, 1205 — the same bounded retry rules as §2.
- `SKIP LOCKED` / `NOWAIT` exist since 8.0, so the job-claim pattern works; there is no
  `UPDATE … RETURNING`, so claim with `SELECT … FOR UPDATE SKIP LOCKED` then `UPDATE` in one short
  transaction.
- `INSERT … ON CONFLICT` becomes `INSERT … ON DUPLICATE KEY UPDATE` (or `INSERT IGNORE`, which also
  swallows other errors — avoid it).
- No `idle_in_transaction_session_timeout`: use `wait_timeout` plus pool-side transaction timeouts,
  and `max_execution_time` (SELECT only) in place of `statement_timeout`.
- Pooling: MySQL threads are cheaper than Postgres processes, but the same budget arithmetic against
  `max_connections` applies; ProxySQL plays the PgBouncer role.
- Backups: PITR = a physical or logical base backup plus binary logs (`binlog_format=ROW`, retention
  ≥ the PITR window); the restore drill in §4 is the same.
