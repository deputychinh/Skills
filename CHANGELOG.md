# Changelog

Follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- Repository for David's personal Claude Code skills, installed into `~/.claude/skills` by symlink (`make install`, `make link`).
- `init-project` and `deliver-loop`, moved from `~/.claude/skills`; content unchanged, formatted with Prettier.
- `make check`: every skill has valid frontmatter (name = folder, description ≤ 1024 characters), `SKILL.md` ≤ 500 lines, every `templates/…` and `references/…` path it names exists, no placeholders outside templates. Runs in the pre-commit hook and CI.
