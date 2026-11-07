# Backend architecture

## Principles (Clean Architecture, DDD, SOLID)

1. **Dependency rule**: source code dependencies point inward only. `routes → services → domain`; the domain imports no framework, no ORM, no HTTP. Adapters (DB, HTTP clients, queues, clock, TTS…) implement **ports** (abstract interfaces declared in the domain/application layer) and are wired in one composition root (`container.py`, Nest module, DI container).
2. **Entities and value objects** carry the invariants; a value object is immutable (`frozen=True, slots=True`), compared by value, validated in its constructor. Money, Email, Phone, DateRange are value objects, never raw strings/floats.
3. **Aggregates** are the transaction boundary: one aggregate per transaction, references between aggregates by id, eventual consistency between aggregates via domain events.
4. **Application services** orchestrate one use case each (`PlaceOrder`, `ScoreRecording`): load aggregate through a repository port, call domain methods, persist, publish events. No business rules in the service; no orchestration in the entity.
5. **Repositories** return domain objects, not ORM rows; one per aggregate root; query methods named by intent (`find_due_for_review`).
6. **Bounded contexts** map 1:1 to modules/services; shared kernel is tiny (ids, money, time). Context map documented in `docs/architecture`.
7. **SOLID in practice**: one reason to change per class; extend by new implementation of a port, not by `if provider == …`; constructor injection; interfaces segregated by consumer need.

## Layout that follows from it

```
app/
  config/        Settings from env (pydantic-settings / zod), validated at start-up, fail fast
  enums.py constants.py errors.py       single sources of truth
  domain/        entities, value objects, domain services, ports (ABCs), events  — pure
  services/      use cases (application services); transactions begin/end here
  repositories/  adapters for ports (SQL, in-memory fakes for tests)
  ml/ clients/   other adapters (models, HTTP, queues)
  routes/        thin: validate (schemas) → call service → map result/problem
  schemas/       pydantic/zod request & response models; never leak domain objects
  db/            migrations; the only schema-change path
  container.py   composition root
```

## Errors

- A domain error type per failure mode with a **stable code** (`ErrorCode` enum). Raised in domain/services, converted **once** to HTTP (RFC 9457 `application/problem+json`) in one exception handler. Never catch-and-ignore; never catch broad `Exception` except at the boundary that reports it.
- Expected failures (validation, not found, conflict) are not exceptions in the domain of a _query_; use `Result`/`None`. Invariant violations are exceptions.
- OWASP 2025 A10 "Mishandling of exceptional conditions": fail closed, no stack traces to clients, no silent fallback that changes meaning.

## Configuration (12-factor + Hoffman's 15)

- Config in the environment, prefixed (`APP_*`), read once at start-up, typed, with `.env.example` complete. Secrets never in code or logs; locally `.env`, in prod a secret store.
- Backing services (DB, cache, queue, mail) are attached resources identified by URL; swap by config only.
- Stateless processes; state in backing services; build → release → run separated; logs to stdout as JSON events; admin tasks as one-off commands (`make migrate`, `make seed`).
- API first: the OpenAPI/AsyncAPI contract is designed and reviewed before the implementation; clients generate types from it.
- Telemetry: request id on every log line, health (`/health` liveness + `/ready` readiness), metrics (RED: rate, errors, duration) per endpoint.

## Decision checklist for ADR 0001

- Which bounded contexts exist? Which is the core domain (invest here) vs supporting/generic (buy or keep thin)?
- Monolith first (modular, one deployable) unless there is a stated reason for services; services only along context boundaries with their own data.
- Sync (HTTP) vs async (events) per interaction: user-facing reads/writes sync; cross-context effects async with outbox.
- What must be pure (testable without I/O)? Put it in `domain/`.
- What is the one transaction boundary per use case?

Sources: Martin, _Clean Architecture_ (2017); Evans, _Domain-Driven Design_ (2003); Vernon, _Implementing DDD_ (2013); Fowler, _Patterns of Enterprise Application Architecture_ (2002); Hoffman, _Beyond the Twelve-Factor App_ (2016); 12factor.net; OWASP Top 10:2025.
