# Release and operate — details and sources

Items marked _(memory)_ were not re-checked online on 2026-11-07.

## Contents

1. [Delivery pipeline](#1-delivery-pipeline) · 2. [Versioning and changelog](#2-versioning-and-changelog) · 3. [Deploying safely](#3-deploying-safely) · 4. [SLOs and alerting](#4-slos-and-alerting) · 5. [Learning loop](#5-learning-loop)

## 1. Delivery pipeline

- One pipeline: commit stage (lint, unit tests), acceptance stage (e2e, benchmarks), then deploy;
  the same build is promoted through every stage. [Humble & Farley, _Continuous Delivery_] _(memory)_
- Keep the software releasable at all times; a broken pipeline stops new work until fixed. [same]
- Track the DORA metrics — change lead time, deployment frequency, failed deployment recovery time,
  change fail rate, deployment rework rate (five since 2024). [dora.dev, checked 2026-11-07 by the SDLC research]

## 2. Versioning and changelog

- SemVer 2.0.0: MAJOR for incompatible API changes, MINOR for compatible features, PATCH for fixes;
  `0.y.z` is initial development and anything may change. [semver.org] _(memory)_
- Keep a Changelog 1.1.0: `[Unreleased]` on top, sections Added / Changed / Deprecated / Removed /
  Fixed / Security, ISO dates, newest first. [keepachangelog.com] _(memory)_

## 3. Deploying safely

- Separate deploy from release with feature flags, dark launches, canaries or blue/green. [Humble &
  Farley; Nygard, _Release It!_] _(memory)_
- Expand → migrate → contract for schema changes so old and new code run together; never rely on a
  down-migration to roll back. See the `database` skill. [Sadalage & Ambler, _Refactoring Databases_] _(memory)_
- Health (`/health`) answers "process up"; readiness (`/ready`) answers "can serve" (DB, storage);
  load balancers route on readiness. Graceful shutdown drains in-flight work. _(memory)_

## 4. SLOs and alerting

- Define SLIs from the user's view and an SLO with an error budget; spend the budget to choose
  between features and reliability work. [Beyer et al., _Site Reliability Engineering_] _(memory)_
- Alert on symptoms (the four golden signals: latency, traffic, errors, saturation); every page
  must be actionable; prefer multi-window burn-rate alerts on the SLO. [SRE book and workbook] _(memory)_
- Logs, metrics and traces from day one ("transparency"). [Nygard, _Release It!_] _(memory)_

## 5. Learning loop

- After each release: compare metrics with the baseline, check the hypothesis from the brief, turn
  every finding into a backlog item. [Ries, _The Lean Startup_ — validated learning] _(memory)_
- Blameless postmortems with owned actions tracked to done. [SRE book] _(memory)_
