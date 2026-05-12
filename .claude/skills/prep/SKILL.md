---
name: prep
description: Prep the current branch for review — surface manual verification first, open as draft, run a Copilot review iteration with respectful pushback, decide when a second review is worth requesting, then flip to ready (CI runs; user merges). Invoke as /prep.
argument-hint: (none — operates on the current branch)
---

# Prep skill

Drives a feature/fix branch from "code is written" to "ready for CI" — same flow as the sibling projects Hearth and Bingecast, adapted for the Next.js / Supabase stack.

The skill has 11 steps. Stop after step 11 — **do not monitor CI**, the user will merge when green or surface failures themselves.

## Step 1 — Survey the branch

Establish what this PR is and isn't, so the rest of the steps have a shared mental model.

1. Capture the current branch and its diff vs `main`:
   ```bash
   BRANCH=$(git rev-parse --abbrev-ref HEAD)
   git fetch origin main >/dev/null 2>&1
   git log --oneline origin/main..HEAD
   git diff --stat origin/main..HEAD
   ```
2. If `BRANCH == main` or there are no commits ahead of main, stop and tell the user — there's nothing to prep.
3. Check whether a draft PR already exists for this branch:

   ```bash
   gh pr view --json number,isDraft,title,url 2>/dev/null
   ```

   - **PR exists, draft**: skip step 3 (already opened) and resume at step 4 (Copilot wait) or step 5 (address feedback) depending on whether a Copilot review has already landed.
   - **PR exists, ready**: stop and ask the user — they probably want `/prep` for a different branch, or want to re-request review manually.
   - **No PR**: continue to step 2.

## Step 2 — Manual verification gate

Propose a focused checklist of items the user should manually verify before the PR opens — not a full QA pass, just the things this diff specifically risks regressing. Use the file types touched as a guide:

- **React components / pages** (`src/app/...`, `src/components/...`): smoke test the route in `pnpm dev` on both mobile (375px viewport) and desktop. Check the golden path of the new feature + the most-likely regression area.
- **Server actions or route handlers** (`*/actions.ts`, `app/api/...`): trigger them through the UI; if they touch the DB, confirm a successful round-trip and that errors render gracefully.
- **Supabase migrations** (`supabase/migrations/*.sql`): apply locally with `supabase db reset` (destructive — confirm intent), regenerate types (`pnpm gen:types`), confirm seeded rows still load.
- **DnD / interaction code** (`@dnd-kit` configs, gesture handlers): test on real touch (long-press to initiate, scroll-doesn't-trigger), keyboard (Space to pick up, arrows to move), and pointer.
- **Tailwind layout changes**: spot-check the breakpoints at 375 / 640 / 1024 / 1280 — easy to break responsive flow when iterating on one size.
- **Env / dependency / build config** (`.env.example`, `package.json`, `next.config.ts`, `tsconfig.json`, `.github/workflows/...`): run `pnpm install`, `pnpm typecheck`, `pnpm lint`, `pnpm build` end-to-end locally. Vercel will catch what local doesn't, but the local fail is fast feedback.

Present the checklist to the user via `AskUserQuestion` with two options:

- **"Verified — proceed"** (recommended): user has tested or accepts the risk.
- **"Bypass — I'll verify later"**: user wants to ship the draft now and smoke after.

Do not silently skip this step. The whole point is to make the user pause before opening a PR they'd regret.

## Step 3 — Commit pending work, draft PR metadata, push + open

After step 2's verification passes, the skill runs hands-off through to the final report. **No more `AskUserQuestion` calls between here and step 9** — print decisions and proceed; the user can interject if something looks wrong.

**Commit any pending work first.** If the working tree has uncommitted changes relevant to this branch, commit them as a single conventional-commit-shaped commit (the squash-merge collapses inside-PR commits anyway). Don't ask — the user invoked `/prep`, which implies the work should ship. Pick the prefix from the dominant nature of the changes (`feat:` for new features, `fix:` for bugfixes, `chore:` for infrastructure, etc.). Stage explicit paths, not `git add -A`, to avoid accidentally including secrets or local-only artifacts.

Skip straight to PR metadata if the tree is already clean.

**Compose the PR metadata** from the commit history:

```bash
git log --format='%s%n%n%b' origin/main..HEAD
```

Title: a single conventional-commit-shaped sentence summarizing the branch (≤70 chars). Body: a `## Summary` section with the substantive bullets, followed by a `## Test plan` checklist mirroring the verification items from step 2. Print the title + body to the user as a visibility checkpoint — _don't_ prompt for confirmation; just show what's about to be opened so they can interject if they want a change.

**Pick the label** from the conventional-commit prefix on the lead commit: `feat:` → feature, `fix:` → bug, `chore:` → chore, `refactor:` → tech-debt, `docs:` → documentation. If no prefix matches, default to `chore`.

**Push and open as draft:**

```bash
git push -u origin "$BRANCH" 2>&1 | tail -3
gh pr create --draft --label <label> \
  --title "<title>" --body "$(cat <<'EOF'
<body>
EOF
)"
```

Capture `PR_URL` and `PR_NUM` from the create output for the rest of the flow.

## Step 4 — Wait for the first Copilot review

Per memory `reference_copilot_review.md`: Copilot fires once on PR-open (works on drafts), takes ~5–7 minutes, doesn't re-fire on subsequent pushes.

Poll in the background:

```bash
i=0
while true; do
  count=$(gh api repos/Levenick-Enterprises/whoswhere/pulls/$PR_NUM/reviews 2>/dev/null \
    | jq '[.[] | select(.user.login | test("copilot"; "i"))] | length')
  if [ "$count" -gt 0 ]; then
    echo "Copilot review landed after $((i*30))s"
    break
  fi
  if [ $i -ge 24 ]; then
    echo "Timed out after 12 min — re-check the PR; if Copilot didn't fire, request via gh pr edit --add-reviewer @copilot"
    break
  fi
  i=$((i+1))
  sleep 30
done
```

Use `Monitor` for a single-event watch, or `Bash` with `run_in_background: true`.

Once it lands, fetch and display:

```bash
gh api repos/Levenick-Enterprises/whoswhere/pulls/$PR_NUM/reviews \
  --jq '.[] | select(.user.login | test("copilot"; "i")) | "STATE: \(.state)\nSUBMITTED: \(.submitted_at)\nBODY:\n\(.body // "(none)")\n---"'

gh api repos/Levenick-Enterprises/whoswhere/pulls/$PR_NUM/comments \
  --jq '.[] | select(.user.login | test("copilot"; "i")) | "ID: \(.id)\nFILE: \(.path):\(.line // .original_line)\nBODY: \(.body)\n---"'
```

Bot-login quirk: `/reviews` returns `copilot-pull-request-reviewer[bot]`, `/comments` returns `Copilot`. The case-insensitive substring filter (`test("copilot"; "i")`) catches both.

## Step 5 — Address the feedback

For each inline comment, decide one of three:

1. **Fix it.** Make the change, batch into commits with the rest. **Do not reply** — per memory `feedback_pr_review_replies.md`, "Fixed in <SHA>" replies are noise. The fix commit is the documentation.

2. **Push back.** When Copilot is wrong (false-positive about TypeScript types, suggests an idiom that contradicts the project's, etc.), reply respectfully with the reasoning. Use the comment's `id` from step 4:

   ```bash
   gh api repos/Levenick-Enterprises/whoswhere/pulls/$PR_NUM/comments \
     -X POST \
     -f body="<respectful reply with reasoning>" \
     -F in_reply_to=<COMMENT_ID>
   ```

   Tone: collegial, evidence-based. Cite the commit SHA or file:line that backs the call.

3. **Defer.** When the comment is a real concern but out of scope for this PR. Reply with the deferral and reasoning, optionally file an issue and reference it.

Track decisions in a running list — the final report (step 9) needs them.

When you finish the address pass, push the fix commit(s):

```bash
git push 2>&1 | tail -3
```

## Step 6 — Decide on a second review

Use these criteria — be honest, not optimistic.

**Worth requesting** if any of:

- The fix commit added genuinely new logic (not just a rename, comment, or 1-line tweak).
- The fixes touched a different concern than the original review covered.
- A first-pass concern was deferred and you want a second opinion on the deferral.

**Skip** if:

- All fixes were mechanical.
- All fixes are within the same surface Copilot already reviewed once.
- You pushed back on most comments and want to ship.

State the call to the user explicitly: "I think a second pass is/isn't warranted because <reason>." Don't just decide silently.

If skipping, jump to step 9.

## Step 7 — Re-request review

Per memory `reference_copilot_review.md`, Copilot does NOT auto-re-fire on subsequent pushes. Request manually:

```bash
gh pr edit $PR_NUM --repo Levenick-Enterprises/whoswhere --add-reviewer @copilot
```

The literal `@copilot` (with `@`) is required — without it `gh` silently dedups since Copilot already reviewed an earlier SHA.

## Step 8 — Wait for and address the second review

Reuse the polling from step 4 and the address-feedback flow from step 5.

After this pass, **do not request a third round** unless one of these holds:

- You strongly believe Copilot will catch new material issues.
- The user explicitly asks for another round.

Default to stopping after pass 2.

## Step 9 — Final report

Print a summary to the user with:

- **Tweaks made**: bulleted list of substantive changes from the Copilot iterations.
- **Pushback**: bulleted list of comments where you disagreed, each with the one-line reasoning. The most useful part — it surfaces judgment calls the user should sanity-check before merging.
- **Deferred**: bulleted list of comments deferred to follow-up, with issue numbers if filed.

Format:

```
## Tweaks landed
- <bullet>

## Pushback
- <comment topic>: <reasoning>

## Deferred
- <comment topic> → issue #N (or: noted but no issue filed)
```

## Step 10 — Flip to ready

```bash
gh pr ready $PR_NUM
```

This is the trigger that fires CI (`.github/workflows/ci.yml` only runs on `ready_for_review`, not draft). Don't flip until you actually want CI to run.

## Step 11 — Stop

Tell the user the PR is ready, link the URL, and stop. Do **not** poll CI — that's the user's job from here. They'll come back with "merge it" or "CI is broken; help fix."

## Common pitfalls

- **Don't post "Fixed in <SHA>" replies.** Per memory `feedback_pr_review_replies.md`, only reply when disagreeing or deferring. The commit speaks for itself.
- **Don't flip to ready before addressing the first review.** Let the draft round absorb the easy nits first.
- **Don't bypass the verification step** without surfacing it. Step 2 is the _only_ mandatory `AskUserQuestion` in the skill — silently skipping it defeats the purpose.
- **Don't reintroduce check-ins between steps 2 and 9.** Beyond step 2, the skill is hands-off: commit, open, iterate, flip.
- **Don't run a third Copilot pass by reflex.** Trust the user to ask if they want one.

## References

- `CLAUDE.md` → "PR Workflow" section (draft-by-default, label policy, `@copilot` re-request idiom).
- `.github/workflows/ci.yml` → confirms `ready_for_review` is the trigger; staying draft means no CI burn.
- Sibling projects: Hearth + Bingecast — same skill, adapted from Swift/Xcode to Next.js.
