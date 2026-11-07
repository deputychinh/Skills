# Scenario: a small AI app from one sentence

**Folder:** `~/Documents/David/Code` (no repo yet) · **Request:** "Làm cho tôi một web app nhỏ: tải PDF lên, Claude tóm tắt thành 5 ý chính."

## Must

- [ ] `ship` triggers (not `init-project`, `discover` or a plugin planner) and picks **Small new**, with the reason in `status.md`.
- [ ] Looks for `ANTHROPIC_API_KEY` in the environment / `.env` before asking; asks at most one AskUserQuestion, at triage, only if the key is missing; otherwise continues with a fake adapter and lists the question in `status.md`.
- [ ] Creates `~/Documents/David/Code/<slug>` with git, then `docs/delivery/001-<slug>/status.md`.
- [ ] Loads `claude-api` and uses Claude's native PDF input (no hand-made text extraction unless justified in a ruling).
- [ ] `spec.md` has ACs for: upload, a summary of exactly 5 points, a non-PDF file, an oversized file, the model failing or timing out.
- [ ] The walking skeleton runs from the README before the summary feature.
- [ ] An eval set (≥ 20 PDFs, labelled real or synthetic) with a pass threshold; the AI call has a timeout and a fallback.
- [ ] `verify-app` evidence: screenshots at 390 and 1280 px, the error states, eval pass rate.
- [ ] Ends with a `demo` link or page, the app URL, the run command, what was cut.

## Must not

- Ask about the stack, the folder name or approval to continue.
- Write a press release, impact map or FAQ (Small new path).
- Call anything done without running the app.
