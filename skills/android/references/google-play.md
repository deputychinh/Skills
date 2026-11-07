# Google Play: requirements, release path and quality bars

Tags: **Verified on 2026-11-07 against <URL>** = read on that date; **(memory)** = not re-checked
online, confirm in Play Console Help before acting. Play policies change several times a year;
re-check the dated items before every first submission.

## Contents

1. Target API requirement
2. Platform version in play
3. App bundles and size
4. Signing with Play App Signing
5. Data safety, privacy policy and account deletion
6. Permissions and policy hot spots
7. Testing tracks and production access
8. Staged rollout, halting and fixing forward
9. Android vitals thresholds
10. Pre-submission checklist

## 1. Target API requirement

Verified on 2026-11-07 against https://developer.android.com/google/play/requirements/target-sdk

- Since 2026-08-31, new apps and app updates must target Android 16 (API 36) or higher (Wear OS and
  Android Automotive OS: API 35; Android TV and Android XR: API 34).
- Existing apps must target API 35 or higher to stay available to new users on devices running a
  newer Android than the app's target.
- The extension window ran to 2026-11-01 and has passed.
- Exception: permanently private apps for one organisation.
- No date has been announced for requiring API 37 (as of 2026-11-07, secondary sources only).
- Plan the yearly bump: read each version's behaviour-change pages, raise `targetSdk` on a branch,
  run the full test matrix, and ship well before the August deadline.

## 2. Platform version in play

- Android 17 is API 37; it reached platform stability at Beta 3 (2026-03-26) and Google asked
  developers to start publishing Android 17-targeted apps at Beta 4 (2026-04-16). Verified on
  2026-11-07 against https://developer.android.com/about/versions/17/release-notes
- Stable release date 2026-06-16 per press coverage, not checked on an official page.
- Targeting API 37 changes, among others: orientation, resizability and aspect-ratio restrictions
  ignored on large screens; activities no longer restart for keyboard, navigation, touchscreen and
  colour-mode configuration changes unless the app opts in (`android:recreateOnConfigChanges`);
  background audio hardening; programmatic SMS OTP access delayed three hours for most apps (use
  SMS Retriever or SMS User Consent). Verified on 2026-11-07 against the release notes above.
- AGP 9.5 supports `compileSdk` up to 37. Verified on 2026-11-07 against
  https://developer.android.com/build/releases/gradle-plugin

## 3. App bundles and size

- New apps publish as Android App Bundles (`.aab`); Play builds optimised APKs per device. **(memory:
  required for new apps since August 2021)**
- Build with `./gradlew bundleRelease`; inspect locally with `bundletool build-apks --connected-device`
  and install with `bundletool install-apks` to test what users receive. **(memory)**
- Keep the download small: R8 shrinking, resource shrinking (`isShrinkResources = true`), WebP or
  vector assets, Play Feature Delivery for large optional features. **(memory)**
- Native code must support 16 KB memory page sizes for apps targeting newer API levels. **(memory)**

## 4. Signing with Play App Signing

Verified on 2026-11-07 against https://support.google.com/googleplay/android-developer/answer/9842756

- Two keys: the **upload key** (yours, RSA ≥ 2048-bit, signs the bundle you upload) and the **app
  signing key** (held by Google, signs what devices install). Use different keys for the two.
- A lost or leaked upload key can be reset: create a new key, export its certificate with
  `keytool -export -rfc`, request "upload key reset" in Play Console. A self-managed app signing
  key cannot be reset if lost — let Google generate it.
- New apps are enrolled in quantum-ready hybrid signing automatically.
- The app signing key can be upgraded once a year; Android 17+ enforces the upgraded key.
- Services that check the signing certificate (Google sign-in, Maps API keys, App Links
  `assetlinks.json`) need the **app signing key** fingerprint from Play Console, not the upload key's.
- Keep the upload keystore and its passwords in a password manager and in CI secrets only; never in
  the repo. Protect the Play Console account with 2-Step Verification.

## 5. Data safety, privacy policy and account deletion

Data safety — verified on 2026-11-07 against
https://support.google.com/googleplay/android-developer/answer/10787469

- Every app on closed, open or production tracks completes the form and links a privacy policy,
  even when it collects nothing; internal-testing-only apps are exempt.
- Declare per data type: collected and/or shared, purposes, required or optional, encrypted in
  transit, deletion available. "Collect" = leaves the device; "share" = goes to a third party
  (service providers, legal requests, user-initiated transfers and anonymised data are exempt).
- Data from bundled SDKs counts as yours; check each SDK's guidance (Google Play SDK Index).
- Data processed only in memory for a real-time request may be "ephemeral"; advertising or
  profiling use never is.
- The developer alone is responsible for accuracy; wrong declarations can block updates or remove
  the app. Update the form in the same release that changes data handling.

Account deletion — verified on 2026-11-07 against
https://support.google.com/googleplay/android-developer/answer/13327111

- Any app that lets users create an account must offer deletion **in the app** (easy to find, for
  example in account settings) **and** through a web link that works without reinstalling.
- Delete the account and its associated data across all declared categories, including copies held
  by service providers; data kept for security, fraud or legal reasons must be disclosed.
- The data safety form's data deletion questions must be answered and the web link provided.

## 6. Permissions and policy hot spots

- Request runtime permissions in context, after a rationale, and keep a working path when denied;
  test by revoking each permission in App Info and reopening the app. Verified on 2026-11-07
  against https://developer.android.com/google/play/requirements/target-sdk
- Location: request coarse with fine; background location separately and only with a declared,
  approved use case. Verified on 2026-11-07 against the same page (background separation: Android
  11 section).
- Photos and videos: use the system photo picker; broad media permissions need a core-feature
  declaration. **(memory)**
- `QUERY_ALL_PACKAGES`, `MANAGE_EXTERNAL_STORAGE`, SMS and call log, accessibility services and
  exact alarms are restricted and need a declaration or an approved use. **(memory)**
- Foreground services declare a type and justify it in Play Console. **(memory)**
- Contacts: prefer the Android 17 contacts picker over `READ_CONTACTS`. Verified on 2026-11-07
  against https://developer.android.com/about/versions/17/release-notes
- Store listing, screenshots and description must match the app; no misleading claims; content
  rating questionnaire and target audience answered; ads declared. **(memory)**
- Subscriptions and digital goods sold in the app use Google Play Billing unless a regional
  programme applies. **(memory)**

## 7. Testing tracks and production access

- Tracks: internal testing (up to 100 testers, fast review, profiles applied), closed testing
  (named groups), open testing, production. **(memory: limits)**
- Personal developer accounts created after 2023-11-13 must run a closed test with at least 12
  testers opted in continuously for the last 14 days before applying for production access.
  Verified on 2026-11-07 against https://support.google.com/googleplay/android-developer/answer/14151465
- Use the internal track for every release candidate; internal app sharing does not install
  Baseline Profiles, so do performance checks from the internal track. Verified on 2026-11-07
  against https://developer.android.com/topic/performance/baselineprofiles/overview
- Read the pre-launch report (automated crawl on real devices) before promoting. **(memory)**
- Managed publishing lets the owner choose when an approved release goes live. **(memory)**

## 8. Staged rollout, halting and fixing forward

Verified on 2026-11-07 against https://support.google.com/googleplay/android-developer/answer/6346149

- Staged rollouts apply to updates, not first releases. Users are picked at random; the percentage
  never rises on its own — raise it in **Manage rollout → Update rollout**.
- **Halt rollout** stops delivery to new users; users who already updated keep the version. There
  is no rollback: fix forward with a new release (higher `versionCode`) from a fixed bundle.
- **Resume rollout** continues with the same user set.
- Countries can be targeted for production rollouts but not removed once a rollout starts.
- Update the store listing only after the release reaches 100 %.
- Default ladder (**memory**, adjust to traffic): 1 % for 24 h → 10 % → 50 % → 100 %, each step only
  when crash and ANR rates for the new version are at or below the previous version's.
- `release` writes the numeric halt triggers before the rollout (for example: new-version
  user-perceived crash rate above the previous version's by 0.2 points, or any new top-5 crash).

## 9. Android vitals thresholds

Verified on 2026-11-07 against https://developer.android.com/topic/performance/vitals

| Core vital                            | Overall | Per phone model | Per watch model |
| ------------------------------------- | ------- | --------------- | --------------- |
| User-perceived crash rate             | 1.09 %  | 8 %             | 4 %             |
| User-perceived ANR rate               | 0.47 %  | 8 %             | 5 %             |
| Excessive partial wake locks          | 5 %     | —               | —               |
| Excessive battery usage (watch faces) | 1 %     | —               | 1 %             |

- Exceeding a threshold can reduce store visibility and show a warning on the listing.
- Memory usage (anonymous RSS + swap, per RAM tier and app state) and bitmap memory (200 MB
  user-perceived services and background, 400 MB cached) are core vitals; visibility impact for
  memory, bitmap memory and DEX code optimisation may start in February 2027.
- Play assesses a 28-day rolling average, counted per daily active user; "emerging issues" flag
  problems present for more than 7 days, leaving 21 days to fix.
- Vitals counts only Play installs on certified devices from users who opted in; it differs from
  Crashlytics-style per-session rates — compare like with like.

## 10. Pre-submission checklist

- [ ] `targetSdk` ≥ the current requirement; behaviour changes for that level tested.
- [ ] `versionCode` incremented; `versionName` matches the release tag.
- [ ] `bundleRelease` signed with the upload key from the environment; R8 and resource shrinking on.
- [ ] Baseline Profile included; startup measured on the release candidate.
- [ ] Data safety form, privacy policy URL and account deletion (in app + web) match this build.
- [ ] Every permission in the merged manifest is needed, explained and declared.
- [ ] Internal track install tested; pre-launch report has no crashes or accessibility errors.
- [ ] Release notes per language; screenshots for phone, 7" and 10" tablet current.
- [ ] Staged rollout plan with halt triggers handed to `release`.
