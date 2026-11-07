# Modelling, indexing and query review

Tags: **[PG]** PostgreSQL docs · **[UTIL]** Markus Winand, _Use The Index, Luke_ · **[KAR]** Bill Karwin,
_SQL Antipatterns_ · **[DDIA]** Kleppmann, _Designing Data-Intensive Applications_ · **[house]** Kiln
conventions/ADRs · **[mem]** from memory, not checked online this time.

Verified on 2026-11-07 against:

- https://www.postgresql.org/docs/17/sql-createindex.html
- https://www.postgresql.org/docs/17/indexes-multicolumn.html
- https://www.postgresql.org/docs/17/brin.html
- https://www.postgresql.org/docs/17/using-explain.html
- https://www.postgresql.org/docs/18/functions-uuid.html
- https://use-the-index-luke.com/no-offset
- https://use-the-index-luke.com/sql/partial-results/fetch-next-page
- https://use-the-index-luke.com/sql/where-clause/searching-for-ranges/greater-less-between-tuning-sql-access-filter-predicates

## Contents

1. Data modelling
2. Keys and ids
3. Indexes
4. Reading EXPLAIN (ANALYZE, BUFFERS)
5. Query review
6. Pagination and bounded results

## 1. Data modelling

- Model from the queries and invariants of the use cases, not from the UI screens. One aggregate per
  transaction; reference other aggregates by id. [DDIA] [house]
- Start in third normal form: every non-key column depends on the key, the whole key, nothing but the
  key. Repeating groups and comma-separated lists become child tables ("Jaywalking"). [KAR] [mem]
- Denormalise only with a measured read problem and a named mechanism that keeps the copy right
  (trigger, job on the queue, materialised view, generated column). Record it as derived data. [DDIA]
- Put invariants in the database: `NOT NULL`, `CHECK`, `UNIQUE` (partial unique for "one active per
  owner"), foreign keys with deliberate `ON DELETE` (`RESTRICT` by default, `CASCADE` only inside an
  aggregate). App validation is for messages; constraints are for truth. [KAR] [PG]
- Types: `timestamptz` in UTC [house]; `numeric` or integer minor units for money, never `float` [KAR];
  `text` + `CHECK (length(x) <= n)` instead of `varchar(n)` where the limit is a business rule [mem];
  `jsonb` (not `json`) for genuinely schemaless parts, with the queried keys promoted to columns [DDIA] [mem].
- Avoid: EAV ("entity-attribute-value"), polymorphic associations (`commentable_type` +
  `commentable_id` cannot have an FK — use one FK column per parent or an intermediate table),
  multi-column attributes (`tag1, tag2, tag3`), metadata tribbles (`sales_2025`, `sales_2026` tables —
  use partitioning). [KAR]
- Soft delete only when restore/audit is a requirement; it costs a predicate on every query and
  breaks unique constraints unless they are partial (`WHERE deleted_at IS NULL`). [house] [mem]
- History/audit: an append-only table written in the same transaction, or an outbox event. [DDIA]
- Personal data: classify columns (identifier, contact, content, sensitive); keep PII in few tables so
  deletion is one path; no PII in ids, URLs or object keys. [house]

## 2. Keys and ids

- Surrogate primary key `uuid` holding UUID v7 (time-ordered): inserts append to the right of the
  B-tree instead of scattering like v4, ids sort by creation, and range-based batching works. [house]
  [mem for the locality argument]
- Postgres 17 has no built-in v7 generator (`gen_random_uuid()` is v4); Postgres 18 adds `uuidv7()`.
  On 17, generate v7 in the application (Python 3.14 `uuid.uuid7()` or the `uuid6`/`uuid-utils`
  package) and pass it in. [PG18 docs verified; Python API from memory]
- UUID v7 exposes creation time; do not use it as a secret or where creation time is sensitive. [mem]
- Natural keys (email, slug) get a `UNIQUE` constraint but are not the PK — they change. [KAR] [mem]
- Composite PKs for pure join tables (`(asset_id, tag_id)`), which also serve as the index for the
  first column. [mem]
- Idempotency keys and external event ids get a `UNIQUE` constraint; `INSERT … ON CONFLICT DO NOTHING
RETURNING` decides the winner. [house: Kiln ADR 0006]

## 3. Indexes

Types [PG]:

- **B-tree** (default): equality, ranges, `ORDER BY`, `LIKE 'prefix%'` (with `text_pattern_ops` or C
  collation [mem]). Only B-tree supports unique indexes.
- **GIN**: containment in `jsonb` (`@>`), arrays, full-text `tsvector`, trigram search with `pg_trgm`
  [mem for trgm]. Multicolumn GIN works for any subset of its columns.
- **BRIN**: very large, append-mostly tables where the column correlates with physical order
  (created_at on an event log). Tiny; lossy; `pages_per_range` (default 128) trades size for
  precision; `autosummarize` is off by default.
- **GiST/SP-GiST**: ranges, geometry, exclusion constraints (no overlapping bookings). [PG] [mem]
- **Hash**: rarely worth it over B-tree. [mem]

Design rules:

- Index for the query, not the column. Start from `pg_stat_statements` (top total time) and the
  endpoints in the spec's latency targets. [UTIL] [mem for pg_stat_statements]
- Composite order: equality predicates first, then the one range or sort column. After the first
  range column, later columns only filter inside the scanned range. [UTIL] [PG]
- Postgres 17 has no B-tree skip scan (added in 18 [mem]): a query that does not constrain the leading
  column generally will not use the index well. [PG]
- Sort + limit: an index matching `ORDER BY` (direction included) lets the plan stop after N rows —
  "pipelined top-N". [UTIL]
- **Partial index** (`WHERE status = 'queued'`) for hot subsets such as a job queue; the query's
  predicate must imply the index predicate. Partial unique index for "at most one X per Y when …". [PG]
- **Covering** (`INCLUDE (col)`) to enable index-only scans; costs size and disables B-tree
  deduplication; index-only scans also need a recently vacuumed visibility map. [PG] [mem for VM]
- **Expression index** for `lower(email)` or `(payload->>'kind')`; the query must use the same
  expression. [PG] [mem]
- Every FK column gets an index, or deletes on the parent scan the child. [mem]
- Remove unused and duplicate indexes: `pg_stat_user_indexes.idx_scan = 0` over a representative
  period; each index taxes every write. [mem]
- Functions on the column (`WHERE date(created_at) = …`), implicit casts and leading wildcards
  (`LIKE '%x'`) defeat a B-tree. Rewrite as ranges. [UTIL]

## 4. Reading EXPLAIN (ANALYZE, BUFFERS)

- `ANALYZE` executes the statement; wrap DML in `BEGIN; … ROLLBACK;`. [PG]
- On 17, `BUFFERS` must be requested explicitly (it is on by default with ANALYZE from 18 [mem]);
  `SERIALIZE` (new in 17) adds the cost of converting rows for output. [PG]
- Each node: estimated `rows=` vs `actual … rows=`; a gap of 10× or more points at stale or missing
  statistics (`ANALYZE`, `CREATE STATISTICS` for correlated columns). [PG] [mem for 10× heuristic]
- `loops=N`: actual time and rows are per loop — multiply. A nested loop with a large `loops` on the
  inner side is the classic N+1 inside the database. [PG]
- `Buffers: shared hit=… read=…`: hits came from shared buffers, reads from OS cache or disk. Compare
  runs warm and cold; the node with most `read` is where I/O goes. [PG]
- `Rows Removed by Filter` large → the index does not match the predicate (wrong column order or
  missing partial predicate). [mem]
- `Sort Method: external merge Disk` → `work_mem` too small for this sort or a missing index for the
  order. [mem]
- `LIMIT` stops nodes early, so actual < estimate is not an estimation error there. [PG]
- Plans change with data size: always test on a seeded dataset near production size (Kiln house rule:
  top queries on ~1 M rows). Use `auto_explain` in staging to catch slow plans in context. [house] [mem]
- Tools: paste plans into explain.dalibo.com or explain.depesz.com to read them (do not paste
  production data with PII). [mem]

## 5. Query review

Checklist for each new or changed query [UTIL] [KAR] [mem]:

- Bounded: has a `LIMIT` or a key predicate that bounds it; the API caps page size.
- Selects only needed columns (enables index-only scans, smaller payloads); no `SELECT *` in hot paths.
- Uses bind parameters — never string-built SQL (injection and plan-cache misses). SQLAlchemy Core
  `text()` with `:params` or the expression language.
- No query in a loop: batch with `WHERE id = ANY(:ids)`, a join, or a second query keyed by the
  parent ids (the `selectinload` shape). Guard with a statement-count test.
- `COUNT(*)` on a large table for a badge or total: use an estimate, a cached counter, or "more than N".
- `NOT IN (subquery)` with NULLs returns nothing — use `NOT EXISTS`. [KAR]
- `OR` across different columns often defeats indexes — consider `UNION ALL` of two indexed queries.
- `DISTINCT` hiding a bad join — fix the join.
- Updates touching many rows run in batches (see migrations §5).
- Aggregations for dashboards: materialised view refreshed `CONCURRENTLY` on a schedule, or a summary
  table maintained by the job queue — not a live `GROUP BY` over the whole history per request.

## 6. Pagination and bounded results

- `OFFSET n` reads and discards n rows and drifts when rows are inserted between pages. [UTIL]
- Keyset ("seek") pagination: `WHERE (created_at, id) < (:last_created_at, :last_id) ORDER BY
created_at DESC, id DESC LIMIT :n`; Postgres supports row-value comparison and can use it for index
  access. [UTIL]
- The sort must be deterministic — add the unique id as tiebreaker — and an index must match the
  `ORDER BY` columns in order: `(created_at, id)` (or just `id` when ids are UUID v7). [UTIL]
- Cost: no jumping to page 37; the client sends an opaque cursor (base64 of the last key) instead of a
  page number. Fine for feeds and infinite scroll. [UTIL]
- API contract: `limit` defaulted and capped (e.g. default 50, max 200), `next_cursor` null at the end. [house: api-design] [mem for numbers]
