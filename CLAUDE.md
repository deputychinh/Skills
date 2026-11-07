# Software lifecycle skills — rules for contributors and agents

This repository is a Claude Code plugin marketplace (`.claude-plugin/marketplace.json`) with one
plugin, `software-lifecycle` (`.claude-plugin/plugin.json`), whose skills live in `skills/`. `ship`
is the single entry point; the other skills are specialists it calls. There is no build step: with
`make link` the skills are symlinked into `~/.claude/skills`, so an edit is live in the next session.

- Reply in English unless the contributor's delivery profile says otherwise. Docs, skills, templates
  and commit messages are English only; Claude matches intent across languages, so skills need no
  translated trigger phrases.
- One folder per skill under `skills/`; `SKILL.md` frontmatter `name` = folder name (kebab-case);
  `description` in the third person, says what the skill produces and when to use it ("Use when …"),
  ≤ 1024 characters (aim for ≤ 700). Keep `SKILL.md` lean (aim for < 200 lines, hard limit 500) and
  move detail into `references/` or `templates/`, pointed to with a backticked path (`make check`
  verifies it exists). Reference files over 100 lines start with a table of contents.
- Write instructions in the imperative and explain the reason instead of shouting MUST.
- Nothing personal: no owner names, private repositories, item ids, local paths or GitHub user names
  inside skills. Examples use neutral domains (an "orders" API, a "notes" app). Preferences come from
  the delivery profile (see README), never from the skill text.
- Vue and React, Node and Python are equals: stack-specific detail goes into per-stack reference files.
- Keep verified-source notes ("verified on <date> against <URL>", or "(memory)" when not checked).
- Templates may hold `{{PLACEHOLDERS}}`; Prettier skips `skills/*/templates/`.
- A lesson from real use goes into the skill that owns that stage, one line, as general guidance with
  its reason, in the same commit as the change it caused.
- Gates: `make lint` (Prettier + `scripts/check.mjs`) and `claude plugin validate .` must pass. Commit
  only green, Conventional Commits with a scope from `commitlint.config.mjs` (one per skill plus
  `repo`, `docs`, `ci`, `deps`, `evals`, `plugin`). Never rewrite `main`.
- `plugin.json` has no `version` on purpose: each commit is a new version for installed users. Set one
  only when releases start being tagged, and bump it with every release.
- Never commit secrets, tokens or client material; skills must not embed credentials.
