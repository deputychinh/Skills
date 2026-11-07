---
name: init-project
description: Bootstrap a new project the way David's best-kept repos (american-english-coach, bazaar) are set up — git on main, Conventional Commits enforced by commitlint + husky, Prettier/EditorConfig, Makefile with `help`, docs (conventions, testing, ADR 0001, architecture, plan, backlog, CHANGELOG), CI workflow, a project CLAUDE.md that states the rules and the commit-after-every-turn routine, a stack baseline (ruff/mypy strict/pytest ≥90 % or ESLint 0 warnings/tsc/Vitest ≥80 % + Playwright), and a design review against the house references (Clean Architecture/DDD, Zalando API rules + RFC 9457, DDIA/Release It! reliability, OWASP Top 10:2025 + ASVS 5.0, Material 3 adaptive + WCAG 2.2 + Core Web Vitals, DORA/Accelerate delivery) captured in ADR 0001. Trigger on "/init-project", "dự án mới", "khởi tạo dự án", "tạo project mới", "new project", "bootstrap a repo", "set up a new repo", or when asked to start work in a folder that has no git history or no CLAUDE.md.
---

# init-project

Turn an empty (or freshly generated) folder into a repo where every later session knows the rules
without being told: conventions in `docs/`, agent rules in `CLAUDE.md`, commit hygiene enforced by
hooks, and a green `make ci` before the first feature.

**Reference repos** (read them when unsure what "good" looks like here):
`~/Documents/David/Code/american-english-coach` (Python FastAPI + Next.js static + iOS shell, Vietnamese docs) and
`~/Documents/David/Code/bazaar` (NestJS microservices + Next.js + React admin, English docs).
Templates live next to this file in `templates/`; `{{PLACEHOLDERS}}` are filled in step 2.
Design knowledge lives in `references/` (start with `references/README.md`): read the relevant file
before writing ADR 0001, the architecture doc or any API/screen, and cite it in the ADR.

## Phase 0 · Intake (one round, then act)

Default everything you can; ask only what you cannot derive. Use AskUserQuestion once, with these
questions at most (skip any the user already answered in the request):

| Question                          | Default when unanswered                                                                                                                                             |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Project name and one-line purpose | folder name; purpose from the request                                                                                                                               |
| Stack preset (see table below)    | infer from the request; else `fastapi-next`                                                                                                                         |
| Docs language                     | English unless the user asks otherwise (portfolio and team repos are read by non-Vietnamese readers); rules in `CLAUDE.md` follow the same language                 |
| Remote: create a GitHub repo now? | no; if the user gives a remote URL, `git remote add origin <url>`, check `git ls-remote` is empty, push `main` and write "push after every commit" into the routine |

Stack presets and what each gets:

| Preset         | Backend                                                                                                           | Frontend                                                                                                                                                                                                                                    | Baseline gates                                 |
| -------------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| `fastapi-next` | `backend/` uv + FastAPI, ruff, mypy strict, pytest cov ≥ 90                                                       | `web/` Next.js static export, ESLint 0 warnings, Stylelint BEM + tokens, tsc, Vitest cov ≥ 80, Playwright                                                                                                                                   | both                                           |
| `fastapi-vite` | `services/{api,worker}` uv **workspace** (root `pyproject.toml` holds ruff/mypy/pytest, members in its dev group) | npm workspaces `apps/web` (React + Vite + TanStack Router/Query), `packages/ui` (tokens + components, `#ui/*` subpath imports), `packages/cli` (Commander); shared root `eslint.config.mjs` + `stylelint.config.mjs` + `tsconfig.base.json` | both; reference: `~/Documents/David/Code/kiln` |
| `django-vue`   | `backend/` uv + Django, ruff, mypy, pytest                                                                        | `web/` Vite + Vue 3                                                                                                                                                                                                                         | both                                           |
| `nest-next`    | `services/*` NestJS, ESLint, Jest                                                                                 | `web/` Next.js                                                                                                                                                                                                                              | both                                           |
| `python`       | `src/` uv package, ruff, mypy strict, pytest                                                                      | –                                                                                                                                                                                                                                           | backend only                                   |
| `next`         | –                                                                                                                 | Next.js app                                                                                                                                                                                                                                 | frontend only                                  |
| `expo`         | –                                                                                                                 | Expo / React Native                                                                                                                                                                                                                         | frontend only                                  |

Say in one line what you are about to scaffold, then proceed without further questions.

## Phase 1 · Git first

```bash
git init -b main            # only if no .git yet; never re-init an existing repo
git config --get user.name  # must be set; if not, stop and ask
```

Copy `templates/.gitignore` and commit nothing yet: the first commit is the governance set below.

## Phase 2 · Governance set (same in every project)

Copy from `templates/`, filling placeholders (`{{PROJECT_NAME}}`, `{{PURPOSE}}`, `{{DATE}}`,
`{{DOCS_LANG}}`, `{{SCOPES}}` as a quoted list, `{{STACK}}`, `{{ENV_PREFIX}}` such as `COACH`,
`{{PREFIX}}` for backlog ids such as `AEC`). Verify with `grep -rn '{{' .` before committing. Keep the file names exactly:

| File                                     | Role                                                                                                                                                                                                                                                  |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CLAUDE.md`                              | Agent rules: where conventions live, the commands, definition of done, the commit-after-every-turn routine (section "Routine mỗi turn").                                                                                                              |
| `.claude/settings.json`                  | Safe allowlist (`make *`, `npm run *`, `uv run *`, `git status/diff/log`). No deny-list surprises.                                                                                                                                                    |
| `.editorconfig`, `.prettierrc.json`      | 100 columns, single quotes, trailing commas, LF, 2 spaces (tabs in Makefile).                                                                                                                                                                         |
| `package.json` (root)                    | Tooling only: husky, commitlint, lint-staged, prettier. Pin exact versions. `"prepare": "husky"`.                                                                                                                                                     |
| `commitlint.config.mjs`                  | `config-conventional` + `scope-enum`. Scopes = `repo, plan, backlog, docs, infra, ci, deps` + one per deployable (`api`, `web`, `worker`, …) + `db`, `e2e`, `content` when relevant.                                                                  |
| `.husky/pre-commit`, `.husky/commit-msg` | `lint-staged`; `commitlint --edit`.                                                                                                                                                                                                                   |
| `Makefile`                               | `.DEFAULT_GOAL := help`; every target has a `## comment`; must include `install`, `lint`, `test`, `ci`, plus run targets per preset.                                                                                                                  |
| `README.md`                              | Name + tagline, screenshot table placeholder, quick start (≤ 4 commands), features, architecture (mermaid), structure, quality, licence/data notes.                                                                                                   |
| `CHANGELOG.md`                           | Keep a Changelog, `## [Unreleased]` with `### Thêm/Sửa/Đổi` (vi) or `Added/Changed/Fixed` (en).                                                                                                                                                       |
| `docs/conventions.md`                    | Copy of the house conventions (single source for enums/constants/errors, backend = classes + SOLID, frontend = arrow functions + tokens + BEM, no swallowed errors, no PII in logs, copy via locale files, commit rules). Trim to the stacks present. |
| `docs/testing.md`                        | Layers table: where, how to run, threshold. Add "what the tests do not prove".                                                                                                                                                                        |
| `docs/adr/0001-stack-and-layout.md`      | Why this stack and this layout. Status, context, decision, consequences.                                                                                                                                                                              |
| `docs/architecture/README.md`            | One mermaid diagram + prose; updated with every ADR.                                                                                                                                                                                                  |
| `docs/plan.md`, `docs/backlog.md`        | Phases with acceptance criteria; backlog with ids (`{{PREFIX}}-001`).                                                                                                                                                                                 |
| `.github/workflows/ci.yml`               | One job per deployable + `repo` job (prettier check, commitlint on the push range).                                                                                                                                                                   |
| `docker-compose.yml`, `.env.example`     | Only when the preset has infra (Postgres/Redis/Kafka). `.env.example` lists every key the app reads.                                                                                                                                                  |
| `.gitignore`, `.prettierignore`          | From templates; `data/` and `.env` never enter git.                                                                                                                                                                                                   |

Commit: `chore(repo): bootstrap tooling, conventions and docs`.

## Phase 2b · Design review → ADR 0001 and architecture doc

Before scaffolding code, spend one pass on design so the skeleton is right. Work through the
checklists in `references/` and write the answers down; a decision that is not in an ADR does not exist.

| Question                                                                                                                              | Reference                                      | Lands in                                                                                               |
| ------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Bounded contexts, core vs supporting domain, monolith-first or not, one transaction boundary per use case, where the pure logic lives | `backend-architecture.md` "Decision checklist" | ADR 0001 §Decision, `docs/architecture/README.md`                                                      |
| Resources, error format (RFC 9457 + `code`), pagination, idempotency, versioning, auth scheme                                         | `api-design.md` MUST list                      | ADR 0001, first OpenAPI skeleton (`/health`, problem schema)                                           |
| Storage choice, migration policy, PII classification and retention, retries/outbox/caching needs, timeouts                            | `data-and-reliability.md`                      | ADR 0001 §Consequences, `docs/architecture` "Cross-cutting", `.env.example`                            |
| Threat model (assets, entry points, trust boundaries), ASVS level, headers, secret handling                                           | `security.md`                                  | `docs/security.md` (threat model) + CI audit step                                                      |
| Window size classes and navigation per class, four states per screen, tokens, a11y and performance budgets                            | `frontend-and-ux.md`                           | `docs/design-system.md` (tokens + components list), e2e a11y + Lighthouse targets in `docs/testing.md` |
| Branching, CI order, DORA targets, docs that must exist                                                                               | `delivery.md`                                  | `CLAUDE.md`, `docs/plan.md` phase 0 acceptance                                                         |

Keep ADR 0001 to one page: list the decisions and their consequences, cite the reference file and
the primary source (book/standard) for each non-obvious choice. Anything the user must decide
(business rule, budget, compliance regime) goes into one AskUserQuestion round here, not later.

Commit: `docs(plan): adr 0001, architecture, security and design-system baseline`.

## Phase 3 · Stack scaffold

Use the official generator, then apply the house baseline. Never hand-write what a generator gives.

- **Python** (`backend/` or `src/`): `uv init`, `pyproject.toml` with ruff (E W F I N UP B SIM RUF ANN D PL PT S C4 RET ARG C90 PTH TRY ERA), `mypy --strict`, pytest + coverage `fail_under = 90`, `filterwarnings = error`. Layout: `config/ enums.py constants.py errors.py domain/ ports repositories/ services/ routes/ schemas/ container.py`.
- **Next.js**: `npx create-next-app@latest web --ts --eslint --app --src-dir --no-tailwind`, then `output: 'export'`, ESLint `--max-warnings 0`, Stylelint with BEM pattern + declaration-strict-value for tokens, Vitest + Testing Library cov ≥ 80, Playwright with a smoke spec. Copy strings live in `src/locales/{vi,en}.ts` with a key-parity test.
- **Vite monorepo** (`fastapi-vite`): `npm create vite@latest apps/web -- --template react-ts --no-interactive`, then replace its oxlint with the house ESLint and drop `tsconfig.app/node.json` for one tsconfig extending `tsconfig.base.json`. Gotchas met in kiln: pin TypeScript 6.x (typescript-eslint and `openapi-typescript` peer ranges; add `overrides: {"openapi-typescript": {"typescript": "$typescript"}}`); pin the **same** `react`/`react-dom` in every workspace or the UI package loads a second React (`useEffect` of null at runtime, `npm ls react` must show one version); a shared UI package cannot use the app's `@/` alias, so give it `"imports": {"#ui/*": "./src/*"}` plus matching `paths` in both tsconfigs; `vite preview --host 127.0.0.1` or Playwright's webServer never sees it; Playwright `webServer` can start the API too (`cwd: '../..'`). Python side: `--import-mode=importlib` and no `tests/__init__.py` when two services both have `tests/`; starlette's TestClient wants `httpx2`; `HTTPStatus.UNPROCESSABLE_CONTENT` is 3.13+, use `UNPROCESSABLE_ENTITY` on 3.12. pnpm needs corepack, which Node ≥ 25 no longer ships: default to npm workspaces.
- **NestJS**: `nest new` per service, shared `contracts/` package, Jest.
- **Django / Vue / Expo**: official generators, then ruff/mypy or ESLint/tsc baselines as above.

Wire everything into the Makefile (`install`, `api`, `web`, `lint`, `test`, `e2e`, `ci`) and CI.
Commit per unit: `feat(api): scaffold FastAPI app with health endpoint`, `feat(web): scaffold Next.js app with lint, test and e2e baseline`.

## Phase 4 · Prove it

Do not report done on a description. Run and paste the results:

```bash
make install && make lint && make test && make ci
git commit --allow-empty -m "bad message"   # must be REJECTED by commitlint
git log --oneline                             # 2–4 clean Conventional Commits
```

If an item fails, fix it before moving on; if it cannot be fixed now, say so explicitly in the report.

Then prove the **owner path**, not only the gates: in a fresh shell follow the README quick start
word for word, open the exact URL each dev server prints (Vite prints `localhost`, so the API's CORS
default lists both `localhost` and `127.0.0.1` for every dev/preview port, with a test), and see the
skeleton page talk to the API. The quick start must list every step the app needs (infra, migrate,
API, worker, web) — or one `make dev` that starts them all — and nothing more. Kiln shipped v0.1 with
polished docs and a plan, yet the first time the owner opened it the gallery said "cannot reach its
server" (CORS on `localhost`) and the README skipped `migrate` and `worker`.

## Phase 5 · Report and remember

End with a message a reader can act on alone:

1. The rules now in force (bullet list copied from `CLAUDE.md`, including the commit-after-every-turn routine).
2. Commands: `make help` output.
3. What is scaffolded and what is deliberately not (remote, deploy, auth…).
4. Next step: `docs/plan.md` phase 1, delivered with `/deliver-loop` (start it right away unless the owner said otherwise).

Then write a `project` memory (`memory/project-<name>.md`) with the stack, presets chosen and any non-obvious constraint the user gave, and link it from `MEMORY.md`.

## The standing rule this skill installs (also in CLAUDE.md)

**Every turn that changes files ends with a commit.** Before ending the turn: run the gates of every
touched project (`make lint`, `make test`, or the per-project equivalent), update CHANGELOG/docs in the same
change, then `git commit` with a Conventional Commit whose scope is in `commitlint.config.mjs`.
One commit per completed unit of work; several commits in one turn are fine. Commit only green.
If the gates are red at the end of the turn, do not commit: say what fails and leave the tree dirty on purpose.
Never `git push` unless the user asks. Never rewrite history on `main`.

## Do not

- Re-run `git init` or overwrite an existing `CLAUDE.md`, `Makefile` or `docs/` without reading them first; merge instead.
- Add a tool the house baseline does not use (no Biome instead of ESLint+Prettier, no Poetry instead of uv) unless the user asks.
- Leave placeholders (`{{…}}`) in committed files.
- Scaffold features. The skill ends at a green, empty, documented repo plus `docs/plan.md`.
- Skip Phase 2b because "it is a small project": a one-page ADR takes ten minutes and is what later sessions read first.
- Quote a standard from memory when `references/` has it; when `references/` is silent, search the primary source (OWASP, W3C, m3.material.io, web.dev, the book) and add a line to `references/` in the same change.
