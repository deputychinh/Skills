# Component states, probes and visual review

Tags: **[WCAG]** Understanding docs, **[APG]**, **[MDN]**, **[RUI]** Refactoring UI (book),
**[NN]** Nielsen Norman Group, **[default]** these skills' default conventions (the repo's own win). **(memory)** = not re-checked online for this draft.

## Contents

1. State matrix
2. Focus styles
3. Touch and pointer targets
4. Motion
5. Probes you can run
6. Visual regression and screenshot review
7. Refactoring UI review list
8. Nielsen heuristics pass

## 1. State matrix

Every interactive component gets a story (or test page) per row that applies. **[default]**

| State            | Selector / trigger                                | Must show                                                               |
| ---------------- | ------------------------------------------------- | ----------------------------------------------------------------------- |
| Default          | —                                                 | boundary ≥ 3:1 if the boundary identifies the control **[WCAG 1.4.11]** |
| Hover            | `@media (hover: hover) { .x:hover }`              | subtle change; never the only cue **(memory)**                          |
| Focus            | `.x:focus-visible`                                | ring per §2                                                             |
| Active / pressed | `.x:active`, `[aria-pressed='true']`              | immediate feedback (< 100 ms) **(memory)**                              |
| Selected/current | `[aria-selected='true']`, `[aria-current='page']` | shape/weight/indicator, not colour alone **[WCAG 1.4.1]**               |
| Disabled         | `:disabled`, `[aria-disabled='true']`             | looks inactive; explain why nearby if not obvious **[default]**         |
| Loading          | `[aria-busy='true']` or `.is-loading`             | keeps size (no layout shift), label stays for screen readers            |
| Error / invalid  | `[aria-invalid='true']`                           | icon + text message, border ≥ 3:1                                       |
| Empty            | component variant                                 | what it is + first action                                               |
| Long content     | 2× copy length, longest translation               | wraps or truncates with full text available                             |

- Prefer `aria-disabled="true"` over `disabled` when the control must stay focusable to explain why
  it is unavailable. **[APG] (memory)**
- Style state from ARIA attributes the component already sets — style and semantics cannot drift.
  **(memory)**

## 2. Focus styles

Verified on 2026-11-07 against https://www.w3.org/WAI/WCAG22/Understanding/focus-appearance.html and
https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html

- 2.4.7 Focus Visible (AA): every keyboard-focusable element shows focus. **(memory)**
- 2.4.11 Focus Not Obscured (Minimum), **AA**: the focused element is not entirely hidden by
  author content (sticky header/footer, cookie banner, non-modal panel). Fix with
  `scroll-padding-block-start: <header height>` on the scroller, modal banners, or panels that push
  content. **[WCAG]**
- 2.4.13 Focus Appearance is **AAA**, but the default ring meets it: the indicator area is at least
  a 2 CSS px perimeter of the control and changes the same pixels by ≥ 3:1 between focused and
  unfocused states. A solid 2 px outline with an offset satisfies it. **[WCAG][default]**
- Default ring: `outline: 2px solid var(--x-color-focus); outline-offset: 2px;` on `:focus-visible`;
  keep `outline` (not only `box-shadow`) so Windows forced-colours mode still draws it. **[default] (forced-colours from memory)**
- The focus colour must reach 3:1 against the surfaces it sits on in both themes. **[WCAG 1.4.11]**

## 3. Touch and pointer targets

Verified on 2026-11-07 against https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html

- 2.5.8 (AA): targets ≥ 24 × 24 CSS px, unless a 24 px circle centred on each undersized target
  touches no other target or circle (spacing), an equivalent control meets the size, the target is
  inline in text, the browser draws it unmodified, or the presentation is essential. **[WCAG]**
- Default: `--x-target-min` 24 px for every control, `--x-target-primary` 44 px for primary actions;
  use `min-block-size`/`min-inline-size` or padding, and extend small icons with a pseudo-element hit
  area rather than enlarging the icon. **[default]**
- `@media (pointer: coarse)` may enlarge dense desktop controls on touch screens. **[default] (memory)**

## 4. Motion

- 150–300 ms; ease-out to enter, ease-in to leave; standard easing token for moves. **[default]**
- Animate `transform` and `opacity`; avoid layout properties. **[web.dev] (memory)**
- `@media (prefers-reduced-motion: reduce)`: remove parallax, zooms and slides (WCAG 2.3.3 is AAA;
  treat it as required by default); keep state changes visible without movement. **[default] (SC level from memory)**
- Nothing flashes more than three times per second (2.3.1). **(memory)**
- Auto-moving content longer than 5 s needs pause/stop (2.2.2). **(memory)**

## 5. Probes you can run

**Contrast for token pairs** (WCAG relative luminance; tested on 2026-11-07: `#777` on `#fff` gives
4.48:1, a fail). Save as `scripts/contrast.mjs`, run `node scripts/contrast.mjs '#a3a8b3:#16171a'`:

```js
const lum = (hex) => {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? [...h].map((c) => c + c).join('') : h;
  const [r, g, b] = [0, 2, 4]
    .map((i) => parseInt(full.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
for (const pair of process.argv.slice(2)) {
  const [fg, bg] = pair.split(':');
  console.log(`${fg} on ${bg}: ${ratio(fg, bg).toFixed(2)}:1`);
}
```

Opaque hex only; for alpha colours, composite onto the surface first. axe checks rendered text
contrast but not focus rings or control borders — that is what this script is for.

**Target size** (Playwright, inside a test after `page.goto`):

```ts
const small = await page.$$eval(
  'a[href], button, input, select, textarea, [role="button"], [tabindex="0"]',
  (els) =>
    els
      .filter((el) => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && (r.width < 24 || r.height < 24);
      })
      .map((el) => el.outerHTML.slice(0, 80)),
);
expect(small).toEqual([]); // review hits: inline links in sentences are exempt
```

**Reflow**: screenshot at `--viewport-size "320,800"`; assert
`document.documentElement.scrollWidth <= 320` (WCAG 1.4.10). **(memory for SC number)**

## 6. Visual regression and screenshot review

- Shoot from the production build with fixed data, fonts loaded and animations off
  (`reducedMotion: 'reduce'` in the Playwright context). **(memory)**
- `expect(page).toHaveScreenshot()` only for stable primitives and key screens; commit baselines from
  one OS/browser (CI's) or they flap. Update baselines in the same commit as the intended change,
  and look at the diff image first. **[Playwright docs] (memory)**
- Documentation screenshots (390/1280, light/dark) are evidence, not assertions; refresh them with
  the e2e run that produces them, in a commit of their own (e.g. `test(e2e): refresh screenshots`)
  so image churn does not hide code changes in review. **[default]**
- Always open the PNG: check clipped text, overlaps, stray scrollbars, focus ring visible, empty
  areas on 1280, cramped tap areas on 390.

## 7. Refactoring UI review list

From the book (Wathan & Schoger), paraphrased from memory. **[RUI] (memory)**

- Hierarchy: is the one most important thing on the screen obvious? De-emphasise secondary content
  (muted colour, smaller weight) instead of shouting the primary.
- Labels are a last resort: show `12 assets` rather than `Assets: 12`.
- Buttons follow action importance: one primary, secondaries outlined/ghost, destructive is not
  always red-and-loud unless it is the primary action of the view.
- Spacing: more white space than feels necessary; separate groups with space before borders;
  don't fill the whole width just because it exists.
- Size: don't rely on font size alone; use weight and colour; keep icons in proportion to text.
- Colour: greys with intent; accent colour sparingly; avoid grey text on coloured backgrounds.
- Depth: consistent light source, a small set of shadows (raised vs overlay), overlapping elements
  to show layers.
- Images: control contrast of text on images with an overlay; never upscale small icons.
- Finishing: empty states designed, accent borders or backgrounds to add interest, fewer borders.

## 8. Nielsen heuristics pass

The ten usability heuristics (NN/g), as review questions on the flow. **[NN] (memory)**

1. Visibility of system status — is loading, saving, progress and success visible?
2. Match with the real world — the user's words, in the user's language, natural order.
3. User control and freedom — back, cancel, undo for destructive actions.
4. Consistency and standards — same component, same look and place; platform idioms.
5. Error prevention — constraints, confirmations, sensible defaults.
6. Recognition over recall — options visible, recent items, no remembering codes.
7. Flexibility and efficiency — shortcuts and bulk actions for repeat users.
8. Aesthetic and minimalist design — nothing competing with the main task.
9. Help users recover from errors — plain-language cause and a fix, next to the problem.
10. Help and documentation — help in a consistent place (WCAG 3.2.6).

Rate each finding 0–4 severity; fix 3–4 now, file the rest. **[NN] (memory)**
