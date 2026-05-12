---
name: release
description: Cut a new whoswhere release end-to-end — bump version in package.json, open + merge a chore PR with Copilot review and CI gating, tag the merge commit, publish a GitHub Release with auto-generated categorized notes, and close the matching milestone. Invoke as /release <patch|minor|major|X.Y.Z>.
argument-hint: [patch | minor | major | X.Y.Z]
---

# Release skill

Cuts a new release of whoswhere. Vercel auto-deploys `main` on every merge, so a "release" here is mostly a versioned milestone marker for changelog purposes — not a build/distribute step like the sibling iOS / macOS projects.

The user invokes this with `/release <kind>` where `<kind>` is one of `patch`, `minor`, `major`, or an explicit semver like `0.2.0`. If no arg is provided, ask before guessing.

The procedure has 9 steps. The tag at step 7 has to point at the merge commit produced in step 6, and the release at step 8 needs the tag at step 7.

## Step 1 — Determine the next version

1. Read the current version from `package.json`:
   ```bash
   node -p "require('./package.json').version"
   ```
2. Compute the next version from the arg:
   - `patch` → bump the third component (`0.1.1` → `0.1.2`)
   - `minor` → bump the second component, reset patch (`0.1.1` → `0.2.0`)
   - `major` → bump the first component, reset minor + patch (`0.1.1` → `1.0.0`). **Confirm with the user before proceeding** — `0.X` → `1.X` is a milestone the user owns.
   - Explicit `X.Y.Z` → use as-is, verify it sorts higher than the current.
3. State the computed version back to the user before continuing.

## Step 2 — Branch + bump + commit

1. Make sure you're on a fresh `main`:
   ```bash
   git checkout main && git pull --ff-only
   ```
2. Branch:
   ```bash
   git checkout -b chore/bump-X.Y.Z
   ```
3. Edit `package.json`'s `"version"` field to the new value. (Single occurrence; use `Edit`, not `npm version` — `npm version` creates its own commit + tag and we want full control.)
4. Source the headline PR list since the previous tag for the commit body:
   ```bash
   PREV_TAG=$(git tag -l "v*" | sort -V | tail -1)
   if [ -n "$PREV_TAG" ]; then
     PREV_DATE=$(git log -1 --format=%aI "$PREV_TAG")
     gh pr list --state merged --base main --search "merged:>$PREV_DATE" --limit 30 \
       --json number,title,labels \
       --jq '.[] | "#\(.number) \(.title) [\([.labels[].name] | join(","))]"'
   else
     # First release — list all merged PRs.
     gh pr list --state merged --base main --limit 30 \
       --json number,title,labels \
       --jq '.[] | "#\(.number) \(.title) [\([.labels[].name] | join(","))]"'
   fi
   ```
5. Commit with the conventional title `chore: bump X.Y.Z`. Body should:
   - List the headline PRs (filter to features + meaningful fixes; skip pure infra chores).
   - Note "Closes milestone vX.Y" if a matching open milestone exists.

## Step 3 — Push + open draft PR + flip to ready

1. Push:
   ```bash
   git push -u origin chore/bump-X.Y.Z
   ```
2. Open as draft (drafts get Copilot review without burning CI minutes):

   ```bash
   gh pr create --draft --title "chore: bump X.Y.Z" --label chore --body "$(cat <<'EOF'
   ## Summary
   <one-paragraph "what this is for">

   Headline changes since v<previous>:
   - <feature one-liners — terse; --generate-notes will produce the full categorized list at tag time>

   Closes milestone v<X.Y>.

   ## Test plan
   - [x] package.json version updated
   - [ ] CI passes
   - [ ] Post-merge: tag, gh release create, milestone close
   EOF
   )"
   ```

3. Flip to ready so CI fires:
   ```bash
   gh pr ready <PR#>
   ```
   Version-bump PRs are trivial enough to go straight to ready — Copilot won't have substantive comments, and CI on a 1-line `package.json` change is the only real gate.

## Step 4 — Wait for Copilot review

Per memory `reference_copilot_review.md`: Copilot fires once on PR-open (works on drafts), takes ~5–7 minutes.

```bash
i=0
while true; do
  count=$(gh api repos/Levenick-Enterprises/whoswhere/pulls/<PR#>/reviews 2>/dev/null \
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

For a 1-line bump Copilot usually has nothing actionable. If they flag something legitimate, fix on the same branch and push, then re-request:

```bash
gh pr edit <PR#> --repo Levenick-Enterprises/whoswhere --add-reviewer @copilot
```

## Step 5 — Wait for CI

Wait for every check to finish:

```bash
until [ "$(gh pr checks <PR#> --json state \
  --jq '[.[] | select(.state == "PENDING" or .state == "QUEUED" or .state == "IN_PROGRESS")] | length')" -eq 0 ]; do
  sleep 60
done
gh pr checks <PR#>
```

Fail-fast if any check reports `FAILURE`.

## Step 6 — Merge

```bash
gh pr merge <PR#> --squash --delete-branch
```

Capture the merge SHA from GitHub:

```bash
MERGE_SHA=$(gh pr view <PR#> --json mergeCommit --jq '.mergeCommit.oid')
git fetch origin main
```

## Step 7 — Tag the merge commit

```bash
git tag -a vX.Y.Z "$MERGE_SHA" -m "vX.Y.Z — <one-line summary>"
git push origin vX.Y.Z
```

The summary is 2–4 headline features. Don't push the tag before the merge lands — it must point at the merge commit.

## Step 8 — Create the GitHub Release

```bash
gh release create vX.Y.Z --generate-notes --title "vX.Y.Z — <same summary>"
```

`--generate-notes` reads `.github/release.yml` and groups merged PRs by label.

## Step 9 — Close the matching milestone

```bash
MILESTONE_NUM=$(gh api 'repos/Levenick-Enterprises/whoswhere/milestones?state=open' \
  --jq '.[] | select(.title == "vX.Y") | .number')
if [ -n "$MILESTONE_NUM" ]; then
  gh api -X PATCH "repos/Levenick-Enterprises/whoswhere/milestones/$MILESTONE_NUM" -f state=closed
fi
```

If no matching open milestone exists, skip silently.

## Final summary to the user

- Release URL
- Tag (`vX.Y.Z`)
- Merge commit SHA
- Confirmation the milestone closed (if applicable)
- Note: **Vercel deploys main automatically — no manual distribute step.** The release page is the human-readable milestone marker; the running site is already at the merge SHA.

## Common pitfalls

- **Don't skip CI even on a 1-line bump.**
- **Don't push the tag before the merge lands on main.** The tag has to point at the merge commit.
- **Don't bump major (`0.X` → `1.X`) without explicit confirmation.**
- **Don't re-use a tag that already exists.** If `vX.Y.Z` already points somewhere, stop and ask the user.

## References

- `.github/release.yml` → label → category mapping that `--generate-notes` reads.
- Memory: `reference_copilot_review.md` (Copilot polling pattern + bot-login quirks).
