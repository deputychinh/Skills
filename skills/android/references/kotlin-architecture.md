# Kotlin app architecture, data, concurrency and tests

Tags: **Verified on 2026-11-07 against <URL>** = read on that date; **(memory)** = not re-checked
online, confirm before quoting. "Strongly recommended" and "Recommended" are the official guide's
own priorities. The repo's conventions win where they differ.

## Contents

1. Toolchain
2. Layers
3. UI state and unidirectional data flow
4. Dependency injection with Hilt
5. Persistence: Room and DataStore
6. Background work: WorkManager
7. Navigation for Compose
8. Coroutines and Flow pitfalls
9. Test patterns and commands
10. Module layout
11. Performance tooling

## 1. Toolchain

- Kotlin 2.4.21 (2026-10-08) is the newest stable; 2.4.0 (2026-06-03) is the language release.
  Verified on 2026-11-07 against https://kotlinlang.org/docs/releases.html
- Android Gradle Plugin 9.5: Gradle 9.6.0 minimum, JDK 17, SDK Build Tools 36.0.0, supports up to
  API 37. Verified on 2026-11-07 against
  https://developer.android.com/build/releases/gradle-plugin
- Android Studio stable is Rabbit 2 | 2026.2.2 Patch 1. Verified on 2026-11-07 against
  https://developer.android.com/studio/releases
- AGP 9 compiles Kotlin itself (built-in Kotlin), so the separate `org.jetbrains.kotlin.android`
  plugin is dropped; keep the Compose compiler plugin. **(memory)**
- Use KSP, not kapt, for Room and Hilt code generation. **(memory)**

## 2. Layers

Verified on 2026-11-07 against https://developer.android.com/topic/architecture/recommendations

- **Data layer — strongly recommended.** Repositories expose app data and hold most business logic;
  create a repository even for a single source. UI and ViewModels never touch databases,
  DataStore, location, Bluetooth or connectivity providers directly.
- **UI layer — strongly recommended.** Jetpack Compose, single activity, ViewModels as screen-level
  state holders, plain state-holder classes for reusable components.
- **Domain layer — recommended in big apps.** Use cases (`GetSortedNotesUseCase`, one public
  `operator fun invoke`) only when logic is reused across ViewModels or a ViewModel grows too big.
- **Coroutines and flows between layers — strongly recommended.**
- **A model per layer — recommended in complex apps:** network DTO → database entity → domain or UI
  model; mapping lives at the boundary that owns the source.
- Naming: streams `getNotesStream(): Flow<List<Note>>`; implementations named by behaviour
  (`OfflineFirstNotesRepository`), else `Default…`; fakes `Fake…`.

## 3. UI state and unidirectional data flow

Verified on 2026-11-07 against https://developer.android.com/topic/architecture/recommendations

- ViewModels expose state through one `uiState: StateFlow<…>` (several only for unrelated data) and
  receive actions as method calls. Build it with `stateIn(viewModelScope,
SharingStarted.WhileSubscribed(5_000), initial)` when it comes from streams; a private
  `MutableStateFlow` exposed read-only for simple cases.
- `ScreenUiState` is a data class (data + loading + error) or a sealed interface when states are
  exclusive (`Loading`, `Empty`, `Error(message, canRetry)`, `Success(items)`).
- Do not send one-off events from ViewModel to UI — handle the event in the ViewModel and reflect
  the outcome in state (for example `userMessage: String?` cleared by `onMessageShown()`).
- Collect with `collectAsStateWithLifecycle()`; use `LifecycleStartEffect` /
  `LifecycleResumeEffect` instead of overriding activity callbacks.
- ViewModels hold no `Context`, `Activity`, `Resources` or `Application`; do not use
  `AndroidViewModel`. String resources resolve in the UI (`stringResource`).
- Keep input the user typed in `SavedStateHandle` or `rememberSaveable` so process death does not
  lose it. **(memory)**
- Hoist state to the lowest common owner; stateless composables take `state` and `onX` lambdas,
  which also makes previews and screenshot tests trivial.

## 4. Dependency injection with Hilt

Verified on 2026-11-07 against https://developer.android.com/topic/architecture/recommendations

- Constructor injection everywhere (strongly recommended); Hilt when the app has several
  ViewModels, WorkManager or back-stack-scoped ViewModels (recommended); manual DI is fine for a
  tiny app.
- Scope (`@Singleton`) only types that hold shared mutable data or are expensive to create.
- `@HiltAndroidApp` application, `@AndroidEntryPoint` activity, `@HiltViewModel` + `hiltViewModel()`
  in the screen composable, `@HiltWorker` for workers. **(memory)**
- Bind interfaces with `@Binds` in a module per layer; tests replace them with
  `@TestInstallIn` modules that bind fakes. **(memory)**
- Inject `CoroutineDispatcher`s with qualifiers (`@IoDispatcher`) so tests can pass a test
  dispatcher. **(memory)**

## 5. Persistence: Room and DataStore

- Room is the single source of truth for lists and anything shown offline; DAOs return `Flow` for
  queries and `suspend` for writes. **(memory)**
- Every schema change ships a migration; `exportSchema = true` with the schema directory committed,
  and `MigrationTestHelper` tests each migration. Destructive fallback only for caches you can
  rebuild. **(memory)**
- Offline-first read path: UI observes the DAO flow; refresh fetches from the network and writes to
  Room in one transaction; errors become state, cached data stays visible. **(memory)**
- Writes the user makes offline are stored locally with a pending flag and synced by WorkManager.
  **(memory)**
- DataStore (Preferences or typed with a serializer) for small key-value settings; one instance
  per file per process; never on the main thread. Do not use `SharedPreferences` in new code.
  **(memory)**
- Sensitive values (tokens) are encrypted with a Keystore-backed key; never logged. **(memory)**

## 6. Background work: WorkManager

- WorkManager for deferrable work that must finish even if the app exits (sync, upload, cleanup);
  set constraints (network, charging), exponential backoff, unique work names to avoid duplicates.
  **(memory)**
- Expedited work for short user-initiated jobs; apps targeting Android 12+ cannot start
  foreground services from the background. Verified on 2026-11-07 against
  https://developer.android.com/google/play/requirements/target-sdk
- Coroutines in a ViewModel are for work tied to the screen; work that must outlive the screen goes
  to WorkManager or an application-scoped `CoroutineScope` injected by Hilt. **(memory)**
- Test workers with `work-testing` (`TestListenableWorkerBuilder`). **(memory)**

## 7. Navigation for Compose

- Single activity; Navigation 3 is the recommended library for navigating between screens and
  deep links. Verified on 2026-11-07 against
  https://developer.android.com/topic/architecture/recommendations
- Navigation 3 stable is 1.2.1; 1.3.0 is in alpha. Verified on 2026-11-07 against
  https://developer.android.com/jetpack/androidx/releases/navigation3
- In Navigation 3 the app owns the back stack (a list of serializable `NavKey`s) and `NavDisplay`
  renders it; scenes let adaptive layouts show list and detail together on wide windows.
  **(memory)**
- Navigation arguments are ids, never whole objects; the destination's ViewModel loads by id.
  **(memory)**
- Navigation 2 (`NavHost` with type-safe routes) remains fine in existing apps; do not migrate
  without a reason recorded in an ADR. **(memory)**

## 8. Coroutines and Flow pitfalls

- ViewModels call suspend functions in `viewModelScope`; repositories and data sources are
  main-safe (switch dispatcher inside). **(memory, per the official coroutines best practices)**
- Never `GlobalScope`; never `runBlocking` outside tests and `main`.
- `catch (e: Exception)` around suspend calls must rethrow `CancellationException`, or
  cancellation breaks; prefer `runCatching` only with an explicit rethrow. **(memory)**
- Cold `Flow` from repositories; hot `StateFlow` only at the ViewModel; `stateIn` with
  `WhileSubscribed(5_000)` stops upstream work while the app is in the background but survives
  rotation.
- `flatMapLatest` for "query changes → new search", `combine` for joining streams, `distinctUntilChanged`
  before expensive work, `debounce` on search input. **(memory)**
- `MutableStateFlow.update { }` instead of read-modify-write on `value` to avoid lost updates.
  **(memory)**
- Long CPU work uses `Dispatchers.Default` and checks `ensureActive()`; blocking I/O uses the
  injected I/O dispatcher. **(memory)**

## 9. Test patterns and commands

Verified on 2026-11-07 against https://developer.android.com/topic/architecture/recommendations

- Minimum set: unit tests for ViewModels (including flows), for repositories and data sources, UI
  navigation tests, and Macrobenchmark for startup and rendering.
- Prefer fakes to mocks; assert `StateFlow.value` where possible.
- ViewModel tests: `runTest`, `Dispatchers.setMain(UnconfinedTestDispatcher())` in a JUnit rule,
  fakes for repositories, Turbine (`flow.test { awaitItem() }`) for sequences. **(memory)**
- Room tests: in-memory database (`Room.inMemoryDatabaseBuilder`) under Robolectric or
  instrumented. **(memory)**
- Compose UI tests: `createComposeRule()` (or `createAndroidComposeRule<…>()`), find by
  `onNodeWithText` / `onNodeWithContentDescription`, `testTag` only when no accessible text exists;
  run on the JVM with Robolectric for speed, on a device for journeys. **(memory)**
- Screenshot tests: with AGP 9.5+, use AGP test suites (`testOptions.screenshotTests.create("screenshotTest")`,
  flags `android.experimental.enableScreenshotTest=true` and `android.experimental.testSuiteSupport=true`),
  previews annotated `@PreviewTest` in `src/screenshotTest/kotlin`, then
  `./gradlew updateScreenshotTestDefaultDebugTestSuite` and `./gradlew testScreenshotTestDefaultDebugTestSuite`
  (task names follow `update|test{Suite}{Target}{Variant}TestSuite`). The standalone
  `com.android.compose.screenshot` plugin is no longer maintained; both are experimental.
  Verified on 2026-11-07 against
  https://developer.android.com/studio/preview/compose-screenshot-testing-with-testsuites
- Multi-preview each screen for light/dark, font scale 2.0 and compact/expanded widths so one
  annotation covers the evidence matrix.
- Commands on a named emulator:

  ```sh
  emulator -list-avds                       # pick a name, e.g. Pixel_9_API_37
  emulator -avd Pixel_9_API_37 -no-snapshot-load -no-boot-anim &
  adb wait-for-device && adb shell getprop sys.boot_completed   # wait for "1"
  adb devices                               # exactly one device, or pass -s / ANDROID_SERIAL
  ./gradlew lint test connectedCheck        # chained; read the exit code, not the tail
  ```

- Gradle managed devices for CI: `testOptions.managedDevices.localDevices.create("pixel9api37") {
device = "Pixel 9"; apiLevel = 37; systemImageSource = "aosp" }`, run
  `./gradlew pixel9api37DebugAndroidTest`, groups with `…GroupDebugAndroidTest`; add
  `-Pandroid.testoptions.manageddevices.emulator.gpu=swiftshader_indirect` on GPU-less runners;
  shard with `android.experimental.androidTest.numManagedDeviceShards`. ATD images
  (`aosp-atd`) are lighter but do not support hardware-rendered screenshots. Verified on
  2026-11-07 against https://developer.android.com/studio/test/gradle-managed-devices
  (device profile and API 37 image availability: confirm locally).

## 10. Module layout

A layout that scales from one developer to a team (**memory**, modelled on the official
"Now in Android" sample):

```text
app/                    activity, navigation graph, Hilt application, theme wiring
core/model              plain Kotlin models (no Android)
core/data               repositories, sync
core/database           Room database, DAOs, entities, migrations
core/datastore          DataStore setup
core/network            API client, DTOs
core/designsystem       theme, shared components
core/testing            fakes, test rules, test dispatchers
feature/<name>/         screen composables + ViewModel (+ api/impl split when big)
benchmark/              Macrobenchmark tests
baselineprofile/        Baseline Profile generator
build-logic/            convention plugins (shared Gradle config)
```

- Features depend on `core:*`, never on other features; navigation between features goes through
  keys defined in a small `api` module.
- Convention plugins in `build-logic` keep `compileSdk`, `minSdk`, Compose and lint settings in one
  place; module build files stay a few lines.

## 11. Performance tooling

- R8 in full mode, Baseline Profiles and Startup Profiles, and Macrobenchmark are all strongly
  recommended. Verified on 2026-11-07 against
  https://developer.android.com/topic/architecture/recommendations
- Baseline Profiles speed code execution about 30 % from first launch; Startup Profiles (DEX layout)
  add about 15 % more startup gain. Generate from a non-obfuscated variant with
  `BaselineProfileRule` and `./gradlew :app:generateBaselineProfile`; release stays minified and R8
  rewrites the rules. Internal app sharing does not apply profiles; the internal testing track does.
  Verified on 2026-11-07 against https://developer.android.com/topic/performance/baselineprofiles/overview
- Measure with `MacrobenchmarkRule`: `StartupTimingMetric` (cold, warm), `FrameTimingMetric` for
  scroll jank, on a physical device with the battery optimisations off. **(memory)**
- Compose jank: stable parameters (immutable data classes, `ImmutableList`), lambdas that read
  state late, `derivedStateOf` for thresholds, `key`s in lazy lists; check with the Layout
  Inspector recomposition counts. **(memory)**
