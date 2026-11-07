# Observability setup — logs, metrics, traces, errors, synthetics, dashboards

Notes are marked "Verified on 2026-11-07 against <URL>" or "(memory)".

## Contents

1. [Signals and what each is for](#1-signals-and-what-each-is-for)
2. [Structured logs with request ids](#2-structured-logs-with-request-ids)
3. [Metrics: RED, USE, business events](#3-metrics-red-use-business-events)
4. [Traces with OpenTelemetry — Node](#4-traces-with-opentelemetry--node)
5. [Traces with OpenTelemetry — Python](#5-traces-with-opentelemetry--python)
6. [Error tracking](#6-error-tracking)
7. [Synthetic checks](#7-synthetic-checks)
8. [Dashboards](#8-dashboards)
9. [Cheap defaults for a solo project](#9-cheap-defaults-for-a-solo-project)

## 1. Signals and what each is for

- Four golden signals: latency (successful and failed requests tracked separately — a fast error is
  not good latency), traffic, errors (explicit, implicit such as a 200 with wrong content, or by
  policy such as "slower than 1 s"), saturation (how full the service is; latency often rises first).
- Page on symptoms (what is broken: failing or slow responses); use causes (why: CPU, refused
  database connections) for debugging. Black-box monitoring sees what users see and suits paging;
  white-box monitoring (logs, metrics) shows imminent problems and those hidden by retries.
  Verified on 2026-11-07 against https://sre.google/sre-book/monitoring-distributed-systems/

## 2. Structured logs with request ids

- One JSON object per line; fixed keys: `timestamp` (UTC ISO 8601), `level`, `message`, `service`,
  `version`, `env`, `request_id`, `trace_id`, `span_id`, `route`, `status`, `duration_ms`, `user_id`
  (an opaque id, not an email). (memory)
- Request id: accept an incoming `X-Request-Id` (or W3C `traceparent`) from a trusted proxy, else
  generate one; put it in every log line of that request, in the response header, and in the error
  message the user sees ("Something went wrong — reference abc123"). A user report then leads straight
  to the logs.
- Never log secrets, tokens, passwords, full card numbers or whole request bodies; redact by key
  allow-list rather than deny-list, because new fields appear without anyone updating the deny-list.
- Node: pino (`pino-http` adds request logging and ids). Python: structlog, or `logging` with a JSON
  formatter; bind `request_id` in a middleware with `contextvars`. (memory)
- Levels: `error` = a person should look; `warn` = degraded but handled; `info` = business events and
  request summaries; `debug` off in production.

## 3. Metrics: RED, USE, business events

- RED per request-driven service: Rate (requests per second), Errors (failed requests), Duration
  (latency). USE per resource: Utilisation, Saturation, Errors. RED shows what users feel; USE shows
  the machines underneath; use both. Verified on 2026-11-07 against
  https://grafana.com/blog/2018/08/02/the-red-method-how-to-instrument-your-services/ and
  https://www.brendangregg.com/usemethod.html
- Duration is a histogram (`http_server_request_duration_seconds` in OpenTelemetry semantic
  conventions), so percentiles can be computed over any window; averages hide the tail. (memory)
- Label cardinality: route template (`/orders/:id`), method, status class — never raw URLs, user ids
  or request ids as labels; each distinct value is a new time series and a new bill.
- Business events: counters such as `orders_created_total`, `notes_saved_total`. A drop to zero with
  no errors is a bug the error rate never sees (a button that does nothing, a broken form).
- Jobs and queues: depth, age of the oldest job, processing duration, failures, retries.

## 4. Traces with OpenTelemetry — Node

```shell
npm install @opentelemetry/sdk-node @opentelemetry/api \
  @opentelemetry/auto-instrumentations-node @opentelemetry/sdk-metrics \
  @opentelemetry/exporter-trace-otlp-http
```

```js
// instrumentation.mjs — loaded before the app
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';

const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter(), // reads OTEL_EXPORTER_OTLP_ENDPOINT
  instrumentations: [getNodeAutoInstrumentations()],
});
sdk.start();
```

Run with `node --import ./instrumentation.mjs app.js` (or `npx tsx --import ./instrumentation.ts
app.ts`); remove any conflicting `--require …/register` in `NODE_OPTIONS`. ESM apps need the loader
hook described in the OpenTelemetry ESM support page. Verified on 2026-11-07 against
https://opentelemetry.io/docs/languages/js/getting-started/nodejs/ (the getting-started page uses
console exporters; the OTLP exporter and its environment variable are (memory)).

Set `OTEL_SERVICE_NAME` and `OTEL_RESOURCE_ATTRIBUTES=service.version=<version>,deployment.environment=<env>`
so traces line up with releases. (memory)

## 5. Traces with OpenTelemetry — Python

```shell
pip install opentelemetry-distro opentelemetry-exporter-otlp
opentelemetry-bootstrap -a install   # adds instrumentations for installed libraries (FastAPI, …)
OTEL_SERVICE_NAME=orders-api \
OTEL_TRACES_EXPORTER=otlp \
OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=http://collector:4317 \
opentelemetry-instrument uvicorn app.main:app
```

Verified on 2026-11-07 against https://opentelemetry.io/docs/zero-code/python/

- With uvicorn or gunicorn worker processes, check the zero-code docs' notes on pre-fork servers;
  instrumentation must start in each worker. (memory)
- Add manual spans only around work auto-instrumentation cannot see (a domain step, a call to an AI
  model with its token counts as attributes).

## 6. Error tracking

- One project per deployable (frontend, backend, worker), tagged with `release` (the version or
  artefact id) and `environment`. Release-aware tracking shows new issues and regressions per release,
  suspect commits, and crash-free sessions and users. Verified on 2026-11-07 against
  https://docs.sentry.io/product/releases/
- Upload frontend source maps at build time (and do not serve them publicly unless intended).
- Scrub personal data before send; set a sample rate for performance events, not for errors.
- Alert on: a new issue in production, a regression (resolved issue seen again), a spike. Assign
  each new issue within a day: fix (`fix-bug`), ignore with a reason, or merge as duplicate.
- Alternatives with the same model: GlitchTip (self-hosted, Sentry-compatible), Rollbar, Honeybadger,
  or OpenTelemetry exceptions in the tracing backend. (memory)

## 7. Synthetic checks

- Minimum: an HTTP uptime check of the health endpoint and the home page from two or more regions,
  every 1–5 minutes, alerting after two consecutive failures from two locations (one region's network
  blip is not an outage). (memory)
- Better: a Playwright script of the main journey (sign in with a test account, do the main action,
  check the result) run on a schedule in CI or a checks service, with its own test data that it
  cleans up. It also gives low-traffic services a steady stream of signal. Verified on 2026-11-07
  against https://sre.google/workbook/alerting-on-slos/ (synthetic traffic for low-traffic services)
- Check TLS certificate expiry and domain expiry too; they fail on a calendar date, not on a deploy.

## 8. Dashboards

- One dashboard per service; top row: SLO compliance and budget left, then the four golden signals;
  second row: RED per critical journey; then resources (USE), queues, dependencies.
- Annotate deploys (release markers) so step changes line up with a version.
- Split by version during canaries — whole-service aggregates hide a bad canary. Verified on
  2026-11-07 against https://sre.google/workbook/canarying-releases/
- Keep it readable on one screen; detail belongs in drill-down dashboards and traces.

## 9. Cheap defaults for a solo project

| Need               | Cheap default (memory)                                                               |
| ------------------ | ------------------------------------------------------------------------------------ |
| Errors             | a hosted error tracker's free tier, or GlitchTip self-hosted                         |
| Uptime / synthetic | a free uptime checker, or a scheduled CI job running the Playwright journey          |
| Logs               | the platform's log viewer with JSON logs; search by request id                       |
| Metrics and traces | the platform's built-in metrics; add OpenTelemetry to a hosted free tier when needed |
| Alerts             | email or a chat webhook; one person, no rota                                         |

The free tiers and limits change often — check the vendor's pricing page before recommending one.
