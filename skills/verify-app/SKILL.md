---
name: verify-app
description: Runs the app exactly as David will — README quick start in a fresh shell, the URL the dev server prints, a real browser — and collects evidence for every acceptance criterion and state before anything is called done. Use before saying a feature, fix or release works, and whenever David is about to open the app.
---

# verify-app — run it the way David will, then claim

Unit tests and curl do not prove a product works: Kiln passed every gate for a whole release while the
URL `make web` printed could not reach the API (CORS on `localhost`), and the README skipped two steps.

## Steps

1. **Fresh start**: new shell, follow the README quick start word for word (install, infra, migrate,
   every process). If a step is missing or wrong, fix the README in the same change.
2. **Open what the servers print** (e.g. `http://localhost:5173`, not only `127.0.0.1`), in a real
   browser: Playwright, the Chrome DevTools MCP, or Claude in Chrome. Watch the console and network for
   errors, CORS failures and 4xx/5xx.
3. **Walk every acceptance criterion** of the work being verified, including the negative and boundary
   cases; for each, save evidence to `docs/delivery/<slug>/evidence/` (or the story's QA section):
   screenshot at 390 px and 1280 px for UI, command and output for APIs/CLIs, timing for performance targets.
   Look at every screenshot before citing it.
4. **States**: loading, empty, error (stop the API or storage and reload), success; keyboard only;
   dark and light theme if the app has both; slow network (DevTools throttling) for anything that uploads
   or streams.
5. **AI features**: run the eval set; record pass rate, latency p50/p95, cost per call; try one prompt
   injection and one model-unavailable case.
6. **Gates**: the repo's full CI (`make ci` or equivalent) and e2e, chained by exit code — never judge a
   gate from filtered output (`| tail` hides failures).
7. **Verdict table**: AC → evidence → pass/fail. Anything failing is fixed now (with a regression test)
   or filed and listed as a known issue. Only then may you say "done".

## Red flags

"Should work", "probably", "tests pass so it works", a screenshot you did not open, evidence from an
earlier run, a subagent's summary not checked against `git diff` and a fresh run.

Sources: Humble & Farley _Continuous Delivery_ (keep it releasable); Winters et al. _Software
Engineering at Google_ (test pyramid, hermetic tests); superpowers `verification-before-completion`;
Anthropic long-running harness (end-to-end browser tests per feature).
