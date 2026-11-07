# Measurement, frontend loading, backend latency and guards

Tags: **[WD]** web.dev · **[GREGG]** Brendan Gregg, brendangregg.com and _Systems Performance_ 2nd ed. ·
**[HPBN]** Grigorik, _High Performance Browser Networking_ · **[K6]** Grafana k6 docs · **[LHCI]**
Lighthouse CI docs · **[SRE]** Google SRE book (RED/golden signals) · **[NODE]** Node.js docs ·
**[default]** a default of these skills (override with the repo's conventions) · **[mem]** from
memory, not checked online this time.

Verified on 2026-11-07 against:

- https://web.dev/articles/vitals
- https://web.dev/articles/inp
- https://web.dev/articles/optimize-lcp
- https://web.dev/articles/optimize-cls
- https://web.dev/articles/optimize-long-tasks
- https://www.brendangregg.com/usemethod.html
- https://www.brendangregg.com/flamegraphs.html
- https://grafana.com/docs/k6/latest/using-k6/thresholds/
- https://github.com/GoogleChrome/lighthouse-ci/blob/main/docs/configuration.md

Node profiling entries (`--cpu-prof`, `perf_hooks.monitorEventLoopDelay`, undici pools) are [mem]
against the Node.js and undici docs.

## Contents

1. Method
2. Profiling tools by layer
3. Core Web Vitals: targets and reading them
4. Frontend loading fixes
5. Bundle analysis
6. Backend latency
7. Load testing and CI guards

## 1. Method

- **USE** for every resource (CPU, memory, network, disk, connection pools, worker slots):
  utilisation, saturation (queued work), errors. Check errors first — quickest to read. It is a
  checklist that finds a class of problems, not a complete method. [GREGG]
- **RED** for every service/endpoint: rate, errors, duration (as a distribution). Default: RED per
  endpoint, USE per resource. [default] [SRE-related, mem for RED's origin with Tom Wilkie]
- Avoid the "streetlight" anti-method (tuning what tools happen to show) and "random change"
  anti-method; one change at a time, measured. [GREGG] [mem for anti-method names]
- Latency is a distribution: report p50/p95/p99 and max; the tail is what users feel on pages that
  fan out to many calls. [GREGG] [mem]
- Workload characterisation first: who calls, how often, with what payload size, read/write mix. [GREGG] [mem]
- Little's law for capacity sanity: concurrency = throughput × latency (e.g. 50 rps × 0.2 s = 10
  requests in flight → pool sizes). [mem]
- Noise: run ≥ 3 times (Lighthouse) or long enough for stable percentiles (k6 ≥ 1 min steady state);
  compare medians; a change smaller than run-to-run spread is not a result. [LHCI] [mem]

## 2. Profiling tools by layer

| Layer               | Tool                                                                                            | What to look at                                                                    |
| ------------------- | ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Browser load        | Chrome DevTools Performance panel / DevTools MCP `performance_start_trace`                      | LCP sub-parts, long tasks, network waterfall, render-blocking resources [WD] [mem] |
| Browser interaction | DevTools trace while clicking; `web-vitals` `onINP` with attribution                            | input delay vs processing vs presentation delay [WD]                               |
| Vue                 | Vue DevTools Performance / component render timeline                                            | components re-rendering without prop changes [mem]                                 |
| React               | React DevTools Profiler                                                                         | components re-rendering without prop changes [mem]                                 |
| Node CPU            | `node --cpu-prof app.js` → `.cpuprofile` in DevTools or speedscope; `0x`/`clinic flame`         | widest plateaus in the flame graph [GREGG] [mem for tools]                         |
| Node event loop     | `perf_hooks.monitorEventLoopDelay()` → p99 delay; `--inspect` for a live profile                | event loop blocked by sync work or big `JSON.parse` [NODE] [mem]                   |
| Python CPU          | `py-spy record -o flame.svg --pid <pid>` (sampling, no code change); `pyinstrument` per request | widest plateaus in the flame graph [GREGG] [mem for tools]                         |
| Python async        | `py-spy dump`; asyncio debug mode (`PYTHONASYNCIODEBUG=1`) logs slow callbacks                  | event loop blocked by sync calls [mem]                                             |
| SQL                 | `pg_stat_statements`, `EXPLAIN (ANALYZE, BUFFERS)` → `database` skill                           | total time, mean time, calls [mem]                                                 |
| System              | `top`/`htop`, `vmstat 1`, `iostat -x 1`, `docker stats`                                         | USE per resource [GREGG]                                                           |

Flame graphs: x-axis is the sorted stack population, **not time**; width = share of samples; look for
the widest plateaus at the top. Off-CPU flame graphs show time blocked (I/O, locks), which on-CPU
graphs miss — the usual case for a web API waiting on the DB. [GREGG]

## 3. Core Web Vitals: targets and reading them

- Good thresholds: **LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1**, at the 75th percentile of page loads,
  segmented mobile/desktop; a page passes only if all three pass. INP > 500 ms is poor. [WD]
- **Field** (real users): CrUX, PageSpeed Insights, Search Console, or own RUM with the `web-vitals`
  library. **Lab**: Lighthouse, DevTools — for diagnosis and regression catching, not as the verdict.
  Lighthouse navigation runs cannot measure INP (they report TBT as the lab proxy); a Lighthouse
  timespan / user-flow run or a DevTools trace of the interaction can. [WD]
- A solo app with few users has no CrUX data: log `web-vitals` to the API (`navigator.sendBeacon`)
  and read p75 from logs. [WD] [mem for sendBeacon]
- **LCP sub-parts** with rough target shares: TTFB ~40 %, resource load delay < 10 %, resource load
  duration ~40 %, element render delay < 10 %. A big "load delay" means the browser found the image
  late. [WD]
- **INP** = latency of the worst interaction (high percentile) over the visit; each interaction =
  input delay + processing + presentation delay. Reproduce slow interactions in the lab, including
  during page load. [WD]
- **Long task** = main-thread task > 50 ms; the excess blocks input. [WD]
- **TTFB** for the HTML: CDN/edge, server render time, redirects; static SPA shells should be served
  from cache in tens of ms. [WD] [mem]

## 4. Frontend loading fixes

Critical path [HPBN] [WD] [mem unless tagged]:

- Fewer round trips: HTTP/2 or HTTP/3 on one origin; `preconnect` to the API/storage origin used on
  first paint; avoid redirect chains. [HPBN]
- Render-blocking CSS small and early; non-critical JS `type="module"` (deferred by default) or
  loaded on demand. [mem]
- SPA (Vue or React + Vite): the LCP element often waits for JS → data → render. Options: render
  the shell + skeleton from HTML, start the data fetch at navigation (Vue Router `beforeResolve` /
  route-level prefetch; React: a route loader) rather than after mount (`onMounted` / `useEffect`),
  prefetch the LCP image URL as soon as it is known, or prerender static routes (Nuxt generate,
  Next.js static export). [WD: "avoid client-side rendering for LCP content"] [mem for router
  specifics]

LCP [WD]:

- Never lazy-load the LCP image; `fetchpriority="high"` on it (one or two images at most);
  `<link rel="preload">` if it is referenced only from CSS/JS.

Images [WD] [mem]:

- `width`/`height` or CSS `aspect-ratio` on every image (CLS). [WD]
- `loading="lazy"` + `decoding="async"` below the fold; `srcset`/`sizes` so phones get small files;
  AVIF/WebP; thumbnails generated by a background job at fixed sizes, so the request never resizes.
  [mem]

Fonts [WD] [mem]:

- Self-host, WOFF2, subset to the scripts your copy uses (e.g. Latin + Latin Extended), preload the
  one or two critical files; `font-display: swap` (default here) or `optional` (web.dev's CLS
  advice) — pick per font; match fallback metrics with `size-adjust`/`ascent-override` to cut
  shift. [WD] [default]

CLS [WD]:

- Reserve space for late content (skeletons with fixed height), no insertion above existing content
  without user action, animate `transform`/`opacity` only, keep pages bfcache-eligible (no `unload`
  handlers; `no-store` on HTML also blocks bfcache in some browsers [mem]).

INP [WD]:

- Break long tasks; yield with `await scheduler.yield()` where available, else
  `new Promise(r => setTimeout(r, 0))`; yield on a ~50 ms deadline, not after every item.
- Do the visible update first, defer the rest; React: `startTransition`/`useDeferredValue` for
  expensive re-renders; Vue: `shallowRef` for large immutable data, `v-memo` on heavy list rows,
  `computed` instead of watchers that copy [mem]; virtualise long lists (TanStack Virtual, which has
  Vue and React adapters) [mem]; move heavy compute (file parsing, 3D previews) to a Web Worker
  [mem].

Prefetch [mem]:

- Prefetch the next likely route's chunk and data on hover/focus (call the lazy route's
  `import()` and `queryClient.prefetchQuery`; React routers offer `preload="intent"`); do not
  prefetch everything on load.

Code splitting [mem]:

- Vue: lazy routes `{ path: '/orders/:id', component: () => import('./OrderView.vue') }`; heavy
  in-page widgets with `defineAsyncComponent(() => import('./OrderChart.vue'))` (with a
  `loadingComponent` and `errorComponent` so the slot is never blank).
- React: `const OrderChart = lazy(() => import('./OrderChart'))` inside `<Suspense fallback>`;
  route-level `lazy` in the router.
- Split by route first, then by feature that most visits never open; splitting tiny modules only adds
  requests.

## 5. Bundle analysis [mem]

- `npx vite build` then `npx vite-bundle-visualizer` (or `rollup-plugin-visualizer` in
  `vite.config.ts`, `template: 'treemap'`, `gzipSize: true`).
- Look for: one dependency dominating (three.js, date libs, icon packs, lodash); duplicate copies
  (two copies of Vue or React — pin one with the package manager's overrides); polyfills for browsers you do not support; locale data for all
  languages.
- Fixes: dynamic `import()` for feature-only deps; per-icon imports; `build.rollupOptions.output.
manualChunks` only when caching benefits are measured; drop dead deps (`knip`).
- Budget: the `benchmark` plan's figure, default ≤ 200 KB gzipped JS on the first route. Enforce with `size-limit`
  (`.size-limit.json` listing the entry chunk) or a script that gzips `dist/assets/index-*.js` and
  fails above the budget. [default]

## 6. Backend latency

- **Timeouts** on every outbound call (connect + read), shorter than the caller's own deadline;
  bounded retries with backoff + jitter only for idempotent calls. [mem: Nygard, _Release It!_]
- **Pooling**: one long-lived HTTP client per process and upstream — Node: an undici `Agent` or
  `Pool` (`new Pool(origin, { connections: 20, keepAliveTimeout: 10_000 })`, passed as the
  `dispatcher` to `fetch`), sized by Little's law (rps × upstream latency, plus headroom); Python:
  one `httpx.AsyncClient` / boto3 client with explicit `limits`. DB pool sized by the `database`
  skill's budget; pool wait timeout < request timeout → fail fast with 503. [mem]
- **Event loop** (both stacks): one blocking call stalls every request on the process.
  - Node: no `fs.*Sync`, `crypto.*Sync`, `zlib.*Sync` or `JSON.parse` of multi-MB bodies in a
    request; watch `monitorEventLoopDelay()` p99 (alert above ~100 ms); move CPU work to a
    `worker_threads` pool or the job queue. [NODE] [mem]
  - Python (FastAPI): a sync DB driver or `time.sleep`/`requests` inside `async def` blocks the loop —
    use `def` endpoints (threadpool) or async drivers; run CPU-heavy work in the worker process. [mem]
- **Concurrency**: independent calls in parallel (`Promise.all` / `asyncio.TaskGroup`), dependent
  ones sequential; cap fan-out with a limiter (`p-limit`) or a semaphore. [mem]
- **N+1** across services or SQL: batch (`WHERE id = ANY(:ids)`), a join, or a DataLoader-style
  batch per request. [mem]
- **Payloads**: return only fields the screen needs; paginate; gzip/brotli for JSON over ~1 KB
  (Fastify `@fastify/compress`, Nest `compression`, FastAPI
  `GZipMiddleware(minimum_size=1000)`) [mem]; avoid serialising huge nested graphs.
- **Move work off the request path**: thumbnails, AI calls, emails → the job queue; return 202 +
  a status URL. [default]
- **Backpressure**: bounded queues, 429/503 with `Retry-After`; load-shed non-critical work. [default]

## 7. Load testing and CI guards

k6 [K6]:

```js
export const options = {
  scenarios: {
    steady: {
      executor: 'constant-arrival-rate',
      rate: 20,
      timeUnit: '1s',
      duration: '2m',
      preAllocatedVUs: 50,
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<300'],
    http_req_failed: ['rate<0.01'],
    checks: ['rate>0.99'],
  },
};
```

- Thresholds make the run fail with a non-zero exit code → CI fails; checks alone do not affect the
  exit code, so add a `checks` threshold. Do not repeat a metric key (duplicates are silently
  ignored). `abortOnFail` stops early. [K6]
- Use an arrival-rate executor for "can we serve N rps" (open model) so a slow server cannot reduce
  the offered load. [mem]
- Keep scripts under `benchmarks/` and run them with `make bench` against the production build and a
  seeded DB, never against production with real users; the workloads and thresholds come from
  `benchmarks/plan.md` (`benchmark` skill). [default]

Lighthouse CI [LHCI]:

- `lighthouserc.json`: `ci.collect.staticDistDir: "apps/web/dist"` (or `url` + `startServerCommand`),
  `numberOfRuns: 3` (default); `ci.assert.preset: "lighthouse:no-pwa"` plus assertions such as
  `"largest-contentful-paint": ["error", {"maxNumericValue": 2500}]`,
  `"cumulative-layout-shift": ["error", {"maxNumericValue": 0.1}]`,
  `"total-blocking-time": ["error", {"maxNumericValue": 200}]`; `aggregationMethod: "median"`
  (default is `optimistic`). `upload.target: "temporary-public-storage"` makes reports public — use
  `filesystem` into `docs/lighthouse/` for private apps. [LHCI] [mem for TBT 200 ms value]
- Inline `resource-summary:script:size` assertions replace a separate budgets file. [LHCI]

Other guards [mem]:

- Statement-count test per hot endpoint (catches N+1 regressions; see `database`).
- An API timing test on seeded data in nightly CI for the top 3 queries. [default]
- Header test: assert `Cache-Control` on `index.html`, one hashed asset and one API route.
