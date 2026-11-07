---
name: deliver-loop
description: Builds a repo's backlog item by item without asking, shipping each only after an independent 10-point review scores it 9 or more. Use when a repo has a backlog (`docs/backlog.md`) and David says "/deliver-loop", "làm tiếp", "tự làm", "continue the plan" or "work autonomously", when `ship` reaches its build phase, or when a repo's CLAUDE.md says to use it. Not for a request that has no backlog yet — use `ship`.
---

# deliver-loop

The owner does not have time to chat. Work the backlog in cycles, prove every claim, grade your own
work against an explicit 10-point rubric with an **independent reviewer**, and only ship ≥ 9/10.
Ask only for what nobody but the owner can supply (secrets, paid accounts, legal/business rules,
destructive or outward-facing actions not yet authorised). Everything else: decide, record the
decision, move on.

When a request arrives without a backlog, start with `ship` instead: it writes the brief, spec, design and plan, fills the backlog, runs this loop, then `verify-app` and `demo`. Run this loop in the main conversation, not inside a subagent: step 5 must spawn the reviewer.

When the item comes from a `ship` delivery (`docs/delivery/<NNN-slug>/`), the story links the spec's AC ids and `design.md` instead of rewriting them, and needs no web references of its own.

`<PREFIX>` is the backlog id prefix of the repo (e.g. `KILN`, `AEC`). Read first, every cycle: the repo's `CLAUDE.md`, `docs/plan.md`, `docs/backlog.md`,
`docs/conventions.md`, `docs/testing.md`. Standards live in `~/.claude/skills/init-project/references/`
(cite them, do not quote from memory) and the rubric in `rubric.md` next to this file.

## One cycle = one backlog item

| Step      | Role                            | Output                                                                                                                                                                                                                                                                                                                 | Done when                                                                                                               |
| --------- | ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| 0 Pick    | lead                            | next `todo` item in release order from `docs/backlog.md`; mark it `doing`                                                                                                                                                                                                                                              | one item, small enough for one cycle (split it if not)                                                                  |
| 1 Analyse | BA                              | `docs/stories/<PREFIX>-<n>.md` from `templates/story.md`: user story, INVEST check, Given/When/Then acceptance criteria (incl. negative and edge cases), non-functional requirements, out of scope, 2–4 cited references (standards or how leading tools solve it, via web search when the repo references are silent) | every AC is testable and has an id `AC1…`                                                                               |
| 2 Design  | architect / designer            | API contract (OpenAPI change), data change (migration plan), UI states per window size class, new ADR only if a decision changes; update `docs/architecture`                                                                                                                                                           | the story's "Design" section is filled; no open questions                                                               |
| 3 Build   | developer                       | tests first from the ACs (unit → API/component → e2e), then the code; conventions and lint 0                                                                                                                                                                                                                           | every AC maps to at least one test that failed before the code                                                          |
| 4 Verify  | QA                              | run `make ci`, `make e2e`; screenshots at 390 px and 1280 px for UI (look at them); exploratory checks listed in the story (boundary values, equivalence classes, error paths, keyboard only, slow network, empty data); fill the AC → test traceability table                                                         | all green, every AC traced, defects found are fixed or filed                                                            |
| 5 Review  | independent reviewer (subagent) | score 0–10 with `rubric.md` from the diff + story, findings ranked                                                                                                                                                                                                                                                     | reviewer did not see your own score first                                                                               |
| 6 Improve | developer                       | fix findings; re-run step 4; re-review                                                                                                                                                                                                                                                                                 | score ≥ 9.0 and no criterion at 0; at most 3 improve rounds, then file the rest as `<PREFIX>-<n>` debt items and say so |
| 7 Ship    | release                         | CHANGELOG `[Unreleased]`, backlog `done`, story score recorded; Conventional Commit(s) with `Refs: <PREFIX>-<n>`; push when `origin` exists (else note "local only"); at a release boundary: `chore(release): v0.x.0`, tag, push tag                                                                                   | `git status` clean, `origin/main` = `HEAD` (when there is a remote)                                                     |
| 8 Retro   | lead                            | one line per lesson: repo-specific → `CLAUDE.md`/docs; cross-repo → the relevant skill's gotchas; owner preference → memory                                                                                                                                                                                            | written, then go to step 0                                                                                              |

### Self-check before asking for review (end of step 4)

Round-one reviews of KILN-2 scored 6.5 for things a checklist catches. The core list below applies to
every item; `references/gotchas.md` holds the rest by topic (concurrency, workers, media, browser) —
read the matching section before step 3.

- Chain every step and the gate into the commit by exit code: `python3 edit.py && make ci && git commit …`; never judge a gate from filtered output (`| tail` hides failures).
- Every commit carries its own tests and doc updates (CHANGELOG `[Unreleased]`, story QA table, architecture); a fix round that changes behaviour updates them too.
- Every claim in the story is backed by a test; build the QA table and test counts from the runner (`--collect-only`, grep), never from memory.
- Scripted edits assert that every replacement matched.
- Run the app the way the owner will before review: README quick start in a fresh shell, the printed dev URL, the feature clicked through in a real browser (curl never sends a CORS preflight).
- Race and failure claims need a run against the real dependency and a deterministic interleaving; fakes and sleeps hide bugs.
- Split a cycle's first commit by part (ui / feature / e2e / docs); `git diff --cached --stat` shows only files the task touched; run formatters from the repo root.
- Never hand-write crypto or a protocol to get one missing knob: subclass the library and record an ADR.

### Independent review (step 5)

Spawn one reviewer subagent (general-purpose) per cycle; resume the same reviewer for fix rounds,
but run the **final gate with a fresh reviewer** that has not seen earlier rounds (in KILN-2 the
same reviewer plateaued at 8.5 while a fresh one found schema-drift and invisible-name gaps).
Ask reviewers to run at least one mutation per critical rule. Give it: the story file path, `git diff <base>..HEAD`
(or the commit range), the rubric path, the references folder, and the commands to run. Do **not**
give it your score or your opinion. Ask for: per-criterion score with evidence (file:line or command
output), the three most valuable fixes, and anything that violates the repo's CLAUDE.md. Treat its
findings as claims: verify each before acting; reject with a reason when wrong.

### Scoring rules

- 10 criteria × 1 point (half points allowed) — see `rubric.md`.
- Ship gate: total ≥ 9.0, **requirements fit = 1**, **security ≥ 0.5**, nothing at 0.
- Criteria that do not apply (e.g. accessibility for a pure migration) score 1 only with a one-line reason.
- Record the final score table in the story file; the commit body ends with `Score: 9.5/10`.

## Loop control

- Keep cycling until the current release is done — `docs/delivery/<NNN-slug>/plan.md` when a `ship` delivery is open, else `docs/plan.md` — then cut the release and continue with the next.
- Stop and report only when: a blocker needs the owner, a gate cannot go green after 3 honest attempts (say exactly what fails), or the plan is finished.
- Between cycles, report in ≤ 5 lines: item, score, commits, **the URL or command to see it**, what is next. No questions unless blocked.
- Working software over paperwork: a cycle is not done until the change runs from the README quick start on the owner's machine (fresh shell, the URL the dev server prints, a click through the new feature, a screenshot looked at). Keep stories, ADRs and changelog entries short — the size of the change, not of the review history.
- The 3-improve-round cap is hard: after round 3 below 9, file the rest as debt, record the score and move on (or stop if it is a safety risk). KILN-28 ran five rounds and still waited on the owner.
- Fix small obvious defects found on the way (e.g. while showing the app) at once with a test, commit and push, then report; do not propose them first.
- For multi-turn autonomy the owner can run `/loop /deliver-loop` (self-paced); each wake-up runs one or more cycles.
- Context hygiene: delegate wide searches and the review to subagents; keep only conclusions.

## Industry baselines this loop enforces

| Area            | Standard                                                                                                                      | Where it shows up   |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| Requirements    | INVEST, Given/When/Then (BDD), BABOK elicitation                                                                              | step 1              |
| Product quality | ISO/IEC 25010:2023 characteristics                                                                                            | rubric criteria 1–8 |
| Test design     | ISTQB techniques: equivalence partitioning, boundary values, decision tables, state transitions, error guessing; test pyramid | steps 3–4           |
| Security        | OWASP Top 10:2025, ASVS 5.0 L1, threat model in `docs/security.md`                                                            | rubric 4            |
| UX              | Nielsen's 10 heuristics, Material 3 adaptive layout, four states per view                                                     | rubric 6            |
| Accessibility   | WCAG 2.2 AA (axe in e2e + keyboard pass)                                                                                      | rubric 7            |
| Performance     | Core Web Vitals (LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1), no N+1, bounded queries                                               | rubric 8            |
| API             | Zalando guidelines, RFC 9457, cursor pagination, idempotency                                                                  | steps 2–3           |
| Delivery        | trunk-based, small batches, DORA four keys, Conventional Commits, Keep a Changelog, SemVer                                    | steps 7–8           |

## Do not

- Grade yourself and skip the independent reviewer; ship below 9; hide a red gate.
- Claim a UI works without looking at a screenshot or an e2e run.
- Expand scope inside a cycle: new ideas become backlog items.
- Push secrets, `.env`, client assets; force-push or rewrite `main`.
- Stop to ask "should I continue?" — continuing is the instruction.
