---
name: benchmark
description: Measures a request against something real — a product benchmark (how 2–3 leading products solve the same job, written to `docs/delivery/<slug>/benchmark.md` with the decisions it drives) and a performance benchmark (`benchmarks/plan.md` with workloads, data, percentiles, environment and targets, a harness run by `make bench` (including app start, jank, size and memory for iOS and Android apps), a committed baseline and a CI guard against regressions). Use when the user says "benchmark", "compare with competitors", "load test", "how fast", "baseline", "did it get slower", or asks for speed, size or cost without a number. Fixing a slow path is `cache-optimize`'s job. Inside a delivery, `discover`, `spec`, `shape-plan` and `verify-app` call this skill for `ship`.
---

# benchmark — decide what "good" is against something real, then keep measuring it

Two kinds, one rule: a number without a reference is not a target, and a target without a repeatable
measurement is a wish.

## A. Product benchmark (during `discover` / `spec`)

1. **Pick 2–3 references**: the products the user names, else the leading tools for the same job (web
   search). Note version and date — products change.
2. **Walk the same job in each**: the core flow of the brief, step by step; record what each does
   for the hard parts (empty state, errors, large data, keyboard, mobile), time to first value, and
   pricing or limits when they matter.
3. **Table → decisions**: write `docs/delivery/<slug>/benchmark.md` from
   `templates/product-benchmark.md`; `discover` links it from the brief's "Product benchmark"
   section. Every row ends in "we do X because Y" — copy the good idea, deliberately differ, or out of
   scope. A table with no decisions is research theatre; delete it.
4. **Evidence**: screenshots or links per reference in `docs/delivery/<slug>/evidence/benchmark/`.

## B. Performance benchmark (from `spec`, built in `shape-plan`, run in `verify-app` and CI)

1. **Workloads from the spec**: the 3–5 operations users feel (page load, a search, an upload, a job,
   an AI call) with realistic data sizes — the largest allowed file, a full page, a cold cache.
2. **Metrics and targets**: for each workload pick the metric, percentile and environment (p50/p95 latency, throughput, LCP/INP,
   bundle KB, memory peak, cost per call) and a target with its source (spec, Core Web Vitals,
   `init-project` budgets, the product benchmark). Write them into `benchmarks/plan.md` from
   `templates/benchmark-plan.md`.
3. **Harness before features**: a backlog item right after the walking skeleton builds the harness —
   `k6` (HTTP, thresholds fail the run), `pytest-benchmark` / `vitest bench` / `hyperfine` (code
   paths), Lighthouse CI (pages), `size-limit` or the bundler report (bytes), `pgbench` or
   `EXPLAIN (ANALYZE, BUFFERS)` (queries). One `make bench` runs all of them.
   Native apps add their own workloads — see "Mobile workloads" below.
4. **Method** (`references/methodology.md`): pinned environment, warm-up, ≥ 10 runs or a fixed
   duration, report median and p95 with spread, change one thing at a time, keep raw results.
5. **Baseline**: run on the skeleton and commit `benchmarks/baseline.json` (numbers + commit + machine).
   Every later run compares to it; a deliberate change of baseline is its own commit with a reason.
6. **Guard**: CI fails when a metric regresses beyond its noise band (e.g. p95 + 10 %, bundle + 5 KB),
   or when a hard target is broken. Too noisy for CI → run nightly and post the diff.
7. **Report**: before/after table in the story or `verify-app` evidence; a regression is fixed (with
   `cache-optimize`) or accepted in writing with the reason.

## Mobile workloads (iOS and Android apps)

For each native app, add to `benchmarks/plan.md`: cold and warm start (time to initial and full
display, p50/p90), frame time and jank on the main scroll, app size, peak memory on the main
journey, and battery when the app uses location, audio or background sync. Measure with XCTest
metrics (`XCTApplicationLaunchMetric`, `XCTOSSignpostMetric`) and Instruments on iOS, and
Macrobenchmark (`StartupTimingMetric`, `FrameTimingMetric`, `PowerMetric`) on Android, on a release
build on a physical mid-range device; simulators and emulators only catch large regressions.
Targets start from Android vitals' limits (cold start ≥ 5 s, warm ≥ 2 s, hot ≥ 1.5 s are
"excessive") and tighten from there. Guard app size on every PR and device benchmarks nightly.
Details, targets and harness code: `references/mobile.md`.

## Core checklist

1. Every performance target names its workload, data size, percentile and environment.
2. Measure before changing anything; never tune without a baseline.
3. Lab numbers find causes; field numbers (real users) decide success when they exist.
4. Report spread (p95, min–max or CI), not a single best run.
5. The harness lives in the repo and runs with one command; results are files, not memory.
6. Benchmarks use production-like builds (`npm run build` then preview, a server without reload or
   debug mode), because dev servers add work that production never does.
7. Each product-benchmark row ends in a decision.
8. A regression guard exists for every target that matters to users.

## Anti-patterns

Micro-benchmarks of code nobody waits on; comparing runs from different machines; one run; averages
hiding tail latency; benchmarking the dev server; "we are faster than X" without X's version and
setup; a benchmark table copied into the brief with no decision.

## Evidence before "done"

- `benchmarks/plan.md` and `benchmarks/baseline.json` committed; `make bench` output pasted.
- CI (or nightly) job that fails on regression, shown failing once on purpose.
- `docs/delivery/<slug>/benchmark.md` with decisions and dated references, when discovery used one.

## References

- `references/methodology.md` — measurement method, tools per layer, noise and regression bands.
- `references/mobile.md` — iOS and Android workloads, targets, XCTest metrics, Macrobenchmark,
  MetricKit, and how to guard them.
- `templates/benchmark-plan.md`, `templates/product-benchmark.md`.
