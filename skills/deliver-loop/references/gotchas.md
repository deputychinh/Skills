# deliver-loop gotchas

Lessons from real cycles (mostly Kiln), one line each with the item that taught it. Read the
section that matches the item before step 3; the core list in `SKILL.md` applies to every item.

## Contents

- [Gates, commits and docs](#gates-commits-and-docs)
- [Testing technique](#testing-technique)
- [Concurrency and reliability](#concurrency-and-reliability)
- [Input, media and security](#input-media-and-security)
- [Workers and processes](#workers-and-processes)
- [Browser, UI and e2e](#browser-ui-and-e2e)
- [Architecture](#architecture)

## Gates, commits and docs

- Chain every step that must succeed — doc-editing scripts included — into the commit command (`python3 edit.py && make ci && git commit …`); in KILN-4 a doc script that stopped early still let the code commit go out without its docs.
- Chain the gate and the commit so a red gate cannot commit: `make ci && git add … && git commit …` (in KILN-4 an `echo ci=$?` between them let a red run commit; the tree happened to be green after lint-staged formatted it).
- Gate before commit by exit code, never by eyeballing filtered output: `make lint | tail -1` hides a failure (the pipe returns tail's status), and KILN-26 pushed a red lint that way. Chain `make lint && make test && git commit`, or check `$?` explicitly.
- Every fix round that changes behaviour updates the CHANGELOG entry and the story QA table in the same commit (KILN-21 lost a point when only a "review changes" section was added).
- CHANGELOG `[Unreleased]` has an entry for this item; the story's Design and QA sections match the code that was actually written (names, paths, counts).
- Every commit carries its own tests and doc updates (CHANGELOG, story, architecture). Splitting code and docs into later commits cost a delivery half-point on two items in a row.
- Docs that mention the touched area (README, architecture, security, testing, conventions) were re-read and updated. Markdown tables are re-aligned by Prettier (cells padded with spaces), so patch them by line prefix plus a distinctive substring, with `\s*` around `|`, never by exact string.
- Every claim in the story ("all 16 pairs", "N tests") is backed by a test that asserts it.
- Build the story's QA table from the real test names (grep them), never from memory: renamed and deleted tests made a reviewer drop the docs point.
- Take test counts for the story from `pytest --collect-only` / the runner, never by hand.
- Scripted doc/code edits must assert that every replacement matched (a silent no-op shipped a false test count in KILN-2).
- `git ls-files` has no generated or binary artefacts (`.coverage`, `dist/`, screenshots outside `docs/`).
- Split the first commit of a cycle by part (ui components / app feature / e2e / docs): a 91-file first commit cost a delivery half-point that no later commit can win back, because `main` is never rewritten.
- Run Prettier (and other formatters) from the repo root: from a subfolder it does not find the root `.prettierignore` and reformats generated files (an OpenAPI client grew a 1,900-line diff). Before committing, check `git diff --cached --stat` for files the task did not touch. Prettier reads `.prettierignore` from the working directory, so formatting inside `apps/web` rewrote the generated API schema twice (or give each app its own `.prettierignore`).

## Testing technique

- A test derived from the table it checks proves nothing: pin expected tables literally and run one mutation by hand.
- Run Python mutants with `PYTHONDONTWRITEBYTECODE=1` (or clear `__pycache__`): an edit restored within the same second can leave a stale `.pyc` that fakes a kill.
- Mutation runners need a per-mutant timeout and must restore the file in `finally`: a mutant that makes a test hang otherwise leaves the mutated file in the tree. Give the suite a per-test timeout too (`pytest-timeout`).
- Logging and error-mapping code is code: test handlers with the real exception classes of each dependency (botocore timeouts carry `response=None`), and keep library details out of the boundary (attach a `cause_code` in the adapter).
- Test an entry point the way it is really started (`python -m pkg` as a subprocess), not only by importing `main`: a `spawn` child cannot import from `__main__`, and only the e2e caught it.
- Before changing a shared component to fix a symptom seen in a story or test, reproduce the root cause in a real browser; KILN-7 shipped and then reverted an "image failed before React listened" fix whose symptom came from a bad sample (data URL). Make test fixtures behave like production inputs.

## Concurrency and reliability

- Concurrency: every read-modify-write is a lock or a compare-and-set, with a two-thread test.
- Fakes hide concurrency bugs: every race claim needs one run against the real dependency (KILN-3: 14.5 % of concurrent completions failed on SeaweedFS, 0 % on the fake).
- Prove a race fix with a deterministic interleaving (open transactions, or a wrapper that holds the window open after the write), never with sleep-then-check. Before relying on a database guard during a lock wait, test it: Postgres re-checks a waiting UPDATE only when the row changed.
- Every write that acts on something it read earlier (reaping "exhausted" jobs, expiring "stale" uploads) must re-check that condition in the guarded write itself; a read-then-write gap is a race even when each statement is guarded.
- Cleanup racing in-flight work (an expiry vs a server-side copy): make whichever side finishes last remove the garbage, and test both orders. Fakes must be able to land a copy after its source was deleted, as real S3 can; a fake that copies atomically hides the leak.
- A sweep's batch must count only the items it acts on, plus a separate scan cap: counting skipped items toward the batch lets a run stall forever behind keys it must keep.
- Stability wrappers (circuit breakers, rate limits) must judge the unit that does I/O (a page fetch), never the items read from it, and must ignore verdicts from calls that started before the state last changed (tickets with a generation). Test them with many threads, not only a fake clock.
- Anything that reuses or caches (kept signed URLs, memoised data) needs a failure path that is never reused, and a test that fails the cached thing once: the "keep the still-valid URL" optimisation kept the URL that had just failed.
- Throttle or batch per shared resource, not per item: a per-card refresh multiplied into cards × pages requests in an outage. A refresh asked for while a fetch is in flight must wait, not use up the window.
- Timing and liveness work (watchdogs, leases, supervisors): before coding, write the invariant as arithmetic over the constants (every backstop < what the lease has left when the heartbeat freezes at _any_ moment: during work, a claim, a stop) and list every freeze point; test the production wiring end to end (supervisor → child → worker → watchdog), not only the parts. KILN-28 took five reviews because each round found one more window (GIL, frozen heartbeat, stop path, claim → watch).

## Input, media and security

- Text input: reject Unicode Cc, Cs (lone surrogates crash the DB driver), Zl, Zp and all of Cf except ZWNJ/ZWJ (Persian, Indic, emoji need them), plus invisible fillers (U+034F, U+115F, U+1160, U+2800, U+3164, U+FFA0); reject dot-only file names; cap every decoded token's length. Accept-tests in several scripts are mandatory; tag characters matter because names reach AI prompts.
- Untrusted media: measure peak memory per accepted format at its limit in a fresh subprocess (ru_maxrss of a warm process lies), and bound both pixels and file size (Pillow reads whole WebP/animated files); pin it with a subprocess regression test.
- Parsing untrusted complex files (3D models, archives, documents): design the sandbox first — a spawned child with a wall-clock kill, its own CPU limit, an address-space limit (Linux), exit on parent death — then add bounds checks for speed. Bounds checks alone were whack-a-mole: KILN-5 took six reviews, each finding a new bomb class (node DAGs, vertex amplification, chunk counts, primitive lists). Record it in an ADR in the same commit.
- Never hand-write crypto or a signature scheme to get one missing knob (KILN-27: SigV4 at a chosen time): subclass the library's implementation and override the narrowest hook, cross-check against the library, and record it in an ADR. Hand-written SigV4 diverged silently for endpoint shapes the library accepts.

## Workers and processes

- Queue workers: guard every job update with the claim (status + attempt), use the database clock for leases, give the loop a catch-all, and test SIGKILL, poison jobs and outages against the real database.
- Process supervision: a child must watch its parent (or it outlives a SIGKILLed supervisor), an unrequested clean exit is a failure to restart, backoff needs jitter and a reset after healthy uptime, and process tests must run in their own process group killed in `finally`.

## Browser, UI and e2e

- Run the app the way the owner will before every review and at every release: README quick start in a fresh shell, the printed dev URL (`localhost`, not only `127.0.0.1`), the new feature clicked through. e2e on `127.0.0.1:4173` passed for all of v0.1 while `make web`'s `localhost:5173` could not reach the API (CORS).
- Browser features that call the API cross-origin: run the real-browser e2e before the first review — curl and the CLI never send a CORS preflight, so a missing allowed header (KILN-26: `Idempotency-Key`) only shows up there. Live regions must queue outcomes, not replace them, or a batch of failures announces only the last.
- UI e2e must cover every state's way out on every size class: a CSS rule that hid the back link on wide screens left the not-found state with no action, and only the desktop e2e run caught it.
- Cache-hit evidence in e2e: resource timing `transferSize` is always 0 for cross-origin resources without `Timing-Allow-Origin`; ask the DevTools protocol (`Network.requestServedFromCache`) and prove the test can fail by disabling the cache.
- Storybook e2e: `storyFinished.status` reflects only reporters (a11y), not `play`; listen for `playFunctionThrewException`. Docgen (`react-docgen-typescript`) skips undocumented `children` and inherited native props, so set `skipChildrenPropWithoutDoc: false` plus a prop filter, and assert that every docs table row has a description. Never `reuseExistingServer` against a build the run did not make, and bound every per-story wait.

## Architecture

- The domain imports no framework (a test asserts it); errors raised by the domain live in a framework-free module.
