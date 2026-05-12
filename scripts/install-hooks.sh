#!/usr/bin/env bash
# install-hooks.sh — copies versioned git hooks into .git/hooks/
# Run this once after cloning the repo.

set -euo pipefail

repo_root="$(cd "$(dirname "$0")/.." && pwd)"
hooks_src="$repo_root/scripts"
hooks_dst="$repo_root/.git/hooks"

if [ ! -d "$hooks_dst" ]; then
  echo "✘ $hooks_dst not found — is this a git repo?" >&2
  exit 1
fi

install_hook() {
  local name="$1"
  local src="$hooks_src/$name"
  local dst="$hooks_dst/$name"
  cp "$src" "$dst"
  chmod +x "$dst"
  echo "✓ installed $name"
}

install_hook commit-msg

echo ""
echo "Hooks installed:"
echo "  commit-msg — enforces Conventional Commits"
