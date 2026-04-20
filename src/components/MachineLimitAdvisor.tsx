import { useState } from "react";
import {
  MACHINE_PROFILES,
  computeLimits,
  type MachineProfile,
} from "@/lib/machine-profile";

interface Props {
  onSave: (profile: MachineProfile) => void;
  onSkip: () => void;
  initialProfile?: MachineProfile | null;
}

export function MachineLimitAdvisor({ onSave, onSkip, initialProfile }: Props) {
  const [selectedId, setSelectedId] = useState<string | "custom" | null>(
    initialProfile ? initialProfile.id : null,
  );
  const [customRam, setCustomRam] = useState<number>(initialProfile?.ramGb ?? 16);
  const [customVram, setCustomVram] = useState<number>(initialProfile?.vramGb ?? 0);

  const buildSelected = (): MachineProfile | null => {
    if (selectedId === "custom") {
      return {
        id: "custom",
        icon: "✏",
        name: "Custom",
        ramGb: Math.max(1, customRam),
        vramGb: Math.max(0, customVram),
        unified: false,
        blurb: `${customRam} GB RAM · ${customVram} GB VRAM`,
      };
    }
    return MACHINE_PROFILES.find((p) => p.id === selectedId) ?? null;
  };

  const handleSave = () => {
    const profile = buildSelected();
    if (profile) onSave(profile);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-lg border border-primary/40 bg-background shadow-[0_0_60px_-10px_var(--primary)]"
        style={{ animation: "var(--animate-slide-down)" }}
      >
        <div className="px-6 py-5 border-b border-border">
          <h2 className="font-mono text-lg font-bold tracking-[0.15em] text-primary">
            ⚙ WHAT MACHINE IS RUNNING OLLAMA?
          </h2>
          <p className="mt-1 font-sans text-sm text-muted-foreground">
            Worker Bee will warn you before you exceed safe limits.
          </p>
        </div>

        <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {MACHINE_PROFILES.map((p) => {
            const limits = computeLimits(p);
            const isActive = selectedId === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedId(p.id)}
                className={`text-left rounded-md border p-3 transition-all font-mono ${
                  isActive
                    ? "border-primary bg-primary/10 shadow-[0_0_18px_-6px_var(--primary)]"
                    : "border-border bg-surface/40 hover:border-primary/50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg leading-none">{p.icon}</span>
                  <span className={`text-sm font-bold ${isActive ? "text-primary" : "text-foreground"}`}>
                    {p.name}
                  </span>
                </div>
                <div className="mt-1 text-[11px] text-muted-foreground">{p.blurb}</div>
                <div className="mt-2 text-[11px] text-success">
                  Max ~{limits.maxAgents} agent{limits.maxAgents === 1 ? "" : "s"} safely
                </div>
                <div className="text-[11px] text-muted-foreground/80">{limits.maxModelLabel}</div>
              </button>
            );
          })}

          {/* Custom card */}
          <button
            type="button"
            onClick={() => setSelectedId("custom")}
            className={`text-left rounded-md border p-3 transition-all font-mono sm:col-span-2 ${
              selectedId === "custom"
                ? "border-primary bg-primary/10 shadow-[0_0_18px_-6px_var(--primary)]"
                : "border-border bg-surface/40 hover:border-primary/50"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-lg leading-none">✏</span>
              <span
                className={`text-sm font-bold ${
                  selectedId === "custom" ? "text-primary" : "text-foreground"
                }`}
              >
                Custom
              </span>
            </div>
            {selectedId === "custom" && (
              <div className="mt-3 flex flex-wrap items-end gap-3">
                <label className="flex flex-col gap-1">
                  <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                    RAM (GB)
                  </span>
                  <input
                    type="number"
                    min={1}
                    value={customRam}
                    onChange={(e) => setCustomRam(parseInt(e.target.value) || 0)}
                    onClick={(e) => e.stopPropagation()}
                    className="w-24 bg-background border border-border rounded px-2 py-1 text-sm text-foreground focus:border-primary focus:outline-none"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                    VRAM (GB)
                  </span>
                  <input
                    type="number"
                    min={0}
                    value={customVram}
                    onChange={(e) => setCustomVram(parseInt(e.target.value) || 0)}
                    onClick={(e) => e.stopPropagation()}
                    className="w-24 bg-background border border-border rounded px-2 py-1 text-sm text-foreground focus:border-primary focus:outline-none"
                  />
                </label>
              </div>
            )}
          </button>
        </div>

        <div
          className="mx-6 mb-5 rounded-md border p-4 font-mono text-[12px] leading-relaxed"
          style={{
            background: "#1a1400",
            borderColor: "#ffaa0040",
            color: "#ffaa00",
          }}
        >
          <div className="font-bold mb-2">⚠ IMPORTANT — Local machine limits</div>
          <div>Running multiple large models simultaneously will:</div>
          <ul className="mt-1 ml-4 space-y-1 list-disc marker:text-[#ffaa00]/60">
            <li>Cause response times of 30–120 seconds per token on CPU</li>
            <li>Push macOS into memory compression (swap), degrading all apps</li>
            <li>On Ubuntu, may trigger OOM killer, crashing the Ollama process</li>
            <li>Models larger than your VRAM will run on CPU — expect 10–50× slower speeds</li>
          </ul>
          <div className="mt-3">
            Recommendation: Run ONE model at a time unless you have 32 GB+ RAM.
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
          <button
            type="button"
            onClick={onSkip}
            className="px-4 py-2 rounded font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground"
          >
            SKIP
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!selectedId}
            className="px-5 py-2 rounded bg-gradient-to-br from-primary to-primary-glow text-primary-foreground font-mono text-[11px] uppercase tracking-[0.18em] disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-[0_0_20px_-4px_var(--primary)]"
          >
            GOT IT — SAVE PROFILE
          </button>
        </div>
      </div>
    </div>
  );
}
