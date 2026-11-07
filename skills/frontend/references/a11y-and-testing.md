# Accessibility and testing for Vue and React UI

Tags: **[WCAG]** WCAG 2.2 Understanding docs, **[APG]** WAI-ARIA Authoring Practices, **[TL]**
Testing Library, **[VTL]** Vue Testing Library, **[default]** these skills' default conventions
(the repo's own win), **[PW]** Playwright. **(memory)** = not re-checked online for this draft.
Visual criteria (contrast, focus appearance, target size, motion) live in `css-design`.

## Contents

1. Semantics and ARIA
2. Keyboard and focus
3. Live regions and status
4. WCAG 2.2 AA items that UI code owns
5. Charts and data visualisation
6. Unit and component tests
7. Faking the network
8. Playwright + axe
9. What not to test

## 1. Semantics and ARIA

Verified on 2026-11-07 against https://www.w3.org/WAI/ARIA/apg/practices/read-me-first/

- Native HTML first: `button` for actions, `a href` for navigation, `form`/`label`/`fieldset`/
  `legend`, `dialog`, `details/summary`, `table` for tabular data, landmarks (`header`, `nav`,
  `main`, `footer`), one `h1` per view and no skipped levels. **[APG][default]**
- Incorrect ARIA is worse than none: it misinforms screen-reader users. **[APG]**
- ARIA changes what assistive tech is told, not behaviour: a `role` is a promise to implement the
  keyboard and states that role implies. **[APG]**
- APG examples illustrate patterns; they are not production code — test the result with real
  browsers and screen readers. **[APG]**
- Accessible names: visible label text is the name (or part of it, WCAG 2.5.3 Label in Name);
  icon-only buttons get `aria-label` from the locale file; decorative icons `aria-hidden="true"`.
  **[WCAG] (memory)**
- Images: meaningful `alt` from copy; decorative `alt=""`. **[WCAG 1.1.1] (memory)**

## 2. Keyboard and focus

Verified on 2026-11-07 against https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/

- Everything operable by keyboard (WCAG 2.1.1); no traps (2.1.2); focus order follows meaning
  (2.4.3). **[WCAG] (memory)**
- A composite widget (tabs, listbox, menu, grid, radio group) is one Tab stop; arrows move inside it.
  Use roving `tabindex` (one item `0`, the rest `-1`, call `focus()`), or `aria-activedescendant`
  and scroll the active item into view yourself. **[APG]**
- Keep familiar desktop key bindings; selection must look different from focus. **[APG]**
- Focus is never lost to `body`: after closing a dialog return focus to the trigger; after deleting
  an item move it to the next item or the list heading. **[APG]**
- Modal: native `<dialog>` with `showModal()` gives inert background and Escape; set initial focus to
  the first meaningful control. **(memory)** Vue: reach the element with `useTemplateRef` and render
  it inside `<Teleport to="body">`; React: a `ref`.
- Pointer and keyboard must update the same focus/selection state. **[APG]**

## 3. Live regions and status

Verified on 2026-11-07 against https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html

- A status message is a change that does not move focus and reports a result, a waiting state,
  progress or an error; it must be announced (4.1.3, AA). **[WCAG]**
- `role="status"` for results and success ("5 results"), `role="alert"` for errors that do not move
  focus, `role="log"` for sequential updates. **[WCAG]**
- Render the live-region container once, empty, before putting text in it; screen readers miss
  regions inserted together with their content. **(memory)**
- Toasts: do not auto-dismiss messages that need action; keep them out of the way of focused
  controls (2.4.11). **[default] (memory)**

## 4. WCAG 2.2 AA items that UI code owns

| SC      | Check in code                                                                      | Tag             |
| ------- | ---------------------------------------------------------------------------------- | --------------- |
| 1.3.1   | Structure via elements/landmarks/labels, not only visuals                          | (memory)        |
| 1.4.1   | Errors, states and chart series not by colour alone (icon + text)                  | [default]       |
| 2.4.2   | Each route sets a unique `document.title`                                          | (memory)        |
| 2.4.6   | Headings and labels describe purpose                                               | (memory)        |
| 2.4.11  | Focused element not fully hidden by sticky header/footer/banner (`scroll-padding`) | [WCAG] verified |
| 2.5.7   | Every drag has a single-pointer alternative (buttons, file picker)                 | [default]       |
| 3.2.6   | Help/contact in the same place on every page                                       | [default]       |
| 3.3.1/3 | Errors identified in text with a suggestion                                        | (memory)        |
| 3.3.7   | No redundant entry inside a process                                                | [default]       |
| 3.3.8   | Login: no cognitive test; allow paste and password managers                        | [default]       |
| 4.1.2   | Custom controls expose name, role, value and state                                 | (memory)        |
| 4.1.3   | Status messages announced (see §3)                                                 | [WCAG] verified |

2.4.11 verified on 2026-11-07 against
https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html — partial obscuring
passes; full hiding by author content fails (F110); `scroll-padding` (C43) is the usual fix.

## 5. Charts and data visualisation

Library-neutral; applies whether the repo draws charts with SVG by hand or with a charting library.
**(memory)** for the techniques; SC numbers as in §4.

- Give the chart an accessible name and a one-sentence takeaway (`role="img"` + `aria-label` on a
  static SVG, or a `<figure>` with `<figcaption>`); a screen-reader user should learn the point of the
  chart without exploring it (1.1.1).
- Offer the data as a real `<table>` (visible, behind a "Show data" toggle, or visually hidden), so
  exact values are reachable by keyboard and screen reader and can be copied.
- Use a colour-blind-safe categorical palette with ≥ 3:1 contrast against the background for marks
  (1.4.11), and tell series apart by direct labels, shape, dash or pattern too, not colour alone
  (1.4.1). Check the palette with a colour-vision-deficiency simulator (Chrome DevTools rendering
  emulation).
- Interactive charts: tooltips and data points reachable by keyboard, not hover-only; the same
  information as the table.

## 6. Unit and component tests

Verified on 2026-11-07 against https://testing-library.com/docs/queries/about/ and
https://testing-library.com/docs/user-event/intro

- Principle: tests resemble how users use the UI. **[TL]**
- Query priority: `getByRole` (with `{ name }`) → `getByLabelText` → `getByPlaceholderText` →
  `getByText` → `getByDisplayValue` → `getByAltText` → `getByTitle` → `getByTestId` last. **[TL]**
- `const user = userEvent.setup()` in the test before `render`; `await` every interaction; not in
  `beforeEach`. `user-event` fires the full event sequence and refuses hidden or disabled targets;
  use `fireEvent` only for what `user-event` cannot do. **[TL]**
- `findBy*` for things that appear asynchronously; `queryBy*` only to assert absence. **[TL] (memory)**

**Vue.** Verified on 2026-11-07 against
https://testing-library.com/docs/vue-testing-library/intro and …/vue-testing-library/api

- `@testing-library/vue` (v8 for Vue 3) wraps `@vue/test-utils` and re-exports the DOM Testing
  Library queries. `render(Component, { props, slots, global: { plugins } })`; `emitted()` checks
  emitted events, `await rerender(props)` changes props. **[VTL]** (`global.plugins` passthrough: memory)
- Wrap `render` in a repo helper that installs a fresh Pinia (`createTestingPinia` from
  `@pinia/testing`, or `createPinia()`), `VueQueryPlugin` with a new `QueryClient` (`retry: false`),
  an in-memory router (`createMemoryHistory`, `await router.isReady()`) and vue-i18n. **(memory)**
- Use `@vue/test-utils` directly only for what VTL hides (e.g. stubbing a heavy child, testing a
  composable inside a host component); never assert on `wrapper.vm`. **(memory)**
- Composables without components: test through a tiny host component, or call pure ones directly.
  **(memory)**

**React.**

- `@testing-library/react`; wrap renders in the repo helper that provides `QueryClientProvider`
  (fresh client per test, `retry: false`), router and locale. **[TQ docs on testing] (memory)**
- Name tests as sentences of behaviour ("shows a retry button when the list fails to load").
  **[default]**
- Coverage gates: keep the repo's threshold (default ≥ 80 % lines for UI code). **[default]**

## 7. Faking the network

- Fake at the boundary the app owns: MSW handlers for `fetch`, or the repo's fake API client
  (e.g. `src/test-utils/api-mock.ts`). One handler per state: success, empty list, 500 problem
  details, slow response. **[default] (memory for MSW API)**
- Never mock the composable/hook under test, Pinia, or TanStack Query itself. **(memory)**

## 8. Playwright + axe

- Run against the production build, not the dev server (Vite: `npm run build` then `vite preview`
  as Playwright's `webServer`; a static export: a static file server on a fixed port). Dev servers
  compile on demand and redirect differently, so they hide real failures and add flaky timeouts.
  **[default]**
- Locate with `page.getByRole(...)`/`getByLabel(...)`; web-first assertions (`await
expect(locator).toBeVisible()`); no fixed sleeps. **[PW] (memory)**
- Axe: `new AxeBuilder({ page }).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']).analyze()`;
  fail on `serious`/`critical`; run per main view in light and dark. **[default] (tag names from memory)**
- Cover one journey per acceptance criterion, plus keyboard-only and a 390 px viewport. **[default]**
- Screenshots: `docs/delivery/<slug>/evidence/<view>-<width>.png`; `verify-app` owns the final walk.
  **[default]**
- Axe catches only part of WCAG; the manual keyboard and VoiceOver pass stays. **(memory)**

## 9. What not to test

- Implementation details: state values, `wrapper.vm`, store internals, hook or composable call counts,
  class names, component instance methods. **[TL] (memory)**
- Third-party libraries' own behaviour (router matching, query caching, Pinia reactivity).
- Whole-page DOM snapshots — they break on every copy change and prove nothing.
- Styles in jsdom (no layout engine); check visuals with screenshots and Storybook instead.
