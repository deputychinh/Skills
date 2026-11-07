# 002-order-export — status

Request (verbatim): "Let me export my orders as CSV."
Path: Small — because one clear feature in an existing repo
Appetite: 1 day of agent work · started 2026-11-02 · **Spent: 0.5 of 1 day**
Status: doing

**Next action:** write the failing test for AC3 of ORD-41 (export of an empty date range returns a CSV with only the header row).

Resume: re-invoke `ship`; "Where am I?" reads this file and does the Next action.

## Delivery profile used

- reply language: English (default)
- push policy: commit locally (default)

## Stages

| Stage   | Status | Evidence / link          |
| ------- | ------ | ------------------------ |
| Specify | done   | spec.md                  |
| Plan    | done   | backlog ORD-41, ORD-42   |
| Build   | doing  | ORD-41 AC1–AC2 committed |
| Verify  | todo   |                          |
| Demo    | todo   |                          |
| Learn   | todo   |                          |

## Progress log (one line per item or slice)

- 2026-11-02 ORD-41 AC1–AC2 tests and code committed

## Rulings (decisions taken without asking)

- 2026-11-02 CSV uses comma separators and UTF-8 with a header row — because spreadsheet apps open it directly; reversible by a format option.
- 2026-11-02 Dates in the export are ISO 8601 — because they sort as text.

## Questions for the owner (only what nobody else can answer)

- none

## Retro (every path; two lines for Quick and Bug)

- (not yet)
