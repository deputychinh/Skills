# 10-point delivery rubric

Each criterion scores 0, 0.5 or 1. Evidence is mandatory: a file:line, a command and its output, or a screenshot path.
Mapped to ISO/IEC 25010:2023 product quality where it applies.

| #   | Criterion (ISO 25010)                        | 1 point                                                                                                                                                          | 0.5                           | 0                                  |
| --- | -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- | ---------------------------------- |
| 1   | Requirements fit (functional suitability)    | every AC met and traced to a passing test; nothing out of scope added                                                                                            | one AC partly met or untraced | an AC unmet                        |
| 2   | Test depth                                   | unit + integration/API + e2e where the story touches UI; boundary, equivalence and error cases; coverage ≥ thresholds; tests fail without the code               | gaps in negative/edge cases   | missing a layer or below threshold |
| 3   | Reliability                                  | errors surfaced with stable codes, no swallowed exceptions, timeouts/retries bounded, idempotent where retried, transactions correct                             | one weak spot                 | a silent failure or data-loss path |
| 4   | Security                                     | relevant OWASP Top 10:2025 / ASVS L1 items handled (authz per object, input validation, limits, no secrets/PII in logs), threat model updated if surface changed | a minor hardening gap         | an exploitable gap                 |
| 5   | Maintainability                              | conventions followed, lint 0, layering intact, small cohesive units, no duplication, names say intent                                                            | some smell                    | layering broken or copy-paste      |
| 6   | Interaction capability (UX) / API ergonomics | Nielsen heuristics, four states, clear copy in locales, adaptive layout per size class; for APIs: Zalando rules, consistent resources and errors                 | a rough state or unclear copy | a dead end or confusing flow       |
| 7   | Accessibility                                | axe serious/critical = 0, keyboard-only pass, focus visible and unobscured, targets ≥ 24 px, names/roles correct                                                 | a minor issue                 | an AA failure                      |
| 8   | Performance efficiency                       | within CWV budgets; bounded queries with indexes, no N+1; lazy-load heavy parts; no needless re-renders                                                          | a likely hotspot              | a budget clearly blown             |
| 9   | Docs and traceability                        | story file complete (AC→test table, score), CHANGELOG, backlog status, ADR/architecture if decisions changed, `Refs:` in commits                                 | one doc stale                 | docs missing                       |
| 10  | Delivery                                     | `make ci` + `make e2e` green, Conventional Commits, small batches, pushed, tree clean                                                                            | a messy commit                | red gate or unpushed               |

Ship gate: total ≥ 9.0, criterion 1 = 1, criterion 4 ≥ 0.5, no zeros.
