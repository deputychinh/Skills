---
name: init-project
description: Bootstraps a new repository so every later session knows the rules — git on main, Conventional Commits enforced by commitlint and husky, Prettier, a Makefile with dev and bench targets, docs (conventions, testing, ADR 0001, architecture, plan, backlog, changelog), CI, a project CLAUDE.md with a delivery profile, and a Vue or React, Node or Python baseline with strict lint, types and coverage, proven green. Use when the user asks for a bare repo, scaffold or project setup ("/init-project", "bootstrap a repo"), when work starts in an empty folder with no git history, or when `ship` needs a repo. Not the entry point for building an app or feature — `ship` is, and calls this skill.
---

# init-project

Turn an empty (or freshly generated) folder into a repo where every later session knows the rules
without being told: conventions in `docs/`, agent rules in `CLAUDE.md`, commit hygiene enforced by
hooks, and a green `make ci` before the first feature. A repo that starts green stays green far more
easily than one that is cleaned up later, because every later change is judged against the gates.

Templates live next to this file in `templates/`; `{{PLACEHOLDERS}}` are filled in Phase 2.
Design knowledge lives in `references/` (start with `references/README.md`): read the relevant file
before writing ADR 0001, the architecture doc or any API or screen, and cite it in the ADR.

## Phase 0 · Intake (one round, then act)

Read the delivery profile first (the `## Delivery profile` section of the project's `CLAUDE.md`, else
the user's `~/.claude/CLAUDE.md`; keys and defaults are in the repo README). Default everything you
can; ask only what you cannot derive, in one AskUserQuestion round, skipping anything the request,
the profile or `ship` (in `docs/delivery/*/brief.md` or `status.md`) already settled. When `ship`
calls this skill, ask nothing: take the answers ship recorded at triage and log each default you add
as a ruling in `status.md`.

| Question                          | Default when unanswered                                                                                                                      |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Project name and one-line purpose | folder name; purpose from the request                                                                                                        |
| Frontend                          | profile `frontend default`; else ask once (Vue or React, both first-class); "none" for an API, CLI or library                                |
| Backend                           | profile `backend default`; else ask once (Node/TypeScript or Python, both first-class); "none" for a static or client-only app               |
| Docs language (`{{DOCS_LANG}}`)   | English, so any contributor can read the repo; the user may choose another. Code, commit messages and Keep a Changelog headings stay English |
| Remote                            | none; when the user gives a URL, `git remote add origin <url>`, check `git ls-remote` is empty, and push only per the profile's push policy  |

### Choosing the preset

The preset name is `<backend>-<frontend>`, chosen by this rule:

1. An existing repo keeps its stacks; never switch frameworks inside one app.
2. Pick the frontend: none → no web part; needs server rendering for SEO → Nuxt (Vue) or Next.js
   (React); native mobile → Expo; otherwise a Vite SPA in the chosen framework.
3. Pick the backend: none, `node` or `python`.
4. Combine them from the table. Monorepo extras (several deployables, a shared UI package, a worker)
   follow `references/vite-monorepo.md`.

| Preset                     | Backend                                                                                                          | Frontend                                                     | Makefile                                       |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | ---------------------------------------------- |
| `node-vue`                 | `services/api` NestJS (TypeScript strict, ESLint, Vitest via SWC, Testcontainers); Prisma or Drizzle migrations  | `web/` Vite + Vue 3 (`npm create vue@latest`, see Phase 3)   | `templates/Makefile.node`                      |
| `node-react`               | as `node-vue`                                                                                                    | `web/` Vite + React + TypeScript (TanStack Router and Query) | `templates/Makefile.node`                      |
| `python-vue`               | `backend/` (or a `services/{api,worker}` uv workspace) uv + FastAPI, ruff, mypy strict, pytest cov ≥ 90, Alembic | `web/` Vite + Vue 3                                          | `templates/Makefile.python`                    |
| `python-react`             | as `python-vue`                                                                                                  | `web/` Vite + React + TypeScript                             | `templates/Makefile.python`                    |
| `node`                     | `services/api` NestJS, or `src/` TypeScript package for a library or CLI                                         | –                                                            | `templates/Makefile.node` (drop web targets)   |
| `python`                   | `src/` uv package, ruff, mypy strict, pytest                                                                     | –                                                            | `templates/Makefile.python` (drop web targets) |
| `node-next`, `python-next` | as above                                                                                                         | `web/` Next.js                                               | per backend                                    |
| `node-nuxt`, `python-nuxt` | as above                                                                                                         | `web/` Nuxt                                                  | per backend                                    |
| `next`, `nuxt`             | – (full-stack framework alone)                                                                                   | Next.js or Nuxt app                                          | `templates/Makefile.node`                      |
| `expo`                     | –                                                                                                                | Expo / React Native                                          | `templates/Makefile.node`                      |

Say in one line what you are about to scaffold, then proceed without further questions.

## Phase 1 · Git first

```bash
git init -b main            # only if no .git yet; never re-init an existing repo
git config --get user.name  # must be set; if not, stop and ask
```

Copy `templates/.gitignore` and commit nothing yet: the first commit is the governance set below.

## Phase 2 · Governance set (same in every project)

Copy from `templates/`, filling placeholders (`{{PROJECT_NAME}}`, `{{PURPOSE}}`, `{{DATE}}`,
`{{DOCS_LANG}}`, `{{SCOPES}}` as a quoted list, `{{STACK}}`, `{{ENV_PREFIX}}` such as `NOTES`,
`{{PREFIX}}` for backlog ids such as `NOTES`, and the delivery-profile values in `CLAUDE.md`). Verify
with `grep -rn '{{' .` before committing. Keep the file names exactly:

| File                                     | Role                                                                                                                                                                                                                |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CLAUDE.md`                              | Agent rules: where conventions live, the commands, definition of done, the commit routine, and a `## Delivery profile` section (copy the user's profile values; leave absent keys out).                             |
| `.claude/settings.json`                  | Safe allowlist (`make *`, `npm run *`, `uv run *`, `git status/diff/log`). No deny-list surprises.                                                                                                                  |
| `.editorconfig`, `.prettierrc.json`      | 100 columns, single quotes, trailing commas, LF, 2 spaces (tabs in Makefile).                                                                                                                                       |
| `package.json` (root)                    | Tooling only: husky, commitlint, lint-staged, prettier. Pin exact versions. `"prepare": "husky"`.                                                                                                                   |
| `commitlint.config.mjs`                  | `config-conventional` + `scope-enum`. Scopes = `repo, plan, backlog, docs, infra, ci, deps` + one per deployable (`api`, `web`, `worker`, …) + `db`, `e2e`, `content` when relevant.                                |
| `.husky/pre-commit`, `.husky/commit-msg` | `lint-staged`; `commitlint --edit`.                                                                                                                                                                                 |
| `Makefile`                               | From `templates/Makefile.python` or `templates/Makefile.node`. `.DEFAULT_GOAL := help`; every target has a `## comment`; `install`, `dev`, `lint`, `test`, `e2e`, `bench`, `ci`, run targets.                       |
| `README.md`                              | Name + tagline, screenshot table placeholder, quick start (≤ 4 commands, ideally `make install && make dev`), features, architecture (mermaid), structure, quality, licence/data notes.                             |
| `CHANGELOG.md`                           | Keep a Changelog, `## [Unreleased]` with `Added/Changed/Fixed` headings.                                                                                                                                            |
| `docs/conventions.md`                    | The conventions (single source for enums/constants/errors, backend = classes + SOLID, frontend = functions + tokens + BEM, no swallowed errors, no PII in logs, copy via locale files). Trim to the stacks present. |
| `docs/testing.md`                        | Layers table: where, how to run, threshold. Add "what the tests do not prove".                                                                                                                                      |
| `docs/adr/0001-stack-and-layout.md`      | Why this stack and this layout. Status, context, decision, consequences.                                                                                                                                            |
| `docs/architecture/README.md`            | One mermaid diagram + prose; updated with every ADR.                                                                                                                                                                |
| `docs/plan.md`, `docs/backlog.md`        | Phases with acceptance criteria; backlog with ids (`{{PREFIX}}-001`).                                                                                                                                               |
| `.github/workflows/ci.yml`               | One job per deployable + `repo` job (prettier check, commitlint on the push range). Swap the `backend` job for a Node job on Node presets.                                                                          |
| `docker-compose.yml`, `.env.example`     | Only when the preset has infra (Postgres/Redis/a queue). `.env.example` lists every key the app reads.                                                                                                              |
| `.gitignore`, `.prettierignore`          | From templates; `data/` and `.env` never enter git.                                                                                                                                                                 |

Commit: `chore(repo): bootstrap tooling, conventions and docs`.

## Phase 2b · Design review → ADR 0001 and architecture doc

When called by `ship`: no question round here (ship settled them at triage), ADR 0001 records only the
stack and layout, and the `architect` skill owns the product's design decisions, `docs/security.md`
and the architecture doc (on paths without `architect`, write their baselines here); the backlog
stays empty for `shape-plan`.

Before scaffolding code, spend one pass on design so the skeleton is right. Work through the
checklists in `references/` and write the answers down; a decision that is not in an ADR is
re-litigated by every later session.

| Question                                                                                                                              | Reference                                      | Lands in                                                                                               |
| ------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Bounded contexts, core vs supporting domain, monolith-first or not, one transaction boundary per use case, where the pure logic lives | `backend-architecture.md` "Decision checklist" | ADR 0001 §Decision, `docs/architecture/README.md`                                                      |
| Resources, error format (RFC 9457 + `code`), pagination, idempotency, versioning, auth scheme                                         | `api-design.md` MUST list                      | ADR 0001, first OpenAPI skeleton (`/health`, problem schema)                                           |
| Storage choice, migration policy, PII classification and retention, retries/outbox/caching needs, timeouts                            | `data-and-reliability.md`                      | ADR 0001 §Consequences, `docs/architecture` "Cross-cutting", `.env.example`                            |
| Threat model (assets, entry points, trust boundaries), ASVS level, headers, secret handling                                           | `security.md`                                  | `docs/security.md` (threat model) + CI audit step                                                      |
| Window size classes and navigation per class, four states per screen, tokens, a11y and performance budgets                            | `frontend-and-ux.md`                           | `docs/design-system.md` (tokens + components list), e2e a11y + Lighthouse targets in `docs/testing.md` |
| Branching, CI order, DORA targets, docs that must exist                                                                               | `delivery.md`                                  | `CLAUDE.md`, `docs/plan.md` phase 0 acceptance                                                         |

Keep ADR 0001 to one page: list the decisions and their consequences, cite the reference file and
the primary source (book or standard) for each non-obvious choice. Anything the user must decide
(business rule, budget, compliance regime) goes into one AskUserQuestion round here, not later.

Commit: `docs(plan): adr 0001, architecture, security and design-system baseline`.

## Phase 3 · Stack scaffold

Use the official generator, then apply the baseline. A generator's output tracks the framework's
current defaults; hand-written scaffolds drift from them.

- **Python** (`backend/` or `src/`): `uv init`, `pyproject.toml` with ruff (E W F I N UP B SIM RUF ANN D PL PT S C4 RET ARG C90 PTH TRY ERA), `mypy --strict`, pytest + coverage `fail_under = 90`, `filterwarnings = error`, Alembic for migrations. Layout: `config/ enums.py constants.py errors.py domain/ ports repositories/ services/ routes/ schemas/ container.py`.
- **Node / NestJS** (`services/api`): `npx @nestjs/cli new api --strict --package-manager npm --skip-git` (memory: check `--help`), then replace Jest with Vitest the NestJS way: `npm i -D vitest unplugin-swc @swc/core @vitest/coverage-v8`, a `vitest.config.ts` with the `unplugin-swc` plugin (decorator metadata needs SWC, which esbuild does not emit), a `vitest.config.e2e.ts` for `*.e2e-spec.ts`, scripts `test: vitest run`, `test:cov: vitest run --coverage` (verified on 2026-11-07 against https://docs.nestjs.com/recipes/swc). ESLint `--max-warnings 0`, `tsc --noEmit`, coverage ≥ 90 on domain and services, Testcontainers for the database. Migrations with Prisma (`prisma migrate`) or Drizzle (`drizzle-kit migrate`): pick one in ADR 0001 and set `ORM` in the Makefile.
- **Vue**: `npm create vue@latest web -- --ts --router --pinia --vitest --playwright --eslint --prettier` (verified on 2026-11-07 with `npm create vue@latest -- --help`: `--eslint-with-prettier` is deprecated and oxlint now comes with `--eslint`), then ESLint `--max-warnings 0`, `vue-tsc --noEmit` as the typecheck, Stylelint with `postcss-html` for `.vue` files (BEM + token rules), Vitest + @testing-library/vue cov ≥ 80, Playwright + axe; locale files `src/locales/<lang>.ts` with vue-i18n and a key-parity test. Details: the `frontend` skill.
- **React (Vite)**: `npm create vite@latest web -- --template react-ts --no-interactive`, then the same baseline with `tsc --noEmit`, @testing-library/react and react-i18next or the repo's i18n library. Read `references/vite-monorepo.md` before a multi-package layout.
- **Next.js**: `npx create-next-app@latest web --ts --eslint --app --src-dir --no-tailwind`, ESLint `--max-warnings 0`, Stylelint with BEM + declaration-strict-value for tokens, Vitest + Testing Library cov ≥ 80, Playwright smoke spec. Set `WEB_PORT=3000`.
- **Nuxt**: `npm create nuxt@latest web` (memory: check flags with `--help`), then the Vue baseline above with `nuxi typecheck`. Set `WEB_PORT=3000`.
- **Expo**: `npx create-expo-app@latest`, then ESLint and `tsc` baselines as above.

Wire everything into the Makefile (`install`, `dev`, `api`, `web`, `migrate`, `lint`, `test`, `e2e`,
`bench`, `ci`) and CI. The `bench` target runs `bench/api.js` with k6 against a running API; the
`benchmark` skill fills in the workloads and the baseline later, so a placeholder script that hits
`/health` is enough now. Commit per unit: `feat(api): scaffold api with health endpoint`,
`feat(web): scaffold web app with lint, test and e2e baseline`.

## Phase 4 · Prove it

Do not report done on a description. Run and paste the results:

```bash
make install && make lint && make test && make ci
git commit --allow-empty -m "bad message"   # must be REJECTED by commitlint
git log --oneline                             # 2–4 clean Conventional Commits
```

If an item fails, fix it before moving on; if it cannot be fixed now, say so explicitly in the report.

Then prove the **user's path**, not only the gates: in a fresh shell follow the README quick start
word for word, open the exact URL each dev server prints, and see the skeleton page talk to the API.
Two failures are common and invisible to the gates. First, Vite prints `localhost` while the API's
CORS list often holds only `127.0.0.1`, so the page says it cannot reach the server; list both hosts
for every dev and preview port, with a test. Second, a quick start that skips `migrate` or the worker
works on the author's machine, where both already ran; `make dev` should start infra, migrate and
every process, and the README should list nothing more.

## Phase 5 · Report and remember

End with a message a reader can act on alone:

1. The rules now in force (bullet list copied from `CLAUDE.md`, including the commit routine and push policy).
2. Commands: `make help` output.
3. What is scaffolded and what is deliberately not (remote, deploy, auth…).
4. Next step: when called by `ship`, return to it (architect and shape-plan come next); otherwise `docs/plan.md` phase 1, delivered with `deliver-loop` (start it right away unless the profile's autonomy says to wait).

If the session has a memory system, record the stack, the preset and any non-obvious constraint the
user gave, so a later session does not ask again.

## The standing rule this skill installs (also in CLAUDE.md)

**Every turn that changes files ends with a commit.** Before ending the turn: run the gates of every
touched part (`make lint`, `make test`, or the per-part equivalent), update CHANGELOG/docs in the same
change, then `git commit` with a Conventional Commit whose scope is in `commitlint.config.mjs`.
One commit per completed unit of work; several commits in one turn are fine. Commit only green.
If the gates are red at the end of the turn, do not commit: say what fails and leave the tree dirty on
purpose. Push per the delivery profile's push policy (default: commit locally; push every green
commit only when the profile says so and `origin` exists). Never force-push or rewrite history on `main`.

## Do not

- Re-run `git init` or overwrite an existing `CLAUDE.md`, `Makefile` or `docs/` without reading them first; merge instead.
- Add a tool the baseline does not use (no Biome instead of ESLint + Prettier, no Poetry instead of uv) unless the user asks.
- Leave placeholders (`{{…}}`) in committed files.
- Scaffold features. The skill ends at a green, empty, documented repo plus `docs/plan.md`.
- Skip Phase 2b because "it is a small project": a one-page ADR takes ten minutes and is what later sessions read first.
- Quote a standard from memory when `references/` has it; when `references/` is silent, search the primary source (OWASP, W3C, m3.material.io, web.dev, the book) and add a line to `references/` in the same change.
