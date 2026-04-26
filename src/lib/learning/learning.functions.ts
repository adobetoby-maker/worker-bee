import { createServerFn } from "@tanstack/react-start";

export interface LiveStatus {
  running: boolean;
  sessionNumber: number;
  sessionsToday: number;
  messageNumber: number;
  totalMessages: number;
  currentTopic: string;
  recentMessages: { role: "claude" | "bee"; text: string; ts: string }[];
}

export interface CompletedSession {
  id: string;
  completedAt: string;
  topic: string;
  gapScore: number; // 0-100
  teachBackScore: number; // 0-10
  actionItem: string;
  reading: string;
  transcript: { role: "claude" | "bee"; text: string; ts: string }[];
}

export interface FluencySkill {
  skill: string;
  iterations: number;
  goal: number;
  tier: "Beginner" | "Practicing" | "Proficient" | "Fluent";
  failureRateTrend: "improving" | "declining" | "stable";
  failureRatePct: number;
}

export interface LearningSnapshot {
  live: LiveStatus;
  sessions: CompletedSession[];
  fluency: FluencySkill[];
  source: "manifests" | "demo";
  fetchedAt: string;
}

function tierFor(iters: number, goal: number): FluencySkill["tier"] {
  const pct = iters / goal;
  if (pct >= 1) return "Fluent";
  if (pct >= 0.5) return "Proficient";
  if (pct >= 0.15) return "Practicing";
  return "Beginner";
}

async function tryReadFromManifests(): Promise<LearningSnapshot | null> {
  try {
    // Dynamic require so the Worker bundle doesn't statically pull node:fs.
    // In Cloudflare Worker SSR there is no real FS — this will throw and we fall through.
    const fsMod = await import("node:fs/promises").catch(() => null);
    const pathMod = await import("node:path").catch(() => null);
    if (!fsMod || !pathMod) return null;

    const root = process.cwd();
    const sessionsDir = pathMod.join(root, "manifests", "practice", "learning-sessions");
    const pipelinesDir = pathMod.join(root, "manifests", "pipelines");

    let sessionFiles: string[] = [];
    try {
      sessionFiles = (await fsMod.readdir(sessionsDir)).filter((f) => f.endsWith(".json"));
    } catch {
      return null;
    }

    const sessions: CompletedSession[] = [];
    for (const f of sessionFiles) {
      try {
        const raw = await fsMod.readFile(pathMod.join(sessionsDir, f), "utf8");
        const j = JSON.parse(raw);
        sessions.push({
          id: j.id ?? f,
          completedAt: j.completedAt ?? j.completed_at ?? "",
          topic: j.topic ?? "Unknown topic",
          gapScore: Number(j.gapScore ?? j.gap_score ?? 0),
          teachBackScore: Number(j.teachBackScore ?? j.teach_back_score ?? 0),
          actionItem: j.actionItem ?? j.action_item ?? "",
          reading: j.reading ?? "",
          transcript: Array.isArray(j.transcript) ? j.transcript : [],
        });
      } catch {
        // skip bad file
      }
    }

    // Pipelines fluency
    const fluency: FluencySkill[] = [];
    try {
      const pipelines = await fsMod.readdir(pipelinesDir);
      for (const p of pipelines) {
        const pdir = pathMod.join(pipelinesDir, p);
        let entries: string[] = [];
        try { entries = await fsMod.readdir(pdir); } catch { continue; }
        for (const e of entries) {
          const m = e.match(/^skill-(.+)\.practice\.md$/);
          if (!m) continue;
          try {
            const raw = await fsMod.readFile(pathMod.join(pdir, e), "utf8");
            const iters = Number((raw.match(/iterations?:\s*(\d+)/i) ?? [])[1] ?? 0);
            const goal = Number((raw.match(/goal:\s*(\d+)/i) ?? [])[1] ?? 10000);
            const failPct = Number((raw.match(/failure[_ ]rate:?\s*([\d.]+)/i) ?? [])[1] ?? 0);
            const trendRaw = (raw.match(/trend:?\s*(improving|declining|stable)/i) ?? [])[1] ?? "stable";
            fluency.push({
              skill: `${p}/${m[1]}`,
              iterations: iters,
              goal,
              tier: tierFor(iters, goal),
              failureRateTrend: trendRaw.toLowerCase() as FluencySkill["failureRateTrend"],
              failureRatePct: failPct,
            });
          } catch {}
        }
      }
    } catch {}

    // Live status from optional file
    let live: LiveStatus = {
      running: false,
      sessionNumber: sessions.length,
      sessionsToday: sessions.length,
      messageNumber: 0,
      totalMessages: 0,
      currentTopic: "",
      recentMessages: [],
    };
    try {
      const liveRaw = await fsMod.readFile(
        pathMod.join(sessionsDir, "_live.json"),
        "utf8",
      );
      const lj = JSON.parse(liveRaw);
      live = {
        running: !!lj.running,
        sessionNumber: Number(lj.sessionNumber ?? sessions.length + 1),
        sessionsToday: Number(lj.sessionsToday ?? 6),
        messageNumber: Number(lj.messageNumber ?? 0),
        totalMessages: Number(lj.totalMessages ?? 0),
        currentTopic: String(lj.currentTopic ?? ""),
        recentMessages: Array.isArray(lj.recentMessages) ? lj.recentMessages.slice(-5) : [],
      };
    } catch {}

    return {
      live,
      sessions: sessions.sort((a, b) => (a.completedAt < b.completedAt ? 1 : -1)),
      fluency,
      source: "manifests",
      fetchedAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

function demoSnapshot(): LearningSnapshot {
  const now = new Date();
  const iso = (mAgo: number) =>
    new Date(now.getTime() - mAgo * 60_000).toISOString();
  return {
    live: {
      running: true,
      sessionNumber: 2,
      sessionsToday: 6,
      messageNumber: 8,
      totalMessages: 15,
      currentTopic: "TanStack Router loaders & error boundaries",
      recentMessages: [
        { role: "claude", text: "Explain how loaderDeps controls cache invalidation.", ts: iso(2) },
        { role: "bee", text: "loaderDeps returns an object that becomes part of the cache key. Returning the whole search object causes refetches on any param change.", ts: iso(2) },
        { role: "claude", text: "Good. What's wrong with returning the entire `search`?", ts: iso(1) },
        { role: "bee", text: "Deep equality fails on the full object — unrelated params trigger reloads. Return only the fields you actually use.", ts: iso(1) },
        { role: "claude", text: "Now teach it back: 3 sentences max.", ts: iso(0) },
      ],
    },
    sessions: [
      {
        id: "s1",
        completedAt: iso(95),
        topic: "Server functions vs server routes",
        gapScore: 80,
        teachBackScore: 8.0,
        actionItem: "Refactor /api/data fetch into a createServerFn handler.",
        reading: "TanStack Start — Server Functions section.",
        transcript: [
          { role: "claude", text: "When do you reach for createFileRoute server handlers?", ts: iso(110) },
          { role: "bee", text: "External APIs, webhooks, OAuth callbacks — anything an outside system calls.", ts: iso(108) },
          { role: "claude", text: "And createServerFn?", ts: iso(107) },
          { role: "bee", text: "Internal app logic called from loaders or components, with type-safe input validation.", ts: iso(106) },
        ],
      },
    ],
    fluency: [
      { skill: "tanstack/loaders", iterations: 847, goal: 10000, tier: "Beginner", failureRateTrend: "improving", failureRatePct: 12.4 },
      { skill: "tanstack/server-functions", iterations: 1620, goal: 10000, tier: "Practicing", failureRateTrend: "improving", failureRatePct: 8.1 },
      { skill: "supabase/rls", iterations: 5300, goal: 10000, tier: "Proficient", failureRateTrend: "stable", failureRatePct: 3.2 },
      { skill: "react/hooks", iterations: 10240, goal: 10000, tier: "Fluent", failureRateTrend: "stable", failureRatePct: 1.1 },
    ],
    source: "demo",
    fetchedAt: now.toISOString(),
  };
}

export const getLearningSnapshot = createServerFn({ method: "GET" }).handler(
  async (): Promise<LearningSnapshot> => {
    const fromDisk = await tryReadFromManifests();
    if (fromDisk && (fromDisk.sessions.length > 0 || fromDisk.fluency.length > 0)) {
      return fromDisk;
    }
    return demoSnapshot();
  },
);
