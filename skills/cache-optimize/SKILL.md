---
name: cache-optimize
description: Finds and fixes performance problems measure-first across the stack — sets a budget, profiles to the real bottleneck (USE/RED, flame graphs, Core Web Vitals field vs lab), then applies the smallest fix that moves the number — frontend loading (critical path, code splitting, images, fonts, bundle size), HTTP caching per RFC 9111 (Cache-Control, ETag, immutable fingerprinted assets, private signed URLs, Vary, CDN), application caches (cache-aside, TTL, stampede protection, invalidation), TanStack Query staleTime/gcTime, backend latency (timeouts, pooling, batching, N+1) — and locks the gain in with k6 thresholds, Lighthouse CI and bundle budgets. Produces before/after numbers and a regression guard. Use when something is slow or heavy ("chậm", "lag", "tối ưu", "tối ưu hiệu năng", "cache", "load lâu", "bundle to", "Lighthouse thấp"), before launch to check budgets, or when adding a cache. Inside a delivery, `ship` and `deliver-loop` call this skill.
---

# cache-optimize — prove where the time goes, fix that, and keep it fixed

Measure → find the bottleneck → change one thing → measure again → guard it in CI. No cache or
"optimisation" without a number before and after. House budgets
(`init-project/references/frontend-and-ux.md`, `data-and-reliability.md`): LCP ≤ 2.5 s, INP ≤ 200 ms,
CLS ≤ 0.1 at p75; ≤ 200 KB gzipped JS on the first route; RED per endpoint; caches only on measured hot
paths. Database work (indexes, plans, N+1 inside SQL, pooling arithmetic) is done with the `database`
skill — call it rather than repeating it here. Evidence goes to `docs/delivery/<NNN-slug>/evidence/perf/`.

## Workflow

1. **State the target.** Turn the complaint into a metric, percentile, page/endpoint and condition:
   "`GET /assets` p95 ≤ 300 ms at 20 rps", "LCP ≤ 2.5 s on `/review/:id`, mobile, slow 4G". Take it
   from the spec's quality targets when they exist; otherwise use the house budgets and write it down.
   _Evidence_: `evidence/perf/target.md`.
2. **Baseline under realistic conditions.** Production build (never the dev server), seeded data of
   realistic size, cold and warm cache. Frontend: Lighthouse on the built app (mobile preset, 3+ runs,
   median) and the Chrome DevTools performance trace; field data (`web-vitals` → logs/analytics, or
   CrUX) when the app has users. Backend: k6 against the endpoint, and the server's own RED metrics
   (rate, errors, p50/p95/p99 duration). _Evidence_: raw outputs in `evidence/perf/before/`.
3. **Locate the bottleneck** before touching code. Break the time down: LCP sub-parts (TTFB, load
   delay, load duration, render delay), long tasks for INP, waterfall for requests; on the server,
   per-span timings (handler, DB, outbound calls), USE (utilisation, saturation, errors) for CPU,
   memory, connections, disk; a CPU flame graph (`py-spy record -o flame.svg --pid …`) for hot code,
   `EXPLAIN (ANALYZE, BUFFERS)` via `database` for slow SQL. Name the one resource or span that
   dominates. _Evidence_: the trace/flame graph/plan + one sentence "x % of time is in Y".
   → `references/measurement-and-frontend.md` §1–3.
4. **Pick the fix in this order**: do less work (remove, bound, paginate, batch, fix N+1) → do it
   earlier or later (preload the LCP resource, defer non-critical JS, move to the job queue) → do it
   cheaper (index, smaller payload, better format, async I/O) → cache it. Caching is last because it
   adds a consistency problem. Write the chosen fix and the rejected ones in `target.md`.
5. **Frontend fixes** (when the bottleneck is in the browser): route- and feature-level code
   splitting with `React.lazy`/dynamic `import()`; LCP image not lazy, `fetchpriority="high"`, sized,
   AVIF/WebP with `srcset`; fonts self-hosted, subset, preloaded, `font-display` chosen deliberately;
   space reserved for late content; long tasks broken up (`scheduler.yield()` with fallback); bundle
   inspected (`npx vite-bundle-visualizer` or `rollup-plugin-visualizer`) and heavy deps replaced.
   → `references/measurement-and-frontend.md` §4–5.
6. **HTTP caching** (every response has an explicit policy): fingerprinted assets
   `public, max-age=31536000, immutable`; HTML and SPA `index.html` `no-cache` + ETag; personalised
   API responses `private, no-cache` (or `no-store` only for truly sensitive data); presigned object
   URLs `private, max-age<URL lifetime, immutable` signed at a stable window (Kiln ADR 0008); `Vary`
   only on headers that really change the body. Verify with `curl -sI` and a conditional request
   returning `304`. → `references/http-and-app-caching.md` §1–3.
7. **Server-side caching** (only if steps 4–6 cannot meet the target): choose the layer (in-process
   LRU, Postgres materialised view or summary table, Redis — Redis needs an ADR per Kiln ADR 0001);
   write the key schema (`<ns>:v<schema>:<tenant>:<id>`), TTL with jitter, invalidation on write
   (update DB, then delete key), stampede protection (single-flight lock or early refresh), negative
   caching for misses, and the per-user rule for personal data. → `references/http-and-app-caching.md` §4–5.
8. **Client data cache**: set TanStack Query `staleTime` per query from how often the data really
   changes (default 0 refetches on every mount/focus), keep `gcTime` ≥ `staleTime`, invalidate the
   exact query keys in mutation `onSuccess`/`onSettled`, prefetch on intent (hover, route loader).
   → `references/http-and-app-caching.md` §6.
9. **Backend latency hygiene**: timeout on every outbound call shorter than the caller's; pooled HTTP
   clients and DB connections; no blocking I/O in `async def` handlers (use `run_in_threadpool` or
   async drivers); concurrent independent calls (`asyncio.gather` / `TaskGroup`); batch and paginate;
   compress large JSON (gzip/br). → `references/measurement-and-frontend.md` §6.
10. **Measure again** with the exact baseline method; keep the change only if the target metric
    moved beyond run-to-run noise and nothing else regressed (error rate, memory, other pages).
    _Evidence_: `evidence/perf/after/` + a before/after table in `target.md`.
11. **Guard it.** Add or tighten one automated check per improved metric: Lighthouse CI assertions on
    the main routes, a bundle-size budget (`size-limit` or a script over `dist/`), k6 thresholds in
    `make load` (non-zero exit on breach), a statement-count or timing test for the endpoint. Then hand
    back to the calling phase (`deliver-loop` review, `verify-app`).
    → `references/measurement-and-frontend.md` §7.

## Core checklist

1. A number before and after, same method, production build, realistic data — or it did not happen.
2. Percentiles (p75 for web vitals, p95/p99 for APIs), never averages alone.
3. Lab numbers find causes; field numbers decide success. Lighthouse navigation runs cannot measure INP (TBT is the proxy); use a Lighthouse timespan / user flow or a DevTools trace of the interaction.
4. The LCP element is in the initial HTML, never lazy-loaded, and has `fetchpriority="high"` when it is an image.
5. Every image has dimensions or `aspect-ratio`; late content has reserved space.
6. First-route JS within budget; heavy features (3D viewer, charts, editors) loaded on demand.
7. Every HTTP response sets `Cache-Control` explicitly; fingerprinted assets are `immutable`, HTML is `no-cache`.
8. Anything user-specific is `private`; nothing personal in a shared cache without the user in the key.
9. A cache has a key schema with version, a TTL, an invalidation path on write and stampede protection.
10. Cache failure degrades to the source, never to an error; hit ratio and latency are observable.
11. TanStack Query `staleTime` set deliberately; mutations invalidate the precise keys.
12. Every outbound call has a timeout; no sync I/O inside async handlers; no query in a loop.
13. List endpoints are bounded and paginated; payloads carry only the fields the screen uses.
14. Each improvement leaves a CI guard (Lighthouse CI, bundle budget, k6 threshold) that fails on regression.

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

- `target.md` with the target, baseline, bottleneck sentence, fix, and a before/after table.
- Lighthouse (`npx @lhci/cli autorun` or the DevTools MCP `lighthouse_audit`) median of ≥ 3 runs:
  LCP, TBT, CLS, performance score, before and after.
- Field or trace evidence for INP when interaction speed was the complaint (DevTools trace of the
  interaction, or `web-vitals` INP from real sessions).
- `curl -sI <asset>` and `curl -sI <index.html>` showing the intended `Cache-Control`/`ETag`, and a
  `curl -s -o /dev/null -w '%{http_code}' -H 'If-None-Match: "<etag>"'` returning `304`.
- k6 summary with thresholds (`http_req_duration p(95)`, `http_req_failed rate`) passing, exit code 0.
- Bundle report or `size-limit` output showing first-route JS size against the budget.
- For a server cache: hit ratio and p95 with cache on vs off, and a test proving a write invalidates it.
- The new CI guard failing on a deliberately regressed branch (or its threshold shown) and passing on main.

## References

- `references/measurement-and-frontend.md` — method (USE/RED, flame graphs), Core Web Vitals and how
  to read them, frontend loading fixes, backend latency, load testing and CI guards.
- `references/http-and-app-caching.md` — RFC 9111 directives and recipes per resource type, CDN,
  application cache patterns, invalidation and stampedes, TanStack Query settings.
- `../database/SKILL.md` — indexes, plans, N+1 in SQL, pooling arithmetic.
- `../init-project/references/frontend-and-ux.md` and `data-and-reliability.md` — the house budgets.
