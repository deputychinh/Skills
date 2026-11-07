# Changelog

Follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- Six specialist skills, each with a measured workflow, a core checklist, anti-patterns, the evidence required before "done" and sourced references (items checked online are marked with the date; the rest are marked as from memory): `system-design` (estimates, components, storage, scaling, C4, trade-offs; a worked Kiln example), `database` (Postgres modelling, lock-aware migrations, indexing and EXPLAIN, isolation and retries, backups), `backend` (layering, API contract, RFC 9457, idempotency, jobs, integrations, observability, OWASP), `frontend` (state placement, data fetching, forms, focus, WCAG 2.2, role-based tests), `css-design` (tokens, intrinsic layout, contrast, states, BEM and cascade, visual review), `cache-optimize` (budgets, profiling, Core Web Vitals, RFC 9111 caching, cache-aside, load tests, CI guards). `ship`, `architect`, `deliver-loop` and `verify-app` call them at the right step.

### Changed

- Two independent reviews of the suite (6.5, then 7/10) drove these fixes: one push rule (push every green commit when `origin` exists) across `deliver-loop`, its rubric and `init-project`; `init-project` defers to `ship` (no second question round, ADR 0001 for stack only, empty backlog for `shape-plan`); `ship` triages Bug, Quick, Small, Small new and Full paths, looks for keys in the environment before asking, asks at most once at triage, numbers deliveries, resumes from the `status.md` Next action and requires `claude-api` plus an eval set for AI features; `verify-app` reproduces in the browser engine a report names (WebKit for Safari); `deliver-loop` hands back to `ship` and keeps project gotchas in `references/gotchas.md`; every description says what and when, with "`ship` calls this" guards.
- References: Brooks' retracted "throw one away" dropped; the Accelerate approval-board finding stated exactly; unverified Kiro, BMad and `/verify` claims marked; tables of contents added.

### Added

- `evals/`: three scenarios (a PDF-summary app, a Safari bug in Kiln, resuming from the ledger) with must / must-not checklists.
- `make check` follows relative markdown links between skills.

- Third review (8.0/10, the last round under the cap): `deliver-loop` resumes an open `ship` delivery from its Next action and only cuts releases outside one; the Bug path writes a story for the reviewer; `discover` has a light mode for Small new; `init-project` asks nothing when `ship` calls it and writes baseline docs when `architect` will not run; the triage table is whole again. Open: run the three evals in fresh sessions and record the results.

### Fixed

- Commit `76e93eb` ("docs(repo): state what and when…") also carries the `ship` triage and reference fixes: their own commit was rejected by commitlint (header too long) and the chained command did not stop.

### Added

- A delivery suite that takes one request to a demo: `ship` (controller, triage into Quick / Small / Full, `status.md` ledger, rulings instead of questions), `discover` (PR/FAQ, impact map, hypothesis, appetite), `spec` (story map, EARS criteria, spec checklist), `architect` (driving characteristics, ADRs, fitness functions, AI-call rules), `shape-plan` (walking skeleton first, backlog items, zero-context tasks, circuit breaker), `verify-app` (run as the owner will, evidence per criterion), `demo` (results page and link) and `improve-skills` (lessons into this repo). Phase checklists distilled from the canonical SDLC books and current agent workflows in `skills/ship/references/`.
- Repository for David's personal Claude Code skills, installed into `~/.claude/skills` by symlink (`make install`, `make link`).
- `init-project` and `deliver-loop`, moved from `~/.claude/skills`; content unchanged, formatted with Prettier.
- `make check`: every skill has valid frontmatter (name = folder, description ≤ 1024 characters), `SKILL.md` ≤ 500 lines, every `templates/…` and `references/…` path it names exists, no placeholders outside templates. Runs in the pre-commit hook and CI.
