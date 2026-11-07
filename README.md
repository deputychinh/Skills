# Skills

David's personal [Claude Code skills](https://docs.claude.com/en/docs/claude-code/skills), kept in git and
installed into `~/.claude/skills` by symlink, so an edit here is live in the next Claude Code session.

| Skill                                          | What it does                                                                                                                                                             | Trigger                                                                 |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| [`init-project`](skills/init-project/SKILL.md) | Bootstraps a repo the house way: git on `main`, Conventional Commits, Makefile, docs (conventions, testing, ADR 0001, plan, backlog), CI and a stack baseline per preset | `/init-project`, "dự án mới", "new project"                             |
| [`deliver-loop`](skills/deliver-loop/SKILL.md) | Works a backlog autonomously: BA → design → TDD → QA → independent 10-point review ≥ 9 → commit and push → retro                                                         | `/deliver-loop`, `/loop /deliver-loop`, "làm tiếp", "work autonomously" |

## Install

```sh
git clone https://github.com/deputychinh/Skills.git ~/Documents/David/Code/skills
cd ~/Documents/David/Code/skills
make install   # npm tooling + links every skill into ~/.claude/skills
```

`make link` only (re)creates the links. An existing real folder with the same name is moved aside
to `~/.claude/skills-backup/<name>.bak-<timestamp>`, never deleted (outside the skills folder, so Claude
Code does not load it twice).

## Layout

```text
skills/<name>/SKILL.md     frontmatter (name, description) + instructions
skills/<name>/templates/   files a skill copies into a project ({{PLACEHOLDERS}} allowed)
skills/<name>/references/  knowledge the skill reads and cites
scripts/check.mjs          validation run by `make check`, the pre-commit hook and CI
scripts/link.sh            the installer
```

## Adding or changing a skill

1. Create `skills/<kebab-name>/SKILL.md`; the frontmatter `name` equals the folder.
2. Add the name to `scope-enum` in `commitlint.config.mjs`.
3. `make link && make lint`, then commit, e.g. `feat(deliver-loop): …`.

Lessons learned while using a skill go into that skill (its checklist or gotchas) in the same commit
as the change that taught them. [Kiln](https://github.com/deputychinh/Kiln) is the project these
skills are proven on.
