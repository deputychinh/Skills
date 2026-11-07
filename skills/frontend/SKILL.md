---
name: frontend
description: Builds React + TypeScript UI the house way — feature folders, small typed component APIs, state in the right place (TanStack Query or the repo's data hook for server state, the router for URL state, local state for the rest), every view with loading / empty / error / success, forms with kept input and tied errors, focus management on route change, copy from locale files, WCAG 2.2 AA, role-based tests, Playwright + axe against the production build, and XSS-safe rendering. Use when adding or changing a screen, component, hook, form, route or data fetch in a React app (Vite + TanStack Router, or a Next.js static export), or when David says "giao diện", "UI", "màn hình", "component", "form", "trang", "frontend", "React" or "sửa giao diện". For visual design, tokens and CSS use `css-design`. Inside a delivery, `ship` and `deliver-loop` call this skill.
---

# frontend — screens that work for every user, every state, and stay easy to change

Follow the repo's `CLAUDE.md`, `docs/conventions.md` and `docs/design-system.md` first; this skill
fills gaps and never overrides them. Visual work (tokens, layout, colour, CSS) belongs to
`css-design`; running the app as David will and the final verdict belong to `verify-app`.

## Workflow

1. **Load the house rules and inventory.** Read `CLAUDE.md`, `docs/conventions.md`,
   `docs/design-system.md`; list reusable parts (`ls src/components packages/ui/src/components`,
   `ls src/features src/hooks`). Detect the data layer (`grep -l "@tanstack/react-query\|useAsync"
-r src | head`) and the router (TanStack Router file routes or Next.js `app/`). Never add a second
   data layer, router, form or i18n library. _Evidence:_ the story's notes list the components and
   hooks reused and any new one, with the reason.
2. **Write the state table before code.** For each view: every piece of data and where it lives —
   server (query), URL (path/search params), local (`useState`/`useReducer`), derived (computed in
   render), external (`useSyncExternalStore` or an effect). Then list its four states (loading,
   empty, error, success) and the copy keys for each. _Evidence:_ the table in the story file.
3. **Write the failing tests first.** Vitest + Testing Library, `userEvent.setup()`, queries by role
   and accessible name, one behaviour per test, network faked at the service boundary (MSW or the
   repo's fake fetch in `src/test-utils`). Cover each state, the keyboard path, and one negative case.
   _Evidence:_ the test run shows red for the right reason.
4. **Build inside the feature folder.** `src/features/<name>/services` (typed API calls, no React)
   → `hooks` (query/mutation or `useAsync` wrappers, key factory) → `components` → the route file
   that composes them. Arrow functions, props typed, no `any`, no non-null `!`, `@/` imports; enums,
   constants and interfaces in their single-source folders. _Evidence:_ `git diff --stat` stays inside
   the feature plus deliberate shared changes.
5. **Copy and formatting.** Every visible string comes from `src/locales/en*.ts` with the same key in
   `vi*.ts` (the locales test enforces parity); numbers and dates through `Intl`. _Evidence:_ locales
   test green; `grep -rnE --include='*.tsx' '>[^<{}]*[A-Za-z]{3,}[^<{}]*<' src/features/<name> | grep -vE ':\s*(Promise|Array|Record|ChangeEvent)<'` finds no
   hard-coded copy.
6. **Style it with `css-design`.** Tokens only, BEM block = file name, component states styled.
   _Evidence:_ Stylelint green.
7. **Stories (component libraries).** One story per state in `<Name>.stories.tsx`, sample data from
   `.storybook/`; the stories test and Storybook axe pass in both themes. _Evidence:_ `make test` and
   the Storybook axe run (`make e2e-ui` in Kiln).
8. **Gates, chained by exit code.** `make ci` or `npm run lint && npm run typecheck && npm test`;
   never judge from `| tail`. _Evidence:_ exit code 0 and coverage at or above the repo threshold.
9. **Journey in a real browser against the production build.** Add or extend a Playwright spec for
   the main path with an axe check (`@axe-core/playwright`, tags `wcag2a wcag2aa wcag21aa wcag22aa`,
   serious and critical = 0). Capture `docs/delivery/<slug>/evidence/<view>-390.png` and
   `-1280.png` (e.g. `npx playwright screenshot --viewport-size "390,844" <url> <file>`), plus dark
   theme if the app has one. Open every screenshot before citing it. _Evidence:_ spec green, PNGs.
10. **Keyboard and screen-reader pass.** Tab through the new view: order, visible focus, Escape
    closes overlays and focus returns to the trigger; after navigation focus lands on the new
    heading or main. Spot-check names and announcements with VoiceOver (`Cmd+F5`). _Evidence:_ a
    three-line note in the story's QA section.
11. **Hand over.** Run `verify-app` for the end-to-end claim; inside `deliver-loop` the independent
    review grades the item. Do not restate their steps here.

## Core checklist

1. No state that can be computed from props or other state; no effect that only sets state.
2. Effects only sync with external systems (DOM APIs, subscriptions, timers, non-React widgets) and
   always clean up; user-caused work runs in the event handler.
3. Server data never copied into `useState`; query keys contain every input the fetch uses.
4. Selection, filters, tabs and pagination that a user would share or reload live in the URL.
5. Every data view renders loading, empty, error (with retry) and success; tests cover all four.
6. Every input has a visible `<label>`; errors are text tied with `aria-describedby`, input is kept,
   focus moves to the first invalid field on submit.
7. Native elements first (`button`, `a href`, `dialog`, `details`, `input type`); no `div onClick`.
8. Interactive custom widgets follow the matching WAI-ARIA APG pattern, keyboard included.
9. Async results that do not move focus are announced through `role="status"` or `role="alert"`.
10. Route change: document title updated, focus moved to the page heading or `main`.
11. An error boundary wraps each route and each risky widget; it shows a retry, never a blank page.
12. No hard-coded display strings; `en` and `vi` have the same keys.
13. Tests query by role/label/text, interact with `user-event`, and never assert on class names,
    internal state or hook calls.
14. No `dangerouslySetInnerHTML` unless the HTML is sanitized with DOMPurify right before use; URLs
    from data are allow-listed to `https:`/`mailto:`/relative.
15. `memo`/`useMemo`/`useCallback` only with a profiler measurement or a documented identity need.

## Anti-patterns

- `useEffect(() => setFiltered(items.filter(...)), [items])` — compute in render instead.
- Resetting a form in an effect when an id changes — pass `key={id}` instead.
- Calling a parent's `onChange` from an effect — call it in the same handler that sets state.
- Fetching in `useEffect` without cleanup or a query library (race conditions, no cache, no retry).
- `isLoading && <Spinner/>` with no empty or error branch; error swallowed into `console.log`.
- `staleTime` left at 0 for data that changes daily, so every focus refetches.
- Optimistic update without snapshot, rollback and `invalidateQueries` on settle.
- `aria-label` on a `div` with `onClick`; `role="button"` without Enter/Space handling and tabindex.
- Placeholder used as the label; colour alone marking an error.
- `getByTestId` everywhere; snapshot tests of whole pages; testing implementation details.
- One `index.ts` barrel re-exporting a whole feature into the first route chunk.
- Building HTML strings from user content; `href={user.url}` without checking the scheme.

## Evidence before "done"

- Failing-then-passing unit tests for each state and the keyboard path.
- `make ci` (or the repo's chain) exit 0, coverage at or above threshold.
- Playwright journey against the production build, axe serious/critical = 0.
- Screenshots at 390 and 1280 px (and dark theme) in `docs/delivery/<slug>/evidence/`, each opened.
- Keyboard and VoiceOver note in the story's QA section.
- Then `verify-app`.

## References

- `references/react-patterns.md` — state placement, effects, data fetching with TanStack Query,
  forms, routing and focus, error boundaries, i18n, performance, security; each item sourced.
- `references/a11y-and-testing.md` — WCAG 2.2 AA items for UI code, ARIA/APG rules, keyboard and
  live regions, Testing Library, MSW, Playwright + axe, what not to test.
