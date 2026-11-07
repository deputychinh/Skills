# HTTP, CDN, application and client caching

Tags: **[RFC9111]** HTTP Caching · **[RFC8246]** `immutable` · **[RFC5861]** stale-while-revalidate /
stale-if-error · **[MDN]** MDN HTTP caching guide · **[REDIS]** Redis docs · **[TQ]** TanStack Query
docs · **[DDIA]** Kleppmann · **[PG]** PostgreSQL 17 docs · **[house]** init-project references / Kiln ADRs · **[mem]** from memory,
not checked online this time.

Verified on 2026-11-07 against:

- https://www.rfc-editor.org/rfc/rfc9111.html
- https://www.rfc-editor.org/rfc/rfc8246.html
- https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Caching
- https://redis.io/docs/latest/develop/use-cases/cache-aside/
- https://redis.io/docs/latest/develop/clients/client-side-caching/
- https://tanstack.com/query/latest/docs/framework/react/guides/important-defaults
- https://tanstack.com/query/latest/docs/framework/react/guides/caching

## Contents

1. Directives that matter
2. Recipes per resource type
3. Validators, Vary and CDNs
4. Application caches: patterns
5. Invalidation, stampedes and failure modes
6. TanStack Query
7. Database-side caching

## 1. Directives that matter

- `max-age=N`: fresh for N seconds from response generation. `s-maxage`: shared caches only,
  overrides `max-age`/`Expires` there. [RFC9111]
- `no-cache`: may be stored, but must be revalidated before every reuse. `no-store`: must not be
  stored at all — and is not a reliable privacy mechanism on its own. [RFC9111]
- `private`: browsers may store, shared caches (CDN, proxy) must not. `public`: allows storing even
  when it would otherwise be forbidden (e.g. responses to requests with `Authorization`). [RFC9111]
- Shared caches must not reuse a response to an `Authorization` request unless it carries `public`,
  `s-maxage` or `must-revalidate`. [RFC9111]
- `must-revalidate`: once stale, never served without a successful revalidation (504 if
  disconnected). [RFC9111]
- `immutable` (RFC 8246, not in 9111): the body will not change while fresh, so skip revalidation even
  on a normal reload; revalidate as usual once stale. [RFC8246]
- `stale-while-revalidate=N` / `stale-if-error=N` (RFC 5861): serve stale for N s while refreshing in
  the background / when the origin errors. Supported by browsers for SWR and by most CDNs. [RFC5861 —
  defined there per RFC 9111's mention; details mem]
- Heuristic freshness: with no explicit expiry, caches may guess (commonly ~10 % of the time since
  `Last-Modified`). Explicit `Cache-Control` on every response removes the guess. [RFC9111] [MDN]

## 2. Recipes per resource type

| Resource                                                      | Header                                                                                                                      | Why                                                  |
| ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| Vite hashed assets `/assets/*-[hash].js/css/woff2`            | `public, max-age=31536000, immutable`                                                                                       | URL changes when content does [MDN]                  |
| `index.html`, SPA fallback, service worker script             | `no-cache` + `ETag`/`Last-Modified`                                                                                         | always revalidate, cheap 304 [MDN]                   |
| Un-fingerprinted public files (`/favicon.ico`, `/robots.txt`) | `public, max-age=86400` (short)                                                                                             | cannot be recalled once cached [MDN] [mem for value] |
| JSON API, logged-in user data                                 | `private, no-cache` (+ ETag if computing it is cheap)                                                                       | personal, must stay fresh [MDN]                      |
| Public, shared API data (catalog, config)                     | `public, max-age=60, s-maxage=300, stale-while-revalidate=60`                                                               | edge absorbs load [mem]                              |
| Secrets, tokens, one-time pages                               | `no-store`                                                                                                                  | never persisted [MDN]                                |
| Presigned storage URLs (SeaweedFS/S3)                         | `response-cache-control: private, max-age=<≤ URL lifetime>, immutable`, signed at a fixed window start so the URL is stable | Kiln ADR 0008 [house]                                |
| Error responses (5xx)                                         | `no-store` or very short                                                                                                    | do not pin an outage [mem]                           |

Notes:

- MDN advises `no-cache` (plus `private`) over `no-store` for most "do not cache" needs; it keeps
  bfcache and conditional requests working. Avoid the kitchen-sink combination. [MDN]
- `public` is only needed when the request carried `Authorization`; otherwise omit it. [MDN]
- A cookie does not make a response private — say `private`. Do not use `Vary: Cookie` for that. [MDN]
- Long-lived responses cannot be recalled from intermediate caches; `Clear-Site-Data: "cache"` clears
  only the browser. Fingerprint instead of hoping. [MDN]
- Where it is set: Vite emits hashed names; the static server/CDN (Caddy, nginx, S3 bucket policy)
  sets headers by path; FastAPI sets them per route (middleware for the default `no-cache`). [mem]

## 3. Validators, Vary and CDNs

- Validators: strong `ETag` (hash of the body or of `id + version`) and/or `Last-Modified`. Clients
  send `If-None-Match`/`If-Modified-Since`; `304 Not Modified` refreshes the stored copy with no
  body. [RFC9111]
- A cheap ETag for an entity is `W/"<id>-<version>"` from the optimistic-concurrency column — the same
  value serves `If-Match` on writes (see `database` concurrency patterns). [mem]
- Cache key = method + URI, plus the request headers named in `Vary`. `Vary: *` never matches. [RFC9111]
- `Vary: Accept-Encoding` is normal; `Vary: Accept-Language` multiplies copies per language; avoid
  `Vary: User-Agent`. [MDN]
- CDN: cache static assets at the edge; cache API responses only when they are public and keyed
  without user identity; purge by URL or tag on deploy for the few un-fingerprinted files; never let
  the CDN cache `Set-Cookie` responses. [MDN] [mem]
- Test headers from outside: `curl -sI https://host/assets/x.js`, look at `Cache-Control`, `Age`,
  and the CDN's hit header (e.g. `cf-cache-status`, `x-cache`). [mem]

## 4. Application caches: patterns

Decide in this order: is the slow thing fixable (index, N+1, payload)? → can HTTP caching do it? →
in-process memo → materialised view/summary table → Redis. Kiln: no Redis without an ADR. [house]

- **Cache-aside** (default): read cache → on miss read DB → set with TTL; on write update the DB then
  delete the key so the next read repopulates. Memory stays bounded to the working set. [REDIS]
- **Write-through**: write cache and DB together; every write pays twice; for data where staleness
  is costly. [REDIS blog, mem]
- **Write-behind**: cache first, DB later — risks loss; avoid for business data. [mem]
- **In-process** (`functools.lru_cache`, `cachetools.TTLCache`): fastest, but per instance, warms
  separately and cannot be invalidated across instances; fine for config, feature flags, lookup
  tables. [REDIS] [mem]
- **Result caching of expensive pure work** keyed by content hash (Kiln caches AI results by file
  hash, ADR 0002) — the key itself guarantees correctness, no invalidation needed. [house]

Key design [REDIS] [mem]:

- `cache:{entity}:{id}` shape; add schema version and tenant: `kiln:v3:asset:{studio_id}:{asset_id}`.
  Bump the version on a serialisation change instead of flushing. [REDIS for shape; mem for version]
- Personal data only under a key containing the user/tenant; never in a shared key; respect retention
  (the deletion path must also delete cache keys). [house]
- Serialize with a stable schema (pydantic model dump), not pickle. [mem]

## 5. Invalidation, stampedes and failure modes

- Every cached entity has an upper bound on staleness (TTL) **and** explicit invalidation on the
  writes that change it. [REDIS]
- Order on write: commit the DB transaction, then delete the key (after commit — a rollback must not
  leave a deleted-but-unchanged state, and deleting before commit lets a reader re-cache old data). [REDIS] [mem for the race]
- Remaining race: a slow reader can set a stale value after the delete; mitigate with short TTLs,
  versioned values (store `version` and refuse older), or delete again after a short delay. [mem] [DDIA]
- Event-driven invalidation from the outbox/job queue when several caches derive from one write. [house]
- **Stampede**: when a hot key expires many requests hit the DB at once. Protect with a single-flight
  lock (`SET key:lock <token> NX PX 5000`; winners load, others wait briefly and re-read), probabilistic
  early refresh, or serve-stale-while-refreshing. [REDIS]
- **TTL jitter** (±10–20 %) so keys written together do not expire together. [mem]
- **Negative caching**: cache "not found" briefly (seconds) to stop repeated misses for absent ids
  from hammering the DB; keep it short so creations appear quickly. [mem]
- **Cache down ≠ app down**: timeouts on cache calls (tens of ms), fall back to the source, circuit
  breaker around the cache client. [house: Release It!] [mem]
- **Observe**: hit ratio, latency, evictions, memory per namespace; a low hit ratio means remove the
  cache. Set `maxmemory` + an eviction policy (`allkeys-lru`) for pure caches. [mem]
- Redis client-side caching (server-assisted tracking) exists in redis-py ≥ 5.1; it flushes local
  entries when a connection drops; use it only for read-mostly keys. [REDIS]

## 6. TanStack Query

- Defaults: `staleTime` 0 (data stale immediately), `gcTime` 5 min after the last observer unmounts;
  stale queries refetch on mount, window focus and reconnect; failed queries retry 3 times with
  exponential backoff; structural sharing keeps unchanged references. [TQ]
- Set `staleTime` per query from how fast the data really changes: reference data minutes to hours,
  a list others edit seconds to a minute, a job status 0 with `refetchInterval` while running. [mem]
- Keep `gcTime` ≥ `staleTime`, or cached data is dropped before it would be considered stale. [mem]
- Query keys are hierarchical arrays from one factory per feature (`assetKeys.detail(id)`), so
  invalidation can target `['assets']` or one item. Kiln: keys live in the feature's hooks. [house] [mem]
- After a mutation: `queryClient.invalidateQueries({ queryKey: assetKeys.lists() })`, and
  `setQueryData` for the detail when the response returns the new entity; optimistic updates with
  rollback in `onError` only where latency is felt. [mem — TQ mutation docs not re-fetched]
- Prefetch on intent (`prefetchQuery` in the route loader or on hover) rather than waterfalls of
  `useQuery` in nested components. [mem]
- Disable retries for 4xx (validation, 404, 409) via a `retry` function; keep them for network/5xx. [mem]
- Do not set `refetchOnWindowFocus: false` globally to hide a slow endpoint — fix the endpoint or raise
  that query's `staleTime`. [mem]
- The HTTP cache still applies under fetch: an API with `private, max-age=…` can make a
  "refetch" return the browser's copy. Keep API responses `no-cache` and let TanStack Query own
  client freshness. [mem]

## 7. Database-side caching

- First an index or a better query (`database` skill); Postgres' shared buffers and the OS cache
  already cache hot pages. [mem]
- **Materialised view** for expensive aggregates: `REFRESH MATERIALIZED VIEW CONCURRENTLY` needs a
  unique index and keeps reads available; schedule it on the job queue; expose its age. [PG]

- **Summary/counter table** maintained in the same transaction as the write (or by the queue) for
  counts and badges. [DDIA] [mem]
- **Generated columns** for derived per-row values used in filters (`GENERATED ALWAYS AS … STORED`). [mem]
- Avoid a hand-rolled query-result cache keyed on SQL text: invalidation becomes guesswork. [mem]
