---
name: architect
description: Decides and records a system's shape — driving quality characteristics, bounded contexts, data flows, integration timeouts and fallbacks, AI-call rules, fitness functions, threat model and ADRs. Use when a spec is ready and the design must be settled before planning, or when a change touches a decision recorded in an ADR. Inside a delivery, `ship` calls this skill.
---

# architect — the least-worst design that meets the spec, written down

Output: `docs/delivery/<NNN-slug>/design.md` (from `templates/design.md`), one ADR per significant
decision in the repo's `docs/adr/` (Nygard format: status, context, decision, consequences), and an
updated `docs/architecture/README.md`. For a new repo, `init-project` Phase 2b already wrote ADR 0001 —
extend it, do not repeat it.

## Steps

For a new system, or a part that must scale, run `system-design` first (requirements, estimates,
storage choice, trade-offs) and turn its decisions into ADRs here; for the data model and migration
plan use `database`.

1. **Driving characteristics**: from the spec's quality targets, pick the 3–7 that shape the design
   (e.g. latency, cost, data privacy, availability, evolvability). Ignore the rest on purpose.
2. **Domain**: name the subdomains — core (where the product wins; model carefully), supporting,
   generic (buy or keep simple). Draw bounded contexts and how they talk; keep one transaction per use case.
3. **Shape**: dependencies point inward — domain and use cases import no framework, UI or database;
   adapters at the edge. Prefer deep modules (small interface, real work inside). Monolith first unless
   a characteristic forces a split.
4. **Data**: source of truth vs. derived data for each flow; idempotency keys for every retried write;
   ordering needs; migrations expand → migrate → contract; PII classified with retention.
5. **Integration points** (APIs, storage, queues, LLMs; copy the failure-mode table from
   `system-design`'s design file when one exists, otherwise write it here): timeout, retry with backoff and jitter only
   where idempotent, circuit breaker, bulkhead, bounded result sets. Write each in the design table.
6. **AI features** (when the product calls a model): pick the model by task and cost; structured
   outputs with a schema; a fallback when the model is wrong, slow or down; prompt and model version
   recorded with each result; an eval set of ≥ 20 examples (real ones if David supplies them, otherwise collected or synthetic and labelled as such) judged by a scripted check or an LLM-judge rubric, with a pass threshold; prompt-injection
   boundary (untrusted text never reaches tools or system prompts unescaped); cost and latency budget.
   Load the `claude-api` skill before writing Claude API code.
7. **Fitness functions**: for each driving characteristic, an automated check (test, lint rule,
   budget in CI, e2e timing, eval threshold). A characteristic without one is a wish.
8. **Threat model** (OWASP Top 10:2025, ASVS 5.0 L1): assets, entry points, trust boundaries →
   `docs/security.md`.
9. **ADR per decision** that would be expensive to reverse; record the options rejected and why.

## Anti-patterns

Big ball of mud; the database or framework at the centre; distributed system by fashion; shallow
"classitis"; replication mistaken for backup; an LLM call without timeout, fallback or eval.

Sources: Richards & Ford _Fundamentals of Software Architecture_; Evans _DDD_, Khononov _Learning DDD_;
Martin _Clean Architecture_; Ousterhout _A Philosophy of Software Design_; Kleppmann _DDIA_; Nygard
_Release It!_; Ford et al. _Building Evolutionary Architectures_. The house checklists live in
[`../init-project/references/`](../init-project/references/) (API design, data and reliability, security, frontend and UX).
