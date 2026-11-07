---
name: backend
description: Use when adding or changing an endpoint, use case, repository, worker job, webhook or integration — or the migration that goes with it — in Node.js/TypeScript (NestJS, Fastify) or Python (FastAPI), even when the request only says "API", "backend", "worker" or "fix the server". Produces layered code (routes → services → domain → adapters, one transaction per use case), a contract-first OpenAPI diff with RFC 9457 errors, idempotent writes and jobs, outbound calls with timeouts and breakers, per-resource authorization and tests on a real database. Live migrations go to `database`, system shape to `architect`. Inside a delivery, `ship` and `deliver-loop` call this skill.
---

# backend — server code that keeps its promises under retries, failures and attackers

Scope: one backlog item's server-side change. Two stacks are first-class and follow the same rules:

- **Node.js + TypeScript** — NestJS (modular services) or Fastify (small, latency-sensitive
  services), strict TS, ESM, zod at the edge, Prisma/Drizzle/Kysely, Vitest, pino, OpenTelemetry.
  Details: `references/node-typescript.md`.
- **Python** — FastAPI + SQLAlchemy Core + Alembic + Postgres, a worker on a Postgres job queue,
  ruff + mypy strict + pytest. Details: `references/layering-and-domain.md` §6.

The general standards live in `init-project`'s references (`backend-architecture.md`,
`api-design.md`, `data-and-reliability.md`, `security.md`); this skill turns them into steps and
checks. Follow the repo's conventions where they exist, or these defaults where they do not. It does not choose the system's shape: when the change adds a bounded context, a datastore,
a new process or touches an accepted ADR, run `system-design` and `architect` first, then come back.

## Pick the stack

Use the stack the repo already has (`package.json` + `nest-cli.json`/`fastify` → Node;
`pyproject.toml` → Python). For a new service, follow the repo's ADRs, then the backend default in
the delivery profile (see the repo README); with neither, ask once. Both stacks are equally
supported: NestJS suits a multi-module service in a TypeScript monorepo, Fastify a small,
latency-sensitive service, FastAPI a team or domain (data, ML, AI pipelines) that is already Python.
Never mix two stacks in one service. The repo's own `CLAUDE.md`/`CONTRIBUTING.md` overrides anything
here (for example: classes and SOLID, one enum per file, zod DTOs, an `ErrorCode` table, a coverage
threshold).

| Step         | Node (TypeScript)                                                            | Python                                                                 |
| ------------ | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Unit tests   | `npx vitest run` (or the repo's runner)                                      | `uv run pytest tests/unit -q`                                          |
| Integration  | `npm run test:int` (real DB: compose or Testcontainers)                      | `uv run pytest tests/integration`                                      |
| Types / lint | `npm run typecheck` · `npx eslint . --max-warnings 0`                        | `uv run mypy --strict` · `uv run ruff check`                           |
| OpenAPI      | `npm run openapi && git diff --exit-code openapi/`                           | `make openapi && git diff --exit-code`                                 |
| Migration    | `npx prisma migrate dev` / `npx drizzle-kit generate` → apply → roll forward | `alembic upgrade head && alembic downgrade -1 && alembic upgrade head` |
| Mutation     | `npx stryker run` (vitest runner, `--mutate <file>`)                         | `uv run mutmut run --paths-to-mutate <file>`                           |
| Dependencies | `npm ci` · `npm audit --omit=dev` · `npm audit signatures`                   | `uv lock` · `pip-audit`                                                |
| Gate         | `make ci` (lint, typecheck, test + coverage, build)                          | `make ci` (ruff, mypy, pytest + coverage)                              |

## Workflow

1. **Load the repo's conventions.** Read `CLAUDE.md`/`AGENTS.md`, `CONTRIBUTING.md` or
   `docs/conventions.md`, `docs/architecture/README.md` and every ADR whose title matches the area
   (`grep -il <area> docs/adr/*.md`). List the ports, error codes and enums you will reuse (Node:
   `grep -rn "abstract class\|enum ErrorCode" src packages`; Python:
   `grep -rn "class .*Port\|class .*(ABC)\|class ErrorCode" <pkg>`). _Evidence:_ the story's Design
   section (or the commit body) names the layers touched and the ADRs read.
2. **Decide the gate.** If the change needs a new datastore, process, context or contradicts an ADR,
   stop and run `system-design` → `architect`. Otherwise continue. _Evidence:_ one line in the
   story: "no architectural change" or the ADR number.
3. **Contract first.** Change the request/response schemas (Node: zod DTO or TypeBox/JSON schema;
   Python: pydantic) and the route signature, export the spec and review the diff against
   `references/api-and-integrations.md` §1: paths, status codes, problem `code`s, pagination,
   `Idempotency-Key`, additive-only fields. Add new codes to `ErrorCode` before using them.
   _Evidence:_ the OpenAPI diff in the commit; regenerated client types build.
4. **Domain, test first.** Write failing unit tests (sentence names) for the rule, then the value
   objects and entities that enforce it; no framework, ORM or SDK imports in `domain/` (Node: no
   `@nestjs/*`, `@prisma/client`, `fastify`, `zod`; Python: no FastAPI, SQLAlchemy, pydantic).
   Property tests for rules over ranges (fast-check / Hypothesis). _Evidence:_ red run, green run.
5. **Use case.** One service method per use case: load through a repository port, call the domain,
   commit once through the unit of work (Node: `TransactionManager.run(tx => …)` over
   `prisma.$transaction`/`db.transaction`; Python: `with uow:` … `uow.commit()`), write any
   job/event row in the same transaction (outbox). Test with in-memory fakes for the ports, never
   mocks of the ORM. _Evidence:_ service tests for success, each domain error and "nothing
   committed on failure".
6. **Adapters and schema.** Repository adapter returning domain objects (mapper; ORM rows never
   leave it); migration reversible or roll-forward-safe, expand → migrate → contract; index for
   every new `WHERE`/`ORDER BY` on a big table. Run repository tests against the real database.
   _Evidence:_ migration output; repository tests green; `EXPLAIN` for any new list query. For a
   migration on a live table, a new index or a slow query, run the `database` skill for this step.
7. **Edge.** Controller/route stays thin: validate → authorize per resource → call one service
   method → map. Schemas reject unknown fields and bound every string, list and number; one
   boundary handler (Nest exception filter / Fastify `setErrorHandler` / FastAPI exception handler)
   maps domain errors to RFC 9457. _Evidence:_ API tests (supertest / `app.inject()` /
   `TestClient`) for 2xx, 401, 403, 404 for another user's object, 409, 422 with field errors, and
   the replay of a repeated `Idempotency-Key`.
8. **Background work and integrations** (when touched). Jobs: lease or lock, attempts, backoff with
   jitter, idempotent handler, dead state with alert (Node: pg-boss/BullMQ/Kafka retry + DLQ;
   Python: the job table). Outbound calls: timeouts (Node: `AbortSignal.timeout`), retries only for
   idempotent calls and retryable errors, circuit breaker and bulkhead, SSRF allow-list for
   user-supplied URLs. See `references/api-and-integrations.md` §3–4 and
   `references/node-typescript.md` §6. _Evidence:_ tests for duplicate delivery, lease expiry,
   timeout and open-circuit paths.
9. **Observe.** Log events (not prose) with `request_id`/`job_id`, no PII, secrets or file
   contents (Node: pino with `redact`; Python: structured stdlib logging); RED metrics per route and
   job kind; spans named by route template. _Evidence:_ one captured log line pasted in the story;
   `grep -rnE "log.*(email|token|password)"` is empty.
10. **Gate.** Run `make ci` (or the table above). For a changed critical rule (money, permissions,
    state machine, idempotency) run a mutation check on that module
    (`references/security-and-testing.md` §3). _Evidence:_ the pasted tail of each command;
    surviving mutants killed or listed with a reason.
11. **Record.** Update the endpoint table and flows in `docs/architecture/README.md`,
    `.env.example` for new settings, the changelog, and an ADR only if a decision changed.
    _Evidence:_ those diffs in the same Conventional Commit as the code.

## Core checklist (both stacks)

1. `domain/` imports no framework, ORM, SDK or validation library.
2. Every invariant lives in a constructor or method and has a failing-input test.
3. One use case = one transaction; side effects outside the DB go through an outbox/job row.
4. No catch-all outside the one boundary handler; no empty `catch {}` / `except: pass`; no silent
   defaults.
5. Every error the client can see has a stable `code` in `ErrorCode` and a problem body.
6. Every collection endpoint is paginated with a maximum `limit`.
7. Every retried write (client POST, job, consumer) is idempotent by key, natural key or state check.
8. Every outbound call has explicit timeouts; retries only on idempotent calls, capped, with jitter.
9. Every object fetched by id is authorized for the caller (BOLA test exists).
10. SQL is parameterised; no string-built SQL, shell or URLs; user URLs pass the SSRF allow-list.
11. Settings are typed, validated at start-up (zod / pydantic-settings); `.env.example` lists every key.
12. Logs carry ids, never PII, secrets, tokens or payloads.
13. Repositories are tested against the real database engine; ports are faked, not mocked.
14. Migrations are additive first; destructive steps have an ADR.
15. Nothing blocks the event loop: no sync I/O or heavy CPU in a request (Node: worker thread or
    job; Python: `def` route, thread or worker).
16. Node only: no floating promises, no `any`, `noUncheckedIndexedAccess` on; process exits on an
    uncaught exception after logging; `SIGTERM` closes the server and drains workers.

## Anti-patterns

- Business rules in controllers, DTO/pydantic validators, guards or SQL; anaemic entities.
- Commits scattered through repositories; two transactions for one use case; a slow external call
  inside an open transaction.
- Returning ORM rows (Prisma models, SQLAlchemy rows) or domain objects straight from routes;
  leaking internal ids or stack traces.
- Retrying a non-idempotent POST; retries at every layer (amplification); no jitter.
- Fire-and-forget work that must survive a restart (`void promise`, `setImmediate`, FastAPI
  `BackgroundTasks`, `asyncio.create_task`) — use the job table / queue.
- Catch-log-and-continue that turns a failure into wrong data; a fallback that changes meaning.
- Mocking the ORM client or SDK; testing a repository against SQLite or an in-memory DB when
  production is Postgres/MySQL.
- A health check that calls every dependency deeply; readiness that never fails.
- Counting coverage instead of asserting behaviour; snapshot tests of whole JSON bodies.
- Node: `JSON.parse` of a request into a plain object and merging it into another (prototype
  pollution); user input in a `RegExp`; `fetch` without a signal.

## Evidence before "done"

- `make ci` output: lint, types, tests and coverage at the repo's threshold, pasted.
- OpenAPI diff reviewed; generated client types compile.
- Migration output; repository tests on the real database.
- API tests for the error paths in step 7, including another user's object.
- For jobs/integrations: duplicate, timeout and open-circuit tests.
- For critical rules: mutation check result.
- Docs, `.env.example` and changelog updated in the same commit.

## References

- `references/node-typescript.md` — the Node checklist: runtime, NestJS vs Fastify, layering in
  Nest modules, zod/TypeBox at the edge, problem filters, Prisma vs Drizzle vs Kysely, pg-boss vs
  BullMQ, cockatiel/opossum, pino + OpenTelemetry, shutdown, Node security, Vitest + Testcontainers
  - Stryker.
- `references/layering-and-domain.md` — layers, unit of work, domain modelling, errors,
  configuration (FastAPI specifics in §6).
- `references/api-and-integrations.md` — API contract rules, idempotency, jobs and outbox,
  resilience at integration points, observability.
- `references/security-and-testing.md` — OWASP Top 10:2025 / ASVS 5.0 L1 checks for code, the test
  pyramid, property-based and mutation testing, performance basics.
