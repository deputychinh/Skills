# <NNN-slug> — status

Request (verbatim): "<what the user asked>"
Path: Full | Small new | Small | Bug | Incident | Performance | Quick + audit | Quick | Research — because <reason>
Appetite: <e.g. 2 days of agent work> · started <YYYY-MM-DD> · **Spent: <x> of <appetite>**
Platforms in scope: web | iOS | Android (every gate below needs evidence on each one)
Status: doing | blocked | done

**Next action:** <the one thing to do next, specific enough to resume cold>

Resume: re-invoke `ship`; "Where am I?" reads this file and does the Next action.

## Delivery profile used

- reply language: <value> (<from project CLAUDE.md | ~/.claude/CLAUDE.md | default>)
- frontend / backend: <value> (<source>)
- mobile: <web only | iOS | Android | iOS + Android>, <monorepo | separate repos> (<source>)
- autonomy: <value> (<source>)
- push policy: <value> (<source>)
- review gate: <value> (<source>)
- deploy target: <value> (<source>)

## Stages

| Stage | Status | Evidence / link |
| --- | --- | --- |
| Discover | todo | |
| Specify | todo | |
| Set up | todo / n.a. | |
| Architect | todo | |
| Plan | todo | |
| Build | todo | |
| Verify | todo | |
| Demo | todo | |
| Release | todo / n.a. | <tag, target or "local only", smoke result; store track and rollout % per app> |
| Operate | todo / n.a. | <SLOs, alerts; crash-free sessions and ANR rate per app> |
| Learn | todo | |

Statuses: todo → doing → done (or cut, or blocked). Never move back; reopen as a new row with a reason.
`blocked` = a gate failed 3 honest attempts or an owner-only answer is missing; write what fails below.

## Blocked (only when Status is blocked)

- Gate: <command> · Attempts: 3 · Output: <the failing lines> · Needed: <what would unblock it>

## Slices

| Slice | Items | Verified | Demo | Notified | Feedback → re-plan | Release |
| --- | --- | --- | --- | --- | --- | --- |
| 1 Skeleton | | | | | <feedback, or "no feedback"> | — |

## Progress log (one line per item or slice)

- <YYYY-MM-DD> <item or slice> — <shipped x/10 | debt | blocked> — <commit or link>

## Rulings (decisions taken without asking)

- <YYYY-MM-DD> <decision> — because <reason>; reversible by <how>.

## Questions for the owner (only what nobody else can answer)

- <question> — blocking <stage>? yes/no

## Cut scope and backlog findings

- <what> — because <appetite / risk / beyond appetite>; filed as <backlog id>.

## Retro (every path; two lines for Quick and Bug)

- Slowed us: …
- Caught late: …
- Change: … → <CLAUDE.md | skill via improve-skills | none>
