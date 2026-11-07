.DEFAULT_GOAL := help
SKILLS_HOME ?= $(HOME)/.claude/skills

help: ## Show this help
	@grep -E '^[a-z0-9-]+:.*## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*## "} {printf "  \033[36m%-10s\033[0m %s\n", $$1, $$2}'

install: ## Install tooling and link every skill into ~/.claude/skills
	npm install
	SKILLS_HOME="$(SKILLS_HOME)" ./scripts/link.sh

link: ## Link every skill into ~/.claude/skills (no npm)
	SKILLS_HOME="$(SKILLS_HOME)" ./scripts/link.sh

check: ## Validate every skill (frontmatter, size, referenced files, placeholders)
	node scripts/check.mjs

lint: check ## Format check and skill validation
	npx prettier --check .

format: ## Format everything
	npx prettier --write .

.PHONY: help install link check lint format
