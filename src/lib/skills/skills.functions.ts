import { createServerFn } from "@tanstack/react-start";
import * as fs from "node:fs/promises";
import * as path from "node:path";

export type FluencyTier = "Beginner" | "Practicing" | "Proficient" | "Fluent";
export type Domain = "debugging" | "seo" | "design" | "backend" | "frontend" | "data" | "devops" | "writing" | "other";

export interface PracticeRun {
  id: string;
  scenario: string;
  passed: boolean;
  durationMs: number;
  at: string; // ISO
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  domain: Domain;
  tier: FluencyTier;
  iterations: number;
  iterationGoal: number;
  lastPracticedAt: string | null;
  passRateLast50: number; // 0..1
  recentRuns: PracticeRun[];
  gapAnalysis: string[];
  actionItems: { id: string; text: string; status: "in_progress" | "todo" | "done" }[];
  addedAt: string; // ISO
}

export interface SkillsSnapshot {
  skills: Skill[];
  generatedAt: string;
}

function tierFromIterations(iter: number): FluencyTier {
  if (iter >= 7500) return "Fluent";
  if (iter >= 4000) return "Proficient";
  if (iter >= 1500) return "Practicing";
  return "Beginner";
}

function demoSkills(): Skill[] {
  const now = Date.now();
  const seed: Array<Omit<Skill, "tier" | "recentRuns"> & { runs?: number }> = [
    {
      id: "debug-stack-trace",
      name: "Stack-trace Triage",
      description: "Read stack traces and isolate the failing frame fast.",
      domain: "debugging",
      iterations: 8420,
      iterationGoal: 10000,
      lastPracticedAt: new Date(now - 1000 * 60 * 4).toISOString(),
      passRateLast50: 0.98,
      gapAnalysis: ["Async stack frames sometimes mis-attributed."],
      actionItems: [{ id: "a1", text: "Add async cause-chain drills", status: "in_progress" }],
      addedAt: new Date(now - 1000 * 60 * 60 * 24 * 90).toISOString(),
    },
    {
      id: "seo-meta-tags",
      name: "SEO Meta Tags",
      description: "Write title/description/og tags that earn clicks.",
      domain: "seo",
      iterations: 5210,
      iterationGoal: 10000,
      lastPracticedAt: new Date(now - 1000 * 60 * 22).toISOString(),
      passRateLast50: 0.94,
      gapAnalysis: ["Title length drifts past 60 chars under 5% of runs."],
      actionItems: [{ id: "a2", text: "Tighten title-length validator", status: "in_progress" }],
      addedAt: new Date(now - 1000 * 60 * 60 * 24 * 60).toISOString(),
    },
    {
      id: "design-tokens",
      name: "Design Token Discipline",
      description: "Use semantic tokens, never raw colors in components.",
      domain: "design",
      iterations: 3120,
      iterationGoal: 10000,
      lastPracticedAt: new Date(now - 1000 * 60 * 60 * 2).toISOString(),
      passRateLast50: 0.9,
      gapAnalysis: ["Occasionally hardcodes hex in one-off pages."],
      actionItems: [{ id: "a3", text: "Lint rule: no-hex-in-tsx", status: "todo" }],
      addedAt: new Date(now - 1000 * 60 * 60 * 24 * 40).toISOString(),
    },
    {
      id: "rls-policies",
      name: "Supabase RLS",
      description: "Author safe row-level security policies with separate roles table.",
      domain: "backend",
      iterations: 1820,
      iterationGoal: 10000,
      lastPracticedAt: new Date(now - 1000 * 60 * 60 * 6).toISOString(),
      passRateLast50: 0.86,
      gapAnalysis: ["Forgets has_role helper on new tables ~10% of runs."],
      actionItems: [{ id: "a4", text: "Template scaffolder for new tables", status: "in_progress" }],
      addedAt: new Date(now - 1000 * 60 * 60 * 24 * 30).toISOString(),
    },
    {
      id: "react-state",
      name: "React State Modeling",
      description: "Pick the right state location and avoid effect loops.",
      domain: "frontend",
      iterations: 6700,
      iterationGoal: 10000,
      lastPracticedAt: new Date(now - 1000 * 60 * 12).toISOString(),
      passRateLast50: 0.96,
      gapAnalysis: ["Over-uses useEffect for derived values."],
      actionItems: [{ id: "a5", text: "Drill: derived-vs-stored decision", status: "in_progress" }],
      addedAt: new Date(now - 1000 * 60 * 60 * 24 * 120).toISOString(),
    },
    {
      id: "sql-windowing",
      name: "SQL Window Functions",
      description: "Use window functions for analytics without subquery sprawl.",
      domain: "data",
      iterations: 980,
      iterationGoal: 10000,
      lastPracticedAt: new Date(now - 1000 * 60 * 60 * 18).toISOString(),
      passRateLast50: 0.78,
      gapAnalysis: ["Confuses RANGE vs ROWS frame clauses."],
      actionItems: [{ id: "a6", text: "Frame-clause flashcards", status: "todo" }],
      addedAt: new Date(now - 1000 * 60 * 60 * 24 * 14).toISOString(),
    },
    {
      id: "edge-functions",
      name: "Edge Functions",
      description: "Write Worker-safe server functions; avoid Node-only APIs.",
      domain: "devops",
      iterations: 2400,
      iterationGoal: 10000,
      lastPracticedAt: new Date(now - 1000 * 60 * 60 * 4).toISOString(),
      passRateLast50: 0.88,
      gapAnalysis: ["Reaches for child_process before checking compat."],
      actionItems: [{ id: "a7", text: "Pre-flight compat checklist", status: "in_progress" }],
      addedAt: new Date(now - 1000 * 60 * 60 * 24 * 7).toISOString(),
    },
    {
      id: "copywriting",
      name: "Product Copywriting",
      description: "Short, scannable copy with clear CTAs.",
      domain: "writing",
      iterations: 4100,
      iterationGoal: 10000,
      lastPracticedAt: new Date(now - 1000 * 60 * 50).toISOString(),
      passRateLast50: 0.92,
      gapAnalysis: ["CTA verbs sometimes weak ('Submit')."],
      actionItems: [{ id: "a8", text: "CTA verb library", status: "todo" }],
      addedAt: new Date(now - 1000 * 60 * 60 * 24 * 21).toISOString(),
    },
    {
      id: "a11y-contrast",
      name: "A11y Color Contrast",
      description: "Hit WCAG AA contrast on every text/background pair.",
      domain: "design",
      iterations: 1340,
      iterationGoal: 10000,
      lastPracticedAt: new Date(now - 1000 * 60 * 60 * 30).toISOString(),
      passRateLast50: 0.83,
      gapAnalysis: ["Misses muted-on-surface combos."],
      actionItems: [{ id: "a9", text: "Auto-contrast linter", status: "in_progress" }],
      addedAt: new Date(now - 1000 * 60 * 60 * 24 * 3).toISOString(),
    },
  ];

  return seed.map((s) => {
    const tier = tierFromIterations(s.iterations);
    const recentRuns: PracticeRun[] = Array.from({ length: 8 }).map((_, i) => ({
      id: `${s.id}-r${i}`,
      scenario: ["happy-path", "edge-case", "regression", "stress"][i % 4],
      passed: Math.random() < s.passRateLast50,
      durationMs: 400 + Math.floor(Math.random() * 1800),
      at: new Date(now - 1000 * 60 * (i * 7 + 3)).toISOString(),
    }));
    return { ...s, tier, recentRuns } as Skill;
  });
}

async function tryReadManifests(): Promise<Skill[] | null> {
  try {
    const root = path.resolve("manifests");
    const stat = await fs.stat(root).catch(() => null);
    if (!stat || !stat.isDirectory()) return null;
    // Walk shallowly for *.skill.md / *.practice.md pairs (best-effort).
    const entries = await fs.readdir(root, { withFileTypes: true });
    const skills: Skill[] = [];
    for (const e of entries) {
      if (!e.isDirectory()) continue;
      // Stub: real impl would parse markdown frontmatter.
      skills.push({
        id: e.name,
        name: e.name.replace(/[-_]/g, " "),
        description: "Loaded from manifests/.",
        domain: "other",
        tier: "Beginner",
        iterations: 0,
        iterationGoal: 10000,
        lastPracticedAt: null,
        passRateLast50: 0,
        recentRuns: [],
        gapAnalysis: [],
        actionItems: [],
        addedAt: new Date().toISOString(),
      });
    }
    return skills.length ? skills : null;
  } catch {
    return null;
  }
}

export const getSkillsSnapshot = createServerFn({ method: "GET" }).handler(
  async (): Promise<SkillsSnapshot> => {
    const fromDisk = await tryReadManifests();
    return {
      skills: fromDisk ?? demoSkills(),
      generatedAt: new Date().toISOString(),
    };
  },
);