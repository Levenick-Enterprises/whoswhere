# whoswhere

A digital magnet board for a construction foreman: list of projects, list of people, drag people between projects.

## Stack

- Next.js 16 (App Router) on Vercel
- Supabase (Postgres + Auth + Realtime)
- TypeScript, Tailwind v4, mobile-first
- `@dnd-kit` for drag-and-drop; tap-to-assign for touch-first flows

## Setup

```sh
pnpm install                       # install deps
./scripts/install-hooks.sh         # one-time: installs commit-msg hook
pnpm dev                           # start the dev server at http://localhost:3000
```

Env vars (copy `.env.example` → `.env.local`):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (browser-safe; starts with `sb_publishable_`)
- `SUPABASE_SECRET_KEY` (server-side only; starts with `sb_secret_`)

## Scripts

| Script              | Purpose                        |
| ------------------- | ------------------------------ |
| `pnpm dev`          | Run the dev server (Turbopack) |
| `pnpm build`        | Production build               |
| `pnpm start`        | Serve the production build     |
| `pnpm typecheck`    | `tsc --noEmit`                 |
| `pnpm lint`         | ESLint                         |
| `pnpm format`       | Prettier write                 |
| `pnpm format:check` | Prettier check                 |

## Conventions

- **Branches:** `feat/...`, `fix/...`, `chore/...` (conventional prefix + slug).
- **Commits:** Conventional Commits, enforced locally via `scripts/commit-msg`.
- **PRs:** open as draft → wait for Copilot review → address feedback → flip to ready (CI gated on `ready_for_review`).
- **Merge:** squash + delete branch.
- **Skills:** `/prep` for PR prep, `/release` for tagged releases. See `.claude/skills/`.
