# Frontend and UX

## Information architecture and flows

- Start from **jobs to be done** and the 3 main journeys; every screen answers "what can I do here, what happens next". Nielsen's 10 heuristics as the review list: visibility of status, match with the real world, user control (undo/back), consistency, error prevention, recognition over recall, flexibility, minimalist design, helpful errors, help where needed.
- Every data screen has four states: loading (skeleton, not spinner-only), empty (what to do first), error (what failed, retry), success. Destructive actions confirm or offer undo.
- Forms: label every field, inline validation on blur, error text tied with `aria-describedby`, no redundant entry (WCAG 3.3.7), keep input on error, primary action enabled only when valid or explain why.
- Copy: short, in the user's language, from locale files; numbers formatted by `Intl`; dates relative + absolute on hover.

## Layout and navigation (Material 3 / Apple HIG, adaptive)

- Window size classes: **compact < 600 px** → bottom navigation bar (3–5 destinations), one pane; **medium 600–840** → navigation rail, one or two panes; **expanded ≥ 840** → rail or expanded rail/drawer, two-pane (list–detail, supporting pane); large/extra-large ≥ 1200/1600 → wider margins, max content width (≈ 1200–1440 px), never stretch text past ~75 characters.
- Navigation drawer is being replaced by the expanded navigation rail in Material 3 Expressive; design the rail to collapse/expand rather than a separate drawer.
- Canonical layouts: list-detail, supporting pane, feed. Touch targets ≥ 24 px (WCAG 2.2 2.5.8), 44–48 px for primary controls; spacing on an 4/8 px grid.
- Immersive/focus screens (player, recorder, camera) hide chrome but keep a visible close and keyboard escape.
- Respect platform: iOS large titles that collapse, sheets for secondary tasks, back gesture; Android/Web Material components; do not mix idioms on one screen.

## Design system and tokens

- Tokens first: colour (semantic: `--color-primary`, `--color-on-primary`, `--color-surface`, `--color-text-muted`, `--color-danger`), spacing (`--space-1…12`), type scale (`--text-xs…3xl`, weights), radius, shadow, z-index, duration/easing, breakpoints. Components use tokens only (enforced by stylelint `declaration-strict-value`).
- Light and dark themes via token redefinition; `prefers-color-scheme` default, manual override stored.
- Component tiers: primitives (Button, IconButton, Card, Sheet, Tabs, ListRow, Skeleton, EmptyState, ErrorState, Toast) → feature components → screens. BEM naming, block = file.
- Typography: one UI family with variable weights, system fallback; body 16 px min, line-height 1.5, measure 45–75 ch.
- Motion: 150–300 ms, ease-out for entering, ease-in for leaving, reduced motion honoured (`prefers-reduced-motion`).

## Accessibility (WCAG 2.2 AA)

- Semantic HTML first; ARIA only to fill gaps; roles/names testable (`getByRole`).
- Keyboard: everything reachable, visible focus not obscured (2.4.11), logical order, escape closes overlays, focus returns to the trigger.
- Contrast 4.5:1 text, 3:1 UI; colour never the only signal (icon + text + pattern).
- Target size 24 px min (2.5.8); drag has a non-drag alternative (2.5.7); help in a consistent place (3.2.6); accessible authentication (3.3.8).
- Media: captions/transcripts; camera/mic permission explained before the prompt and recoverable after denial.
- Automated axe-core in e2e (serious/critical = 0) + a manual screen-reader pass of the main journey.

## Performance budgets (Core Web Vitals, 75th percentile)

- LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1; JS ≤ 200 KB gz on first route; fonts self-hosted, `font-display: swap`, variable fonts; images sized + lazy + modern formats; no layout shift from late content (reserve space).
- Static export / SSG when content allows; code-split by route and heavy feature (ML, charts); service worker for offline where the product needs it (versioned assets, explicit `OFFLINE_API` list).
- Measure in CI with Lighthouse on the main routes; keep reports in `docs/lighthouse/`.

## Component and state rules

- Server state through a feature service + `useAsync`/query hook; URL state for selection; local state for ephemeral UI; `useEffect` only for external systems.
- Props typed, no `any`; one component per file; co-locate `Component.tsx`, `Component.css`, `Component.test.tsx`.
- Tests by role/label (Testing Library), one behaviour each; Playwright journeys against the production build; screenshots stored for docs.

Sources: Material Design 3 (m3.material.io: adaptive layouts, window size classes, M3 Expressive 2025); Apple Human Interface Guidelines; WCAG 2.2 (W3C Recommendation, Oct 2023); Nielsen Norman Group heuristics; web.dev Core Web Vitals; Frost, _Atomic Design_; Krug, _Don't Make Me Think_; Norman, _The Design of Everyday Things_.
