# Platform UI guidelines: which source rules which screen

`css-design` styles **web UI** (Vue or React, CSS). Native screens follow their platform's own
guidelines and are built by the `ios` and `android` skills; a product with web and mobile apps
shares brand tokens (colour roles, type scale, spacing) across all three, but each platform keeps its
own components, navigation and gestures. Copying web patterns into a native app, or native patterns
into the web, is the most common cross-platform review failure.

Notes are marked "Verified on 2026-11-07 against <URL>" or "(memory)".

## Contents

1. [Sources per platform](#1-sources-per-platform)
2. [Web: rules that most often fail review](#2-web-rules-that-most-often-fail-review)
3. [iOS: rules that most often fail review](#3-ios-rules-that-most-often-fail-review)
4. [Android: rules that most often fail review](#4-android-rules-that-most-often-fail-review)

## 1. Sources per platform

| Platform | Primary guideline                                                                                                           | Version verified                                                                                                                                                                 | In this suite                                                                |
| -------- | --------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Web      | WCAG 2.2 https://www.w3.org/TR/WCAG22/ + Material 3 https://m3.material.io/ (or the repo's design system)                   | WCAG 2.2 W3C Recommendation, 12 December 2024 edition — verified on 2026-11-07; M3 with the "Expressive" update (memory)                                                         | this skill: `tokens-and-layout.md`, `states-and-review.md`                   |
| iOS      | Human Interface Guidelines https://developer.apple.com/design/human-interface-guidelines/                                   | living document without version numbers; accessibility page (44×44 pt controls, contrast table, 200 % text) checked on 2026-11-07                                                | `ios` skill, [hig-ui.md](../../ios/references/hig-ui.md)                     |
| Android  | Material 3 https://m3.material.io/ + Android accessibility https://developer.android.com/guide/topics/ui/accessibility/apps | Compose Material 3 library 1.4.0 stable, 1.5.0-rc01 (4 November 2026) — verified on 2026-11-07 against https://developer.android.com/jetpack/androidx/releases/compose-material3 | `android` skill, [material3-ui.md](../../android/references/material3-ui.md) |

When a repo has its own design system, it wins on brand (colour, type, shape); the platform
guideline still wins on accessibility, navigation and system behaviour.

## 2. Web: rules that most often fail review

Verified on 2026-11-07 against https://www.w3.org/TR/WCAG22/ unless marked.

1. Text contrast ≥ 4.5:1, large text and UI component boundaries ≥ 3:1 (SC 1.4.3, 1.4.11).
2. Visible focus on every focusable element, not hidden by sticky headers (SC 2.4.7, 2.4.11).
3. Target size ≥ 24 × 24 CSS px or enough spacing (SC 2.5.8); 44 px for primary actions (house rule).
4. Reflow at 320 CSS px wide without horizontal scrolling (SC 1.4.10).
5. Text resizes to 200 % without loss (SC 1.4.4); text spacing overrides do not clip (SC 1.4.12).
6. Colour is never the only signal (SC 1.4.1).
7. Every input has a programmatic label; errors are described in text (SC 1.3.1, 3.3.1, 3.3.2).
8. Motion respects `prefers-reduced-motion`; no flashing (SC 2.3.3 AAA as a house rule, 2.3.1).
9. Navigation adapts per window size class: bar, rail, expanded rail; no drawer as the wide-screen
   default (M3, memory).
10. Every state styled: hover, focus, active, disabled, loading, error, empty (house rule).

## 3. iOS: rules that most often fail review

Rules 1–3 verified on 2026-11-07 against
https://developer.apple.com/design/human-interface-guidelines/accessibility; the rest from memory —
the `ios` skill's [hig-ui.md](../../ios/references/hig-ui.md) holds the checked list.

1. Controls at least 44 × 44 pt (28 × 28 pt is the absolute minimum).
2. Contrast: text up to 17 pt needs 4.5:1, 18 pt and larger (and bold) 3:1.
3. Text can grow to at least 200 %: use Dynamic Type text styles, never fixed point sizes, and test
   the accessibility sizes.
4. Every image-only control has a VoiceOver label; decorative images are hidden from it.
5. Respect safe areas, the Dynamic Island and the home indicator; no content under system bars.
6. Standard navigation: a tab bar for top-level sections (no hamburger menu), back by swipe and the
   back button, sheets for focused tasks.
7. Support light and dark appearance with semantic system colours, and Increase Contrast.
8. Respect Reduce Motion and Reduce Transparency.
9. Use SF Symbols and system controls before custom ones; custom ones must behave the same.
10. Ask for a permission at the moment it is needed, with a purpose string that explains why.

## 4. Android: rules that most often fail review

Rules 1–3 verified on 2026-11-07 against
https://developer.android.com/guide/topics/ui/accessibility/apps; the rest from memory — the
`android` skill's [material3-ui.md](../../android/references/material3-ui.md) holds the checked
list.

1. Touch targets at least 48 × 48 dp (Material components enforce it; custom ones must set it).
2. Contrast: text under 18 sp (or bold under 14 sp) needs 4.5:1, other text 3:1.
3. Every icon-only control has a `contentDescription`; decorative ones pass `null`; descriptions in
   lists are unique per item.
4. Text in `sp` and layouts that survive the largest font scale (200 %) without clipping.
5. Edge-to-edge with window insets handled; no content under the status or navigation bar.
6. Navigation per window size class: navigation bar on compact, rail on medium and expanded; list–
   detail panes on large screens and foldables.
7. Predictive back and system back work on every screen; no custom back that traps the user.
8. Dynamic colour (Material You) supported or deliberately opted out with a reason; dark theme
   designed, not inverted.
9. Material 3 components and `MaterialTheme` tokens (colour roles, type scale, shapes) instead of
   hard-coded values.
10. Runtime permissions requested in context, with a rationale and a path when denied.
