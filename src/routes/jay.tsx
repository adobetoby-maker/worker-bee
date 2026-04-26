import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  getSkillsSnapshot,
  type FluencyTier,
  type Skill,
  type SkillsSnapshot,
} from "@/lib/skills/skills.functions";

export const Route = createFileRoute("/jay")({
  loader: () => getSkillsSnapshot(),
  component: JayCockpit,
  errorComponent: ({ error, reset }) => {
    const router = useRouter();
    return (
      <div className="p-6 font-mono text-sm">
        <p className="mb-3">Cockpit failed to initialize: {error.message}</p>
        <button
          onClick={() => {
            router.invalidate();
            reset();
          }}
          className="px-3 py-1 border border-border rounded"
        >
          Retry
        </button>
      </div>
    );
  },
  notFoundComponent: () => <div className="p-6">Not found.</div>,
});

const TIER_COLOR: Record<FluencyTier, string> = {
  Beginner: "text-red-300 bg-red-500/15 border-red-500/40",
  Practicing: "text-yellow-200 bg-yellow-500/15 border-yellow-500/40",
  Proficient: "text-green-300 bg-green-500/15 border-green-500/40",
  Fluent: "text-blue-300 bg-blue-500/15 border-blue-500/40",
};

interface ChatMsg { role: "you" | "bee"; text: string; at: string }
interface ChatAttachment { id: string; name: string; type: string; size: number; dataUrl: string; isImage: boolean }
interface ChatMsgFull extends ChatMsg { attachments?: ChatAttachment[] }
interface ThoughtLine { ts: string; text: string; kind: "think" | "act" | "observe" }

function fmtClock(d = new Date()) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())}Z`;
}

function timeAgo(iso: string | null): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function JayCockpit() {
  const initial = Route.useLoaderData() as SkillsSnapshot;
  const [snap, setSnap] = useState<SkillsSnapshot>(initial);
  const [chat, setChat] = useState<ChatMsgFull[]>([]);
  const [thoughts, setThoughts] = useState<ThoughtLine[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState<ChatAttachment[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [clock, setClock] = useState<string>("");
  const chatEndRef = useRef<HTMLDivElement>(null);
  const thoughtEndRef = useRef<HTMLDivElement>(null);
  const [recentActive, setRecentActive] = useState<Record<string, number>>({});
  const prevSkillIdsRef = useRef<Set<string>>(new Set(initial.skills.map((s) => s.id)));

  // Initialize time-dependent state on the client only to avoid hydration mismatches.
  useEffect(() => {
    setChat([{ role: "bee", text: "Cockpit online. All systems visible. What are we doing today, Jay?", at: fmtClock() }]);
    setThoughts([
      { ts: fmtClock(), text: "Booting cockpit view…", kind: "act" },
      { ts: fmtClock(), text: "Subscribing to skill feed (2s)", kind: "observe" },
    ]);
    setClock(fmtClock());
    const c = window.setInterval(() => setClock(fmtClock()), 1000);
    return () => window.clearInterval(c);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      try {
        const next = await getSkillsSnapshot();
        if (cancelled) return;
        const prevIds = prevSkillIdsRef.current;
        const newOnes = next.skills.filter((s) => !prevIds.has(s.id));
        if (newOnes.length) {
          setThoughts((t) =>
            [...t, ...newOnes.map<ThoughtLine>((s) => ({ ts: fmtClock(), kind: "observe" as const, text: `+ new skill registered: ${s.name}` }))].slice(-200),
          );
        }
        prevSkillIdsRef.current = new Set(next.skills.map((s) => s.id));
        const byId = new Map(snap.skills.map((s) => [s.id, s] as const));
        const ev: ThoughtLine[] = [];
        const expiries: Record<string, number> = {};
        for (const s of next.skills) {
          const prev = byId.get(s.id);
          if (prev && s.iterations > prev.iterations) {
            ev.push({ ts: fmtClock(), kind: "act", text: `${s.name}: +${s.iterations - prev.iterations} run · ${s.iterations.toLocaleString()}/${s.iterationGoal.toLocaleString()}` });
          }
          if (s.active) {
            expiries[s.id] = Date.now() + 4000;
            if (!prev?.active) ev.push({ ts: fmtClock(), kind: "think", text: `engaging skill → ${s.name}` });
          }
        }
        if (ev.length) setThoughts((t) => [...t, ...ev].slice(-200));
        setRecentActive((cur) => {
          const merged = { ...cur, ...expiries };
          const now = Date.now();
          for (const k of Object.keys(merged)) if (merged[k] < now) delete merged[k];
          return merged;
        });
        setSnap(next);
      } catch { /* ignore */ }
    };
    const id = window.setInterval(tick, 2000);
    return () => { cancelled = true; window.clearInterval(id); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chat]);
  useEffect(() => { thoughtEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [thoughts]);

  const send = () => {
    const text = input.trim();
    if (!text && pending.length === 0) return;
    const at = fmtClock();
    const atts = pending;
    setChat((c) => [...c, { role: "you", text, at, attachments: atts.length ? atts : undefined }]);
    setInput("");
    setPending([]);
    setThoughts((t) => [
      ...t,
      { ts: at, kind: "think" as const, text: `parsing prompt (${text.length} chars${atts.length ? `, ${atts.length} attachment${atts.length > 1 ? "s" : ""}` : ""})` },
    ].slice(-200));
    window.setTimeout(() => {
      setChat((c) => [...c, { role: "bee", text: "Heard you. (Cockpit is read-only chat — for full agent execution use the main Chat tab.)", at: fmtClock() }]);
      setThoughts((t) => [...t, { ts: fmtClock(), kind: "observe" as const, text: "reply emitted" }].slice(-200));
    }, 400);
  };

  const MAX_BYTES = 10 * 1024 * 1024; // 10MB per file
  const readFiles = async (files: FileList | File[]) => {
    const arr = Array.from(files).slice(0, 10);
    const results: ChatAttachment[] = [];
    for (const f of arr) {
      if (f.size > MAX_BYTES) {
        setThoughts((t) => [...t, { ts: fmtClock(), kind: "observe" as const, text: `skipped ${f.name} (>${Math.round(MAX_BYTES / 1024 / 1024)}MB)` }].slice(-200));
        continue;
      }
      const dataUrl: string = await new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result));
        r.onerror = () => reject(r.error);
        r.readAsDataURL(f);
      });
      results.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: f.name,
        type: f.type || "application/octet-stream",
        size: f.size,
        dataUrl,
        isImage: (f.type || "").startsWith("image/"),
      });
    }
    if (results.length) {
      setPending((p) => [...p, ...results].slice(0, 10));
      setThoughts((t) => [...t, { ts: fmtClock(), kind: "observe" as const, text: `attached ${results.length} file${results.length > 1 ? "s" : ""}` }].slice(-200));
    }
  };

  const onPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const files = Array.from(e.clipboardData?.files ?? []);
    if (files.length) {
      e.preventDefault();
      void readFiles(files);
    }
  };

  const onDrop = (e: React.DragEvent<HTMLElement>) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer?.files ?? []);
    if (files.length) void readFiles(files);
  };

  const stats = useMemo(() => {
    const total = snap.skills.length;
    const active = snap.skills.filter((s) => s.active).length;
    const iter = snap.skills.reduce((a, s) => a + s.iterations, 0);
    return { total, active, iter };
  }, [snap.skills]);

  return (
    <div className="h-screen w-full flex flex-col bg-background text-foreground font-mono overflow-hidden">
      <header className="shrink-0 flex items-center gap-4 px-4 py-2 border-b text-[11px] uppercase tracking-[0.18em]" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
        <span className="text-success">🛩 Jay Cockpit</span>
        <span className="text-muted-foreground">{stats.total} skills</span>
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <span className={`inline-block w-2 h-2 rounded-full ${stats.active ? "bg-success animate-pulse" : "bg-muted"}`} />
          {stats.active} active now
        </span>
        <span className="text-muted-foreground">Σ {stats.iter.toLocaleString()} iterations</span>
        <span className="ml-auto text-muted-foreground" suppressHydrationWarning>tick {clock || "—"}</span>
      </header>

      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[minmax(0,1.1fr)_320px_minmax(0,1.4fr)]">
        <section
          className={`flex flex-col min-h-0 border-b lg:border-b-0 lg:border-r relative ${dragOver ? "ring-2 ring-primary/60" : ""}`}
          style={{ borderColor: "var(--border)" }}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
        >
          <PanelHeader label="// CHAT" />
          {dragOver && (
            <div className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center text-[11px] uppercase tracking-[0.18em] text-primary bg-background/70">
              drop to attach
            </div>
          )}
          <div className="flex-1 min-h-0 overflow-y-auto px-3 py-2 text-[12px] leading-relaxed space-y-2">
            {chat.map((m, i) => (
              <div key={i} className="animate-fade-in">
                <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">[{m.at}] {m.role === "you" ? "Jay" : "Worker Bee"}</div>
                {m.text && <div className={m.role === "you" ? "text-foreground" : "text-success"}>{m.text}</div>}
                {m.attachments && m.attachments.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-2">
                    {m.attachments.map((a) => (
                      <AttachmentPreview key={a.id} att={a} />
                    ))}
                  </div>
                )}
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          <div className="shrink-0 border-t p-2 space-y-2" style={{ borderColor: "var(--border)" }}>
            {pending.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {pending.map((a) => (
                  <div key={a.id} className="relative">
                    <AttachmentPreview att={a} />
                    <button
                      onClick={() => setPending((p) => p.filter((x) => x.id !== a.id))}
                      className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-background border border-border text-[10px] leading-none flex items-center justify-center hover:bg-destructive hover:text-destructive-foreground"
                      aria-label={`Remove ${a.name}`}
                    >×</button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,application/pdf,text/*,.md,.json,.csv,.log"
                className="hidden"
                onChange={(e) => { if (e.target.files) void readFiles(e.target.files); e.target.value = ""; }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-2.5 py-2 rounded border text-[14px] text-muted-foreground hover:text-foreground hover:border-primary/60"
                style={{ borderColor: "var(--border)" }}
                title="Attach files or images"
                aria-label="Attach files or images"
              >📎</button>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onPaste={onPaste}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                placeholder="Talk to the bee… (paste or drop files)"
                className="flex-1 px-3 py-2 rounded border bg-background text-[12px]"
                style={{ borderColor: "var(--border)" }}
              />
              <button onClick={send} className="px-3 py-2 rounded border text-[11px] uppercase tracking-[0.16em] text-success border-primary/60 hover:bg-primary/10">Send</button>
            </div>
          </div>
        </section>

        <section className="flex flex-col min-h-0 border-b lg:border-b-0 lg:border-r" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
          <PanelHeader label="// STREAM_OF_THOUGHT" />
          <div className="flex-1 min-h-0 overflow-y-auto px-3 py-2 text-[11px] leading-relaxed">
            {thoughts.map((t, i) => (
              <div key={i} className="whitespace-pre-wrap animate-fade-in">
                <span className="text-muted-foreground/70">[{t.ts}]</span>{" "}
                <span className={t.kind === "think" ? "text-primary" : t.kind === "act" ? "text-success" : "text-muted-foreground"}>{t.kind === "think" ? "💭" : t.kind === "act" ? "→" : "·"}</span>{" "}
                <span className="text-foreground/85">{t.text}</span>
              </div>
            ))}
            <div ref={thoughtEndRef} />
          </div>
        </section>

        <section className="flex flex-col min-h-0">
          <PanelHeader label="// SKILLS_LIBRARY · LIVE" right={`${snap.skills.length} loaded`} />
          <div className="flex-1 min-h-0 overflow-y-auto p-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
              {snap.skills.map((s) => <SkillTile key={s.id} skill={s} pulsing={s.active || !!recentActive[s.id]} />)}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function PanelHeader({ label, right }: { label: string; right?: string }) {
  return (
    <div className="shrink-0 px-3 py-2 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground border-b" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
      <span>{label}</span>
      {right && <span>{right}</span>}
    </div>
  );
}

function SkillTile({ skill, pulsing }: { skill: Skill; pulsing: boolean }) {
  const pct = Math.min(100, (skill.iterations / skill.iterationGoal) * 100);
  return (
    <div className={`relative rounded border p-2 transition-all ${pulsing ? "border-primary/80 shadow-[0_0_0_1px_var(--primary),0_0_24px_-4px_var(--primary)]" : "border-border"}`} style={{ background: "var(--surface)" }}>
      {pulsing && (
        <span className="absolute top-2 right-2 inline-flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full rounded-full bg-success opacity-60 animate-ping" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
        </span>
      )}
      <div className="flex items-start justify-between gap-2 pr-4">
        <div className="min-w-0">
          <div className="text-[12px] font-semibold truncate">{skill.name}</div>
          <div className="text-[10px] text-muted-foreground truncate">{skill.domain}</div>
        </div>
        <span className={`shrink-0 px-1.5 py-0.5 rounded border text-[9px] uppercase tracking-[0.12em] ${TIER_COLOR[skill.tier]}`}>{skill.tier}</span>
      </div>
      <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground tabular-nums">
        <span>{skill.iterations.toLocaleString()}/{skill.iterationGoal.toLocaleString()}</span>
        <span>{Math.round(skill.passRateLast50 * 100)}%</span>
        <span suppressHydrationWarning>{timeAgo(skill.lastPracticedAt)}</span>
      </div>
      <div className="mt-1 h-1 rounded bg-surface-2 overflow-hidden">
        <div className={`h-full ${pulsing ? "bg-success" : "bg-primary"} transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}