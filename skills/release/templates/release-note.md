# Release v{{VERSION}} — {{DATE}}

**Status:** {{healthy | rolled back | local only}}

## What changed for users

{{Two to five lines in user language, copied from the CHANGELOG section.}}

## Ready check

| Gate                   | Command                                        | Result |
| ---------------------- | ---------------------------------------------- | ------ |
| CI and e2e             | `make ci` / `make e2e`                         |        |
| Benchmark guard        | `make bench` vs baseline                       |        |
| Dependency audit       | `npm audit --omit=dev` / `pip-audit`           |        |
| Secret scan            | `gitleaks git .` / `gitleaks dir .`            |        |
| Migration compatibility| previous tag's smoke on the new schema         |        |

Accepted risks (with owner and expiry): {{none}}

## Deploy

Artefact {{ARTEFACT_ID}}, strategy {{STRATEGY}}, deploy log: {{LINK_OR_EXCERPT}}.
Local only: fresh-clone smoke {{result}}; `make bench` vX vs previous tag: {{diff}}.

## Verification

{{The filled verification plan, or a link to it.}}

## DORA

Lead time (oldest change): {{…}} · Rollback or hotfix needed: {{yes/no}} · Recovery time: {{…}}

## Findings → backlog

| Finding | Backlog item | Owner skill (`fix-bug`, `monitor`, `cache-optimize`, …) |
| ------- | ------------ | ------------------------------------------------------- |
|         |              |                                                         |
