# App Store submission, TestFlight and releases

**Verified on 2026-11-07 against <URL>** = read on that date; **(memory)** = not re-checked.
Requirements move every spring (new SDK minimum) and autumn (new OS): re-read
https://developer.apple.com/news/upcoming-requirements/ before each release.

## Contents

1. Upload requirements
2. Privacy: manifest, required-reason APIs, labels
3. Accounts, login and data
4. Review guideline hot spots
5. Versions and build numbers
6. Archive and upload
7. TestFlight
8. Release: phased, manual, expedited
9. Pre-submission checklist

## 1. Upload requirements

Verified on 2026-11-07 against https://developer.apple.com/news/upcoming-requirements/

- Since 28 Apr 2026: apps uploaded to App Store Connect must be built with **Xcode 26 or later**
  using the **iOS 26 / iPadOS 26 SDK** (or later).
- Since 9 Sep 2026: iOS and iPadOS apps must **target iOS 13 or later**.
- Expect the minimum to move to Xcode 27 / iOS 27 SDK around spring 2027 **(memory: Apple's
  yearly pattern; no date announced on 2026-11-07)**.
- Apps built with the iOS 27 SDK must include a launch screen (`UILaunchScreen` or a storyboard key
  in `Info.plist`) or they are rejected once the App Store accepts 27 SDK builds; UIKit apps must use
  the scene-based life cycle or they fail to launch. Verified on 2026-11-07 against
  https://developer.apple.com/documentation/ios-ipados-release-notes/ios-ipados-27-release-notes
- Age rating: answer the updated age-rating questions (deadline was 31 Jan 2026) or updates are
  blocked.
- EU: trader status (Digital Services Act) required to distribute in the EU.

## 2. Privacy

Verified on 2026-11-07 against
https://developer.apple.com/documentation/bundleresources/privacy-manifest-files and
https://developer.apple.com/documentation/bundleresources/describing-use-of-required-reason-api

- The app and each third-party SDK carry a `PrivacyInfo.xcprivacy` (exact file name) in the target's
  resources. Top-level keys: `NSPrivacyTracking`, `NSPrivacyTrackingDomains`,
  `NSPrivacyCollectedDataTypes`, `NSPrivacyAccessedAPITypes`.
- Since 1 May 2024, uploads that use a required-reason API without a declared reason are rejected.
  Each executable or dynamic library that calls one needs the reason in its own bundle's manifest.
- Each `NSPrivacyAccessedAPITypes` entry has `NSPrivacyAccessedAPIType` (category) and
  `NSPrivacyAccessedAPITypeReasons` (approved codes). Use the APIs only for the declared reasons;
  fingerprinting is never allowed, with or without tracking permission.
- Categories at writing **(memory — copy codes from the page above, the list changes)**: file
  timestamps, system boot time, disk space, active keyboards, user defaults. Most apps hit
  `UserDefaults` (`NSPrivacyAccessedAPICategoryUserDefaults`, reason `CA92.1` for app-only access).
- Generate Xcode's privacy report (Organizer → archive → Generate Privacy Report) and make the App
  Store Connect **privacy nutrition labels** match it, including SDK data. **(memory)**
- Tracking across apps or websites needs App Tracking Transparency permission; tracking domains are
  blocked until granted. Verified (privacy manifest page).
- Purpose strings (`NS…UsageDescription`) say concretely why; request permission at the moment of
  use; the app works when denied (5.1.1(ii)–(iv) below).

## 3. Accounts, login and data

Verified on 2026-11-07 against https://developer.apple.com/app-store/review/guidelines/ (last
updated 16 Oct 2026)

- 5.1.1(v): without significant account features, let people use the app without logging in. **If
  the app supports account creation, it must offer account deletion inside the app.**
- 5.1.1(i): privacy policy link in App Store Connect and inside the app, covering data collected,
  third parties, retention and deletion.
- 5.1.1(iii): minimise data; prefer out-of-process pickers (PhotosPicker, share sheet) over full
  library access.
- 5.1.2(i): disclose and get explicit permission before sharing personal data with third parties,
  **including third-party AI**.
- 4.8 Login services: an app that uses a third-party or social login for the primary account must
  also offer an equivalent login that limits data to name and email, allows a private email, and
  does not track for ads without consent — Sign in with Apple qualifies. Not required when the app
  only uses its own accounts, enterprise/education accounts, or government eID.
- 2.1(a): give App Review a working demo account (and keep the backend up); a built-in demo mode
  needs prior approval.

## 4. Review guideline hot spots

Verified on 2026-11-07 against https://developer.apple.com/app-store/review/guidelines/

- 2.1 Completeness: no placeholders, broken links, crashes; IAP items visible and working.
- 2.3 Metadata: screenshots show the app in use (2.3.3); "What's New" describes real changes
  (2.3.12); honest age rating (2.3.6).
- 2.5.1 Public APIs only; phase out deprecated APIs.
- 2.5.19 No hidden or dormant features (no remote switches that change what the app is).
- 3.1.1 Digital goods and features use In-App Purchase unless an exception in 3.1.3 applies;
  storefront rules differ (US, EU) — check the current text before designing payments.
- 4.2 Minimum functionality: more than a wrapped website; 4.2.3(ii) disclose large first-launch
  downloads.
- 4.7 Mini apps, chatbots, plug-ins: index of content, age gating, no exposing native APIs.
- 5.1 Privacy, above. 1.2 User-generated content needs reporting, blocking and moderation.
  **(1.2 details from memory)**

## 5. Versions and build numbers

- `MARKETING_VERSION` → `CFBundleShortVersionString` (`1.4.0`, SemVer-like, shown to users) and
  `CURRENT_PROJECT_VERSION` → `CFBundleVersion` (build number). **(memory)**
- Build numbers must increase for each upload of the same version; use the CI run number or a
  timestamp so builds never collide. The marketing version increases for each App Store release.
  **(memory)**
- Tag the commit with the marketing version (`release`), and record the build number in the
  release note.

## 6. Archive and upload

```sh
xcodebuild archive -scheme App -configuration Release \
  -destination 'generic/platform=iOS' -archivePath build/App.xcarchive
xcodebuild -exportArchive -archivePath build/App.xcarchive \
  -exportOptionsPlist ExportOptions.plist -exportPath build/export
```

- `ExportOptions.plist` with `method` `app-store-connect` and `destination` `upload` uploads
  directly; authenticate with an App Store Connect API key (`-authenticationKeyPath`,
  `-authenticationKeyID`, `-authenticationKeyIssuerID`) kept in CI secrets. **(memory)**
- Alternatives: Xcode Cloud workflows, or fastlane (`gym` + `pilot`/`deliver`) if the repo uses it.
- For download and install sizes per device, set `thinning` to `<thin-for-all-variants>` in an
  ad-hoc or development export and keep the App Thinning Size Report. **(memory)**

## 7. TestFlight

Verified on 2026-11-07 against https://developer.apple.com/testflight/

- Up to 100 internal testers (team members with Account Holder, Admin, App Manager, Developer or
  Marketing role) and up to 10,000 external testers.
- The first build for external testers needs TestFlight App Review; later builds are sent for review
  automatically when added to a group; beta description and review info are required.
- Public links let anyone join; set criteria (device, OS) and disable the link at the limit.
- Builds expire after 90 days. **(memory)**
- TestFlight is not for paid distribution; demos and betas do not belong on the App Store (2.2).

## 8. Release

Verified on 2026-11-07 against
https://developer.apple.com/help/app-store-connect/update-your-app/release-a-version-update-in-phases/

- Phased release for automatic updates over 7 days: 1 %, 2 %, 5 %, 10 %, 20 %, 50 %, 100 %.
  Pause for up to 30 days in total; anyone can still download manually.
- Choose manual release after approval when the backend or marketing must line up.
- Watch crashes, hangs and launch time per version in Xcode Organizer and MetricKit during the
  rollout; pause on a regression and hand defects to `fix-bug`.
- Expedited review exists for critical fixes; do not rely on it. **(memory)**
- A server-side feature flag is the only instant rollback for a shipped binary — plan one for risky
  features. **(memory)**

## 9. Pre-submission checklist

- [ ] Built with an accepted Xcode/SDK; deployment target ≥ the store minimum; launch screen present.
- [ ] Version increased, build number unique; tag and changelog match.
- [ ] `PrivacyInfo.xcprivacy` current for app and every SDK; privacy report matches the labels.
- [ ] Purpose strings for every permission; app works when each is denied.
- [ ] Account deletion in-app if accounts can be created; privacy policy link in app and metadata.
- [ ] Login rule 4.8 satisfied; demo account and review notes ready (`templates/review-notes.md`).
- [ ] Screenshots per required device size, light mode, real app content.
- [ ] Accessibility Nutrition Labels and age-rating answers current.
- [ ] TestFlight build tested by someone other than the author; no crash in the last 24 h.
- [ ] Phased release chosen; rollback plan (feature flag) written in the release note.
