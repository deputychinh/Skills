# Changelog

Follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- A delivery suite that takes one request to a demo: `ship` (controller, triage into Quick / Small / Full, `status.md` ledger, rulings instead of questions), `discover` (PR/FAQ, impact map, hypothesis, appetite), `spec` (story map, EARS criteria, spec checklist), `architect` (driving characteristics, ADRs, fitness functions, AI-call rules), `shape-plan` (walking skeleton first, backlog items, zero-context tasks, circuit breaker), `verify-app` (run as the owner will, evidence per criterion), `demo` (results page and link) and `improve-skills` (lessons into this repo). Phase checklists distilled from the canonical SDLC books and current agent workflows in `skills/ship/references/`.
- Repository for David's personal Claude Code skills, installed into `~/.claude/skills` by symlink (`make install`, `make link`).
- `init-project` and `deliver-loop`, moved from `~/.claude/skills`; content unchanged, formatted with Prettier.
- `make check`: every skill has valid frontmatter (name = folder, description ≤ 1024 characters), `SKILL.md` ≤ 500 lines, every `templates/…` and `references/…` path it names exists, no placeholders outside templates. Runs in the pre-commit hook and CI.
