---
name: fix-bug
description: The defect step inside `ship` — for a whole request ("it's broken", "errors went up after the deploy") start with `ship`, which routes here. Use it directly inside a delivery for a bug report, "X does nothing", "it's broken", a crash, a failing or flaky CI test, a production error, a regression after a deploy, or a postmortem's root-cause action — even when the fix looks like one line. Produces a captured report (expected, actual, unchanged behaviour, environment), a reproduction in the reported environment shrunk to a minimal case, the cause found with logs, traces, `git bisect run` or characterisation tests, a regression test that fails first, a fix of the cause, a sweep for the same bug elsewhere, review through `deliver-loop`, and field confirmation that the error signature is gone. `ship` routes bugs here; `monitor` and `release` send defects here.
---

# fix-bug — reproduce, find the cause, prove the fix, confirm it in the field

A bug fixed without a reproduction is a guess, and a guess that passes CI comes back. The order below
exists so that every claim ("this was the cause", "this fixes it", "it is gone in production") is
backed by something that failed before and passes after.

Per the delivery profile (see the repo README): fix and verify without asking; ask the owner only
for what nobody else can answer (production data access, a behaviour change users will notice, a
trade-off between two expected behaviours).

## Before step 1: the ledger and, in production, mitigation first

- **No delivery open?** Open one the way `ship` does: `docs/delivery/<NNN>-<slug>/status.md` from
  `ship`'s template with `Path: Bug` (or `Path: Incident` when production users are affected now).
  The ledger is what makes the work resumable and reviewable; a fix without one loses its why.
- **Users affected in production right now?** Decide mitigation _before_ investigating — roll back
  to the last good release, turn the flag off, or halt the rollout — and write the decision with its
  reason and time under Rulings, even when the decision is "no rollback possible here" (say what
  would be done where it is possible). Mitigation restores users in minutes; a root-cause fix takes
  hours, and users should not wait for it. Then follow `monitor`'s incident path alongside this one.

## Workflow

1. **Capture the report** from `templates/bug-report.md` into the backlog item's story
   (`docs/stories/<PREFIX>-<n>.md`, new item in `docs/backlog.md`): steps, **expected**, **actual**,
   **unchanged** behaviour (what must keep working — it becomes the guard tests), environment (app
   version or commit, browser engine and version, OS, device and window size, locale and time zone,
   account role, data shape, network), frequency, first seen, and links to the error-tracker issue,
   request id or trace. Ask the reporter only for what you cannot find yourself in logs or traces.
2. **Reproduce in the reported environment.** Same engine (a Safari report is reproduced in WebKit,
   and in real Safari if WebKit does not show it), same OS or viewport, same data (a copy or a
   synthetic equivalent — never debug on live user data), same version (check out the reported tag).
   A production error: pull the failing request from logs or the trace, replay it against a local or
   staging build. Flaky test: run it in a loop (`--repeat-each=50`, `pytest --count=50` with
   pytest-repeat), with the CI's parallelism, seed and time zone. No reproduction after a real effort
   → add the logging or tracing that would capture it next time, file what you know, and say so
   instead of guessing a fix.
3. **Shrink the case.** Remove steps, data, inputs and configuration until removing anything more
   makes the failure disappear. A minimal case points at the cause and makes a fast test. Delta
   debugging automates this when inputs are large.
4. **Find the cause.** Work from evidence, one hypothesis at a time, writing each down with how you
   tested it (`references/debugging.md`):
   - Read the error, the stack trace, the logs around the request id and the trace waterfall first.
   - It used to work → `git bisect run` with an automated check (exit 0 good, 1 bad, 125 skip) between
     the last good tag and the bad commit; the first bad commit names the change.
   - Legacy code with no tests → pin current behaviour with characterisation tests before touching it,
     so the fix changes only what you intend.
   - Ask "why" until you reach the defect that, changed, would have prevented it — not the line where
     it surfaced. A `null` crash is often a missing validation upstream.
5. **Write the failing regression test first**, at the lowest level that reproduces it (unit if the
   cause is a function, API or component test if it is a contract, e2e in the reported browser
   engine if it is an interaction). Run it and see it fail for the right reason. Add guard tests for
   the unchanged behaviour.
6. **Fix the cause, not the symptom.** The smallest change that makes the test pass and keeps the
   design honest. Do not widen a `try/except` or add a null check at the crash site if the bad value
   comes from elsewhere — fix where it is produced, and validate at the boundary.
7. **Look for the same bug elsewhere.** Grep for the same pattern (the same call, the same unchecked
   input, the same copy-pasted block), check sibling endpoints and screens, other browsers. Fix them
   in this item or file items with the test case.
8. **Verify, review, ship** through `deliver-loop` steps 4–7 (verify, independent review, improve,
   ship) for this item; its acceptance criteria are the expected and unchanged behaviour. Run
   `verify-app` in the reported environment. The CHANGELOG gets a `Fixed` line in user words.
9. **Confirm in the field.** After the fix deploys (`release`), check in the error tracker or logs
   (`monitor`) that the error signature stops for the new release over a window that would have shown
   it (one day for a daily error), then resolve the issue. If it was a postmortem action, mark it done.
   "Local only": the regression test and `verify-app` are the confirmation; note that.

## Bugs from CI and production

| Source                            | First move                                                                                                                                                               |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Failing test in CI, green locally | match CI: same Node/Python version, `CI=true`, time zone, locale, parallel workers, fresh database; read the CI artefacts (trace, screenshot)                            |
| Flaky test                        | loop it to measure the failure rate; usual causes: shared state between tests, timing (waits on time instead of on a condition), order dependence, real clock or network |
| Production error / new signature  | error-tracker issue → release first seen → request id → trace → replay the request                                                                                       |
| Regression after a deploy         | mitigate first (`release` rollback or flag off), then bisect between the two tags                                                                                        |
| Performance regression            | treat as a bug with a number: `benchmark` reproduces, `cache-optimize` fixes                                                                                             |

## Core checklist

1. The report states expected, actual and unchanged behaviour and the environment.
2. The bug was reproduced in the reported environment before any fix (or the item says it could not
   be, and what logging was added).
3. A regression test failed before the fix and passes after; guard tests cover unchanged behaviour.
4. The cause is named in the story, with the evidence that confirms it (bisect result, trace, test).
5. The same pattern was searched for elsewhere; hits fixed or filed.
6. The item passed `deliver-loop`'s review gate.
7. After deploy, the error signature is gone in the field for the new release.

## Anti-patterns

- Fixing without reproducing ("this is probably it") — the fix may be real and the bug still there.
- Catching and ignoring the exception, or returning a default, so the error disappears from the logs
  and the wrong result reaches the user instead.
- "Works on my machine": closing a report because your browser, data or time zone differs.
- Retrying or adding a sleep to make a flaky test pass; marking it skipped with no item.
- Changing several things at once, so nobody knows which change fixed it.
- A regression test written after the fix that would have passed before it.
- Fixing the symptom at the crash site while the bad value keeps being produced upstream.
- Resolving the error-tracker issue at merge time instead of after it stops in production.

## Evidence before "done"

The bug report, the reproduction (command or test with its failing output), the cause with its
evidence, the regression test failing then passing, the sweep result, the review score, and the
field confirmation (error-tracker or log query for the new release) or "local only". Plus, in
`status.md`: the path, the mitigation ruling (production bugs) recorded before the fix commit, a
post-deploy check (what to look at, at +5 min / +1 h / +24 h, or "local only"), and a short
**Retro**. A production incident also leaves a blameless note from `monitor`'s postmortem template.
These are part of done, not extras — they are what the next person reads.

## References

- `references/debugging.md` — reproducing by environment, shrinking, the scientific method for
  debugging, `git bisect run`, characterisation tests, flaky tests, reading traces, with sources.
- `templates/bug-report.md` — the report and fix record.
