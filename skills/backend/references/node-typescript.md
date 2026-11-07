# Node.js + TypeScript backend checklist

The Node equivalent of the Python items in the other references; the stack-neutral rules there (contract, idempotency, outbox, integration points, observability, OWASP, test pyramid) still apply. A typical production shape this checklist assumes: Node LTS, npm workspaces + Turborepo, TypeScript strict, ESM (`nodenext`), NestJS on Express or Fastify, zod at the edge, Prisma/Drizzle/Kysely, a Kafka or Postgres-queue outbox with retry/DLQ, pino (`nestjs-pino`), OpenTelemetry, prom-client, helmet, Vitest + supertest. Follow the repo's conventions where they differ, or these defaults where it has none.

Tags: **[NODE]** nodejs.org docs (v26.13.0) · **[NEST]** docs.nestjs.com · **[FY]** fastify.dev (v5.12.8) · **[PR]** prisma.io docs · **[DZ]** orm.drizzle.team · **[OTEL]** opentelemetry.io · **[OWASP]** cheatsheetseries.owasp.org · **[TC]** node.testcontainers.org · **[Stryker]** stryker-mutator.io · **[cockatiel]** / **[pino]** their GitHub READMEs/docs · **[NPM]** docs.npmjs.com and `npm view` dist-tags on 2026-11-07 · **[DEF]** defaults distilled from production NestJS monorepos · _(memory)_ = not re-checked online for this draft.

## Contents

1. Runtime and language
2. NestJS or Fastify
3. Layering in a Node service
4. The edge: validation, config, problems, OpenAPI, idempotency
5. Data access and transactions
6. Jobs and integrations
7. Observability and shutdown
8. Security
9. Testing

## 1. Runtime and language

Verified on 2026-11-07 against https://nodejs.org/en/about/previous-releases, https://nodejs.org/api/typescript.html, https://nodejs.org/api/cli.html, https://nodejs.org/api/globals.html and https://nodejs.org/api/test.html.

- [ ] Run an LTS line only. Supported LTS: **26 "Lithium"** (latest LTS, v26.13.0), 24 "Krypton",
      22 "Jod"; 20 is EOL. From Node 27 releases become annual. **[NODE]** Which of 24/22 is
      Active vs Maintenance was not shown on the page _(memory: 24 went to Maintenance when 26
      became LTS in Oct 2026)_. Pin the major in `.nvmrc`, `engines` and the Docker base image
      (moving a service to a new LTS major is its own backlog item, not a side effect).
- [ ] TypeScript strict plus `noUncheckedIndexedAccess`, `noImplicitOverride`,
      `useUnknownInCatchVariables`, `isolatedModules`; `module`/`moduleResolution: nodenext`;
      `"type": "module"`; relative imports end in `.js`. **[DEF]**
- [ ] TypeScript 7.0.2 (native compiler) is npm `latest`; many repos are still on 6.x. Check decorator
      metadata (`emitDecoratorMetadata`) support before upgrading a Nest repo. **[NPM]** _(memory: TS 7 caveats)_
- [ ] Node's built-in type stripping is stable (v25.2 / v24.12) and on by default, but it rejects
      `enum`, runtime `namespace`, parameter properties and **decorators**, and ignores
      `tsconfig.json`. So Nest code (decorators, DI by constructor parameter properties, string
      enums) must be compiled (`tsc`, or SWC via `nest build`); stripping suits scripts only. **[NODE]**
- [ ] `node:` prefix for built-ins (`node:crypto`, `node:test`, `node:timers/promises`). _(memory)_
- [ ] `--env-file=.env` (stable since 24.10 / 22.21; `--env-file-if-exists` for optional files)
      for local runs only; real environment wins over the file, later files override earlier ones.
      It loads, it does not validate — still parse with zod at boot (§4). **[NODE cli]**
- [ ] Global `fetch` (undici) is stable since v21; `AbortSignal.timeout(ms)` and
      `AbortSignal.any([...])` combine a per-call deadline with the caller's signal. **[NODE globals]**
- [ ] `node:test` is stable (since v20) with mocks and snapshots; its coverage flag and `--watch`
      are still experimental. Prefer the runner the repo uses (Vitest in most); `node:test` is a
      fine zero-dependency choice for a small Fastify service. **[NODE test]**

## 2. NestJS or Fastify

Verified on 2026-11-07 against https://docs.nestjs.com/faq/request-lifecycle, https://docs.nestjs.com/pipes, https://docs.nestjs.com/exception-filters, https://fastify.dev/docs/latest/Reference/Lifecycle/ and https://fastify.dev/docs/latest/Reference/Validation-and-Serialization/.

| Choose          | When                                                                                                                                |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| NestJS          | several modules/teams, DI and testing seams, guards/pipes/filters, Kafka/microservice transports, the repo already uses it          |
| Fastify         | one small service or edge proxy, tight latency/footprint, JSON-schema-first contract, few dependencies                              |
| Nest on Fastify | Nest structure with Fastify's speed (`@nestjs/platform-fastify`); filters must use `HttpAdapterHost`, not Express `response.json()` |

- Nest request order: middleware → guards → interceptors (before) → pipes → controller → service →
  interceptors (after) → exception filters (route → controller → global; the first that catches
  wins). **[NEST lifecycle]** So authentication = guard, input parsing = pipe, timing/logging =
  interceptor, error mapping = one global filter.
- Global pipes/filters that need DI are registered as providers (`APP_PIPE`, `APP_FILTER`);
  `useGlobalPipes/Filters` cannot inject. **[NEST]**
- Nest ships `StandardSchemaValidationPipe` (zod, Valibot, ArkType via Standard Schema, schema on
  `@Body({ schema })`); `ValidationPipe` + class-validator is the decorator-based alternative.
  Many repos have their own `ZodValidationPipe` throwing a `ValidationError` with `issues[]` — keep
  the repo's choice. **[NEST pipes]**
- Fastify lifecycle: onRequest → preParsing → preValidation → validation → preHandler → handler →
  preSerialization → onSend → onResponse; errors go through onError to `setErrorHandler`. **[FY]**

## 3. Layering in a Node service

Same rule as `layering-and-domain.md` §1; a Nest folder layout per module that works well:

| Folder                                              | Layer                                                                          | May import                                     |
| --------------------------------------------------- | ------------------------------------------------------------------------------ | ---------------------------------------------- |
| `controllers/`, `dto/`                              | edge: zod DTO, guard, status, mapper                                           | services, dto, mappers                         |
| `services/`                                         | use cases, transaction                                                         | domain, repository ports, `TransactionManager` |
| `domain/`                                           | pure classes, state machines, domain errors                                    | shared contract enums only                     |
| `repositories/*.repository.ts`                      | port = `abstract class` (also the DI token)                                    | domain                                         |
| `repositories/prisma-*.repository.ts`, `providers/` | adapters (Prisma, Kafka, HTTP)                                                 | ports, domain, mappers                         |
| `*.module.ts`                                       | composition: `{ provide: OrdersRepository, useClass: PrismaOrdersRepository }` | everything                                     |

- Use an **abstract class** as port and token (interfaces vanish at runtime). **[DEF]**
- Unit of work: `TransactionManager.run(async (tx) => …)` wraps the ORM transaction; repositories
  take `tx`; the outbox writer runs inside the same `run`. **[DEF]**
- Enforce the dependency rule in lint: `eslint-plugin-import-x` `no-restricted-paths` (or
  dependency-cruiser) so `domain/` cannot import `@nestjs/*`, `@prisma/client`, `zod`. _(memory)_
- Clock and id generator injected (`Clock`, `IdGenerator`); no `Date.now()`/`randomUUID()` in
  domain code. **[DEF]**

## 4. The edge: validation, config, problems, OpenAPI, idempotency

Verified on 2026-11-07 against https://fastify.dev/docs/latest/Reference/Type-Providers/, https://github.com/fastify/fastify-swagger, https://docs.nestjs.com/openapi/cli-plugin and https://zod.dev/json-schema _(memory for the last)_.

- [ ] Validate every body, query, param and header at the edge: Nest → a zod pipe or
      `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })` _(memory:
      option names)_; Fastify → JSON Schema per route via a type provider
      (`@fastify/type-provider-typebox`, `-zod`, `-json-schema-to-ts`). **[NEST]** **[FY]**
- [ ] Use `z.strictObject` (or `additionalProperties: false`) and bound every string/array/number.
      Fastify's Ajv defaults are `removeAdditional: true`, `coerceTypes: 'array'`,
      `useDefaults: true` — unknown fields are silently stripped, not rejected; set
      `ajv.customOptions.removeAdditional: false` when the contract says "reject". Never enable
      `allErrors: true` (DoS), never accept user-supplied schemas (compiled with `new Function`). **[FY]**
- [ ] Fastify response schemas per status code serialize with fast-json-stringify and drop fields
      not in the schema — use them so internal fields cannot leak. **[FY]**
- [ ] Config: `process.env` read in one module only, parsed by a zod schema at start-up
      (`z.coerce.number().int()`, `z.url()`, `.startsWith('postgres://')`); failure throws before
      `listen`; for example `loadConfig(ordersEnvSchema)` as the first call in `main.ts`. **[DEF]**
- [ ] Problem details: one global filter / error handler maps `DomainError.code` → status from one
      table (e.g. `ERROR_HTTP_STATUS`), logs 5xx once, hides internals. For RFC 9457 send
      `Content-Type: application/problem+json` and `type`, `title`, `status`, `detail`, `instance`
      plus extensions `code`, `errors[]`, `traceId`. Some repos return a simpler shape such as
      `{ code, message, status, details, traceId }` as plain `application/json`; follow the repo's
      contract and record an ADR before changing it, because clients already parse it. **[DEF]**
- [ ] OpenAPI: Nest → `@nestjs/swagger` (CLI plugin derives `@ApiProperty` from `*.dto.ts`
      classes; with zod DTOs convert via `z.toJSONSchema` and hoists `definitions` into
      `components.schemas`); Fastify → `@fastify/swagger` dynamic mode (from route schemas) or
      **static mode serving the committed spec** for contract-first. Export the spec to a committed
      file (`npm run openapi` → `openapi/<service>.json`) and fail CI on drift. **[NEST]** **[FY]**
- [ ] Idempotency-Key: unique index on (principal, key); on create, insert inside the use-case
      transaction; on a duplicate, read the stored order/response and replay it (e.g.
      `findByIdempotencyKey` + `DuplicateIdempotencyKeyError`). Draft rules in
      `api-and-integrations.md` §2. **[DEF]**

## 5. Data access and transactions

Verified on 2026-11-07 against https://www.prisma.io/docs/orm/prisma-client/queries/transactions, https://www.prisma.io/changelog.md (via search), https://orm.drizzle.team/docs/transactions, https://kysely.dev/docs/intro and npm dist-tags.

| Tool    | Fits when                                                                      | Watch out for                                                                                                                                                                                                                                                                                                   |
| ------- | ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Prisma  | schema-first models, generated client, migrations included, Mongo support (v6) | npm `latest` is **8.0.0-rc.33** (a release candidate) while stable is 7.10.1 — pin exact versions; v7 is Rust-free and **requires a driver adapter**; v8 docs replace `$transaction` with `db.transaction` and drop `isolationLevel`/`timeout` options; v6 has no Mongo successor yet — a Mongo repo stays on 6 |
| Drizzle | SQL-shaped TypeScript schema, `drizzle-kit` SQL migrations, thin runtime       | 1.0 still RC (`latest` 0.45.4); check relational-query API version                                                                                                                                                                                                                                              |
| Kysely  | type-safe query builder over hand-written SQL; you own migrations (`Migrator`) | no models; write mappers yourself                                                                                                                                                                                                                                                                               |

- [ ] Repositories return domain objects through a mapper; generated ORM types never cross the
      repository. **[DEF]**
- [ ] Transactions: Drizzle `db.transaction(async (tx) => …, { isolationLevel, accessMode })`,
      nested calls = savepoints, `tx.rollback()`. **[DZ]** Prisma 8: no options — run
      `SET TRANSACTION ISOLATION LEVEL …` first, bound it with `idle_in_transaction_session_timeout`
      (or `transaction_timeout` on PG 17+), and retry `40001`/`40P01` yourself. **[PR]** Prisma 6/7
      `$transaction(fn, { isolationLevel, maxWait, timeout })` _(memory)_.
- [ ] Never call HTTP, a queue publish or email inside the callback — the transaction stays open as
      long as it runs. Use the outbox. **[PR]**
- [ ] One pool per process (`pg.Pool` `max` × processes < `max_connections`), statement and lock
      timeouts on each connection, pool closed on shutdown. _(memory)_
- [ ] N+1: load relations with one `IN (…)` / `include` per page; assert query count in a
      repository test. Raw SQL only through tagged templates (`sql\`…\``, `Prisma.sql`) or
      Kysely — never string concatenation. _(memory)_
- [ ] Migrations: generate (`prisma migrate dev`, `drizzle-kit generate`), review the SQL, apply
      with `migrate deploy` in a one-off job; expand → migrate → contract; run the `database`
      skill for live tables (it lists the Node command for every step). _(memory)_

## 6. Jobs and integrations

Verified on 2026-11-07 against https://github.com/timgit/pg-boss, https://docs.bullmq.io/guide/retrying-failing-jobs, https://docs.bullmq.io/guide/workers/stalled-jobs and https://github.com/connor4312/cockatiel.

| Queue          | Pick when                                                      | Notes                                                                                                                                                                                                                                                           |
| -------------- | -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| pg-boss (12.x) | Postgres already there; jobs must commit with the state change | SKIP LOCKED claims, retries with backoff, dead-letter queues + redrive, cron; **can create jobs inside an existing transaction** (adapters for Drizzle, Knex, Kysely, Prisma) = outbox for free; Node ≥ 22.12, PG ≥ 13                                          |
| BullMQ (6.x)   | Redis already there; high throughput, rate limits, flows       | `attempts` + `backoff` (`fixed`/`exponential`, `jitter` 0–1, custom `backoffStrategy`); jobs locked while running — a blocked event loop misses renewals and the job **stalls**, then fails after the max stall count; enqueue after commit via an outbox relay |
| Kafka          | events between services                                        | outbox relay + `processed_events` dedupe + `<topic>.retry` / `<topic>.dlq` topics                                                                                                                                                                               |

- [ ] Handlers idempotent by job/event id or state check; classify errors (BullMQ
      `UnrecoverableError` _(memory)_, pg-boss fail) so permanent failures skip retries.
- [ ] CPU-heavy work in a sandboxed processor or `worker_threads`, never on the main loop. _(memory)_
- [ ] Outbound HTTP: `fetch(url, { signal: AbortSignal.any([AbortSignal.timeout(ms), callerSignal]) })`
      — e.g. `AbortSignal.timeout(UPSTREAM_TIMEOUT_MS)` on every upstream call. Undici's
      own header/body timeouts are minutes long _(memory)_; always set your own. **[NODE]**
- [ ] Resilience with **cockatiel** (4.x): `wrap(retry(handleWhen(isRetryable), { maxAttempts,
backoff: new ExponentialBackoff() }), circuitBreaker(handleAll, { halfOpenAfter, breaker:
new ConsecutiveBreaker(5) }), timeout(ms, TimeoutStrategy.Aggressive))`; exponential backoff
      uses decorrelated jitter by default; open circuit throws `BrokenCircuitError` → 503 +
      `Retry-After`; `bulkhead(limit, queue)` caps concurrency. One breaker instance per
      dependency. **[cockatiel]** **opossum** (10.x) is the event-emitter alternative
      (`new CircuitBreaker(fn, { timeout, errorThresholdPercentage, resetTimeout })`) _(memory)_.
- [ ] Retry only idempotent calls and retryable outcomes; retry at one layer. (`api-and-integrations.md` §4)

## 7. Observability and shutdown

Verified on 2026-11-07 against https://github.com/pinojs/pino/blob/main/docs/redaction.md, https://opentelemetry.io/docs/languages/js/getting-started/nodejs/ and https://docs.nestjs.com/fundamentals/lifecycle-events.

- [ ] pino JSON to stdout; request id from `X-Request-Id` or `randomUUID()` (`genReqId`); child
      loggers carry `orderId`/`jobId`; no `console.*`. **[DEF]**
- [ ] `redact: { paths: [...], censor | remove: true }` for `req.headers.authorization`, cookies,
      tokens, passwords, emails; wildcards cost far more than explicit paths; never build paths from
      user input. **[pino]**
- [ ] OpenTelemetry: `NodeSDK` + `getNodeAutoInstrumentations()` (or chosen instrumentations) in
      an `instrumentation.ts` loaded **before** the app with `node --import ./instrumentation.js`;
      ESM apps need the loader hook (`@opentelemetry/instrumentation/hook.mjs`) or imports are not
      patched; don't stack another `--require` register. JS logs SDK is still in development —
      correlate pino lines by trace id. **[OTEL]** Importing `./instrumentation.js` as the first line
      of `main.ts` is a common shortcut; verify spans for ESM-loaded modules before relying on it.
- [ ] RED metrics per route template and job kind (prom-client histogram in an
      HTTP metrics middleware); labels bounded. **[DEF]**
- [ ] Graceful shutdown: Nest `app.enableShutdownHooks()` (off by default; `SIGTERM` never fires on
      Windows) → `onModuleDestroy` → `beforeApplicationShutdown` → `onApplicationShutdown`; stop
      claiming jobs, finish or release leases, close the HTTP server, pool and queues there.
      `app.close()` does not exit the process if timers remain. Fastify: `await app.close()` runs
      `preClose`, drains connections, then `onClose`. Readiness fails first so the balancer drains. **[NEST]** **[FY]**
- [ ] `process.on('unhandledRejection'|'uncaughtException')`: log once, then exit non-zero; do not
      keep serving. **[OWASP Node]**

## 8. Security

Verified on 2026-11-07 against https://cheatsheetseries.owasp.org/cheatsheets/Nodejs_Security_Cheat_Sheet.html, https://cheatsheetseries.owasp.org/cheatsheets/Prototype_Pollution_Prevention_Cheat_Sheet.html and https://docs.npmjs.com/generating-provenance-statements. Top 10:2025 mapping as in `security-and-testing.md` §1.

| Check                                                                                                                                                                                                                                                                 | Tag     |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| Authz per object in the service (owner check) after a role guard; BOLA test returns 404/403                                                                                                                                                                           | A01     |
| SSRF: user URLs through an allow-list + DNS/IP check before `fetch`; `redirect: 'manual'`                                                                                                                                                                             | A01     |
| `helmet()` (or `@fastify/helmet`), no `X-Powered-By`, CORS allow-list                                                                                                                                                                                                 | A02     |
| Body size limits per content type; query strings may parse to arrays/objects — validate type too                                                                                                                                                                      | A02/A05 |
| Prototype pollution: never deep-merge untrusted JSON; `Map`/`Set` or `Object.create(null)` for keyed data; strict schemas; `--disable-proto=delete` as defence in depth                                                                                               | A05/A08 |
| ReDoS: no user input in `new RegExp`; no nested quantifiers; validate with bounded lengths first                                                                                                                                                                      | A05     |
| No `eval`, `new Function`, `child_process.exec` with input (`execFile` + arg array); `node:vm` is not a sandbox                                                                                                                                                       | A05     |
| Deserialize only through schemas; verify webhook signatures (`crypto.timingSafeEqual`) before parsing                                                                                                                                                                 | A08     |
| Rate limits on auth and expensive routes (`@nestjs/throttler`, `@fastify/rate-limit`) → 429 + `Retry-After`                                                                                                                                                           | A06/A07 |
| Supply chain: committed lockfile, `npm ci`, exact versions, install scripts denied unless approved (e.g. an `allowScripts` list), `npm audit --omit=dev`, `npm audit signatures` (registry signatures + provenance); publish with trusted publishing / `--provenance` | A03     |
| Unhandled errors → generic 500 problem, no stack in the body; process exits on uncaught exceptions                                                                                                                                                                    | A10     |

## 9. Testing

Verified on 2026-11-07 against https://fastify.dev/docs/latest/Guides/Testing/, https://node.testcontainers.org/modules/postgresql/ and https://stryker-mutator.io/docs/stryker-js/vitest-runner/.

- [ ] Runner: match the repo (commonly Vitest with `globals`, v8 coverage at the repo's threshold,
      unit `src/**/*.spec.ts`, integration `test/integration/*.int-spec.ts`). New repo: Vitest; Jest 30
      only where it already exists. **[DEF]**
- [ ] Domain: pure unit tests + fast-check properties. Services: in-memory adapters (one shared
      contract suite runs against in-memory and real repositories, so the fake cannot drift from the real one). **[DEF]**
- [ ] HTTP: Nest → `Test.createTestingModule` + `app.init()` + supertest with ports overridden by
      fakes (`overrideProvider`); Fastify → `build()` app factory + `app.inject()` (no socket, waits
      for plugins). **[FY]** _(memory: Nest testing API)_
- [ ] Real database: `@testcontainers/postgresql`,
      `await using c = await new PostgreSqlContainer('postgres:<pinned>').start()`;
      `c.getConnectionUri()`; `snapshot()` / `restoreSnapshot()` to reset between tests. Some repos run integration tests against
      `make up` (compose) instead — follow the repo. **[TC]**
- [ ] Contract: exported OpenAPI equals the committed file; generated frontend client compiles;
      event payloads validated by the shared zod schemas (a `contracts` package). **[DEF]**
- [ ] Mutation: `@stryker-mutator/vitest-runner`, `"testRunner": "vitest"` (per-test coverage
      always), run on the changed critical module only:
      `npx stryker run --mutate src/modules/orders/domain/order-state-machine.ts`
      _(memory: CLI flag)_. **[Stryker]**
