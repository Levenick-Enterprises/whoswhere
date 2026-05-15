// scripts/tenants.ts — local CLI for managing whoswhere tenants.
//
// Run via `pnpm tenant <command>`. The `tenant` script in package.json
// invokes tsx with `--env-file=.env.local`, so VERCEL_API_TOKEN loads
// automatically from there. Token is generated at
// https://vercel.com/account/tokens, scoped to the `michaellevenick-1933`
// team. Regenerate freely — it encodes no persistent state.
//
// Phase 1 commands: list, emails, add-email. Future phases will add
// remove-email, delete-tenant, create-tenant. Out of scope today.
//
// Tenant ↔ Vercel project naming convention (matches CLAUDE.md
// "Deployment topology"):
//
//   display name `dev`        ↔ Vercel project `whoswhere`
//   display name `demo`       ↔ Vercel project `whoswhere-demo`
//   display name `<tenant>`   ↔ Vercel project `whoswhere-<tenant>`
//
// Each tenant's public URL is derived from its display name:
//   `dev` → https://dev.whos-where.com, `<x>` → https://<x>.whos-where.com.

const VERCEL_API = "https://api.vercel.com";
const ALLOWED_EMAILS_KEY = "ALLOWED_EMAILS";

type VercelProject = {
  id: string;
  name: string;
};

type VercelEnv = {
  id: string;
  key: string;
  value: string;
  type: "plain" | "encrypted" | "secret" | "system" | "sensitive";
  target: string[];
};

// Vercel env entries are unique per (key, target), so ALLOWED_EMAILS can
// exist independently on production / preview / development. The CLI only
// manages the production allowlist (per CLAUDE.md "Per-tenant onboarding
// for auth" — preview + dev are unconfigured by design); the result type
// makes each non-OK state addressable so cmdList can render distinct
// placeholders instead of collapsing everything to "(unset)".
type AllowedEmailsResult =
  | { kind: "ok"; env: VercelEnv; emails: string[] }
  | { kind: "unset" }
  | { kind: "sensitive"; type: string };

const PRODUCTION_TARGET = "production";

// Vercel returns `value` for `plain` and `encrypted` types (encrypted-at-rest
// is just a storage detail — the API decrypts on read). It hides the value
// for `secret` (legacy v2) and `sensitive` (the newer dashboard toggle).
// `system` would only appear for built-ins like VERCEL_ENV and is never the
// shape we'd see for ALLOWED_EMAILS, but bucket it as unreadable so we never
// pretend we have its value.
const UNREADABLE_ENV_TYPES = new Set<VercelEnv["type"]>(["secret", "sensitive", "system"]);

function normalizeEmail(raw: string): string {
  return raw.trim().normalize("NFKC").toLowerCase();
}

function isValidEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

function projectToDisplay(projectName: string): string | null {
  if (projectName === "whoswhere") return "dev";
  if (projectName.startsWith("whoswhere-")) return projectName.slice("whoswhere-".length);
  return null;
}

function displayToProject(display: string): string {
  return display === "dev" ? "whoswhere" : `whoswhere-${display}`;
}

function tenantUrl(display: string): string {
  return `https://${display}.whos-where.com`;
}

function requireToken(): string {
  const token = process.env.VERCEL_API_TOKEN;
  if (!token) {
    console.error(
      "Missing VERCEL_API_TOKEN.\n" +
        "Set it in .env.local. Generate at https://vercel.com/account/tokens,\n" +
        "scoped to the michaellevenick-1933 team.",
    );
    process.exit(1);
  }
  return token;
}

async function vercelApi<T>(
  path: string,
  init: RequestInit = {},
  token: string = requireToken(),
): Promise<T> {
  const url = path.startsWith("http") ? path : `${VERCEL_API}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Vercel API ${res.status} ${res.statusText}: ${body}`);
  }
  return res.json() as Promise<T>;
}

async function listWhoswhereProjects(token: string): Promise<VercelProject[]> {
  // The Hobby plan has a handful of projects total; one page (default 20) is
  // enough. If this ever grows we'll need pagination via the `pagination.next`
  // cursor in the response.
  const data = await vercelApi<{ projects: VercelProject[] }>("/v10/projects", {}, token);
  return data.projects.filter((p) => p.name === "whoswhere" || p.name.startsWith("whoswhere-"));
}

async function getAllowedEmailsEnv(projectId: string, token: string): Promise<AllowedEmailsResult> {
  const data = await vercelApi<{ envs: VercelEnv[] }>(`/v10/projects/${projectId}/env`, {}, token);
  const env = data.envs.find(
    (e) => e.key === ALLOWED_EMAILS_KEY && e.target.includes(PRODUCTION_TARGET),
  );
  if (!env) return { kind: "unset" };
  if (UNREADABLE_ENV_TYPES.has(env.type)) return { kind: "sensitive", type: env.type };
  const emails = env.value.split(",").map(normalizeEmail).filter(Boolean);
  return { kind: "ok", env, emails };
}

async function resolveTenant(
  display: string,
  token: string,
): Promise<{ display: string; project: VercelProject }> {
  const projects = await listWhoswhereProjects(token);
  const want = displayToProject(display);
  const project = projects.find((p) => p.name === want);
  if (!project) {
    const known = projects
      .map((p) => projectToDisplay(p.name))
      .filter((d): d is string => d !== null)
      .sort();
    throw new Error(
      `Tenant '${display}' not found. Known tenants: ${known.join(", ") || "(none)"}`,
    );
  }
  return { display, project };
}

async function cmdList(): Promise<void> {
  const token = requireToken();
  const projects = await listWhoswhereProjects(token);
  if (projects.length === 0) {
    console.log("No whoswhere tenants found in this Vercel team.");
    return;
  }

  type Row = { display: string; url: string; emailCount: string; project: string };
  // Distinguish three failure modes that previously all rendered as
  // "(unset)" — actually unset, marked Sensitive (can't read value), and
  // genuine API/network failures. Operators reading the table can now tell
  // a misconfig from a real "no production allowlist yet".
  const rows: Row[] = await Promise.all(
    projects.map(async (p) => {
      const display = projectToDisplay(p.name) ?? p.name;
      let emailCount: string;
      try {
        const result = await getAllowedEmailsEnv(p.id, token);
        if (result.kind === "ok") emailCount = String(result.emails.length);
        else if (result.kind === "unset") emailCount = "(unset)";
        else emailCount = "(sensitive)";
      } catch {
        emailCount = "(error)";
      }
      return { display, url: tenantUrl(display), emailCount, project: p.name };
    }),
  );
  rows.sort((a, b) => a.display.localeCompare(b.display));

  const headers = { display: "TENANT", url: "URL", emailCount: "EMAILS", project: "PROJECT" };
  const widths = {
    display: Math.max(headers.display.length, ...rows.map((r) => r.display.length)),
    url: Math.max(headers.url.length, ...rows.map((r) => r.url.length)),
    emailCount: Math.max(headers.emailCount.length, ...rows.map((r) => r.emailCount.length)),
    project: Math.max(headers.project.length, ...rows.map((r) => r.project.length)),
  };
  const fmt = (r: Row | typeof headers) =>
    `${r.display.padEnd(widths.display)}  ${r.url.padEnd(widths.url)}  ${r.emailCount.padEnd(widths.emailCount)}  ${r.project}`;

  console.log(fmt(headers));
  for (const r of rows) console.log(fmt(r));
}

async function cmdEmails(display: string): Promise<void> {
  const token = requireToken();
  const { project } = await resolveTenant(display, token);
  const result = await getAllowedEmailsEnv(project.id, token);
  if (result.kind === "unset") {
    console.error(
      `${ALLOWED_EMAILS_KEY} is not set on the Production target for ${project.name}. ` +
        "Add it in the Vercel dashboard before using this CLI.",
    );
    process.exit(1);
  }
  if (result.kind === "sensitive") {
    console.error(
      `${ALLOWED_EMAILS_KEY} on ${project.name} is marked '${result.type}'. ` +
        "It must be Plain (not Sensitive) so the tool can read the current value. " +
        "Change it in the Vercel dashboard, then re-run.",
    );
    process.exit(1);
  }
  if (result.emails.length === 0) {
    console.log("(no emails set)");
    return;
  }
  for (const email of result.emails) console.log(email);
}

async function cmdAddEmail(display: string, rawEmail: string): Promise<void> {
  const email = normalizeEmail(rawEmail);
  if (!isValidEmail(email)) {
    console.error(`'${rawEmail}' doesn't look like a valid email address.`);
    process.exit(1);
  }

  const token = requireToken();
  const { project } = await resolveTenant(display, token);
  const result = await getAllowedEmailsEnv(project.id, token);
  if (result.kind === "unset") {
    console.error(
      `${ALLOWED_EMAILS_KEY} is not set on the Production target for ${project.name}. ` +
        "Add it in the Vercel dashboard before using this CLI.",
    );
    process.exit(1);
  }
  if (result.kind === "sensitive") {
    console.error(
      `${ALLOWED_EMAILS_KEY} on ${project.name} is marked '${result.type}'. ` +
        "It must be Plain (not Sensitive) so the tool can read the current value. " +
        "Change it in the Vercel dashboard, then re-run.",
    );
    process.exit(1);
  }

  if (result.emails.includes(email)) {
    console.log(`${email} is already in ${display}'s allowlist — no change.`);
    return;
  }

  const nextEmails = [...result.emails, email];
  await vercelApi(`/v10/projects/${project.id}/env/${result.env.id}`, {
    method: "PATCH",
    body: JSON.stringify({ value: nextEmails.join(",") }),
  });

  console.log(`Added ${email} to ${display}'s allowlist (${nextEmails.length} total).`);
  console.log(
    "Vercel will serve the new value on the next function cold start (~5 min). " +
      "To force-propagate now, redeploy via the Vercel dashboard or, for prod tenants, " +
      "the 'Deploy to prod tenant' GH workflow.",
  );
}

function usage(): never {
  console.error(
    [
      "Usage: pnpm tenant <command> [args]",
      "",
      "Commands:",
      "  list                          List all whoswhere tenants.",
      "  emails <tenant>               Show the allowed emails for a tenant.",
      "  add-email <tenant> <email>    Append an email to a tenant's allowlist.",
      "",
      "Tenants are addressed by their display name (e.g. `dev`, `demo`).",
    ].join("\n"),
  );
  process.exit(2);
}

async function main(): Promise<void> {
  const [, , command, ...rest] = process.argv;
  switch (command) {
    case "list":
      await cmdList();
      return;
    case "emails":
      if (rest.length !== 1) usage();
      await cmdEmails(rest[0]);
      return;
    case "add-email":
      if (rest.length !== 2) usage();
      await cmdAddEmail(rest[0], rest[1]);
      return;
    default:
      usage();
  }
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
