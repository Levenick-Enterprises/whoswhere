#!/usr/bin/env bash
# scripts/db.sh — safe wrapper for Supabase migration commands.
#
# Replaces the manual `supabase link --project-ref X / db push / link back-to-dev`
# dance with a single command that:
#   1. Knows the tenant→ref mapping in one place (no copy-paste typos).
#   2. Prompts for confirmation before targeting any non-dev tenant.
#   3. Always re-links the CLI to the dev project on exit (even on error or
#      Ctrl-C), so a stale prod link can't leak into a later session.
#
# Run `./scripts/db.sh` with no arguments for usage. See CLAUDE.md
# → "Applying schema migrations across tenants" for context.
#
# Compat: written for bash 3.2 (macOS default). No associative arrays.

set -euo pipefail

DEV_REF="mwnhyyrocyterqokxwwv"

# Prod tenant registry. Parallel arrays: index N in NAMES corresponds to the
# Supabase project ref at index N in REFS. Add new tenants here AND in the
# `case` arm of .github/workflows/deploy-prod.yml.
PROD_TENANT_NAMES=("demo")
PROD_TENANT_REFS=("tmhghhqrpmgtzhawafoo")

LINKED_TO_PROD=0
TRAP_RAN=0

restore_dev_link() {
  # Idempotent: bash fires both the INT trap and the EXIT trap on Ctrl-C, so
  # this function gets called twice. Run-once guard keeps the output clean.
  if [[ "$TRAP_RAN" == "1" ]]; then
    return
  fi
  TRAP_RAN=1

  # Only restore if we changed the link away from dev. Keeps usage-error /
  # `push dev` paths silent.
  if [[ "$LINKED_TO_PROD" == "0" ]]; then
    return
  fi

  # Once we've committed to relinking, ignore further interrupts. A half-
  # completed `supabase link` leaves linked-project.json with project_ref=null,
  # which is worse than waiting a couple seconds for the link to finish.
  # supabase link is fast; if it ever hangs you can kill -9 the bash process.
  trap '' INT TERM

  echo ""
  echo "→ Re-linking Supabase CLI to dev (${DEV_REF})..."
  supabase link --project-ref "${DEV_REF}" >/dev/null 2>&1 || true
}
# INT/TERM: cleanup, then exit 130 — without the explicit exit, bash's
# default is to run the trap and *resume* the script at the next line, which
# means a Ctrl-C mid-`push demo` would relink to dev and then keep running
# the rest of cmd_push (the push itself) against dev. Not what we want.
# EXIT: cleanup only (script is already on its way out).
trap 'restore_dev_link; exit 130' INT TERM
trap restore_dev_link EXIT

resolve_ref() {
  local tenant="$1"
  if [[ "$tenant" == "dev" ]]; then
    echo "$DEV_REF"
    return
  fi
  local i
  for i in "${!PROD_TENANT_NAMES[@]}"; do
    if [[ "${PROD_TENANT_NAMES[$i]}" == "$tenant" ]]; then
      echo "${PROD_TENANT_REFS[$i]}"
      return
    fi
  done
  echo "Unknown tenant: '$tenant'" >&2
  echo "Known tenants: dev ${PROD_TENANT_NAMES[*]}" >&2
  exit 2
}

cmd_push() {
  local tenant="${1:-}"
  if [[ -z "$tenant" ]]; then
    echo "Usage: scripts/db.sh push <tenant>" >&2
    exit 2
  fi
  local ref
  ref="$(resolve_ref "$tenant")"

  if [[ "$tenant" != "dev" ]]; then
    echo "⚠  About to push migrations to PROD tenant: $tenant ($ref)"
    read -r -p "    Type '$tenant' to confirm: " confirm
    if [[ "$confirm" != "$tenant" ]]; then
      echo "Aborted."
      exit 1
    fi
    LINKED_TO_PROD=1
  fi

  echo "→ Linking to $tenant ($ref)..."
  supabase link --project-ref "$ref"
  echo "→ Pushing migrations..."
  supabase db push
}

case "${1:-}" in
  push)
    shift
    cmd_push "$@"
    ;;
  *)
    cat >&2 <<EOF
Usage: scripts/db.sh <command> [args]

Commands:
  push <tenant>    Apply pending migrations to <tenant>. Confirms before any
                   non-dev tenant. Always relinks to dev on exit.

Tenants: dev ${PROD_TENANT_NAMES[*]}
EOF
    exit 2
    ;;
esac
