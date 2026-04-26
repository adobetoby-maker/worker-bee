import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

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
  source: "live" | "empty";
  fetchedAt: string;
}

function aggregate(rows: PracticeRun[]): Pick<PracticeSnapshot, "runsPerSkill" | "skills" | "totalRunsToday"> {
  const bySkill = new Map<string, PracticeRun[]>();
  for (const r of rows) {
    if (!bySkill.has(r.skill)) bySkill.set(r.skill, []);
    bySkill.get(r.skill)!.push(r);
  }
  const runsPerSkill = [...bySkill.entries()]
    .map(([skill, rs]) => ({ skill, runs: rs.length }))
    .sort((a, b) => b.runs - a.runs);
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
  return { runsPerSkill, skills, totalRunsToday: rows.length };
}

export const getPracticeSnapshot = createServerFn({ method: "GET" }).handler(
  async (): Promise<PracticeSnapshot> => {
    const sinceIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const [runsRes, stateRes] = await Promise.all([
      supabaseAdmin
        .from("practice_runs")
        .select("id,skill,scenario,pass,duration_ms,ts")
        .gte("ts", sinceIso)
        .order("ts", { ascending: false })
        .limit(500),
      supabaseAdmin
        .from("practice_state")
        .select("running,current_skill")
        .eq("id", 1)
        .maybeSingle(),
    ]);

    const rows: PracticeRun[] = (runsRes.data ?? []).map((r: any) => ({
      id: r.id,
      skill: r.skill,
      scenario: r.scenario,
      pass: r.pass,
      durationMs: r.duration_ms,
      ts: r.ts,
    }));

    const agg = aggregate(rows);
    const state = stateRes.data ?? { running: false, current_skill: "" };

    return {
      running: !!state.running,
      currentSkill: state.current_skill ?? "",
      ...agg,
      feed: rows.slice(0, 50),
      source: rows.length > 0 ? "live" : "empty",
      // Stable per-minute timestamp avoids hydration mismatch between SSR and first client render.
      fetchedAt: new Date(Math.floor(Date.now() / 60000) * 60000).toISOString(),
    };
  },
);

// Used by the agent / runners to stream a new run into the feed.
export const recordPracticeRun = createServerFn({ method: "POST" })
  .inputValidator((input: {
    skill: string;
    scenario: string;
    pass: boolean;
    durationMs: number;
  }) => {
    if (!input.skill || typeof input.skill !== "string" || input.skill.length > 200) {
      throw new Error("invalid skill");
    }
    if (!input.scenario || typeof input.scenario !== "string" || input.scenario.length > 200) {
      throw new Error("invalid scenario");
    }
    if (typeof input.pass !== "boolean") throw new Error("invalid pass");
    if (typeof input.durationMs !== "number" || input.durationMs < 0 || input.durationMs > 600000) {
      throw new Error("invalid durationMs");
    }
    return input;
  })
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin.from("practice_runs").insert({
      skill: data.skill,
      scenario: data.scenario,
      pass: data.pass,
      duration_ms: data.durationMs,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setPracticeState = createServerFn({ method: "POST" })
  .inputValidator((input: { running: boolean; currentSkill?: string }) => {
    if (typeof input.running !== "boolean") throw new Error("invalid running");
    if (input.currentSkill && input.currentSkill.length > 200) throw new Error("invalid currentSkill");
    return input;
  })
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin
      .from("practice_state")
      .update({
        running: data.running,
        current_skill: data.currentSkill ?? "",
        updated_at: new Date().toISOString(),
      })
      .eq("id", 1);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
