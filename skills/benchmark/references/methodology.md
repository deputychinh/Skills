# Benchmark methodology

Items marked _(memory)_ are from established practice and were not re-checked online on 2026-11-07.

## Contents

1. [Active benchmarking](#1-active-benchmarking) · 2. [Tools per layer](#2-tools-per-layer) · 3. [Noise and regression bands](#3-noise-and-regression-bands) · 4. [Load tests](#4-load-tests) · 5. [Web pages](#5-web-pages) · 6. [AI calls](#6-ai-calls)

## 1. Active benchmarking

- While a benchmark runs, watch what limits it (CPU, I/O, locks, network) with the USE method; a
  number without its limiting resource cannot be explained or improved. _(memory: Gregg, Systems Performance)_
- Change one variable per run; record the commit, config, data size and machine with every result.
- Warm up (JIT, caches, connection pools) and discard warm-up runs; say whether the result is cold or warm.
- Same machine, same power mode, nothing else heavy running; containers with fixed CPU/memory limits.

## 2. Tools per layer

| Layer               | Tool                                                                           | Gate                                 |
| ------------------- | ------------------------------------------------------------------------------ | ------------------------------------ |
| HTTP API            | k6 (`thresholds: { http_req_duration: ['p(95)<300'] }`)                        | non-zero exit when a threshold fails |
| Node code path      | `vitest bench` (tinybench) or `node --test` with `performance.now()`           | compare to baseline JSON             |
| Python code path    | `pytest-benchmark` (`--benchmark-compare --benchmark-compare-fail=median:10%`) | built-in compare-fail                |
| CLI / whole command | `hyperfine --warmup 3 --runs 20 --export-json`                                 | compare to baseline JSON             |
| Database            | `EXPLAIN (ANALYZE, BUFFERS)`, `pgbench -f script.sql`                          | plan shape + time per statement      |
| Web page            | Lighthouse CI (`assert` budgets), `web-vitals` for field data                  | `lhci autorun` exit code             |
| Bundle              | `size-limit` or the bundler's stats                                            | byte budget per entry                |

## 3. Noise and regression bands

- Measure the noise first: run the unchanged baseline 5–10 times; the band is the observed spread
  (often ±5–10 % for latency on a laptop). A regression is a move beyond the band.
- Prefer medians and p95 over means; keep raw samples so a later reader can re-analyse.
- Byte budgets need no band: bundles are deterministic.
- When CI machines are too noisy, run nightly on a fixed runner and alert on trends instead of failing PRs.
- Keep main-thread benchmarks (UI layout, rendering) out of the parallel unit-test run: they hold the main thread for
  hundreds of ms and make unrelated timing tests fail. Gate them on an env var that only `make bench` sets.
- Any view that creates one element per character, word or row gets a workload at the largest input it accepts:
  a furigana view was fine at 300 characters and froze the window for 3.5 s at the 20 000-character input cap.

## 4. Load tests

- Model arrival rate (open model, `constant-arrival-rate`) rather than a fixed number of looping users,
  so a slow server does not reduce the load it receives. _(memory: k6 executors)_
- Ramp up, hold at target, then step past it to find the knee; report errors and saturation, not just latency.
- Use production-like data volumes; an empty table makes every query fast.

## 5. Web pages

- Lab: Lighthouse on the production build, mobile emulation, 3 runs, median. Field: `web-vitals` from
  real sessions at the 75th percentile decides success (LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1).
- INP needs interactions: Lighthouse timespan / user-flow mode or a DevTools trace.

## 6. AI calls

- Benchmark quality and cost together: the eval set's pass rate, p50/p95 latency and cost per call
  for each model or prompt variant; a cheaper model that fails the eval threshold is not a win.
