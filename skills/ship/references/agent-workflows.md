# Skill ecosystems and agentic delivery workflows: research notes (Nov 2026)

Paraphrased from sources fetched 2026-11-07; _(secondary)_ marks third-party coverage.

## Contents

[1 Anthropic skills](#1-anthropic-agent-skills-guidance) · [2 Claude Code practices](#2-anthropic-claude-code-best-practices-and-long-running-harnesses) · [3 superpowers](#3-obrasuperpowers) · [4 spec-kit](#4-github-spec-kit) · [5 BMad](#5-bmad-method-v6-stable-v7-alpha) · [6 Kiro](#6-kiro-specs) · [7 Working Backwards](#7-amazon-working-backwards-prfaq-as-agent-skills-community-sources-only--ideas-not-citations) · [Synthesis](#synthesis-phase--best-practice--source)

Versions and task sizes (superpowers' 2–5 minute tasks, BMad v6/V7) were current on 2026-11-07; recheck before relying on them.

> **How this repo uses it.** Adopted: trigger-plus-what descriptions, progressive disclosure, ledgers in files, fresh-evidence verification, capped review loops. **Not adopted:** human approval as a hard gate before code (superpowers brainstorming, the spec row below) — David asked for autonomy, so `ship` records rulings instead and asks only owner-only questions, once, at triage.

## 1. Anthropic: Agent Skills guidance

URLs: https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices · https://code.claude.com/docs/en/skills · https://github.com/anthropics/skills
**Adopt**

- **Frontmatter.** `name`: ≤64 chars, lowercase, digits and hyphens, no "anthropic" or "claude". `description`: ≤1,024 chars, third person, says what the skill does and when to use it. Claude Code cuts `description` + `when_to_use` at 1,536 chars, so lead with the trigger.
- **Claude Code fields.** `disable-model-invocation: true` for phases only you start (deploy, demo); `context: fork` + `agent` to run a phase in a subagent; per-phase `model`/`effort`; `allowed-tools`, `paths`, `$ARGUMENTS`; `` !`cmd` `` injects live state such as the plan file (append `|| true`, since a failing command aborts the skill).
- **Compaction budget.** After a compaction Claude Code re-attaches at most the first 5k tokens of each invoked skill, within about 25k tokens for all skills, filled from the most recently invoked one — the first skill of a long run (the controller) is dropped first, so its state must live in a file it re-reads.
- **Progressive disclosure.** Body under 500 lines; references one level deep, with a table of contents if over 100 lines; scripts are run, not read, so they cost no context. Compaction re-attaches only a skill's first 5k tokens, so put the key rules first.
- **Workflows.** A checklist the agent copies and ticks off; validate → fix → repeat loops; plan file → validate → execute → verify for risky batch work.
- **Evaluations first.** Baseline 3+ scenarios without the skill, write the minimal skill, iterate with an author Claude and a tester Claude, on every model tier you use.
  **Avoid:** vague names, first- or second-person descriptions, nested references, time-sensitive text, and unexplained constants in scripts. The repo's skills are demo material: copy the patterns, not the files.

## 2. Anthropic: Claude Code best practices and long-running harnesses

URLs: https://code.claude.com/docs/en/best-practices · https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents
**Adopt**

- **Interview first.** "Interview me until you could write SPEC.md", then build in a fresh session; the spec is the definition of done.
- **Guidance vs enforcement.** CLAUDE.md and skills are guidance; zero-exception rules belong in hooks or deny rules. A Stop hook exiting with code 2 keeps the agent working until the check passes.
- **Spec-review subagent.** Reviews the diff against the spec for coverage and tests, skips style; then `/verify` _(command name not confirmed in the docs)_ runs the real app.
- **Long-running harness.** An initializer writes `init.sh`, a JSON feature list (all failing), a progress log and a first commit. Each later session does one feature, tests it end to end in a browser, flips only `passes`, and commits. State lives in files and git.
  **Avoid:** ALL-CAPS escalation (use a hook or a shorter file), "loop until done" nagging, calling a feature done on unit tests or curl alone, and letting agents edit the test list.

## 3. obra/superpowers

URL: https://github.com/obra/superpowers (skills/brainstorming, writing-plans, subagent-driven-development, verification-before-completion, writing-skills)
**Adopt**

- **Brainstorming hard gate.** One question at a time; play back in 200–300-word chunks; 2–3 approaches with a recommendation; a dated design doc (intent, goals, non-goals, constraints, choice) that a fresh "builder" subagent reads for gaps. No code or installs until the user approves.
- **Plans for a zero-context builder.** Exact files, signatures and tests; each task the smallest independently rejectable unit with its own test cycle (2–5 min); checkbox steps red → green → commit.
- **Subagent-driven development.** The controller never codes. It dispatches one implementer per task, in sequence, with a brief file, then a reviewer gives two verdicts (spec, quality) and a capped fix loop runs. A `progress.md` ledger plus `git log` survive compaction. It asks the human only about irreversible, security or external actions and logs every other ruling. Model tier scales with risk.
- **Verification before completion.** Run the proving command fresh, read all output, then claim with evidence. "Should" and "probably" are red flags; check subagent work by `git diff`.
- **Trigger-only descriptions** ("Use when…"), never a workflow summary, which agents follow instead of reading the body. Skills are TDD'd with pressure scenarios.
  **Avoid:** parallel implementers on shared code, controllers fixing code themselves, pasting history into prompts, and heavy process on one-line changes.

## 4. GitHub spec-kit

URLs: https://github.com/github/spec-kit · https://raw.githubusercontent.com/github/spec-kit/main/spec-driven.md · templates/commands/*.md
**Adopt**

- **Pipeline.** constitution → specify → clarify → plan → tasks → analyze → implement → converge, writing Markdown into `specs/NNN-branch/` (spec, plan, research, data-model, contracts, quickstart, tasks).
- **Spec = what and why, never how;** gaps marked `[NEEDS CLARIFICATION]`, not guessed.
- **`clarify`:** at most 5 questions, one at a time, ranked by impact × uncertainty, multiple choice or short answer, each written back into the spec.
- **Constitution gates:** test-first, simplicity, no needless abstraction, real dependencies over mocks; violations justified in Complexity Tracking.
- **`analyze`:** read-only cross-check with severities (constitution conflict = CRITICAL). **`checklist`:** "unit tests for English" on the requirements. `[P]` marks parallel tasks.
- **`converge`:** re-reads the artifacts against the code, appends unbuilt work as tasks, loops until "Converged".
  **Avoid:** heavy ceremony for small changes, unread generated docs, and a frozen spec.

## 5. BMad Method (v6 stable, V7 alpha)

URLs: https://github.com/bmad-code-org/BMAD-METHOD · https://docs.bmad-method.org/ · https://docs.bmad-method.org/explanation/sprint-planning/
**Adopt**

- **Scale-adaptive entry.** A vague idea starts at Clarify, a big clear idea at Plan, and a small change goes straight to Build and verify, followed by Learn and adjust. Pick how much process to use at intake.
- **Persona hand-offs, each producing an artifact:** Analyst → brief, PM → PRD, Architect → architecture/ADRs, SM → self-contained story files, Dev → code, QA → tests _(roster partly secondary)_.
- **Readiness gate before coding**, now part of sprint planning; `sprint-status.yaml` is the single progress record and statuses never regress.
  **Avoid:** persona and menu sprawl, YAML ceremony, and an unstable roster (SM and QA reportedly folded into Dev; V7 has breaking changes — _unverified, third-party guides disagree_).

## 6. Kiro specs

URLs: https://kiro.dev/docs/specs/ · https://kiro.dev/docs/specs/feature-specs/
**Adopt**

- **Three files:** `requirements.md` (stories + EARS criteria: "WHEN <event> THE SYSTEM SHALL <response>"), `design.md` (architecture, sequences, errors, test strategy), `tasks.md` (tracked).
- **Choice of path:** requirements-first or design-first, plus a gate-free Quick Spec for well-understood work _(not confirmed in the official docs)_.
- **"Analyze requirements"** checks for ambiguity, conflict and gaps before design starts.
- **Bugfix specs** _(not confirmed in the official docs; adopted as `ship`'s Bug path)_ record current, expected and _unchanged_ behaviour, which serves as a regression guard.
  **Avoid:** IDE lock-in, and EARS for aesthetic wishes it expresses poorly.

## 7. Amazon "Working Backwards" PR/FAQ as agent skills (community sources only — ideas, not citations)

URLs: https://claudskills.com/skills/prfaq/ (borghei/Claude-Skills) · https://claudeskills.info/skills/pmprompt/claude-plugin-product-management/working-backwards/ · https://zff.dev/ric_harvey/ai-skills _(community; no official Anthropic or Amazon skill found)_
**Adopt**

- **Five customer questions first:** who, what problem, what benefit, how do you know, what does the experience look like.
- **A ship-day press release plus FAQs**, which double as the demo script and acceptance narrative.
- **Kill criterion:** if you can't write a credible PR, don't build it.
  **Avoid:** PR/FAQs for internal refactors, and invented metrics.

## Synthesis: phase → best practice → source

| Phase            | Best practice                                                                                                                                           | Source                                                      |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Triage           | Choose how much process to use up front: quick fix, small spec or full pipeline                                                                         | BMad, Kiro Quick Spec                                       |
| Intake           | Ask one question at a time, at most ~5, ranked by impact × uncertainty, multiple choice with a recommended option, and write each answer into the spec  | spec-kit clarify, superpowers, CC best practices            |
| Intake (product) | Write a press release dated on ship day plus an FAQ, which becomes the demo script                                                                      | Working Backwards skills                                    |
| Spec             | State what and why, give acceptance criteria in EARS, list non-goals, mark gaps `[NEEDS CLARIFICATION]`, and get human approval as a hard gate          | spec-kit, Kiro, superpowers                                 |
| Spec quality     | Run "unit tests for English" checklists and a read-only consistency analysis before planning                                                            | spec-kit checklist/analyze, Kiro                            |
| Design/plan      | Map files first, record ADRs, and write a plan for a builder with zero context that names exact files, signatures and tests                             | superpowers writing-plans, BMad Architect                   |
| Task breakdown   | Each task is the smallest unit with its own test cycle that can be rejected alone, with `[P]`/wave markers and story files that stand on their own      | superpowers, spec-kit, Kiro, BMad                           |
| Execution        | Controller + fresh subagent per task in a worktree, TDD, commit per task, model tier by risk                                                            | superpowers SDD, Anthropic harness                          |
| Verification     | Show evidence before any claim, run tests in a real browser end to end, use a Stop hook for checks with no exceptions, and verify subagent work by diff | superpowers, Anthropic harness, CC best practices           |
| Review           | Independent reviewer, two verdicts (spec, quality), capped fix loop, final whole-branch review on the strongest model                                   | superpowers, CC best practices                              |
| State            | JSON feature list (only `passes` changes), `progress.md` ledger, `sprint-status.yaml`, git history                                                      | Anthropic harness, superpowers, BMad                        |
| Escalation       | Ask only about irreversible, security or external actions; log other rulings                                                                            | superpowers SDD, CC best practices                          |
| Demo/hand-off    | Run the app with `/verify`, read the press release back with evidence (screenshots, test output), then offer merge, PR, keep or discard                 | CC best practices, Working Backwards, superpowers finishing |
| Skill authoring  | Trigger-only descriptions, body under 500 lines, references one level deep, scripts for deterministic steps, evals first                                | Anthropic docs, superpowers writing-skills                  |
