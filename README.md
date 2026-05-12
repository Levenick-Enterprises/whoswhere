# whoswhere

A digital magnet board for a construction foreman: list of jobsites, list of people, drag people between jobsites.

## Stack

- Next.js 15 (App Router) on Vercel
- Supabase (Postgres + Auth + Realtime)
- TypeScript, Tailwind, mobile-first
- `@dnd-kit` for drag-and-drop; tap-to-assign for touch-first flows

## Setup

```sh
pnpm install                       # install deps
./scripts/install-hooks.sh         # one-time: installs commit-msg hook
pnpm dev                           # start the dev server
```

Env vars (copy `.env.example` → `.env.local`):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server-side only)

## Conventions

- **Branches:** `feat/...`, `fix/...`, `chore/...` (conventional prefix + slug).
- **Commits:** Conventional Commits, enforced locally via `scripts/commit-msg`.
- **PRs:** open as draft → wait for Copilot review → address feedback → flip to ready (CI gated on `ready_for_review`).
- **Merge:** squash + delete branch.
- **Skills:** `/prep` for PR prep, `/release` for tagged releases. See `.claude/skills/`.
