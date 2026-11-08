# deliver-loop gotchas

Lessons from real cycles, one line each with the reason it matters. Read the
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

- Never edit an accepted ADR, even one written earlier in the same item once a reviewer has seen it: record the changed decision in a new ADR that supersedes it, and update the links (a reviewer flags the edit as a repo-rule violation).
- Ship a web behaviour change and its e2e update in the same commit, green on the full gate (lint, unit, e2e): a fix pushed before the e2e that checked the old behaviour was updated left `main` red for one commit, and since `main` is never rewritten the delivery point was lost for good.
- Parallel agents (builder, reviewer, another item) must not share one test database: one run dropping or truncating it made the other's unrelated tests fail. Give each its own `*_test` database (e.g. an env override per agent) and rerun a red suite on an isolated database before believing it.
- Chain every step that must succeed — doc-editing scripts included — into the commit command (`python3 edit.py && make ci && git commit …`): a doc script that stops early otherwise still lets the code commit go out without its docs.
- Chain the gate and the commit so a red gate cannot commit: `make ci && git add … && git commit …` — an `echo ci=$?` between them returns 0 and lets a red run commit.
- Gate before commit by exit code, never by eyeballing filtered output: `make lint | tail -1` hides a failure (the pipe returns tail's status), so a red lint goes out looking green. Chain `make lint && make test && git commit`, or check `$?` explicitly.
- Every fix round that changes behaviour updates the CHANGELOG entry and the story QA table in the same commit ; a separate "review changes" section leaves the main record stale and costs the docs point.
- CHANGELOG `[Unreleased]` has an entry for this item; the story's Design and QA sections match the code that was actually written (names, paths, counts).
- Every commit carries its own tests and doc updates (CHANGELOG, story, architecture). Splitting code and docs into later commits leaves commits that are wrong on their own, and reviewers mark it down.
- Docs that mention the touched area (README, architecture, security, testing, conventions) were re-read and updated. Markdown tables are re-aligned by Prettier (cells padded with spaces), so patch them by line prefix plus a distinctive substring, with `\s*` around `|`, never by exact string.
- Every claim in the story ("all 16 pairs", "N tests") is backed by a test that asserts it.
- Build the story's QA table from the real test names (grep them), never from memory: renamed and deleted tests made a reviewer drop the docs point.
- Take test counts for the story from `pytest --collect-only` / the runner, never by hand.
- Scripted doc/code edits must assert that every replacement matched — a silent no-op ships a false claim, such as a stale test count.
- `git ls-files` has no generated or binary artefacts (`.coverage`, `dist/`, screenshots outside `docs/`).
- Split the first commit of a cycle by part (ui components / app feature / e2e / docs): a huge first commit cannot be reviewed, and no later commit can fix it because `main` is never rewritten.
- Run Prettier (and other formatters) from the repo root: from a subfolder it does not find the root `.prettierignore` and reformats generated files such as an API client into a diff of thousands of lines. Before committing, check `git diff --cached --stat` for files the task did not touch (or give each app its own `.prettierignore`).

## Testing technique

- Mutation-test every field of an idempotency fingerprint (each body field, the operation, the resource id in it): a field left out lets a retry with another body replay the first answer, and only a test that reuses the key with that one field changed (→ 422) notices.
- A test derived from the table it checks proves nothing: pin expected tables literally and run one mutation by hand.
- Cluster-wide test objects (database roles, shared buckets) are dropped at teardown **and** cleared at session start, and the leftover check gets its own mutant (point it at the wrong name): a role left by one SIGKILLed run failed every later run on that database, and a leftover check aimed at the wrong role passed silently.
- Run Python mutants with `PYTHONDONTWRITEBYTECODE=1` (or clear `__pycache__`): an edit restored within the same second can leave a stale `.pyc` that fakes a kill.
- Mutation runners need a per-mutant timeout and must restore the file in `finally`: a mutant that makes a test hang otherwise leaves the mutated file in the tree. Give the suite a per-test timeout too (`pytest-timeout`).
- Logging and error-mapping code is code: test handlers with the real exception classes of each dependency (an SDK's timeout error may carry no response object at all), and keep library details out of the boundary (attach a `cause_code` in the adapter).
- Test an entry point the way it is really started (`python -m pkg` as a subprocess), not only by importing `main`: a `spawn` child cannot import from `__main__`, and only the e2e caught it.
- Before changing a shared component to fix a symptom seen in a story or test, reproduce the root cause in a real browser: a symptom produced by an unrealistic fixture (an inline data URL instead of a served file) leads to a fix that must later be reverted. Make test fixtures behave like production inputs.

## Concurrency and reliability

- A compare-and-set must check the token the client saw (a revision or ETag it sends), not only the server's own read in the same request: approve → reopen returns to the same state, so a state-only check lets a stale page decide (ABA). Send the revision from the UI and prove it with an ABA test on the real database.
- Throttles (sign-in, rate limits): reserve the attempt before the expensive check, in one transaction under an advisory lock per key (`pg_advisory_xact_lock`, keys taken in a fixed order), then release; counting first and recording after let 30 parallel attempts make 27 checks against a limit of 10. Prove it with N threads on their own connections behind a barrier.
- Concurrency: every read-modify-write is a lock or a compare-and-set, with a two-thread test.
- Fakes hide concurrency bugs: every race claim needs one run against the real dependency — a race that fails a noticeable share of runs against a real object store can pass every time against an in-memory fake.
- Prove a race fix with a deterministic interleaving (open transactions, or a wrapper that holds the window open after the write), never with sleep-then-check. Before relying on a database guard during a lock wait, test it: PostgreSQL re-checks a waiting UPDATE's condition only when the row changed.
- Every write that acts on something it read earlier (reaping "exhausted" jobs, expiring "stale" uploads) must re-check that condition in the guarded write itself; a read-then-write gap is a race even when each statement is guarded.
- Cleanup racing in-flight work (an expiry vs a server-side copy): make whichever side finishes last remove the garbage, and test both orders. Fakes must be able to land a copy after its source was deleted, as real S3 can; a fake that copies atomically hides the leak.
- A sweep's batch must count only the items it acts on, plus a separate scan cap: counting skipped items toward the batch lets a run stall forever behind keys it must keep.
- Stability wrappers (circuit breakers, rate limits) must judge the unit that does I/O (a page fetch), never the items read from it, and must ignore verdicts from calls that started before the state last changed (tickets with a generation). Test them with many threads, not only a fake clock.
- Anything that reuses or caches (kept signed URLs, memoised data) needs a failure path that is never reused, and a test that fails the cached thing once: a "keep the still-valid URL" optimisation will otherwise keep the URL that just failed.
- Throttle or batch per shared resource, not per item: a per-card refresh multiplies into cards × pages requests during an outage. A refresh asked for while a fetch is in flight must wait, not use up the window.
- Timing and liveness work (watchdogs, leases, supervisors): before coding, write the invariant as arithmetic over the constants (every backstop < what the lease has left when the heartbeat freezes at _any_ moment: during work, a claim, a stop) and list every freeze point; test the production wiring end to end (supervisor → child → worker → watchdog), not only the parts. Without the arithmetic, each review round finds one more window (a lock held by the runtime, a frozen heartbeat, the stop path, the gap between claim and watch).

## Input, media and security

- uvicorn reads `X-Forwarded-For` by default and believes it from 127.0.0.1, so anything reaching the app over loopback (a dev proxy, a same-host reverse proxy) chooses the client IP rate limits see; start the server with proxy headers off unless an explicit trusted-proxy list is set, have dev proxies overwrite the header with their real peer, and test it by starting the real server process with a forged header.
- Budget every allocation an untrusted file **declares**, not only what your own reader uses: a 3D file whose renderer skipped one accessor still crashed the browser viewer, because the client parser allocated every accessor the file declared (a 768-byte file asked for 3 GB). Apply the same bounds in every reader (server and client) and keep them equal with a test.
- Text input: reject Unicode Cc, Cs (lone surrogates crash the DB driver), Zl, Zp and all of Cf except ZWNJ/ZWJ (Persian, Indic, emoji need them), plus invisible fillers (U+034F, U+115F, U+1160, U+2800, U+3164, U+FFA0); reject dot-only file names; cap every decoded token's length. Accept-tests in several scripts are mandatory; tag characters matter because names reach AI prompts.
- Untrusted media: measure peak memory per accepted format at its limit in a fresh subprocess (ru_maxrss of a warm process lies), and bound both pixels and file size (Pillow reads whole WebP/animated files); pin it with a subprocess regression test.
- Parsing untrusted complex files (3D models, archives, documents): design the sandbox first — a spawned child with a wall-clock kill, its own CPU limit, an address-space limit (Linux), exit on parent death — then add bounds checks for speed. Bounds checks alone are whack-a-mole: each review finds a new bomb class (shared-node graphs, vertex amplification, chunk counts, nested lists). Record it in an ADR in the same commit.
- Never hand-write crypto or a signature scheme to get one missing knob (such as request signing at a chosen time): subclass the library's implementation and override the narrowest hook, cross-check against the library, and record it in an ADR. A hand-written signer diverges silently for inputs the library handles.
- Bound every integer decoded from a cursor (or any opaque token) before it reaches the database: an int past the column type made Postgres error out and the API answer 503 with Retry-After, so a crafted cursor looked like an outage. Refuse it as 400 and test the boundary (2^31 − 1, 2^31, 40 digits).
- Trigger and `SECURITY DEFINER` functions must schema-qualify every table (`public.asset_versions`) and pin `SET search_path = pg_catalog, public, pg_temp` with `pg_temp` **last**, or a temporary table shadows them: a role with only DML rights ran `CREATE TEMP TABLE asset_versions` and made an append-only guard's existence check say "gone" for a live row. `pg_catalog, public` alone is not enough, because Postgres searches `pg_temp` first for tables when the path leaves it out. Prove it as a DML-only role, and add a generic test that every function in `pg_proc` has the pin.
- Before relaxing a guard (dropping a condition such as "only inside the cascade"), list what that condition was stopping: a direct statement that the remaining check now has to judge alone. Then re-attack the guard in the same round as an unprivileged role (DML rights only, with temporary objects), not as the superuser the tests usually run as: a relaxed append-only trigger shipped through two review rounds before a reviewer did, and it fell to one temporary table.
- Invalid UTF-8 on stdin decodes to lone surrogates in Python (`surrogateescape`). Any text that reaches an encoder (a password hash, a DB driver) must refuse category Cs first, or the CLI dies with a traceback. Test it with a real subprocess fed `\xff`.

## Workers and processes

- Queue workers: guard every job update with the claim (status + attempt), use the database clock for leases, give the loop a catch-all, and test SIGKILL, poison jobs and outages against the real database.
- Process supervision: a child must watch its parent (or it outlives a SIGKILLed supervisor), an unrequested clean exit is a failure to restart, backoff needs jitter and a reset after healthy uptime, and process tests must run in their own process group killed in `finally`.

## Browser, UI and e2e

- Move focus to an error from an effect that runs after it renders, never inside the error handler: React commits the state update after the handler, so at `focusin` the field was not yet `aria-invalid` and described nothing, and a screen reader read no error. Prove it by recording `aria-invalid` and the described text at `focusin`, in a component test and in a real-browser e2e (`page.route` answering 500).
- A message that takes focus must not also be a live region (`role="alert"`, `aria-live`), itself or through an ancestor: NVDA and JAWS read it twice. Pick one channel per outcome — focus, or a polite status — and when focus lands on a static element next to a status message, make it say something new (the reason), not the state again.
- Assert a focus ring's width and colour (or contrast), not only `outline-style`: a 1 px or transparent ring passes a style-only check. Never `:focus { outline: none }` on an element the app focuses; give it the `:focus-visible` ring and run the ring check in the e2e, since jsdom ignores CSS.
- Key per-entity forms by the entity id (`key={version.id}`) and put the id in idempotency-key signatures: otherwise a typed note, an error and a key carry over when the user switches entity, and a retry on the new one replays or is refused as a reused key. When an action unmounts its own button (Approve → Reopen), move focus to a stable target on purpose and assert it in the keyboard e2e (WCAG 2.4.3); run axe from a known scroll position, since it counts targets under a sticky bar as obscured.
- A browser-specific bug is reproduced in that engine: with only Chromium projects in the Playwright config, a Safari report cannot fail a test until a `webkit` project is added.
- Run the app the way the user will before every review and at every release: README quick start in a fresh shell, the printed dev URL (`localhost`, not only `127.0.0.1`), the new feature clicked through. e2e against a preview server on `127.0.0.1` can pass for a whole release while the dev server on `localhost` cannot reach the API, because the origins differ and CORS blocks it.
- Browser features that call the API cross-origin: run the real-browser e2e before the first review — curl and the CLI never send a CORS preflight, so a missing allowed header (a custom `Idempotency-Key`, say) only shows up there. Live regions must queue outcomes, not replace them, or a batch of failures announces only the last.
- UI e2e must cover every state's way out on every size class: a CSS rule that hid the back link on wide screens left the not-found state with no action, and only the desktop e2e run caught it.
- Cache-hit evidence in e2e: resource timing `transferSize` is always 0 for cross-origin resources without `Timing-Allow-Origin`; ask the DevTools protocol (`Network.requestServedFromCache`) and prove the test can fail by disabling the cache.
- Storybook e2e: `storyFinished.status` reflects only reporters (a11y), not `play`; listen for `playFunctionThrewException`. Docgen (`react-docgen-typescript`) skips undocumented `children` and inherited native props, so set `skipChildrenPropWithoutDoc: false` plus a prop filter, and assert that every docs table row has a description. Never `reuseExistingServer` against a build the run did not make, and bound every per-story wait.
- Client-side geometry sent to an API (regions, crops, coordinates) must be clamped with the same arithmetic the server validates, in the same doubles, after JSON: floor to the stored precision, then check x + width ≤ 1 as the server will. Property-test drags ending on every edge with a seeded generator; 1.5 % of plain edge drags were refused before that.
- Targets drawn over images (pins, region badges, hotspots) need a crowded-marks axe test: two marks a pixel apart failed `target-size` and a pin at (1, 1) was clipped. Lay targets out in px from the measured image, clamp them inside, and move one that would cover another.

## Architecture

- The domain imports no framework (a test asserts it); errors raised by the domain live in a framework-free module.
