# Native mobile presets: `ios-swiftui` and `android-compose`

A product with mobile apps keeps one native codebase per store: Swift and SwiftUI for the App Store,
Kotlin and Jetpack Compose for Google Play. Both apps call the same backend API as the web app, so
the API contract (OpenAPI from `backend`) is the shared part, not UI code. Screens, navigation and
platform conventions belong to the `ios` and `android` skills; this file only sets up a green repo.

Notes are marked "Verified on 2026-11-07 against <URL>" or "(memory)".

## Contents

1. [Layout](#1-layout)
2. [iOS preset `ios-swiftui`](#2-ios-preset-ios-swiftui)
3. [Android preset `android-compose`](#3-android-preset-android-compose)
4. [Makefile targets](#4-makefile-targets)
5. [CI jobs](#5-ci-jobs)
6. [Signing secrets never enter the repo](#6-signing-secrets-never-enter-the-repo)
7. [Prove it](#7-prove-it)

## 1. Layout

The delivery profile's `mobile` key says which apps exist and how they are laid out; when it is
absent, `ship` asked at triage, and with no answer the default is a monorepo.

| Layout         | Shape                                                                              | Choose when                                                         |
| -------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| monorepo       | `backend/` or `services/api`, `web/`, `ios/`, `android/`, one root Makefile and CI | one team or one person; an API change and both apps move in one PR  |
| separate repos | `<name>-api`, `<name>-ios`, `<name>-android`, each bootstrapped by this skill      | separate teams, separate release cadences, or store access per team |

Either way each app has its own scope in `commitlint.config.mjs` (`ios`, `android`), its own CI job,
its own version numbers and its own CHANGELOG section heading, because the stores release them
independently. The API client in each app is generated from (or checked against) the OpenAPI file,
so a breaking API change fails the app's CI, not a user's phone.

## 2. iOS preset `ios-swiftui`

- Create the project in Xcode (App template, SwiftUI interface, Swift Testing or XCTest, a UI-test
  target) inside `ios/`, or as a Swift package plus a thin app target. Commit the `.xcodeproj` (or
  the generator spec if the team uses XcodeGen or Tuist) and a shared scheme, because
  `xcodebuild` in CI only sees shared schemes (memory).
- Format: `swift format` ships in the Swift 6 toolchain (Xcode 16 and later); run
  `swift format lint --strict --recursive Sources Tests` in `lint`, so warnings fail the gate.
  Verified on 2026-11-07 against https://github.com/swiftlang/swift-format
- Lint: SwiftLint with `.swiftlint.yml` at `ios/`; `swiftlint lint --strict` treats warnings as
  errors. Install with Homebrew in CI, or the `SwiftLintBuildToolPlugin` from the SwiftLintPlugins
  package for local builds. Verified on 2026-11-07 against https://github.com/realm/SwiftLint
- Test: `xcodebuild test` with `-scheme`, `-destination 'platform=iOS Simulator,name=<iPhone model>'`
  and `-resultBundlePath build/tests.xcresult`; pick an installed model with
  `xcrun simctl list devices available`. Turn on code coverage in the scheme and keep the
  threshold in `docs/testing.md` (start at 80 % for view models and domain code).
- Versions: marketing version (`CFBundleShortVersionString`, shown to users) and build number
  (`CFBundleVersion`, one per uploaded build). Set them in build settings (`MARKETING_VERSION`,
  `CURRENT_PROJECT_VERSION`), never by hand in two places. Verified on 2026-11-07 against
  https://developer.apple.com/documentation/bundleresources/information-property-list/cfbundleversion
- `.gitignore` additions: `xcuserdata/`, `DerivedData/`, `build/`, `*.xcresult`, `fastlane/report.xml`.

## 3. Android preset `android-compose`

- Create the project with Android Studio's "Empty Activity" (Compose) template in `android/`, Kotlin
  DSL (`build.gradle.kts`), a version catalog (`gradle/libs.versions.toml`) and the Gradle wrapper
  committed (`gradlew`, `gradle/wrapper/`), because CI must use the same Gradle as the developer.
- Lint and format: pick one and record it in ADR 0001.
  - ktlint through a Gradle plugin (`ktlintCheck` / `ktlintFormat`) — formatting and style only (memory).
  - detekt (`id("dev.detekt")`, `./gradlew detekt`) for code smells, with its ktlint rule-set
    wrapper if you want both in one tool. Verified on 2026-11-07 against https://detekt.dev/docs/intro
  - Plus Android Lint (`./gradlew lint`) with `warningsAsErrors = true` (memory).
- Test: `./gradlew test` (local JVM tests: view models, domain, repositories with fakes) on every
  push; `./gradlew connectedCheck` (Compose UI tests with `createComposeRule`) on an emulator in CI
  or nightly. Coverage with Kover or JaCoCo; threshold in `docs/testing.md` (memory).
- Versions: `versionCode` (a positive integer, greater for every upload, at most 2100000000) and
  `versionName` (the string users see) in `defaultConfig`. Verified on 2026-11-07 against
  https://developer.android.com/studio/publish/versioning
- `.gitignore` additions: `.gradle/`, `build/`, `local.properties`, `*.apk`, `*.aab`, `captures/`.

## 4. Makefile targets

Add per app, and chain them into `lint`, `test` and `ci` only for the apps that exist:

```make
IOS := cd ios &&
ANDROID := cd android &&
IOS_DEST ?= platform=iOS Simulator,name=iPhone 17

ios-lint: ## Swift format check and SwiftLint (warnings fail)
	$(IOS) swift format lint --strict --recursive . && swiftlint lint --strict

ios-test: ## Unit and UI tests on a simulator
	$(IOS) xcodebuild test -scheme App -destination '$(IOS_DEST)' -resultBundlePath build/tests.xcresult

android-lint: ## ktlint or detekt, plus Android Lint
	$(ANDROID) ./gradlew ktlintCheck lint

android-test: ## Local JVM tests
	$(ANDROID) ./gradlew test
```

`IOS_DEST` names a simulator that exists on the machine; override it per run when it does not
(`make ios-test IOS_DEST='platform=iOS Simulator,name=<model>'`). Swap `ktlintCheck` for `detekt`
if ADR 0001 chose detekt.

## 5. CI jobs

iOS builds need macOS, so the iOS job runs on a macOS runner (on GitHub-hosted runners
`macos-latest` is macOS 26 on arm64 today; `xcode-27` is also a label). macOS minutes cost more
than Linux, so run the iOS job only when `ios/` or the API contract changed
(`paths:` filter). Verified on 2026-11-07 against
https://docs.github.com/en/actions/reference/runners/github-hosted-runners

```yaml
ios:
  runs-on: macos-latest
  defaults:
    run:
      working-directory: ios
  steps:
    - uses: actions/checkout@v4
    - run: brew install swiftlint
    - run: swift format lint --strict --recursive . && swiftlint lint --strict
    - run: |
        xcodebuild test -scheme App \
          -destination "platform=iOS Simulator,name=$(xcrun simctl list devices available | grep -m1 -o 'iPhone [^(]*' | sed 's/ *$//')" \
          -resultBundlePath build/tests.xcresult

android:
  runs-on: ubuntu-latest
  defaults:
    run:
      working-directory: android
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-java@v4
      with:
        distribution: temurin
        java-version: '21'
    - uses: gradle/actions/setup-gradle@v4
    - run: ./gradlew ktlintCheck lint test
```

Pin action versions to what the repo already uses (memory for the exact majors above). Store
uploads (TestFlight, Play internal track) are a `release` concern, run from a separate workflow on
tags, never on every push.

## 6. Signing secrets never enter the repo

- Never commit: `.p12` certificates, provisioning profiles (`*.mobileprovision`), App Store Connect
  API keys (`AuthKey_*.p8`), Android upload keystores (`*.jks`, `*.keystore`),
  `keystore.properties`, `google-services.json` or `GoogleService-Info.plist` with production keys
  when the repo is public. Add them to `.gitignore` in the bootstrap commit.
- CI receives them as encrypted secrets (base64 of the keystore or certificate, passwords
  separately) and writes them to a temporary keychain or file during the job, deleted at the end.
  fastlane `match` with a private, encrypted storage repo is an alternative for iOS (memory).
- Prefer Play App Signing, so the key that signs what users install stays with Google and a lost
  upload key can be reset (memory).
- `release` runs `gitleaks` over history before every store upload; a leaked key is revoked and
  rotated, not just deleted, because git history keeps it.

## 7. Prove it

`make ios-lint ios-test android-lint android-test` green, then the app launched once on a simulator
and an emulator by `verify-app` in mobile mode (README quick start, word for word), with a
screenshot of the first screen talking to the local API. A simulator reaches the host's `localhost`;
an Android emulator reaches it as `10.0.2.2`, so the debug API base URL differs per platform and
lives in build configuration, not in code (memory).
