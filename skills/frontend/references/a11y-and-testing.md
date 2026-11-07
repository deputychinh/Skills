# Accessibility and testing for React UI

Tags: **[WCAG]** WCAG 2.2 Understanding docs, **[APG]** WAI-ARIA Authoring Practices, **[TL]**
Testing Library, **[house]**, **[PW]** Playwright. **(memory)** = not re-checked online for this draft.
Visual criteria (contrast, focus appearance, target size, motion) live in `css-design`.

## Contents

1. Semantics and ARIA
2. Keyboard and focus
3. Live regions and status
4. WCAG 2.2 AA items that UI code owns
5. Unit and component tests
6. Faking the network
7. Playwright + axe
8. What not to test

## 1. Semantics and ARIA

Verified on 2026-11-07 against https://www.w3.org/WAI/ARIA/apg/practices/read-me-first/

- Native HTML first: `button` for actions, `a href` for navigation, `form`/`label`/`fieldset`/
  `legend`, `dialog`, `details/summary`, `table` for tabular data, landmarks (`header`, `nav`,
  `main`, `footer`), one `h1` per view and no skipped levels. **[APG][house]**
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
  the first meaningful control. **(memory)**
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
  controls (2.4.11). **[house] (memory)**

## 4. WCAG 2.2 AA items that UI code owns

| SC      | Check in code                                                                      | Tag             |
| ------- | ---------------------------------------------------------------------------------- | --------------- |
| 1.3.1   | Structure via elements/landmarks/labels, not only visuals                          | (memory)        |
| 1.4.1   | Errors, states and chart series not by colour alone (icon + text)                  | [house]         |
| 2.4.2   | Each route sets a unique `document.title`                                          | (memory)        |
| 2.4.6   | Headings and labels describe purpose                                               | (memory)        |
| 2.4.11  | Focused element not fully hidden by sticky header/footer/banner (`scroll-padding`) | [WCAG] verified |
| 2.5.7   | Every drag has a single-pointer alternative (buttons, file picker)                 | [house]         |
| 3.2.6   | Help/contact in the same place on every page                                       | [house]         |
| 3.3.1/3 | Errors identified in text with a suggestion                                        | (memory)        |
| 3.3.7   | No redundant entry inside a process                                                | [house]         |
| 3.3.8   | Login: no cognitive test; allow paste and password managers                        | [house]         |
| 4.1.2   | Custom controls expose name, role, value and state                                 | (memory)        |
| 4.1.3   | Status messages announced (see §3)                                                 | [WCAG] verified |

2.4.11 verified on 2026-11-07 against
https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html — partial obscuring
passes; full hiding by author content fails (F110); `scroll-padding` (C43) is the usual fix.

## 5. Unit and component tests

Verified on 2026-11-07 against https://testing-library.com/docs/queries/about/ and
https://testing-library.com/docs/user-event/intro

- Principle: tests resemble how users use the UI. **[TL]**
- Query priority: `getByRole` (with `{ name }`) → `getByLabelText` → `getByPlaceholderText` →
  `getByText` → `getByDisplayValue` → `getByAltText` → `getByTitle` → `getByTestId` last. **[TL]**
- `const user = userEvent.setup()` in the test before `render`; `await` every interaction; not in
  `beforeEach`. `user-event` fires the full event sequence and refuses hidden or disabled targets;
  use `fireEvent` only for what `user-event` cannot do. **[TL]**
- `findBy*` for things that appear asynchronously; `queryBy*` only to assert absence. **[TL] (memory)**
- Wrap renders in the repo helper that provides `QueryClientProvider` (fresh client per test,
  `retry: false`), router and locale. **[TQ docs on testing] (memory)**
- Name tests as sentences of behaviour ("shows a retry button when the list fails to load"). **[house]**
- Coverage gates: Kiln web ≥ 80 % lines; keep the repo's threshold. **[house]**

## 6. Faking the network

- Fake at the boundary the app owns: MSW handlers for `fetch`, or the repo's fake API client
  (`src/test-utils/api-mock.ts` in AEC). One handler per state: success, empty list, 500 problem
  details, slow response. **[house] (memory for MSW API)**
- Never mock the hook under test or TanStack Query itself. **(memory)**

## 7. Playwright + axe

- Run against the production build, not the dev server (AEC: build, serve the export on 8765).
  **[house]**
- Locate with `page.getByRole(...)`/`getByLabel(...)`; web-first assertions (`await
expect(locator).toBeVisible()`); no fixed sleeps. **[PW] (memory)**
- Axe: `new AxeBuilder({ page }).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']).analyze()`;
  fail on `serious`/`critical`; run per main view in light and dark. **[house] (tag names from memory)**
- Cover one journey per acceptance criterion, plus keyboard-only and a 390 px viewport. **[house]**
- Screenshots: `docs/delivery/<slug>/evidence/<view>-<width>.png`; `verify-app` owns the final walk.
  **[house]**
- Axe catches only part of WCAG; the manual keyboard and VoiceOver pass stays. **(memory)**

## 8. What not to test

- Implementation details: state values, hook call counts, class names, component instance methods.
  **[TL] (memory)**
- Third-party libraries' own behaviour (router matching, query caching).
- Whole-page DOM snapshots — they break on every copy change and prove nothing.
- Styles in jsdom (no layout engine); check visuals with screenshots and Storybook instead.
