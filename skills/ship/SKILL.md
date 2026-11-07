---
name: ship
description: Carries one project, feature or bug request from intake to a demo David can open — triage, brief, spec, design, plan, build with deliver-loop, verification and a results page — deciding everything that does not need him. Use when David hands over a request to build or fix something ("làm cho tôi…", "tôi cần một app…", "build…", "/ship"), in a new or an existing repo, or to resume a delivery that has a `docs/delivery/*/status.md`.
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
   legal rules, irreversible or outward-facing actions — and ask them **all at once, during triage**
   (one AskUserQuestion, ≤ 4 questions). Until answers arrive, build against a fake adapter and keep
   going. Everything else: decide, write it under "Rulings" with the reason, move on. David: "cứ thế
   làm, không cần chờ tôi approve".
3. **No claim without fresh evidence**: a command run now, its output read, a screenshot looked at.
4. **Working software over paperwork**: artefacts as short as the work allows; a walking skeleton runs
   from the README before any feature work.
5. **Appetite is fixed, scope varies**: when the appetite is spent, cut scope (record what and why);
   never extend silently.
6. Answer David in Vietnamese; repo files, code and commits in English unless the repo says otherwise.

## Step 0 · Triage

| Request looks like                        | Path                                                                                                                                                                          |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Bug                                       | **Bug**: write current, expected and _unchanged_ behaviour into `status.md` → reproduce as a failing test → fix → `verify-app` → short report.                                |
| One-file fix, copy or config change       | **Quick**: test → change → `verify-app` → short report. No delivery folder.                                                                                                   |
| One clear feature in an existing repo     | **Small**: `spec` (stories, ACs, non-goals only) → `shape-plan` (one or two backlog items) → `deliver-loop` → `verify-app` → `demo`                                           |
| Small new tool or app for David himself   | **Small new**: light `discover` (five questions + appetite, no press release or impact map) → `spec` → `init-project` → `shape-plan` → `deliver-loop` → `verify-app` → `demo` |
| New product, vague idea, several features | **Full**: every phase below                                                                                                                                                   |

Also in triage:

- **Where**: a new repo goes in `~/Documents/David/Code/<slug>`. Create the folder and `git init`
  first (init-project Phase 1) so `docs/delivery/` has a home; the rest of `init-project` runs at phase 3.
- **Existing repo without `CLAUDE.md`, Makefile or backlog**: read it, map its real lint/test/run
  commands, write a minimal `docs/backlog.md` and a `CLAUDE.md` with those commands before building.
- **Owner-only questions** (rule 2), e.g. "an `ANTHROPIC_API_KEY` for the app?", "deploy anywhere?".
- Write the path, the reason and the appetite into `status.md`. Upgrade the path when the work turns
  out bigger; never downgrade to skip a gate.

## Phases (Full path)

| #   | Phase     | Skill                     | Output                     | Gate to leave                                                              |
| --- | --------- | ------------------------- | -------------------------- | -------------------------------------------------------------------------- |
| 1   | Discover  | `discover`                | `brief.md`                 | a credible press release, or the idea is killed with a reason              |
| 2   | Specify   | `spec`                    | `spec.md`                  | no `[NEEDS CLARIFICATION]` left; the spec checklist passes                 |
| 3   | Set up    | `init-project` (new repo) | green, documented repo     | `make ci` green; README quick start runs                                   |
| 4   | Architect | `architect`               | `design.md` + ADRs         | every driving characteristic has a decision and a fitness check            |
| 5   | Plan      | `shape-plan`              | `plan.md` + backlog items  | skeleton first; every AC covered by an item; first slice fits the appetite |
| 6   | Build     | `deliver-loop`            | reviewed commits per item  | each item shipped (≥ 9/10) or filed as debt                                |
| 7   | Verify    | `verify-app`              | evidence per AC            | every AC has evidence from the running app                                 |
| 8   | Demo      | `demo`                    | `demo.md` + a page         | David has a link, the app URL and the run command                          |
| 9   | Learn     | `improve-skills`          | lessons in the skills repo | committed and pushed                                                       |

A brief is credible when the five customer questions are answered from facts David gave or that you
can cite; numbers you cannot source are marked `HYPOTHESIS`.

## Build (phase 6)

`shape-plan` already wrote the backlog. The build and review rules are `deliver-loop`'s: run it in this
conversation (it spawns the independent reviewer, which a subagent cannot), or start `/loop
/deliver-loop` for long plans. Your job as controller between items: check each shipped item against
`spec.md`, keep `status.md` current, and cut scope when the appetite runs out.

## Finishing

`verify-app`, then `demo`, then `improve-skills`. The last message to David (Vietnamese, ≤ 12 lines):
what he can open now (link, app URL, run command), what works by AC, what was cut and why, what is next.

## References

- `references/sdlc-checklists.md` — per-phase checklists from the canonical SDLC books; most lines are
  paraphrases from memory, so check the book before quoting.
- `references/agent-workflows.md` — what Anthropic's skill guidance, superpowers, spec-kit, BMad, Kiro
  and Working Backwards skills do per phase, with URLs; items that contradict David's autonomy rule
  are marked "not adopted".
- `templates/status.md` — the ledger.
