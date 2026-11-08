---
name: shape-plan
description: Cuts a spec into an ordered plan with a fixed appetite — walking skeleton first, then the benchmark harness and baseline, riskiest work early, backlog items sized for one deliver-loop cycle, tasks a fresh subagent can do alone, release boundaries, range estimates and a circuit breaker. Use when a spec (and design) exists and the work must be planned, estimated, sliced or cut, or when the user asks "how long will this take", "break this down" or "what do we cut". Inside a delivery, `ship` calls this skill after `architect` and hands the backlog to `deliver-loop`.
---

# shape-plan — fixed time, variable scope, skeleton first

Output: `docs/delivery/<NNN-slug>/plan.md` (from `templates/plan.md`) and items appended to the repo's
`docs/backlog.md` (`<PREFIX>-<n>`, status `todo`) so `deliver-loop` can execute them.

## Steps

1. **Appetite and slices**: take the brief's appetite; release 1 = the spec's first story-map slice.
   Mark nice-to-haves with `~`; they are cut first.
2. **Walking skeleton is item 1** (if `init-project` already proved one, item 1 is only what it
   lacks — deploy or CI): the thinnest end-to-end path (UI → API → storage → back) on every platform
   in scope — web, iOS, Android — so no client meets the API for the first time late. On a Small path
   in a repo whose clients already run, there is no skeleton item: each item covers its tagged
   platforms instead. The skeleton is runnable from the README, through CI, with one e2e test. If the
   brief needs it online, the skeleton
   also deploys to the deploy target per the delivery profile (or a free preview tier), so every later slice
   ships the same way. No feature work before it runs.
3. **Harness + baseline second** when the spec has quality targets: one item builds `make bench`
   from `benchmarks/plan.md` (k6, pytest-benchmark / vitest bench, Lighthouse CI, bundle budget) and
   commits `benchmarks/baseline.json` on the skeleton, so every later item is measured against it
   (`benchmark` part B). Its row sits right after the skeleton in the plan.
4. **Riskiest first**: order items so the unknowns (a model's quality, a third-party API, performance)
   are proven early — a spike with a written result if needed.
5. **Backlog items** each fit one `deliver-loop` cycle: one story or part of one, its ACs listed, its
   demo-able outcome stated. Split anything bigger.
6. **Tasks for a zero-context builder** inside each item: exact files to create or change, the test to
   write first, the command that proves it, 5–30 minutes each (larger steps are fine when the test and command are exact), in red → green → commit order. Mark tasks
   that can run in parallel `[P]` only when they touch different files.
7. **Estimate in ranges** with confidence ("2–4 cycles, 70 %"); count and compare with past items in
   this repo (`git log`, backlog history) before guessing. Re-estimate after the skeleton.
8. **Circuit breaker**: write what gets cut if the appetite runs out, in order.
9. **Release boundaries**: mark in the Release column which slice ends at a release (a version the
   user can use); `deliver-loop` calls `release` there. Usually the skeleton and each story-map slice.
10. **Readiness check** before build: every item traces to ACs; every AC is covered by an item; the
    skeleton is first; the plan names how the user will see each slice (URL, command, screenshot).

## Anti-patterns

Estimates treated as commitments; adding parallel agents to a late plan (Brooks); unlimited WIP;
grooming a giant backlog; horizontal layers (all DB, then all API, then all UI) instead of vertical slices.

Sources: Singer _Shape Up_; Freeman & Pryce _GOOS_ (walking skeleton); McConnell _Software Estimation_;
Anderson _Kanban_; Brooks _The Mythical Man-Month_; GitHub spec-kit `tasks`.
