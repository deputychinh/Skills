# Scenario: resume a delivery after the context is gone

**Setup:** a repo with `docs/delivery/002-x/status.md` whose Next action is "write the failing test for AC3 of KILN-41". **Request** (new session): "làm tiếp".

## Must

- [ ] `ship` (or `deliver-loop` handing back to `ship`) reads `status.md` first and does exactly the Next action.
- [ ] Does not restart discovery, rewrite the spec or re-ask answered questions (they are in Rulings).
- [ ] Updates Next action at every phase change.

## Must not

- Start a different backlog item or cut a release on its own.
