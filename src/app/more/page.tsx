import Link from "next/link";

import { CardSizeSetting } from "@/components/CardSizeSetting";
import { DragSpeedSetting } from "@/components/DragSpeedSetting";
import { ThemeSetting } from "@/components/ThemeSetting";
import { getCurrentUserRole } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const cardClass =
  "flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950";

const linkCardClass =
  "flex items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-white p-4 transition-colors hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700 dark:hover:bg-zinc-900";

const sectionLabelClass =
  "text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400";

export default async function MorePage() {
  const supabase = await createSupabaseServerClient();
  const canEdit = (await getCurrentUserRole()) === "admin";

  // Only admins can SELECT all of app_users (audit users only see their own
  // row via self_select_app_users RLS). Fetch the count conditionally so we
  // don't surface an RLS-denied count or a misleading "1" to audit users.
  // Trash counts moved to /more/data — only displayed there now.
  const [{ data: userData }, appUsersCountResult] = await Promise.all([
    supabase.auth.getUser(),
    canEdit
      ? supabase.from("app_users").select("*", { count: "exact", head: true })
      : Promise.resolve({ count: null, error: null }),
  ]);
  const user = userData.user;

  if (appUsersCountResult.error) {
    throw new Error(
      `Supabase app_users count failed: ${JSON.stringify(appUsersCountResult.error)}`,
    );
  }

  const appUsersCount = appUsersCountResult.count ?? 0;

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">More</h1>
        <p className="text-sm text-zinc-500">Less-frequent actions and admin views.</p>
      </header>

      <div className="flex flex-col gap-3">
        <h2 className={sectionLabelClass}>Display &amp; feel</h2>

        <section className="flex flex-col gap-6 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex flex-col gap-3">
            <h3 className="text-base font-semibold tracking-tight">Drag-and-drop speed</h3>
            <DragSpeedSetting />
          </div>

          <div className="flex flex-col gap-3">
            <h3 className="text-base font-semibold tracking-tight">Appearance</h3>
            <ThemeSetting />
          </div>

          <div className="flex flex-col gap-3">
            <h3 className="text-base font-semibold tracking-tight">Magnet size</h3>
            <CardSizeSetting />
          </div>
        </section>
      </div>

      {canEdit && (
        <>
          <div className="flex flex-col gap-3">
            <h2 className={sectionLabelClass}>Access</h2>

            <Link href="/users" className={linkCardClass}>
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="font-medium">Manage user access</span>
                <span className="text-xs text-zinc-500">Add, change role, or remove access.</span>
              </div>
              <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-xs tabular-nums text-zinc-500 dark:bg-zinc-900">
                {appUsersCount}
              </span>
            </Link>
          </div>

          <div className="flex flex-col gap-3">
            <h2 className={sectionLabelClass}>Data</h2>

            <Link href="/more/data" className={linkCardClass}>
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="font-medium">Data management</span>
                <span className="text-xs text-zinc-500">
                  Bulk import from a spreadsheet, restore deleted items.
                </span>
              </div>
            </Link>
          </div>
        </>
      )}

      <div className="flex flex-col gap-3">
        <h2 className={sectionLabelClass}>Account</h2>

        <form action="/sign-out" method="post" className={cardClass}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="font-medium">Signed in</span>
              <span className="truncate text-xs text-zinc-500">{user?.email ?? "Unknown"}</span>
            </div>
            <button
              type="submit"
              className="shrink-0 rounded-md bg-zinc-100 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-200 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Sign out
            </button>
          </div>
        </form>
      </div>

      <p className="pt-2 text-center text-xs tabular-nums text-zinc-400 dark:text-zinc-600">
        {buildLabel()}
      </p>
    </section>
  );
}

/** Short build identifier rendered in the More menu footer. Used to verify a
 * specific deploy is live on a given hostname. The NEXT_PUBLIC_BUILD_* values
 * are mapped from Vercel's VERCEL_GIT_* env vars in next.config.ts; Next.js
 * inlines them at compile time so they survive force-dynamic rendering. */
function buildLabel(): string {
  const sha = process.env.NEXT_PUBLIC_BUILD_SHA?.slice(0, 7) || null;
  const prNumber = process.env.NEXT_PUBLIC_BUILD_PR_NUM || null;

  if (prNumber && sha) return `Build: ${prNumber} (${sha})`;
  if (sha) return `Build: ${sha}`;
  return "Build: local";
}
