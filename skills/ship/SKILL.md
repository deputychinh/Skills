---
name: ship
description: The single entry point for the whole software lifecycle — build new, release, verify after deploy, monitor, maintain — for web and native mobile apps, in a new or existing repo. Use whenever the user asks to build, make, add, change, fix, speed up or look after software, even when the request names a specialist area: "build me an app", "iOS app", "Android app", "mobile app", "App Store", "Play Store", "add a feature", "it's broken", "X does nothing", "error rate went up after the deploy", "incident", "it's slow", "upgrade dependencies", "security patch", "compare A and B", "deploy", "release", "/ship", or to resume a delivery with `docs/delivery/*/status.md`. Triages the request, keeps a ledger, calls the other skills itself (discover, spec, benchmark, architect, shape-plan, deliver-loop, ios, android, verify-app, demo, release, monitor, fix-bug, and more) and finishes with evidence the user can open. Prefer it over any specialist skill for a whole request; specialists are for one step inside it.
---

# ship — one entry point for the whole lifecycle

`ship` is the one skill the user needs to invoke. It runs the seven stages of the software development
life cycle — **S1 Planning → S2 Requirement analysis → S3 System design → S4 Development →
S5 Testing → S6 Deployment and launch → S7 Maintenance → back to S1** — for a web app, native mobile
apps, or both, and calls the other 21 skills itself; the user never has to name them. A product with mobile apps keeps
**one native codebase per store** (`ios` in Swift/SwiftUI, `android` in Kotlin/Jetpack Compose), each
talking to the same backend API as the web app. You are the **controller**: pick the path, keep the
ledger, run the stage skills, check their evidence, finish with something the user can open. You do
not grade your own work and you do not ask "should I continue?".

## Lifecycle at a glance

The seven SDLC stages are numbered **S1–S7** here; the eleven `ship` stages in the Stages table below
keep their own numbers 1–11, and its SDLC column maps one to the other.
`references/sdlc-web-mobile.md` holds the canonical map: per SDLC stage, the skills, what it owes on web, iOS and Android, and its
gate. Read the section for the stage you are entering before you run its skill. Maintenance (S7)
feeds the backlog, which re-enters planning (S1) to re-prioritise or development (S4) for a
regression fix.

## Where am I? (every invocation)

Before anything else, decide which stage and loop you are in. Read the newest
`docs/delivery/*/status.md` whose status is not `done`: its **Next action** is what you do now. With no
open ledger, read the repo state — `docs/backlog.md` items in `doing`, a failing CI run, an open
release note, a `blocked` item — and only then treat the message as a new request for triage. This is
what lets a fresh session or a compacted context pick up exactly where the last one stopped.

## Core rules

1. **Ledger first.** State lives in `docs/delivery/<NNN-slug>/status.md` (copy `templates/status.md`),
   not in memory. Update it at every stage change, including **Next action**, the **Progress log**
   (one line per item or slice) and **Spent: x of appetite**. Statuses never go backwards.
2. **Ask only what nobody else can answer** — secrets and API keys, paid accounts, hosting, business or
   legal rules, irreversible or outward-facing actions. Look for the answer yourself first (environment
   variables, `.env`, the OS keychain, the repo). Ask once, at triage, with all such questions together
   (≤ 4) and only when an answer blocks the next stage; otherwise write the question in `status.md`,
   take a safe default (a fake adapter for a missing key), mention it and keep going. Everything else:
   decide, write it under "Rulings" with the reason, move on.
3. **No claim without fresh evidence**: a command run now, its output read, a screenshot looked at.
4. **Working software over paperwork**: artefacts as short as the work allows; a walking skeleton runs
   from the README before any feature work.
5. **Appetite is fixed, scope varies**: when the appetite is spent, cut scope and record what and why;
   never extend silently. Release findings beyond the appetite go to the backlog; they do not start a
   new slice on their own.
6. **Stop conditions**: a gate that cannot go green after 3 honest attempts → status `blocked`, stop,
   report exactly what fails (command and output). An answer only the owner can give that blocks every
   path → `blocked` too. Nothing else stops the loop.
7. **Notify once per slice**: one short message per finished slice (what changed, where to see it,
   what is next) — and a push notification when the environment offers one. No feedback from the user
   by the next slice → take the next slice and record "no feedback" in the slice row.
8. **Platform parity**: the platforms fixed at triage are the scope of every gate. Each AC carries a
   platform tag (`[web]`, `[ios]`, `[android]` or `[all]`), set by `spec`; a gate passes only with
   evidence on every platform in scope, and a lagging platform is a recorded scope cut, never a silent
   gap. The API contract comes before any client and stays compatible with the oldest supported app
   build, because a shipped binary cannot be recalled.
9. Reply in the language from the delivery profile; repo files, code and commits in English unless the
   repo says otherwise.

## Delivery profile

Read a `## Delivery profile` section from the project's `CLAUDE.md`, else from `~/.claude/CLAUDE.md`
(the delivery profile, see the repo README). Use the default for any key that is absent:

| Key              | Default when absent                                                                                                                                        |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| reply language   | the language the user writes in                                                                                                                            |
| frontend default | the repo's existing framework; new project: ask once at triage (Vue or React both supported)                                                               |
| backend default  | the repo's existing stack; new project: ask once at triage (Node/TypeScript or Python both supported)                                                      |
| autonomy         | decide-and-record: ask only what nobody else can answer (secrets, money, legal, irreversible or outward-facing actions)                                    |
| push policy      | commit locally; push only when the profile says `push every green commit` and a remote exists                                                              |
| review gate      | independent review, ship at ≥ 9/10 with requirements fit = 1 and security ≥ 0.5, at most 3 improve rounds                                                  |
| deploy target    | none ("local only") until the user names one                                                                                                               |
| projects folder  | the current working directory's parent, or ask once                                                                                                        |
| mobile           | the repo's existing apps; new product: ask once at triage — web only, iOS, Android, or several; layout `monorepo` (`ios/`, `android/`) or `separate repos` |

Write every answer to a triage question back into the project's `CLAUDE.md` profile section, so it is
never asked again, and copy the keys you used into the ledger's "Delivery profile used" block.

## Step 0 · Triage

| Request looks like                                      | Path                                                                                                                                                                                                       |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| New product, vague idea, several features               | **Full**: every stage below                                                                                                                                                                                |
| Small new tool or app                                   | **Small new**: light `discover` (headline, five questions, appetite) → `spec` → `init-project` (smallest preset) → `shape-plan` → `deliver-loop` → `verify-app` → `demo`                                   |
| iOS app, Android app, mobile app, App Store, Play Store | **Full** or **Small new** as the size says, with the mobile stack question below; `ios` and/or `android` build the apps, `backend` the shared API; `release` takes the store path                          |
| One clear new feature in an existing repo               | **Small**: `spec` (stories, ACs, non-goals) → `shape-plan` (one or two items) → `deliver-loop` → `verify-app` → `demo`                                                                                     |
| Change to an existing feature                           | **Small**, plus `architect` when the change touches a decision recorded in an ADR (update or supersede it first)                                                                                           |
| Bug                                                     | **Bug**: `fix-bug` (reproduce → root cause → failing regression test → fix → verify, and after the next deploy) with `deliver-loop` steps 1 and 4–7 for the item → short retro                             |
| Incident or production alert                            | **Incident**: `monitor` incident path (the mitigation ruling — roll back, flag off, or why not — goes into `status.md` before any fix work) → `fix-bug` for the cause → `release` → blameless note → retro |
| Slow or heavy                                           | **Performance**: `benchmark` B baseline on seeded, realistic data (recorded before any code change) → `cache-optimize` → `deliver-loop` steps 1 and 4–7 → CI guard on the workload → `verify-app` → `demo` |
| Dependency upgrade, security patch, maintenance         | **Quick + audit**: audit (advisories, changelogs, breaking changes) → test → change → full CI → `verify-app` → short retro                                                                                 |
| One-file fix, copy or config change                     | **Quick**: test → change → `verify-app` → short retro. No delivery folder.                                                                                                                                 |
| Research or comparison only                             | **Research**: `benchmark` A or `discover` → a results page via `demo`. No code.                                                                                                                            |

On any path, when the product calls an AI model: run `architect`'s AI-call step (eval set, fallback,
budget) and load the `claude-api` skill before choosing how to call the model.

Also in triage:

- **Mobile stack question** (new product, or a mobile request in a web-only repo, and the profile has
  no `mobile` key): ask once, with the other triage questions — web only, iOS, Android, or several?
  Each native app is its own codebase (`ios/` Swift/SwiftUI, `android/` Kotlin/Compose, in one
  monorepo or separate repos per the answer) and all of them call the same backend API, so the API
  contract (`backend`, OpenAPI) is designed once before either app. "Cross-platform" or "React
  Native" is honoured only when the user says it explicitly; record it as a ruling.
- **Where**: a new repo goes in `<projects folder>/<slug>` per the profile. Create it and `git init`
  first so `docs/delivery/` has a home; the rest of `init-project` runs at the Set up stage.
- **Existing repo without `CLAUDE.md`, Makefile or backlog**: map its real lint, test and run commands,
  write a minimal `docs/backlog.md` and a `CLAUDE.md` with those commands before building.
- **Numbering**: `NNN` is the next free three-digit number under `docs/delivery/`.
- Write the path, the reason and the appetite into `status.md`. Upgrade the path when the work turns
  out bigger; never downgrade to skip a gate.

## Stages (Full path)

| #   | SDLC | Stage     | Skill                                                                                | Output                               | Gate to leave                                                                             |
| --- | ---- | --------- | ------------------------------------------------------------------------------------ | ------------------------------------ | ----------------------------------------------------------------------------------------- |
| 1   | S1   | Discover  | `discover` (+ `benchmark` A: 2–3 reference products)                                 | `brief.md`, product-benchmark table  | a credible press release, or the idea is killed with a reason                             |
| 2   | S2   | Specify   | `spec` (+ `benchmark` B: workloads and targets)                                      | `spec.md`, `benchmarks/plan.md`      | no `[NEEDS CLARIFICATION]`; every quality target has a workload and a number              |
| 3   | S3   | Set up    | `init-project` (new repo)                                                            | green, documented repo               | `make ci` green; README quick start runs                                                  |
| 4   | S3   | Architect | `architect` (+ `system-design`, `database`)                                          | `design.md` + ADRs                   | every driving characteristic has a decision and a fitness check                           |
| 5   | S3   | Plan      | `shape-plan`                                                                         | `plan.md` + backlog items            | skeleton first, benchmark harness second; every AC covered; first slice fits the appetite |
| 6   | S4   | Build     | `deliver-loop` (+ `backend`, `frontend`, `css-design`, `database`, `ios`, `android`) | reviewed commits per item            | each item shipped per the review gate, filed as debt, or `blocked`                        |
| 7   | S5   | Verify    | `verify-app` (+ `benchmark` vs baseline, `cache-optimize`)                           | evidence per AC, benchmark diff      | every AC has evidence on each tagged platform; no unexplained regression                  |
| 8   | S5   | Demo      | `demo`                                                                               | `demo.md` + a page                   | the user has a link, the app URL and the run command                                      |
| 9   | S6   | Release   | `release` (at a release boundary)                                                    | tag, deploy or "local only", smoke   | smoke green on the target; store rollout steps healthy per app; findings in the backlog   |
| 10  | S7   | Operate   | `monitor` (once there is a deploy target)                                            | SLOs, symptom alerts, runbook        | every user-facing SLO has an alert that was fired once on purpose                         |
| 11  | S7   | Learn     | retro + `improve-skills`                                                             | Retro section, lessons in the skills | retro written; lessons committed                                                          |

A brief is credible when the five customer questions are answered from facts the user gave or that
you can cite; numbers you cannot source are marked `HYPOTHESIS`.

## The loops

Full and Small paths run S1 → S7 in order. Bug, Performance and change paths join at the item loop;
Incident starts at `monitor`'s mitigation ruling; Quick and Quick + audit go straight to `verify-app`
after the change; Research ends at `demo`. Every path ends with the retro.

1. **Item loop** — `deliver-loop`, one backlog item at a time, under the review gate from the profile.
2. **Slice loop** — after each slice: `verify-app` (with the benchmark diff), `demo`, notify the user
   once, read the feedback (the user's, the hypothesis metric, the benchmark) and re-plan: update
   `spec.md` and `plan.md`, cut scope by the circuit breaker, pick the next slice. No feedback → next
   slice, recorded as "no feedback".
3. **Release loop** — `ship` decides release boundaries (`plan.md` says which slice). `release` tags and
   deploys, then post-deploy verification runs on the target, then `monitor` watches it. Every finding
   becomes a backlog item; those beyond the appetite wait for the next planning round.
4. **Maintain loop** — bugs go through `fix-bug`, incidents through `monitor` then `fix-bug`, upgrades and
   patches through the Quick + audit path; each re-enters Build as backlog items.
5. **Learn loop** — every path ends with a retro in `status.md` (two lines for Quick and Bug): what slowed
   us, what reviews caught late, what to change. `improve-skills` folds lessons that hold for any
   project into the skills.
6. **Running unattended** — for anything longer than one sitting, start `/loop /ship` (or re-invoke
   `ship`): each wake-up runs "Where am I?" and continues at Next action.

## Specialist skills (load the ones the work touches)

| Stage                | When the work involves                                                              | Skill                                               |
| -------------------- | ----------------------------------------------------------------------------------- | --------------------------------------------------- |
| 4 Architect          | a new system or a part that must scale, estimates, storage choice                   | `system-design` (then `architect` records the ADRs) |
| 4 Architect, 6 Build | tables, migrations, indexes, queries, transactions                                  | `database`                                          |
| 6 Build              | routes, services, domain, jobs, integrations                                        | `backend`                                           |
| 6 Build              | screens, components, forms, data fetching                                           | `frontend`                                          |
| 6 Build              | tokens, layout, colour, typography, component states (web UI)                       | `css-design`                                        |
| 6 Build              | a native iPhone or iPad app: SwiftUI screens, HIG, XCTest, App Store build          | `ios`                                               |
| 6 Build              | a native Android app: Compose screens, Material 3, tests, Play build                | `android`                                           |
| 7 Verify, Maintain   | a performance target, something slow, caching                                       | `cache-optimize`                                    |
| 1, 2, 5, 7           | comparing with other products; performance targets, baselines, regressions          | `benchmark`                                         |
| 9 Release            | tagging, deploying, smoke checks, rollback; TestFlight, Play tracks, staged rollout | `release`                                           |
| 10 Operate           | SLOs, alerts, dashboards, incidents; crash-free sessions, ANR rate                  | `monitor`                                           |
| Maintain             | a defect, in development or in production                                           | `fix-bug`                                           |

## Build (stage 6)

`shape-plan` already wrote the backlog. The build and review rules are `deliver-loop`'s: run it in this
conversation (it spawns the independent reviewer, which a subagent cannot). Between items: check each
shipped item against `spec.md`, keep `status.md` current, cut scope when the appetite runs out.

## Finishing

Every path ends the same way: evidence (`verify-app`), a results page (`demo`) where the path has one,
a release at a release boundary, the retro, then `improve-skills`. The last message (≤ 12 lines): what
the user can open now (link, app URL, run command), what works by AC, what was cut and why, what is
next — or, when `blocked`, exactly what fails and what is needed.

## References

- `references/sdlc-checklists.md` — per-stage checklists from the canonical SDLC books; most lines are
  paraphrases from memory, so check the book before quoting.
- `references/agent-workflows.md` — what Anthropic's skill guidance, superpowers, spec-kit, BMad, Kiro
  and Working Backwards skills do per phase, with URLs; items that contradict the decide-and-record
  autonomy default are marked "not adopted".
- `references/sdlc-web-mobile.md` — the seven SDLC stages mapped to `ship`'s stages, with what each
  owes per platform (web, iOS, Android), the platform parity rules and each stage's gate.
- `templates/status.md` — the ledger.
