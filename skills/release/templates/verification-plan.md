# Verification plan — v{{VERSION}}

Written before the deploy. Results are filled in at each checkpoint; do not change a threshold after
the deploy has started.

- **Artefact:** {{ARTEFACT_ID}} (image digest or bundle hash) — previous: {{PREVIOUS_ARTEFACT_ID}}
- **Target:** {{DEPLOY_TARGET}} · **Strategy:** {{flag | canary N % | blue/green | rolling}}
- **Deploy start (UTC):** {{DEPLOY_TIME}}
- **Baseline window:** {{BASELINE_WINDOW}} (and the same hour one week earlier for cyclic traffic)
- **Rollback owner:** {{who or what pulls it — e.g. "the agent running this release, pre-authorised"
  or "the canary analysis"}}
- **Rollback command:** `{{ROLLBACK_COMMAND}}` — last exercised: {{DATE}}

## Critical journeys (smoke at +5 min)

| Journey             | How it is checked                        | Result |
| ------------------- | ---------------------------------------- | ------ |
| {{e.g. sign in}}    | `verify-app` post-deploy on {{URL}}      |        |
| {{e.g. create order}} | one real request with a test account   |        |
| Health / readiness  | `curl -fsS {{URL}}/health` and `/ready`  |        |
| Version served      | `{{URL}}/version` = {{ARTEFACT_ID}}      |        |

## Metrics and thresholds

| Checkpoint | Metric                           | Baseline | Threshold (rollback trigger)                    | Result |
| ---------- | -------------------------------- | -------- | ----------------------------------------------- | ------ |
| +1 h       | Error ratio (5xx + failed jobs)  |          | > 2× baseline and > {{FLOOR}} % for 5 min       |        |
| +1 h       | p95 latency, {{critical path}}   |          | > {{BUDGET}} ms for 10 min                      |        |
| +1 h       | Saturation ({{pool / queue}})    |          | > {{LIMIT}}                                     |        |
| +1 h       | {{key business event}} per min   |          | < 80 % of baseline/control for 30 min           |        |
| +1 h       | Canary vs control (if canary)    | control  | canary worse on any ranked metric               |        |
| +24 h      | Field LCP / INP / CLS p75        |          | worse than "good" or > 10 % worse than baseline |        |
| +24 h      | Job backlog / oldest job age     |          | > {{LIMIT}}                                     |        |
| +24 h      | Cost per day                     |          | > {{PERCENT}} % over baseline                   |        |
| +24 h      | New error signatures             | 0        | any on a critical path                          |        |

## Decisions

| Time | Observation | Decision (continue / flag off / roll back) | By |
| ---- | ----------- | ------------------------------------------ | -- |
|      |             |                                            |    |
