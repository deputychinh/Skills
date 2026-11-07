# Estimation, storage choice, scaling and consistency

Tags: **[DDIA]** Kleppmann & Riccomini, _Designing Data-Intensive Applications_ 2nd ed. (O'Reilly,
March 2026; 1st ed. 2017) · **[XU]** Alex Xu, _System Design Interview_ vol. 1 (2020) and vol. 2
with Sahn Lam (2022) · **[FSA]** Richards & Ford, _Fundamentals of Software Architecture_ ·
**[DEAN]** Jeff Dean's "Latency numbers every programmer should know" · **[ABADI]** Abadi, "Consistency
Tradeoffs in Modern Distributed Database System Design", IEEE Computer 45(2), 2012 · **[FOWLER]**
martinfowler.com · **[PG]** PostgreSQL docs · **[HOUSE]** [`init-project/references/data-and-reliability.md`](../../init-project/references/data-and-reliability.md).
Book content is paraphrased from memory unless a verification line covers it.

Verified on 2026-11-07 against https://martin.kleppmann.com/2026/03/24/designing-data-intensive-applications-2e.html
(2nd ed. exists, co-author Riccomini, March 2026), https://gist.github.com/jboner/2841832 (latency
table, labelled "~2012"), https://martinfowler.com/bliki/CQRS.html,
https://cs.umd.edu/~abadi/papers/abadi-pacelc.pdf (citation via search; full text not read).

## Contents

1. Estimation method
2. Reference numbers
3. Scaling ladder
4. Storage choice
5. Consistency models, CAP and PACELC

## 1. Estimation method

Goal: order of magnitude, to find the limiting resource and to reject designs, not to predict. **[XU]** _(memory)_

1. **Users**: total, daily active, concurrent at peak. State the source or `HYPOTHESIS`.
2. **Actions per user per day** for each core use case; requests per action (an upload may be 3 API
   calls + 1 storage PUT).
3. **QPS**: `requests/day ÷ 86 400` (≈ 10⁵ s/day). Peak = average × peak factor. Either spread over the whole day (factor 2–3 for global consumer
   traffic, 5–10 for a workday tool in one time zone) **or** compress the day to its ~8 busy hours
   and apply only a burst factor of 2–3 — never both, or the peak is counted twice. _(memory: rules of thumb)_
4. **Read/write split** and which side is heavy.
5. **Storage**: objects/day × size × retention × replication/versions; rows/day × row size (incl.
   indexes ≈ 2× raw) _(memory)_.
6. **Bandwidth**: bytes in and out per second at peak; note which process carries them.
7. **Compute**: CPU-seconds per job × jobs/day; at peak, `arrival rate × service time` = busy
   workers (Little's law: items in system = arrival rate × time in system). _(memory)_
8. **Cost**: per component per month at 1× and 10×.
9. **Sanity**: compare against the reference numbers; anything within 10× of a limit is the design
   driver.

Shortcuts: 1 M req/day ≈ 12 req/s average; 100 M/day ≈ 1 200/s. 1 KB × 1 M = 1 GB. 1 MB/s ≈ 8 Mbit/s
≈ 86 GB/day.

Script skeleton for `estimate.py` (stdlib, run with `python3 estimate.py`):

```python
ASSUMPTIONS = {"users": 50, "uploads_per_user_day": 40, "avg_mb": 20, "peak_factor": 2, "busy_hours": 8}  # busy hours already compress the day
a = ASSUMPTIONS
uploads_day = a["users"] * a["uploads_per_user_day"]
avg_qps = uploads_day / (a["busy_hours"] * 3600)
print(f"uploads/day={uploads_day:,} avg/s={avg_qps:.2f} peak/s={avg_qps * a['peak_factor']:.2f}")
print(f"storage/day={uploads_day * a['avg_mb'] / 1024:.0f} GB")
```

## 2. Reference numbers

Latency (Dean via jboner gist, labelled ~2012 — **orders of magnitude only**; modern NVMe, CPUs and
networks differ, so re-measure anything that decides the design). **[DEAN]**

| Operation                                    | ≈ time |
| -------------------------------------------- | ------ |
| L1 cache reference                           | 0.5 ns |
| Main memory reference                        | 100 ns |
| Compress 1 KB (Snappy/"Zippy")               | 3 µs   |
| Send 1 KB over 1 Gbps                        | 10 µs  |
| Read 4 KB randomly from SSD                  | 150 µs |
| Read 1 MB sequentially from memory           | 250 µs |
| Round trip within one datacenter             | 500 µs |
| Read 1 MB sequentially from SSD              | 1 ms   |
| Disk seek                                    | 10 ms  |
| Read 1 MB sequentially from disk             | 20 ms  |
| Packet California → Netherlands → California | 150 ms |

Lessons that survive the age: memory ≫ SSD ≫ network across regions; a cross-region round trip
costs as much as thousands of in-DC round trips; avoid chatty calls across a WAN; batch and
compress. **[DEAN]**

Availability per 30-day month (arithmetic): 99 % → 7.2 h; 99.9 % → 43 min; 99.95 % → 22 min;
99.99 % → 4.3 min. Serial dependencies multiply: two 99.9 % dependencies in series ≈ 99.8 %.

Practical single-box figures for a Postgres + FastAPI or Node stack — rough, measure before relying on them _(memory)_:
one Postgres on a modest VM handles thousands of simple indexed queries/s and tables of 10⁸ rows
with the right indexes; one FastAPI or Node process serves hundreds of simple requests/s; a Postgres
`SKIP LOCKED` queue comfortably handles hundreds of jobs/s. **[PG]** for `SKIP LOCKED` semantics.

## 3. Scaling ladder

Climb only as far as the estimate forces; each rung adds operations work. **[HOUSE]** **[DDIA]**

| Rung | Do                                                                        | Earned when                                                                                               |
| ---- | ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| 0    | Measure: slow-query log, `EXPLAIN ANALYZE`, RED metrics                   | always first                                                                                              |
| 1    | Fix queries and indexes; keyset pagination; avoid N+1                     | a top query is slow on seeded data                                                                        |
| 2    | Vertical: bigger VM/DB instance                                           | CPU/memory bound, cheapest fix                                                                            |
| 3    | Stateless app processes ×N behind a load balancer                         | app CPU bound; state already external (12-factor)                                                         |
| 4    | Move slow/heavy work to the worker queue; return 202                      | request p95 dominated by work the user needn't wait for                                                   |
| 5    | Cache measured hot reads (HTTP caching, CDN for public blobs, then Redis) | read-heavy, tolerant of staleness                                                                         |
| 6    | Read replica for heavy reads/reports                                      | primary CPU bound on reads; replica lag acceptable                                                        |
| 7    | Partition big tables (Postgres declarative partitioning by time/tenant)   | one table's size hurts vacuum/index maintenance                                                           |
| 8    | Split a service along a bounded context, with its own data                | team/deploy independence or radically different scaling needs, and the microservice prerequisites are met |
| 9    | Shard the database                                                        | write throughput of one primary exceeded after all above                                                  |

- Backpressure belongs on every rung that adds a queue: bounded queues, 429/503 with `Retry-After`,
  shed non-critical work first. **[HOUSE]**
- CQRS (separate read and write models) suits only some complex domains, and then for one bounded
  context, not the whole system; it adds risk and complexity. Use a read-optimised projection table
  first. **[FOWLER CQRS]**

## 4. Storage choice

| Data kind                                     | Default                                                         | Choose otherwise when                                                                    | Tag                            |
| --------------------------------------------- | --------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------ |
| Transactional records, relations, constraints | Postgres                                                        | never for a solo product                                                                 | **[HOUSE]**                    |
| Semi-structured attributes                    | Postgres JSONB + GIN index                                      | documents with no cross-document queries and huge write volume                           | **[HOUSE]** **[DDIA]**         |
| Files, media, backups, exports                | S3-compatible object storage, presigned URLs                    | —                                                                                        | **[HOUSE]**                    |
| Job queue / outbox                            | Postgres table + `SKIP LOCKED`                                  | > ~1 000 jobs/s sustained, fan-out to many consumers, or cross-team streaming → a broker | **[PG]** _(threshold: memory)_ |
| Cache, rate-limit counters, sessions          | in-process / Postgres; Redis when shared and hot                | measured hot path across processes                                                       | **[HOUSE]**                    |
| Full-text search                              | Postgres `tsvector` / `pg_trgm`                                 | ranking, facets, typo tolerance at scale → OpenSearch/Meilisearch                        | **[HOUSE]**                    |
| Vectors (AI retrieval)                        | `pgvector`                                                      | > ~10⁷ vectors or strict latency → dedicated store _(memory)_                            | —                              |
| Analytics, event history                      | Postgres partitioned table; export to Parquet on object storage | heavy ad-hoc scans → columnar store (DuckDB/ClickHouse)                                  | **[DDIA]** _(memory)_          |

Questions for each choice **[DDIA]** _(memory)_: what is the source of truth and what is derived
(and can it be rebuilt)? Which access patterns (point lookup, range, full scan, search)? What
consistency does the user need? What is the durability story (replication ≠ backup; tested
restore)? How does the schema evolve (expand → migrate → contract)?

## 5. Consistency models, CAP and PACELC

- **Linearizable**: every read sees the latest committed write, as if one copy. Needed for
  uniqueness constraints, leader election, locks, balances. A single Postgres primary gives it for
  reads on the primary. **[DDIA]** _(memory)_
- **Serializable** (isolation, a different axis): transactions behave as if run one at a time. Use
  for money/stock invariants spanning rows; otherwise Read Committed + row locks or version checks. **[HOUSE]**
- **Read-your-writes**, **monotonic reads**, **consistent prefix**: the session guarantees users
  notice; reading from a lagging replica breaks them — route a user's reads to the primary for a
  short window after they write. **[DDIA]** _(memory)_
- **Eventual**: replicas/derived data converge if writes stop; fine for thumbnails, search
  indexes, counters, feeds — say what the user sees meanwhile (a "processing" state). **[DDIA]**
- **CAP**: during a network partition a replicated system chooses consistency or availability.
  It says nothing about the normal case and is often misused. **[DDIA]** _(memory)_
- **PACELC**: if Partitioned, choose Availability or Consistency; Else, choose Latency or
  Consistency. The everyday trade-off is latency vs consistency (synchronous vs asynchronous
  replication). **[ABADI]**
- **Exactly-once is an illusion at the transport level**: networks give at-most-once or
  at-least-once; "effectively once" comes from at-least-once delivery + idempotent processing
  (dedupe by key, transactional outbox). **[DDIA]** _(memory)_ **[HOUSE]**
- **Ordering**: only within a key/partition; carry a version or sequence number and make consumers
  ignore stale updates. _(memory)_
- **Clocks**: wall clocks jump; use the database clock for leases and expiries in one place
  (e.g. a maintenance-job lease) and monotonic clocks for durations. **[DDIA]** _(memory)_ **[HOUSE]**
