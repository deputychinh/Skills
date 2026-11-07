---
name: improve-skills
description: Folds lessons from real work back into this skills repository (your fork): classifies each lesson, edits the skill that owns that stage, validates, commits and pushes per the delivery profile. Use at the end of a delivery, release, incident or retro, when the user corrects how work was done, or when a skill's instructions proved wrong, missing or ignored ("that should have been caught", "remember this next time", "update the skill"). `ship` calls this skill in its Learn stage.
---

# improve-skills — every lesson lands in a skill

The skills live in this repository (your fork). `make link` symlinks each `skills/<name>` into
`~/.claude/skills/<name>`, so an edit is live in the next session. Watch how the skills behave on a
real project; that is where the lessons come from.

## Steps

1. **Collect lessons** from this piece of work: review findings that a checklist would have caught,
   gates that failed late, things the user had to point out, time sinks (review rounds beyond the
   cap, `blocked` items), steps a skill told you to do that did not help. The Retro section of
   `docs/delivery/*/status.md` is the first place to look.
2. **Classify each**:
   - repo-specific → that repo's `CLAUDE.md` or docs;
   - how the user wants to work → the delivery profile in their `CLAUDE.md` (see the repo README);
   - true for any project → the skill that owns that stage, as one line that states the rule and the
     reason, written generically: "a missing CORS header only shows in a real browser, because curl
     never sends a preflight" — not the project name or item id.
3. **Pick the owner** (20 skills):

   | Stage or topic                                       | Skill                                           |
   | ---------------------------------------------------- | ----------------------------------------------- |
   | triage, ledger, lifecycle, loops, stop rules         | `ship`                                          |
   | brief, problem framing, appetite                     | `discover`                                      |
   | acceptance criteria, quality targets                 | `spec`                                          |
   | product comparison, performance baselines and guards | `benchmark`                                     |
   | repo bootstrap, CI, conventions                      | `init-project`                                  |
   | ADRs, threat model, fitness functions                | `architect`                                     |
   | estimates, storage, scaling shape                    | `system-design`                                 |
   | slicing, planning, appetite cuts                     | `shape-plan`                                    |
   | item cycle, review rubric, commit gates              | `deliver-loop`                                  |
   | server code, UI code, styling, schema and queries    | `backend`, `frontend`, `css-design`, `database` |
   | slow paths, caching                                  | `cache-optimize`                                |
   | evidence per AC, real-browser checks                 | `verify-app`                                    |
   | results page                                         | `demo`                                          |
   | versioning, deploy, smoke, rollback                  | `release`                                       |
   | SLOs, alerts, incidents                              | `monitor`                                       |
   | reproduce, root cause, regression test               | `fix-bug`                                       |
   | how lessons are folded in                            | `improve-skills`                                |

4. **Edit the skill, not a copy**; keep `SKILL.md` lean (well under 500 lines) and move detail into the
   skill's references folder. Replace or delete lines a lesson proves wrong instead of piling on.
   Explain the why instead of shouting MUST. Descriptions are third person and say _what_ the skill
   produces and _when_ to use it — never a step-by-step summary, because agents follow the summary
   and skip the body.
5. **New skill** only when a lesson is a whole new stage or task family: `skills/<kebab-name>/SKILL.md`,
   its scope in `commitlint.config.mjs`, a row in the README table, a row in `ship`'s tables.
6. **Prove and ship**: `make link && make lint`; for a behaviour change, add or update a case under
   `evals/` (a scenario where the old text led astray) and check the new text handles it. Commit
   (`feat(<skill>): …` / `fix(<skill>): …`), update `CHANGELOG.md`, push per the delivery profile's
   push policy.
7. Tell the user in one or two lines what changed in which skill.

Sources: Anthropic Agent Skills best practices (concise, progressive disclosure, evals first);
superpowers `writing-skills`; Scrum Guide 2020 retrospective (one or two concrete improvements per cycle).
