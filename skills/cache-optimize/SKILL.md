---
name: cache-optimize
description: Use when something is slow, heavy or about to get load — a slow page or endpoint, lag, a large bundle, a low Lighthouse score, "optimise", "speed up", "add a cache", or a pre-launch budget check — even if the user only says "it feels slow". Profiles to the real bottleneck (USE/RED, flame graphs, Core Web Vitals), applies the smallest fix that moves the number (code splitting, images, fonts, RFC 9111 HTTP caching, cache-aside with stampede protection, TanStack Query staleTime, timeouts, pooling, N+1) in Vue or React and Node or Python, and locks the gain in with k6, Lighthouse CI and bundle budgets. Budgets come from `benchmark`. Inside a delivery, `ship` and `deliver-loop` call this skill.
---

# cache-optimize — prove where the time goes, fix that, and keep it fixed

Measure → find the bottleneck → change one thing → measure again → guard it in CI. No cache or
"optimisation" without a number before and after, because an unmeasured change is as likely to make
things worse as better.

**Who owns what.** The `benchmark` skill owns the performance plan (`benchmarks/plan.md`), the
workloads, the committed baseline and the budgets. This skill takes a budget from there, finds why it
is missed, fixes it and locks the gain in. When no plan exists yet, run `benchmark` first or, for a
small fix, write the target into `benchmarks/plan.md` using these defaults: LCP ≤ 2.5 s, INP ≤ 200 ms,
CLS ≤ 0.1 at p75; ≤ 200 KB gzipped JS on the first route; RED per endpoint; caches only on measured
hot paths. Database work (indexes, plans, N+1 inside SQL, pooling arithmetic) belongs to the
`database` skill — call it rather than repeating it here. Evidence goes to
`docs/delivery/<NNN-slug>/evidence/perf/`.

## Workflow

1. **State the target.** Turn the complaint into a metric, percentile, page/endpoint and condition:
   "`GET /orders` p95 ≤ 300 ms at 20 rps", "LCP ≤ 2.5 s on `/orders/:id`, mobile, slow 4G". Take it
   from `benchmarks/plan.md` (the `benchmark` skill's budgets); otherwise use the defaults above and
   add it there. _Evidence_: the target line in `benchmarks/plan.md`.
2. **Baseline under realistic conditions.** Production build (never the dev server — it skips
   minification and splits modules), seeded data of realistic size, cold and warm cache. Frontend:
   Lighthouse on the built app (mobile preset, 3+ runs, median) and a DevTools performance trace;
   field data (`web-vitals` → logs/analytics, or CrUX) when the app has users. Backend: `make bench`
   (k6 against the endpoint) and the server's RED metrics (rate, errors, p50/p95/p99 duration).
   _Evidence_: raw outputs in `evidence/perf/before/`.
3. **Locate the bottleneck** before touching code. Break the time down: LCP sub-parts (TTFB, load
   delay, load duration, render delay), long tasks for INP, the request waterfall; on the server,
   per-span timings (handler, DB, outbound calls), USE (utilisation, saturation, errors) for CPU,
   memory, connections, disk; a CPU profile for hot code (Node: `node --cpu-prof`, event-loop delay
   with `perf_hooks.monitorEventLoopDelay`; Python: `py-spy record -o flame.svg --pid …`);
   `EXPLAIN (ANALYZE, BUFFERS)` via `database` for slow SQL. Name the one resource or span that
   dominates. _Evidence_: the trace/flame graph/plan + one sentence "x % of time is in Y".
   → `references/measurement-and-frontend.md` §1–3.
4. **Pick the fix in this order**: do less work (remove, bound, paginate, batch, fix N+1) → do it
   earlier or later (preload the LCP resource, defer non-critical JS, move to the job queue) → do it
   cheaper (index, smaller payload, better format, async I/O) → cache it. Caching is last because it
   adds a consistency problem. Record the chosen fix and the rejected ones in `benchmarks/plan.md`.
5. **Frontend fixes** (when the bottleneck is in the browser): route- and feature-level code
   splitting (Vue: lazy routes `component: () => import('./OrderView.vue')` and
   `defineAsyncComponent`; React: `React.lazy` + `Suspense`); LCP image not lazy,
   `fetchpriority="high"`, sized, AVIF/WebP with `srcset`; fonts self-hosted, subset, preloaded,
   `font-display` chosen deliberately; space reserved for late content; long tasks broken up
   (`scheduler.yield()` with fallback); bundle inspected (`rollup-plugin-visualizer`) and heavy deps
   replaced. → `references/measurement-and-frontend.md` §4–5.
6. **HTTP caching** (every response has an explicit policy): fingerprinted assets
   `public, max-age=31536000, immutable`; HTML and SPA `index.html` `no-cache` + ETag; personalised
   API responses `private, no-cache` (or `no-store` only for truly sensitive data); presigned object
   URLs `private, max-age<URL lifetime, immutable`, signed at a stable window start so the URL (and
   so the cache entry) survives re-renders; `Vary` only on headers that really change the body.
   Verify with `curl -sI` and a conditional request returning `304`.
   → `references/http-and-app-caching.md` §1–3.
7. **Server-side caching** (only if steps 4–6 cannot meet the target): choose the layer (in-process
   LRU, Postgres materialised view or summary table, Redis — a new datastore like Redis is an
   architecture decision, so record it with `architect`); write the key schema
   (`<ns>:v<schema>:<tenant>:<id>`), TTL with jitter, invalidation on write (commit the DB, then
   delete the key), stampede protection (single-flight lock or early refresh), negative caching for
   misses, and the per-user rule for personal data. → `references/http-and-app-caching.md` §4–5.
8. **Client data cache**: set TanStack Query (React or Vue Query) `staleTime` per query from how often
   the data really changes (the default 0 refetches on every mount/focus), keep `gcTime` ≥
   `staleTime`, invalidate the exact query keys in mutation `onSuccess`/`onSettled`, prefetch on
   intent (hover, route loader or navigation guard). → `references/http-and-app-caching.md` §6.
9. **Backend latency hygiene**: a timeout on every outbound call shorter than the caller's; pooled HTTP
   clients and DB connections (Node: one undici `Agent`/`Pool` with `connections` sized by Little's
   law; Python: one `httpx.AsyncClient`); nothing blocking the event loop (Node: no sync fs/crypto or
   big `JSON.parse` in a request; Python: no blocking I/O in `async def`); concurrent independent
   calls (`Promise.all` / `asyncio.TaskGroup`); batch and paginate; compress large JSON (gzip/br).
   → `references/measurement-and-frontend.md` §6.
10. **Measure again** with the exact baseline method; keep the change only if the target metric
    moved beyond run-to-run noise and nothing else regressed (error rate, memory, other pages).
    _Evidence_: `evidence/perf/after/` + a before/after table in `benchmarks/plan.md`.
11. **Guard it.** Add or tighten one automated check per improved metric: Lighthouse CI assertions on
    the main routes, a bundle-size budget (`size-limit` or a script over `dist/`), k6 thresholds in
    `make bench` (non-zero exit on breach), a statement-count or timing test for the endpoint; update
    the `benchmark` baseline. Then hand back to the calling phase (`deliver-loop` review,
    `verify-app`). → `references/measurement-and-frontend.md` §7.

## Core checklist

1. A number before and after, same method, production build, realistic data — or it did not happen.
2. Percentiles (p75 for web vitals, p95/p99 for APIs), never averages alone.
3. Lab numbers find causes; field numbers decide success. Lighthouse navigation runs cannot measure
   INP (TBT is the proxy); use a Lighthouse timespan / user flow or a DevTools trace of the interaction.
4. The LCP element is in the initial HTML, never lazy-loaded, and has `fetchpriority="high"` when it
   is an image.
5. Every image has dimensions or `aspect-ratio`; late content has reserved space.
6. First-route JS within budget; heavy features (3D viewer, charts, editors) loaded on demand.
7. Every HTTP response sets `Cache-Control` explicitly; fingerprinted assets are `immutable`, HTML is
   `no-cache`.
8. Anything user-specific is `private`; nothing personal in a shared cache without the user in the key.
9. A cache has a key schema with version, a TTL, an invalidation path on write and stampede protection.
10. Cache failure degrades to the source, never to an error; hit ratio and latency are observable.
11. TanStack Query `staleTime` set deliberately; mutations invalidate the precise keys.
12. Every outbound call has a timeout; nothing blocks the event loop; no query in a loop.
13. List endpoints are bounded and paginated; payloads carry only the fields the screen uses.
14. Each improvement leaves a CI guard (Lighthouse CI, bundle budget, k6 threshold) that fails on
    regression.

## Anti-patterns

- Optimising from intuition; micro-benchmarks of code that is 1 % of the flame graph.
- Measuring on the dev server, an empty database or a warm desktop only.
- Adding Redis to hide a missing index or an N+1 query.
- `no-store, no-cache, must-revalidate, max-age=0` everywhere ("kitchen sink"), or long `max-age` on
  un-fingerprinted URLs (cannot be recalled).
- `Vary: User-Agent` or `Vary: Cookie`; caching responses that set cookies in a shared cache.
- Cache keys without version or tenant; invalidation by "wait for the TTL" on data users just edited.
- Delete-then-write ordering, or setting the cache from a stale read after a write (race).
- `staleTime: Infinity` on data other users change; `refetchOnWindowFocus: false` app-wide to hide
  slow endpoints.
- Lazy-loading the hero image; preloading everything; one giant vendor chunk.
- Raising timeouts or pool sizes to make a slow dependency "work".
- Declaring success from one Lighthouse run or one k6 run with no thresholds.

## Evidence before "done"

- `benchmarks/plan.md` with the target, baseline, bottleneck sentence, fix, and a before/after table.
- Lighthouse (`npx @lhci/cli autorun` or a DevTools `lighthouse_audit`) median of ≥ 3 runs: LCP, TBT,
  CLS, performance score, before and after.
- Field or trace evidence for INP when interaction speed was the complaint (DevTools trace of the
  interaction, or `web-vitals` INP from real sessions).
- `curl -sI <asset>` and `curl -sI <index.html>` showing the intended `Cache-Control`/`ETag`, and a
  `curl -s -o /dev/null -w '%{http_code}' -H 'If-None-Match: "<etag>"'` returning `304`.
- `make bench` k6 summary with thresholds (`http_req_duration p(95)`, `http_req_failed rate`)
  passing, exit code 0.
- Bundle report or `size-limit` output showing first-route JS size against the budget.
- For a server cache: hit ratio and p95 with cache on vs off, and a test proving a write invalidates it.
- The new CI guard failing on a deliberately regressed branch (or its threshold shown) and passing on
  main.

## References

- `references/measurement-and-frontend.md` — method (USE/RED, flame graphs), profiling per stack
  (Node and Python), Core Web Vitals and how to read them, frontend loading fixes (Vue and React),
  backend latency, load testing and CI guards.
- `references/http-and-app-caching.md` — RFC 9111 directives and recipes per resource type, CDN,
  application cache patterns, invalidation and stampedes, TanStack Query (React and Vue) settings.
- `../benchmark/SKILL.md` — the performance plan, baseline and budgets this skill works against.
- `../database/SKILL.md` — indexes, plans, N+1 in SQL, pooling arithmetic.
