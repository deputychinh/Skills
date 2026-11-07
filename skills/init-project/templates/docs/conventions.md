# Conventions

Lint enforces most of these rules; the rest is checked in review.

## General

- **Single source of truth**: enums, constants, errors and shared interfaces are declared in exactly one place (Python: `enums.py`, `constants.py`, `errors.py`; TypeScript backend and web: `src/enums/*.enum.ts`, `src/constants/*.constant.ts`, `src/interfaces/*.interface.ts`) and imported everywhere else.
- **Independent units**: a module/feature depends only on abstractions and on its own folder. Dependencies point inward (routes → services → domain; never domain → framework).
- **Backend = classes + SOLID; frontend = arrow functions + design tokens + BEM.**
- Errors are never swallowed; domain errors carry a stable code (`ErrorCode`) and are mapped to HTTP/UI exactly once at the boundary (RFC 9457 problem details on the API).
- No personal data, secrets, tokens or uploaded content in logs.
- Formatting: Prettier (100 columns, single quotes, trailing commas); Python: ruff format (100 columns).
- Time in UTC ISO-8601; ids are UUID v4 (or ULID when creation order matters) as strings; JSON field casing is fixed once per API (`snake_case` on a Python API, `camelCase` on a Node API) and consumed through generated types on the web.

Keep the backend section for the stack in use and delete the other.

## Backend (Python 3.12)

| Topic | Rule |
| --- | --- |
| Layout | `config/` (Settings from `{{ENV_PREFIX}}_*` env), `enums.py`, `constants.py`, `errors.py`, `domain/` (pure, no I/O), `ports` (abstract interfaces), `repositories/`, `services/`, `routes/`, `schemas/` (pydantic, boundary only), `db/`, `container.py` (composition root) |
| Types | mypy `strict`; no `Any`; frozen slotted dataclasses for values; pydantic only at the API boundary |
| Lint | ruff: E W F I N UP B SIM RUF ANN D(google) PL PT S C4 RET ARG C90(≤ 8) PTH TRY ERA ASYNC; every `noqa` has a reason |
| Classes | constructor injection, `_private`, one reason to change; services receive abstract ports |
| Constants | `UPPER_SNAKE_CASE` in `constants.py`; every magic number in a comparison has a name |
| Tests | `tests/unit` for domain, `tests/api` through `TestClient` with fakes for ports; test names are sentences; coverage ≥ 90 % |
| Data | migrations are the only schema change path (Alembic); every migration reversible; no destructive migration without an ADR |

## Backend (Node / NestJS, TypeScript)

| Topic | Rule |
| --- | --- |
| Layout | `src/config/` (typed settings from `{{ENV_PREFIX}}_*` env, validated at boot), `src/<module>/{<module>.controller.ts,<module>.service.ts,domain/,ports/,adapters/,dto/}`, `src/common/{enums,constants,errors}` |
| Types | `strict: true`; no `any`; no non-null `!`; DTOs validated at the boundary only |
| Lint | ESLint with typescript-eslint `strictTypeChecked`, `--max-warnings 0`; every disable comment has a reason |
| Classes | constructor injection through Nest providers; services depend on port interfaces, adapters implement them |
| Tests | Vitest (SWC) unit tests for domain and services; `*.e2e-spec.ts` through the HTTP layer on a real database (Testcontainers); coverage ≥ 90 % on domain and services |
| Data | migrations are the only schema change path (Prisma or Drizzle, per ADR 0001); no destructive migration without an ADR |

## Web (TypeScript)

| Topic | Rule |
| --- | --- |
| Layout | `src/app` (routes), `src/features/<name>/{components,composables or hooks,services,index.ts}`, `src/components` (shared primitives), `src/api` (generated schema + client), `src/constants`, `src/enums`, `src/interfaces`, `src/utils`, `src/styles/{tokens,base,layout,components}` |
| Functions | arrow functions for logic (`<script setup>` in Vue); no classes; no `any`; no non-null `!`; `@/` alias, no `../../` |
| CSS | BEM, block = file name (`PracticeCard.css` ↔ `.practice-card`); only tokens (`var(--…)`) for colour, spacing, type, radius, shadow, z-index, duration; mobile-first `@media (--bp-md)`; fixed property order |
| State | server state through the feature's service; URL state for the selected item; shared client state in Pinia (Vue) or a small store (React) only when two distant parts need it; local `ref` / `useState` for the rest; watchers and effects only to sync with external systems |
| UI | every data screen has loading / empty / error / success; colour is never the only signal; keyboard works; targets ≥ 24 px (WCAG 2.2 2.5.8), 44 px for primary actions |
| Copy | no hard-coded display strings; one `src/locales/<lang>.ts` per supported language, the default locale is the source of truth, key parity tested |
| Tests | Vitest + Testing Library by role/label; line coverage ≥ 80 %; Playwright for the main journeys against the production build |

## Commits and branches

- Conventional Commits; scopes in `commitlint.config.mjs`. One commit per complete unit of work (code + test + docs).
- husky runs Prettier (pre-commit) and commitlint (commit-msg); CI repeats both.
- A behaviour or decision change updates the ADR/docs in the same commit.
- Trunk-based: short-lived `feat/**` / `fix/**` branches or direct commits on `main` for solo work; CI must be green before merge.
