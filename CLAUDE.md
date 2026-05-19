# Working notes for Claude

## Project

`whoswhere` is a small web app for a construction foreman to track which crew members are at which projects. Mental model: a digital magnet board. List of projects, list of people, drag people between projects. Mobile-first.

Each tenant is single-user with an obscure URL (no auth gate yet). Lives in `Levenick-Enterprises/whoswhere`.

## Stack

- Next.js 16 (App Router) on Vercel.
- Supabase (Postgres + Auth + Realtime). Auth deferred — see [Deployment topology](#deployment-topology).
- TypeScript, Tailwind v4, mobile-first (~375px baseline).
- `@dnd-kit` for drag-and-drop; tap-to-assign equally supported for touch.

## Deployment topology

Multiple Vercel projects + Supabase projects, all from the same git repo. Code is identical across environments; **differentiation happens at the env-var level per Vercel project**, not in app code.

### Environments

| URL                                            | Vercel project                                   | Supabase project           | Deploys when                                      |
| ---------------------------------------------- | ------------------------------------------------ | -------------------------- | ------------------------------------------------- |
| `dev.whos-where.com`                           | `whoswhere-dev`                                  | Dev (200-person demo seed) | Every push to `main`                              |
| `whoswhere-dev-git-<branch>-<team>.vercel.app` | `whoswhere-dev`                                  | Dev                        | Every push to a branch (Vercel auto preview URL)  |
| `demo.whos-where.com`                          | `whoswhere-demo` (NEW, git auto-deploy DISABLED) | Demo prod (clean)          | Only when `Deploy to prod tenant` GH Action fires |

> **Preview URLs:** Vercel's auto-generated `*.vercel.app` URL is what you share for a PR preview today. Branch-named subdomains under `dev.whos-where.com` were initially planned but Vercel's wildcard domains don't auto-route by branch slug — tracked in issue #20 for a follow-up GH Action that aliases each preview deployment.

### Deploying to a prod tenant

Prod tenants don't watch git. They only update when the **`Deploy to prod tenant`** workflow is manually triggered:

1. Repo → Actions tab → "Deploy to prod tenant" → Run workflow.
2. Pick the tenant from the dropdown (currently `demo`).
3. **Approve the deployment** in the workflow run page — the job is bound to the `production` GitHub environment, which requires a reviewer click before secrets unlock.
4. The workflow checks out `main`, builds, and ships via the Vercel CLI to that tenant's project.

Two layers of gate-keeping:

- **Manual trigger** — the workflow doesn't auto-fire on push.
- **Environment protection** — even after triggering, the job pauses for an explicit "Approve" click. Vercel secrets are scoped to the `production` environment, so a compromised non-production workflow can't read them.

### One-time `production` environment setup

Configured in repo **Settings → Environments → `production`**:

- **Required reviewers:** add yourself (self-review counts; the click is what enforces the gate).
- **Deployment branches:** restrict to `main`.
- **Environment secrets** (moved from repo-level secrets — only this protected job needs them):
  - `VERCEL_TOKEN`
  - `VERCEL_ORG_ID`
  - `VERCEL_PROJECT_ID_DEMO` (and any future `VERCEL_PROJECT_ID_<TENANT>` as tenants come online).

### Adding a new tenant (recipe)

When a real prod tenant needs to come online — e.g. `knutson.whos-where.com` for Curtis's company, Knutson Construction:

1. **Supabase**: create a new project. Note its `project-ref` from the dashboard URL.
2. **Register the tenant in two places** (do this BEFORE the bootstrap push so the wrapper can drive it):
   - `scripts/db.sh` — append `<tenant>` to `PROD_TENANT_NAMES` and the matching ref to `PROD_TENANT_REFS` at the same index.
   - `.github/workflows/deploy-prod.yml` — add `<tenant>` to `inputs.tenant.options` and a matching `case` arm in the resolver step.
3. **Bootstrap push**: `./scripts/db.sh push <tenant>`. The wrapper handles the link → push → relink-to-dev dance for the initial push too, so the CLI never gets stuck on the new prod tenant.
4. **Vercel**: create a new project linked to this repo. Settings → Git → disable production deployments. Paste the new Supabase URL + secret key into Production env vars. Settings → Domains → add `<tenant>.whos-where.com`.
5. **Cloudflare DNS**: add `<tenant>.whos-where.com` CNAME → `cname.vercel-dns.com`, DNS-only (grey cloud).
6. **GitHub `production` environment secrets**: add `VERCEL_PROJECT_ID_<TENANT>` (uppercase) to the `production` environment (Settings → Environments → production → Add environment secret), not the repo-wide secrets list.

### Applying schema migrations across tenants

Migrations live in `supabase/migrations/`. Use `scripts/db.sh` — it confirms before targeting prod, and always re-links the CLI back to dev on exit (even on error or Ctrl-C), so a stale prod link can't leak into a later session.

```sh
pnpm db:push                       # dev (wraps ./scripts/db.sh push dev)
./scripts/db.sh push demo          # any prod tenant; prompts for confirmation
```

The tenant list lives in `scripts/db.sh`'s `PROD_TENANT_NAMES` / `PROD_TENANT_REFS` arrays and mirrors `.github/workflows/deploy-prod.yml`'s case arms — both must be updated when adding a new tenant (see "Adding a new tenant" → step 5).

### Managing tenants (`pnpm tenant`)

Local CLI at `scripts/tenants.ts`. Talks to the Vercel API directly to inspect per-tenant Vercel projects + env-var state. `list` and `emails` are still useful diagnostic windows; `add-email` is **deprecated** as of #60 — see "Managing users" below for the current path.

```sh
pnpm tenant list                                   # table of tenants + URLs + allowlist counts (Vercel env state)
pnpm tenant emails <tenant>                        # show the legacy ALLOWED_EMAILS env var for one tenant
pnpm tenant add-email <tenant> <email@host>        # DEPRECATED — writes to Vercel ALLOWED_EMAILS, which no longer gates sign-in
```

Tenants are addressed by their display name: `dev` (project `whoswhere-dev`), `demo` (project `whoswhere-demo`), `<name>` (project `whoswhere-<name>`).

**Token setup.** Generate at https://vercel.com/account/tokens, scope to the `michaellevenick-1933` team, paste into `.env.local` as `VERCEL_API_TOKEN`. Token lives only on your laptop and encodes no persistent state — regenerate any time (lost laptop / rotate). The `.env.local` file is gitignored.

### Managing users (allowlist + roles)

The auth gate reads from a per-tenant Supabase table, **`public.app_users`** — `email text primary key, role text check (role in ('admin','audit')), created_at`. `admin` rows have full CRUD; `audit` rows can read the magnet board + detail views but can't create / edit / archive / restore / import / drag.

**Day-to-day: use the UI.** Admin signs in, hits **More → Manage users** to add/change-role/remove rows. Changes take effect immediately on the next sign-in attempt; on remove, the server also deletes the corresponding `auth.users` row via the admin API, which cascades to refresh tokens and effectively signs the user out globally on their next request (no waiting on the 30-day refresh-token TTL). Self-modification is blocked at the UI AND the server-action layer.

**Escape hatches for the cases the UI can't cover** — run from `./scripts/db.sh push <tenant>`-linked CLI:

```sh
# First-admin bootstrap on a fresh tenant. The /users UI requires an admin
# already in app_users, so the first row goes in via SQL.
supabase db query --linked "
  insert into public.app_users (email, role) values
    ('person@example.com', 'admin');
"

# Last-admin recovery. If you ever demote/remove your only admin row by
# accident (SQL typo on a fresh tenant, etc.), use SQL to fix it:
supabase db query --linked "update public.app_users set role = 'admin' where email = 'person@example.com';"

# Read-only inspection — handy for verifying state without touching the UI.
supabase db query --linked "select email, role, created_at from public.app_users order by email;"
```

**Where the gates live.** `private.is_admin()` (SECURITY DEFINER) is the authoritative check used by RLS policies on `projects` + `people` writes; server actions also call `adminGuard()` from `src/lib/auth.ts` so audit attempts surface a friendly "Read-only account" message instead of a generic RLS denial. Removed users keep their read access only until their next request — `deleteUser` cascades to sessions, and middleware's `auth.getUser()` returns null after that, redirecting to `/sign-in`.

### Auth + multi-tenant security

Each tenant Supabase project IS the auth realm — sessions don't cross tenant boundaries because each project has its own `auth.users` table and its own session cookies (tied to the project's domain).

**Sign-in flow.** `/sign-in` collects an email; the server action checks it against the per-tenant `public.app_users` table via `createAdminClient()` (service-role, RLS-bypassing — there's no user session yet, so RLS can't gate the read) and, if listed, calls `signInWithOtp`. The email contains a numeric one-time code (length set per-project in Supabase Auth → Providers → Email, default 8). Operator types the code into the `?sent=1` form, which calls `verifyOtp` server-side and mints a session cookie. The post-submit screen is identical regardless of allowlist outcome (no enumeration). `/sign-out` (POST) clears the session.

**Why no magic link in the email body.** Supabase's `signInWithOtp` generates a single token that backs both the typed code and the `{{ .ConfirmationURL }}` link. Mail prefetchers (Gmail, Apple Mail, spam scanners) follow the link's URL on receipt — that hit consumes the single-use token, after which typing the code also fails. Omitting `{{ .ConfirmationURL }}` from the Supabase email template eliminates the URL surface that prefetchers can attack while leaving the verify endpoint intact. The `/auth/callback` route and `emailRedirectTo` option in `signInWithOtp` are kept alive defensively — they cost nothing, handle in-flight emails sent before a template change, and preserve a re-enable path without code changes.

**Where the gate lives.** `src/middleware.ts` refreshes the cookie on every request and redirects unauthenticated traffic to `/sign-in`. Server components, server actions, and route handlers use `createSupabaseServerClient()` from `src/lib/supabase/server.ts` (cookie-backed, RLS-aware). `createAdminClient()` (secret-key, RLS-bypassing) in `src/lib/supabase/admin.ts` is reserved for the sign-in `app_users` lookup (no session yet at sign-in time) and future bulk imports / scripts / webhooks.

**RLS scope today.** Reads stay open for any authenticated user (`for select to authenticated using (true)` on `projects` + `people`). Writes are gated on `private.is_admin()`, which checks the caller's row in `app_users`. DELETE is still uncovered for the `authenticated` role (soft-delete only). When issue #8 (project-scoped permissions) ships, narrow further to `auth.uid()`-scoped policies.

**Per-tenant onboarding for auth.** When standing up a new tenant alongside the existing recipe in "Adding a new tenant":

1. Supabase dashboard → Authentication → URL Configuration: add `https://<tenant>.whos-where.com/auth/callback` to Redirect URLs. For dev also add `http://localhost:3000/auth/callback`.
2. Supabase dashboard → Authentication → Sign In / Up: **toggle OFF "Confirm email"**. Default is ON, which sends a separate "Confirm signup" email on first auth for any new user (uses a different template than "Magic Link", customizing only Magic Link leaves the first send broken). `app_users` is already the gate that vets who can sign in, so the confirm-signup step is redundant for whoswhere — turning it off means first-send and nth-send both use the Magic Link template, so there's only one template to customize.
3. Supabase dashboard → Authentication → Email Templates → Magic Link: replace the default body (which is just the link) with a code-first template. **Omit `{{ .ConfirmationURL }}` entirely** to deny mail prefetchers a URL to consume — see "Why no magic link in the email body" above. Suggested subject + body (the code-first ordering also gets the code into the lock-screen preview AND maximizes iOS one-time-code autofill from `<input autocomplete="one-time-code">`):

   ```
   Subject: {{ .Token }} is your whoswhere sign-in code

   Body:
   {{ .Token }} is your whoswhere sign-in code.
   This code expires in 1 hour.
   ```

4. Push pending migrations (`enable_authed_access` and everything after, including `add_app_users_and_role_split`): `./scripts/db.sh push <tenant>` (or `pnpm db:push` for dev).
5. **Seed the first admin row in `app_users`** — without this, sign-in is closed for everyone on the tenant. The operator's email goes in as `admin`:

   ```sh
   supabase db query --linked "
     insert into public.app_users (email, role) values
       ('<operator-email>', 'admin');
   "
   ```

6. Vercel project → Settings → Environment Variables, **Production scope only**:
   - `APP_ORIGIN` — the tenant's public URL (e.g. `https://demo.whos-where.com`). Pins `publicOrigin()` to avoid trusting `x-forwarded-host` for magic-link callbacks. Leave unset on Preview/Development scope so per-deploy preview URLs and local dev still work via header inference.
   - (`ALLOWED_EMAILS` is no longer required — the table is the gate. Existing tenants can delete the Vercel env var after smoke-testing the post-deploy sign-in path.)

### Deferred ops

- `whos-where.com` apex — no record yet; visitors hit Cloudflare's default. Revisit when there's actual landing-page content.
- Branch-named preview subdomains (`<branch>.dev.whos-where.com` or `pr1337.dev.whos-where.com`) — issue #20. Needs a GH Action that aliases each preview deploy. For now, use Vercel's auto `*.vercel.app` URLs.

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
