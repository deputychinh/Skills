# {{PREFIX}}-{{N}} — {{SHORT_TITLE}}

**Type:** bug · **Source:** {{user report | CI | error tracker | postmortem | release check}} ·
**Severity:** {{blocks a journey | degraded | cosmetic}} · **Status:** {{todo | doing | done}}

## Report

- **Steps:** {{1. … 2. … 3. …}}
- **Expected:** {{what should happen}}
- **Actual:** {{what happens; exact error text}}
- **Unchanged:** {{what must keep working — becomes guard tests}}
- **Environment:** version/commit {{…}} · browser engine and version {{…}} · OS/device {{…}} ·
  window size {{…}} · locale/time zone {{…}} · account role {{…}} · data shape {{…}} · network {{…}}
- **Frequency / first seen:** {{always | n of m | since release vX}}
- **Links:** error-tracker issue {{…}} · request id / trace {{…}} · CI run {{…}}

## Reproduction

- **Environment used:** {{…}}
- **Minimal case:** {{the shrunk steps or input}}
- **Command and failing output:** {{…}}

## Cause

- **Hypotheses tried:** {{hypothesis → experiment → result}}
- **Cause:** {{the defect, file and line, and why it produced the failure}}
- **Evidence:** {{bisect first bad commit | trace | characterisation test}}

## Fix

- **Regression test:** {{name, level}} — failed before ({{output}}), passes after
- **Guard tests (unchanged behaviour):** {{…}}
- **Change:** {{what was changed, at the cause}}
- **Same bug elsewhere:** {{search used; hits fixed or filed as …}}

## Acceptance criteria

- AC1: Given {{…}}, when {{…}}, then {{expected}}.
- AC2: Given {{…}}, when {{…}}, then {{unchanged behaviour still holds}}.

## Verification and field confirmation

- `deliver-loop` review score: {{…}} · `verify-app` in {{reported environment}}: {{result}}
- After release v{{…}}: error signature {{gone over WINDOW | local only}} — query: {{…}}
