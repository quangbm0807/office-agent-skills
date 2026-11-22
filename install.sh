#!/usr/bin/env bash
# Install the skills in this repo for one or more AI agents (macOS / Linux / Git Bash).
#
#   ./install.sh                     # all global locations
#   ./install.sh antigravity         # only Antigravity (global)
#   ./install.sh claude agents
#   ./install.sh --project ~/my-app  # into ~/my-app/.agents/skills (workspace)
#   ./install.sh --link antigravity  # symlink instead of copy (edits in the repo apply at once)
#
# Targets:
#   antigravity  ~/.gemini/config/skills and legacy ~/.gemini/antigravity/skills
#   claude       ~/.claude/skills   (Claude Code)
#   agents       ~/.agents/skills   (Codex and other agents using the shared folder)
#   gemini       ~/.gemini/skills   (Gemini CLI)
#   all          every target above
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SRC="$REPO/skills"
LINK=0
PROJECT=""
TARGETS=()

while [ $# -gt 0 ]; do
  case "$1" in
    --link) LINK=1 ;;
    --project) PROJECT="$2"; shift ;;
    -h|--help) sed -n '2,16p' "$0"; exit 0 ;;
    *) TARGETS+=("$1") ;;
  esac
  shift
done
[ ${#TARGETS[@]} -eq 0 ] && TARGETS=(all)

dests_for() {
  case "$1" in
    antigravity) echo "$HOME/.gemini/config/skills $HOME/.gemini/antigravity/skills" ;;
    claude) echo "$HOME/.claude/skills" ;;
    agents) echo "$HOME/.agents/skills" ;;
    gemini) echo "$HOME/.gemini/skills" ;;
    all) echo "$HOME/.gemini/config/skills $HOME/.gemini/antigravity/skills $HOME/.claude/skills $HOME/.agents/skills $HOME/.gemini/skills" ;;
    *) echo "Unknown target '$1'. Use: antigravity, claude, agents, gemini, all" >&2; exit 1 ;;
  esac
}

DESTS=()
if [ -n "$PROJECT" ]; then
  DESTS=("$(cd "$PROJECT" && pwd)/.agents/skills")
else
  for t in "${TARGETS[@]}"; do for d in $(dests_for "$t"); do DESTS+=("$d"); done; done
fi

for d in $(printf '%s\n' "${DESTS[@]}" | awk '!seen[$0]++'); do
  mkdir -p "$d"
  for s in "$SRC"/*/; do
    [ -f "$s/SKILL.md" ] || continue
    name="$(basename "$s")"
    to="$d/$name"
    if [ -L "$to" ] && [ $LINK -eq 0 ]; then echo "  skip $to (is a link, left untouched)"; continue; fi
    rm -rf "$to"
    if [ $LINK -eq 1 ]; then ln -s "${s%/}" "$to"; else cp -R "${s%/}" "$to"; fi
    echo "  installed $name -> $to"
  done
done

echo
echo "Done. Install the npm packages once if you have not:"
echo "  npm install -g pptxgenjs docx sharp react react-dom react-icons"
echo "Then check with:"
echo "  node \"$SRC/pptx-deck-builder/scripts/check_deps.js\""
