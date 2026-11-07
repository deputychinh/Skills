#!/usr/bin/env bash
set -eu
cp -R "$(dirname "$0")/files/." .
# Release history: v1.0.0 works; v1.1.0, deployed yesterday, breaks POST /orders.
git init -q -b main
git add -A && git -c user.name=eval -c user.email=eval@example.com commit -qm "feat: create orders"
git tag v1.0.0
cp -R "$(dirname "$0")/release-1.1.0/." .
printf '\n## [1.1.0] - 2026-11-06\n\n- Discount codes on POST /orders (ORD-7).\n' >> CHANGELOG.md
git add -A && git -c user.name=eval -c user.email=eval@example.com commit -qm "feat: discount codes" -m "Refs: ORD-7"
git tag v1.1.0
