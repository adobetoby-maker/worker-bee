import { createServerFn } from "@tanstack/react-start";

export interface PracticeRun {
  id: string;
  skill: string;
  scenario: string;
  pass: boolean;
  durationMs: number;
  ts: string;
}

export interface SkillHealth {
  skill: string;
  runsToday: number;
  passRatePct: number;
  circuitBreakerActive: boolean;
}

export interface PracticeSnapshot {
  running: boolean;
  currentSkill: string;
  totalRunsToday: number;
  runsPerSkill: { skill: string; runs: number }[];
  feed: PracticeRun[];
  skills: SkillHealth[];
  source: "manifests" | "demo";
  fetchedAt: string;
}

const SKILLS = [
  "tanstack/loaders",
  "tanstack/server-functions",
  "tanstack/router-context",
  "supabase/rls",
  "supabase/auth",
  "react/hooks",
  "react/suspense",
  "tailwind/tokens",
  "vite/bundling",
];

const SCENARIOS = [
  "edge-case",
  "happy-path",
  "regression",
  "fuzz",
  "teach-back",
  "refactor",
];

function seededRand(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

function demoSnapshot(): PracticeSnapshot {
  // Use a stable seed derived from the 5-second polling bucket so SSR + first
  // client render match (avoids hydration mismatch), but the demo still
  // animates between polls.
  const bucket = Math.floor(Date.now() / 5000);
  const rand = seededRand(bucket);

  const feed: PracticeRun[] = [];
  for (let i = 0; i < 50; i++) {
    const skill = SKILLS[Math.floor(rand() * SKILLS.length)]!;
    const scenario = SCENARIOS[Math.floor(rand() * SCENARIOS.length)]!;
    const pass = rand() > 0.18;
    const duration = 200 + Math.floor(rand() * 4800);
    feed.push({
      id: `r-${bucket}-${i}`,
      skill,
      scenario,
      pass,
      durationMs: duration,
      ts: new Date(bucket * 5000 - i * 7000).toISOString(),
    });
  }

  const runsPerSkill = SKILLS.map((s) => ({
    skill: s,
    runs: feed.filter((f) => f.skill === s).length + Math.floor(rand() * 40),
  }));

  const skills: SkillHealth[] = SKILLS.map((s, i) => {
    const runs = runsPerSkill[i]!.runs;
    const passRate = Math.max(40, Math.min(100, 70 + rand() * 30));
    const circuitBreakerActive = passRate < 60;
    return {
      skill: s,
      runsToday: runs,
      passRatePct: Math.round(passRate * 10) / 10,
      circuitBreakerActive,
    };
  });

  const total = runsPerSkill.reduce((a, b) => a + b.runs, 0);
  const currentSkill = SKILLS[Math.floor(rand() * SKILLS.length)]!;

  return {
    running: true,
    currentSkill,
    totalRunsToday: total,
    runsPerSkill,
    feed,
    skills,
    source: "demo",
    fetchedAt: new Date(bucket * 5000).toISOString(),
  };
}

async function tryReadFromManifests(): Promise<PracticeSnapshot | null> {
  try {
    const fsMod = await import("node:fs/promises").catch(() => null);
    const pathMod = await import("node:path").catch(() => null);
    if (!fsMod || !pathMod) return null;

    const root = process.cwd();
    const dir = pathMod.join(root, "manifests", "practice", "runs");
    let files: string[] = [];
    try {
      files = (await fsMod.readdir(dir)).filter((f) => f.endsWith(".json"));
    } catch {
      return null;
    }
    if (files.length === 0) return null;

    const feed: PracticeRun[] = [];
    for (const f of files.slice(-50)) {
      try {
        const raw = await fsMod.readFile(pathMod.join(dir, f), "utf8");
        const j = JSON.parse(raw);
        feed.push({
          id: j.id ?? f,
          skill: j.skill ?? "unknown",
          scenario: j.scenario ?? "happy-path",
          pass: !!j.pass,
          durationMs: Number(j.durationMs ?? j.duration_ms ?? 0),
          ts: j.ts ?? new Date().toISOString(),
        });
      } catch {}
    }

    const bySkill = new Map<string, PracticeRun[]>();
    for (const r of feed) {
      if (!bySkill.has(r.skill)) bySkill.set(r.skill, []);
      bySkill.get(r.skill)!.push(r);
    }
    const runsPerSkill = [...bySkill.entries()].map(([skill, rs]) => ({
      skill,
      runs: rs.length,
    }));
    const skills: SkillHealth[] = runsPerSkill.map(({ skill, runs }) => {
      const rs = bySkill.get(skill)!;
      const passes = rs.filter((r) => r.pass).length;
      const passRate = rs.length ? (passes / rs.length) * 100 : 0;
      return {
        skill,
        runsToday: runs,
        passRatePct: Math.round(passRate * 10) / 10,
        circuitBreakerActive: passRate < 60 && rs.length >= 5,
      };
    });

    let live = { running: false, currentSkill: "" };
    try {
      const liveRaw = await fsMod.readFile(pathMod.join(dir, "_live.json"), "utf8");
      const lj = JSON.parse(liveRaw);
      live = {
        running: !!lj.running,
        currentSkill: String(lj.currentSkill ?? ""),
      };
    } catch {}

    return {
      running: live.running,
      currentSkill: live.currentSkill,
      totalRunsToday: feed.length,
      runsPerSkill,
      feed: feed.sort((a, b) => (a.ts < b.ts ? 1 : -1)),
      skills,
      source: "manifests",
      fetchedAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export const getPracticeSnapshot = createServerFn({ method: "GET" }).handler(
  async (): Promise<PracticeSnapshot> => {
    const fromDisk = await tryReadFromManifests();
    if (fromDisk && fromDisk.feed.length > 0) return fromDisk;
    return demoSnapshot();
  },
);