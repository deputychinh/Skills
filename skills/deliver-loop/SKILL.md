---
name: deliver-loop
description: Autonomous delivery loop for David's repos — pick the next backlog item and run BA → design → TDD code → QA → independent 10-point review (ISO/IEC 25010 + OWASP ASVS + WCAG 2.2 + Nielsen + DORA) → improve until ≥ 9/10 → commit + push → retro, then the next item, without asking. Trigger on "/deliver-loop", "làm tiếp", "tự làm", "tự test", "tự cải thiện", "làm việc tuần hoàn", "continue the plan", "keep going", "work autonomously", or when a repo's CLAUDE.md says to use it.
---

# deliver-loop

The owner does not have time to chat. Work the backlog in cycles, prove every claim, grade your own
work against an explicit 10-point rubric with an **independent reviewer**, and only ship ≥ 9/10.
Ask only for what nobody but the owner can supply (secrets, paid accounts, legal/business rules,
destructive or outward-facing actions not yet authorised). Everything else: decide, record the
decision, move on.

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
| 7 Ship    | release                         | CHANGELOG `[Unreleased]`, backlog `done`, story score recorded; Conventional Commit(s) with `Refs: <PREFIX>-<n>`; push; at a release boundary: `chore(release): v0.x.0`, tag, push tag                                                                                                                                 | `git status` clean, `origin/main` = `HEAD`                                                                              |
| 8 Retro   | lead                            | one line per lesson: repo-specific → `CLAUDE.md`/docs; cross-repo → the relevant skill's gotchas; owner preference → memory                                                                                                                                                                                            | written, then go to step 0                                                                                              |

### Self-check before asking for review (end of step 4)

Round-one reviews of KILN-2 scored 6.5 for things a checklist catches; run it every time:

- Chain every step that must succeed — doc-editing scripts included — into the commit command (`python3 edit.py && make ci && git commit …`); in KILN-4 a doc script that stopped early still let the code commit go out without its docs.
- Chain the gate and the commit so a red gate cannot commit: `make ci && git add … && git commit …` (in KILN-4 an `echo ci=$?` between them let a red run commit; the tree happened to be green after lint-staged formatted it).
- Every fix round that changes behaviour updates the CHANGELOG entry and the story QA table in the same commit (KILN-21 lost a point when only a "review changes" section was added).
- CHANGELOG `[Unreleased]` has an entry for this item; the story's Design and QA sections match the code that was actually written (names, paths, counts).
- Every claim in the story ("all 16 pairs", "N tests") is backed by a test that asserts it.
- `git ls-files` has no generated or binary artefacts (`.coverage`, `dist/`, screenshots outside `docs/`).
- The domain imports no framework (a test asserts it); errors raised by the domain live in a framework-free module.
- Concurrency: every read-modify-write is a lock or a compare-and-set, with a two-thread test.
- Text input: reject Unicode Cc, Cs (lone surrogates crash the DB driver), Zl, Zp and all of Cf except ZWNJ/ZWJ (Persian, Indic, emoji need them), plus invisible fillers (U+034F, U+115F, U+1160, U+2800, U+3164, U+FFA0); reject dot-only file names; cap every decoded token's length. Accept-tests in several scripts are mandatory; tag characters matter because names reach AI prompts.
- Scripted doc/code edits must assert that every replacement matched (a silent no-op shipped a false test count in KILN-2).
- Logging and error-mapping code is code: test handlers with the real exception classes of each dependency (botocore timeouts carry `response=None`), and keep library details out of the boundary (attach a `cause_code` in the adapter).
- Fakes hide concurrency bugs: every race claim needs one run against the real dependency (KILN-3: 14.5 % of concurrent completions failed on SeaweedFS, 0 % on the fake).
- Run Python mutants with `PYTHONDONTWRITEBYTECODE=1` (or clear `__pycache__`): an edit restored within the same second can leave a stale `.pyc` that fakes a kill.
- Untrusted media: measure peak memory per accepted format at its limit in a fresh subprocess (ru_maxrss of a warm process lies), and bound both pixels and file size (Pillow reads whole WebP/animated files); pin it with a subprocess regression test.
- Queue workers: guard every job update with the claim (status + attempt), use the database clock for leases, give the loop a catch-all, and test SIGKILL, poison jobs and outages against the real database.
- Run Prettier (and other formatters) from the repo root: from a subfolder it does not find the root `.prettierignore` and reformats generated files (an OpenAPI client grew a 1,900-line diff). Before committing, check `git diff --cached --stat` for files the task did not touch.
- UI e2e must cover every state's way out on every size class: a CSS rule that hid the back link on wide screens left the not-found state with no action, and only the desktop e2e run caught it.
- Split the first commit of a cycle by part (ui components / app feature / e2e / docs): a 91-file first commit cost a delivery half-point that no later commit can win back, because `main` is never rewritten.
- Anything that reuses or caches (kept signed URLs, memoised data) needs a failure path that is never reused, and a test that fails the cached thing once: the "keep the still-valid URL" optimisation kept the URL that had just failed.
- Throttle or batch per shared resource, not per item: a per-card refresh multiplied into cards × pages requests in an outage. A refresh asked for while a fetch is in flight must wait, not use up the window.
- Build the story's QA table from the real test names (grep them), never from memory: renamed and deleted tests made a reviewer drop the docs point.
- Cleanup racing in-flight work (an expiry vs a server-side copy): make whichever side finishes last remove the garbage, and test both orders. Fakes must be able to land a copy after its source was deleted, as real S3 can; a fake that copies atomically hides the leak.
- A sweep's batch must count only the items it acts on, plus a separate scan cap: counting skipped items toward the batch lets a run stall forever behind keys it must keep.
- Every commit carries its own tests and doc updates (CHANGELOG, story, architecture). Splitting code and docs into later commits cost a delivery half-point on two items in a row.
- Stability wrappers (circuit breakers, rate limits) must judge the unit that does I/O (a page fetch), never the items read from it, and must ignore verdicts from calls that started before the state last changed (tickets with a generation). Test them with many threads, not only a fake clock.
- Every write that acts on something it read earlier (reaping "exhausted" jobs, expiring "stale" uploads) must re-check that condition in the guarded write itself; a read-then-write gap is a race even when each statement is guarded.
- Prove a race fix with a deterministic interleaving (open transactions, or a wrapper that holds the window open after the write), never with sleep-then-check. Before relying on a database guard during a lock wait, test it: Postgres re-checks a waiting UPDATE only when the row changed.
- Test an entry point the way it is really started (`python -m pkg` as a subprocess), not only by importing `main`: a `spawn` child cannot import from `__main__`, and only the e2e caught it.
- Mutation runners need a per-mutant timeout and must restore the file in `finally`: a mutant that makes a test hang otherwise leaves the mutated file in the tree. Give the suite a per-test timeout too (`pytest-timeout`).
- Process supervision: a child must watch its parent (or it outlives a SIGKILLed supervisor), an unrequested clean exit is a failure to restart, backoff needs jitter and a reset after healthy uptime, and process tests must run in their own process group killed in `finally`.
- Parsing untrusted complex files (3D models, archives, documents): design the sandbox first — a spawned child with a wall-clock kill, its own CPU limit, an address-space limit (Linux), exit on parent death — then add bounds checks for speed. Bounds checks alone were whack-a-mole: KILN-5 took six reviews, each finding a new bomb class (node DAGs, vertex amplification, chunk counts, primitive lists). Record it in an ADR in the same commit.
- A test derived from the table it checks proves nothing: pin expected tables literally and run one mutation by hand.
- Docs that mention the touched area (README, architecture, security, testing, conventions) were re-read and updated. Markdown tables are re-aligned by Prettier (cells padded with spaces), so patch them by line prefix plus a distinctive substring, with `\s*` around `|`, never by exact string.
- Take test counts for the story from `pytest --collect-only` / the runner, never by hand.
- Before changing a shared component to fix a symptom seen in a story or test, reproduce the root cause in a real browser; KILN-7 shipped and then reverted an "image failed before React listened" fix whose symptom came from a bad sample (data URL). Make test fixtures behave like production inputs.
- Run the app the way the owner will before every review and at every release: README quick start in a fresh shell, the printed dev URL (`localhost`, not only `127.0.0.1`), the new feature clicked through. e2e on `127.0.0.1:4173` passed for all of v0.1 while `make web`'s `localhost:5173` could not reach the API (CORS).
- Browser features that call the API cross-origin: run the real-browser e2e before the first review — curl and the CLI never send a CORS preflight, so a missing allowed header (KILN-26: `Idempotency-Key`) only shows up there. Live regions must queue outcomes, not replace them, or a batch of failures announces only the last.
- Timing and liveness work (watchdogs, leases, supervisors): before coding, write the invariant as arithmetic over the constants (every backstop < what the lease has left when the heartbeat freezes at _any_ moment: during work, a claim, a stop) and list every freeze point; test the production wiring end to end (supervisor → child → worker → watchdog), not only the parts. KILN-28 took five reviews because each round found one more window (GIL, frozen heartbeat, stop path, claim → watch).
- Never hand-write crypto or a signature scheme to get one missing knob (KILN-27: SigV4 at a chosen time): subclass the library's implementation and override the narrowest hook, cross-check against the library, and record it in an ADR. Hand-written SigV4 diverged silently for endpoint shapes the library accepts.
- Cache-hit evidence in e2e: resource timing `transferSize` is always 0 for cross-origin resources without `Timing-Allow-Origin`; ask the DevTools protocol (`Network.requestServedFromCache`) and prove the test can fail by disabling the cache.
- Gate before commit by exit code, never by eyeballing filtered output: `make lint | tail -1` hides a failure (the pipe returns tail's status), and KILN-26 pushed a red lint that way. Chain `make lint && make test && git commit`, or check `$?` explicitly.
- Run Prettier only from the repo root (or give each app its own `.prettierignore`): Prettier reads `.prettierignore` from the working directory, so formatting inside `apps/web` rewrote the generated API schema twice.
- Storybook e2e: `storyFinished.status` reflects only reporters (a11y), not `play`; listen for `playFunctionThrewException`. Docgen (`react-docgen-typescript`) skips undocumented `children` and inherited native props, so set `skipChildrenPropWithoutDoc: false` plus a prop filter, and assert that every docs table row has a description. Never `reuseExistingServer` against a build the run did not make, and bound every per-story wait.

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

- Keep cycling until the current release in `docs/plan.md` is done, then cut the release and continue with the next.
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
