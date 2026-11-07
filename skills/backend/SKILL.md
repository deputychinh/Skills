---
name: backend
description: Use when adding or changing an endpoint, use case, repository, worker job or integration, or a migration as part of such a change ("backend", "API", "endpoint", "service", "worker", "job", "viết API", "sửa backend", "thêm endpoint", "xử lý nền"). Writes server code the house way — layered (routes → services → domain → ports/adapters, one transaction per use case), contract-first OpenAPI with RFC 9457 problem codes, idempotency keys, queue jobs with leases and idempotent handlers, outbound calls with timeouts, retries and circuit breakers, typed settings, structured logs and traces, per-resource authorization, and tests on a real database — each with pasted evidence. Not for deciding a new system's shape (`system-design`, `architect`) or schema design and live migrations (`database`). Inside a delivery, `ship` and `deliver-loop` call this skill.
---

# backend — server code that keeps its promises under retries, failures and attackers

Scope: one backlog item's server-side change in a repo that follows the house stack (FastAPI +
SQLAlchemy Core + Alembic + Postgres, a Python worker on a Postgres job queue, S3 storage, classes +
SOLID, ruff + mypy strict + pytest ≥ 90 %). The house standards live in
`~/.claude/skills/init-project/references/` (`backend-architecture.md`, `api-design.md`,
`data-and-reliability.md`, `security.md`); this skill turns them into steps and checks. It does not
choose the system's shape: when the change adds a bounded context, a datastore, a new process or
touches an accepted ADR, run `system-design` (options and estimates) and `architect` (ADR, fitness
functions, threat model) first, then come back.

## Workflow

1. **Load the house rules for this repo.** Read `CLAUDE.md`, `docs/conventions.md`,
   `docs/architecture/README.md` and every ADR whose title matches the area
   (`grep -il <area> docs/adr/*.md`). List the existing ports, error codes and enums you will reuse
   (`grep -n "class .*Port\|class .*(ABC)\|class ErrorCode" -r <pkg>`). _Evidence:_ the story's
   Design section (or the commit body) names the layers touched and the ADRs read.
2. **Decide the gate.** If the change needs a new datastore, process, context or contradicts an ADR,
   stop and run `system-design` → `architect`. Otherwise continue. _Evidence:_ one line in the story:
   "no architectural change" or the ADR number.
3. **Contract first.** Change the pydantic request/response schemas and the route signature, export
   the spec (`make openapi`) and review the diff against `references/api-and-integrations.md` §1:
   paths, status codes, problem `code`s, pagination, `Idempotency-Key`, additive-only fields. Add
   new codes to `ErrorCode` before using them. _Evidence:_ the `openapi.json` diff in the commit;
   regenerated client types build (`npm run build` or the repo's type-gen target).
4. **Domain, test first.** Write failing unit tests (sentence names) for the rule, then the value
   objects and entities that enforce it in their constructors and methods; no framework, ORM or SDK
   imports in `domain/`. Use Hypothesis for rules over ranges (money, dates, ordering, parsers).
   _Evidence:_ the red run, then the green run of `uv run pytest tests/unit -q`.
5. **Use case.** One application service method per use case: load through a repository port, call
   the domain, commit once through the unit of work, write any job/event row in the same
   transaction (outbox). Test it with fakes for the ports, never mocks of SQLAlchemy. _Evidence:_
   service tests covering success, each domain error and "nothing committed on failure".
6. **Adapters and schema.** SQLAlchemy Core repository returning domain objects; Alembic migration,
   reversible, expand → migrate → contract; index for every new `WHERE`/`ORDER BY` on a big table.
   Run repository tests against real Postgres (compose or testcontainers). _Evidence:_
   `alembic upgrade head && alembic downgrade -1 && alembic upgrade head` output; repository tests
   green; `EXPLAIN` for any new list query on seeded data. For a migration on a live table, a new
   index or a slow query, run the `database` skill for this step.
7. **Edge.** Route stays thin: parse → authorize per resource → call service → map. Schemas reject
   unknown fields and bound every string, list and number; the single exception handler in
   `problems.py` maps domain errors to RFC 9457. _Evidence:_ API tests through `TestClient` for 2xx,
   401, 403, 404 for another user's object, 409, 422 with field errors, and the replay of a repeated
   `Idempotency-Key`.
8. **Background work and integrations** (when touched). Jobs: lease, attempts, `run_after` backoff
   with jitter, idempotent handler, dead state with alert. Outbound calls: connect + read timeouts,
   retries only for idempotent calls and retryable errors, circuit breaker and bulkhead around the
   dependency, SSRF allow-list for user-supplied URLs. See `references/api-and-integrations.md` §3–4.
   _Evidence:_ tests for duplicate delivery, lease expiry, timeout and open-circuit paths.
9. **Observe.** Log events (not prose) with `request_id`/`job_id`, no PII, secrets or file contents;
   RED metrics per route and job kind; spans named by route template. _Evidence:_ one captured log
   line from a test or local run pasted in the story; `grep -rn "log.*\(email\|token\|password\)"`
   is empty.
10. **Gate.** Run `make ci` (ruff, ruff format check, mypy strict, pytest with coverage ≥ 90 %). For
    a changed critical rule (money, permissions, state machine, idempotency) run a mutation check on
    that module (`references/security-and-testing.md` §3). _Evidence:_ the pasted tail of each
    command; surviving mutants either killed or listed with a reason.
11. **Record.** Update the endpoint table and flows in `docs/architecture/README.md`, `.env.example`
    for new settings, the changelog, and an ADR only if a decision changed. _Evidence:_ those diffs in
    the same Conventional Commit as the code.

## Core checklist

1. `domain/` imports nothing from FastAPI, SQLAlchemy, boto3, httpx or pydantic.
2. Every invariant lives in a constructor or method and has a failing-input test.
3. One use case = one transaction; side effects outside the DB go through an outbox/job row.
4. No `except Exception` outside the one boundary handler; no `except: pass`; no silent defaults.
5. Every error the client can see has a stable `code` in `ErrorCode` and an RFC 9457 body.
6. Every collection endpoint is paginated with a maximum `limit`.
7. Every retried write (client POST, job, consumer) is idempotent by key, natural key or state check.
8. Every outbound call has explicit timeouts; retries only on idempotent calls, capped, with jitter.
9. Every object fetched by id is authorized for the caller (BOLA test exists).
10. SQL is parameterised; no f-strings into SQL, shell or URLs; user URLs pass the SSRF allow-list.
11. Settings are typed, prefixed, validated at start-up; `.env.example` lists every key.
12. Logs carry ids, never PII, secrets, tokens or payloads.
13. Repositories are tested against real Postgres; ports are faked, not mocked.
14. Migrations are reversible and additive first; destructive steps have an ADR.
15. Async routes never call blocking I/O; blocking work runs in `def` routes, a thread or the worker.

## Anti-patterns

- Business rules in routes, pydantic validators or SQL; anaemic entities with logic in services.
- `session.commit()` scattered through repositories; two transactions for one use case.
- Returning ORM rows or domain objects straight from routes; leaking internal ids or stack traces.
- Retrying a non-idempotent POST; retries at every layer (amplification); no jitter.
- "Fire and forget" `asyncio.create_task` or FastAPI `BackgroundTasks` for work that must survive a
  restart — use the job table.
- Catch-log-and-continue that turns a failure into wrong data; a fallback that changes meaning.
- Mocking `Session`/`boto3`; testing a repository against SQLite when production is Postgres.
- A health check that calls every dependency deeply; readiness that never fails.
- Counting coverage instead of asserting behaviour; snapshot tests of whole JSON bodies.

## Evidence before "done"

- `make ci` output: lint, types, tests and coverage ≥ 90 %, pasted.
- OpenAPI diff reviewed; generated client types compile.
- Migration round-trip output; repository tests on real Postgres.
- API tests for the error paths in step 7, including another user's object.
- For jobs/integrations: duplicate, timeout and open-circuit tests.
- For critical rules: mutation check result.
- Docs, `.env.example` and changelog updated in the same commit.

## References

- `references/layering-and-domain.md` — layers, unit of work, domain modelling, errors, configuration.
- `references/api-and-integrations.md` — API contract rules, idempotency, jobs and outbox,
  resilience at integration points, observability.
- `references/security-and-testing.md` — OWASP Top 10:2025 / ASVS 5.0 L1 checks for code, the test
  pyramid, property-based and mutation testing, performance basics.
