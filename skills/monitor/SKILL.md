---
name: monitor
description: Use when a service runs somewhere real and someone must know when it breaks — adding logs, metrics, traces, error tracking, uptime checks, dashboards, SLOs or alerts; when an alert fires or "the site is down"; for a postmortem; or for a weekly health review — even if the user only says "add monitoring". Produces structured logs with request ids, RED/USE metrics, OpenTelemetry traces (Node or Python), error tracking, synthetic checks, 1–3 SLOs with burn-rate alerts and runbook lines, an incident path (declare, mitigate first, communicate, blameless postmortem) and backlog items from trends. Cheap defaults fit a solo project. `ship` routes incidents here; `release` uses its signals; defects go to `fix-bug`.
---

# monitor — know before users tell you, mitigate first, learn every time

Monitoring exists to answer two questions fast: **is it broken for users?** (symptoms) and **why?**
(causes). Page on the first, debug with the second. Every signal you add must either feed an alert,
a dashboard someone reads, or a debugging path — otherwise it is cost.

Read the delivery profile (see the repo README) for `deploy target` and `autonomy`. Signing up for a
paid service or sending data to a new third party is an owner decision: ask once, and meanwhile use
the free or self-hosted default.

## Pick the size

| Situation            | Set up                                                                                                                                                               |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Solo or side project | error tracker (free tier), one synthetic check of the main journey every 1–5 min, structured logs, 1 SLO (availability of the main journey), alerts to email or chat |
| Small team product   | + RED metrics per endpoint, OpenTelemetry traces, 2–3 SLOs with burn-rate alerts, one dashboard per service, on-call rota                                            |
| Several services     | + USE metrics per resource, trace propagation across services and queues, error-budget policy signed by product                                                      |

Start small and add a signal when an incident or review shows it was missing.

## Workflow — set up observability

1. **Name the critical journeys** (2–5: sign in, the main write, the main read, the background job)
   and who uses them. SLOs, synthetic checks and dashboards all hang off this list.
2. **Structured logs.** JSON lines with `timestamp`, `level`, `message`, `service`, `version`,
   `request_id` / `trace_id`, and the route — never secrets or raw personal data. Generate or accept a
   request id at the edge, return it in a response header, and show it in user-facing error messages
   so a report can be traced. Node: pino; Python: structlog or the standard `logging` with a JSON
   formatter.
3. **Metrics.** RED per request-driven service (rate, errors, duration as a histogram) and USE per
   resource (utilisation, saturation, errors: CPU, memory, connection pool, queue depth and oldest-job
   age, disk). Plus 1–3 business events (orders placed, notes saved) — they catch bugs that return 200.
4. **Traces with OpenTelemetry.** Node: `@opentelemetry/sdk-node` with auto-instrumentations, loaded
   before the app with `node --import ./instrumentation.mjs`. Python: `opentelemetry-distro`,
   `opentelemetry-bootstrap -a install`, run under `opentelemetry-instrument`. Set `service.name` and
   `service.version`; export OTLP to the chosen backend. Put the trace id in every log line.
5. **Error tracking.** One project per app (frontend and backend), tagged with release and
   environment, source maps uploaded for the frontend, personal data scrubbed. New-issue and
   regression notifications on; this is the cheapest signal with the best payoff.
6. **Synthetic checks.** A scripted run of each critical journey from outside (uptime check for the
   minimum, a Playwright script for the main journey) every 1–5 minutes. Black-box checks see what
   users see, including DNS, TLS and CDN problems the app cannot log.
7. **Dashboards.** One per service, top row = the SLOs and the four golden signals (latency, traffic,
   errors, saturation), then per-journey RED, then resources. Release markers on every graph so a step
   change lines up with a deploy.
8. **SLOs and error budgets.** 1–3 SLOs from the journeys, each a ratio of good events to valid events
   over 28 or 30 days (e.g. 99.5 % of `POST /orders` succeed; 95 % of note loads under 500 ms). Write
   them in `docs/operations.md` from `templates/operations.md` with the error-budget policy: what
   happens when the budget is spent (reliability work first, risky deploys frozen) and who decides.
9. **Alerts on symptoms.** Page on SLO burn rate, multi-window: fast burn (14.4× over 1 h, confirmed
   over 5 min) and medium burn (6× over 6 h, confirmed over 30 min) page; slow burn (1× over 3 days,
   confirmed over 6 h) opens a ticket. Synthetic-check failure from two locations pages. Cause metrics
   (CPU, disk) only page when they predict an outage within hours (disk full). Every alert has a
   runbook line in `docs/operations.md`: what it means, first command to run, how to mitigate.
10. **Prove it.** Fire a test alert end to end (break the synthetic check's target in staging, or use
    the alert manager's test notification) and confirm someone receives it. _Evidence:_ the
    notification and the dashboard screenshot.

## Workflow — incident path

When an alert fires or a user reports breakage, follow `references/incidents.md`. In short:

1. **Detect** — note the time and the signal; check the dashboard and the error tracker for scope.
2. **Declare** when users are affected, a second person or team is needed, or an hour of focused work
   has not solved it. Open `docs/incidents/YYYY-MM-DD-<slug>.md` as the live log with a timeline.
3. **Mitigate first.** Stop the bleeding before finding the root cause: roll back the last deploy
   (`release` has the one command), turn the flag off, scale up, fail over, block the abusive client.
   If a deploy happened in the last day, rolling back is the default first move.
4. **Communicate** — a status update for affected users at the start, on every change, and at the
   end: what is affected, what is being done, when the next update comes.
5. **Resolve** — the symptom is gone in the SLO and synthetic checks for a full alert window; keep
   the evidence (logs, traces, the bad request) for the cause.
6. **Blameless postmortem** within a few days from `templates/postmortem.md` when users were affected,
   data was lost, a rollback or manual intervention was needed, or detection was manual. Focus on
   contributing causes in systems and processes, not people. Each action has an owner and becomes a
   backlog item; the root-cause fix goes to `fix-bug`; the missing alert or signal is fixed here.

## Workflow — weekly health review

Thirty minutes, written to `docs/operations.md` under a dated heading:

- Error budget remaining per SLO and the burn trend; which releases spent it.
- Slow creep: p95 latency, bundle size, query time and memory per week against the `benchmark`
  baseline — creep is a regression that never trips an alert.
- Top new and most frequent error signatures; noisy or never-acted-on alerts (delete or fix them).
- Cost per day and per user; queue backlogs; certificate and domain expiry; dependency advisories.
- DORA trend: deployment frequency, change fail rate, recovery time.

Every trend that needs work becomes a backlog item with the owning skill (`fix-bug`,
`cache-optimize`, `database`, `benchmark`). When budget is exhausted, the policy decides what the next
slice is — not the feature roadmap.

## Core checklist

1. Critical journeys listed; each has a synthetic check and appears in an SLO.
2. Logs are structured, carry request and trace ids, and contain no secrets.
3. RED per service, USE per resource, and at least one business event metric exist.
4. Errors reach a tracker tagged with release and environment.
5. Alerts page on symptoms via burn rate; each has a runbook line; a test alert was received.
6. An incident has a live log, was mitigated before it was root-caused, and has a postmortem with
   owned actions in the backlog.
7. The weekly review produced backlog items or explicitly "no action".

## Anti-patterns

- Paging on CPU or memory while users are fine; not paging while users fail and CPU looks normal.
- An alert nobody can act on, or that fires daily and is ignored — delete or fix it.
- A 100 % SLO: it forbids every change and is never true.
- Debugging the root cause during an outage while a rollback would have restored service.
- Postmortems that name a person, or whose actions never reach the backlog.
- Logging whole request bodies (personal data, tokens).
- Dashboards with forty graphs and no SLO on top.

## Evidence before "done"

`docs/operations.md` with journeys, SLOs, error-budget policy, alerts and runbook lines; a screenshot
of the dashboard; a received test alert; the synthetic check passing; for an incident, the incident
log and postmortem with backlog item ids.

## References

- `references/observability-setup.md` — logs, metrics, OpenTelemetry for Node and Python, error
  tracking, synthetic checks, dashboards, with code and sources.
- `references/slo-and-alerts.md` — SLIs, SLO choice, error-budget policy, burn-rate maths and
  Prometheus rules, low-traffic services.
- `references/incidents.md` — roles, declaring, mitigations, communication, postmortems, weekly review.
- `templates/operations.md` — journeys, SLOs, alerts with runbook lines, health-review log.
- `templates/postmortem.md` — blameless postmortem.
