---
name: frontend
description: Use when adding or changing a screen, component, composable, store, form, route or data fetch in a Vue 3 app — or in a React app when the repo already uses React — or when David says "giao diện", "UI", "màn hình", "component", "form", "trang", "frontend", "Vue", "React" or "sửa giao diện". Builds TypeScript UI the house way — `<script setup lang="ts">` components with typed props, emits and `defineModel`, composables that return refs, state in the right place (TanStack Query or the repo's data composable for server state, the router for URL state, Pinia only for shared client state, local refs for the rest), every view with loading / empty / error / success, forms with kept input and tied errors, focus and title on route change, copy from locale files, WCAG 2.2 AA, role-based tests with Testing Library, Playwright + axe against the production build, and XSS-safe rendering. For visual design, tokens and CSS use `css-design`. Inside a delivery, `ship` and `deliver-loop` call this skill.
---

# frontend — screens that work for every user, every state, and stay easy to change

Follow the repo's `CLAUDE.md`, `docs/conventions.md` and `docs/design-system.md` first; this skill
fills gaps and never overrides them. Visual work (tokens, layout, colour, CSS) belongs to
`css-design`; running the app as David will and the final verdict belong to `verify-app`.

**Pick the stack.** New apps are Vue 3 + TypeScript + Vite (`npm create vue@latest -- --ts --router
--pinia --vitest --playwright --eslint --prettier`), with `references/vue-patterns.md`. Use React only
when the repo already is React — David's Kiln and american-english-coach are — and then follow
`references/react-patterns.md`. Never mix frameworks in one app. Need SSR or SSG for SEO? Note the
choice of Nuxt in an ADR (`architect`); this skill covers the client-side parts either way.

## Workflow

1. **Load the house rules and inventory.** Read `CLAUDE.md`, `docs/conventions.md`,
   `docs/design-system.md`; list reusable parts (`ls src/components src/features src/composables
src/stores`). Detect the data layer, router, form and i18n libraries
   (`grep -E '"(@tanstack/vue-query|pinia|vue-router|vee-validate|vue-i18n)"' package.json`).
   React: `grep -l "@tanstack/react-query\|useAsync" -r src | head`, TanStack Router or Next `app/`.
   Never add a second data layer, router, store, form or i18n library. _Evidence:_ the story's notes
   list the components and composables reused and any new one, with the reason.
2. **Write the state table before code.** For each view: every piece of data and where it lives —
   server (query), URL (`route.params`/`route.query`), shared client (Pinia store), local (`ref`),
   derived (`computed`), external (a composable wrapping the browser API). React: query, URL,
   `useState`, render-time const, `useSyncExternalStore`. Then list the four states (loading, empty,
   error, success) and the copy keys for each. _Evidence:_ the table in the story file.
3. **Write the failing tests first.** Vitest + `@testing-library/vue` (React: `@testing-library/react`),
   `userEvent.setup()`, queries by role and accessible name, one behaviour per test, network faked at
   the service boundary (MSW or the repo's fake client in `src/test-utils`). Cover each state, the
   keyboard path and one negative case. _Evidence:_ the run shows red for the right reason.
4. **Build inside the feature folder.** `src/features/<name>/services` (typed API calls, no framework)
   → `composables` (`useX` wrapping `useQuery`/`useMutation` and a key factory; React: `hooks`) →
   `components` (`Name.vue`, `<script setup lang="ts">`) → the route view that composes them. Props
   and emits typed, no `any`, no non-null `!`, `@/` imports. _Evidence:_ `git diff --stat` stays
   inside the feature plus deliberate shared changes.
5. **Copy and formatting.** Every visible string comes from the locale files (vue-i18n `useI18n()`
   in Composition mode; React: the repo's copy module) with the same keys in `en` and `vi`; a test
   enforces parity. Numbers and dates through `n()`/`d()` or `Intl`. _Evidence:_ parity test green;
   no hard-coded copy, enforced by lint (`@intlify/vue-i18n/no-raw-text` or
   `vue/no-bare-strings-in-template`; React: `react/jsx-no-literals`) — cite the lint exit code.
6. **Style it with `css-design`.** Tokens only, BEM block = component name, every state styled;
   `.vue` styles linted through `postcss-html`. _Evidence:_ Stylelint green.
7. **Stories (component libraries).** One story per state, both themes; Storybook axe passes.
   _Evidence:_ the stories test and axe run.
8. **Gates, chained by exit code.** `npm run lint && npm run type-check && npm run test:unit -- --run`
   (`vue-tsc --build` does the type check; React: `tsc -b`), or `make ci`; never judge from `| tail`.
   _Evidence:_ exit code 0 and coverage at or above the repo threshold.
9. **Journey in a real browser against the production build.** `npm run build` and serve the output
   (`vite preview`, or the static server the repo uses). Add or extend a Playwright spec for the main
   path with `@axe-core/playwright` (tags `wcag2a wcag2aa wcag21aa wcag22aa`, serious and critical =
   0). Capture `docs/delivery/<slug>/evidence/<view>-390.png` and `-1280.png`, plus dark theme if the
   app has one. Open every screenshot before citing it. _Evidence:_ spec green, PNGs.
10. **Keyboard and screen-reader pass.** Tab through the new view: order, visible focus, Escape
    closes overlays and focus returns to the trigger; after navigation focus lands on the new heading
    and the title changed. Spot-check names and announcements with VoiceOver (`Cmd+F5`).
    _Evidence:_ a three-line note in the story's QA section.
11. **Hand over.** Run `verify-app` for the end-to-end claim; inside `deliver-loop` the independent
    review grades the item. Do not restate their steps here.

## Core checklist

1. Nothing stored that can be derived: use `computed` (React: a const in render); no watcher or
   effect whose only job is to set other state.
2. Watchers and effects only sync with the outside (DOM APIs, subscriptions, timers, third-party
   widgets) and clean up (`onWatcherCleanup`/`onUnmounted`; React: the effect's return). Work caused
   by a user action runs in the event handler.
3. Server data is never copied into a `ref` or store; query keys contain every input the fetch uses,
   as refs or getters in Vue so a change refetches.
4. Selection, filters, tabs and pagination a user would share or reload live in the URL query.
5. Every data view renders loading, empty, error (with retry) and success; tests cover all four.
6. Every input has a visible `<label for>` (ids from `useId()`; React: `useId`); errors are text tied
   with `aria-describedby`, input is kept, focus moves to the first invalid field on submit.
7. Native elements first (`button`, `a href`/`RouterLink`, `dialog`, `details`, `input type`); no
   `div @click` (React: `div onClick`).
8. Custom widgets follow the matching WAI-ARIA APG pattern, keyboard included.
9. Async results that do not move focus are announced via a `role="status"`/`role="alert"` region
   rendered once and empty (Vue: teleported to `body` if it must outlive the view).
10. Route change: `document.title` updated and focus moved to the page `h1` or `main` (Vue: a
    `router.afterEach` + template ref; React: the router's equivalent).
11. Errors are caught per route and per risky widget (`onErrorCaptured` boundary component; React:
    error boundary) and show a retry, never a blank page.
12. No hard-coded display strings; `en` and `vi` have the same keys.
13. Tests query by role/label/text, interact with `user-event`, and never assert on class names,
    component internals (`wrapper.vm`), or composable/hook calls.
14. No `v-html` (React: `dangerouslySetInnerHTML`) unless sanitized with DOMPurify right before use;
    URLs from data are allow-listed to `https:`/`mailto:`/relative.
15. `shallowRef`/`markRaw`/`v-memo`/`KeepAlive` (React: `memo`/`useMemo`/`useCallback`) only with a
    profiler measurement or a documented need.

## Anti-patterns

Vue:

- `watch(items, v => { filtered.value = v.filter(...) })` — use `computed`.
- `const { count } = reactive(state)` or `const { name } = store` — reactivity lost; use `toRefs`
  / `storeToRefs`, or prefer `ref`.
- `watch(props.id, ...)` or passing a destructured prop to a composable — pass a getter `() => id`.
- Mutating a prop or `useQuery` data; binding query data straight to `v-model` — copy into a form.
- `v-if` and `v-for` on the same element; `:key="index"` on a reorderable list.
- `await` before `onWatcherCleanup` or before registering lifecycle hooks in a composable.
- Fetching in `onMounted` with no cancel, cache, retry or error branch.
- `defineAsyncComponent` for a route component (routes take `() => import(...)` directly).
- `next()` in a navigation guard — return `false`, a location, or nothing.
- `@testing-library/vue` tests reaching into `wrapper.vm` or calling `setData`.

React (existing repos):

- `useEffect(() => setFiltered(items.filter(...)), [items])` — compute in render.
- Resetting a form in an effect when an id changes — pass `key={id}`.
- Fetching in `useEffect` without cleanup or a query library.

Both:

- Spinner with no empty or error branch; error swallowed into `console.log`.
- `staleTime` left at 0 for data that changes daily, so every focus refetches.
- Optimistic update without snapshot, rollback and invalidate on settle.
- Placeholder used as the label; colour alone marking an error; `role="button"` without keys.
- `getByTestId` everywhere; whole-page snapshots; testing implementation details.
- A feature barrel file pulling everything into the first route chunk.
- `:href="user.url"` / `href={user.url}` without checking the scheme.

## Evidence before "done"

- Failing-then-passing unit tests for each state and the keyboard path.
- Lint, `vue-tsc` (or `tsc`), tests chained, exit 0; coverage at or above threshold.
- Playwright journey against the production build, axe serious/critical = 0.
- Screenshots at 390 and 1280 px (and dark theme) in `docs/delivery/<slug>/evidence/`, each opened.
- Keyboard and VoiceOver note in the story's QA section.
- Then `verify-app`.

## References

- `references/vue-patterns.md` — the Vue checklist: SFC and component API, reactivity pitfalls,
  computed vs watch, composables, Pinia, TanStack Query for Vue, Vue Router (URL state, guards,
  focus), forms, i18n, a11y specifics, performance, security, tooling; each item sourced.
- `references/react-patterns.md` — React (secondary): the same topics for existing React repos.
- `references/a11y-and-testing.md` — WCAG 2.2 AA items for UI code, ARIA/APG, keyboard and live
  regions, Testing Library (Vue first, React second), MSW, Playwright + axe, what not to test.
