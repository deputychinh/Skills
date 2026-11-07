---
name: verify-app
description: Runs the app exactly as the user will — README quick start in a fresh shell, the URL the dev server prints, a real browser, or simulators and emulators for native iOS and Android apps — and collects evidence for every acceptance criterion and UI state before anything is called done; in post-deploy mode it runs the same checks against the deployed URL. Use before saying a feature, fix or release works, whenever the user is about to open the app, after a deploy, or when they say "test it", "check it works" or "is it really fixed" — even for a one-line change. Inside a delivery, `ship` and `deliver-loop` call this skill before `demo`, and `release` calls its post-deploy mode.
---

# verify-app — run it the way the user will, then claim

Unit tests and curl do not prove a product works. A missing CORS header only shows in a real browser,
because curl never sends a preflight; a README that skips a step only shows in a fresh shell. Both can
pass every automated gate for a whole release while the URL the dev server prints cannot reach the API.

## Modes

- **Local** (default): steps 1–9 against the app started from the README.
- **Post-deploy**: when a deploy target exists (per the delivery profile) and `release` has just
  deployed, run steps 3–7 against the deployed URL instead of localhost — same ACs, same states, same
  browsers — plus the checks only production has: HTTPS and redirects, real CORS origins and cookies,
  CDN and cache headers, environment config, health endpoint, and the error tracker receiving events.
  Never write test data a real user could see; use a test account or read-only flows, and say which.
  Save evidence under `docs/delivery/<slug>/evidence/post-deploy/` and hand the verdict back to
  `release`, which decides on rollback.
- **Mobile**: for a native iOS or Android app (the `ios` and `android` skills), run the Mobile mode
  steps below on simulators and emulators instead of a browser; the ACs, states,
  evidence and verdict table (Steps 4–9) stay the same. After a store upload, run it again on the TestFlight or Play internal
  build, because that is the binary users will get.

## Mobile mode

1. **Install and launch from the README**, in a fresh shell, the way a contributor would:
   - iOS: `xcrun simctl boot "<iPhone model>"` (list with `xcrun simctl list devices available`),
     `xcodebuild build -scheme <App> -destination 'platform=iOS Simulator,name=<iPhone model>'`, then
     `xcrun simctl install booted <path>/<App>.app` and `xcrun simctl launch booted <bundle id>`.
   - Android: `emulator -avd <name>` (create one with `avdmanager` for a phone and a tablet),
     `./gradlew assembleDebug`, `adb install -r app/build/outputs/apk/debug/app-debug.apk`, then
     `adb shell am start -W -n <package>/.MainActivity` (prints the launch time).

   The debug build must reach the local API (`localhost` from the iOS simulator, `10.0.2.2` from the
   Android emulator); a first screen that cannot load data is the mobile version of the CORS bug.

2. **Drive every journey** with the repo's UI tests — XCUITest (`xcodebuild test`), Compose UI tests
   (`./gradlew connectedCheck`) — or Maestro YAML flows (`maestro test flows/`) when the same journey
   must run on both platforms. Include offline (airplane mode or the API stopped), slow network,
   background and resume, rotation, and a denied permission.
3. **Screenshots** of each changed screen on a small and a large device (smallest supported iPhone
   and an iPad; a compact phone and a tablet or foldable), light and dark, and at the largest text
   size:
   - iOS: `xcrun simctl ui booted appearance dark`,
     `xcrun simctl ui booted content_size accessibility-extra-extra-extra-large`,
     `xcrun simctl io booted screenshot <file>.png`.
   - Android: `adb shell cmd uimode night yes`, `adb shell settings put system font_scale 2.0`,
     `adb exec-out screencap -p > <file>.png`.

   Save to `docs/delivery/<slug>/evidence/<screen>-<device>-<theme>[-xl].png` and open each one:
   clipped or overlapping text at the largest size is a defect, not a cosmetic note.

4. **Screen reader spot check**: walk the main journey with VoiceOver (iOS) and TalkBack (Android)
   — every control has a meaningful label, focus order follows reading order, nothing important is
   unreachable by swiping — plus Accessibility Inspector or Accessibility Scanner on changed
   screens. Record what was checked; this is a spot check, not a full audit.
5. **Performance**: cold start and the main scroll against `benchmarks/plan.md` (`benchmark` has the
   mobile workloads), on a release build, not a debug build.

`simctl` options verified on 2026-11-07 against `xcrun simctl help` in Xcode 27.0; `am start -W`
verified on 2026-11-07 against https://developer.android.com/topic/performance/vitals/launch-time;
TalkBack and Accessibility Scanner checks against
https://developer.android.com/guide/topics/ui/accessibility/testing; the other `adb` and `emulator`
commands and Maestro's CLI are from memory.

## Steps

1. **Fresh start**: new shell, follow the README quick start word for word (install, infra, migrate,
   every process). If a step is missing or wrong, fix the README in the same change.
2. **Use the environment the report names**: a bug seen in Safari is reproduced in WebKit — add a
   Playwright `webkit` project (and an iPhone profile for mobile Safari), run
   `npx playwright install webkit`, write the failing test there; if WebKit does not reproduce it,
   drive real Safari with `safaridriver --enable`. Same for Firefox (`firefox` project), a mobile
   size, a slow network or a given data set.
3. **Open what the servers print** (e.g. `http://localhost:5173`, not only `127.0.0.1`, because the
   two are different origins for CORS and cookies) in a real browser, using what is available:
   Playwright (chromium, firefox, webkit), Claude in Chrome, or the Chrome DevTools MCP. Watch the
   console and network for errors, CORS failures and 4xx/5xx.
4. **Walk every acceptance criterion** of the work being verified, including the negative and boundary
   cases; for each, save evidence to `docs/delivery/<slug>/evidence/` (or the story's QA section):
   screenshot at 390 px and 1280 px for UI, command and output for APIs and CLIs, timing for
   performance targets. Look at every screenshot before citing it.
5. **States**: loading, empty, error (stop the API or storage and reload), success; keyboard only;
   dark and light theme if the app has both; slow network (DevTools throttling) for anything that
   uploads or streams.
6. **Performance**:
   - Targets in the spec: run `make bench` and compare with `benchmarks/baseline.json` (`benchmark`);
     a regression beyond the noise band is fixed with `cache-optimize` or accepted in writing.
   - A performance request without spec targets ("make it faster", "it feels slow"): establish the
     baseline first with `benchmark` part B — workload, data, percentile, environment — and only then
     change anything, because a speed-up without a before number cannot be shown or defended.
7. **AI features**: run the eval set; record pass rate, latency p50/p95, cost per call; try one prompt
   injection and one model-unavailable case.
8. **Gates**: the repo's full CI (`make ci` or equivalent) and e2e, chained by exit code — never judge
   a gate from filtered output (`| tail` hides failures).
9. **Verdict table**: AC → evidence → pass/fail. Anything failing is fixed now (with a regression
   test) or filed and listed as a known issue. Only then say "done".

## Red flags

"Should work", "probably", "tests pass so it works", a screenshot you did not open, evidence from an
earlier run, a subagent's summary not checked against `git diff` and a fresh run, a post-deploy check
that only hit the health endpoint.

Sources: Humble & Farley _Continuous Delivery_ (keep it releasable); Winters et al. _Software
Engineering at Google_ (test pyramid, hermetic tests); Anthropic, "Effective harnesses for
long-running agents" (end-to-end browser tests per feature).
