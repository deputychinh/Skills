# Postmortem — {{TITLE}} ({{DATE}})

**Status:** {{draft | reviewed}} · **Severity:** {{SEV}} · **Authors:** {{NAMES_OR_ROLES}}

Blameless: this document describes systems and decisions, not people's faults. Everyone acted on the
information they had at the time.

## Summary

{{Two or three sentences: what broke, for whom, for how long, how it was fixed.}}

## Impact

- Users affected: {{number or share}} · Journeys: {{which}}
- Duration: detected {{TIME}} → mitigated {{TIME}} → resolved {{TIME}} (UTC)
- Error budget spent: {{percent of the window's budget}} · Data lost or corrupted: {{none / what}}
- Detected by: {{alert name | synthetic check | user report}} — if a user found it first, that is a
  monitoring failure and gets an action below.

## Timeline (UTC)

| Time | Event / action (who or what) |
| ---- | ---------------------------- |
|      |                              |

## Contributing causes

{{Root cause(s) and the conditions that let them reach users: the change, the missing test, the
missing alert, the slow rollback. Use "why?" until the answer is a system or process you can change.}}

## What went well / what was hard

- Went well: {{…}}
- Hard or slow: {{detection, diagnosis, mitigation, communication}}

## Actions

| Action | Type (prevent / detect / mitigate) | Owner | Backlog item | Due |
| ------ | ---------------------------------- | ----- | ------------ | --- |
|        |                                    |       |              |     |

Root-cause fixes go to `fix-bug`; missing signals to `monitor`; deploy-process gaps to `release`.

## Supporting evidence

{{Links to the live incident log, dashboards, traces, error-tracker issues, the deploy log.}}
