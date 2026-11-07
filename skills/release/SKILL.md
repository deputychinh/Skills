---
name: release
description: Use when work is ready to leave the developer's machine or a release boundary is reached — cutting a version, deploying, checking it in production and watching it afterwards ("release", "deploy", "đưa lên production", "phát hành", "rollback", "giám sát", "monitoring", "sự cố"). Produces a versioned release (SemVer tag, Keep a Changelog section), a deploy that promotes the same build through every stage, a smoke check and a rehearsed rollback, user-facing SLOs with alerts on symptoms, and a post-release note whose findings become backlog items. For a repo with no deploy target yet it records "local only" and stops at the tag. Inside a delivery, `ship` and `deliver-loop` call this skill at each release boundary.
---

# release — ship the same build safely, watch it, and feed what you learn back

## Workflow

1. **Ready check.** `main` green (`make ci`, e2e, benchmark guard), `CHANGELOG.md` `[Unreleased]`
   complete, every item in the release `done` or moved out, migrations reviewed with `database`
   (expand/contract: the old code must run against the new schema). _Evidence:_ the gate output.
2. **Version.** SemVer from the changes (breaking → major, feature → minor, fix → patch; `0.x` may
   break in minor). Move `[Unreleased]` to `[x.y.z] - YYYY-MM-DD`, bump every package version,
   `chore(release): vx.y.z`, annotated tag, push tag. _Evidence:_ `git show --stat vx.y.z`.
3. **Build once, promote.** One artefact (image digest, bundle hash) built by CI from the tag and
   promoted unchanged through staging to production; configuration from the environment. No
   deploy target yet → record "local only" in the release note and stop here.
4. **Deploy safely.** Migrations first (expand), then the app; risky changes behind a flag or a
   canary; zero-downtime (health and readiness checks, graceful shutdown); never deploy on a red
   gate. _Evidence:_ deploy log with the artefact id.
5. **Smoke check in the target.** The README journey against the deployed URL (`verify-app` steps
   on that URL), `/health` and `/ready`, one real request per critical path. _Evidence:_ screenshots
   and command output with the URL.
6. **Rollback rehearsed.** Know the exact command (previous image, previous bundle, feature flag
   off) and run it once per new deploy mechanism; schema changes stay backward compatible so rollback
   needs no down-migration. _Evidence:_ the rollback command and when it was last exercised.
7. **Observe.** 1–3 user-facing SLOs (availability, p95 latency of the key journey, job freshness)
   with an error budget; alerts on symptoms (errors, latency, saturation), each actionable; structured
   logs with request ids; dashboards for the four golden signals. _Evidence:_ the SLO table in
   `docs/operations.md` and a test alert.
8. **After the release (feedback loop).** Within a day: compare the benchmark baseline and field
   metrics with before, read errors and logs, check the brief's hypothesis metric. Every finding →
   a backlog item (bug, debt, idea) and one line in the release note. Incidents get a blameless
   postmortem with actions in the backlog. _Evidence:_ `docs/releases/vx.y.z.md`.

## Core checklist

1. The tag, the changelog section and the package versions agree.
2. The artefact deployed is the one CI built and tested; nothing is rebuilt per environment.
3. Every migration in the release is safe with the previous app version still running.
4. The smoke check runs against the deployed URL, not localhost.
5. Rollback is one command and has been run at least once for this mechanism.
6. Alerts fire on what users feel and every alert has a runbook line.
7. Release findings are backlog items, not chat messages.

## Anti-patterns

Rebuilding for production; deploying a red `main`; a down-migration as the rollback plan; alerts on
CPU instead of user pain; a release with no note of what changed for users; "we'll watch it" with
no metric named; hotfixes that skip the changelog.

## Evidence before "done"

Tag and changelog, deploy log with artefact id (or "local only"), smoke output on the target URL,
rollback command, SLO table and a test alert, and `docs/releases/vx.y.z.md` with findings linked to
backlog items.

## References

- `references/release-and-operate.md` — sources and details (Continuous Delivery, DORA metrics, SRE
  SLOs and alerting, Release It! deployment patterns, Keep a Changelog, SemVer).
