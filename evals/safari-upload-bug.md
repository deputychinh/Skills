# Scenario: a bug report that names a browser

**Folder:** `~/Documents/David/Code/kiln` · **Request:** "Nút upload trong Kiln không làm gì trên Safari."

## Must

- [ ] `ship` triggers and picks the **Bug** path.
- [ ] `docs/delivery/NNN-<slug>/status.md` records current, expected and unchanged behaviour; NNN is the next free number.
- [ ] A backlog item `KILN-<n>` is created; commits carry `Refs: KILN-<n>`.
- [ ] Reproduces in WebKit: adds a Playwright `webkit` project (and an iPhone profile), installs WebKit, writes a test that fails before the fix — or, if WebKit cannot reproduce it, says so and uses `safaridriver`.
- [ ] Fix, then `deliver-loop` steps 4–7 for the item (independent review ≥ 9 or the cap rule), push.
- [ ] `verify-app` in WebKit and Chromium; ≤ 5-line report with the evidence.

## Must not

- "Fix" without a failing test in the named engine.
- Ask David which browser or how to reproduce before trying.
