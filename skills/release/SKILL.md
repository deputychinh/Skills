---
name: release
description: Use when work is ready to leave the developer's machine or a release boundary is reached — cutting a version, tagging, deploying, rolling back, or checking a deploy is healthy ("release", "deploy", "push it live", "rollback", "is the deploy OK?"). Produces a ready check (CI, dependency audit, secret scan, migration compatibility), a SemVer tag and changelog, one build promoted unchanged, a verification plan written before the deploy, checkpoints at +5 min, +1 h and +24 h against a baseline with numeric rollback triggers and a one-command rollback, and a release note whose findings become backlog items. No deploy target: tag, fresh-clone smoke, bench vs the previous tag. iOS and Android apps: TestFlight or Play tracks, phased or staged rollout, halt instead of rollback. `ship` and `deliver-loop` call this skill; ongoing watching is `monitor`, defects go to `fix-bug`.
---

# release — ship the same build, prove it healthy, and roll back without debate

A deploy is not done when the pipeline turns green; it is done when the numbers users feel look the
same as before (or better) and someone has checked. The plan for that check, and the conditions that
trigger a rollback, are written **before** the deploy, because during a bad deploy nobody argues well
about thresholds.

Read the delivery profile (see the repo README) first: `deploy target` (default: none, "local only"),
`push policy` and `autonomy`. A production deploy is outward-facing: run it when the profile names a
target and allows it, otherwise ask once. A rollback that the verification plan pre-authorises needs no
question — mitigation comes first.

**Mobile apps take the store path.** For a native iOS or Android app the workflow below still holds
(ready check, version, verification plan written first, checkpoints, release note), but the deploy
is a store upload and the rollback is not a command: follow `references/app-stores.md` — marketing
version + build number (iOS) or `versionName` + `versionCode` (Android); TestFlight and App Review,
then a phased release; Play internal → closed → production with a staged rollout; checkpoints per
rollout step on crash-free sessions and users and the ANR rate. A store cannot roll back a binary,
so "rollback" means flag off, halt the rollout or pause the phased release, and an expedited fix.
Each app releases on its own; the backend must keep serving every app version still installed.

## Workflow

1. **Ready check.** Run every gate and keep the output; never judge a gate from filtered output.
   - `main` green: `make ci`, e2e against the production build, the `benchmark` guard.
   - Dependency audit of what ships: `npm audit --omit=dev --audit-level=high` and/or `pip-audit`
     (`pip-audit .` or `-r requirements.txt`). High or critical → fix, or record an accepted risk
     with a reason and an expiry date in the release note.
   - Secret scan: `gitleaks git .` over history (or the range since the last tag) and
     `gitleaks dir .` over the tree. A hit is rotated, not just deleted — git history keeps it.
   - Migration compatibility (with `database`): every migration in the release is expand-only or
     already contracted; the **previous** release's code still runs against the new schema. Prove it:
     apply the new migrations, check out the previous tag's app, run its smoke or e2e suite.
   - `CHANGELOG.md` `[Unreleased]` complete; every backlog item in the release `done` or moved out.
     _Evidence:_ each command with its exit code, pasted in the release note.
2. **Version, changelog, tag.** SemVer from the changes (breaking → major, feature → minor, fix →
   patch; `0.x` may break in a minor). Move `[Unreleased]` to `[x.y.z] - YYYY-MM-DD`, bump every
   package version, commit `chore(release): vx.y.z`, annotated tag. Push per the delivery profile.
   _Evidence:_ `git show --stat vx.y.z`; tag, changelog and package versions agree.
3. **Build once, promote.** CI builds one artefact from the tag (image digest, bundle hash) and the
   same artefact moves through staging to production; configuration comes from the environment.
   Rebuilding per environment means production runs something nobody tested.
   No deploy target → go to **Local only** below.
4. **Write the verification plan** from `templates/verification-plan.md` into
   `docs/releases/vx.y.z.md` before deploying: the baseline window, the metrics with thresholds, the
   critical journeys, the rollback triggers, the rollback command and who or what pulls it. Capture
   the baseline numbers now (last 1–7 days, same weekday and hour where traffic is cyclic).
5. **Deploy safely.** Expand migrations first, then the app. Pick the safest strategy available:
   feature flag (deploy dark, release by flag), canary (1–10 % of traffic with a control group on the
   old version, promoted in stages), blue/green (switch traffic, keep the old colour warm), else a
   rolling deploy behind readiness checks with graceful shutdown. Never deploy on a red gate.
   _Evidence:_ deploy log with the artefact id and the time traffic reached it.
6. **Checkpoint +5 min — smoke.** `verify-app` in post-deploy mode against the deployed URL (the
   README journey in a real browser), health and readiness endpoints, one real request per critical
   path (sign in, the main write, the main read, a background job if any), the error tracker filtered
   to the new release. A failed smoke is a rollback trigger, not a ticket.
7. **Checkpoint +1 h — compare with the baseline.** Error rate, p95 (and p99) latency, saturation
   (CPU, memory, connection pool, queue depth) and the key business events (sign-ups, orders, saves)
   against the baseline window. With a canary, compare **canary vs control** at the same time — a
   before/after comparison confuses the release with time-of-day effects. Check the absolute SLOs too.
8. **Checkpoint +24 h — slow signals.** Field Core Web Vitals at p75 (LCP, INP, CLS) for the release,
   job backlogs and freshness, cost per day, and the logs and error tracker for **new error
   signatures** (issues first seen in this release). Then remove or clean up the flag if the release
   was flag-gated, and contract migrations only in a later release.
9. **Release note with results.** Fill the results columns of the plan in `docs/releases/vx.y.z.md`
   (`templates/release-note.md` for the user-facing part): what changed for users, the numbers at each
   checkpoint, decisions taken. Every finding → a backlog item: defects to `fix-bug`, slow creep to
   `cache-optimize` or `benchmark`, missing signals to `monitor`. Also record the DORA numbers this
   release moves (lead time, deploy frequency, change fail, recovery time).

## Rollback triggers and the one command

Default triggers — tune them in the plan, but always write numbers, never "if it looks bad":

| Signal                                 | Trigger (sustained)                                                | Action                      |
| -------------------------------------- | ------------------------------------------------------------------ | --------------------------- |
| Smoke at +5 min                        | any critical journey fails                                         | roll back now               |
| Error rate (5xx and failed jobs)       | > 2× baseline **and** above an absolute floor (e.g. 1 %) for 5 min | roll back                   |
| p95 latency of a critical path         | above the budget from `benchmark` for 10 min                       | roll back or flag off       |
| Key business event rate                | < 80 % of control/baseline for 30 min                              | flag off, investigate       |
| New error signature on a critical path | > N users or any data loss                                         | flag off or roll back       |
| SLO burn-rate page from `monitor`      | fires during the watch window                                      | roll back first, then debug |
| Canary analysis                        | canary worse than control on any ranked metric                     | abort the canary            |

The absolute floor matters: on a quiet service one failed request can double the error rate.

The rollback is **one command** written in the plan and exercised at least once per deploy mechanism:
redeploy the previous artefact (`kubectl rollout undo`, re-promote the previous image digest, switch
the blue/green router back, revert the hosting provider's deployment), or turn the flag off. Schema
changes stay backward compatible, so a rollback never needs a down-migration. After a rollback, open
an incident with `monitor` and a backlog item for `fix-bug`.

## Local only (no deploy target)

Still prove the tag works where nobody has your shell history:

1. Fresh clone of the tag into a scratch directory; follow the README quick start word for word;
   run `verify-app` against the URL it prints. A step that only works on your machine is a bug.
2. Compare performance with the previous tag on the same machine: `make bench` on `vx.y.z` and on
   the previous tag (a `git worktree` keeps both side by side); a regression beyond the noise band
   is fixed or recorded with a reason (`benchmark` owns the guard).
3. Write "local only" and both results in the release note.

## Core checklist

1. Tag, changelog section and package versions agree (for apps: marketing version / `versionName`
   and a new build number / `versionCode`).
2. The deployed artefact is the one CI built and tested; nothing is rebuilt per environment.
3. Audit and secret scan ran on this release; findings are fixed or accepted with an expiry.
4. The previous app version was run against the new schema.
5. The verification plan, with numeric rollback triggers, existed before the deploy.
6. Smoke ran against the deployed URL, not localhost.
7. +1 h and +24 h numbers are compared with a baseline (or the control group), not eyeballed.
8. Rollback is one command and has been run for this mechanism.
9. Every finding is a backlog item; defects went to `fix-bug`.

## Anti-patterns

- Rebuilding for production; deploying a red `main`; skipping the audit "because it is noisy".
- "We'll keep an eye on it" with no metric, threshold or time named.
- Comparing a canary with last week instead of with its control group.
- Debating a rollback while the error rate climbs — the trigger was agreed in advance.
- A down-migration as the rollback plan; contracting a schema in the same release that stops using it.
- Deleting a leaked secret from the file and not rotating it.
- Hotfixes that skip the changelog or the verification checkpoints.

## Evidence before "done"

Gate outputs (CI, audit, secret scan, migration check), tag and changelog, deploy log with artefact
id (or "local only" with the fresh-clone smoke and bench diff), the verification plan with results at
+5 min, +1 h and +24 h, the rollback command and when it was last exercised, and
`docs/releases/vx.y.z.md` with findings linked to backlog items.

## References

- `references/release-and-operate.md` — ready-check tools, versioning, build-and-promote, deploy
  strategies, DORA metrics, with sources.
- `references/post-deploy-verification.md` — baselines, checkpoint queries, canary analysis,
  rollback mechanics per platform, new-error-signature checks.
- `references/app-stores.md` — the store path for iOS and Android apps: versioning, TestFlight and
  App Review, phased release, Play tracks and staged rollout, crash-free and ANR triggers, halting
  and expedited fixes.
- `templates/verification-plan.md` — the plan and results table written before each deploy.
- `templates/release-note.md` — the release note.
