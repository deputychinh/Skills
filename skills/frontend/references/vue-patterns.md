# Vue patterns

Tags: **[vuejs]** vuejs.org, **[pinia]**, **[TQ]** TanStack Query for Vue, **[VR]** Vue Router,
**[OWASP]**, **[default]** these skills' default conventions (the repo's own conventions win). Versions checked on npm on 2026-11-07: vue 3.5.45
(3.6 is still a release candidate), vue-router 5.4, pinia 4.1, @tanstack/vue-query 5.107, vue-i18n
11.4, vee-validate 4.15, @testing-library/vue 8.1, eslint-plugin-vue 10.12, vue-tsc 3.3.
**(memory)** = not re-checked online for this draft.

## Contents

1. Folder structure and SFC shape
2. Component API: props, emits, v-model, refs, ids
3. Reactivity pitfalls
4. computed vs watch; cleanup
5. Composables
6. Template rules
7. State: Pinia, server state, URL state
8. Routing, guards, focus and title
9. Forms and validation
10. i18n
11. Accessibility specifics
12. Async components, Suspense, KeepAlive, performance
13. Security
14. Tooling
15. Version notes (Vapor, Nuxt)

## 1. Folder structure and SFC shape

- `src/features/<name>/{services,composables,components}`; route views in `src/views` (or file
  routes in `src/pages`) compose features; shared parts in `src/components`; stores in `src/stores`.
  **[default]**
- Services are plain typed functions over the API client, no Vue imports (easy to fake). **[default]**
- One component per file, PascalCase multi-word names (`AssetCard.vue`), test side by side; block
  order `<script setup lang="ts">`, `<template>`, `<style scoped>`. **[vuejs style guide] (memory)**

## 2. Component API: props, emits, v-model, refs, ids

Verified on 2026-11-07 against https://vuejs.org/guide/components/props.html,
https://vuejs.org/guide/typescript/composition-api.html and https://vuejs.org/guide/components/v-model.html

- Type-only props: `const { size = 'md', items = [] } = defineProps<Props>()`. Since 3.5 destructured
  props stay reactive (the compiler rewrites them to `props.x`) and native defaults replace
  `withDefaults`. **[vuejs]**
- A destructured prop passed to `watch` or a composable is a frozen value; pass a getter
  (`watch(() => size, …)`, `useThing(() => id)`); the compiler warns. **[vuejs]**
- Emits in tuple form, `defineEmits<{ select: [id: string]; close: [] }>()`, emitted in the handler
  that caused them and named for what happened. **[vuejs]**
- Two-way binding: `const model = defineModel<string>({ required: true })` (3.4+), named models
  `defineModel('page')`. If the child declares a `default`, the parent must initialise its value or
  the two drift apart. Never mutate a prop directly; never cache server data in Pinia. **[vuejs][default]**
- Primitives forward native attributes: fallthrough attrs land on the root; for a wrapped `input`
  use `defineOptions({ inheritAttrs: false })` and `v-bind="$attrs"` on the right element so
  `aria-*`, `disabled`, `type` work. **(memory)**
- Prefer slots (named, scoped, typed with `defineSlots`) over boolean flags multiplying variants; a
  variant is a string union prop. **[vuejs] (defineSlots) (memory for the design advice)**
- Template refs: `const input = useTemplateRef('input')` (3.5); the value is `null` until mounted,
  so use it in `onMounted` or guard for null. In `v-for` it is an array not in list order. Type a
  component ref with `InstanceType<typeof Foo>`; expose only what parents need with `defineExpose`.
  Verified against https://vuejs.org/guide/essentials/template-refs.html **[vuejs]**
- `useId()` (3.5) gives SSR-stable unique ids for `for`/`aria-describedby`; never call it inside
  `computed`. Verified against https://vuejs.org/api/composition-api-helpers.html **[vuejs]**
- `provide`/`inject` with a typed key in its own file: `export const themeKey = Symbol() as
InjectionKey<Ref<Theme>>`; `inject(themeKey)` is `T | undefined` — give a default or throw a clear
  error. Provide refs (readonly if consumers must not write) plus functions to change them. **[vuejs]**

## 3. Reactivity pitfalls

Verified on 2026-11-07 against https://vuejs.org/guide/essentials/reactivity-fundamentals.html

- Prefer `ref()`; it holds any type. `reactive()` takes objects only, cannot be replaced wholesale,
  and loses reactivity when destructured or when a property is passed to a function — use `toRefs`
  if you must. **[vuejs]**
- Refs unwrap inside deep reactive objects, not in arrays/`Map`/`Set`, and in templates only at top
  level (`{{ obj.id + 1 }}` with `id` a ref is wrong). Mutate the proxy, never the original; read the
  DOM after a change with `await nextTick()`. **[vuejs]**
- `shallowRef` for big data replaced as a whole (tables of thousands of rows, parsed files, chart
  data) or objects owned by a library; update by assigning a new value. `markRaw` for class
  instances that must never be proxied (map, editor, 3D scene). **[vuejs]**

## 4. computed vs watch; cleanup

Verified on 2026-11-07 against https://vuejs.org/guide/essentials/computed.html and
https://vuejs.org/guide/essentials/watchers.html

- Derived state is `computed`: cached, side-effect free, read-only. A watcher that only assigns
  another ref is a bug waiting to happen. **[vuejs]**
- Watchers are for side effects: fetch outside the query layer, DOM, storage, analytics. Watch a
  getter for a property (`() => route.query.page`), never the value itself. **[vuejs]**
- `watchEffect` tracks only what it reads before the first `await`; prefer `watch` with explicit
  sources for async work. **[vuejs]**
- Cleanup (3.5): `onWatcherCleanup(() => controller.abort())`, called synchronously before any
  `await`; or the `onCleanup` argument, which has no such restriction. **[vuejs]**
- Watchers made in setup stop on unmount; ones made in a callback must be stopped by hand.
  `flush: 'post'` to read the new DOM; avoid `'sync'` and `deep` on large data. **[vuejs]**

## 5. Composables

Verified on 2026-11-07 against https://vuejs.org/guide/reusability/composables.html

- Named `useX`, camelCase, one concern each. Accept `MaybeRefOrGetter<T>` and read with `toValue()`
  inside `watch`/`watchEffect`/`computed`. **[vuejs]**
- Return a plain object of refs (destructurable), not a `reactive`. **[vuejs]**
- Register listeners/timers and remove them in `onUnmounted`; DOM work in `onMounted` (SSR-safe).
  Call composables synchronously in `<script setup>`/`setup()` so hooks and watchers bind to the
  component. **[vuejs]** Check VueUse first if the repo uses it. **(memory)**

## 6. Template rules

- `v-if` for rarely changing conditions (lazy, destroys children); `v-show` for frequent toggles
  (always rendered). Never `v-if` with `v-for` on one element — filter in a `computed`. Verified
  against https://vuejs.org/guide/essentials/conditional.html **[vuejs]**
- `:key` from a stable data id on every `v-for`; change `key` to reset a component's state. **[vuejs]
  (memory for the reset idiom)**
- Templates hold property access and calls only — logic goes to `computed` **(memory)**;
  `type="button"` on buttons inside forms that must not submit. **[vuejs a11y guide]**

## 7. State: Pinia, server state, URL state

| Data                            | Home                                                |
| ------------------------------- | --------------------------------------------------- |
| From the server                 | `@tanstack/vue-query` or the repo's data composable |
| Shareable / survives reload     | `route.params` / `route.query`                      |
| Shared client state (auth, UI)  | Pinia setup store                                   |
| Ephemeral UI (open, draft text) | `ref` in the lowest common owner                    |
| Computable from the above       | `computed`                                          |

- Pinia setup stores (Verified on 2026-11-07 against https://pinia.vuejs.org/core-concepts/):
  `ref` = state, `computed` = getters, functions = actions; return every piece of state (unreturned
  or readonly state breaks SSR, devtools and plugins); do not return `route` or injected values.
  Destructure with `storeToRefs(store)`; actions destructure directly. **[pinia]**
- Pinia 4 (July 2026) is ESM-only and needs `@vue/devtools-api` installed alongside; the store API is
  unchanged from 3. Verified against https://github.com/vuejs/pinia/releases/tag/v4.0.0 **[pinia]**
- TanStack Query for Vue (Verified on 2026-11-07 against
  https://tanstack.com/query/latest/docs/framework/vue/reactivity and …/guides/query-keys): put the
  ref or getter itself in `queryKey` (`['asset', assetId]`), unwrap with `toValue()` in `queryFn`;
  `enabled` accepts a getter; key holds every variable the fetch uses. Query data is immutable —
  copy before editing, never `v-model` it. **[TQ]**
- Key factory per feature (`assetKeys.list(filters)`); set `staleTime` from how often data really
  changes (default 0 = stale at once, refetch on focus, 3 retries); `isPending` for first load vs
  `isFetching` for background; `invalidateQueries` on the prefix after a mutation; optimistic
  updates snapshot, roll back in `onError`, invalidate in `onSettled`. **[TQ] (defaults verified for
  React docs; same core)**
- URL state: read `route.query.page` through a `computed` that parses and validates (values are
  `string | string[] | null | undefined`), write with `router.replace({ query: { ...route.query,
page: '2' } })`. Watch the specific property, not the whole route. **[VR] (types: memory)**

## 8. Routing, guards, focus and title

Verified on 2026-11-07 against https://router.vuejs.org/guide/advanced/navigation-guards.html,
https://router.vuejs.org/guide/migration/v4-to-v5.html and https://vuejs.org/guide/best-practices/accessibility.html

- Vue Router 5 (Jan 2026) has no breaking changes from 4 and merges unplugin-vue-router: typed file
  routes come from `vue-router/vite`. Typed routes need 4.4+. **[VR]**
- Guards return a value: `false` cancels, a location redirects, nothing continues. `next` is
  deprecated since 5.0.3. `onBeforeRouteLeave` warns about unsaved changes. **[VR]**
- Title (2.4.2): `router.afterEach((to, _f, failure) => { if (!failure) document.title = …(to.meta) })`. **[VR]**
- Focus after navigation: in the layout, `watch(() => route.path, () => heading.value?.focus())`
  with a template ref on the view's `h1 tabindex="-1"` (or the vuejs skip-link target). A skip link is
  the first focusable element of `App.vue`. **[vuejs a11y]**
- Lazy routes: `component: () => import('./views/AssetView.vue')`, not `defineAsyncComponent`.
  Verified against https://router.vuejs.org/guide/advanced/lazy-loading.html **[VR]**
- Error boundary: a small `ErrorBoundary.vue` using `onErrorCaptured` (return `false` to stop
  propagation) that renders a retry slot around each route view and risky widget. **[vuejs] (memory)**

## 9. Forms and validation

- Native first: `<form @submit.prevent="onSubmit">`, `v-model` (with `.trim`/`.number`) on native
  inputs, visible `<label :for="id">` with `id` from `useId()`. **[vuejs]**
- Errors: text next to the field, `aria-invalid="true"`, `aria-describedby` → the error id; on
  submit focus the first invalid field (template ref) or an error summary. Keep what was typed.
  **[default][WCAG 3.3.1] (memory)**
- Library when the repo has one, else VeeValidate: `useForm({ validationSchema: toTypedSchema(zodSchema) })`
  from `@vee-validate/zod`, `defineField('email')` for value + attrs, `handleSubmit` for submit.
  Verified on 2026-11-07 against https://vee-validate.logaretm.com/v4/guide/composition-api/typed-schema/
  **[vee-validate]**; `handleSubmit`/blur config **(memory)**. Disable submit only while pending.

## 10. i18n

Verified on 2026-11-07 against https://vue-i18n.intlify.dev/guide/advanced/composition.html and
https://vue-i18n.intlify.dev/guide/migration/breaking11.html

- `createI18n({ legacy: false, locale, fallbackLocale: 'en', messages })`; in components
  `const { t, n, d } = useI18n()`. Legacy API mode and `v-t` are deprecated in v11 and removed in v12;
  `$tc` is gone — use `t` with plurals. **[vue-i18n]**
- Messages in `src/locales/<locale>.ts`; a Vitest test flattens every locale and asserts equal key
  sets. Named params, never concatenation; set `<html lang>` on locale change; lint with
  `@intlify/eslint-plugin-vue-i18n` (`no-raw-text`). **[default]** (plugin rule: memory)

## 11. Accessibility specifics

- Dialogs: native `<dialog>` + `showModal()` via a template ref, inside `<Teleport to="body">` so
  stacking contexts do not clip it; return focus to the trigger on close. Teleport keeps props,
  events and inject; the target must exist before mount (or use `defer`, 3.5). Verified on 2026-11-07
  against https://vuejs.org/guide/built-ins/teleport.html **[vuejs]**
- One app-level live region (`role="status"`, plus `role="alert"`) rendered empty at startup and
  fed from a small store or composable; screen readers miss regions inserted with their text.
  **[default] (memory)**
- `<Transition>`: the docs do not handle reduced motion — put durations in CSS behind
  `@media (prefers-reduced-motion: no-preference)` or zero them under `reduce`; JS hooks check
  `matchMedia`. **[vuejs: no guidance — default rule]**

## 12. Async components, Suspense, KeepAlive, performance

Verified on 2026-11-07 against https://vuejs.org/guide/best-practices/performance.html,
https://vuejs.org/guide/built-ins/suspense.html and https://vuejs.org/guide/built-ins/keep-alive.html

- Measure first: Vue DevTools profiler, Chrome Performance with `app.config.performance`, Lighthouse
  on the build. Targets LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1 (`cache-optimize` owns budgets). **[vuejs]**
- Keep props stable (pass `:active="item.id === activeId"`, not `activeId`); fewer wrapper components
  in long lists; virtualise lists of hundreds of rows; `v-memo`, `v-once`, `shallowRef`, `markRaw`
  only with a measured win. **[vuejs]**
- Heavy widgets: `defineAsyncComponent(() => import('./Chart.vue'))` + sized loading/error parts. **[vuejs]**
- `<Suspense>` is still experimental: prefer explicit four-state views (errors via parent
  `onErrorCaptured`). `<KeepAlive>` only when kept state is required: `include` by name, set `max`,
  refresh in `onActivated` (setup does not rerun). **[vuejs]**

## 13. Security

Verified on 2026-11-07 against https://vuejs.org/guide/best-practices/security.html

- Interpolation and attribute bindings are escaped; the holes are `v-html`, `innerHTML` in render
  functions, user content used as a template, and mounting Vue over server-rendered user content.
  **[vuejs]**
- `v-html` only with DOMPurify output computed right before render; `vue/no-v-html` on in lint. **[OWASP]**
- `:href`/`:src` from data: allow-list `https:`/`mailto:`/relative (Vue does not block
  `javascript:`); sanitize on the server before saving too. **[vuejs]**
- User styles only via object `:style`; no untrusted strings in event attributes; no secrets in
  `VITE_*` (shipped to the browser); httpOnly cookies over `localStorage` tokens. **[vuejs] (env: memory)**

## 14. Tooling

- Scaffold: `npm create vue@latest -- --ts --router --pinia --vitest --playwright --eslint --prettier`
  (also `--jsx`, `--cypress`, `--oxfmt`, `--bare`, `--vue-rc`; ESLint now includes Oxlint). Checked
  with `create-vue --help` (3.24.0) on 2026-11-07. Script names `type-check`/`test:unit` and
  `vue-tsc --build` as the type checker (plain `tsc` cannot read `.vue`) **(memory)**.
- ESLint flat config: `withVueTs(pluginVue.configs['flat/recommended'], vueTsConfigs.recommended)`
  from `@vue/eslint-config-typescript`, or `vue-eslint-parser` with `typescript-eslint`'s parser under
  `parserOptions.parser`. Verified on 2026-11-07 against https://eslint.vuejs.org/user-guide/ **[eslint-plugin-vue]**
- Stylelint: `stylelint-config-recommended-vue` (last in `extends`) sets `postcss-html` for `.vue`;
  needs `postcss-html`, `stylelint-config-html`. Verified on 2026-11-07 against
  https://github.com/ota-meshi/stylelint-config-recommended-vue **[stylelint]**

## 15. Version notes (Vapor, Nuxt)

- Vapor mode (no virtual DOM, opt-in per component with `<script setup vapor>`) ships in Vue 3.6,
  which on 2026-11-07 is `3.6.0-rc.14` on npm; `latest` is 3.5.45. Do not use it in production
  until 3.6 is stable and the repo opts in by ADR. Checked with `npm view vue dist-tags`; feature
  details from secondary sources **(not primary-verified)**.
- Nuxt when SSR/SSG/SEO matter: own data fetching (`useFetch`), routing, auto-imports; ADR it. For
  a fully static `nuxt generate` site, see the static export section of `react-patterns.md` (§10),
  which covers both frameworks. **(memory)**
