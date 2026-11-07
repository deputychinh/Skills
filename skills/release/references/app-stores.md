# Store path: App Store and Google Play

A mobile release differs from a web deploy in one way that changes everything else: **a store
cannot roll back a binary.** Once users installed a build they keep it until a newer one arrives.
So the safety comes from staging (testers first, then a growing share of users), from halting early,
and from server-side switches (feature flags, a minimum-supported-version check) that the app reads
at runtime. Each native app (`ios`, `android`) is released on its own track with its own version
numbers; the shared backend API must stay compatible with every app version still in use.

Notes are marked "Verified on 2026-11-07 against <URL>" or "(memory)".

## Contents

1. [Versioning](#1-versioning)
2. [Ready check additions](#2-ready-check-additions)
3. [iOS: TestFlight, review, phased release](#3-ios-testflight-review-phased-release)
4. [Android: tracks and staged rollout](#4-android-tracks-and-staged-rollout)
5. [Checkpoints and rollback triggers](#5-checkpoints-and-rollback-triggers)
6. ["Rollback" on a store](#6-rollback-on-a-store)

## 1. Versioning

| Platform | Shown to users                                         | Must increase for every upload                                          |
| -------- | ------------------------------------------------------ | ----------------------------------------------------------------------- |
| iOS      | marketing version `CFBundleShortVersionString` (1.4.0) | build number `CFBundleVersion` (e.g. 142), unique per marketing version |
| Android  | `versionName` (1.4.0)                                  | `versionCode`, a positive integer, max 2100000000, never reused         |

- Keep the marketing version / `versionName` in SemVer, like the repo tag (`ios-v1.4.0`,
  `android-v1.4.0` when the apps release independently in a monorepo).
- Derive the build number / `versionCode` from CI (the run number, or a monotonically increasing
  counter) so two machines never upload the same one.
- Sources: CFBundleShortVersionString is "the release or version number of the bundle" and
  CFBundleVersion "the version of the build that identifies an iteration of the bundle" — verified on
  2026-11-07 against
  https://developer.apple.com/documentation/bundleresources/information-property-list/cfbundleversion;
  `versionCode` rules verified on 2026-11-07 against
  https://developer.android.com/studio/publish/versioning

## 2. Ready check additions

On top of the generic ready check in `SKILL.md`:

- The release build (not debug) passes the app's tests and `verify-app` mobile mode.
- The backend in production already serves the API this build needs, and the **previous** app
  versions still work against it (users update slowly; some never do).
- Signing happens in CI from encrypted secrets; `gitleaks` over the range finds no keystore,
  `.p12`, `.p8` or service-account JSON.
- Store metadata is current: release notes per locale, screenshots when the UI changed, privacy
  answers (App Privacy details, Play Data safety) when data collection changed (memory).
- Crash reporting (Crashlytics or Sentry) is wired with the new version and build number, and dSYMs
  (iOS) or the R8 mapping file (Android) are uploaded, or the first crash reports are unreadable
  (memory).

## 3. iOS: TestFlight, review, phased release

1. **Upload** the archive from CI (Xcode, `xcodebuild -exportArchive`, or fastlane) to App Store
   Connect.
2. **TestFlight**: internal testers (up to 100 App Store Connect users) get the build at once;
   external testers (up to 10,000) need Beta App Review for the first build of a version. A build is
   testable for 90 days. Verified on 2026-11-07 against
   https://developer.apple.com/help/app-store-connect/test-a-beta-version/testflight-overview
3. **App Review**: Apple reviews at least 50 % of submissions in under 24 hours and 90 % in under 48
   hours; an **expedited review** can be requested for a critical bug fix (include steps to
   reproduce on the current version) or a dated event. Verified on 2026-11-07 against
   https://developer.apple.com/distribute/app-review/
4. **Release** manually after approval (not automatically), so the release happens when someone is
   watching.
5. **Phased release** for automatic updates over 7 days: 1 %, 2 %, 5 %, 10 %, 20 %, 50 %, 100 %.
   It can be paused for up to 30 days in total, any number of times; anyone can still download the
   update manually from the App Store during the phase. Verified on 2026-11-07 against
   https://developer.apple.com/help/app-store-connect/update-your-app/release-a-version-update-in-phases

## 4. Android: tracks and staged rollout

1. **Upload** an Android App Bundle (`.aab`) signed with the upload key; Play App Signing re-signs
   for users (memory).
2. **Internal testing** (up to 100 testers, available within minutes) → **closed testing**
   (named groups or lists) → optionally **open testing** → **production**. Verified on 2026-11-07
   against https://support.google.com/googleplay/android-developer/answer/9845334
3. New personal developer accounts (created after 13 November 2023) must run a closed test with at
   least 12 testers opted in for 14 days in a row before production access. Verified on 2026-11-07
   against https://support.google.com/googleplay/android-developer/answer/14151465
4. **Staged rollout** to production: choose the percentage; it does not rise on its own — raise it
   by hand at each checkpoint (e.g. 1 % → 5 % → 20 % → 50 % → 100 %). **Halting** stops new users
   from getting it; users who already have it keep it. Resume after a fix or once the numbers are
   healthy. Verified on 2026-11-07 against
   https://support.google.com/googleplay/android-developer/answer/6346149
5. The Play pre-launch report runs the build on real devices and lists crashes and accessibility
   issues; read it before raising the rollout (memory for its exact contents).

## 5. Checkpoints and rollback triggers

The +5 min / +1 h / +24 h rhythm of `SKILL.md` becomes "per rollout step", because a step at 1 %
needs hours to collect enough sessions. Write the plan before release, as for any deploy:

| Checkpoint                  | Signals                                                                                                             | Halt / pause trigger (sustained)                                                     |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| TestFlight / internal track | smoke of every critical journey on the store build (`verify-app` mobile mode), no crash on launch                   | any crash on launch or failed critical journey → do not promote                      |
| First rollout step (1–2 %)  | crash-free sessions and users for the new version vs the previous version, ANR rate (Android), new crash signatures | crash-free sessions < 99.5 % or > 0.3 points below the previous version → halt/pause |
| Each raise (5, 20, 50 %)    | same, plus cold start p90 and API error rate from this app version                                                  | ANR rate (user-perceived) > 0.47 % or crash rate > 1.09 % → halt                     |
| 100 % + 7 days              | Android vitals and MetricKit trends, store rating and reviews for the version                                       | sustained rating drop or a new top crash → fix release                               |

The 1.09 % and 0.47 % figures are Android vitals' overall bad-behaviour thresholds, which also cost
store visibility (verified on 2026-11-07 against https://developer.android.com/topic/performance/vitals).
Crashlytics computes crash-free sessions per session (a new session after a cold start or 30
minutes in the background) and vitals per daily user, so the two rates are not comparable; pick one
source per trigger (verified on 2026-11-07 against
https://firebase.google.com/docs/crashlytics/crash-free-metrics).

## 6. "Rollback" on a store

There is no store rollback; the options, fastest first:

1. **Turn the feature flag off** or switch server behaviour — instant for every installed version.
   Ship risky features dark behind remote flags so this option exists.
2. **Halt the rollout** (Play) or **pause the phased release** (App Store) so no more users get the
   bad build.
3. **Expedited fix**: bump the build number / `versionCode`, fix with a regression test
   (`fix-bug`), upload, request expedited App Review, roll out to the same percentage quickly.
   Re-uploading the previous code with a higher `versionCode` is a valid Android "revert" (memory).
4. **Force update** for a defect that harms users or data: the app checks a minimum supported
   version from the API at launch and blocks with an update prompt below it. It has to exist before
   the bad release, so add it in the first release (memory).

After any halt, open an incident with `monitor` and a backlog item for `fix-bug`, as for a web
rollback.
