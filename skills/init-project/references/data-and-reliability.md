# Data and reliability

## Storage choice (Kleppmann, _Designing Data-Intensive Applications_)

- Default **PostgreSQL** for anything relational, transactional or searchable (JSONB covers most "document" needs). Choose a document store only for genuinely schemaless, document-shaped aggregates; a key-value/cache (Redis) for ephemeral or counter data; a search engine when full-text ranking matters; object storage for files.
- Schema is explicit and migrated (Alembic/Prisma): every migration forward + backward, additive first (expand → migrate data → contract), never a destructive change without an ADR and a backup.
- Indexes follow queries: every `WHERE`/`ORDER BY` on a large table has an index; composite index column order = equality first, range last; check with `EXPLAIN ANALYZE` in a test on seeded data for the top queries.
- Consistency: one aggregate per transaction; use `SELECT … FOR UPDATE` or optimistic version columns for concurrent writes; serializable only where money/stock is at stake.
- Time: store UTC; timezone is a presentation concern; business-hours logic lives in the domain with explicit calendars.
- Soft delete only when the business needs restore/audit; otherwise hard delete + audit log.
- PII: classify columns; encrypt at rest where required; retention policy and delete path exist before launch (GDPR/PDPD Vietnam Decree 13/2023).

## Idempotency, retries, queues

- Every write that may be retried (network, queue, user double-tap) is idempotent: natural key, `Idempotency-Key`, or event id table.
- Retry with exponential backoff + jitter, bounded; distinguish retryable (timeouts, 503) from not (400, 409).
- Outbox pattern for "write DB and publish event"; consumers idempotent; DLQ monitored.
- Background jobs: at-least-once, idempotent handlers, visible status, scheduled scans for stuck work (SLA/outbox).

## Caching

- Cache only measured hot paths; key includes version/tenant; TTL + explicit invalidation after writes; never cache personal data in shared caches without a per-user key; stampede protection (single flight) for expensive keys.

## Resilience (Nygard, _Release It!_)

- **Timeouts** on every outbound call (connect + read), shorter than the caller's timeout.
- **Circuit breaker** around flaky dependencies; **bulkheads** (separate pools/queues) so one slow dependency cannot exhaust all workers; **fail fast** when a dependency is down rather than queueing.
- Backpressure: bounded queues, 429/503 with `Retry-After` under load; load-shed non-critical work first.
- Graceful shutdown: stop accepting, drain in-flight, then exit; readiness flips before liveness.
- Health checks test dependencies shallowly (connection ok), not deeply (avoid cascading failures).

## Operability (Google SRE)

- Define SLIs (availability, latency p95, error rate) and SLOs with an error budget before launch; alert on burn rate, not on every blip.
- Logs: structured JSON, request/trace id, levels used honestly (ERROR = needs a human), no PII.
- Metrics: RED per endpoint, USE per resource; dashboards in the repo as code when the platform allows.
- Runbook in `docs/runbook.md`: how to deploy, roll back, rotate secrets, restore a backup (tested restore, not just backup).
- Capacity: know the one number that limits you (connections, memory, model latency) and the load test that proves headroom (`make load`).

## Testing data logic

- Unit test domain rules with in-memory fakes; integration test repositories against a real database in Docker (testcontainers or compose); seed scripts are idempotent.
- Performance assertion for the top 3 queries on a large seeded dataset (e.g. 1 M rows) in CI nightly or `make load`.

Sources: Kleppmann, _DDIA_ (2017); Nygard, _Release It!_ 2nd ed. (2018); Beyer et al., _Site Reliability Engineering_ (2016) and _The SRE Workbook_; Richardson, _Microservices Patterns_; Vietnam Decree 13/2023/ND-CP on personal data.
