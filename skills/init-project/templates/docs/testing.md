# Testing

## Layers

| Layer | Where | Run | Threshold |
| --- | --- | --- | --- |
| Domain (pure logic) | `backend/tests/unit` | `cd backend && uv run pytest tests/unit` | part of ≥ 90 % |
| API (FastAPI + fakes for ports) | `backend/tests/api` | `uv run pytest tests/api` | as above |
| Web unit/component | `web/src/**/*.test.ts(x)` | `cd web && npm test` | lines ≥ 80 % |
| Browser journeys | `web/e2e` (Playwright) | `make e2e` after a production build | smoke + the main journey per feature |
| Accessibility | `web/e2e/a11y.spec.ts` (axe-core) | `make e2e` | serious/critical = 0 |

`make ci` = lint + typecheck + test; identical to `.github/workflows/ci.yml`.

## Principles

- Test behaviour, one behaviour per test, Arrange–Act–Assert; names are sentences (`test_order_is_rejected_when_stock_is_zero`).
- Fakes for ports (DB, clock, external APIs) in `tests/fakes.py`; no network in tests; warnings are errors.
- Real fixtures from the repo (`content/`), never datasets or models.
- E2E runs against the production build, never the dev server.

## What the tests do not prove

- …
