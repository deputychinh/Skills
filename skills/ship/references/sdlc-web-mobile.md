# The seven SDLC stages for web and native mobile apps

How `ship` maps the classic seven-stage software development life cycle onto its own stages, and what
each stage means for a web app and for native iOS and Android apps that share one backend API. Use it
to decide what a stage still owes before its gate, per platform in scope.

## Contents

1. [Stage map](#stage-map)
2. [Platform parity rules](#platform-parity-rules)
3. [S1 · Planning](#s1--planning)
4. [S2 · Requirement analysis](#s2--requirement-analysis)
5. [S3 · System design](#s3--system-design)
6. [S4 · Development](#s4--development)
7. [S5 · Testing](#s5--testing)
8. [S6 · Deployment and launch](#s6--deployment-and-launch)
9. [S7 · Maintenance](#s7--maintenance)
10. [Sources](#sources)

## Stage map

| SDLC stage               | `ship` stages               | Skills                                                                            | Leaves behind                                      |
| ------------------------ | --------------------------- | --------------------------------------------------------------------------------- | -------------------------------------------------- |
| S1 Planning              | triage, Discover            | `ship`, `discover`, `benchmark` A                                                 | `status.md`, `brief.md`, product-benchmark table   |
| S2 Requirement analysis  | Specify                     | `spec`, `benchmark` B                                                             | `spec.md`, `benchmarks/plan.md`                    |
| S3 System design         | Set up, Architect, Plan     | `init-project`, `architect`, `system-design`, `database`, `shape-plan`            | `design.md`, ADRs, OpenAPI, `plan.md`, backlog     |
| S4 Development           | Build (item loop)           | `deliver-loop`, `backend`, `frontend`, `css-design`, `ios`, `android`, `database` | reviewed commits, tests, story files               |
| S5 Testing               | Verify, Demo (slice loop)   | `verify-app`, `benchmark`, `cache-optimize`, `demo`                               | evidence per AC and platform, benchmark diff, page |
| S6 Deployment and launch | Release, post-deploy verify | `release`, `verify-app` (post-deploy mode)                                        | tag, changelog, release note, store track status   |
| S7 Maintenance           | Operate, Maintain, Learn    | `monitor`, `fix-bug`, `cache-optimize`, `deliver-loop`, `improve-skills`          | SLOs, alerts, incident notes, backlog items        |

Testing is not only S5: unit and integration tests are written test-first in S4, and S5
proves the slice end to end on every platform. Maintenance feeds the backlog, which re-enters S1
(re-prioritise) or S4 (a regression fix), so the seven stages form a cycle, not a line.

## Platform parity rules

- Fix the platforms in scope at triage (`mobile` profile key) and write them into `status.md`.
- Tag every acceptance criterion with the platforms it applies to: `[web]`, `[ios]`, `[android]` or
  `[all]`. `spec` rejects an untagged AC, so no platform silently skips a criterion.
- A gate is met only when it holds on every platform in scope; record evidence per platform. One
  platform lagging is a recorded scope cut with a reason, never a quiet omission.
- Design the API contract once, before any client. A shipped mobile binary cannot be updated on
  demand, so the API stays backward compatible for the oldest supported app version and every client
  ignores unknown fields.
- Same feature, native idiom: web follows the design tokens, iOS the Human Interface Guidelines,
  Android Material 3. Behaviour and copy match; layout and navigation follow each platform.

## S1 · Planning

Goal: decide whether to build, for whom, how big, on which platforms.

- **All**: "Where am I?", triage path, appetite, owner-only questions asked once (≤ 4), ledger opened.
  `discover` writes the brief, the riskiest hypothesis and how it will be measured, or kills the idea.
- **Web**: who opens it where — desktop or phone browser, logged in or public, SEO needed or not.
- **Mobile**: why a native app beats a mobile web page (offline, push, camera, sensors, store
  presence); which stores; developer accounts and their cost are owner-only questions.
- **Gate**: a credible press release with sourced numbers; platforms and appetite in `status.md`.

## S2 · Requirement analysis

Goal: define "done" so that it can be checked.

- **All**: story map, ACs in EARS or Given/When/Then with negative and boundary cases, non-goals,
  data and privacy rules, every quality word turned into a number with a workload.
- **Web**: supported browsers, Core Web Vitals at p75 (LCP, INP, CLS), WCAG 2.2 AA, breakpoints.
- **Mobile**: minimum OS versions, phone and tablet, cold start time, crash-free sessions and ANR
  targets, offline behaviour and sync conflicts, permissions with their rationale, push, deep links,
  store review guidelines, privacy labels (App Store) and Data safety (Play).
- **Gate**: no `[NEEDS CLARIFICATION]`; every AC has a platform tag; every target has a number.

## S3 · System design

Goal: settle the shape before code, then cut it into a plan.

- **First**: `init-project` for a new repo (web app plus `ios/` and `android/` per the profile), so
  the design is recorded in a green repo.
- **All**: `architect` — driving characteristics, bounded contexts, ADRs, threat model, fitness
  functions; `database` for the schema; `system-design` when scale needs estimates. The OpenAPI
  contract with RFC 9457 errors and auth flows is written once for every client. Small paths skip
  `architect` unless the change touches an ADR.
- **Web**: routing, rendering mode (SPA, SSR or static), caching layers, design tokens.
- **Mobile**: local store (SwiftData or Core Data, Room), sync and conflict policy, API versioning for
  old binaries, tokens in the Keychain or Android Keystore, push provider, screen map per platform
  idiom.
- **Then**: `shape-plan` — walking skeleton through every platform in scope first, benchmark harness
  second.
- **Gate**: every driving characteristic has a decision and a fitness check; the first slice fits the
  appetite and reaches every platform.

## S4 · Development

Goal: build backlog items one at a time, each reviewed before it lands.

- **All**: `deliver-loop` — story file with platform-tagged ACs, design note, failing test, code per
  tagged platform, checks, independent review scored out of 10, at most three improve rounds, commit
  at ≥ 9 or file as debt or `blocked`.
- **Web**: `backend`, `frontend` (Vue or React, four states per view), `css-design`.
- **iOS**: `ios` — SwiftUI, Swift concurrency, XCTest and UI tests, Dynamic Type and VoiceOver.
- **Android**: `android` — Compose, Material 3, ViewModel and StateFlow, unit and Compose UI tests,
  TalkBack.
- **Gate**: each item shipped per the review gate, with its tests, on every platform it is tagged for.

## S5 · Testing

Goal: prove the slice works as the user will use it, then show it.

- **All**: `verify-app` collects evidence for every AC and UI state; `benchmark` diff against the
  baseline; `cache-optimize` when a budget breaks; `demo` builds the results page; feedback re-plans.
- **Web**: README quick start in a fresh shell, a real browser, Playwright and axe, a phone viewport.
- **Mobile**: simulator and emulator, phone and tablet, light and dark, largest text size, offline and
  slow network, permission denied, app killed and restored; a physical mid-range device for timing.
- **Gate**: every AC has evidence on every platform in scope; no unexplained regression.

## S6 · Deployment and launch

Goal: put one verified build in users' hands with a way back.

- **All**: `release` ready check (CI, dependency audit, secret scan, migration compatibility), SemVer
  tag, changelog, verification plan written before the deploy. Deploy the API before the clients
  that need it.
- **Web**: one build promoted unchanged, smoke on the target, checkpoints at +5 min, +1 h and +24 h,
  numeric rollback triggers, one-command rollback.
- **Mobile**: build number bump, TestFlight then App Review; Play internal → closed → production
  track; phased or staged rollout gated on crash-free sessions and ANR rate. A store cannot roll back a
  binary: halt the rollout, switch the feature off with a remote flag, ship an expedited fix.
- **Verify**: `verify-app` post-deploy mode against the web URL; its Mobile mode again on the
  TestFlight or Play internal build before widening a rollout.
- **Gate**: smoke green on the target, both `verify-app` runs passed, findings in the backlog.

## S7 · Maintenance

Goal: keep it healthy, learn, and feed the next cycle.

- **All**: `monitor` — user-facing SLOs, symptom alerts fired once on purpose, runbook, incidents
  mitigated first; `fix-bug` with a regression test; upgrades and security patches through the
  Quick + audit path; debt and performance as backlog items; a retro and `improve-skills`.
- **Web**: availability, latency and error rate per endpoint, Core Web Vitals from real users.
- **Mobile**: crash-free sessions and ANR rate per version, adoption of the newest version, a forced
  update policy for versions the API can no longer serve, and the yearly OS and SDK cycle (new Xcode
  and minimum iOS, the Play target API level deadline) planned as upgrade items.
- **Gate**: every alert has an owner and a runbook; every finding is a backlog item; retro written.

## Sources

Stage names follow the common seven-stage SDLC model (planning, requirement analysis, system design,
development, testing, deployment, maintenance) (memory). Store details summarise the `ios`, `android`
and `release` references, which carry their own verified-source notes.
