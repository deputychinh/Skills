---
name: improve-skills
description: Use at the end of a delivery, release or retro, when David corrects how work was done, or when a skill's instructions turned out wrong, missing or ignored — to fold the lesson into David's skills repo (~/Documents/David/Code/skills) and push it.
---

# improve-skills — every lesson lands in a skill

David's skills live in `~/Documents/David/Code/skills` (GitHub `deputychinh/Skills`);
`~/.claude/skills/<name>` are symlinks into it, so an edit is live in the next session. Kiln is the
testbed: watch how the skills behave there.

## Steps

1. **Collect lessons** from this piece of work: review findings that a checklist would have caught,
   gates that failed late, things David had to point out, time sinks (review rounds beyond the cap),
   steps a skill told you to do that did not help.
2. **Classify each**:
   - repo-specific → that repo's `CLAUDE.md` or docs;
   - how David wants to work → memory (feedback type);
   - true for any project → the skill that owns that phase (`discover`, `spec`, `architect`,
     `shape-plan`, `deliver-loop`, `verify-app`, `demo`, `ship`, `init-project`), as one line with the
     project and item that taught it: "… (KILN-26: missing `Idempotency-Key` in CORS)".
3. **Edit the skill, not a copy**; keep `SKILL.md` ≤ 500 lines — move detail into the skill's references folder.
   Replace or delete lines a lesson proves wrong instead of piling on. Descriptions say only _when_ to
   use the skill, never summarise the workflow (agents follow the summary and skip the body).
4. **New skill** only when a lesson is a whole new phase or task family: `skills/<kebab-name>/SKILL.md`,
   add its scope to `commitlint.config.mjs`, a row in the README table.
5. **Prove and ship**: `make link && make lint` in the skills repo; for a behaviour change, describe a
   scenario where the old text led astray and check the new text handles it. Commit
   (`feat(<skill>): …` / `fix(<skill>): …`), update `CHANGELOG.md`, push to `origin main`.
6. Tell David in one or two lines what changed in which skill.

Sources: Anthropic Agent Skills best practices (concise, progressive disclosure, evals first);
superpowers `writing-skills`; Scrum Guide 2020 retrospective (one or two concrete improvements per cycle).
