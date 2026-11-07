# Operations — {{SERVICE_NAME}}

Owner: {{OWNER}} · Environments: {{ENVIRONMENTS}} · Dashboards: {{LINKS}} · Error tracker: {{LINK}}

## Critical journeys

| Journey | Synthetic check (where, how often) | SLO |
| ------- | ---------------------------------- | --- |
| {{e.g. sign in}} | {{Playwright script, every 5 min, 2 regions}} | {{SLO-1}} |

## SLOs (window: {{28 or 30}} days)

| Id    | SLI (good / valid events)                        | Target | Measured at        | Rationale, approver, review date |
| ----- | ------------------------------------------------ | ------ | ------------------ | -------------------------------- |
| SLO-1 | {{non-5xx responses / all responses, POST /orders}} | {{99.5 %}} | {{load balancer}} |                                  |
| SLO-M1 | {{mobile apps only: crash-free sessions, iOS and Android, per production version}} | {{99.5 %}} | {{Crashlytics or Sentry}} |  |

**Error-budget policy:** {{When a budget is spent: reliability work first, risky deploys frozen until
back within SLO. Decided by: OWNER. Disputes go to: …}}

## Alerts and runbook

`<alert> — means: <user impact>. First look: <dashboard/query>. Mitigate: <command>. Escalate: <who>.`

- {{ServiceErrorBudgetFastBurn}} — means: {{…}}. First look: {{…}}. Mitigate: {{rollback command}}.
  Escalate: {{…}}.
- {{SyntheticJourneyFailing}} — means: {{…}}. First look: {{…}}. Mitigate: {{…}}. Escalate: {{…}}.

Last test alert received: {{DATE, channel}}

## Incidents

| Date | Title | Postmortem | Open actions |
| ---- | ----- | ---------- | ------------ |

## Health reviews

### {{YYYY-MM-DD}}

- Error budget left: {{SLO-1: x %}} · trend: {{…}}
- Creep vs baseline: {{p95, bundle, query, memory}}
- Mobile (per app and version): {{crash-free sessions, ANR rate, cold start p90, vitals warnings}}
- New / top error signatures: {{…}}
- Alerts: fired {{n}}, actionable {{n}}, noisy {{…}}, missed {{…}}
- Cost: {{per day / per active user}} · Expiries: {{cert, domain}} · Advisories: {{…}}
- DORA: {{deploy frequency, change fail rate, recovery time}}
- Backlog items created: {{ids or "no action"}}
