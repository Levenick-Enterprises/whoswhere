# Working notes for Claude

## Project

`whoswhere` is a small web app for a construction foreman to track which crew members are at which jobsites. Mental model: a digital magnet board. List of jobsites, list of people, drag people between jobsites. Mobile-first.

Each tenant is single-user with an obscure URL (no auth gate yet). Lives in `Levenick-Enterprises/whoswhere`.

## Stack

- Next.js 16 (App Router) on Vercel.
- Supabase (Postgres + Auth + Realtime). Auth deferred — see [Deployment topology](#deployment-topology).
- TypeScript, Tailwind v4, mobile-first (~375px baseline).
- `@dnd-kit` for drag-and-drop; tap-to-assign equally supported for touch.

## Deployment topology

Multiple Vercel projects + Supabase projects, all from the same git repo. Code is identical across environments; **differentiation happens at the env-var level per Vercel project**, not in app code.

### Environments

| URL                                        | Vercel project                                   | Supabase project           | Deploys when                                      |
| ------------------------------------------ | ------------------------------------------------ | -------------------------- | ------------------------------------------------- |
| `dev.whos-where.com`                       | `whoswhere` (existing)                           | Dev (200-person demo seed) | Every push to `main`                              |
| `whoswhere-git-<branch>-<team>.vercel.app` | `whoswhere` (existing)                           | Dev                        | Every push to a branch (Vercel auto preview URL)  |
| `demo.whos-where.com`                      | `whoswhere-demo` (NEW, git auto-deploy DISABLED) | Demo prod (clean)          | Only when `Deploy to prod tenant` GH Action fires |

> **Preview URLs:** Vercel's auto-generated `*.vercel.app` URL is what you share for a PR preview today. Branch-named subdomains under `dev.whos-where.com` were initially planned but Vercel's wildcard domains don't auto-route by branch slug — tracked in issue #20 for a follow-up GH Action that aliases each preview deployment.

### Deploying to a prod tenant

Prod tenants don't watch git. They only update when the **`Deploy to prod tenant`** workflow is manually triggered:

1. Repo → Actions tab → "Deploy to prod tenant" → Run workflow.
2. Pick the tenant from the dropdown (currently `demo`).
3. The workflow checks out `main`, builds, and ships via the Vercel CLI to that tenant's project.

The gate is deliberate — accidental merges shouldn't ship half-baked migrations to real users.

### Adding a new tenant (recipe)

When a real prod tenant needs to come online — e.g. `knutson.whos-where.com` for Curtis's company, Knutson Construction:

1. **Supabase**: create a new project; `supabase link --project-ref <new>`, `supabase db push`. **Do NOT** run `supabase db reset` (no demo seed in prod).
2. **Vercel**: create a new project linked to this repo. Settings → Git → disable production deployments. Paste the new Supabase URL + secret key into Production env vars. Settings → Domains → add `<tenant>.whos-where.com`.
3. **Cloudflare DNS**: add `<tenant>.whos-where.com` CNAME → `cname.vercel-dns.com`, DNS-only (grey cloud).
4. **GitHub repo secrets**: add `VERCEL_PROJECT_ID_<TENANT>` (uppercase) with the new project's ID.
5. **`.github/workflows/deploy-prod.yml`**: add `<tenant>` to `inputs.tenant.options` and a matching `case` arm in the resolver step.

### Applying schema migrations across tenants

Migrations live in `supabase/migrations/`. The dev DB auto-receives them via `pnpm db:push` while the supabase CLI is linked to the dev project (default state). For each prod tenant, after merging schema changes to `main` and before firing the deploy action:

```sh
supabase link --project-ref <tenant-ref>
pnpm db:push
supabase link --project-ref <dev-ref>   # restore the dev link
```

Once a second tenant ships, wrap this in `scripts/push-prod-migrations.sh` that loops over a list of refs.

### Auth + multi-tenant security

Each tenant URL is currently the credential (no auth gate). Risk: subdomain is guessable. Acceptable for the two-friend prototype scope (`demo` + a future `knutson`); revisit deferred-backlog issue #2 (Auth gate) before a third party gets a tenant.

### Deferred ops

- `whos-where.com` apex — no record yet; visitors hit Cloudflare's default. Revisit when there's actual landing-page content.
- Branch-named preview subdomains (`<branch>.dev.whos-where.com` or `pr1337.dev.whos-where.com`) — issue #20. Needs a GH Action that aliases each preview deploy. For now, use Vercel's auto `*.vercel.app` URLs.
- `scripts/push-prod-migrations.sh` — multi-tenant migration helper. Worth writing when tenant #2 is real.

## PR Workflow

- **Branches:** `feat/...`, `fix/...`, `chore/...` (conventional-commit prefix + slug).
- **Commits:** Conventional Commits, enforced locally by `scripts/commit-msg` (installed via `./scripts/install-hooks.sh`). The regex matches `feat|fix|chore|docs|refactor|test|build|ci|perf|style|revert(...)!?: ...`.
- **Open as draft by default.** Copilot reviews drafts (~5–7 min), CI is gated on `ready_for_review`. This keeps Actions minutes idle while iterating.
- **Re-request Copilot after fixes** with `gh pr edit <PR#> --add-reviewer @copilot` (literal `@`). Copilot does not auto-re-fire on subsequent pushes.
- **Reply policy:** silent on fixes (the commit is the documentation); reply only when disagreeing or deferring.
- **Merge strategy:** squash + delete branch.

## Skills

- **`/prep`** — formalized PR-prep workflow: survey → manual verification gate → commit → draft PR → Copilot review → address feedback → decide on re-review → flip to ready. See `.claude/skills/prep/SKILL.md`.
- **`/release`** — version bump + tag + GitHub Release. See `.claude/skills/release/SKILL.md`. Dev auto-deploys from `main`; prod tenants ship via the manual GH Action above.

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

Env: copy `.env.example` to `.env.local`, paste Supabase keys. Local dev points at the dev Supabase project by default.

## CI

`.github/workflows/ci.yml` runs on `pull_request` (`ready_for_review`-gated):

- `pnpm format:check`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm build`

No `push` trigger to main — Vercel handles the dev deploy on its own; the manual `deploy-prod.yml` workflow handles tenant prod deploys.
