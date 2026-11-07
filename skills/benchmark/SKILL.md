---
name: benchmark
description: Use when a request needs to be measured against something — at discovery, how two or three leading products solve the same job (a product benchmark), and at spec and build time, how fast, heavy or costly the system must be (a performance benchmark with a baseline). Triggers include "benchmark", "so sánh với sản phẩm khác", "đối thủ", "hiệu năng", "chịu tải", "đo tốc độ", "baseline", "load test", "có chậm đi không". Produces a product-benchmark table with the decisions it drives, and a benchmark plan (workloads, metrics, targets, environment, harness) with a committed baseline and a CI guard against regressions. Fixing a slow path is `cache-optimize`'s job; this skill decides what to measure and keeps measuring. Inside a delivery, `ship`, `spec`, `shape-plan` and `verify-app` call this skill.
---

# benchmark — decide what "good" is against something real, then keep measuring it

Two kinds, one rule: a number without a reference is not a target, and a target without a repeatable
measurement is a wish.

## A. Product benchmark (during `discover` / `spec`)

1. **Pick 2–3 references**: the products David names, else the leading tools for the same job (web
   search). Note version and date — products change.
2. **Walk the same job in each**: the core flow of the brief, step by step; record what each does
   for the hard parts (empty state, errors, large data, keyboard, mobile), time to first value, and
   pricing or limits when they matter.
3. **Table → decisions**: `templates/product-benchmark.md`. Every row ends in "we do X because Y" —
   copy the good idea, deliberately differ, or out of scope. A table with no decisions is research
   theatre; delete it.
4. **Evidence**: screenshots or links per reference in `docs/delivery/<slug>/evidence/benchmark/`.

## B. Performance benchmark (from `spec`, built in `shape-plan`, run in `verify-app` and CI)

1. **Workloads from the spec**: the 3–5 operations users feel (page load, a search, an upload, a job,
   an AI call) with realistic data sizes — the largest allowed file, a full page, a cold cache.
2. **Metrics and targets**: for each workload pick the metric (p50/p95 latency, throughput, LCP/INP,
   bundle KB, memory peak, cost per call) and a target with its source (spec, Core Web Vitals,
   `init-project` budgets, the product benchmark). Write them into `benchmarks/plan.md` from
   `templates/benchmark-plan.md`.
3. **Harness before features**: a backlog item right after the walking skeleton builds the harness —
   `k6` (HTTP, thresholds fail the run), `pytest-benchmark` / `vitest bench` / `hyperfine` (code
   paths), Lighthouse CI (pages), `size-limit` or the bundler report (bytes), `pgbench` or
   `EXPLAIN (ANALYZE, BUFFERS)` (queries). One `make bench` runs all of them.
4. **Method** (`references/methodology.md`): pinned environment, warm-up, ≥ 10 runs or a fixed
   duration, report median and p95 with spread, change one thing at a time, keep raw results.
5. **Baseline**: run on the skeleton and commit `benchmarks/baseline.json` (numbers + commit + machine).
   Every later run compares to it; a deliberate change of baseline is its own commit with a reason.
6. **Guard**: CI fails when a metric regresses beyond its noise band (e.g. p95 + 10 %, bundle + 5 KB),
   or when a hard target is broken. Too noisy for CI → run nightly and post the diff.
7. **Report**: before/after table in the story or `verify-app` evidence; a regression is fixed (with
   `cache-optimize`) or accepted in writing with the reason.

## Core checklist

1. Every performance target names its workload, data size, percentile and environment.
2. Measure before changing anything; never tune without a baseline.
3. Lab numbers find causes; field numbers (real users) decide success when they exist.
4. Report spread (p95, min–max or CI), not a single best run.
5. The harness lives in the repo and runs with one command; results are files, not memory.
6. Benchmarks use production-like builds (`npm run build && preview`, uvicorn without reload).
7. Each product-benchmark row ends in a decision.
8. A regression guard exists for every target that matters to users.

## Anti-patterns

Micro-benchmarks of code nobody waits on; comparing runs from different machines; one run; averages
hiding tail latency; benchmarking the dev server; "we are faster than X" without X's version and
setup; a benchmark table copied into the brief with no decision.

## Evidence before "done"

- `benchmarks/plan.md` and `benchmarks/baseline.json` committed; `make bench` output pasted.
- CI (or nightly) job that fails on regression, shown failing once on purpose.
- Product benchmark table with decisions and dated references, when discovery used one.

## References

- `references/methodology.md` — measurement method, tools per layer, noise and regression bands.
- `templates/benchmark-plan.md`, `templates/product-benchmark.md`.
