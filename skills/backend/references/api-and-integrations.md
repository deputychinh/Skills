# API contract, idempotency, background jobs, integrations, observability

Tags: **[ZAL]** Zalando RESTful API Guidelines (rule numbers) · **[RFC9457]** · **[IDEM]** IETF
draft-ietf-httpapi-idempotency-key-header · **[RI]** Nygard, _Release It!_ 2nd ed. · **[AWS]** AWS
Builders' Library, "Timeouts, retries and backoff with jitter" · **[SRE]** Google SRE book ·
**[OTEL]** OpenTelemetry docs · **[PG]** PostgreSQL docs · **[DEF]** defaults from `init-project`'s references and production lessons.

Verified on 2026-11-07 against https://opensource.zalando.com/restful-api-guidelines/,
https://www.rfc-editor.org/rfc/rfc9457.html,
https://datatracker.ietf.org/doc/draft-ietf-httpapi-idempotency-key-header/ (draft -08, 2026-10-22,
active, not yet an RFC), https://builder.aws.com/content/3EumjoZascWd1oZiEgL8ORlv3qE/timeouts-retries-and-backoff-with-jitter,
https://sre.google/sre-book/monitoring-distributed-systems/,
https://opentelemetry.io/docs/specs/semconv/http/http-spans/,
https://opentelemetry.io/docs/languages/python/ and https://www.postgresql.org/docs/current/sql-select.html.

Stack note: §1–2 and the rules in §3–5 are stack-neutral. The job-table claim SQL, lease columns
and the Python OpenTelemetry line describe the **Python reference worker**; for Node (pg-boss, BullMQ,
Kafka outbox, cockatiel/opossum, pino, OTel Node SDK) see `node-typescript.md` §6–7.

## Contents

1. Contract
2. Idempotency
3. Background jobs and the outbox
4. Integration points
5. Observability

## 1. Contract

- [ ] API first: the OpenAPI change is written and reviewed before the implementation. **[ZAL #100, #101]**
- [ ] Paths kebab-case, resources plural, max 3 levels; non-CRUD actions as sub-resources
      (`POST /asset-versions/{id}/completions`). **[ZAL #129, #134]** **[DEF]**
- [ ] Properties and query parameters `snake_case`. **[ZAL #118, #130]**
- [ ] Dates RFC 3339 / ISO-8601 UTC with `Z`; money as the common money object (string amount +
      currency). **[ZAL #169, #173]**
- [ ] Every operation documents success and error responses; most specific official status codes. **[ZAL #151, #220, #243]**
- [ ] Status map: 201 + `Location` on create; 202 + job URL for long work; 204 no body; 400
      malformed; 401; 403; 404 (also for objects the caller may not see, to avoid enumeration); 409
      state/version conflict; 412/428 with ETags; 422 validation with `errors[]`; 429 + `Retry-After`;
      503 + `Retry-After` when shedding or the circuit is open. **[DEF]** **[ZAL #153]**
- [ ] Errors as `application/problem+json` with `code`; no stack traces. **[ZAL #176, #177]** **[RFC9457]**
- [ ] Every collection paginated, cursor-based (`limit` with a max, `next_cursor`); cursor is opaque
      and encodes the sort key + id for a stable order. **[ZAL #159, #160]**
- [ ] Bulk endpoints answer 207 with per-item status. **[ZAL #152]**
- [ ] Compatibility: additive changes only (new optional fields, new endpoints); never rename or
      tighten. **[ZAL #106]** Clients must tolerate unknown fields. _(memory: Zalando "tolerant reader")_
- [ ] **Deliberate deviation:** Zalando says avoid versioning and never version in the URL (#113, #115);
      these defaults keep a major version in the path (`/api/v1`) and add `/api/v2` only for an
      unavoidable break, with `Deprecation`/`Sunset` headers, because a path version is visible in
      logs, caches and gateways. Follow the repo's choice if it differs; record any new break in an ADR. **[DEF]**
- [ ] Conditional requests: `ETag` on GET, `If-Match` on PUT/PATCH for optimistic concurrency. **[DEF]**
- [ ] Request size limits, string/array bounds and enum types in the schema, so the spec documents
      the limits clients hit. **[DEF]**
- Review question: can a client build every screen state from the contract alone? **[DEF]**

## 2. Idempotency

- PUT and DELETE idempotent by definition; POST/PATCH designed idempotent where retries are likely,
  via a secondary (natural) key or the `Idempotency-Key` header. **[ZAL #229, #230, #231]**
- Draft rules (-08): the key is client-generated and unique (UUID recommended); a reused key with a
  different payload → **422**; a request while the first with the same key is still in progress →
  **409**; a missing key where required → **400**; each with a problem body. A payload fingerprint
  is optional; key expiry policy should be published. **[IDEM]**
- Reference implementation: key row + resource + stored response in one transaction;
  scope the key by principal and route; store a request hash; replay status, headers and body; a
  duplicate waits on the uncommitted row and gets the replay, `409 IDEMPOTENCY_KEY_IN_USE` only after
  `lock_timeout`; purge after 24 h. Storing the response in the same transaction is what makes a
  replay byte-identical even when the first request's connection dropped after commit. **[DEF]**
- Consumers and job handlers are idempotent by event/job id or by a state check
  (`UPDATE … WHERE state = 'processing'`). **[DEF]**

## 3. Background jobs and the outbox

Python worker on a Postgres job table below; Node: pg-boss (jobs created in the same transaction)
or BullMQ behind an outbox relay — `node-typescript.md` §6.

- Write the job row in the same transaction as the state change (transactional outbox); never
  "commit then enqueue". **[DEF]** _(memory: Richardson, Microservices Patterns)_
- Claim with `SELECT … FOR UPDATE SKIP LOCKED LIMIT n`; Postgres documents this as fit for
  queue-like tables with several consumers and unfit for general reads (it skips locked rows). **[PG]**
- Columns: `id`, `kind`, schema-checked `payload`, `state`, `attempts`, `max_attempts`, `run_after`,
  `lease_until`, `last_error_code`, timestamps. **[DEF]**
- Lease, don't hold a transaction open during the work: claim → commit lease → work → finish in a new
  transaction that checks the lease is still yours. Heartbeat extends the lease; an expired lease is
  re-claimable. A transaction held open for minutes blocks vacuum and pins a pool connection. **[DEF]**
- The lease bound must exceed heartbeat interval + slowest extension (connect + statement timeout);
  assert that arithmetic in a test. Otherwise a slow heartbeat lets a second worker claim a job that is still running. **[DEF]**
- At-least-once is the assumption: handler idempotent, side effects keyed, external objects written
  to deterministic keys. **[DEF]**
- Retry: exponential backoff with a cap and jitter (`run_after = now + min(cap, base·2^n)·random`);
  classify retryable vs permanent; after `max_attempts` → `failed` with code + alert. **[AWS]** **[DEF]**
- Hung work: a per-job wall-clock budget and a watchdog; untrusted parsing in a sandboxed child with
  CPU/memory limits. **[DEF]**
- Periodic maintenance (expire, purge) guarded by a lease row so one worker runs it; batch-bounded
  (e.g. 500 rows per run); jitter the schedule. **[DEF]** **[AWS]**
- Metrics: queued, running, oldest-queued age, failed by kind. Alert on oldest age, not count. **[DEF]** **[SRE]**
- Graceful stop: stop claiming, finish or release the lease, exit within the platform grace period. **[12F IX]**

## 4. Integration points

Nygard: integration points are the number-one killer of systems; every outbound call can hang,
fail slowly or return garbage. **[RI]** _(memory, paraphrase)_

- [ ] Timeouts on every remote call, connect and read separately, chosen from the dependency's
      latency percentile (e.g. p99.9) plus padding; shorter than the caller's own deadline. **[AWS]** **[RI]**
- [ ] Retry at one layer only; stacked retries multiply load on a failing dependency. **[AWS]**
- [ ] Retry only idempotent calls (or calls made idempotent with a token); retry only retryable
      outcomes (timeouts, 502/503/504, connection reset), never 400/401/403/409/422. **[AWS]** **[DEF]**
- [ ] Exponential backoff with a cap and jitter; also cap total attempts. **[AWS]**
- [ ] Circuit breaker around a flaky dependency: open after N consecutive failures, fail fast with
      `Retry-After`, half-open trial call (a reasonable start: 5 failures, 30 s open). AWS notes a retry token bucket as an
      alternative that avoids modal behaviour. **[RI]** **[AWS]** **[DEF]**
- [ ] Bulkhead: a bounded semaphore/pool per dependency with a short wait (e.g. 16 concurrent calls, 0.5 s wait),
      so one slow dependency cannot take every thread. **[RI]** **[DEF]**
- [ ] Bounded results: page through lists, cap response bytes, stream large objects. **[RI]**
- [ ] Health checks: `/health` liveness only; `/ready` checks dependencies shallowly with a 1 s
      budget and does not count toward opening breakers. **[DEF]**
- [ ] Large files go client → object storage with presigned URLs, not through the API. **[DEF]**
- [ ] AI calls: through a port, timeout, schema-validated output, fallback adapter — rules in
      `architect` step 6; load `claude-api` before writing the adapter. **[DEF]**
- [ ] Test each path with a fake adapter that can be slow, fail, or return junk. **[DEF]**
- [ ] Node: `fetch` with `AbortSignal.timeout`, cockatiel `wrap(retry, circuitBreaker, timeout)`,
      `bulkhead` — `node-typescript.md` §6.

## 5. Observability

- [ ] Four golden signals: latency, traffic, errors, saturation. For request services use RED
      (rate, errors, duration) per route template; record latency as a histogram and measure failed
      requests' latency separately. **[SRE]**
- [ ] Page on symptoms users see (5xx rate, latency SLO burn), not causes (CPU). **[SRE]**
- [ ] Structured JSON logs to stdout, one event per line: `event`, `level`, `request_id`/`job_id`,
      `code`, `duration_ms`; ERROR means a human must act. **[DEF]** **[12F XI]**
- [ ] Accept and echo `X-Request-Id`; propagate it into jobs (`payload.request_id`) and outbound calls. **[DEF]**
- [ ] Never log PII, tokens, signed URLs, request bodies or file contents; log ids and sizes. **[DEF]**
- [ ] OpenTelemetry for Python (Node: NodeSDK loaded with `--import`, pino logs — `node-typescript.md` §7): traces and metrics are stable, logs are still "development" (Nov 2026) — keep structured stdlib logging and correlate by trace id. **[OTEL]**
- [ ] HTTP server span name `{method} {http.route}` (never the raw path); required attributes include
      `http.request.method`, `url.path`, `url.scheme`; leave span status unset for 4xx, set Error for 5xx. **[OTEL semconv]**
- [ ] Label cardinality bounded: route template, method, status class, job kind — never user ids. _(memory)_
