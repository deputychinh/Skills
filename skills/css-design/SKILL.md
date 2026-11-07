---
name: css-design
description: Styles web UI. Use when creating or changing how a screen or component looks or lays out in a Vue or React app, adding tokens, a theme or dark mode, or when the user says "CSS", "colours", "font", "responsive", "layout", "spacing" or "it looks ugly" — even for one component. Produces token-based CSS (primitive → semantic → component, light and dark, reduced motion), intrinsic layouts with grid, flex and container queries, Material 3 adaptive layouts, WCAG 2.2 AA contrast and 24/44 px targets, every component state styled, BEM that passes Stylelint and a screenshot review. Behaviour, state and tests belong to `frontend`; native iOS and Android screens to `ios` and `android`. Inside a delivery, `ship` and `deliver-loop` call this skill.
---

# css-design — calm, consistent screens built from tokens, readable at 390 px and 1280 px

**Scope: web UI** — CSS for Vue and React apps. Native iOS screens (SwiftUI) belong to the `ios`
skill and native Android screens (Jetpack Compose) to the `android` skill; when a product has web and
mobile apps, share the brand tokens (colour roles, type scale, spacing) and let each platform keep
its own components and navigation.

Follow the repo's `docs/design-system.md`, its tokens file and `stylelint.config.mjs` first; this
skill fills gaps. Component behaviour and tests belong to `frontend`; the final run-it-as-the-user check
belongs to `verify-app`.

## Platform UI guidelines

Check the guideline for the platform being styled, at the version in
`references/platform-guidelines.md` (which also lists the rules that most often fail review):

| Platform | Source                                                                                   | Version / date checked                                   |
| -------- | ---------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| Web      | WCAG 2.2 + Material 3 for web, or the repo's design system                               | WCAG 2.2 Recommendation, 12 Dec 2024 edition; 2026-11-07 |
| iOS      | `ios` skill: [hig-ui.md](../ios/references/hig-ui.md) (Apple Human Interface Guidelines) | HIG is unversioned; checked 2026-11-07                   |
| Android  | `android` skill: [material3-ui.md](../android/references/material3-ui.md) (Material 3)   | Compose Material 3 1.4.0 stable, 1.5.0-rc01; 2026-11-07  |

## Workflow

1. **Load the system.** Read `docs/design-system.md`, the tokens (`packages/ui/src/tokens/tokens.css`
   or `src/styles/tokens/*.css`), `stylelint.config.mjs`, and the CSS of the two closest existing
   components. List the tokens you will use. _Evidence:_ the story notes name the tokens and the
   nearest existing component you matched.
2. **Decide the layout per window size class** before writing CSS: compact (< 600 px), medium
   (600–839), expanded (≥ 840), and large (≥ 1200) if the screen is wide. Name the navigation
   (bar, rail, expanded rail), the panes (single, list–detail, supporting) and the maximum text
   width. Pick intrinsic primitives (stack, cluster, sidebar, switcher, grid) and let components react
   to their container, not the viewport. _Evidence:_ a 4-line layout note in the story.
3. **Tokens first.** Need a new colour, size or duration? Add a primitive, map it to a semantic
   token, define it for both themes, and only then use it. Check every new text/background and
   control/background pair with the contrast script in `references/states-and-review.md`.
   _Evidence:_ a contrast table (pair, light ratio, dark ratio) in the story.
4. **Write the CSS.** One BEM block per file (`AssetCard.css` ↔ `.asset-card`), tokens only for
   colour, spacing, type, radius, shadow, z-index and duration; logical properties
   (`inline-size`, `margin-block`, `padding-inline`); mobile-first `@media (min-width: …)` in prefix
   notation or the repo's custom media; `@container` for component-level changes; no ids, no
   `!important`, nesting depth ≤ 1, no type selectors in component files. _Evidence:_ Stylelint exit 0
   (`npx stylelint "src/**/*.css"` or `npm run lint`).
5. **Style every state.** Default, hover (inside `@media (hover: hover)`), `:focus-visible`, active,
   selected/current, disabled, loading (reserves final size), error, empty; touch targets ≥ 24 px,
   primary actions 44 px. Add a Storybook story or a test page per state. _Evidence:_ stories render;
   Storybook axe passes in both themes.
6. **Motion and preferences.** Durations from tokens (150–300 ms), ease-out entering, ease-in
   leaving; animate `transform`/`opacity` only; under `prefers-reduced-motion: reduce` remove
   movement (keep fades or nothing). Check `forced-colors: active` keeps borders and focus visible.
   _Evidence:_ screenshot with reduced motion emulated if the view animates.
7. **Screenshots.** Production build; capture each changed view at 390 and 1280 px (add 600 and
   840 px when the layout adapts), light and dark:
   `npx playwright screenshot --viewport-size "390,844" --color-scheme dark <url> <file>`.
   Also check 320 px width / 400 % zoom reflow and the browser's 200 % text zoom. Save to
   `docs/delivery/<slug>/evidence/<view>-<width>-<theme>.png`. _Evidence:_ the PNGs, each opened.
8. **Review the screenshots** with the heuristics in `references/states-and-review.md` (hierarchy,
   spacing, alignment, contrast, density, consistency; Nielsen pass on the flow). Fix the top issues,
   re-shoot. _Evidence:_ a short "found → fixed" list in the story.
9. **Automated checks.** Playwright + axe (serious/critical = 0) on the changed views in both themes,
   and the target-size probe from the reference. _Evidence:_ spec output.
10. **Hand over** to `frontend` gates and `verify-app`; do not restate their steps.

## Core checklist

1. No raw colour, spacing, font size, radius, shadow, z-index or duration outside the tokens file.
2. Components use semantic tokens (`--x-color-on-surface-muted`), never primitives (`--x-grey-500`).
3. Every theme defines every semantic token; dark is designed, not inverted.
4. Body text ≥ 4.5:1, large text (≥ 24 px, or ≥ 18.67 px (14 pt) bold) and UI boundaries/states ≥ 3:1, in
   both themes; ratios are not rounded.
5. Colour never the only signal: error, selected, success also have text, icon, weight or shape.
6. Every focusable element has a visible `:focus-visible` ring (2 px solid, offset, ≥ 3:1 change),
   not hidden under sticky bars (`scroll-padding-block`).
7. Targets ≥ 24 × 24 CSS px (or spaced), primary actions ≥ 44 px.
8. Body ≥ 16 px, line-height ~1.5, measure 45–75 ch (`max-inline-size: 65ch`).
9. Spacing only from the 4/8 px scale; more space between groups than inside them.
10. Layout survives 320 px wide and 200 % text zoom without horizontal scroll or clipped text.
11. Hover styles inside `@media (hover: hover)`; nothing important is hover-only.
12. Loading placeholders reserve the final size; images have dimensions or `aspect-ratio` (CLS ≤ 0.1).
13. Motion respects `prefers-reduced-motion`; no animation of layout properties.
14. Media queries cannot read `var()`; breakpoints use literal px or the repo's custom media.
15. Specificity stays flat: one class per selector plus state; no ids, no `!important`.

## Anti-patterns

- Hex values or `16px` sprinkled in components; "just this once" magic numbers.
- `outline: none` with no replacement; focus ring only on `:focus` (shows on mouse click).
- Grey text on a coloured background; disabled styles that are the only difference from enabled.
- Fixed heights on text containers; `width: 375px`; `100vh` on mobile (use `100dvh` or `min-block-size`).
- Viewport media queries for a component that also appears in a side pane (use `@container`).
- Navigation drawer as the default on wide screens (M3 Expressive moves to the expanded rail).
- Bottom bar and rail at the same time; more than five bottom-bar destinations.
- Borders everywhere to separate things that spacing or a background shift would separate.
- `z-index: 9999`; stacking values not from tokens.
- Dark theme made with `filter: invert()` or by swapping only the background.
- Animating `width`, `height`, `top` or `box-shadow` on scroll; parallax without a reduced-motion path.

## Evidence before "done"

- Stylelint exit 0; no new raw values (`git diff -U0 -- '*.css' | grep -E '#[0-9a-fA-F]{3,8}\b|[0-9]px'`
  shows only token files or 1 px hairlines).
- Contrast table for new pairs, both themes.
- Screenshots at 390 and 1280 px, light and dark (plus 600/840 if adaptive), each opened and reviewed.
- Storybook (or test page) with every state; axe serious/critical = 0 in both themes.
- "Found → fixed" review list. Then `frontend` gates and `verify-app`.

## References

- `references/tokens-and-layout.md` — token tiers and theming, spacing and type scales, typography,
  colour, layout primitives, container queries, Material 3 adaptive layouts, CSS architecture
  (BEM, `@layer`, specificity) and the default Stylelint rules.
- `references/platform-guidelines.md` — the guideline per platform (web, iOS, Android) with the
  version checked, and the 8–10 rules per platform that most often fail review.
- `references/states-and-review.md` — component state matrix, focus and target-size rules, contrast
  and target probes, motion, visual regression, Refactoring UI and Nielsen review lists.
