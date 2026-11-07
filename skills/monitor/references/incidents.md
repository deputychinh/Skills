# Incidents, postmortems and the weekly health review

Notes are marked "Verified on 2026-11-07 against <URL>" or "(memory)".

## Contents

1. [Declaring an incident](#1-declaring-an-incident)
2. [Roles](#2-roles)
3. [Mitigate first](#3-mitigate-first)
4. [Communicating](#4-communicating)
5. [Resolving and handing over](#5-resolving-and-handing-over)
6. [Blameless postmortems](#6-blameless-postmortems)
7. [Weekly health review](#7-weekly-health-review)

## 1. Declaring an incident

Declare when any is true: a second team (or person) is needed to fix it; the outage is visible to
customers; the problem is unsolved after an hour of focused analysis. Declaring early is cheap;
declaring late means uncoordinated changes and no timeline. Verified on 2026-11-07 against
https://sre.google/sre-book/managing-incidents/

Open the live log `docs/incidents/YYYY-MM-DD-<slug>.md` (or a shared doc, linked from there):
most important facts at the top (impact, status, current mitigation, next update time), then a
timestamped timeline of observations and actions. It can be messy but must stay current; it becomes
the postmortem's raw material.

## 2. Roles

- Incident command: holds the overall state, assigns work, removes blockers; holds every role not
  delegated.
- Operations: the only people changing the system during the incident.
- Communication: periodic updates to stakeholders and users; may keep the live log.
- Planning: longer-term needs — filing bugs, handoffs, tracking temporary changes to revert.
  Verified on 2026-11-07 against https://sre.google/sre-book/managing-incidents/

Solo: you hold all four, so write down every change you make to the system in the timeline — it is
the only way to undo temporary fixes later.

## 3. Mitigate first

Priorities: stop the damage, restore service, preserve evidence for the root cause. Verified on
2026-11-07 against https://sre.google/sre-book/managing-incidents/

Mitigation menu, roughly cheapest and safest first:

| Mitigation                                              | When                                                    |
| ------------------------------------------------------- | ------------------------------------------------------- |
| Roll back the last deploy (`release`'s one command)     | anything started within a day of a deploy               |
| Turn a feature flag off                                 | the failing path is behind a flag                       |
| Scale out / up                                          | saturation: pool exhausted, CPU pinned, queue growing   |
| Shed or rate-limit load; block an abusive client        | traffic spike or abuse                                  |
| Fail over / disable a broken dependency with a fallback | a third party is down                                   |
| Restore data from backup                                | corruption or loss (`database` owns the tested restore) |

Before acting, save evidence that the action destroys (logs from the pod about to be replaced, a heap
dump, the failing request). Do not debug in production while users wait if a rollback is available.

## 4. Communicating

- First update within minutes of declaring: what users see, what is being done, when the next update
  comes. Then on every change of state and at least at the promised interval; final update when
  resolved, with a pointer to the follow-up. (memory)
- Use a status page or the channel users already read; plain words, no internal jargon; never
  speculate about cause in public before it is known.

## 5. Resolving and handing over

- Resolved = the SLO indicators and synthetic checks are healthy for at least one alert window, not
  "the graph looks better".
- Temporary measures (scaled-up capacity, disabled feature, manual data fix) are listed with an
  owner to revert or make permanent.
- Keep the live log; schedule the postmortem.

## 6. Blameless postmortems

Write one when there was user-visible downtime or degradation beyond a threshold, any data loss, an
on-call intervention (rollback, rerouting), resolution time beyond a threshold, or a monitoring
failure (found manually); anyone involved may also ask for one. Set the thresholds before incidents.

Blameless: look for contributing causes in systems and processes, assume everyone acted in good faith
on the information they had — people cannot be "fixed", systems and processes can.

Contents: the incident and its impact, mitigation and resolution actions, root cause(s), follow-up
actions to prevent recurrence. Review: was key data captured, is impact complete, did the analysis go
deep enough, are the actions right and prioritised. An unreviewed postmortem might as well not exist.
Verified on 2026-11-07 against https://sre.google/sre-book/postmortem-culture/

Practical rules for this suite:

- Use `templates/postmortem.md`; ask "why did detection take this long?" and "why did mitigation take
  this long?" as well as "why did it break?" — those answers are usually the cheapest fixes.
- Each action: owner, backlog item id, due date, and type (prevent, detect, mitigate). The root-cause
  fix goes to `fix-bug`; a missing alert or signal is fixed with this skill; a deploy-process gap
  goes to `release`; a lesson about how the work was done goes to `improve-skills`.
- Track actions to done in the weekly review; an open postmortem action older than its due date is a
  review item.

## 7. Weekly health review

A fixed half hour; write a dated section in `docs/operations.md`.

| Look at                                                                             | Turn into                                                  |
| ----------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Error budget left per SLO, burn trend, which release spent it                       | reliability slice when spent (per policy)                  |
| p95 latency, bundle size, query time, memory week over week vs `benchmark` baseline | `cache-optimize` or `database` item for creep > noise band |
| Top new and most frequent error signatures                                          | `fix-bug` items                                            |
| Alerts that fired: acted on? noisy? missing (incident found by a user)?             | fix, retune or delete the alert                            |
| Cost per day / per active user                                                      | item when growth outpaces usage                            |
| Queue backlog, job failures, certificate and domain expiry, dependency advisories   | ops items                                                  |
| Open postmortem actions past due                                                    | escalate or re-plan                                        |
| DORA trend (deploy frequency, change fail rate, recovery time)                      | process items for `release`                                |

"No action" is a valid outcome, but write it, so the review is visibly done. DORA metric definitions:
Verified on 2026-11-07 against https://dora.dev/guides/dora-metrics/
