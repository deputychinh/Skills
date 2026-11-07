---
name: frontend
description: Use when adding or changing anything a user sees or clicks in a Vue 3 or React web app — a screen, component, composable or hook, store, form, route or data fetch — even for a small tweak or when the request only says "UI", "page", "form", "frontend" or "the button does nothing". Produces TypeScript UI with state in the right place, every view in loading / empty / error / success, accessible forms, focus and title on route change, copy from locale files, WCAG 2.2 AA, role-based Testing Library tests, Playwright + axe on the production build and XSS-safe rendering. Visual design, tokens and CSS belong to `css-design`. Inside a delivery, `ship` and `deliver-loop` call this skill.
---

# frontend — screens that work for every user, every state, and stay easy to change

Follow the repo's `CLAUDE.md`, `docs/conventions.md` and `docs/design-system.md` first; this skill
fills gaps and never overrides them. Visual work (tokens, layout, colour, CSS) belongs to
`css-design`; running the app as the user will and the final verdict belong to `verify-app`.

**Pick the stack.** Vue 3 and React are both first-class and follow the same rules. Use the
framework the repo already has; for a new app use the frontend default from the delivery profile
(see the repo README), else ask once at triage. Vue: TypeScript + Vite (`npm create vue@latest -- --ts
--router --pinia --vitest --playwright --eslint --prettier`) with `references/vue-patterns.md`.
React: TypeScript + Vite (or the repo's meta-framework) with `references/react-patterns.md`. Never
mix frameworks in one app. Need SSR or SSG for SEO? Record Nuxt or Next.js in an ADR (`architect`);
this skill covers the client-side parts either way.

## Workflow

1. **Load the repo's conventions and inventory.** Read `CLAUDE.md`, `docs/conventions.md`,
   `docs/design-system.md`; list reusable parts (`ls src/components src/features src/composables
src/hooks src/stores`). Detect the data layer, router, form and i18n libraries
   (Vue: `grep -E '"(@tanstack/vue-query|pinia|vue-router|vee-validate|vue-i18n)"' package.json`;
   React: `grep -E '"(@tanstack/react-query|@tanstack/react-router|react-router|react-hook-form|i18next|react-intl)"' package.json`).
   Never add a second data layer, router, store, form or i18n library. _Evidence:_ the story's notes
   list the components and composables/hooks reused and any new one, with the reason.
2. **Write the state table before code.** For each view: every piece of data and where it lives —
   server (query), URL (route params / search), shared client (Pinia store, or React context or the
   repo's store), local (`ref` / `useState`), derived (`computed` / a const in render), external (a
   composable or `useSyncExternalStore` wrapping the browser API). Then list the four states
   (loading, empty, error, success) and the copy keys for each. _Evidence:_ the table in the story.
3. **Write the failing tests first.** Vitest + `@testing-library/vue` or `@testing-library/react`,
   `userEvent.setup()`, queries by role and accessible name, one behaviour per test, network faked at
   the service boundary (MSW or the repo's fake client in `src/test-utils`). Cover each state, the
   keyboard path and one negative case. _Evidence:_ the run shows red for the right reason.
4. **Build inside the feature folder.** `src/features/<name>/services` (typed API calls, no framework)
   → `composables` / `hooks` (`useX` wrapping `useQuery`/`useMutation` and a key factory) →
   `components` (`Name.vue` with `<script setup lang="ts">`, or `Name.tsx`) → the route view that
   composes them. Props and events typed, no `any`, no non-null `!`, `@/` imports. _Evidence:_
   `git diff --stat` stays inside the feature plus deliberate shared changes.
5. **Copy and formatting.** Every visible string comes from the locale files (vue-i18n `useI18n()`,
   or the React repo's i18n library or copy module) with the same keys in every locale; a test
   enforces parity. Numbers and dates through the i18n formatter or `Intl`. _Evidence:_ parity test
   green; no hard-coded copy, enforced by lint (`@intlify/vue-i18n/no-raw-text`; React:
   `react/jsx-no-literals` or the i18n plugin's rule) — cite the lint exit code.
6. **Style it with `css-design`.** Tokens only, BEM block = component name, every state styled;
   `.vue` styles linted through `postcss-html`. _Evidence:_ Stylelint green.
7. **Stories (component libraries).** One story per state, both themes; Storybook axe passes.
   _Evidence:_ the stories test and axe run.
8. **Gates, chained by exit code.** `npm run lint && npm run type-check && npm run test:unit -- --run`
   (Vue: `vue-tsc --build`; React: `tsc -b`), or `make ci`; never judge from `| tail`.
   _Evidence:_ exit code 0 and coverage at or above the repo threshold.
9. **Journey in a real browser against the production build.** `npm run build` and serve the output
   (`vite preview`, or the static server the repo uses). Add or extend a Playwright spec for the main
   path with `@axe-core/playwright` (tags `wcag2a wcag2aa wcag21aa wcag22aa`, serious and critical =
   0). Capture `docs/delivery/<slug>/evidence/<view>-390.png` and `-1280.png`, plus dark theme if the
   app has one. Open every screenshot before citing it. _Evidence:_ spec green, PNGs.
10. **Keyboard and screen-reader pass.** Tab through the new view: order, visible focus, Escape
    closes overlays and focus returns to the trigger; after navigation focus lands on the new heading
    and the title changed. Spot-check names and announcements with a screen reader (VoiceOver
    `Cmd+F5`, or NVDA). _Evidence:_ a three-line note in the story's QA section.
11. **Hand over.** Run `verify-app` for the end-to-end claim; inside `deliver-loop` the independent
    review grades the item. Do not restate their steps here.

## Core checklist

1. Nothing stored that can be derived: use `computed` (React: a const in render); no watcher or
   effect whose only job is to set other state.
2. Watchers and effects only sync with the outside (DOM APIs, subscriptions, timers, third-party
   widgets) and clean up (`onWatcherCleanup`/`onUnmounted`; React: the effect's return). Work caused
   by a user action runs in the event handler.
3. Server data is never copied into local state or a store; query keys contain every input the fetch
   uses (in Vue as refs or getters, so a change refetches).
4. Selection, filters, tabs and pagination a user would share or reload live in the URL query.
5. Every data view renders loading, empty, error (with retry) and success; tests cover all four.
6. Every input has a visible `<label for>` (ids from `useId()` in both frameworks); errors are text
   tied with `aria-describedby`, input is kept, focus moves to the first invalid field on submit.
7. Native elements first (`button`, `a href`/router link, `dialog`, `details`, `input type`); no
   `div @click` / `div onClick`.
8. Custom widgets follow the matching WAI-ARIA APG pattern, keyboard included.
9. Async results that do not move focus are announced via a `role="status"`/`role="alert"` region
   rendered once and empty (Vue: teleported to `body`; React: a portal, if it must outlive the view).
10. Route change: `document.title` updated and focus moved to the page `h1` or `main` (Vue: a
    `router.afterEach` + template ref; React: the router's equivalent).
11. Errors are caught per route and per risky widget (Vue: an `onErrorCaptured` boundary component;
    React: an error boundary) and show a retry, never a blank page.
12. No hard-coded display strings; every locale has the same keys.
13. Tests query by role/label/text, interact with `user-event`, and never assert on class names,
    component internals (`wrapper.vm`, state values), or composable/hook calls.
14. No `v-html` / `dangerouslySetInnerHTML` unless sanitized with DOMPurify right before use; URLs
    from data are allow-listed to `https:`/`mailto:`/relative.
15. `shallowRef`/`markRaw`/`v-memo`/`KeepAlive` (React: `memo`/`useMemo`/`useCallback`) only with a
    profiler measurement or a documented need.
16. Charts and data visualisations have an accessible name and summary, a data-table (or text)
    alternative, a colour-blind-safe palette with series also told apart by label, shape or pattern,
    and keyboard access to any interaction — whichever chart library the repo uses.

## Anti-patterns

Vue:

- `watch(items, v => { filtered.value = v.filter(...) })` — use `computed`.
- `const { count } = reactive(state)` or `const { name } = store` — reactivity lost; use `toRefs`
  / `storeToRefs`, or prefer `ref`.
- `watch(props.id, ...)` or passing a destructured prop to a composable — pass a getter `() => id`.
- Mutating a prop or `useQuery` data; binding query data straight to `v-model` — copy into a form.
- `v-if` and `v-for` on the same element; `:key="index"` on a reorderable list.
- `await` before `onWatcherCleanup` or before registering lifecycle hooks in a composable.
- `defineAsyncComponent` for a route component (routes take `() => import(...)` directly).
- `next()` in a navigation guard — return `false`, a location, or nothing.
- Tests reaching into `wrapper.vm` or calling `setData`.

React:

- `useEffect(() => setFiltered(items.filter(...)), [items])` — compute in render.
- Resetting a form in an effect when an id changes — pass `key={id}`.
- Hooks called inside conditions or loops; state mutated in place instead of replaced.
- `key={index}` on a reorderable list; a new object or function prop on every render passed to a
  memoised child that was memoised for a measured reason.

Both:

- Fetching on mount with no cancel, cache, retry or error branch — use the data layer.
- Spinner with no empty or error branch; error swallowed into `console.log`.
- `staleTime` left at 0 for data that changes daily, so every focus refetches.
- Optimistic update without snapshot, rollback and invalidate on settle.
- Placeholder used as the label; colour alone marking an error; `role="button"` without keys.
- `getByTestId` everywhere; whole-page snapshots; testing implementation details.
- A feature barrel file pulling everything into the first route chunk.
- `:href="user.url"` / `href={user.url}` without checking the scheme.

## Evidence before "done"

- Failing-then-passing unit tests for each state and the keyboard path.
- Lint, `vue-tsc` or `tsc`, tests chained, exit 0; coverage at or above threshold.
- Playwright journey against the production build, axe serious/critical = 0.
- Screenshots at 390 and 1280 px (and dark theme) in `docs/delivery/<slug>/evidence/`, each opened.
- Keyboard and screen-reader note in the story's QA section.
- Then `verify-app`.

## References

- `references/vue-patterns.md` — the Vue checklist: SFC and component API, reactivity pitfalls,
  computed vs watch, composables, Pinia, TanStack Query for Vue, Vue Router (URL state, guards,
  focus), forms, i18n, a11y specifics, performance, security, tooling; each item sourced.
- `references/react-patterns.md` — the React checklist: the same topics, plus a static-export
  (Next.js / Nuxt generate) variant.
- `references/a11y-and-testing.md` — WCAG 2.2 AA items for UI code, ARIA/APG, keyboard and live
  regions, charts, Testing Library for Vue and React, MSW, Playwright + axe, what not to test.
