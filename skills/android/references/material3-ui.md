# Material 3 UI rules for Compose

Every rule is meant to be checked on a screen or in code review. Tags: **Verified on 2026-11-07
against <URL>** = read on that date; **(memory)** = not re-checked online, confirm before quoting.
The repo's own design system wins where it differs.

## Contents

1. Versions in use
2. Layout and window size classes
3. Navigation: bar, rail, drawer
4. Canonical layouts and panes
5. Colour roles and dynamic colour
6. Typography
7. Shapes and elevation
8. Motion
9. Material 3 Expressive
10. Components
11. Touch targets and accessibility
12. Edge-to-edge and insets
13. Review list

## 1. Versions in use

- Compose BOM `2026.09.00` is the newest stable BOM; declare `platform(libs.androidx.compose.bom)`
  and leave Compose artifacts unversioned. Verified on 2026-11-07 against
  https://developer.android.com/develop/ui/compose/bom
- `androidx.compose.material3:material3` stable is 1.4.0; 1.5.0 is at rc01 (2026-11-04) and is the
  line where most Expressive APIs (motion scheme, expressive theme, button groups, split button,
  FAB menu, floating toolbar, expressive list items) left experimental. Do not ship an rc or alpha
  in production without an ADR. Verified on 2026-11-07 against
  https://developer.android.com/jetpack/androidx/releases/compose-material3
- `material3-adaptive-navigation-suite` provides `NavigationSuiteScaffold`; adaptive panes live in
  `androidx.compose.material3.adaptive`. Verified on 2026-11-07 against the same page.
- The Compose compiler version equals the Kotlin version since Kotlin 2.0 (apply the
  `org.jetbrains.kotlin.plugin.compose` plugin). Verified on 2026-11-07 against
  https://developer.android.com/develop/ui/compose/bom

## 2. Layout and window size classes

Verified on 2026-11-07 against
https://developer.android.com/develop/ui/compose/layouts/adaptive/use-window-size-classes

| Width class | Breakpoint            | Typical window                                |
| ----------- | --------------------- | --------------------------------------------- |
| Compact     | < 600 dp              | phone portrait                                |
| Medium      | 600 dp ≤ w < 840 dp   | tablet portrait, unfolded foldable portrait   |
| Expanded    | 840 dp ≤ w < 1200 dp  | tablet landscape, unfolded foldable landscape |
| Large       | 1200 dp ≤ w < 1600 dp | large tablet                                  |
| Extra-large | ≥ 1600 dp             | desktop, connected display                    |

Height: compact < 480 dp (phone landscape), medium 480–899 dp, expanded ≥ 900 dp.

- Read the class with `currentWindowAdaptiveInfo(supportLargeAndXLargeWidth = true).windowSizeClass`
  and compare with `isWidthAtLeastBreakpoint(WindowSizeClass.WIDTH_DP_EXPANDED_LOWER_BOUND)`.
- Window size classes describe the window, not the device: split screen, desktop windowing and
  folding change them at runtime. Never write `isTablet` logic.
- Phones in landscape are medium width but compact height — do not show two panes there.
- Design the expanded layout first when retrofitting a phone-only screen, then decide medium.
- Apps targeting API 37 cannot lock orientation, resizability or aspect ratio on displays with
  smallest width ≥ 600 dp (games exempt); Android 16's temporary opt-out is gone. Verified on
  2026-11-07 against https://developer.android.com/about/versions/17/changes/ff-restrictions-ignored
- Margins and spacers: 16 dp margins on compact, 24 dp on medium and wider; 24 dp spacer between
  panes. **(memory)**
- Cap reading width (about 600–840 dp of text column) on expanded windows instead of stretching
  paragraphs. **(memory)**

## 3. Navigation: bar, rail, drawer

Verified on 2026-11-07 against
https://developer.android.com/develop/ui/compose/layouts/adaptive/build-adaptive-navigation

- Use `NavigationSuiteScaffold`: it shows a navigation bar when width or height is compact (or in
  tabletop posture) and a navigation rail otherwise, and switches at runtime.
- Navigation bar: 3–5 top-level destinations, each with icon and label. Verified on 2026-11-07
  against https://developer.android.com/develop/ui/compose/designsystems/material3 (≤ 5).
- Override with `layoutType` when a screen earns it — for example a permanent drawer or expanded
  rail at expanded width — and fall back to `NavigationSuiteScaffoldDefaults.calculateFromAdaptiveInfo`.
- M3 Expressive replaces the standard navigation drawer with an expanded (wide) navigation rail and
  adds a short navigation bar for medium windows. **(memory)**
- The selected destination survives configuration changes (`rememberSaveable` or the navigation
  back stack) and is marked by shape and label, not colour alone.
- Back (system gesture or button) always goes to the previous destination; predictive back is on
  by default for apps targeting API 35+. **(memory)**

## 4. Canonical layouts and panes

- List–detail (`ListDetailPaneScaffold`), supporting pane (`SupportingPaneScaffold`) and feed
  (lazy grid with adaptive columns) are the canonical layouts; pick one per screen. **(memory)**
- On compact, list–detail shows one pane at a time and back returns to the list; on expanded both
  panes show and selection stays visible.
- Lazy grids use `GridCells.Adaptive(minSize = …)` so the column count follows the window.

## 5. Colour roles and dynamic colour

Verified on 2026-11-07 against https://developer.android.com/develop/ui/compose/designsystems/material3

- Generate the scheme from brand key colours with Material Theme Builder; keep `lightColorScheme`
  and `darkColorScheme`, choose by `isSystemInDarkTheme()`.
- Dynamic colour (Android 12 / API 31+): `dynamicLightColorScheme(context)` /
  `dynamicDarkColorScheme(context)`, falling back to the brand scheme below API 31. Offer it unless
  brand rules forbid it; record that choice.
- Pair every fill with its `on` role: `primary`/`onPrimary`, `primaryContainer`/`onPrimaryContainer`,
  `surface`/`onSurface`, `surfaceVariant`/`onSurfaceVariant`. Never mix accents (for example
  `primaryContainer` text on `tertiaryContainer`).
- Primary for the main action and active states, secondary for less prominent controls such as
  filter chips, tertiary for contrasting accents.
- Surface tones (`surfaceContainerLowest` … `surfaceContainerHighest`) separate regions instead of
  shadows. **(memory)**
- Never read colours with `Color(0xFF…)` inside a screen; only the theme file holds literals.

## 6. Typography

Verified on 2026-11-07 against https://developer.android.com/develop/ui/compose/designsystems/material3

| Role     | Large     | Medium    | Small     |
| -------- | --------- | --------- | --------- |
| Display  | 57/64     | 45/52     | 36/44     |
| Headline | 32/40     | 28/36     | 24/32     |
| Title    | 22/28     | 16/24 (M) | 14/20 (M) |
| Body     | 16/24     | 14/20     | 12/16     |
| Label    | 14/20 (M) | 12/16 (M) | 11/16 (M) |

Sizes are sp/line-height; (M) = medium weight.

- Use `MaterialTheme.typography.<role>`; a product rarely needs all 15 styles — pick a reduced set.
- Sizes in `sp`, never `dp`, so the user's font scale applies; Android 14+ scales non-linearly up to
  200 %. **(memory)**
- Body text at least `bodyMedium`; labels on controls `labelLarge`.
- M3 Expressive adds emphasized variants of each style (heavier weight) for hero moments. **(memory)**

## 7. Shapes and elevation

- Shape scale: extraSmall 4 dp, small 8 dp, medium 12 dp, large 16 dp, extraLarge 24 dp corners;
  set once in `Shapes(...)`. Verified on 2026-11-07 against
  https://developer.android.com/develop/ui/compose/designsystems/material3
- Elevation is mainly tonal (`tonalElevation`), with `shadowElevation` only where an object floats.
  Verified on the same page.
- Expressive adds more corner sizes and a library of 35 shapes (`MaterialShapes`) with shape
  morphing; `MaterialShapes` was returned to experimental in 1.5.0-alpha19, so do not depend on it
  in a stable release yet. Verified on 2026-11-07 against
  https://developer.android.com/jetpack/androidx/releases/compose-material3 (shape count: memory).

## 8. Motion

- Use `MaterialTheme.motionScheme` (graduated from experimental in 1.5.0-alpha15) rather than
  hand-tuned durations, so motion stays consistent and themable. Verified on 2026-11-07 against
  https://developer.android.com/jetpack/androidx/releases/compose-material3
- Motion is spring-based: spatial springs (position, size, may overshoot) and effects springs
  (colour, opacity, no overshoot); `MotionScheme.expressive()` bounces more than
  `MotionScheme.standard()`. Use standard for utilitarian apps. **(memory)**
- Respect the system "Remove animations" setting: animator duration scale 0 must leave a usable UI.
  **(memory)**
- Animate state changes users must follow (expand, reorder, shared element on navigation); never
  animate only for decoration on a hot path.

## 9. Material 3 Expressive

Announced in 2025 as an expansion of M3 with research-backed updates to theming, components,
motion and typography, complementing the Android 16 system UI. Verified on 2026-11-07 against
https://developer.android.com/develop/ui/compose/designsystems/material3

- Opt in with `MaterialExpressiveTheme` (with `expressiveLightColorScheme` and
  `MotionScheme.expressive()`); promoted to stable API in 1.5.0-alpha18, so available stable once
  1.5.0 ships. Verified on 2026-11-07 against
  https://developer.android.com/jetpack/androidx/releases/compose-material3
- New or reworked components in that line: button groups and toggle buttons, split button, FAB
  menu, floating toolbar, wavy progress indicators, expressive list items and menus; loading
  indicator still experimental. Same source.
- Use Expressive emphasis for the one or two key moments of a flow (primary action, completion),
  not everywhere — emphasis everywhere is no emphasis. **(memory)**
- Expressive is a theme choice per product; record it in `docs/design-system.md`. Mixing classic
  and Expressive components on one screen looks accidental.

## 10. Components

- One high-emphasis action per screen: extended FAB or filled button; secondary actions tonal or
  outlined; tertiary text buttons. Verified on 2026-11-07 against
  https://developer.android.com/develop/ui/compose/designsystems/material3
- Top app bars collapse on scroll with `TopAppBarDefaults.*ScrollBehavior` wired to the content's
  `nestedScroll`. **(memory)**
- Snackbars for brief, undoable feedback through `SnackbarHostState` in the `Scaffold`; dialogs
  only for decisions that block. **(memory)**
- Text fields: visible label (not placeholder only), `supportingText` for errors, correct
  `keyboardOptions` (type, IME action) and `autofill` hints for credentials. **(memory)**
- Lists: `LazyColumn` with stable `key`s and `contentType`; never a scrolling `Column` for unbounded
  data.
- Pull-to-refresh via `PullToRefreshBox` when data can be refreshed by the user. **(memory)**

## 11. Touch targets and accessibility

Verified on 2026-11-07 against https://developer.android.com/guide/topics/ui/accessibility/apps

- Touch targets at least 48 × 48 dp; Material components enforce it, custom `clickable` elements
  need `sizeIn(minWidth = 48.dp, minHeight = 48.dp)` or `minimumInteractiveComponentSize()`.
- Contrast: text under 18 sp (or bold under 14 sp) ≥ 4.5:1; other text ≥ 3:1.
- `contentDescription` describes purpose, not looks ("Share", not "Share button"); `Text` needs
  none; decorative icons get `null`; list items get unique descriptions.
- Expose roles (`Role.Button`, `Role.Switch`) and merge rows with `Modifier.semantics(mergeDescendants = true)`
  so TalkBack reads one row as one item.
- Test with TalkBack, Switch Access and Accessibility Scanner; Compose tests should find nodes by
  text and content description, which doubles as an accessibility check.

## 12. Edge-to-edge and insets

Verified on 2026-11-07 against https://developer.android.com/develop/ui/compose/system/setup-e2e

- Edge-to-edge is enforced for apps targeting API 35+; call `enableEdgeToEdge()` in
  `onCreate` so older versions match.
- Set `android:windowSoftInputMode="adjustResize"` so the IME produces insets.
- Handle insets with `Scaffold` (it pads content by default), `Modifier.safeDrawingPadding()`,
  `windowInsetsPadding(WindowInsets.safeDrawing)` or inset rulers; lists apply insets as
  `contentPadding` so content scrolls behind the bars.
- Desktop windowing adds a caption bar even in immersive mode — use `WindowInsets.systemBars` or
  `captionBar`, not the status bar alone.
- 3-button navigation gets a translucent scrim by default; disable contrast enforcement only when
  your own background guarantees legibility.

## 13. Review list

- [ ] Compact, medium and expanded screenshots; no clipped or stretched content.
- [ ] Navigation switches bar ↔ rail on resize without losing the destination.
- [ ] Light, dark and dynamic colour; all text pairs use `on*` roles.
- [ ] 200 % font scale usable; no fixed-height text containers.
- [ ] Nothing interactive under the status bar, navigation bar, cutout or IME.
- [ ] Every interactive element ≥ 48 dp and announced correctly by TalkBack.
- [ ] Motion follows the theme's motion scheme and is usable with animations off.
