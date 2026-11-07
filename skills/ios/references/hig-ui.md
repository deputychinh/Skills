# Human Interface Guidelines, distilled for iPhone and iPad

The HIG at https://developer.apple.com/design/human-interface-guidelines changes several times a
year; its change log is https://developer.apple.com/design/whats-new/. Lines marked **Verified on
2026-11-07 against <URL>** were read on that date; **(memory)** lines were not re-checked — open the
linked page before quoting them. Design kits: iOS and iPadOS 27 UI Kit for Figma (17 Sep 2026), SF
Symbols 8, Icon Composer 2 (both announced 8 Jun 2026). Verified on 2026-11-07 against
https://developer.apple.com/design/whats-new/

## Contents

1. What changed recently
2. Layout, safe areas and size classes
3. New form factors (iPhone Duo, resizable windows)
4. Navigation: tab bars, stacks, split views, search
5. Sheets, alerts and modality
6. Typography and Dynamic Type
7. Colour, Liquid Glass and materials
8. SF Symbols and icons in controls
9. Controls and touch targets
10. Accessibility
11. Motion
12. App icons
13. Screen review checklist

## 1. What changed recently

Verified on 2026-11-07 against https://developer.apple.com/design/whats-new/

- **Liquid Glass** (introduced June 2025, refined since) is the visual language across Apple
  platforms: a translucent functional layer for controls and navigation that floats above content.
- WWDC 2026 (8 Jun 2026): design principles reintroduced; search guidance and "search as a tab"
  terminology refined; tab bars got updated terminology and art; scroll edge effect guidance
  updated; app icon guidance refined for Liquid Glass; menu item icon and sidebar icon colour
  guidance updated; generative AI guidance extended.
- 9 Sep 2026: new page "Designing for iPhone Duo" (the first folding iPhone); Layout updated to
  current best practice.
- 28 Oct 2026: app icon format options added; touch input guidance for Mac.
- 24 Mar 2026: sheet button placement updated.
- Dec 2025: Dynamic Type tables gained an "emphasized weight" column.

## 2. Layout, safe areas and size classes

Verified on 2026-11-07 against https://developer.apple.com/design/human-interface-guidelines/layout

- Put the most important content top and leading; use standard components so right-to-left
  languages flip automatically.
- Differentiate controls from content with Liquid Glass and a **scroll edge effect**, not a solid
  or semi-opaque background under bars. Extend full-screen backgrounds under sidebars, toolbars and
  tab bars; use `backgroundExtensionEffect()` when a sidebar would cover the image.
- Lay out by **size class** (compact/regular, horizontal and vertical), never by device type or
  orientation; consider every combination, including iPhone Mirroring and resizable iPad windows.
- Keep functionality the same when the size class changes; show more of it in more space (a tab bar
  can become a sidebar).
- Respect safe areas, layout margins and readable-width guides; never place controls under the
  Dynamic Island, home indicator or camera regions.
- Prepare for text-size changes: horizontally adjacent views stack vertically at large sizes.
- Test the smallest and largest layouts first; Device Hub in Xcode previews devices, resizing and
  appearance.
- Since iOS 27, apps built with the latest SDK must use the scene-based life cycle or they fail to
  launch. Verified on 2026-11-07 against
  https://developer.apple.com/documentation/ios-ipados-release-notes/ios-ipados-27-release-notes

## 3. New form factors

Verified on 2026-11-07 against
https://developer.apple.com/design/human-interface-guidelines/designing-for-iphone-duo

- iPhone Duo has an outer display (wider and shorter; the system moves toolbars and tab bars to the
  side) and an inner display, a hinge and several poses. Design with size classes: compact width for
  the outer display, regular width for the inner one, rather than a layout per pose.
- Build to resize: no fixed widths or display-specific code; use margins and safe area insets.
- Keep functions and state identical across displays and poses; show an extra level of hierarchy on
  the inner display when it helps (list and detail side by side).
- Follow the system's vertical placement of toolbars and tab bars on the outer display.
- Respect reserved regions (outer camera, inner camera when active, the fold when partly open);
  standard alerts, menus, sheets and split views adapt automatically. Prefer an even number of grid
  columns so content divides at the fold; avoid big rearrangements while folding.

## 4. Navigation

Verified on 2026-11-07 against https://developer.apple.com/design/human-interface-guidelines/tab-bars

- Tab bar = navigation between top-level sections, never actions (use a toolbar for actions).
- Keep the tab bar visible on every section; only a modal may cover it.
- Use as few tabs as the hierarchy needs; avoid the overflow More tab.
- Never hide or disable a tab when its content is unavailable; explain the empty state inside it.
- Single-word labels with SF Symbols; badges only for critical information.
- Avoid tab label colours similar to colourful content behind them; prefer the monochrome style.
- iPadOS: the tab bar sits near the top and can convert to a sidebar (`sidebarAdaptable`); for a
  sidebar-only app use `NavigationSplitView`.
- Hierarchical drill-down uses `NavigationStack` with a typed path; list–detail on iPad uses
  `NavigationSplitView`, which collapses to a stack in compact width. **(memory)**
- Search can be its own tab on iOS; place `.searchable` where people expect it and keep the query
  when navigating back. Search guidance updated 8 Jun 2026 — check
  https://developer.apple.com/design/human-interface-guidelines/searching before designing search.

## 5. Sheets and modality

Verified on 2026-11-07 against https://developer.apple.com/design/human-interface-guidelines/sheets

- Use a sheet for a brief, self-contained task, not for navigating content; use full-screen modal for
  long or immersive flows (camera, media, multistep editing).
- Single-view sheet: Cancel on the leading edge of the top toolbar, Done on the trailing edge. Pair
  Done with Cancel or Back; never show Cancel, Done and Back together.
- iPhone: consider a medium detent for progressive disclosure; resizable sheets show a grabber
  (it also works with VoiceOver).
- Support swipe to dismiss; if there are unsaved changes, confirm with an action sheet.
- iPad: prefer the page or form sheet styles.
- Destructive or important choices use an alert or action sheet, not a custom sheet.

## 6. Typography and Dynamic Type

Verified on 2026-11-07 against https://developer.apple.com/design/human-interface-guidelines/typography

- iOS/iPadOS default text size 17 pt, minimum 11 pt. Avoid Ultralight, Thin and Light weights.
- Use the built-in text styles (`.body`, `.headline` …) with the system font (SF Pro, or New York);
  custom fonts must scale with `Font.custom(_:size:relativeTo:)` or `UIFontMetrics`. **(API names
  from memory)**
- Dynamic Type at the default "Large" size (points, size/leading):

| Style       | Weight   | Large (default) | AX5 (largest) |
| ----------- | -------- | --------------- | ------------- |
| Large Title | Regular  | 34 / 41         | 60 / 70       |
| Title 1     | Regular  | 28 / 34         | 58 / 68       |
| Title 2     | Regular  | 22 / 28         | 56 / 66       |
| Title 3     | Regular  | 20 / 25         | 55 / 65       |
| Headline    | Semibold | 17 / 22         | 53 / 62       |
| Body        | Regular  | 17 / 22         | 53 / 62       |
| Callout     | Regular  | 16 / 21         | 51 / 60       |
| Subhead     | Regular  | 15 / 20         | 49 / 58       |
| Footnote    | Regular  | 13 / 18         | 44 / 52       |
| Caption 1   | Regular  | 12 / 16         | 43 / 51       |
| Caption 2   | Regular  | 11 / 13         | 40 / 48       |

- Text sizes run xSmall, Small, Medium, Large (default), xLarge, xxLarge, xxxLarge, then the
  accessibility sizes AX1–AX5. Body grows from 17 pt to 53 pt, so layouts must reflow, truncate
  rarely and scroll.
- Keep hierarchy visible at every size: emphasis via weight (emphasized weights are listed per style).

## 7. Colour, Liquid Glass and materials

Verified on 2026-11-07 against https://developer.apple.com/design/human-interface-guidelines/materials

- Two kinds of material: **Liquid Glass** for the functional layer (bars, sidebars, floating
  controls) and **standard materials** for structure inside the content layer.
- Do not use Liquid Glass in the content layer (exception: transient states of sliders and toggles,
  applied by the system).
- System components adopt Liquid Glass automatically; apply it to custom controls sparingly, only
  to the most important functional elements (`glassEffect(_:in:)`).
- Regular variant for most components and anything text-heavy; clear variant only over visually rich
  media, adding a ~35 % dark dimming layer when the content behind is bright.
- Glass appearance changes with system settings (preferred glass look, Reduce Transparency, Increase
  Contrast) — test with them on.
- Use vibrant system colours on materials; choose a material by meaning, not by the colour it gives.
- Prefer semantic system colours (`.primary`, `.secondary`, `Color(.systemBackground)`); they adapt
  to dark mode and Increase Contrast. Every custom colour needs light, dark and high-contrast
  variants in the asset catalogue. **(asset variants from memory)**
- Use the accent colour for interactivity, not decoration; keep brand colour out of bar backgrounds.
  **(memory)**

## 8. SF Symbols

Verified on 2026-11-07 against https://developer.apple.com/design/human-interface-guidelines/sf-symbols
(SF Symbols 8 announced 8 Jun 2026)

- Prefer SF Symbols for tab, toolbar and button icons: they scale with Dynamic Type, match text
  weight and adapt to compact or regular bars.
- Use familiar symbols for familiar actions (`square.and.arrow.up` for share).
- Symbols and features of a given year are not available on earlier OS versions; provide a
  fallback for older deployment targets.
- Four rendering modes (monochrome, hierarchical, palette, multicolor); use system colours so
  symbols adapt to dark mode and accessibility settings; use variable colour for change, not depth.
- Never use SF Symbols (or look-alikes) in app icons or logos.
- Icon-only buttons still need an accessibility label.

## 9. Controls and touch targets

Verified on 2026-11-07 against https://developer.apple.com/design/human-interface-guidelines/buttons
and https://developer.apple.com/design/human-interface-guidelines/accessibility

- Default control size **44 × 44 pt**, minimum 28 × 28 pt (iOS/iPadOS); give a button a hit
  region of at least 44 × 44 pt and space around it.
- Every custom button has a pressed state.
- One prominent (accent) button for the most likely action; distinguish choices by style, not size.
- Never give the primary role to a destructive action.
- Short verb-first labels in title case when text is clearer than an icon.

## 10. Accessibility

Verified on 2026-11-07 against https://developer.apple.com/design/human-interface-guidelines/accessibility

- Let text grow to at least 200 %; support Dynamic Type everywhere.
- Contrast: 4.5:1 for text up to 17 pt, 3:1 for 18 pt and larger and bold text; check light and
  dark; offer a higher-contrast scheme under Increase Contrast if defaults fall short.
- Never convey information by colour alone (add shape, icon or text).
- Reduce Motion: cut automatic and repeating animation, zooming, scaling and peripheral motion.
- Audit with Accessibility Inspector; label every control for VoiceOver, group related elements,
  order matches the visual order, custom actions instead of hidden gestures. **(VoiceOver API
  specifics from memory)**
- Captions and audio descriptions for media; haptics or sound alongside visual feedback.
- Declare supported features in App Store Connect's Accessibility Nutrition Labels (guidance added
  9 Jun 2025).

## 11. Motion

Verified on 2026-11-07 against https://developer.apple.com/design/human-interface-guidelines/motion

- Motion must have a purpose; avoid it on frequent interactions with custom elements.
- Make it optional and never the only way to communicate; pair with haptics or sound.
- Feedback motion follows the gesture; people can cancel it rather than wait.
- Animated SF Symbols (SF Symbols 5+) where they add meaning.

## 12. App icons

Verified on 2026-11-07 against https://developer.apple.com/design/human-interface-guidelines/app-icons

- iOS, iPadOS, macOS and watchOS icons are a background layer plus one or more foreground layers
  that take on Liquid Glass highlights, refraction and translucency.
- Prefer the layered Icon Composer format (Icon Composer 2 since June 2026): it controls glass per
  layer and colour across the default, dark, tinted and clear appearances. A flat bitmap still works
  but the system segments it automatically.
- Foreground layers: crisp edges, vector (SVG/PDF) where possible, varied opacity for depth;
  background: a solid colour or gradient set in Icon Composer.
- No text or UI screenshots in the icon; it must read at small sizes. **(memory)**

## 13. Screen review checklist

Run on each new or changed screen, on the screenshots from the workflow:

- [ ] Standard bars and components; no custom background under the tab or navigation bar.
- [ ] Content extends under bars; scroll edge effect keeps controls legible.
- [ ] Tab bar visible, ≤ the tabs that fit, labelled, no actions.
- [ ] Every state (loading, empty, error, offline, success) designed and reachable in tests.
- [ ] Largest accessibility text size: nothing clipped, overlapping or unreachable.
- [ ] Light, dark, Increase Contrast and Reduce Transparency all legible.
- [ ] Every target ≥ 44 pt; VoiceOver reads each element once with a clear label.
- [ ] Compact and regular widths (and iPad if supported) both feel native.
