# Changelog

Follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). The full history is in `git log`.

## [Unreleased]

### Added

- `software-lifecycle`, a Claude Code plugin of 20 skills with one entry point, `ship`, that carries
  a request through the whole software lifecycle: build new → release → post-deploy verification
  → operate and monitor → maintain (bugs, upgrades, debt) → back to build.
- Build: `discover`, `spec`, `benchmark`, `init-project`, `architect`, `system-design`,
  `shape-plan`, `deliver-loop` (item loop with an independent 10-point review), `backend`
  (Node/TypeScript or Python), `frontend` (Vue or React), `css-design`, `database`,
  `cache-optimize`, `verify-app`, `demo`.
- Run: `release` (ready check with audit and secret scan, one build promoted, verification plan,
  checkpoints at +5 min / +1 h / +24 h with rollback triggers), `monitor` (observability, SLOs and
  burn-rate alerts, incident path, postmortems), `fix-bug` (reproduce → root cause → regression
  test → fix → confirm after deploy).
- Learn: `improve-skills` folds lessons from real work back into this repository.
- Loops with stop conditions: item loop (≤ 3 improve rounds, then debt or `blocked`), slice loop
  (re-plan after every demo, appetite tracked), release loop and learn loop; a ledger in
  `docs/delivery/<slug>/status.md` makes every run resumable.
- A delivery profile (reply language, stack defaults, autonomy, push policy, review gate, deploy
  target) read from the project's or the user's `CLAUDE.md`, so nothing personal is baked into
  the skills.
- Native mobile across the suite: `ship` asks at triage for web only, iOS, Android or several (one native codebase per store, sharing the backend API) and calls `ios` and `android`; `init-project` gains `ios-swiftui` and `android-compose` presets, `verify-app` a simulator/emulator mode, `benchmark` mobile workloads, `release` the store path (`references/app-stores.md`), `monitor` crash and ANR SLOs, and `css-design` a platform-guidelines map.
- Evals in the skill-creator case format (`evals/`), a validator (`make check`), and plugin
  marketplace packaging (`.claude-plugin/`).
