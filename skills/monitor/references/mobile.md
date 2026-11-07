# Monitoring native mobile apps (iOS and Android)

A phone app fails where you cannot log in: on a device, offline, on an OS version you never tested.
The server-side signals in `observability-setup.md` still cover the API the apps call; this file
adds what only the client can report — crashes, ANRs and hangs, startup time, and per-version
health — and how to turn them into SLOs and alerts. Each app is monitored per platform and per
version, because a store release reaches users gradually and old versions stay installed.

Notes are marked "Verified on 2026-11-07 against <URL>" or "(memory)".

## Contents

1. [Signals and tools](#1-signals-and-tools)
2. [Mobile SLOs](#2-mobile-slos)
3. [Alerts](#3-alerts)
4. [Incidents on mobile](#4-incidents-on-mobile)

## 1. Signals and tools

| Signal                           | iOS                                                                               | Android                                                               |
| -------------------------------- | --------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Crashes with symbolicated stacks | Crashlytics or Sentry (upload dSYMs from CI); MetricKit `MXCrashDiagnostic`       | Crashlytics or Sentry (upload the R8 mapping file); Android vitals    |
| Freezes                          | hangs: MetricKit `HangDiagnostic` / hang time; Sentry app-hang detection (memory) | ANRs: Android vitals user-perceived ANR rate; Crashlytics ANR reports |
| Startup and responsiveness       | MetricKit time to first draw, resume time, hitch time                             | Android vitals startup time (TTID), slow rendering, slow sessions     |
| Memory, battery                  | MetricKit peak memory, CPU, disk writes                                           | Android vitals memory usage, excessive partial wake locks             |
| Per-version health               | crash-free sessions and users per release (Crashlytics, Sentry)                   | same, plus vitals per version and per device model                    |
| API errors seen by the app       | client-side request failures tagged with app version (sampled)                    | same                                                                  |

- Crash-free users = 1 − crashed users ÷ all users; crash-free sessions = 1 − crashed sessions ÷ all
  sessions, where a session starts on a cold start or after 30 minutes in the background; both count
  fatal events only. Verified on 2026-11-07 against
  https://firebase.google.com/docs/crashlytics/crash-free-metrics
- Sentry release health defines the same two rates and supports crash-rate alerts on either.
  Verified on 2026-11-07 against https://docs.sentry.io/product/releases/health/
- MetricKit delivers daily metric and diagnostic reports (launch, hangs, hitches, crashes, memory,
  CPU, disk, terminations) from real users; `MXMetricManager` since iOS 13, the newer
  `MetricManager` API since iOS 27. Verified on 2026-11-07 against
  https://developer.apple.com/documentation/metrickit
- Android vitals collects crash, ANR, startup, rendering, memory and battery data from users who opt
  in, counts per **daily user** (Crashlytics counts per session, so the numbers differ), uses a 28-day
  window, and lowers Play visibility above its bad-behaviour thresholds: user-perceived crash rate
  1.09 % and ANR rate 0.47 % overall, 8 % per phone model. Vitals also sees crashes before an SDK
  initialises. Verified on 2026-11-07 against https://developer.android.com/topic/performance/vitals
- Tag every event with app version, build number, OS version and device model; scrub personal data
  before it leaves the device, as on the server.

## 2. Mobile SLOs

Start with two per app, measured over 28 days and per production version:

| SLO                      | Default objective                                                                                           | Source of the SLI                                    |
| ------------------------ | ----------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| Stability                | crash-free sessions ≥ 99.5 % (aim for ≥ 99.9 %)                                                             | Crashlytics or Sentry release health                 |
| Responsiveness (Android) | user-perceived ANR rate < 0.47 % (vitals threshold)                                                         | Android vitals                                       |
| Cold start               | p90 time to initial display ≤ the target in `benchmarks/plan.md` (Android vitals counts ≥ 5 s as excessive) | MetricKit, Android vitals, or a custom startup trace |
| Main journey succeeds    | ≥ 99 % of attempts of the main write complete                                                               | client event + server confirmation                   |

The 99.5 % crash-free figure is a common industry floor, not a vendor rule (memory); raise it once
the app is above it. Write the SLOs into `docs/operations.md` per app, next to the API's SLOs.

## 3. Alerts

- **Velocity / new-issue alerts** from the crash tool: a new crash signature in the latest version,
  a regressed (previously resolved) issue, or a crash spike affecting a share of sessions within an
  hour. Crashlytics and Sentry both offer these (memory for the exact options).
- **Crash-rate alert** per production version: crash-free sessions below the SLO for the newest
  version during a rollout → page the person releasing, because `release` halts the rollout.
- **Android vitals email alerts** in the Play Console for bad behaviour and emerging issues
  (verified on 2026-11-07 against https://developer.android.com/topic/performance/vitals).
- Field data is slow (MetricKit once a day, vitals daily on a 28-day window), so use it for the
  weekly health review and SLO tracking, and the crash tool for paging.
- Each alert gets a runbook line in `docs/operations.md`: which version, how to halt or pause the
  rollout, which flag to turn off.

## 4. Incidents on mobile

Mitigation options differ from the web, because a binary cannot be rolled back:

1. Turn the remote feature flag off or change server behaviour (instant, every version).
2. Halt the Play staged rollout or pause the App Store phased release (`release`,
   `references/app-stores.md`).
3. Ship an expedited fix through `fix-bug` and `release`.
4. For harmful defects, raise the minimum supported version the API returns, so old builds show an
   update prompt.

The postmortem asks one extra question: which signal would have caught this at the 1 % rollout step?
