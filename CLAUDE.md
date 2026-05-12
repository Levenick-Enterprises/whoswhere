# Working notes for Claude

## Project

`whoswhere` is a small web app for a construction foreman to track which crew members are at which jobsites. Mental model: a digital magnet board. List of jobsites, list of people, drag people between jobsites. Mobile-first.

V1 is single-user with an obscure URL (no auth). Lives in `Levenick-Enterprises/whoswhere`.

## Stack

- Next.js 16 (App Router) on Vercel — auto-deploys `main` on merge.
- Supabase (Postgres + Auth + Realtime). Auth deferred for v1.
- TypeScript, Tailwind v4, mobile-first (~375px baseline).
- `@dnd-kit` for drag-and-drop; tap-to-assign equally supported for touch.

## PR Workflow

- **Branches:** `feat/...`, `fix/...`, `chore/...` (conventional-commit prefix + slug).
- **Commits:** Conventional Commits, enforced locally by `scripts/commit-msg` (installed via `./scripts/install-hooks.sh`). The regex matches `feat|fix|chore|docs|refactor|test|build|ci|perf|style|revert(...)!?: ...`.
- **Open as draft by default.** Copilot reviews drafts (~5–7 min), CI is gated on `ready_for_review`. This keeps Actions minutes idle while iterating.
- **Re-request Copilot after fixes** with `gh pr edit <PR#> --add-reviewer @copilot` (literal `@`). Copilot does not auto-re-fire on subsequent pushes.
- **Reply policy:** silent on fixes (the commit is the documentation); reply only when disagreeing or deferring.
- **Merge strategy:** squash + delete branch.

## Skills

- **`/prep`** — formalized PR-prep workflow: survey → manual verification gate → commit → draft PR → Copilot review → address feedback → decide on re-review → flip to ready. See `.claude/skills/prep/SKILL.md`.
- **`/release`** — version bump + tag + GitHub Release. See `.claude/skills/release/SKILL.md`. Vercel handles deploys; no manual distribute step.

## Release workflow

PRs get one of these labels — they map to changelog categories via `.github/release.yml`:

- `feature` / `enhancement` → New Features
- `bug` → Bug Fixes
- `chore` / `tech-debt` → Maintenance & Cleanup
- `documentation` → Documentation
- (unlabeled) → Other Changes
- `duplicate` / `invalid` / `wontfix` → excluded from changelogs

## Local dev

```sh
pnpm install
./scripts/install-hooks.sh   # one-time
pnpm dev                     # http://localhost:3000
```

Env: copy `.env.example` to `.env.local`, paste Supabase keys.

## CI

`.github/workflows/ci.yml` runs on `pull_request` (`ready_for_review`-gated):

- `pnpm format:check`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm build`

No `push` trigger to main — Vercel handles main builds.
