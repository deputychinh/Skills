# Post-deploy verification — baselines, checkpoints, canaries, rollback

Notes are marked "Verified on 2026-11-07 against <URL>" or "(memory)".

## Contents

1. [Why a plan before the deploy](#1-why-a-plan-before-the-deploy)
2. [Baselines](#2-baselines)
3. [Checkpoint +5 min: smoke](#3-checkpoint-5-min-smoke)
4. [Checkpoint +1 h: compare](#4-checkpoint-1-h-compare)
5. [Checkpoint +24 h: slow signals](#5-checkpoint-24-h-slow-signals)
6. [Canary analysis](#6-canary-analysis)
7. [Rollback mechanics](#7-rollback-mechanics)
8. [Small and low-traffic services](#8-small-and-low-traffic-services)

## 1. Why a plan before the deploy

Thresholds chosen after the numbers move are rationalisations. Writing metrics, thresholds and the
rollback owner first turns a judgement call under stress into a lookup. Pre-authorising rollback also
fits incident practice: stop the damage and restore service before root-causing. Verified on
2026-11-07 against https://sre.google/sre-book/managing-incidents/

## 2. Baselines

- Window: the same length as the comparison window, taken before the deploy; for cyclic traffic, the
  same weekday and hour a week earlier as a second reference.
- Copy the numbers into the plan (not just a dashboard link) — dashboards change and retention ends.
- Metrics, per critical path where possible: request rate, error ratio (5xx and failed jobs over
  valid events; exclude client errors such as 404 on bad URLs), p50/p95/p99 latency, saturation (CPU,
  memory, connection-pool use, queue depth and age), key business events per minute.
- `benchmark` owns lab baselines (`make bench`); production baselines come from the metrics backend.

## 3. Checkpoint +5 min: smoke

- `verify-app` in post-deploy mode against the deployed URL: the README journey in a real browser,
  console and network watched — a CORS or CSP error only shows in a browser, because curl sends no
  preflight and enforces no policy.
- `curl -fsS https://<host>/health` and `/ready`; confirm a version endpoint or header returns the
  new artefact id, so you know you are testing the new build and not a cached old one.
- One real request per critical path, including one write and, if the app has them, one background
  job run end to end. Use a test account or a reversible action.
- Error tracker filtered to the new release: zero new issues on critical paths.

## 4. Checkpoint +1 h: compare

Example PromQL (adapt names to the service):

```promql
# error ratio, last 5 minutes
sum(rate(http_requests_total{job="orders",code=~"5.."}[5m]))
  / sum(rate(http_requests_total{job="orders"}[5m]))

# p95 latency
histogram_quantile(0.95, sum by (le) (rate(http_request_duration_seconds_bucket{job="orders"}[5m])))

# the same hour a week ago
sum(rate(http_requests_total{job="orders",code=~"5.."}[1h] offset 1w))
```

Read the comparison as a ratio and an absolute difference. A doubling from 0.01 % to 0.02 % may be
noise; a doubling from 1 % to 2 % is a page. Absolute SLOs still apply even if the comparison looks
fine. (memory)

## 5. Checkpoint +24 h: slow signals

- Field Core Web Vitals at the 75th percentile, mobile and desktop separately: LCP ≤ 2.5 s, INP ≤
  200 ms, CLS ≤ 0.1 are "good". Verified on 2026-11-07 against https://web.dev/articles/vitals
  Field data comes from real-user monitoring (the `web-vitals` library or the RUM tool); lab
  Lighthouse runs cannot measure INP. (memory)
- Job backlogs: queue depth and the age of the oldest job; scheduled jobs ran on time.
- Cost: compute, database, third-party API and AI-model spend per day versus the baseline day.
- New error signatures: issues first seen in this release. Error trackers that know the release show
  new issues and regressions per release, and crash-free sessions and users. Verified on 2026-11-07
  against https://docs.sentry.io/product/releases/ Without one, group log lines by exception type and
  message template and diff against the previous day.

## 6. Canary analysis

- Run canary and control at the same time and compare them, not before/after: time-based effects
  (weekday, hour) otherwise look like release effects. Break dashboards down by population — a 20 %
  canary error rate can show as about 1 % service-wide. Prefer a small, ranked set of user-facing
  metrics; avoid noisy ones like CPU; make the canary long enough to span a full unit of work; run one
  canary at a time. Verified on 2026-11-07 against https://sre.google/workbook/canarying-releases/
- Automated analysis (Argo Rollouts): an AnalysisTemplate takes a measurement every `interval`,
  `count` times; each is judged by `successCondition`/`failureCondition`; more than `failureLimit`
  failures fails the run, which aborts the rollout and returns canary weight to zero. Results that
  match neither condition are inconclusive and pause the rollout for a human. Verified on 2026-11-07
  against https://argo-rollouts.readthedocs.io/en/stable/features/analysis/
- Kayenta (Spinnaker) scores canary against control with a statistical test per metric and an overall
  score with pass and marginal thresholds. (memory)

## 7. Rollback mechanics

| Platform              | One command (examples)                                                      |
| --------------------- | --------------------------------------------------------------------------- |
| Kubernetes Deployment | `kubectl rollout undo deployment/<name>` (or set the previous image digest) |
| Argo Rollouts         | `kubectl argo rollouts abort <name>` during a canary; `undo` after          |
| Container on a VM     | `docker compose up -d` with the previous digest pinned in the env file      |
| PaaS / static host    | the provider's "promote previous deployment" CLI or API call                |
| Feature flag          | set the flag off; confirm with one request that the old path serves         |

All (memory) — confirm the exact command for the platform in use and paste it into the plan. After any
rollback: smoke again, open an incident (`monitor`), file the cause for `fix-bug`.

## 8. Small and low-traffic services

- Low traffic makes ratios jumpy: one failure in ten requests is a 10 % error rate. Add synthetic
  probes for signal, use longer windows, or put an absolute floor in the trigger. Verified on
  2026-11-07 against https://sre.google/workbook/alerting-on-slos/
- A solo project needs only: smoke at +5 min, the error tracker at +1 h and +24 h, one uptime check,
  and the previous deployment one click or command away.
