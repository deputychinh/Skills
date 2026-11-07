---
name: ios
description: Use when building or changing a native iOS (iPhone/iPad) app in Swift — a screen, SwiftUI view, @Observable model, navigation, networking client, SwiftData or Core Data store, widget, test, Xcode project setting or App Store build — even for a small tweak or when the request only says "iPhone app", "iOS", "Swift", "SwiftUI", "Xcode", "TestFlight" or "the app crashes on iPhone". Produces Swift 6 code with strict concurrency, feature modules behind protocols, screens that follow the current Human Interface Guidelines (Liquid Glass, Dynamic Type, VoiceOver, dark mode) in every state, string catalogs, Swift Testing and XCUITest runs on named simulators, screenshots on the smallest and largest devices, launch and hang checks, and a store-ready build with a privacy manifest. Android is `android`; web UI is `frontend`. Inside a delivery, `ship` and `deliver-loop` call this skill and hand the store path to `release`.
---

# ios — native iPhone and iPad apps that feel at home, stay responsive and pass review

Follow the repo's `CLAUDE.md`, `docs/conventions.md` and existing Xcode project first; this skill
fills gaps. A product with mobile apps keeps one native codebase per store: this skill owns the
Swift/iOS app, `android` owns the Kotlin app, `backend` owns the API both call. Keep them in step
through the shared API contract and the spec's acceptance criteria, not shared code.

Versions current when this skill was written (check `xcodebuild -version` and
`references/app-store.md` for the upload minimum before relying on them): Xcode 27.x, Swift 6.4,
iOS 27 SDK; App Store Connect requires Xcode 26+ with the iOS 26 SDK and a deployment target of
iOS 13 or later. Building on Xcode 27 needs an Apple silicon Mac on macOS Tahoe 26.6 or later.

Ask the user only for what nobody else can answer, per the delivery profile (see the repo README):
the Apple Developer team, bundle identifier, App Store Connect access, paid capabilities. Until then
use automatic signing with a placeholder team in a local, uncommitted config and keep going.

## Workflow

1. **Load the project.** Read `CLAUDE.md`, the `.xcodeproj`/`.xcworkspace` or `Package.swift`,
   `xcodebuild -list`, the deployment target, `SWIFT_VERSION`, the concurrency build settings and the
   test plans. List reusable views, models and clients. Never add a second networking, persistence,
   DI or logging approach next to an existing one. _Evidence:_ the story notes list what you reuse.
2. **Set up (new app).** One app target plus local Swift packages for features and shared code (layout
   in `references/swift-architecture.md` §6). Schemes for Debug/Release; per-environment values in
   `.xcconfig` files; Swift 6 language mode, complete concurrency checking, main-actor default
   isolation for the app and UI modules. Signing stays out of the repo: team id and profiles live in
   an uncommitted `Local.xcconfig` (in `.gitignore`), CI gets them from secrets. Dependencies only
   through Swift Package Manager with `Package.resolved` committed. _Evidence:_ a clean
   `xcodebuild build` on a named simulator from a fresh clone.
3. **Write the state table before code.** Per screen: each piece of data and its owner — server (the
   client layer), persisted (SwiftData/Core Data), shared app state (an `@Observable` model injected
   through the environment), screen state (`@State` on the view), derived (a computed property),
   navigation (the path in a `NavigationStack`, restorable). List loading, empty, error (with retry),
   offline and success, plus the copy keys for each. _Evidence:_ the table in the story.
4. **Write failing tests first.** Swift Testing (`@Test`, `#expect`, `#require`, parameterised
   arguments) for models, clients and mapping, with fakes injected through protocols; network faked
   at the client protocol or a `URLProtocol` stub, never a live server. _Evidence:_ a red run for the
   right reason.
5. **Build the feature.** Views stay thin; logic lives in `@Observable` models and plain types;
   I/O goes through a client protocol whose live implementation uses `URLSession` async/await
   (`references/swift-architecture.md`). Dependencies are passed in (initialiser or environment),
   never reached through singletons. _Evidence:_ `git diff --stat` inside the feature module plus
   deliberate shared changes.
6. **Follow the HIG.** Standard components first — `TabView`, `NavigationStack`/
   `NavigationSplitView`, `List`, `Form`, `.sheet`, `.toolbar`, `.searchable` — because they adopt
   Liquid Glass, Dynamic Type, VoiceOver and new form factors for free. Check the screen against
   `references/hig-ui.md`. _Evidence:_ checklist ticked in the story.
7. **Data and offline.** Pick persistence with the table in `references/swift-architecture.md` §4.
   Reads show cached data first; writes are queued or clearly fail with retry; nothing blocks the main
   actor. _Evidence:_ a test with the network off (airplane mode on device, or the stubbed client).
8. **Concurrency.** Zero concurrency warnings in Swift 6 mode; heavy work is `@concurrent` or in an
   actor; tasks start from `.task` (cancelled with the view), not detached. _Evidence:_ build log
   with zero warnings (`-warnings-as-errors` in CI).
9. **Accessibility and localisation.** Every control has a label (and a hint when the action is not
   obvious); images are decorative or labelled; grouped rows read as one element; layout survives the
   largest accessibility text size; Reduce Motion and Increase Contrast respected. All copy lives in a
   String Catalog (`Localizable.xcstrings`) with plural variants; dates, numbers and currencies through
   `FormatStyle`. _Evidence:_ Accessibility Inspector audit clean; a pseudo-language run (double-length
   or right-to-left) without clipping.
10. **UI tests.** XCUITest for the main journey, finding elements by accessibility identifier (labels are localised);
    launch arguments switch the app to fake data. Snapshot tests only if the repo already has them.
    Run everything with `xcodebuild test -scheme <App> -destination 'platform=iOS Simulator,name=<device>'`
    on a device name taken from `xcrun simctl list devices available`, and keep the `.xcresult`.
    _Evidence:_ exit code 0 and the result bundle path.
11. **Screenshots.** On the smallest and largest supported iPhone simulators and an iPad (if
    supported); light and dark; default text size and the largest accessibility size. Use
    `xcrun simctl ui <udid> appearance dark`,
    `xcrun simctl ui <udid> content_size accessibility-extra-extra-extra-large`, `xcrun simctl status_bar <udid> override --time 9:41`,
    `xcrun simctl io <udid> screenshot <file>`. Save to
    `docs/delivery/<slug>/evidence/<screen>-<device>-<theme>-<size>.png` and open every one before
    citing it. _Evidence:_ the PNGs.
12. **Performance.** Profile a Release build on a real device when available: App Launch and Time
    Profiler (time to first frame), Hangs (main run loop busy > 250 ms), Allocations/Leaks after
    repeating the journey, and app size from the export's App Thinning Size Report. Compare with the
    budgets in `benchmarks/plan.md` (`benchmark`). Field data later comes from Xcode Organizer and
    MetricKit. _Evidence:_ numbers in the story, trace files kept.
13. **CI.** `make ci` (or the repo's script) runs build, lint (SwiftLint or `swift format lint` if the
    repo uses one), unit and UI tests with `xcodebuild` on a pinned Xcode, and uploads the
    `.xcresult`. Xcode Cloud or fastlane when the repo already uses them; never commit certificates.
    _Evidence:_ CI green on the commit.
14. **Hand over.** `verify-app` runs the journey as the user will; `release` takes the store path —
    archive, TestFlight, App Store Connect metadata, privacy nutrition labels, review notes, phased
    release — using `references/app-store.md`. Inside `deliver-loop` the independent review grades
    the item.

## Core checklist

1. Swift 6 language mode with complete checking; no `@unchecked Sendable` or `nonisolated(unsafe)`
   without a comment that proves safety.
2. UI types are `@MainActor`; blocking or CPU-heavy work never runs on it.
3. One source of truth per value; `@State` owns view-local values and `@Observable` models; derived
   values are computed, not stored and synced.
4. Navigation is data: a typed path or selection, so deep links, state restoration and tests can set it.
5. Every data screen renders loading, empty, error with retry, offline and success.
6. Text uses Dynamic Type styles; no fixed frame heights around text; layout switches to a vertical
   stack at accessibility sizes.
7. Targets at least 44 × 44 pt; colour is never the only signal; contrast checked in both appearances.
8. System colours, materials and SF Symbols before custom ones; Liquid Glass only on the control layer.
9. Every user-visible string in a String Catalog; no concatenated sentences.
10. Networking behind a protocol, with timeouts, cancellation, typed errors and no secrets in the binary.
11. Tokens and credentials in the Keychain, never `UserDefaults` or files.
12. Permissions requested in context, with a purpose string that says why; the app works when denied.
13. `PrivacyInfo.xcprivacy` lists every required-reason API and collected data type, including SDKs'.
14. Accounts that can be created can be deleted in the app.
15. Tests: Swift Testing for logic, XCUITest for the main journey, all run by `xcodebuild` in CI.

## Anti-patterns

- `@StateObject`/`ObservableObject` in new code where `@Observable` fits; `@ObservedObject` for a
  model the view creates.
- Initialising a model inside `body`, or `@State var model = Model(dependency)` where the dependency
  should be injected.
- `Task.detached` or `DispatchQueue.main.async` sprinkled to silence concurrency errors.
- `NavigationView` or index-based navigation in new code; pushing a sheet's content onto a stack.
- `GeometryReader` or fixed widths to fake an adaptive layout — use size classes and stacks.
- A tab bar used for actions, or hidden on push; more tabs than fit without a More tab.
- Custom glass, blur or tinted bars over standard bars; a solid background behind the tab bar.
- `print` for logging (use `Logger` with privacy annotations); force unwraps on decoded data.
- Signing certificates, `.p12` or API keys committed; `DEVELOPMENT_TEAM` hard-coded in the project.
- UI tests that sleep, depend on a live backend or match on display text that is localised.
- Screenshots only on one device in light mode at default text size.

## Evidence before "done"

- Failing-then-passing Swift Testing tests; XCUITest journey green; `xcodebuild` exit 0, zero warnings.
- Screenshots: smallest and largest iPhone (and iPad if supported), light and dark, default and
  largest text size — each opened.
- Accessibility Inspector audit and a VoiceOver pass on the new screens (a three-line note).
- Launch, hang and memory numbers against the budget.
- Privacy manifest and purpose strings updated for any new API, SDK or data type.
- Then `verify-app`, and `release` for the store path.

## References

- `references/hig-ui.md` — the current Human Interface Guidelines as checkable rules: layout and safe
  areas, size classes and new form factors, navigation, sheets, typography and Dynamic Type tables,
  colour and Liquid Glass, SF Symbols, controls and targets, motion, app icons; dated and sourced.
- `references/swift-architecture.md` — Swift 6 concurrency settings and rules, SwiftUI data flow and
  the new `@State`, persistence choice, networking, testing patterns, project layout, pitfalls.
- `references/app-store.md` — upload minimums, launch screen and scene life cycle, privacy manifest
  and required-reason APIs, account deletion and login rules, review hot spots, TestFlight, phased
  release, version and build numbers.
- `templates/PrivacyInfo.xcprivacy` — a starting privacy manifest to edit, not ship as is.
- `templates/review-notes.md` — App Review notes and the pre-submission checklist.
