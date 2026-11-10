# Swift and SwiftUI architecture for iOS apps

**Verified on 2026-11-07 against <URL>** = read on that date; **(memory)** = not re-checked, open
the official docs before quoting. Toolchain at writing: Xcode 27.2 (27.3 in beta), Swift 6.4
compiler with language modes 6, 5, 4.2 and 4, iOS 27 SDK, deployment targets down to iOS 15.
Verified on 2026-11-07 against https://developer.apple.com/support/xcode/

## Contents

1. Swift 6 concurrency
2. SwiftUI data flow
3. Navigation and app structure
4. Persistence: SwiftData, Core Data or something else
5. Networking
6. Project layout and dependencies
7. Testing patterns
8. Performance and diagnostics
9. Common pitfalls

## 1. Swift 6 concurrency

- Swift 6 language mode turns data-race checks into errors. Settings for an app target **(memory —
  confirm names in Xcode's build settings)**: `SWIFT_VERSION = 6`, `SWIFT_DEFAULT_ACTOR_ISOLATION =
MainActor` (default main-actor isolation, SE-0466), `SWIFT_APPROACHABLE_CONCURRENCY = YES` (turns on
  `NonisolatedNonsendingByDefault` and related upcoming features). In a package:
  `swiftSettings: [.defaultIsolation(MainActor.self), .enableUpcomingFeature("NonisolatedNonsendingByDefault")]`
  for UI modules; leave pure model/networking modules nonisolated.
- Swift 6.2 introduced "approachable concurrency": main-actor-by-default mode, async functions that
  run in the caller's context, and `@concurrent` to make parallel work explicit. Verified on
  2026-11-07 against https://www.swift.org/blog/swift-6.2-released/
- With main-actor default isolation an unannotated `nonisolated` async method runs on the main
  actor; mark work that must leave it `@concurrent` (Apple's own document APIs switched to
  `@concurrent` in iOS 27 for this reason). Verified on 2026-11-07 against
  https://developer.apple.com/documentation/ios-ipados-release-notes/ios-ipados-27-release-notes
- Swift 6.4 adds: async calls in `defer` are awaited (SE-0493), `withTaskCancellationShield` for
  cleanup that must finish (SE-0504), fine-grained continuous change notifications for
  `@Observable` (SE-0506), `some T?` without parentheses (SE-0521). Verified on 2026-11-07 against
  https://www.swift.org/blog/swift-6.4-released/
- Rules:
  - Views, `@Observable` UI models and anything touching UIKit/SwiftUI are `@MainActor`.
  - Shared mutable state that is not UI lives in an `actor` (a cache, a token store, a sync engine).
  - Types crossing isolation are `Sendable` value types; reference types are `final` and immutable
    or actors. `@unchecked Sendable` needs a comment proving the lock discipline.
  - Start work from `.task { }` / `.task(id:)` so it is cancelled with the view; check
    `Task.isCancelled` or call `try Task.checkCancellation()` in loops.
  - Structured concurrency first (`async let`, `withThrowingTaskGroup`); `Task { }` only at an
    event boundary (a button action); `Task.detached` almost never.
  - Never block an actor with semaphores or `DispatchGroup.wait`; bridge callbacks with
    `withCheckedThrowingContinuation` and resume exactly once.
- Migrate a large Swift 5 codebase module by module: enable complete checking as warnings, fix,
  switch the module to Swift 6 mode. **(memory)**

## 2. SwiftUI data flow

- `@Observable` (Observation framework, iOS 17+) for models; views re-render only for properties
  they read. **(memory)**
- Ownership:
  - `@State` — values and `@Observable` models the view owns.
  - Plain `let` / `var` — a model passed in by a parent (no wrapper needed for `@Observable`).
  - `@Bindable` — to create bindings into an `@Observable` passed in.
  - `@Environment(Model.self)` — app-wide models injected with `.environment(model)` at the root.
  - `@Binding` — a value owned by a parent.
  - `@AppStorage` / `@SceneStorage` — small preferences and per-scene UI state only. **(memory)**
- New in Xcode 27: `@State` is a macro that evaluates its initial value once instead of on every
  view re-instantiation (back-deploys to iOS 17-aligned OSes). Do not both give an initial value at
  the declaration and assign in `init`; composing `@State` with other wrappers is unsupported.
  Verified on 2026-11-07 against
  https://developer.apple.com/documentation/ios-ipados-release-notes/ios-ipados-27-release-notes
- Keep `body` cheap and side-effect free; extract subviews so invalidation stays local; pass only
  the data a subview needs.
- Derived values are computed properties on the model, not extra stored state kept in sync with
  `onChange`.
- `ObservableObject`/`@Published` remains for iOS 16 targets or Combine pipelines; do not mix both
  styles in one feature. **(memory)**

## 3. Navigation and app structure

- `App` → `WindowGroup` → root `TabView` (top-level sections) → `NavigationStack(path:)` per tab, or
  `NavigationSplitView` for list–detail on iPad. **(memory)**
- Navigation state is a typed value (`[Route]` where `Route: Hashable, Codable`) owned by a router
  model, so deep links, state restoration and tests can set it. `navigationDestination(for:)` maps
  routes to views.
- `TabView` selection must be a visible tab in iOS 27; selecting a hidden tab may crash. Verified on
  2026-11-07 against
  https://developer.apple.com/documentation/ios-ipados-release-notes/ios-ipados-27-release-notes
- UIKit apps built with the latest SDK must use the scene-based life cycle; SwiftUI `App` does this
  already. Same source.
- Universal links over custom URL schemes; `canOpenURL` is deprecated in iOS 27 — open and handle
  failure instead. Same source.

## 4. Persistence

| Need                                                      | Choose                                           |
| --------------------------------------------------------- | ------------------------------------------------ |
| Settings, flags, small values                             | `@AppStorage` / `UserDefaults`                   |
| Secrets, tokens                                           | Keychain (a small wrapper actor)                 |
| Object graph, new app, iOS 17+ target                     | SwiftData (`@Model`, `ModelContainer`, `@Query`) |
| Existing Core Data stack, complex migrations, iOS 16-     | Core Data (`NSPersistentContainer`)              |
| Heavy SQL, full-text search, precise control over queries | SQLite via a package (e.g. GRDB) — record an ADR |
| Files, documents, media                                   | File system / `DocumentGroup`                    |

Mostly **(memory)**. Notes:

- SwiftData: write on a `@ModelActor` for background imports; keep `ModelContext` on its actor; plan
  schema versions with `VersionedSchema` and a `SchemaMigrationPlan` before the first release.
  **(memory)** iOS 27 fixed a deadlock when saving on a background actor while `@Query` observes —
  test background saves on the oldest OS you support. Verified on 2026-11-07 against the iOS 27
  release notes above.
- CloudKit sync (SwiftData or `NSPersistentCloudKitContainer`) requires optional or defaulted
  attributes and no unique constraints. **(memory)**
- Offline: the store is the source of truth for screens; the network refreshes it. Queue writes
  with an id per change so retries are idempotent.

## 5. Networking

- One `APIClient` protocol per backend; the live implementation wraps `URLSession` async/await
  (`data(for:)`), decodes with `JSONDecoder` into `Decodable` DTOs and maps to domain types.
  Features depend on the protocol; tests and previews use fakes.
- Configure the session: request timeout well below the 60 s default (e.g. 15 s), `waitsForConnectivity`
  where offline queuing helps, no shared mutable state in delegates. **(memory)**
- Typed errors (`offline`, `unauthorised`, `server(status)`, `decoding`) mapped to user copy; retry
  idempotent requests with backoff; honour `Retry-After`.
- Auth: tokens in the Keychain; refresh in an actor so concurrent 401s trigger one refresh.
- App Transport Security stays on (HTTPS only); add exceptions per domain with a reason. iOS 27
  tightens TLS for some system processes. Verified on 2026-11-07 against the iOS 27 release notes.
- `AsyncImage` now caches with HTTP caching headers and accepts a custom `URLSession`
  (`asyncImageURLSession(_:)`) in iOS 27. Same source.
- Generate the client from the backend's OpenAPI with `swift-openapi-generator` when the repo has a
  spec; keep generated code out of review diffs. **(memory)**
- Never ship API secrets in the binary; anything in the app can be extracted.

## 6. Project layout and dependencies

```text
App/                      # thin app target: App struct, composition root, assets, Info.plist
  Config/                 # Base.xcconfig, Debug.xcconfig, Release.xcconfig, Local.xcconfig (ignored)
Packages/
  Features/               # one library product per feature: views + @Observable models
  Core/                   # domain types, APIClient protocol + live client, persistence, logging
  DesignSystem/           # colours, typography helpers, shared components
AppTests/  AppUITests/    # or tests inside each package
PrivacyInfo.xcprivacy
```

- The composition root (in `App/`) builds live dependencies and injects them; features never import
  each other — shared code moves to `Core`.
- Swift Package Manager only; commit `Package.resolved`; pin exact or up-to-next-minor versions;
  review a dependency's privacy manifest before adding it. SwiftPM uses Swift Build by default and
  can emit an SBOM (SE-0509) since Swift 6.4. Verified on 2026-11-07 against
  https://www.swift.org/blog/swift-6.4-released/
- Reduce `.pbxproj` merge conflicts with buildable folders (Xcode 16+) or a generator (XcodeGen,
  Tuist) if the repo already uses one. **(memory)**
- Lint and format with `swift format` (ships with the toolchain) or SwiftLint, in CI. **(memory)**

## 7. Testing patterns

- **Swift Testing** for unit and integration tests: `@Test` functions, `@Suite` types, `#expect`
  and `#require`, parameterised `arguments:`, traits (`.tags`, `.timeLimit`, `.disabled`,
  `.serialized`), `confirmation` for events, exit tests and attachments (Swift 6.2). **(trait names
  from memory)**
- Swift 6.4: `XCTAssert` works inside Swift Testing and `#expect` inside XCTest (ST-0021);
  `swift test` repeats individual cases. Verified on 2026-11-07 against
  https://www.swift.org/blog/swift-6.4-released/ — Xcode 27 flags cross-framework assertions with
  a test-plan setting. Verified on 2026-11-07 against
  https://developer.apple.com/documentation/xcode-release-notes/xcode-27-release-notes
- Test models through their public API with fake clients; test the live client against a
  `URLProtocol` stub with recorded JSON; test decoding with fixtures from the real API.
- **XCUITest** (XCTest UI automation) for journeys: `XCUIApplication().launchArguments` switches to
  fake data and disables animations; query by `accessibilityIdentifier`; wait with
  `waitForExistence(timeout:)`, never `sleep`. Launch performance with `XCTApplicationLaunchMetric`.
  **(memory)**
- Run from the command line so CI and humans run the same thing:

```sh
xcrun simctl list devices available            # pick names that exist on this Xcode
xcodebuild test -scheme App -testPlan App \
  -destination 'platform=iOS Simulator,name=<smallest iPhone>' \
  -destination 'platform=iOS Simulator,name=<largest iPhone>' \
  -resultBundlePath build/App.xcresult
```

- Previews (`#Preview`) for every state with fake data; they are not tests.

## 8. Performance and diagnostics

- Hangs: Apple tools report when the main run loop is busy for more than 250 ms; under 100 ms is
  rarely noticed. Verified on 2026-11-07 against
  https://developer.apple.com/documentation/xcode/understanding-hangs-in-your-app
- Launch: Xcode Organizer's Launch Time pane shows time to first screen at p50 and p90; MetricKit
  reports launch and resume histograms. Keep work out of `init` of the `App` and first view; defer
  SDK set-up. Verified on 2026-11-07 against
  https://developer.apple.com/documentation/xcode/reducing-your-app-s-launch-time
- MetricKit in iOS 27: new Swift `MetricManager` delivers `MetricReport`/`DiagnosticReport` through
  `AsyncStream`; `MXMetricManager` is no longer recommended for new code; memory-limit terminations
  get a `MemoryExceptionDiagnostic`. Verified on 2026-11-07 against the iOS 27 release notes.
- Instruments: App Launch, Time Profiler, Hangs, SwiftUI, Allocations, Leaks, Network; Xcode 27
  adds a Swift Executors instrument (main actor and cooperative pool tracks). Verified on
  2026-11-07 against the Xcode 27 release notes.
- Logging with `Logger` (subsystem, category), interpolations `privacy: .private` by default for
  user data. **(memory)**

## 9. Common pitfalls

- Heavy work in `body`, `init` of a view, or a computed property read by `body`.
- `.onAppear { Task { … } }` instead of `.task` — the work outlives the view.
- Capturing `self` strongly in long-lived closures or `NotificationCenter` observers.
- Decoding on the main actor for large payloads; images decoded at full size in lists.
- `List` with unstable ids (`id: \.self` on mutable values) causing reloads and lost state.
- Assuming one window: iPad and iPhone Duo can show several scenes; keep state per scene.
- Testing only on the newest OS; the deployment target's oldest OS is where crashes hide.
- A SwiftPM-built binary records the deployment target as its SDK version (`otool -l` → `LC_BUILD_VERSION sdk`), and
  newer system frameworks gate behaviour on the linked SDK: on macOS 27 Translation reported installed packs as
  `notInstalled` to an "SDK 26" binary. Pass `-Xlinker -platform_version -Xlinker macos <min> -Xlinker <xcrun sdk>` in
  every build path and fail the build when `otool` shows another SDK.
