---
name: ship
description: Use when David hands over a project or feature request ("làm cho tôi…", "build…", "tôi cần một app…", "/ship") and expects it planned, built, verified and shown to him without further hand-holding — for a new repo or an existing one.
---

# ship — from one request to a demo David can open

You are the **controller**. You decide the process size, keep the ledger, dispatch phase skills and
subagents, check their evidence, and finish with a demo. You do not grade your own work and you do
not stop to ask "should I continue?".

## Rules that survive compaction (read these first)

1. State lives in files, not memory: `docs/delivery/<NNN-slug>/status.md` (copy `templates/status.md`).
   Update it at every phase change; statuses never go backwards; `git log` is the second record.
2. Ask David only what nobody else can answer (business rules, money, accounts, secrets, legal,
   irreversible or outward-facing actions). Everything else: decide, write the decision and its reason
   into `status.md` under "Rulings", move on. He said: "cứ thế làm, không cần chờ tôi approve".
3. No claim without fresh evidence: a command run in this phase, its output read, a screenshot looked
   at. "Should work" is a red flag.
4. Working software over paperwork. Every artefact is as short as the work allows; the walking
   skeleton runs from the README before any feature work.
5. Appetite is fixed, scope varies. When the appetite is spent, cut scope (record what and why) —
   never extend silently (Shape Up circuit breaker).
6. Answer David in Vietnamese; repo files, code and commits in English unless the repo says otherwise.

## Step 0 · Triage (pick how much process)

| Request looks like                           | Path                                                                                  |
| -------------------------------------------- | ------------------------------------------------------------------------------------- |
| One-file fix, copy change, config            | **Quick**: reproduce → test → fix → `verify-app` → short report. No delivery folder.  |
| One feature in an existing repo, clear       | **Small**: `spec` (light) → `shape-plan` (tasks only) → build → `verify-app` → `demo` |
| New product, vague idea, or several features | **Full**: every phase below                                                           |

Write the chosen path and why into `status.md`. Upgrade the path when you learn it is bigger; never downgrade to skip a gate.

## Phases (Full path)

| #   | Phase     | Skill                          | Output                                                                           | Gate to leave                                                                      |
| --- | --------- | ------------------------------ | -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| 1   | Discover  | `discover`                     | `brief.md` (PR/FAQ, impact map, hypothesis, appetite)                            | a credible press release exists, or the idea is killed with a reason               |
| 2   | Specify   | `spec`                         | `spec.md` (story map, EARS/Given-When-Then criteria, quality targets, non-goals) | no `[NEEDS CLARIFICATION]` left; spec checklist passes                             |
| 3   | Set up    | `init-project` (new repo only) | green, documented, empty repo                                                    | `make ci` green, README quick start runs                                           |
| 4   | Architect | `architect`                    | `design.md` + ADRs                                                               | every driving characteristic has a decision and a fitness check                    |
| 5   | Plan      | `shape-plan`                   | `plan.md` + backlog items                                                        | walking skeleton is task 1; every task has its test; first slice fits the appetite |
| 6   | Build     | `deliver-loop`                 | commits per backlog item, reviewed ≥ 9/10                                        | each item shipped or filed as debt                                                 |
| 7   | Verify    | `verify-app`                   | `evidence/` (screenshots, command output)                                        | every acceptance criterion has evidence from the running app                       |
| 8   | Demo      | `demo`                         | `demo.md` + a page David opens                                                   | David has a link or URL and the run command                                        |
| 9   | Learn     | `improve-skills`               | lessons folded into the skills repo                                              | committed and pushed                                                               |

A brief is "credible" when the five customer questions are answered from facts David gave or that you
can cite; invented metrics are not allowed (mark them as hypotheses).

## Running the build (phase 6)

- Turn `plan.md` tasks into backlog items the repo already uses (`docs/backlog.md`, `<PREFIX>-<n>`),
  then run `deliver-loop`. For long work, offer nothing: start `/loop /deliver-loop` yourself.
- One task at a time per area of code (WIP = 1); a fresh subagent per task gets a self-contained brief
  (goal, files, acceptance criteria, commands) — never the conversation history.
- Verify subagent work by `git diff` and by re-running its proving command, not by its summary.
- Review: an independent reviewer gives two verdicts — matches the spec? good code? — capped at 3 fix rounds.

## Finishing

- Run `verify-app`, then `demo`. The final message to David (Vietnamese, ≤ 12 lines): what he can open
  now (URL or artifact link + run command), what works (by acceptance criterion), what was cut and why,
  what is next, hypothesis result if measurable.
- Then `improve-skills` with what this request taught.

## References

- `references/sdlc-checklists.md` — per-phase checklists distilled from the canonical books (Patton,
  Adzic, Shape Up, Evans, Martin, Beck, Fowler, Humble & Farley, Accelerate, Release It!, SRE, SE at Google…).
  Lines not checked against the book are paraphrases; do not quote them as verbatim.
- `references/agent-workflows.md` — what Anthropic's skill guidance, superpowers, spec-kit, BMad, Kiro
  and Working Backwards skills do per phase, with URLs.
- `templates/status.md` — the ledger.
