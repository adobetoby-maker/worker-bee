import { useState } from "react";
import { estimateModelLoad } from "@/lib/resource-estimate";

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
];

interface TabControlsProps {
  tabName: string;
  model: string | null;
  availableModels: string[];
  onModelChange: (m: string) => void;
  onOpenPrompt: () => void;
  onClear: () => void;
}

export function TabControls({
  tabName,
  model,
  availableModels,
  onModelChange,
  onOpenPrompt,
  onClear,
}: TabControlsProps) {
  const [confirming, setConfirming] = useState(false);
  const load = estimateModelLoad(model);
  const hint = model ? `${model} · ~${load.ram} GB RAM` : "no model";

  // Always include current model in the list even if not in availableModels
  const options = Array.from(
    new Set([...(model ? [model] : []), ...availableModels]),
  ).filter(Boolean);

  return (
    <div
      className="flex items-center gap-3 px-4 font-mono"
      style={{
        height: 36,
        background: "#080808",
        borderBottom: "1px solid #1a1a1a",
      }}
    >
      <div className="flex items-center gap-2">
        <span className="text-[10px] uppercase tracking-[0.15em]" style={{ color: "#555" }}>
          MODEL:
        </span>
        <select
          value={model ?? ""}
          onChange={(e) => onModelChange(e.target.value)}
          title={hint}
          className="bg-background border border-border px-2 py-1 text-[11px] text-foreground rounded focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/40"
        >
          {options.length === 0 && <option value="">no models</option>}
          {options.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <span className="text-[10px]" style={{ color: "#555" }}>
          ~{load.ram} GB RAM
        </span>
      </div>

      <div className="ml-auto flex items-center gap-2 relative">
        <button
          type="button"
          onClick={onOpenPrompt}
          className="px-3 py-1 rounded border border-border text-[10px] uppercase tracking-[0.15em] text-muted-foreground hover:text-primary hover:border-primary/60 transition-colors"
          title="Edit system prompt"
        >
          ✏ PROMPT
        </button>
        {!confirming ? (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="px-3 py-1 rounded border border-border text-[10px] uppercase tracking-[0.15em] text-muted-foreground hover:text-destructive hover:border-destructive/60 transition-colors"
            title="Clear chat history"
          >
            🗑 CLEAR
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
