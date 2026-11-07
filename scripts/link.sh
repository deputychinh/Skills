#!/usr/bin/env bash
# Links skills/<name> into $SKILLS_HOME/<name>. An existing real folder is moved aside to
# <name>.bak-<timestamp> (never deleted); an existing link is replaced.
set -euo pipefail
repo="$(cd "$(dirname "$0")/.." && pwd)"
home="${SKILLS_HOME:-$HOME/.claude/skills}"
mkdir -p "$home"
for dir in "$repo"/skills/*/; do
  name="$(basename "$dir")"
  target="$home/$name"
  if [ -L "$target" ]; then
    rm "$target"
  elif [ -e "$target" ]; then
    backup="$target.bak-$(date +%Y%m%d%H%M%S)"
    mv "$target" "$backup"
    echo "moved existing $name to $backup"
  fi
  ln -s "${dir%/}" "$target"
  echo "linked $name -> ${dir%/}"
done
