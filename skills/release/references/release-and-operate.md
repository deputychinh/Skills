# Release — ready check, versioning, build and deploy

Notes are marked "Verified on 2026-11-07 against <URL>" when re-read at the source that day, or
"(memory)" when paraphrased from a book or earlier reading — check those before quoting.

## Contents

1. [Ready check](#1-ready-check)
2. [Versioning and changelog](#2-versioning-and-changelog)
3. [Build once, promote](#3-build-once-promote)
4. [Deploy strategies](#4-deploy-strategies)
5. [Migrations and rollback](#5-migrations-and-rollback)
6. [DORA metrics](#6-dora-metrics)

## 1. Ready check

**Dependency audit (Node).** `npm audit --omit=dev --audit-level=high` audits only what ships.
`--audit-level` sets the failure threshold but does not filter the report, so read the whole output.
By default any vulnerability gives a non-zero exit. Verified on 2026-11-07 against
https://docs.npmjs.com/cli/v10/commands/npm-audit

**Dependency audit (Python).** `pip-audit` audits the active environment; `pip-audit -r
requirements.txt` a requirements file; `pip-audit .` a `pyproject.toml` project; `pip-audit --locked .`
`pylock.*.toml` lock files. Exit 1 when a known vulnerability is found; `--strict` also fails when a
dependency cannot be collected. Verified on 2026-11-07 against https://github.com/pypa/pip-audit

Triage a finding by reachability: is the vulnerable function called with attacker-controlled input
in production? Fix by upgrading; if no fix exists, record the accepted risk with an owner and an
expiry date in the release note so it comes back.

**Secret scan.** gitleaks v8: `gitleaks git .` scans commit history (`--log-opts="vA..HEAD"` limits
the range); `gitleaks dir .` scans files. `detect`/`protect` are deprecated since v8.19.0. Exit 1 on
leaks. Verified on 2026-11-07 against https://github.com/gitleaks/gitleaks
A leaked credential is compromised the moment it is pushed: rotate it at the provider, then remove it.

**Migration compatibility.** During any deploy, old and new app versions run against one schema. The
check: apply the release's migrations to a copy of the schema, start the previous tag's app, run its
smoke or e2e suite. Red flags in a migration: dropping a column or table the previous version reads,
renames, a new `NOT NULL` without a default, a type change, a non-concurrent index on a large table.
The `database` skill owns expand → migrate → contract. (memory: Sadalage & Ambler, _Refactoring
Databases_)

## 2. Versioning and changelog

- SemVer 2.0.0: MAJOR for incompatible API changes, MINOR for backward-compatible features, PATCH for
  backward-compatible fixes; `0.y.z` is initial development and anything may change. (memory:
  https://semver.org)
- For an application without a public API, "breaking" means a user-visible break: a removed feature,
  a changed URL, data that needs a manual step.
- Keep a Changelog 1.1.0: `[Unreleased]` on top; sections Added, Changed, Deprecated, Removed,
  Fixed, Security; ISO dates; newest first; written for users, not a commit dump. (memory:
  https://keepachangelog.com)
- Annotated tags (`git tag -a vX.Y.Z -m …`) carry author and date; lightweight tags do not.

## 3. Build once, promote

- One pipeline: commit stage (lint, unit), acceptance stage (e2e, benchmarks), then deploy stages; the
  binary built once is promoted through every stage, and environment differences live in
  configuration. (memory: Humble & Farley, _Continuous Delivery_)
- Identify the artefact by content: container image digest (`sha256:…`), not a mutable tag like
  `latest`; for static sites, the bundle hash. Record it in the release note so rollback knows what
  "previous" means.
- Keep the software releasable at all times; a red pipeline stops new work until fixed. (memory)

## 4. Deploy strategies

Choose the safest one the platform offers; they compose (a flag inside a canary is common).

| Strategy     | What it buys                                                 | Needs                                                   |
| ------------ | ------------------------------------------------------------ | ------------------------------------------------------- |
| Feature flag | Deploy is separate from release; turn off without a deploy   | a flag service or config switch; flag removal later     |
| Canary       | Real traffic on a small slice, compared with a control group | traffic splitting, per-version metrics                  |
| Blue/green   | Instant switch back; the old version stays warm              | two environments, a router switch                       |
| Rolling      | No extra capacity                                            | readiness checks, graceful shutdown, old/new coexisting |

- Separate deploy from release with flags, dark launches, canaries or blue/green. (memory: Humble &
  Farley; Nygard, _Release It!_)
- Health (`/health`: process up) is not readiness (`/ready`: can serve — database, storage, queue
  reachable). Load balancers route on readiness; graceful shutdown drains in-flight requests before
  exit. (memory)
- Small hosting (a PaaS, a static host, one VM): the platform's "redeploy previous deployment" is the
  rollback; a config flag read at request time is the feature flag. That is enough.

## 5. Migrations and rollback

- Expand (add, nullable, dual-write) → migrate (backfill in batches) → contract (remove) in a **later**
  release, once no running version reads the old shape. Then rollback = redeploy the previous artefact,
  with no down-migration. (memory)
- Rehearse the rollback command once per deploy mechanism (new platform, new pipeline). An unrehearsed
  rollback tends to fail when it is needed most, for example because the previous image was pruned.
- Data written by the new version must stay readable by the old one during the watch window
  (new enum values, new JSON fields): ship the reader first, the writer in the next release.

## 6. DORA metrics

Throughput: change lead time (commit → running in production), deployment frequency, failed
deployment recovery time. Instability: change fail rate (deployments needing an urgent fix, rollback
or hotfix), deployment rework rate (unplanned deployments triggered by a production incident).
Verified on 2026-11-07 against https://dora.dev/guides/dora-metrics/

Record per release: commit-to-production time of the oldest change, whether it needed a rollback or
hotfix, and the recovery time if so. Trends over releases matter more than one number.
