# Layering, domain modelling, errors and configuration

Tags: **[CA]** Martin, _Clean Architecture_ (2017) · **[CP]** Percival & Gregory, _Architecture
Patterns with Python_ ("Cosmic Python", cosmicpython.com) · **[12F]** 12factor.net · **[FA]** FastAPI
docs · **[RFC9457]** · **[HOUSE]** `~/.claude/skills/init-project/references/backend-architecture.md`
and Kiln `docs/conventions.md`. Items marked _(memory)_ were not re-checked online for this draft.

Verified on 2026-11-07 against https://www.cosmicpython.com/book/chapter_04_service_layer.html,
https://www.cosmicpython.com/book/chapter_06_uow.html, https://12factor.net/,
https://fastapi.tiangolo.com/advanced/events/ and https://fastapi.tiangolo.com/async/.

## Contents

1. Layers and the dependency rule
2. Unit of work and transactions
3. Domain modelling
4. Errors
5. Configuration and process model
6. FastAPI specifics

## 1. Layers and the dependency rule

| Layer                          | Holds                                                                  | May import        | Test with                 |
| ------------------------------ | ---------------------------------------------------------------------- | ----------------- | ------------------------- |
| `routes/` + `schemas/`         | HTTP parsing, auth dependency, status codes, problem mapping           | services, schemas | `TestClient` + fake ports |
| `services/`                    | one class or method per use case; transaction boundary                 | domain, ports     | fake UoW + fake repos     |
| `domain/`                      | entities, value objects, domain services, domain errors                | stdlib only       | plain pytest, Hypothesis  |
| `ports.py`                     | abstract interfaces the services need (repository, storage, clock, AI) | domain            | —                         |
| `adapters.py`, `repositories/` | SQLAlchemy Core, boto3, httpx, Claude adapters                         | ports, domain     | real Postgres / local S3  |
| `container.py`                 | composition root: builds adapters, injects them                        | everything        | smoke test                |

- Source dependencies point inward; outer layers know inner ones, never the reverse. **[CA]**
- The service layer depends on abstractions (an abstract repository), so tests pass a fake and the
  app passes the SQL adapter. **[CP ch. 4]**
- Endpoints stay thin: parse input, call one service, choose the status code. Orchestration lives in
  the service. **[CP ch. 4]**
- One composition root wires concrete adapters; nothing else instantiates an adapter. **[HOUSE]**
- Check the rule mechanically: `grep -rnE "^(from|import) (fastapi|sqlalchemy|boto3|httpx|pydantic)" <pkg>/domain`
  must print nothing; add an import-linter contract or a pytest that walks `domain/` imports so CI
  enforces it. **[HOUSE]**
- Prefer few deep modules over many pass-through classes; a port earns its place when there are two
  implementations (real + fake) or a real boundary. _(memory: Ousterhout)_

## 2. Unit of work and transactions

- The UoW is the single entry to persistence for a use case: it opens a session, exposes
  repositories (`uow.assets`) and commits only on an explicit `commit()`; leaving the block without
  one rolls back. **[CP ch. 6]**
- Explicit commit over auto-commit-on-exit: an exception or early return leaves the system unchanged. **[CP ch. 6]**
- Service tests use a `FakeUnitOfWork` with fake repositories and a `committed` flag ("don't mock
  what you don't own"); integration tests check commit and rollback on the real engine — in this
  house, Postgres, not SQLite. **[CP ch. 6]** **[HOUSE]**
- One aggregate changed per transaction; other aggregates react through a job/event row written in
  the same transaction. **[HOUSE]** _(memory: Vernon, IDDD)_
- Concurrency on one aggregate: `SELECT … FOR UPDATE` or a `version` column checked in the `UPDATE …
WHERE version = :v`; on mismatch raise a domain `Conflict` → 409. **[HOUSE]**
- Set `lock_timeout` and `statement_timeout` per connection so a transaction cannot hang a worker
  (Kiln: 5 s / 15 s). **[HOUSE: Kiln architecture]**
- Idempotency key row + the created resource + its stored response in one transaction (Kiln ADR 0006).

## 3. Domain modelling

- Value objects: `@dataclass(frozen=True, slots=True)`, validated in `__post_init__`, compared by
  value; money, sizes, content types, slugs, date ranges are value objects, never bare `str`/`float`. **[HOUSE]**
- Entities carry identity (UUID v7 strings in Kiln) and state transitions as methods
  (`version.complete(etag)`), each rejecting illegal transitions with a typed error. **[HOUSE]**
- A state machine is an enum of states plus one table of allowed transitions; test every
  disallowed pair (Hypothesis `sampled_from` over the enum product). **[HOUSE]**
- Time is injected (a `Clock` port), stored in UTC; no `datetime.now()` in the domain. **[HOUSE]**
- Domain objects never hold sessions, clients or settings; they receive values. **[CA]**
- Repositories return domain objects, one per aggregate root, with intention-revealing query
  methods (`find_expired_pending(older_than)`). **[HOUSE]** **[CP ch. 2]** _(memory for ch. 2)_
- Pydantic stays at the HTTP and AI-output boundary; map schema → domain explicitly in the route or
  service. **[HOUSE: Kiln conventions]**

## 4. Errors

- One `ErrorCode` enum (single source of truth) and a domain error class per failure mode carrying
  that code; `errors.py` is framework-free. **[HOUSE]**
- Map to HTTP exactly once in `problems.py` with one exception handler; the web reacts to `status` +
  `code`, never to text. **[HOUSE]**
- RFC 9457 body: `type` (URI identifying the problem type; `about:blank` when omitted), `title`,
  `status`, `detail`, `instance`; media type `application/problem+json`; extension members (here
  `code`, `errors[]`) are allowed and clients must ignore unknown ones. RFC 9457 obsoletes RFC 7807. **[RFC9457]**
- Vet what goes into `detail`: no stack traces or implementation internals. **[RFC9457]** (Zalando #177 says the same.)
- Unknown exceptions: log once with the request id at ERROR, return a generic 500 problem with code
  `INTERNAL`; never echo the exception message. **[HOUSE]** (OWASP A10:2025.)
- Do not catch to "keep going" unless the fallback preserves meaning and is logged and measured. **[HOUSE]**
- Workers: a domain error that cannot succeed on retry marks the job failed with its code; a
  transient error re-queues with backoff. Classify explicitly; default is **not** retryable. **[HOUSE]**

## 5. Configuration and process model

- Config in the environment, separate from code; backing services are attached resources swapped by
  config. **[12F III, IV]**
- One `Settings` class (pydantic-settings), env prefix (`KILN_*`), read once at start-up; invalid or
  missing values crash the process before it serves traffic. **[HOUSE]**
- Secrets typed as `SecretStr`, never logged, never defaulted; locally `.env`, in production a
  secret store. **[HOUSE]**
- Stateless processes, scale out by adding processes, start fast and shut down gracefully, logs as
  an event stream on stdout, admin tasks as one-off commands (`make migrate`). **[12F VI, VIII, IX, XI, XII]**
- Dev/prod parity: same Postgres major version and an S3-compatible store locally (Kiln: SeaweedFS). **[12F X]**
- Every bound is a named constant or setting with a validated range (bulkhead size ≤ 32 in Kiln). **[HOUSE]**

## 6. FastAPI specifics

- Use the `lifespan` async context manager for start-up/shutdown resources; `@app.on_event` is
  deprecated and is skipped when `lifespan` is set. **[FA events]**
- `async def` only when every call inside is awaited non-blocking I/O; a blocking library (boto3,
  psycopg sync) in an `async def` blocks the event loop. A plain `def` route runs in a threadpool. **[FA async]**
- The threadpool is finite (AnyIO default 40 tokens _(memory)_); keep bulkheads below it so
  requests that don't touch the slow dependency still get a thread (Kiln KILN-23). **[HOUSE]**
- Dependencies (`Depends`) provide the container's services and the authenticated principal; they
  do not contain business rules. **[HOUSE]**
- Response models are explicit (`response_model=`) so internal fields can't leak; set
  `model_config = ConfigDict(extra="forbid")` on request schemas. _(memory: pydantic v2 API)_
