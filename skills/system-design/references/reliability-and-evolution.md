# Reliability, boundaries, cost, observability, diagrams, evolution and trade-offs

Tags: **[SRE]** Beyer et al., _Site Reliability Engineering_ (sre.google/sre-book) · **[SREW]**
_The Site Reliability Workbook_ · **[WAF]** AWS Well-Architected Framework · **[C4]** c4model.com ·
**[FOWLER]** martinfowler.com · **[FSA]** Richards & Ford, _Fundamentals of Software Architecture_ ·
**[RI]** Nygard, _Release It!_ · **[HOUSE]** the skills' own checklists in `init-project`. ADRs, fitness functions and the
threat model are produced by `architect`; this file only prepares their inputs.

Verified on 2026-11-07 against https://sre.google/sre-book/service-level-objectives/,
https://sre.google/sre-book/monitoring-distributed-systems/, https://sre.google/workbook/alerting-on-slos/,
https://docs.aws.amazon.com/wellarchitected/latest/framework/the-pillars-of-the-framework.html,
https://c4model.com/, https://c4model.com/abstractions/container,
https://martinfowler.com/bliki/MonolithFirst.html and https://martinfowler.com/bliki/MicroservicePrerequisites.html.

## Contents

1. SLOs and error budgets
2. Failure modes
3. Security and privacy boundaries
4. Cost
5. Observability
6. Diagrams (C4)
7. Evolution: monolith first
8. Well-Architected pass
9. Trade-off table template

## 1. SLOs and error budgets

- SLI = a measured quantity of service quality; SLO = a target for an SLI; SLA = a contract with
  consequences. **[SRE]**
- Use percentiles (p50 for typical, p99 for the tail), not averages. **[SRE]**
- Few SLOs; don't copy today's performance as the target; no absolutes ("always up"); keep an
  internal SLO tighter than anything promised. **[SRE]**
- Error budget = 1 − SLO; when it's spent, reliability work beats features. **[SRE]** _(memory: budget policy wording)_
- Alerting for a 99.9 % SLO, multiwindow burn rate: page at 14.4× over 1 h (5 min short window,
  2 % of budget) or 6× over 6 h (30 min, 5 %); ticket at 1× over 3 days (6 h, 10 %). **[SREW]**
- Solo default: one availability SLO (non-5xx ratio of API requests, 99.5–99.9 %), one latency SLO
  per user-facing flow (p95), one freshness SLO for async work (e.g. 95 % of thumbnails within 60 s). **[HOUSE]**

## 2. Failure modes

Fill one row per dependency and per flow step. **[RI]** _(memory)_ **[HOUSE]**

| Component / step     | Failure                    | Detection                | Response                                                      | User sees           |
| -------------------- | -------------------------- | ------------------------ | ------------------------------------------------------------- | ------------------- |
| Postgres             | down / failover            | `/ready` fails, 5xx rate | fail fast 503, process restarts                               | error with retry    |
| Object storage       | slow / down                | breaker opens            | fail fast with `Retry-After`; reads of signed URLs unaffected | upload unavailable  |
| Third-party API (AI) | slow, wrong, down          | timeout, schema check    | fallback adapter, mark result "needs review"                  | degraded tags       |
| Worker               | crash mid-job              | lease expires            | another worker re-claims; handler idempotent                  | slight delay        |
| Client               | retries a POST             | same `Idempotency-Key`   | replay first response                                         | one resource        |
| Queue                | backlog grows              | oldest-job age alert     | scale workers, shed optional jobs                             | "processing" longer |
| Deploy               | new + old versions overlap | —                        | expand/contract migrations, tolerant readers                  | nothing             |

Also decide: backpressure point (where requests are refused first), bounded queues and result
sets, timeouts shorter than the caller's, graceful shutdown, and what is retried where (one layer). **[RI]** **[HOUSE]**

## 3. Security and privacy boundaries

- Draw trust boundaries on the container diagram: internet → API, API → DB, clients → object
  storage (presigned), worker → third parties. Each crossing names authn, authz and validation. **[HOUSE]**
- PII inventory: which fields, where stored, who reads them, retention, delete path (GDPR and
  the local data-protection law where relevant). **[HOUSE]**
- Untrusted content (uploads, user URLs, model output) handled in sandboxed or allow-listed paths. **[HOUSE]**
- Hand this to `architect` step 8 for the threat model (OWASP Top 10:2025, ASVS 5.0 L1). **[HOUSE]**

## 4. Cost

- List every paid component: compute (API, worker), database (instance + storage + backups),
  object storage (GB-month, requests, egress), third-party APIs (per call/token), observability. **[WAF cost optimization]**
- Compute 1× and 10×; name the largest line and its driver (often egress or AI tokens). **[HOUSE]**
- Prices change — fetch the provider's current pricing page when a decision depends on it and
  write the date next to the number. **[HOUSE]**
- Cheap levers first: lifecycle rules (expire staging objects, move old versions to infrequent
  access), thumbnails instead of originals in galleries, browser caching of signed URLs, a cheaper
  model tier for easy AI tasks. _(memory)_

## 5. Observability

- Four golden signals per service: latency, traffic, errors, saturation; page on user-visible
  symptoms, debug with causes. **[SRE monitoring]**
- For queues: depth, oldest age, failure rate per kind. For storage: breaker state. **[HOUSE]**
- Every SLO in §1 must be computable from the planned metrics or logs — check it now. **[HOUSE]**
- Correlation: request id → job id → outbound call; traces when more than two processes are
  involved. **[HOUSE]**

## 6. Diagrams (C4)

- Four levels: system context, container, component, code; supplementary: system landscape,
  dynamic, deployment. **[C4]**
- A C4 **container** is an application or data store that must run for the system to work — a web
  app, SPA, mobile app, serverless function or database — not a Docker container. **[C4]**
- For a design file: context + container diagrams always; a dynamic (sequence) view for the 1–2
  key flows; component diagrams only for the core context. **[HOUSE]**
- Every arrow: direction, purpose, protocol (`HTTPS JSON`, `SQL`, `S3 presigned POST`). _(memory: C4 notation guidance)_
- Mermaid in the repo (`flowchart` or `C4Context`/`C4Container`), regenerated by a make target. **[HOUSE]**

## 7. Evolution: monolith first

- Successful microservice systems mostly began as a monolith that was later split; starting with
  services pays the "microservice premium" before the product is proven and locks in boundaries
  that are hard to get right early. Start modular, peel off later. **[FOWLER MonolithFirst, 2015]**
- Prerequisites before any split: rapid provisioning, basic monitoring (technical and business),
  rapid deployment through a pipeline — plus a DevOps culture. **[FOWLER MicroservicePrerequisites, 2014]**
- House path: modular monolith with bounded contexts as packages → separate _process_ for heavy
  or blocking work (the worker) sharing the codebase → separate _service_ only along a context
  boundary with its own data, when deploy cadence, scaling profile or failure isolation demands it. **[HOUSE]**
- Keep seams: ports for every external dependency, contexts talk through application services or
  events, no cross-context table joins in new code. **[HOUSE]**
- Architecture characteristics (scalability, elasticity, availability, evolvability…) are chosen,
  few and explicit; there are no best practices, only trade-offs, aiming for the least-worst
  architecture. **[FSA]** _(memory)_

## 8. Well-Architected pass

Six pillars: operational excellence, security, reliability, performance efficiency, cost
optimization, sustainability. **[WAF]** One line each in the design file: the decision that serves
the pillar, or "accepted risk" with a reason. Sustainability for a solo product usually means: no
idle oversized instances, lifecycle rules on storage, no needless re-processing. _(memory)_

## 9. Trade-off table template

```markdown
### Decision: <question>

Driving characteristics: <from step 1, e.g. cost, operability, upload latency>

| Option | <char 1> | <char 2> | <char 3> | Ops burden (solo) | Reversibility |
| ------ | -------- | -------- | -------- | ----------------- | ------------- |
| A — …  | + …      | − …      | …        | low               | easy          |
| B — …  | …        | …        | …        | high              | hard          |

Choice: A, because <the characteristic that decided it, with the number from the estimate>.
Revisit when: <measurable trigger, e.g. "jobs > 500/s sustained" or "storage bill > $300/month">.
ADR: to be written by `architect` (`docs/adr/NNNN-<slug>.md`).
```
