import { createServerFn } from "@tanstack/react-start";

export interface OvernightSummary {
  sessionsCompleted: number;
  skillsPracticed: number;
  iterationsLogged: number;
  failures: { skill: string; reason: string }[];
}

export interface SiteStatus {
  name: string;
  url: string;
  health: "green" | "yellow" | "red";
  note: string;
}

export interface PendingApproval {
  id: string;
  skill: string;
  changed: string;
  why: string;
}

export interface JayRequest {
  id: string;
  text: string;
  status: "open" | "in-progress" | "done" | "blocked";
  ts: string;
}

export interface ScheduledSession {
  time: string; // HH:MM
  topic: string;
  domain: string;
}

export interface MorningReport {
  generatedAt: string;
  overnight: OvernightSummary;
  sites: SiteStatus[];
  approvals: PendingApproval[];
  jayRequests: JayRequest[];
  schedule: ScheduledSession[];
  currentPriority: string;
  source: "manifests" | "demo";
}

function demo(): MorningReport {
  return {
    generatedAt: new Date().toISOString(),
    overnight: {
      sessionsCompleted: 4,
      skillsPracticed: 7,
      iterationsLogged: 312,
      failures: [
        { skill: "supabase/rls", reason: "policy regression on email_send_log" },
        { skill: "tanstack/loaders", reason: "loaderDeps returned full search object" },
      ],
    },
    sites: [
      { name: "worker-bee.app", url: "https://www.worker-bee.app", health: "green", note: "All checks passing" },
      { name: "preview", url: "https://id-preview--20ac6b45-0072-4478-af97-e326b9c711e1.lovable.app", health: "green", note: "Latest build OK" },
      { name: "published", url: "https://worker-bee.lovable.app", health: "yellow", note: "Slow TTFB on /learning (1.4s avg)" },
      { name: "api/public hooks", url: "/api/public", health: "green", note: "Cron pings 200" },
    ],
    approvals: [
      { id: "a1", skill: "tanstack/server-functions", changed: "Added inputValidator before handler", why: "Reduces failure rate from 8.1% to ~3% in practice runs" },
      { id: "a2", skill: "supabase/rls", changed: "New helper has_role() pattern", why: "Avoids recursive RLS on user_roles" },
    ],
    jayRequests: [
      { id: "j1", text: "Make the mobile layout actually usable", status: "done", ts: new Date(Date.now() - 8 * 3600_000).toISOString() },
      { id: "j2", text: "Add Practice + Learning dashboards", status: "done", ts: new Date(Date.now() - 6 * 3600_000).toISOString() },
      { id: "j3", text: "Investigate hydration mismatch on Header model", status: "open", ts: new Date(Date.now() - 2 * 3600_000).toISOString() },
    ],
    schedule: [
      { time: "07:30", topic: "TanStack loaders & loaderDeps", domain: "tanstack" },
      { time: "09:00", topic: "Supabase RLS patterns", domain: "supabase" },
      { time: "11:00", topic: "React Suspense boundaries", domain: "react" },
      { time: "13:30", topic: "Worker runtime constraints", domain: "platform" },
      { time: "15:30", topic: "Tailwind tokens vs raw classes", domain: "design" },
      { time: "17:00", topic: "Teach-back: today's failures", domain: "meta" },
    ],
    currentPriority: "",
    source: "demo",
  };
}

async function tryRead(): Promise<MorningReport | null> {
  try {
    const fs = await import("node:fs/promises").catch(() => null);
    const path = await import("node:path").catch(() => null);
    if (!fs || !path) return null;
    const file = path.join(process.cwd(), "manifests", "report", "morning.json");
    const raw = await fs.readFile(file, "utf8");
    const j = JSON.parse(raw);
    return { ...demo(), ...j, source: "manifests" };
  } catch {
    return null;
  }
}

export const getMorningReport = createServerFn({ method: "GET" }).handler(
  async (): Promise<MorningReport> => {
    return (await tryRead()) ?? demo();
  },
);

export const setPriority = createServerFn({ method: "POST" })
  .inputValidator((data: { priority: string }) => ({
    priority: String(data.priority ?? "").slice(0, 500),
  }))
  .handler(async ({ data }): Promise<{ ok: true; priority: string }> => {
    try {
      const fs = await import("node:fs/promises").catch(() => null);
      const path = await import("node:path").catch(() => null);
      if (fs && path) {
        const dir = path.join(process.cwd(), "manifests", "report");
        await fs.mkdir(dir, { recursive: true }).catch(() => {});
        await fs
          .writeFile(
            path.join(dir, "priority.json"),
            JSON.stringify({ priority: data.priority, ts: new Date().toISOString() }, null, 2),
          )
          .catch(() => {});
      }
    } catch {
      // Worker FS may be read-only — accept silently.
    }
    return { ok: true, priority: data.priority };
  });

export const decideApproval = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string; decision: "approve" | "reject" }) => ({
    id: String(data.id),
    decision: data.decision === "reject" ? ("reject" as const) : ("approve" as const),
  }))
  .handler(async ({ data }): Promise<{ ok: true; id: string; decision: "approve" | "reject" }> => {
    return { ok: true, id: data.id, decision: data.decision };
  });