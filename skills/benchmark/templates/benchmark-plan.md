# Benchmark plan

Updated: <YYYY-MM-DD> · Machine: <model, CPU, RAM, OS> · Command: `make bench`

| Workload | Data | Metric | Target (source) | Baseline | Noise band | Guard |
| --- | --- | --- | --- | --- | --- | --- |
| Open the gallery (cold) | 24 cards | LCP p75 | ≤ 2.5 s (CWV) | | ±10 % | Lighthouse CI |
| Upload 500 MB | 1 file | throughput | ≥ 20 MB/s (spec) | | | k6 |

## Changes to the baseline

- <date> <metric> <old → new> — because <deliberate change>; commit <sha>.
