# SLOs, error budgets and burn-rate alerts

Notes are marked "Verified on 2026-11-07 against <URL>" or "(memory)".

## Contents

1. [SLIs and SLOs](#1-slis-and-slos)
2. [Error-budget policy](#2-error-budget-policy)
3. [Burn-rate alerts](#3-burn-rate-alerts)
4. [Prometheus rules](#4-prometheus-rules)
5. [Low-traffic services](#5-low-traffic-services)
6. [Runbook lines](#6-runbook-lines)

## 1. SLIs and SLOs

- An SLI is best expressed as good events / valid events, so it runs from 0 % to 100 %. Start with a
  relevant metric that is cheap to collect (existing load-balancer or server logs) and refine later.
- Pick a few SLI types (five or fewer) covering the most critical functionality — usually
  availability and latency; use more than one latency threshold to see the tail.
- 100 % is the wrong target: failures happen, and it would block all change. A first SLO can come
  from current performance rounded to a manageable number — but beware locking in a target that is
  too strict. Record each SLO's rationale, approver and review date.
  Verified on 2026-11-07 against https://sre.google/workbook/implementing-slos/
- Examples: "99.5 % of `POST /orders` return non-5xx over 28 days"; "95 % of note page loads complete
  under 500 ms, 99 % under 2 s"; "99 % of export jobs finish within 10 minutes of request".
- Measure where the user is when possible (load balancer, synthetic checks, RUM) rather than inside
  the app, which cannot see its own crash.

## 2. Error-budget policy

- Error budget = 100 % − SLO over the window (99.5 % over 28 days ≈ 3 h 22 min of full outage).
- A written policy, agreed by product, development and operations, says what happens when the budget
  is spent — e.g. reliability bugs first, only reliability work until back within SLO, a freeze on
  risky changes — and how disputes escalate. In a small organisation the CTO or the owner decides.
  If nobody will enforce it, the SLO is not finished. Verified on 2026-11-07 against
  https://sre.google/workbook/implementing-slos/
- For a solo project, the policy can be one line: "budget spent → the next slice is reliability".

## 3. Burn-rate alerts

Burn rate = how fast the budget is being spent relative to the SLO window (1 = exactly spends it by
the end of the window). Recommended multi-window, multi-burn-rate parameters for a 99.9 % SLO:

| Severity | Long window | Short window | Burn rate | Budget consumed |
| -------- | ----------- | ------------ | --------- | --------------- |
| Page     | 1 h         | 5 min        | 14.4      | 2 %             |
| Page     | 6 h         | 30 min       | 6         | 5 %             |
| Ticket   | 3 days      | 6 h          | 1         | 10 %            |

The short window is 1/12 of the long one; it confirms the problem is still happening, so the alert
stops soon after recovery. Verified on 2026-11-07 against https://sre.google/workbook/alerting-on-slos/

Why: a single threshold either pages on every blip or misses slow burns; long windows alone keep
firing long after recovery.

## 4. Prometheus rules

Recording rule for the error ratio, then the alert (99.9 % SLO → budget 0.001):

```yaml
groups:
  - name: orders-slo
    rules:
      - record: job:slo_errors_per_request:ratio_rate1h
        expr: |
          sum(rate(http_requests_total{job="orders",code=~"5.."}[1h]))
            / sum(rate(http_requests_total{job="orders"}[1h]))
      # …same for 5m, 30m, 6h, 3d
      - alert: OrdersErrorBudgetFastBurn
        expr: |
          job:slo_errors_per_request:ratio_rate1h{job="orders"} > (14.4 * 0.001)
          and
          job:slo_errors_per_request:ratio_rate5m{job="orders"} > (14.4 * 0.001)
        labels:
          severity: page
        annotations:
          summary: 'Orders API is burning its error budget 14x too fast'
          runbook_url: 'https://example.com/docs/operations#orders-fast-burn'
```

Alerting rules take `expr`, optional `for` (pending duration), `keep_firing_for`, `labels` and
`annotations` (descriptions or runbook links). Verified on 2026-11-07 against
https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
Grafana-managed alerts, Datadog and hosted SLO features express the same idea; tools such as Sloth or
Pyrra generate these rules from an SLO spec. (memory)

## 5. Low-traffic services

With few requests one failure gives a huge error ratio and noisy pages. Options: synthetic traffic
(may miss real-user-only failures), grouping services that share a failure domain, making single
failures matter less (client retries with backoff and jitter, fallbacks), or lowering the SLO /
lengthening the window — a product decision. Verified on 2026-11-07 against
https://sre.google/workbook/alerting-on-slos/

Practical solo default: page on the synthetic check (two consecutive failures from two locations) and
on new error-tracker issues; review the SLO weekly instead of paging on its burn rate.

## 6. Runbook lines

Every alert gets one line in `docs/operations.md`:

`<alert name> — means: <user impact>. First look: <dashboard / query / log search>. Mitigate:
<rollback command / flag / scale>. Escalate: <who>.`

A page that has no runbook line, or whose line says "investigate", is not ready. Pages should be
urgent, actionable and tied to user impact, and need human judgement; anything else is noise.
Verified on 2026-11-07 against https://sre.google/sre-book/monitoring-distributed-systems/
