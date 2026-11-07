# Debugging — reproduce, shrink, find the cause, prove the fix

Notes are marked "Verified on 2026-11-07 against <URL>" or "(memory)".

## Contents

1. [A method, not a hunch](#1-a-method-not-a-hunch)
2. [Reproducing by environment](#2-reproducing-by-environment)
3. [Shrinking the case](#3-shrinking-the-case)
4. [Reading logs and traces](#4-reading-logs-and-traces)
5. [git bisect run](#5-git-bisect-run)
6. [Characterisation tests around legacy code](#6-characterisation-tests-around-legacy-code)
7. [Flaky tests](#7-flaky-tests)
8. [Regression tests that prove something](#8-regression-tests-that-prove-something)
9. [Confirming in the field](#9-confirming-in-the-field)

## 1. A method, not a hunch

Zeller's _Why Programs Fail_ frames debugging as a sequence: track the problem, reproduce it,
automate the test, find possible infection origins, focus on the most likely, isolate the infection
chain, correct the defect (the "TRAFFIC" steps). A failure is the visible end of a chain that started
at a defect; the job is to walk back to the defect, not patch the failure. (memory)

The scientific method makes that walk reliable: observe, form one hypothesis, predict what an
experiment will show, run it, accept or reject, and keep a written log of each round so you never
re-test a rejected idea. (memory: Zeller)

## 2. Reproducing by environment

| Report says                | Reproduce with                                                                                                               |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Safari / iOS               | Playwright `webkit` project and an iPhone device profile; real Safari via `safaridriver --enable` if WebKit does not show it |
| Firefox                    | Playwright `firefox` project                                                                                                 |
| Mobile / narrow            | the reported viewport (e.g. 390 px) and touch                                                                                |
| Slow network               | DevTools or Playwright network throttling; offline toggles                                                                   |
| A locale or time zone      | `TZ=…`, `LANG=…`, Playwright `locale` / `timezoneId`                                                                         |
| A specific account or role | a test user with the same role and data shape                                                                                |
| An old version             | `git checkout <tag>` and the README quick start in a fresh directory                                                         |
| Production only            | replay the request from logs or the trace against staging or a local build with a copy of the relevant (anonymised) data     |

Many "cannot reproduce" reports are environment gaps: time zone around midnight, a locale's decimal
separator, an engine-specific API, a cached old bundle, an account with an unusual role. (memory)

## 3. Shrinking the case

- Remove one thing at a time (step, field, record, header, config flag); keep the removal if the
  failure stays. Stop when every remaining element is needed.
- Delta debugging (ddmin) automates this by splitting the input and testing halves, then finer
  partitions, to reach a 1-minimal failing input. Property-based testing libraries (fast-check for
  TypeScript, Hypothesis for Python) shrink failing inputs automatically. (memory: Zeller)
- The minimal case becomes the regression test, so a small case also means a fast test.

## 4. Reading logs and traces

- Start from the user's reference (request id in the error message) or the error-tracker issue: the
  first-seen release, the stack trace with source maps, breadcrumbs (actions before the error), and
  suspect commits. Release-aware trackers show the release that introduced an issue. Verified on
  2026-11-07 against https://docs.sentry.io/product/releases/
- From the request id, find the trace: the waterfall shows which span failed or was slow, and the
  attributes (route, status, database statement) show what it was doing. Logs with the same trace id
  give the detail.
- White-box signals reveal problems hidden by retries; they are for diagnosis, not paging. Verified on
  2026-11-07 against https://sre.google/sre-book/monitoring-distributed-systems/
- Compare a failing request with a succeeding one on the same route; the difference is a hypothesis.

## 5. git bisect run

```sh
git bisect start <bad> <good>        # e.g. HEAD v1.4.0
git bisect run ./scripts/repro.sh    # 0 = good, 1–127 except 125 = bad, 125 = skip
git bisect reset
```

Exit 125 marks an untestable commit (it does not build) as skipped; codes above 127 abort the bisect.
Verified on 2026-11-07 against https://git-scm.com/docs/git-bisect

A good `repro.sh`:

- Builds only what it needs and installs dependencies for that commit (`npm ci` / `pip install`),
  exiting 125 when the build itself fails, so unrelated breakage is skipped, not blamed.
- Runs the minimal failing test, copied in from outside the repo (the test did not exist in old
  commits): e.g. `cp /path/outside/repro.test.ts tests/ && npx vitest run tests/repro.test.ts`.
- Is deterministic; a flaky check makes bisect point at a random commit.

## 6. Characterisation tests around legacy code

Michael Feathers (_Working Effectively with Legacy Code_): a characterisation test records what the
code actually does now, not what it should do. Write a test with a guessed assertion, let it fail, and
change the assertion to the actual output; repeat for the inputs around the change. Then change the
code: any unintended behaviour change shows up as a failing characterisation test. Find "seams"
(places where behaviour can be substituted without editing the code there) to get the code under test.
(memory)

Use them when the fix touches code with no tests or behaviour nobody can describe. Snapshot or
approval tests (golden files) are a quick way to pin large outputs; review the snapshot, do not
accept it blindly.

## 7. Flaky tests

- Measure first: run the test 50–100 times (`npx playwright test --repeat-each=50`, `npx vitest run`
  in a loop, `pytest --count=50` with pytest-repeat) with the CI's worker count. A rate turns
  "sometimes" into a number you can show is fixed. (memory)
- Usual causes: shared state between tests (database rows, globals, files), order dependence, waiting
  on time instead of a condition, real clock or time zone, real network, animation, unseeded random
  data, resource limits under parallel runs.
- Fixes: isolate data per test, wait on observable state (web-first assertions, `expect.poll`), fake
  the clock, seed randomness, stub external calls. A retry is a diagnostic, not a fix; a quarantined
  test gets a backlog item with its failure rate.

## 8. Regression tests that prove something

- Write it before the fix and watch it fail with the bug's symptom (the right assertion, not a setup
  error). A test that would have passed before the fix proves nothing.
- Name it after the behaviour, not the ticket: "keeps the draft when the save request times out".
- Test at the level of the cause; add one e2e in the reported engine when the bug was only visible
  there (CORS, focus, layout, engine-specific APIs).
- Guard tests for the unchanged behaviour from the report keep the fix from breaking neighbours.

## 9. Confirming in the field

- After deploy, query the error tracker or logs for the signature filtered to the new release, over a
  window long enough to have shown it before (compare the old release's rate over the same window).
- Resolve the issue in the tracker "in next release" where the tool supports it, so a recurrence
  reopens it as a regression. (memory)
- If the signature persists, the fix was for a different cause: reopen the item with the new evidence.
