---
name: ship
description: Use when David asks to build, make or fix anything — "làm cho tôi…", "tôi cần một app…", "sửa lỗi…", "bị lỗi", "không chạy", "X does nothing", "build…", "/ship" — in a new or an existing repo, or to resume a delivery that has `docs/delivery/*/status.md`. Carries the request from intake to a demo David can open, deciding everything that does not need him.
---

# ship — from one request to a demo David can open

You are the **controller**: pick the process size, keep the ledger, run the phase skills, check their
evidence, finish with a demo. You do not grade your own work and you do not ask "should I continue?".

## Core rules

1. **Ledger first.** State lives in `docs/delivery/<NNN-slug>/status.md` (copy `templates/status.md`),
   not in memory. Update it at every phase change, including its **Next action** line; statuses never go
   backwards. After a compaction or in a new session: re-invoke `ship`, read `status.md`, continue at
   Next action.
2. **Ask only what nobody else can answer** — secrets and API keys, paid accounts, hosting, business or
   legal rules, irreversible or outward-facing actions. First look for the answer yourself (environment
   variables, `.env`, the macOS keychain, the repo, memory). Ask with one AskUserQuestion (≤ 4
   questions, all of them, at triage) only when an answer blocks the next phase; otherwise write the
   question in `status.md`, take a safe default (e.g. a fake adapter for a missing key), mention it at
   the end of the turn and keep going. Everything else: decide, write it under "Rulings" with the
   reason, move on. David: "cứ thế
   làm, không cần chờ tôi approve".
3. **No claim without fresh evidence**: a command run now, its output read, a screenshot looked at.
4. **Working software over paperwork**: artefacts as short as the work allows; a walking skeleton runs
   from the README before any feature work.
5. **Appetite is fixed, scope varies**: when the appetite is spent, cut scope (record what and why);
   never extend silently.
6. Answer David in Vietnamese; repo files, code and commits in English unless the repo says otherwise.

## Step 0 · Triage

| Request looks like                        | Path                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Bug                                       | **Bug**: `status.md` with current, expected and _unchanged_ behaviour → a backlog item `<PREFIX>-<n>` → reproduce as a failing test in the environment the report names (browser engine, OS, data) → fix → `deliver-loop` steps 1 and 4–7 for that item (its story `docs/stories/<PREFIX>-<n>.md` links `status.md`; its ACs are the expected and unchanged behaviour) (review ≥ 9, commit, push) → `verify-app` → ≤ 5-line report. |
| One-file fix, copy or config change       | **Quick**: test → change → `verify-app` → short report. No delivery folder.                                                                                                                                                                                                                                                                                                                                                         |
| One clear feature in an existing repo     | **Small**: `spec` (stories, ACs, non-goals only) → `shape-plan` (one or two backlog items) → `deliver-loop` → `verify-app` → `demo`                                                                                                                                                                                                                                                                                                 |
| Small new tool or app for David himself   | **Small new**: light `discover` (headline, five questions, appetite; no FAQ or impact map) → `spec` → `init-project` (smallest preset that fits) → `shape-plan` → `deliver-loop` → `verify-app` → `demo`                                                                                                                                                                                                                            |
| New product, vague idea, several features | **Full**: every phase below                                                                                                                                                                                                                                                                                                                                                                                                         |

On any path, when the product calls an AI model: run `architect` step 6 (AI calls, eval set,
fallback, budget) and load the `claude-api` skill before choosing how to call the model (e.g. native
PDF or image input instead of a hand-made extraction pipeline).

Also in triage:

- **Where**: a new repo goes in `~/Documents/David/Code/<slug>`. Create the folder and `git init`
  first (init-project Phase 1) so `docs/delivery/` has a home; the rest of `init-project` runs at phase 3.
- **Existing repo without `CLAUDE.md`, Makefile or backlog**: read it, map its real lint/test/run
  commands, write a minimal `docs/backlog.md` and a `CLAUDE.md` with those commands before building.
- **Owner-only questions** (rule 2), e.g. "an `ANTHROPIC_API_KEY` for the app?", "deploy anywhere?".
- **Numbering**: `NNN` is the next free three-digit number under `docs/delivery/`.
- Write the path, the reason and the appetite into `status.md`. Upgrade the path when the work turns
  out bigger; never downgrade to skip a gate.

## Phases (Full path)

| #   | Phase     | Skill                                                              | Output                                            | Gate to leave                                                                             |
| --- | --------- | ------------------------------------------------------------------ | ------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| 1   | Discover  | `discover` (+ `benchmark` A: 2–3 reference products)               | `brief.md`, product-benchmark table               | a credible press release, or the idea is killed with a reason                             |
| 2   | Specify   | `spec` (+ `benchmark` B: workloads and targets)                    | `spec.md`, `benchmarks/plan.md`                   | no `[NEEDS CLARIFICATION]`; every quality target has a workload and a number              |
| 3   | Set up    | `init-project` (new repo)                                          | green, documented repo                            | `make ci` green; README quick start runs                                                  |
| 4   | Architect | `architect` (+ `system-design`, `database`)                        | `design.md` + ADRs                                | every driving characteristic has a decision and a fitness check                           |
| 5   | Plan      | `shape-plan`                                                       | `plan.md` + backlog items                         | skeleton first, benchmark harness second; every AC covered; first slice fits the appetite |
| 6   | Build     | `deliver-loop` (+ `backend`, `frontend`, `css-design`, `database`) | reviewed commits per item                         | each item shipped (≥ 9/10) or filed as debt                                               |
| 7   | Verify    | `verify-app` (+ `benchmark` vs baseline, `cache-optimize`)         | evidence per AC, benchmark diff                   | every AC has evidence; no unexplained regression                                          |
| 8   | Demo      | `demo`                                                             | `demo.md` + a page                                | David has a link, the app URL and the run command                                         |
| 9   | Release   | `release` (at a release boundary)                                  | tag, deploy or "local only", smoke, SLOs          | smoke green on the target; findings in the backlog                                        |
| 10  | Learn     | `improve-skills` (+ retro)                                         | lessons in the skills repo, next slice re-planned | committed and pushed                                                                      |

A brief is credible when the five customer questions are answered from facts David gave or that you
can cite; numbers you cannot source are marked `HYPOTHESIS`.

## The loops (this is not a straight line)

```
Request → triage ─┬─> discover → spec → [init] → architect → shape-plan ─┐
                  │                                                       v
                  │   ┌──────────── Slice loop (one appetite-sized slice) ───────────┐
                  │   │  plan slice → Item loop × N → verify-app → demo → feedback   │
                  │   │       ^                                            │         │
                  │   │       └──── re-plan: spec / plan updated, cut scope ┘         │
                  │   └───────────────────────────────┬──────────────────────────────┘
                  │                                   v  release boundary
                  │                    release → observe → findings → backlog ──> next slice
                  └─ Bug / Quick paths join at the Item loop
Item loop (deliver-loop): story → design → TDD → verify → review → improve (≤ 3) → ship item
Learn loop: every slice and release → retro → improve-skills → the next run uses better skills
```

1. **Item loop** — `deliver-loop`, one backlog item: build, verify, independent review, improve at
   most 3 rounds, ship or file debt. Repeats until the slice's items are done.
2. **Slice loop** — after each slice: `verify-app` (with the benchmark diff), `demo`, then read the
   feedback (David's, the hypothesis metric, the benchmark) and **re-plan**: update `spec.md` and
   `plan.md`, cut scope by the circuit breaker, pick the next slice. Write it in `status.md`.
3. **Release loop** — at a release boundary (`plan.md` says which slice), `release`: tag, deploy,
   smoke, observe; every finding becomes a backlog item that the next slice can take.
4. **Learn loop** — every slice and release ends with a retro: what slowed us, what reviews caught
   late; `improve-skills` puts it into the skills so the next request runs better.
5. **Running unattended** — for anything longer than one sitting, start `/loop /deliver-loop`
   (or re-invoke `ship`): each wake-up reads `status.md` and continues the current loop at its
   Next action; a monitor or the review's completion wakes it, a 20–30 min heartbeat is the fallback.

## Specialist skills (load the ones the work touches)

| Phase                | When the work involves                                                     | Skill                                               |
| -------------------- | -------------------------------------------------------------------------- | --------------------------------------------------- |
| 4 Architect          | a new system or a part that must scale, estimates, storage choice          | `system-design` (then `architect` records the ADRs) |
| 4 Architect, 6 Build | tables, migrations, indexes, queries, transactions                         | `database`                                          |
| 6 Build              | routes, services, domain, jobs, integrations                               | `backend`                                           |
| 6 Build              | screens, components, hooks, forms, data fetching                           | `frontend`                                          |
| 6 Build              | tokens, layout, colour, typography, component states                       | `css-design`                                        |
| 7 Verify             | a performance target, something slow, caching                              | `cache-optimize`                                    |
| 1, 2, 5, 7           | comparing with other products; performance targets, baselines, regressions | `benchmark`                                         |
| 9 Release            | tagging, deploying, smoke checks, rollback, monitoring                     | `release`                                           |

## Build (phase 6)

`shape-plan` already wrote the backlog. The build and review rules are `deliver-loop`'s: run it in this
conversation (it spawns the independent reviewer, which a subagent cannot), or start `/loop
/deliver-loop` for long plans. Your job as controller between items: check each shipped item against
`spec.md`, keep `status.md` current, and cut scope when the appetite runs out.

## Finishing

`verify-app`, then `demo`, then — at a release boundary — `release`, then the retro and `improve-skills`; then the next slice (the slice loop above) until the plan is done or the appetite is spent. The last message to David (Vietnamese, ≤ 12 lines):
what he can open now (link, app URL, run command), what works by AC, what was cut and why, what is next.

## References

- `references/sdlc-checklists.md` — per-phase checklists from the canonical SDLC books; most lines are
  paraphrases from memory, so check the book before quoting.
- `references/agent-workflows.md` — what Anthropic's skill guidance, superpowers, spec-kit, BMad, Kiro
  and Working Backwards skills do per phase, with URLs; items that contradict David's autonomy rule
  are marked "not adopted".
- `templates/status.md` — the ledger.
