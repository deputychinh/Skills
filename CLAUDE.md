# Skills repo — rules for agents

David's personal Claude Code skills. `~/.claude/skills/<name>` are symlinks into `skills/<name>`,
so every edit here is live; there is no build step.

- Docs, skills and commits in English; answer David in Vietnamese.
- One folder per skill under `skills/`; `SKILL.md` frontmatter `name` = folder name (kebab-case),
  `description` ≤ 1024 characters and says when to trigger; `SKILL.md` ≤ 500 lines — move detail into
  `references/` or `templates/` and point to it with a backticked path (`make check` verifies it exists).
- Templates may hold `{{PLACEHOLDERS}}`; Prettier skips `skills/*/templates/`.
- Lessons from using a skill on a real project go into that skill's checklist/gotchas, one line each,
  with the project and item that taught it (e.g. "KILN-28 took five reviews because …").
- Gates: `make lint` (Prettier + `scripts/check.mjs`). Commit only green, Conventional Commits with a
  scope from `commitlint.config.mjs` (one per skill + `repo`, `docs`, `ci`, `deps`); push every commit
  to `origin main`; never rewrite `main`.
- Never commit secrets, tokens or client material; skills must not embed credentials.
