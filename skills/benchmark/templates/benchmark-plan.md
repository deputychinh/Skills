# Benchmark plan

Updated: <YYYY-MM-DD> · Machine: <model, CPU, RAM, OS> · Command: `make bench` · Baseline:
`benchmarks/baseline.json`

| Workload | Data | Metric | Percentile | Environment | Target (source) | Baseline | Noise band | Guard |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Open the gallery (cold) | 24 cards | LCP | p75 | production build, mobile emulation | ≤ 2.5 s (CWV) | | ±10 % | Lighthouse CI |
| Upload a large file | 1 × 500 MB | throughput | median | local stack, 2 vCPU | ≥ 20 MB/s (spec) | | | k6 |

## Changes to the baseline

- <date> <metric> <old → new> — because <deliberate change>; commit <sha>.
