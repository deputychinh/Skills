# React patterns

> Use this file when the app is React; Vue apps follow `vue-patterns.md`. Stack-neutral rules (four
> states, forms, a11y, testing, security) match the Vue file, and both stacks are first-class.

Tags: **[react.dev]**, **[TQ]** TanStack Query, **[TR]** TanStack Router, **[OWASP]**, **[web.dev]**,
**[patterns.dev]**, **[default]** these skills' default conventions (see `init-project`'s
`frontend-and-ux.md` reference) — the repo's own conventions win. Items marked **(memory)** were not
re-checked online for this draft.

## Contents

1. Folder structure
2. Component API design
3. State placement and effects
4. Data fetching
5. Forms and validation
6. Routing, focus and error boundaries
7. i18n
8. Performance basics
9. Security
10. Static export (Next.js / Nuxt generate) variant

## 1. Folder structure

- `src/features/<name>/{services,hooks,components}`; routes compose features; shared parts in
  `src/components` (app) or `packages/ui` (library). Enums, constants, interfaces live once in
  `src/enums`, `src/constants`, `src/interfaces`. **[default]**
- Services are plain typed functions over the generated API client (OpenAPI types); no React in
  services, so they are unit-testable and fakeable. **[default]**
- One component per file; `Name.tsx`, `Name.css`, `Name.test.tsx`, `Name.stories.tsx` side by side.
  **[default]**
- Avoid feature-wide barrel files that pull everything into one chunk. **[patterns.dev] (memory)**

## 2. Component API design

- Start from the UI hierarchy: split by single responsibility, build a static version from props,
  then find the minimal state and where it lives. **[react.dev "Thinking in React"] (memory)**
- Props are the smallest typed surface: domain values and callbacks named `onX` for events. Extend
  the native element's attributes (`ButtonHTMLAttributes<HTMLButtonElement>`) for primitives and
  spread the rest, so `aria-*`, `disabled`, `type` work. **[default]**
- Prefer composition (`children`, slots as props) over boolean flags multiplying variants; a variant
  is an enum value, not three booleans. **[patterns.dev] (memory)**
- Controlled vs uncontrolled: a component is controlled when its parent owns the value (`value` +
  `onChange`), uncontrolled when it keeps its own (`defaultValue`). Pick one per prop; never switch
  during a component's life. **[react.dev] (memory)**
- Copy enters primitives through props (no strings inside `packages/ui`). **[default]**
- Components and hooks are pure during render; hooks are called at the top level only, never in
  conditions or loops; only from components or custom hooks. **[react.dev Rules of Hooks] (memory)**

## 3. State placement and effects

Verified on 2026-11-07 against https://react.dev/learn/you-might-not-need-an-effect

| Data                            | Home                                                  |
| ------------------------------- | ----------------------------------------------------- |
| From the server                 | TanStack Query, or the repo's data hook + service     |
| Shareable / survives reload     | URL path or search params                             |
| Ephemeral UI (open, draft text) | `useState` / `useReducer` in the lowest common owner  |
| Computable from the above       | a `const` in render (`useMemo` only if measured slow) |
| Browser or third-party store    | `useSyncExternalStore`                                |

- Derived values are computed during render, not mirrored into state by an effect. **[react.dev]**
- Reset a subtree when an identity changes with `key={id}`, not an effect. **[react.dev]**
- Keep an id in state and derive the object (`items.find(i => i.id === selectedId)`) instead of
  storing the object. **[react.dev]**
- Logic caused by a user action goes in the event handler; effects that react to state cause
  double-fires on load/refresh and effect chains. **[react.dev]**
- Notify parents in the same handler that changes state, or lift state up. **[react.dev]**
- App-wide initialisation runs once at module level, not in a top-level effect (Strict Mode runs
  effects twice in development). **[react.dev]**
- A fetch inside an effect needs a cleanup flag against races — but prefer the data layer.
  **[react.dev]**

## 4. Data fetching

Verified on 2026-11-07 against https://tanstack.com/query/latest/docs/framework/react/guides/important-defaults,
…/guides/query-keys and …/guides/optimistic-updates

- Query keys are arrays, JSON-serializable, unique to the data, and contain every variable the query
  function uses; object key order does not matter, array order does. **[TQ]**
- Use a key factory per feature (`assetKeys.all`, `.list(filters)`, `.detail(id)`) so invalidation can
  target a prefix. **[TQ community practice] (memory)**
- Defaults: cached data is stale immediately (`staleTime` 0), inactive queries are garbage-collected
  after 5 minutes, failures retry 3 times with backoff, stale queries refetch on window focus, and
  structural sharing keeps references stable. Set `staleTime` per query from how often data really
  changes. **[TQ]**
- Distinguish first load (`isPending`) from background refetch (`isFetching`); keep showing data
  during a refetch. **[TQ] (memory)**
- After a mutation, `invalidateQueries` on the affected prefix; `setQueryData` only when the
  response is the full new entity. **[TQ] (memory)**
- Optimistic updates, two ways: (a) render from the mutation's `variables` while pending — no cache
  work, best when one place shows the change; (b) in `onMutate` cancel queries, snapshot with
  `getQueryData`, write with `setQueryData`, return the snapshot; restore it in `onError`;
  invalidate in `onSettled`. **[TQ]**
- Errors from the API are RFC 9457 problem details with a stable `code`; map code → locale key once at
  the UI boundary. **[default]**
- Four states per view: skeleton (reserve the final size, no layout shift), empty (what to do
  first), error (what failed + retry), success. **[default]**

## 5. Forms and validation

- Every field has a visible `<label for>`; required and format rules are stated before input. **[WCAG 3.3.2] (memory)**
- Validate on blur and on submit; show errors as text next to the field, linked with
  `aria-describedby`, set `aria-invalid="true"`; on submit move focus to the first invalid field or
  to an error summary. **[default][WCAG 3.3.1] (memory)**
- Keep what the user typed after an error; do not ask again for data already given in the same
  process (WCAG 3.3.7 Redundant Entry). **[default]**
- Validate with the repo's schema library (e.g. zod) at the boundary; the server re-validates.
  **[default]**
- React 19: `useActionState(action, initialState)` returns `[state, dispatch, isPending]`; pass the
  dispatcher to `<form action>`; return the submitted values on error to keep input, because the
  form resets after a successful action. Verified on 2026-11-07 against
  https://react.dev/reference/react/useActionState **[react.dev]**
- Disable the submit button only while pending; when the form is invalid, keep it enabled and explain
  on submit, or explain why it is disabled. **[default]**

## 6. Routing, focus and error boundaries

- URL state: TanStack Router `validateSearch` with a zod schema (zod 4 accepted directly); read with
  `Route.useSearch()`; update with `navigate({ search: prev => ({ ...prev, page: 2 }) })`. Search
  params keep types (JSON-parsed) and survive reload, share and new tab. Verified on 2026-11-07
  against https://tanstack.com/router/latest/docs/framework/react/guide/search-params **[TR]**
- After client-side navigation set `document.title` and move focus to the new page's `h1` (with
  `tabIndex={-1}`) or `main`; otherwise screen-reader users hear nothing. **[WAI-ARIA APG keyboard
  guidance: focus must never be lost] (memory for the h1 technique)**
- When a dialog closes or an item is deleted, move focus to the trigger or the next item. Verified on
  2026-11-07 against https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/ **[APG]**
- Wrap each route and each risky widget (3D viewer, recorder, chart) in an error boundary
  (`react-error-boundary`) with a retry that also resets the query (`QueryErrorResetBoundary`).
  **[default][TQ] (memory)**
- Code-split by route and by heavy widget (`lazy` + `Suspense` with a sized fallback). **[default][web.dev]**

- `validateSearch` does not strip what it rejects: the route's search is the raw params merged with
  the validated ones, so an unknown `?mode=diff` still arrives typed as a valid mode. Check values
  with a type guard before trusting them, and build corrected search objects from validated values —
  `navigate`'s `previous` still holds the raw ones. (Verified with a test on
  @tanstack/react-router 1.168.)

## 7. i18n

- Source copy in `src/locales/<locale>.ts` (or the i18n library's JSON); every locale mirrors the
  keys of the source locale; a test asserts parity. **[default]**
- Interpolate values via the copy function, never string concatenation (word order differs).
  **(memory)**
- `Intl.NumberFormat`, `Intl.DateTimeFormat`, `Intl.RelativeTimeFormat`, `Intl.PluralRules` with
  the active locale; set `<html lang>`; mark inline phrases in another language with their own
  `lang`. **[default] (memory for lang marking: WCAG 3.1.2)**
- Leave room for longer strings (German and Finnish run long); never fix widths around text.
  **(memory)**

## 8. Performance basics

Verified on 2026-11-07 against https://react.dev/reference/react/memo and https://web.dev/articles/inp

- Targets at the 75th percentile: LCP ≤ 2.5 s, INP ≤ 200 ms (poor > 500 ms), CLS ≤ 0.1. **[web.dev][default]**
- `memo` is an optimisation only: use it when a component re-renders often with the same props and
  the render is measurably expensive (React DevTools Profiler); try simpler fixes first (pass JSX as
  `children`, keep state local, remove needless effects). With React Compiler enabled, manual `memo`
  is usually unnecessary. **[react.dev]**
- Long lists (> a few hundred rows): paginate or virtualise; stable `key` from the data id, never
  the index for reorderable lists. **[react.dev] (memory)**
- Keep expensive work out of input handlers; use `useDeferredValue`/`startTransition` for
  filter-as-you-type. **[react.dev] (memory)**
- Images: explicit `width`/`height` or `aspect-ratio`, `loading="lazy"` below the fold, modern
  formats. **[web.dev][default]**

## 9. Security

Verified on 2026-11-07 against https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html

- JSX escapes text; the holes are escape hatches: `dangerouslySetInnerHTML`, `ref.current.innerHTML`,
  `eval`, `new Function`, string `setTimeout`. **[OWASP]**
- When HTML must be rendered, sanitize with DOMPurify immediately before rendering and do not modify
  it afterwards; keep DOMPurify patched. **[OWASP]**
- React 19 blocks `javascript:` URLs in `href`/`src`, but still allow-list schemes (`https:`,
  `mailto:`, relative) for any URL from data. **[OWASP]**
- No untrusted data inside `<script>`, `<style>`, event-handler strings or tag/attribute names.
  **[OWASP]**
- CSP is defence in depth, tailored per app (e.g. `default-src 'self'`, no `unsafe-inline` scripts,
  explicit `connect-src` for the API). **[OWASP] (header example from memory)**
- No tokens in `localStorage` when an httpOnly cookie is possible; no secrets in `VITE_*` or
  `NEXT_PUBLIC_*` variables (they ship to the browser). **(memory)**
- `target="_blank"` links get `rel="noopener noreferrer"` (modern browsers imply `noopener`). **(memory)**

## 10. Static export (Next.js / Nuxt generate) variant

Applies to Next.js `output: 'export'` and to Nuxt `nuxt generate` (the Vue file points here).

- No request-time server: no server components or `useAsyncData`/`useFetch` calls that need a
  server at request time, no route handlers, server routes or middleware at runtime; data loads in
  the client through the feature service and the data layer. **(memory)**
- Framework versions move faster than training data: read the docs bundled with the installed
  version (e.g. `node_modules/next/dist/docs/`) or the official docs before using an API. **[default]**
- Test e2e against the built export served by a static file server on a fixed port, not the dev
  server: the dev server rewrites and redirects (trailing slashes, 308s) and compiles on demand, so
  journeys that pass there can fail or time out against the real output. **[default]**
- Next.js: `'use client'` at the top of interactive leaves only; keep layout files server-safe.
  **(memory)**
