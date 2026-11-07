# ADR 0001: Stack and repository layout

- Status: accepted · {{DATE}}

## Context

{{PURPOSE}}. Constraints: …

## Decision

1. Stack: {{STACK}}.
2. One repository; deployables in their own folders with their own manifests; repo-level tooling at the root.
3. Layered backend (routes → services → domain, ports for I/O); feature-sliced frontend.
4. Quality gates: ruff + mypy strict + pytest ≥ 90 %; ESLint 0 warnings + tsc + Vitest ≥ 80 % + Playwright; Conventional Commits enforced by hooks and CI.

## Consequences

- …
