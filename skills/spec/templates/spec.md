# <Name> — spec

Brief: `brief.md` · Status: draft | ready · Updated: <YYYY-MM-DD>

## Story map

| Activity → | <activity 1> | <activity 2> | <activity 3> |
| --- | --- | --- | --- |
| Release 1 | <story> | <story> | <story> |
| Later | <story> | | <story> |

## Stories and acceptance criteria

### S1 — As <actor>, I want <capability>, so that <impact>

- AC1: WHEN … THE SYSTEM SHALL …
- AC2 (negative): WHEN … THE SYSTEM SHALL …
- AC3 (boundary): …

## Quality targets

| Characteristic | Workload | Data | Target | Percentile | Environment | How it is checked |
| --- | --- | --- | --- | --- | --- | --- |
| Latency | Search notes | 10 000 notes | ≤ 300 ms | p95 | production build, 2 vCPU | `make bench` (k6) vs `benchmarks/baseline.json` |
| | | | | | | |

Every row is copied into `benchmarks/plan.md` (`benchmark` part B).

## Non-goals and no-gos

- …

## Glossary

| Term | Meaning here |
| --- | --- |

## Open questions

- [NEEDS CLARIFICATION: …] — resolved by …

## Changes after build started

- <date> <what changed> — because <what we learned>
