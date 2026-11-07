---
name: shape-plan
description: Cuts a spec into an ordered plan with a fixed appetite — walking skeleton first, riskiest work early, backlog items sized for one deliver-loop cycle, tasks a fresh subagent can do alone, range estimates and a circuit breaker. Use when a spec (and design) exists and the work must be planned, estimated or cut. Inside a delivery, `ship` calls this skill.
---

# shape-plan — fixed time, variable scope, skeleton first

Output: `docs/delivery/<NNN-slug>/plan.md` (from `templates/plan.md`) and items appended to the repo's
`docs/backlog.md` (`<PREFIX>-<n>`, status `todo`) so `deliver-loop` can execute them.

## Steps

1. **Appetite and slices**: take the brief's appetite; release 1 = the spec's first story-map slice.
   Mark nice-to-haves with `~`; they are cut first.
2. **Walking skeleton is item 1** (if `init-project` already proved one, item 1 is only what it lacks — deploy or CI): the thinnest end-to-end path (UI → API → storage → back),
   runnable from the README, through CI, with one e2e test. If the brief needs it online, the skeleton
   also deploys to the target David named in triage (or a free preview tier), so every later slice
   ships the same way. No feature work before it runs.
3. **Riskiest first**: order items so the unknowns (a model's quality, a third-party API, performance)
   are proven early — a spike with a written result if needed.
4. **Backlog items** each fit one `deliver-loop` cycle: one story or part of one, its ACs listed, its
   demo-able outcome stated. Split anything bigger.
5. **Tasks for a zero-context builder** inside each item: exact files to create or change, the test to
   write first, the command that proves it, 5–30 minutes each (larger than superpowers' 2–5 is fine when the test and command are exact), in red → green → commit order. Mark tasks
   that can run in parallel `[P]` only when they touch different files.
6. **Estimate in ranges** with confidence ("2–4 cycles, 70 %"); count and compare with past items in
   this repo (`git log`, backlog history) before guessing. Re-estimate after the skeleton.
7. **Circuit breaker**: write what gets cut if the appetite runs out, in order.
8. **Readiness check** before build: every item traces to ACs; every AC is covered by an item; the
   skeleton is first; the plan names how David will see each slice (URL, command, screenshot).

## Anti-patterns

Estimates treated as commitments; adding parallel agents to a late plan (Brooks); unlimited WIP;
grooming a giant backlog; horizontal layers (all DB, then all API, then all UI) instead of vertical slices.

Sources: Singer _Shape Up_; Freeman & Pryce _GOOS_ (walking skeleton); McConnell _Software Estimation_;
Anderson _Kanban_; Brooks _The Mythical Man-Month_; superpowers `writing-plans`; spec-kit `tasks`.
