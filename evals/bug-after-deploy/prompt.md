---
tags: [ship, incident, bug]
max_turns: 150
timeout_seconds: 3600
allowed_tools: [Read, Glob, Grep, Skill, Write, Edit, Bash, Agent]
---

Since yesterday's deploy the API error rate went from 0.2% to 4%. Most of the failures are 500s on POST /orders. Please sort it out.

Input files: README.md, CLAUDE.md, CHANGELOG.md, main.py, test_main.py, logs/errors-since-deploy.txt
