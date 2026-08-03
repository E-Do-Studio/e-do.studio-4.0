#!/usr/bin/env bash
#
# Worktree bootstrap — run by Orca's setup hook (`scripts.setup` in orca.yaml)
# after every new worktree is created, and runnable by hand from any checkout:
#
#   bash scripts/worktree-setup.sh
#
# Idempotent and safe to re-run. It:
#   1. copies the env files (.env, .env.local) from the main checkout — they are
#      gitignored, so a fresh worktree has none and every data-driven page would
#      render empty (Strapi answers 401 without VITE_STRAPI_TOKEN)
#   2. installs dependencies (pnpm)
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

# Where to copy the gitignored env files from. Orca exports ORCA_ROOT_PATH (the
# main checkout); outside Orca, derive it from the shared .git dir, which every
# linked worktree points at.
SOURCE_CHECKOUT="${ORCA_ROOT_PATH:-$(dirname "$(cd "$ROOT" && git rev-parse --git-common-dir)")}"

log() { printf "\033[1;36m▸ %s\033[0m\n" "$1"; }
warn() { printf "\033[1;33m! %s\033[0m\n" "$1"; }

# ── 1. Env files ──────────────────────────────────────────────────────────
# Vite loads both .env and .env.local; scripts/*.mjs read .env explicitly
# (`node --env-file=.env`). Copy whichever the source checkout holds.
copied_env=0
for f in .env .env.local; do
  if [ -f "$ROOT/$f" ]; then
    log "$f already present — left untouched"
    copied_env=1
  elif [ -f "$SOURCE_CHECKOUT/$f" ]; then
    log "Copying $f from $SOURCE_CHECKOUT"
    cp "$SOURCE_CHECKOUT/$f" "$ROOT/$f"
    copied_env=1
  fi
done

if [ "$copied_env" -eq 0 ]; then
  cp "$ROOT/.env.example" "$ROOT/.env.local"
  warn "No .env/.env.local in $SOURCE_CHECKOUT — copied .env.example to .env.local."
  warn "It holds placeholders only: fill VITE_STRAPI_TOKEN and the Supabase keys,"
  warn "otherwise Strapi answers 401 and every CMS-driven page renders empty."
fi

# ── 2. Dependencies ───────────────────────────────────────────────────────
log "pnpm install"
pnpm install --frozen-lockfile || pnpm install

log "Worktree ready 🎉  Run: pnpm dev"
