# Security in code, testing, performance

Tags: **[T10]** OWASP Top 10:2025 · **[ASVS]** OWASP ASVS 5.0 · **[CS]** OWASP Cheat Sheet Series ·
**[HYP]** Hypothesis docs · **[CP]** Cosmic Python · **[HOUSE]** house references
(`security.md`, `delivery.md`, Kiln `docs/conventions.md`). The threat model itself belongs to
`architect` step 8; this file is the code-level checklist.

Verified on 2026-11-07 against https://top10.owasp.org/2025 (A01 includes SSRF, CWE-918),
https://github.com/OWASP/ASVS/tree/master/5.0/en (chapter list),
https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html,
https://hypothesis.readthedocs.io/en/latest/ and https://hypothesis.readthedocs.io/en/latest/stateful.html.

Stack note: the checklist rows and the pyramid are stack-neutral. Python-specific: SQLAlchemy,
`shell=True`, `pickle`/`yaml.load`, `hmac.compare_digest`, `pip-audit`, the grep block, pytest,
Hypothesis and mutmut. Node equivalents (prototype pollution, ReDoS, helmet, npm supply chain,
Vitest/Jest, supertest/`inject`, Testcontainers, fast-check, Stryker) are in `node-typescript.md` §8–9.

## Contents

1. Security checklist per change
2. Testing
3. Mutation checks for critical rules
4. Performance basics

## 1. Security checklist per change

Top 10:2025: A01 Broken Access Control, A02 Security Misconfiguration, A03 Software Supply Chain
Failures, A04 Cryptographic Failures, A05 Injection, A06 Insecure Design, A07 Authentication
Failures, A08 Software or Data Integrity Failures, A09 Security Logging and Alerting Failures, A10
Mishandling of Exceptional Conditions. **[T10]**

| Check                                                                                                                                                                                                                                       | Tag                                                   |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| Authorize in the service per object: `can(principal, action, resource)`; deny by default; a test reads/writes another user's object and gets 404/403                                                                                        | **[T10 A01]** **[ASVS V8]**                           |
| Function-level: admin/maintenance routes need their own role check and test                                                                                                                                                                 | **[T10 A01]** **[ASVS V8]**                           |
| User-supplied URL → allow-list host, build the request yourself, resolve DNS and check the IPs (block loopback, RFC 1918, link-local, `169.254.169.254`, IPv6 `fc00::/7`, `fe80::/10`, `::1`), connect to the checked IP, disable redirects | **[T10 A01]** **[CS SSRF]**                           |
| SQL through SQLAlchemy Core bound parameters only; dynamic sort/filter columns from an enum allow-list                                                                                                                                      | **[T10 A05]** **[ASVS V1]**                           |
| No `shell=True`, no string-built commands; subprocess args as a list from validated values                                                                                                                                                  | **[T10 A05]**                                         |
| Validate at the edge: types, lengths, ranges, formats, `extra="forbid"`; then domain invariants                                                                                                                                             | **[ASVS V2]** **[HOUSE]**                             |
| Files: size and type limits, never trust client name or content type, store under generated keys, parse untrusted formats in a sandbox, serve via signed URL                                                                                | **[ASVS V5]** **[HOUSE: Kiln ADR 0004, 0005, 0007]**  |
| Rate limits per principal on auth and expensive routes; 429 + `Retry-After`                                                                                                                                                                 | **[ASVS V4]** _(memory: chapter mapping)_ **[HOUSE]** |
| Tokens random ≥ 128 bits, compared in constant time (`hmac.compare_digest`); passwords Argon2id                                                                                                                                             | **[T10 A04]** **[ASVS V11]** **[HOUSE]**              |
| Webhook/inbound signatures verified before parsing the body                                                                                                                                                                                 | **[T10 A08]** **[HOUSE]**                             |
| Deserialize only into schemas; no `pickle`/`yaml.load` on input                                                                                                                                                                             | **[T10 A08]**                                         |
| Settings validated at boot, debug off, CORS allow-list, security headers                                                                                                                                                                    | **[T10 A02]** **[ASVS V13]**                          |
| New dependency: lockfile updated, `pip-audit` clean, licence and maintenance checked                                                                                                                                                        | **[T10 A03]** **[HOUSE]**                             |
| Security events logged (authn failure, authz denial, admin action) with ids, no secrets                                                                                                                                                     | **[T10 A09]** **[ASVS V16]**                          |
| Fail closed: an authz or validation error path never falls through to success; timeouts and resource limits everywhere                                                                                                                      | **[T10 A10]** **[ASVS V16]**                          |
| Data to an AI model: no personal data; output parsed by a schema; untrusted text never reaches tools unescaped                                                                                                                              | **[HOUSE]** (`architect` step 6)                      |

ASVS 5.0 chapter names for citing: V1 Encoding and Sanitization, V2 Validation and Business Logic,
V4 API and Web Service, V5 File Handling, V6 Authentication, V7 Session Management, V8
Authorization, V9 Self-contained Tokens, V11 Cryptography, V13 Configuration, V14 Data Protection,
V15 Secure Coding and Architecture, V16 Security Logging and Error Handling. **[ASVS]** Level 1 for
every repo, Level 2 when money, health data or auth is involved. **[HOUSE]**

Quick greps before commit (each should print nothing or only reviewed lines). Python:

```sh
grep -rnE "text\(f\"|execute\(f\"|shell=True|pickle\.loads|yaml\.load\(|verify=False" services/
grep -rnE "except Exception|except:" services/ | grep -v problems.py
grep -rnE "log\w*\.(info|warning|error|debug)\(.*(email|password|token|secret|url)" services/
```

Node:

```sh
grep -rnE "eval\(|new Function\(|child_process|exec\(|\\\$queryRawUnsafe|\\\$executeRawUnsafe|new RegExp\(" src/
grep -rnE "catch \{\s*\}|catch \(\w+\) \{\s*\}|console\." src/
grep -rnE "logger\.\w+\(.*(email|password|token|secret)" src/
```

## 2. Testing

Python names below; Node: `*.spec.ts` next to the code, `test/integration/*.int-spec.ts`,
supertest or `app.inject()` for API tests, fast-check for properties, Stryker for mutation.

| Level                | What                                                                            | Doubles                 | Share                        |
| -------------------- | ------------------------------------------------------------------------------- | ----------------------- | ---------------------------- |
| Unit (`tests/unit`)  | value objects, entities, state machines, pure functions                         | none                    | most tests                   |
| Service              | use cases through fake UoW and fake ports                                       | fakes you own           | many                         |
| Repository / adapter | SQL, migrations, S3 adapter                                                     | real Postgres, local S3 | one per query/adapter method |
| API (`tests/api`)    | routing, schemas, status codes, problem codes, authz                            | fakes for ports         | per endpoint × error path    |
| Contract             | OpenAPI exported = committed; generated client compiles; worker payload schemas | none                    | per boundary                 |
| E2E                  | main journeys against the production build                                      | none                    | few                          |

- Test the service layer with fakes ("high gear"); keep a thin set of end-to-end tests for one happy
  and one unhappy path. **[CP ch. 4]**
- Don't mock what you don't own: fake your own ports; integration-test adapters against the real
  thing. **[CP ch. 6]**
- Test names are sentences; one behaviour per test; arrange data with builders, not fixtures that
  hide the rule. **[HOUSE]**
- Contract test: `make openapi` then `git diff --exit-code services/api/openapi.json` in CI, so code
  and committed spec can't drift. **[HOUSE]**
- Property-based testing: describe inputs with strategies and `@given`; Hypothesis picks cases and
  reports a minimal failing example. Good targets: round-trips (serialize/parse, cursor
  encode/decode), invariants (money never negative, size within bounds), idempotence
  (`f(f(x)) == f(x)`), oracle comparison (new vs simple implementation). **[HYP]**
- Stateful testing (`RuleBasedStateMachine`): rules are actions, invariants run after every step;
  a failure prints a short reproducible program. Use it for state machines, job leasing and the
  idempotency store. **[HYP stateful]**
- Coverage ≥ 90 % is a floor checked in CI, reviewed for meaning. **[HOUSE]**
- Time, randomness and ids are injected so tests are deterministic. **[HOUSE]**

## 3. Mutation checks for critical rules

Python (mutmut) below; Node uses Stryker with the Vitest runner (`node-typescript.md` §9). Run on
the module that holds a changed critical rule (authz, money, state transitions, idempotency,
lease arithmetic), not on the whole codebase. _(memory: tool behaviour; verify flags against the
installed version)_

```sh
uv run mutmut run --paths-to-mutate services/api/kiln_api/domain/versions.py
uv run mutmut results
```

A surviving mutant means a missing assertion: add the test or record why the mutant is equivalent.

## 4. Performance basics

- Measure before optimizing; set a budget per route (e.g. p95 < 300 ms) and test the top queries on
  a seeded dataset (`make load`). **[HOUSE]**
- No N+1: load a page of aggregates with one query per table (`IN (…)`), check the query count in a
  repository test. _(memory)_
- Every list query has an index matching `WHERE` + `ORDER BY` (equality columns first, range last);
  confirm with `EXPLAIN (ANALYZE, BUFFERS)` on seeded data. **[HOUSE]**
- Keyset pagination (`WHERE (created_at, id) < (:c, :id) ORDER BY created_at DESC, id DESC`), not
  `OFFSET`, on large tables. **[ZAL #160]** _(memory: SQL form)_
- Connection pool sized below Postgres `max_connections` divided across processes; every
  connection has statement/lock timeouts and TCP keepalives (Kiln ADR 0010). **[HOUSE]**
- Heavy CPU (rendering, parsing, AI) belongs in the worker, never in the request path. **[HOUSE]**
- Cache only a measured hot path; keys include tenant/version; signed URLs stable within a window
  so browsers can cache (Kiln ADR 0008). **[HOUSE]**
