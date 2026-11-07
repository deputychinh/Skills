# Design references for init-project

Distilled from the books and standards below into checklists the skill applies in Phase 2b (design
review → ADR 0001 + architecture doc) and that every later session can cite. Each file ends with its sources.

| File                      | Use it when                                                                               |
| ------------------------- | ----------------------------------------------------------------------------------------- |
| `backend-architecture.md` | choosing layers, module boundaries, where logic lives, how errors flow                    |
| `api-design.md`           | designing any HTTP/JSON API or event contract                                             |
| `data-and-reliability.md` | choosing storage, transactions, idempotency, queues, caching, resilience                  |
| `security.md`             | every project; the checklist runs before the first deploy and on every auth/input change  |
| `frontend-and-ux.md`      | any screen: layout, navigation, accessibility, performance budgets, design tokens         |
| `delivery.md`             | repo process: trunk-based, CI, DORA four keys, docs, ADRs, changelog, versioning          |
| `mobile.md`               | native iOS or Android apps: `ios-swiftui` / `android-compose` presets, gates, CI, signing |
| `vite-monorepo.md`        | a repo with several deployables or a shared UI package: layout, scaffold, gotchas         |
| `reading-list.md`         | the canon, one line each, so a new ADR can cite the right source                          |
