---
name: system-design
description: Designs a system or a significant part of one before it is built — functional and non-functional requirements, back-of-the-envelope estimates (QPS, storage, bandwidth, compute, cost), API and data model sketch, C4 context and container diagrams, storage and consistency choices, the scaling ladder, SLOs and failure modes, security and privacy boundaries, observability, evolution path, and trade-off tables that feed ADRs. Produces one design file with numbers, diagrams and tables. Use when a new product, service, pipeline or major feature needs its shape decided, when load, data size or cost may change the design, or when David asks "thiết kế hệ thống", "system design", "kiến trúc", "scale", "chịu tải", "high level design", "nên dùng database gì", "có cần microservices không". Not for writing the code — use `backend`; ADRs, fitness functions and the threat model are `architect`'s. Inside a delivery, `ship` and `architect` call this skill.
---

# system-design — numbers first, then the simplest shape that survives them

Output: one file — `docs/delivery/<NNN-slug>/system-design.md` inside a `ship` delivery, otherwise
`docs/design/<slug>.md` — that `architect` turns into `design.md`, ADRs, fitness functions and the
threat model. This skill does not write ADRs or the threat model itself; it hands `architect` the
options, the numbers and a recommendation. Solo developer + AI agent: prefer what one person can run,
debug at 2 a.m. and afford; every extra moving part must be paid for by a number in the estimate.

## Workflow

**Quick path:** for a brief with under ~1 000 users and no new data store, skip the estimates (step 2), the
C4 diagrams and the cost section; write the components, data and trade-off table only. The failure-mode
table written here is the one `architect` copies — it is not written twice.

1. **Frame.** Read the brief/spec, `docs/architecture/README.md` and `docs/adr/`. Write: 3–7 core
   use cases; non-functional targets as numbers (latency p95, availability, durability, data size,
   freshness, cost ceiling, privacy rules); constraints (house stack: FastAPI, Postgres, Python
   worker on a Postgres queue, S3; one developer; budget); explicit non-goals. Unknown numbers get a
   stated assumption marked `HYPOTHESIS`. _Evidence:_ §1 "Requirements" of the design file; no
   target without a number or a `HYPOTHESIS` tag.
2. **Estimate.** Users → actions/day → requests/day → average and peak QPS (peak factor stated);
   reads vs writes; object and row sizes → storage per day/year with replication; bandwidth in and
   out; worker CPU-seconds per day; monthly cost. Put the arithmetic in a short script in the
   design folder (`estimate.py`, stdlib only) and paste its output, so a changed assumption is one
   edit. Round to one significant figure. _Evidence:_ the estimate table + script output; the
   **one limiting number** named (e.g. ingress bandwidth, worker CPU, Postgres connections).
3. **Sketch the interface and data.** Main endpoints/events with request/response shapes, entities
   with approximate row size and growth, and the access patterns (each query with its filter and
   sort). _Evidence:_ §3 tables; every use case maps to at least one endpoint and one query.
4. **High-level design.** C4 system context and container diagrams in Mermaid; walk the two most
   important flows step by step (sequence or numbered list) including where each write commits.
   _Evidence:_ diagrams render (`npx -y @mermaid-js/mermaid-cli -i … -o …` or GitHub preview) and
   every container appears in a flow.
5. **Choose storage per data kind.** For each kind (transactional records, files, derived data,
   search, cache, events), state the consistency need, access pattern and size, then the store.
   Default: Postgres for records and the job queue, object storage for blobs; anything else needs a
   number from step 2 that Postgres cannot meet. _Evidence:_ §5 storage table with a "why not
   Postgres" cell for every non-Postgres choice.
6. **Scale only where the numbers say.** Walk the ladder in `references/estimation-and-scaling.md`
   §3 (measure → fix queries and indexes → vertical → stateless × N → async/queue → cache → read replica → partition → split a service → shard) and stop at the first rung that gives ≥ 3× headroom over year-one peak. Say what you'd
   do at 10×. _Evidence:_ "bottleneck → rung → headroom" table.
7. **Reliability and consistency.** Draft 1–3 SLOs from the targets; a failure-mode table (each
   dependency down, slow, returning junk; duplicate and out-of-order messages; partial failure
   mid-flow; deploy mid-flow) with detection and response; idempotency points; backpressure and
   load shedding; consistency model per flow. _Evidence:_ §7 tables; every write path has an
   idempotency answer.
8. **Boundaries, cost, operations.** Trust boundaries and PII flow (what crosses to third parties,
   e.g. an AI API); monthly cost at year-one and 10× load; SLIs, the dashboards and the alerts.
   _Evidence:_ §8 with a cost line per paid component and a privacy note per external call.
9. **Decide with trade-off tables.** For every decision that would be expensive to reverse, list ≥ 2
   real options scored against the driving characteristics, pick one, state what would make you
   switch. _Evidence:_ §9 tables, each with a "revisit when" trigger; a list of ADRs for `architect`.
10. **Challenge the design.** Re-check estimates against latency numbers, ask "what breaks first at
    10×, and what does it cost to fix then?", and run the core checklist below. Inside a delivery,
    hand off to `architect`. _Evidence:_ the checklist with each line ticked or answered; open
    questions listed with owners (David only for business/money/legal).

## Core checklist

1. Every non-functional target is a number with a unit and a percentile, or tagged `HYPOTHESIS`.
2. Peak QPS, storage per year and bandwidth are computed, with the formula shown.
3. The limiting resource is named and has ≥ 3× headroom at year-one peak.
4. Large files never stream through the API process; clients use presigned URLs.
5. Work over ~1 s or that calls a third party runs asynchronously behind a durable queue.
6. Every write that can be retried has an idempotency key or natural key.
7. Each flow states its consistency model and what the user sees during the gap.
8. Every dependency has a timeout, a failure behaviour and a degraded mode in the failure table.
9. Each non-default store or extra service is justified by a number Postgres/the monolith can't meet.
10. Source of truth vs derived data is explicit; derived data can be rebuilt.
11. PII and secrets flows are drawn; nothing personal goes to a third party without a stated reason.
12. Cost is estimated at 1× and 10×; the biggest line item is named.
13. SLOs have SLIs you can actually measure from logs/metrics in the design.
14. Every significant decision has a trade-off table and a "revisit when" trigger.
15. The design can be built and run by one developer; operational toil is named.

## Anti-patterns

- Microservices, Kafka, Kubernetes or a NoSQL store "for scale" with no number that needs them.
- CQRS/event sourcing across a whole system instead of one bounded context that earned it.
- Estimates skipped, or quoted to three significant figures from invented inputs.
- Designing for 100× while ignoring the failure modes at 1×.
- "Exactly-once delivery" claimed; it's at-least-once + idempotent handlers.
- Cache added before the query is indexed; a replica added to hide a missing index.
- A diagram with boxes but no flows, or arrows with no protocol and direction.
- Availability promised without saying which dependency's outage breaks it.
- Distributed transactions (2PC) between services where an outbox and a state machine would do.
- Treating 2012-era latency numbers as current measurements instead of orders of magnitude.

## Evidence before "done"

- The design file with sections 1–9 filled, estimate script output pasted, diagrams rendering.
- Storage, scaling, failure-mode and trade-off tables complete; checklist answered.
- Inside a delivery: `architect` has the ADR list; `status.md` points at the file.

## References

- `references/estimation-and-scaling.md` — estimation method and reference numbers, storage
  choice, scaling ladder, consistency models, CAP/PACELC.
- `references/reliability-and-evolution.md` — SLOs and error budgets, failure modes, security and
  privacy boundaries, cost, observability, C4, evolution from monolith, trade-off table template.
- `references/worked-example-kiln.md` — Kiln's asset upload and preview pipeline: estimate →
  design → trade-off tables.
