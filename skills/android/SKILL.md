---
name: android
description: Use when building or changing a native Android app in Kotlin — a screen, ViewModel, repository, Room table, background job, Gradle module, build variant, signing setup or Play Store release — even when the request only says "Android", "the app", "Compose", "APK", "AAB", "Play Store" or "it crashes on my phone". Produces Jetpack Compose UI on Material 3 with adaptive layouts, edge-to-edge and every state, the official layered architecture (UI → optional domain → data, UDF, StateFlow, Hilt), offline-first data with Room and DataStore, safe coroutines, TalkBack-ready accessibility, per-app languages, unit, Compose UI and screenshot tests run on a named emulator, Macrobenchmark and Baseline Profiles, and an app bundle ready for Play. The iOS app is a separate Swift codebase owned by `ios`; web UI is `frontend`. Inside a delivery, `ship` and `deliver-loop` call this skill and hand the store path to `release`.
---

# android — a Kotlin app that adapts to every window, survives every state and passes Play review

Follow the repo's `CLAUDE.md`, `docs/conventions.md` and the existing app module first; this skill
fills gaps and never overrides them. A product with mobile apps keeps one native codebase per store:
this skill owns the Android one (Kotlin, Jetpack Compose); the iOS one belongs to `ios`. Shared
behaviour is agreed in the spec and the API contract (`backend`), never by sharing UI code between
the two. Reply language, autonomy and push policy come from the delivery profile (see the repo
README).

Current toolchain (verified 2026-11-07, details and URLs in the references): Kotlin 2.4.21, Android
Gradle Plugin 9.5 (Gradle 9.6, JDK 17), Compose BOM 2026.09.00, Android 17 = API 37 is the newest
platform, Google Play requires `targetSdk` 36 for new apps and updates since 2026-08-31. Re-check
these before a new project; a stale number here is worse than none.

## Workflow

1. **Project setup.** New app: Android Studio's empty Compose template, then one version catalog
   (`gradle/libs.versions.toml`, start from `templates/libs.versions.toml`), Gradle wrapper
   committed, `compileSdk` and `targetSdk` at the newest stable API, `minSdk` chosen from the
   audience (record it in an ADR via `architect`). Modules: `app`, `core:*` (data, database,
   network, designsystem, testing), `feature:*`, plus `benchmark` and `baselineprofile` — start
   with fewer and split when a module has two reasons to change. Build types `debug` and `release`
   (R8 on, `isMinifyEnabled = true`); flavors only for real product differences (for example
   `demo` with fake data and `prod`). Signing stays out of the repo: the upload keystore lives in a
   password manager or CI secret, and `signingConfigs` reads it from environment variables or
   `~/.gradle/gradle.properties`. _Evidence:_ `./gradlew assembleDebug` green from a fresh clone
   and `git grep -nE "storePassword|keyPassword" -- ':!*.md'` returns nothing.
2. **Architecture per the official guide.** UI layer (composables + one `ViewModel` per screen
   exposing `uiState: StateFlow<ScreenUiState>`), domain layer only when logic is reused across
   ViewModels, data layer of repositories that own their sources and are the single source of
   truth. Events flow up as method calls, state flows down; Hilt wires it with constructor
   injection. Write the state table before code: each field, its owner (repository, ViewModel,
   `rememberSaveable`, navigation key) and the screen's states. Details:
   `references/kotlin-architecture.md`. _Evidence:_ the state table in the story; no `Context`,
   `Activity` or `Resources` in any ViewModel (`grep -rn "Context" --include=*ViewModel.kt`).
3. **Screens per Material 3 and adaptive layouts.** Decide per width class (compact < 600 dp,
   medium < 840, expanded < 1200, large < 1600, extra-large) which navigation (bar, rail,
   expanded rail or drawer through `NavigationSuiteScaffold`) and which panes (list–detail,
   supporting pane) the screen uses; never branch on "is tablet". Every screen renders loading,
   empty, error with retry, success and offline; draws edge-to-edge with insets handled; works in
   light, dark and dynamic colour; keeps state across rotation, fold and resize. Rules:
   `references/material3-ui.md`. _Evidence:_ previews for every state in both themes.
4. **Data and offline.** Room is the source of truth for anything shown in a list; the network
   refreshes it. Small preferences live in DataStore (never `SharedPreferences` in new code).
   Deferrable, must-finish work (sync, upload) goes through WorkManager with constraints and
   backoff. Model per layer: network DTO → entity → domain or UI model. _Evidence:_ a test that the
   screen shows cached data with the network faked as down.
5. **Coroutines rules.** `viewModelScope` in ViewModels, injected dispatchers (never hard-coded
   `Dispatchers.IO`), main-safe suspend functions, `stateIn(WhileSubscribed(5_000))` for streams,
   `collectAsStateWithLifecycle()` in composables, no `GlobalScope`, cancellation never swallowed.
   _Evidence:_ `grep -rn "GlobalScope\|runBlocking" app feature core --include=*.kt` empty outside
   tests.
6. **Accessibility.** Touch targets ≥ 48 × 48 dp, every icon-only control has a
   `contentDescription` from string resources, decorative images `null`, text in `sp` and layouts
   that survive 200 % font scale, contrast 4.5:1 for body text and 3:1 for large text and control
   boundaries, state not by colour alone, logical TalkBack order (`semantics { traversalIndex }`
   only when needed). _Evidence:_ a TalkBack pass noted in the story and Compose UI tests that find
   controls by their accessible text.
7. **Localisation.** Every visible string in `res/values/strings.xml` (plurals via `pluralStringResource`),
   numbers and dates through locale-aware formatters, per-app language on with
   `androidResources { generateLocaleConfig = true }` and `res/resources.properties`
   (`unqualifiedResLocale=en-US`). Layouts mirror for RTL. _Evidence:_ `./gradlew lint` with
   `HardcodedText` and `MissingTranslation` as errors, exit 0; one pseudo-locale (`en-XA`, `ar-XB`)
   screenshot looked at.
8. **Tests.** Unit tests (JUnit, fakes over mocks, `kotlinx-coroutines-test`, Turbine for flows)
   for ViewModels and repositories; Compose UI tests (`createComposeRule`, find by text or
   content description) for each state and the main journey, run on the JVM with Robolectric where
   possible; screenshot tests from `@PreviewTest` previews. Instrumented tests run on a named
   emulator: `emulator -list-avds`, `emulator -avd <name> -no-snapshot-load &`,
   `adb wait-for-device`, `adb devices` shows exactly one device, then
   `./gradlew test connectedCheck`. Commands and patterns: `references/kotlin-architecture.md`.
   _Evidence:_ red-then-green test run, then the full chained run, exit 0.
9. **Evidence on real form factors.** Screenshots on a compact phone (≈ 411 × 891 dp), a large phone
   and a tablet or unfolded foldable (≥ 840 dp wide), each in light and dark, plus the largest font
   scale (`adb shell settings put system font_scale 2.0`), captured with
   `adb exec-out screencap -p > docs/delivery/<slug>/evidence/<name>.png` and opened.
   _Evidence:_ the files, each looked at, listed in the story.
10. **Performance.** Macrobenchmark for cold startup (`StartupTimingMetric`) and the main scroll
    (`FrameTimingMetric`) on a physical device or a non-debuggable `benchmark` build; a generated
    Baseline Profile and Startup Profile (`./gradlew :app:generateBaselineProfile`) committed; R8
    full mode on release. Budgets come from `benchmark`. _Evidence:_ before/after numbers
    (median and P90) in the story.
11. **CI.** One workflow: `./gradlew lint test` then instrumented tests on Gradle managed devices
    (`./gradlew <device>DebugAndroidTest` with
    `-Pandroid.testoptions.manageddevices.emulator.gpu=swiftshader_indirect` on runners without a
    GPU), screenshot validation, and `./gradlew bundleRelease` signed from CI secrets. _Evidence:_
    the CI run link and its exit status.
12. **Store path, handed to `release`.** The release artifact is the `.aab` from `bundleRelease`,
    signed with the upload key; Play App Signing holds the app signing key. Upload to the internal
    testing track first, then closed testing (new personal developer accounts need 12 testers opted
    in for 14 days before production), then a staged production rollout (for example 1 % → 10 % →
    50 % → 100 %) watched in Android vitals, halted on a crash or ANR regression. Data safety form,
    privacy policy, account deletion and permission declarations are current before every
    submission. Checklist: `references/google-play.md`. _Evidence:_ the Play Console release
    status and vitals at each step, recorded by `release`.

## Core checklist

1. One `ViewModel` per screen with one immutable `uiState`; composables get state and lambdas, not
   the ViewModel, below the screen level.
2. Repositories expose `Flow` for streams and `suspend` for one-shot calls; ViewModels never touch
   Room, Retrofit or DataStore directly.
3. Every screen: loading, empty, error with retry, success, offline; previews for each.
4. `enableEdgeToEdge()` in the activity, `windowSoftInputMode="adjustResize"`, insets handled by
   `Scaffold` or `safeDrawing` padding; nothing interactive under a system bar.
5. Layout chosen by window size class, tested at compact, medium and expanded widths; no locked
   orientation (ignored on large screens when targeting API 37).
6. Colours, type and shapes from `MaterialTheme`; light, dark and dynamic colour (API 31+) all work.
7. User-visible strings in resources; no string concatenation for sentences; plurals handled.
8. Touch targets ≥ 48 dp, content descriptions on icon-only controls, 200 % font scale usable.
9. Saved state survives process death (`SavedStateHandle`, `rememberSaveable`) — test with
   "Don't keep activities" or `adb shell am kill`.
10. Runtime permissions asked in context, with a rationale and a working path when denied.
11. No secrets, API keys with write access or signing material in the repo or the APK.
12. R8 on for release, Baseline Profile committed, startup and scroll measured.

## Anti-patterns

- `LiveData` or `mutableStateOf` in new ViewModels where a `StateFlow` fits; a `SharedFlow` of
  one-off "events" from the ViewModel — turn the event into state and let the UI consume it.
- `collectAsState()` without lifecycle; `LaunchedEffect(Unit)` that reloads on every
  recomposition of the key; collecting a flow in `init` with no scope policy.
- Passing a `NavController` or ViewModel deep into reusable composables.
- `GlobalScope`, `runBlocking` on the main thread, `catch (e: Exception)` that swallows
  `CancellationException`.
- Hard-coded `Dispatchers.IO` inside repositories, making tests slow and flaky.
- Fixed `dp` heights on text containers, so 200 % font scale clips the copy.
- `screenOrientation="portrait"` as a layout fix; `if (isTablet)` branches.
- Painting a fake status bar colour instead of handling insets.
- Keystore or `google-services.json` with secrets committed; signing passwords in `build.gradle.kts`.
- Requesting every permission on first launch; declaring a permission the data safety form omits.
- Screenshot tests that render on a real device with animations on, so every run differs.

## Evidence before "done"

- Red-then-green unit and Compose UI tests; `./gradlew lint test connectedCheck` chained, exit 0,
  on a named emulator listed by `adb devices`.
- Screenshot test references updated on purpose and the validation task green.
- Screenshots: compact phone, large phone, tablet or foldable; light and dark; largest font scale;
  each opened, stored under `docs/delivery/<slug>/evidence/`.
- TalkBack pass and per-app language check noted in the story.
- Startup and scroll numbers from Macrobenchmark, before and after.
- `./gradlew bundleRelease` green with signing from the environment; then `verify-app`, and
  `release` for the store path.

## References

- `references/material3-ui.md` — Material 3 and M3 Expressive as checkable rules: window size
  classes, navigation, colour roles and dynamic colour, typography, shapes, motion, components,
  touch targets, edge-to-edge, with versions, dates and URLs.
- `references/kotlin-architecture.md` — layers, state and UDF, Hilt, Room, DataStore, WorkManager,
  Navigation for Compose, coroutines and Flow pitfalls, test patterns and commands, module layout.
- `references/google-play.md` — target API requirement, app bundles, Play App Signing, data safety,
  permissions and policy hot spots, testing tracks, staged rollout and halting, Android vitals.
- `templates/libs.versions.toml` — a starting version catalog with the verified versions.
