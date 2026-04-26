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

/* ------------------------------------------------------------------ */
/* Real manifests/ parser                                             */
/* ------------------------------------------------------------------ */

const VALID_DOMAINS: Domain[] = [
  "debugging", "seo", "design", "backend", "frontend",
  "data", "devops", "writing", "other",
];

/** Walk a directory recursively, collecting files matching `predicate`. */
async function walk(
  dir: string,
  predicate: (filename: string) => boolean,
  out: string[] = [],
): Promise<string[]> {
  let entries: import("node:fs").Dirent[];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      await walk(full, predicate, out);
    } else if (e.isFile() && predicate(e.name)) {
      out.push(full);
    }
  }
  return out;
}

/** Minimal YAML-ish frontmatter parser — supports scalars, quoted strings, numbers, booleans. */
function parseFrontmatter(src: string): {
  data: Record<string, string | number | boolean>;
  body: string;
} {
  const m = src.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return { data: {}, body: src };
  const data: Record<string, string | number | boolean> = {};
  for (const rawLine of m[1].split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let val = line.slice(idx + 1).trim();
    // Strip surrounding quotes
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    // Coerce
    if (val === "true") data[key] = true;
    else if (val === "false") data[key] = false;
    else if (val !== "" && !Number.isNaN(Number(val))) data[key] = Number(val);
    else data[key] = val;
  }
  return { data, body: m[2] };
}

/** Pull a `## Heading` block out of markdown body (case-insensitive). */
function extractSection(body: string, heading: string): string {
  const re = new RegExp(
    `^##\\s+${heading.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")}\\s*\\r?\\n([\\s\\S]*?)(?=^##\\s|\\Z)`,
    "im",
  );
  const m = body.match(re);
  return m ? m[1].trim() : "";
}

/** Parse markdown task-list lines into action items. Supports `- [ ]`, `- [~]`, `- [x]`. */
function parseActionItems(section: string): Skill["actionItems"] {
  if (!section) return [];
  const items: Skill["actionItems"] = [];
  let n = 0;
  for (const rawLine of section.split(/\r?\n/)) {
    const m = rawLine.match(/^\s*[-*]\s+\[(.)\]\s+(.+?)\s*$/);
    if (!m) continue;
    const mark = m[1].toLowerCase();
    const status: Skill["actionItems"][number]["status"] =
      mark === "x" ? "done" : mark === "~" || mark === "/" ? "in_progress" : "todo";
    items.push({ id: `item-${++n}`, text: m[2], status });
  }
  return items;
}

/** Parse `- ` bullet list lines into plain strings. */
function parseBullets(section: string): string[] {
  if (!section) return [];
  return section
    .split(/\r?\n/)
    .map((l) => l.match(/^\s*[-*]\s+(.+?)\s*$/)?.[1])
    .filter((x): x is string => Boolean(x));
}

function coerceDomain(value: unknown): Domain {
  return typeof value === "string" && (VALID_DOMAINS as string[]).includes(value)
    ? (value as Domain)
    : "other";
}

function safeIso(value: unknown, fallback: string): string {
  if (typeof value !== "string" || !value) return fallback;
  const t = Date.parse(value);
  return Number.isFinite(t) ? new Date(t).toISOString() : fallback;
}

async function loadSkillFile(file: string): Promise<Skill | null> {
  let src: string;
  try {
    src = await fs.readFile(file, "utf8");
  } catch {
    return null;
  }
  const { data, body } = parseFrontmatter(src);
  const id =
    typeof data.id === "string" && data.id
      ? data.id
      : path.basename(file).replace(/\.skill\.md$/i, "");

  // Description: prefer frontmatter `description`, else first paragraph of `## Description`
  // (or first paragraph of body).
  let description = typeof data.description === "string" ? data.description : "";
  if (!description) {
    const descSection = extractSection(body, "Description");
    const firstPara = (descSection || body).trim().split(/\r?\n\s*\r?\n/)[0] ?? "";
    description = firstPara.replace(/\s+/g, " ").trim();
  }

  const iterations = typeof data.iterations === "number" ? data.iterations : 0;
  const iterationGoal =
    typeof data.iterationGoal === "number" && data.iterationGoal > 0
      ? data.iterationGoal
      : 10000;
  const tier = tierFromIterations(iterations);
  const passRateLast50 =
    typeof data.passRateLast50 === "number"
      ? Math.max(0, Math.min(1, data.passRateLast50))
      : 0;

  return {
    id,
    name: typeof data.name === "string" && data.name ? data.name : id,
    description: description || "(no description)",
    domain: coerceDomain(data.domain),
    tier,
    iterations,
    iterationGoal,
    lastPracticedAt: null, // filled in by run merger
    passRateLast50,        // overridden by run merger when runs exist
    recentRuns: [],
    gapAnalysis: parseBullets(extractSection(body, "Gap analysis")),
    actionItems: parseActionItems(extractSection(body, "Action items")),
    addedAt: safeIso(data.addedAt, new Date(0).toISOString()),
  };
}

interface RawRun {
  id?: string;
  skillId?: string;
  scenario?: string;
  passed?: boolean;
  durationMs?: number;
  at?: string;
}

async function loadRuns(runsDir: string): Promise<Map<string, PracticeRun[]>> {
  const files = await walk(runsDir, (n) => n.endsWith(".json"));
  const bySkill = new Map<string, PracticeRun[]>();
  for (const file of files) {
    let raw: RawRun;
    try {
      raw = JSON.parse(await fs.readFile(file, "utf8")) as RawRun;
    } catch {
      continue;
    }
    if (!raw.skillId || typeof raw.skillId !== "string") continue;
    const run: PracticeRun = {
      id: raw.id ?? path.basename(file, ".json"),
      scenario: typeof raw.scenario === "string" ? raw.scenario : "unknown",
      passed: Boolean(raw.passed),
      durationMs: typeof raw.durationMs === "number" ? raw.durationMs : 0,
      at: safeIso(raw.at, new Date(0).toISOString()),
    };
    const arr = bySkill.get(raw.skillId) ?? [];
    arr.push(run);
    bySkill.set(raw.skillId, arr);
  }
  // Newest first.
  for (const arr of bySkill.values()) {
    arr.sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  }
  return bySkill;
}

/**
 * Load all skills from `manifests/skills/<domain>/<id>.skill.md` and merge
 * with practice runs from `manifests/practice/runs/*.json`. Returns null
 * (so caller falls back to demo data) only when no skill files are found.
 */
async function tryReadManifests(): Promise<Skill[] | null> {
  const root = path.resolve(process.cwd(), "manifests");
  const rootStat = await fs.stat(root).catch(() => null);
  if (!rootStat?.isDirectory()) return null;

  const skillsDir = path.join(root, "skills");
  const skillFiles = await walk(skillsDir, (n) => /\.skill\.md$/i.test(n));
  if (skillFiles.length === 0) return null;

  const parsed = await Promise.all(skillFiles.map(loadSkillFile));
  const skills = parsed.filter((s): s is Skill => Boolean(s));

  // Merge practice runs.
  const runs = await loadRuns(path.join(root, "practice", "runs"));
  for (const skill of skills) {
    const r = runs.get(skill.id) ?? [];
    skill.recentRuns = r.slice(0, 50);
    if (skill.recentRuns.length > 0) {
      skill.lastPracticedAt = skill.recentRuns[0].at;
      const passed = skill.recentRuns.filter((x) => x.passed).length;
      skill.passRateLast50 = passed / skill.recentRuns.length;
    }
  }

  // Stable order: most-iterated first.
  skills.sort((a, b) => b.iterations - a.iterations);
  return skills;
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