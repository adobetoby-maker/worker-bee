import { useState } from "react";
import { estimateModelLoad } from "@/lib/resource-estimate";
import { BrowserQuickCommands } from "./BrowserQuickCommands";

export const SYSTEM_PROMPT_PRESETS: { id: string; icon: string; label: string; prompt: string }[] = [
  {
    id: "researcher",
    icon: "🔬",
    label: "Researcher",
    prompt:
      "You are a research assistant. Be thorough, cite sources, ask clarifying questions.",
  },
  {
    id: "coder",
    icon: "💻",
    label: "Coder",
    prompt:
      "You are an expert software engineer. Prefer working code over explanation. Use comments.",
  },
  {
    id: "planner",
    icon: "🗺",
    label: "Planner",
    prompt:
      "You are a strategic planner. Break tasks into steps, identify blockers, think long-term.",
  },
  {
    id: "creative",
    icon: "🎨",
    label: "Creative",
    prompt:
      "You are a creative writing partner. Be vivid, unexpected, and emotionally resonant.",
  },
  {
    id: "agent",
    icon: "⚙",
    label: "Agent",
    prompt:
      "You are an autonomous agent. When given a task, plan steps, use available tools, and execute.",
  },
  {
    id: "prompt-engineer",
    icon: "🏗",
    label: "Prompt Engineer",
    prompt:
      "You are Worker Bee, an expert Lovable prompt engineer and web app analyst. You have a real Playwright browser and can navigate to any URL.\n\nWhen asked to analyze an app:\n1. Navigate to the URL first\n2. Read the full page content\n3. Identify what the app does\n4. Suggest specific improvements\n\nWhen generating Lovable prompts always:\n- Start with 🔒 LOCK: Do not change [list what to preserve]\n- State the PROBLEM clearly\n- List each FIX numbered\n- End with BEHAVIOR NOTES\n- Be specific about colors, fonts, component names\n- Preserve existing styling unless told to change it\n\nThis user builds language learning apps, plumbing service suites, investment tools, and AI agent interfaces in Lovable.\nTheir design style: dark themes, amber/green accents, JetBrains Mono for code, IBM Plex Sans for body text.\nThey prefer surgical fixes over full rebuilds.",
  },
];

interface TabControlsProps {
  tabName: string;
  model: string | null;
  availableModels: string[];
  onModelChange: (m: string) => void;
  onOpenPrompt: () => void;
  onClear: () => void;
  onInjectPrompt?: (text: string) => void;
  onRepair?: () => void;
  onPlan?: (goal: string) => void;
  onRefreshModels?: () => void;
  refreshingModels?: boolean;
  // Project binding
  projects?: { id: string; emoji: string; name: string }[];
  activeProjectId?: string | null;
  onProjectChange?: (id: string | null) => void;
  // Memory
  memoryCount?: number | null;
}

export function TabControls({
  tabName,
  model,
  availableModels,
  onModelChange,
  onOpenPrompt,
  onClear,
  onInjectPrompt,
  onRepair,
  onPlan,
  onRefreshModels,
  refreshingModels = false,
  projects = [],
  activeProjectId = null,
  onProjectChange,
  memoryCount = null,
}: TabControlsProps) {
  const [confirming, setConfirming] = useState(false);
  const [browserOpen, setBrowserOpen] = useState(false);
  const load = estimateModelLoad(model);
  const hint = model ? `${model} · ~${load.ram} GB RAM` : "no model";

  // Always include current model in the list even if not in availableModels
  const options = Array.from(
    new Set([...(model && model !== "__auto__" ? [model] : []), ...availableModels]),
  ).filter(Boolean);
  const isAuto = !model || model === "__auto__";

  return (
    <div
      className="flex items-center gap-2 sm:gap-3 px-2 sm:px-4 font-mono overflow-x-auto"
      style={{
        minHeight: 36,
        background: "#080808",
        borderBottom: "1px solid #1a1a1a",
        scrollbarWidth: "none",
        msOverflowStyle: "none",
      }}
    >
      <style>{`.tab-controls-row::-webkit-scrollbar{display:none}`}</style>
      <div className="flex items-center gap-2">
        <span className="hidden sm:inline text-[10px] uppercase tracking-[0.15em]" style={{ color: "#555" }}>
          MODEL:
        </span>
        <select
          value={isAuto ? "__auto__" : (model ?? "")}
          onChange={(e) => onModelChange(e.target.value)}
          title={hint}
          className="bg-background border border-border px-2 py-1 text-[11px] text-foreground rounded focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/40 max-w-[120px] sm:max-w-none"
        >
          <option value="__auto__">🐝 AUTO</option>
          {options.length === 0 && <option value="">No models found</option>}
          {options.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <span className="hidden sm:inline text-[10px]" style={{ color: "#555" }}>
          {isAuto ? "auto-routed" : `~${load.ram} GB RAM`}
        </span>
        {onRefreshModels && (
          <button
            type="button"
            onClick={onRefreshModels}
            disabled={refreshingModels}
            title="Refresh models"
            className="shrink-0 border border-border px-2 py-1 text-[10px] uppercase tracking-[0.15em] hover:border-primary disabled:opacity-50"
            style={{ color: options.length === 0 ? "#ffaa00" : "#888" }}
          >
            {refreshingModels ? "…" : "↻ Refresh"}
          </button>
        )}
      </div>

      {onProjectChange && (
        <div className="flex items-center gap-2 shrink-0">
          <span className="hidden sm:inline text-[10px] uppercase tracking-[0.15em]" style={{ color: "#555" }}>
            📂 PROJECT:
          </span>
          <select
            value={activeProjectId ?? ""}
            onChange={(e) => onProjectChange(e.target.value || null)}
            className="bg-background border border-border px-2 py-1 text-[11px] text-foreground rounded focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/40 max-w-[110px] sm:max-w-none"
          >
            <option value="">— None —</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.emoji} {p.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {memoryCount !== null && memoryCount !== undefined && (
        <span
          title="Memories indexed for this agent"
          className="font-mono shrink-0 hidden sm:inline-flex"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            padding: "2px 8px",
            borderRadius: 999,
            fontSize: 11,
            background: "rgba(57,255,20,0.08)",
            border: "1px solid rgba(57,255,20,0.35)",
            color: "#39ff14",
            lineHeight: 1.4,
          }}
        >
          🧠 {memoryCount} {memoryCount === 1 ? "memory" : "memories"}
        </span>
      )}

      <div className="ml-auto flex items-center gap-2 relative shrink-0">
        <div className="relative">
          <button
            type="button"
            onClick={() => setBrowserOpen((b) => !b)}
            className={`shrink-0 px-2 sm:px-3 py-1 rounded border text-[10px] uppercase tracking-[0.15em] transition-colors ${
              browserOpen
                ? "border-primary/60 text-primary bg-primary/10"
                : "border-border text-muted-foreground hover:text-primary hover:border-primary/60"
            }`}
            title="Browser quick commands"
          >
            🎭<span className="hidden sm:inline"> BROWSER</span>
          </button>
          {browserOpen && (
            <BrowserQuickCommands
              onClose={() => setBrowserOpen(false)}
              onInject={(p) => {
                onInjectPrompt?.(p);
                setBrowserOpen(false);
              }}
              onRequestLogin={(url) => {
                onInjectPrompt?.(`log into ${url}`);
                setBrowserOpen(false);
              }}
              onPlan={onPlan ? (g) => { onPlan(g); setBrowserOpen(false); } : undefined}
            />
          )}
        </div>
        {onRepair && (
          <button
            type="button"
            onClick={onRepair}
            className="shrink-0 px-2 sm:px-3 py-1 rounded border text-[10px] uppercase tracking-[0.15em] transition-colors"
            style={{ borderColor: "#ff3b3b66", color: "#ff8a8a" }}
            title="Run self-repair on the agent"
          >
            🔧<span className="hidden sm:inline"> REPAIR</span>
          </button>
        )}
        <button
          type="button"
          onClick={onOpenPrompt}
          className="shrink-0 px-2 sm:px-3 py-1 rounded border border-border text-[10px] uppercase tracking-[0.15em] text-muted-foreground hover:text-primary hover:border-primary/60 transition-colors"
          title="Edit system prompt"
        >
          ✏<span className="hidden sm:inline"> PROMPT</span>
        </button>
        {!confirming ? (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="shrink-0 px-2 sm:px-3 py-1 rounded border border-border text-[10px] uppercase tracking-[0.15em] text-muted-foreground hover:text-destructive hover:border-destructive/60 transition-colors"
            title="Clear chat history"
          >
            🗑<span className="hidden sm:inline"> CLEAR</span>
          </button>
        ) : (
          <div
            className="absolute right-0 top-full mt-1 z-30 flex flex-col gap-2 p-3 rounded border border-destructive/40 bg-surface shadow-lg"
            style={{ minWidth: 280, animation: "var(--animate-slide-down)" }}
          >
            <div className="text-[11px] text-foreground">
              Clear {tabName} history? This cannot be undone.
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="px-3 py-1 rounded border border-border text-[10px] uppercase tracking-[0.15em] text-muted-foreground hover:text-foreground"
              >
                CANCEL
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirming(false);
                  onClear();
                }}
                className="px-3 py-1 rounded bg-destructive/20 border border-destructive/60 text-[10px] uppercase tracking-[0.15em] text-destructive hover:bg-destructive/30"
              >
                CLEAR
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
