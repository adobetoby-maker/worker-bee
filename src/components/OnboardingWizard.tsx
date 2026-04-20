import { useState } from "react";
import { toast } from "sonner";
import { MACHINE_PROFILES, computeLimits, saveStoredProfile, type MachineProfile } from "@/lib/machine-profile";
import { markOnboarded } from "@/lib/onboarding";
import { Confetti } from "./Confetti";

interface Props {
  endpoint: string;
  setEndpoint: (s: string) => void;
  onConnect: () => Promise<boolean> | boolean; // returns success
  onProfileSaved: (p: MachineProfile) => void;
  onComplete: () => void;
}

export function OnboardingWizard({
  endpoint,
  setEndpoint,
  onConnect,
  onProfileSaved,
  onComplete,
}: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [direction, setDirection] = useState<"forward" | "backward">("forward");
  const [connecting, setConnecting] = useState(false);
  const [connectMsg, setConnectMsg] = useState<string | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<string | null>(null);
  const [confetti, setConfetti] = useState<{ x: number; y: number } | null>(null);

  const goto = (s: 1 | 2 | 3) => {
    setDirection(s > step ? "forward" : "backward");
    setStep(s);
  };

  const finish = () => {
    markOnboarded();
    setConfetti({ x: 22 + 22, y: 36 }); // approximate bee logo position in header
    toast("🐝 Your hive is ready. Let's build something.");
    setTimeout(() => onComplete(), 200);
  };

  const handleConnect = async () => {
    setConnecting(true);
    setConnectMsg(null);
    const ok = await onConnect();
    setConnecting(false);
    setConnectMsg(ok ? "✓ Connected" : "✗ Could not reach Ollama — you can still continue");
    if (ok) setTimeout(() => goto(3), 600);
  };

  const handleSaveProfile = () => {
    const p = MACHINE_PROFILES.find((x) => x.id === selectedProfile);
    if (!p) return;
    saveStoredProfile(p);
    onProfileSaved(p);
    finish();
  };

  return (
    <>
      {confetti && <Confetti origin={confetti} onDone={() => setConfetti(null)} />}
      <div
        className="fixed inset-0 z-[70] flex items-center justify-center p-4"
        style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(6px)" }}
      >
        <div
          className="relative w-full max-w-xl rounded-lg border border-primary/40 bg-background shadow-[0_0_60px_-10px_var(--primary)] overflow-hidden"
          style={{ animation: "var(--animate-slide-down)" }}
        >
          {/* Progress dots */}
          <div className="flex items-center justify-center gap-2 pt-5">
            {[1, 2, 3].map((n) => (
              <span
                key={n}
                className="rounded-full transition-all"
                style={{
                  width: n === step ? 24 : 8,
                  height: 8,
                  background: n <= step ? "#ffaa00" : "#333",
                }}
              />
            ))}
          </div>
          <div className="text-center font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground mt-2">
            Step {step}/3
          </div>

          <div
            key={step}
            className="px-8 py-8"
            style={{
              animation:
                direction === "forward"
                  ? "wizard-slide-in-right 0.35s ease-out"
                  : "wizard-slide-in-left 0.35s ease-out",
            }}
          >
            {step === 1 && (
              <div className="text-center space-y-4">
                <div style={{ fontSize: 64 }}>🐝</div>
                <h2 className="font-mono text-2xl font-bold tracking-[0.1em]">
                  <span style={{ color: "#ffaa00" }}>WELCOME TO </span>
                  <span style={{ color: "#39ff14" }}>WORKER BEE</span>
                </h2>
                <p className="font-sans text-sm text-muted-foreground max-w-md mx-auto">
                  The local AI website builder that keeps your data on YOUR machine.
                </p>
                <button
                  type="button"
                  onClick={() => goto(2)}
                  className="mt-4 px-6 py-2.5 rounded-md bg-gradient-to-br from-primary to-primary-glow text-primary-foreground font-mono text-xs uppercase tracking-[0.2em] hover:shadow-[0_0_24px_-4px_var(--primary)] transition-shadow"
                >
                  GET STARTED →
                </button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <h2 className="font-mono text-lg font-bold tracking-[0.12em] text-primary">
                  ⚙ CONNECT YOUR OLLAMA
                </h2>
                <label className="block font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  Ollama Endpoint
                </label>
                <input
                  type="text"
                  value={endpoint}
                  onChange={(e) => setEndpoint(e.target.value)}
                  placeholder="http://localhost:11434"
                  className="w-full bg-surface border border-border focus:border-primary outline-none rounded px-3 py-2 font-mono text-sm"
                />
                <div className="rounded border border-border bg-surface/40 p-3 font-mono text-[11px] text-muted-foreground">
                  Don't have Ollama?
                  <code className="block mt-1.5 text-primary bg-background/60 border border-border rounded px-2 py-1">
                    $ brew install ollama && ollama serve
                  </code>
                </div>
                {connectMsg && (
                  <div
                    className="font-mono text-[11px]"
                    style={{ color: connectMsg.startsWith("✓") ? "#39ff14" : "#ffaa00" }}
                  >
                    {connectMsg}
                  </div>
                )}
                <div className="flex items-center justify-between gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => goto(3)}
                    className="px-4 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground"
                  >
                    SKIP FOR NOW
                  </button>
                  <button
                    type="button"
                    onClick={handleConnect}
                    disabled={connecting || !endpoint.trim()}
                    className="px-5 py-2 rounded bg-gradient-to-br from-primary to-primary-glow text-primary-foreground font-mono text-[11px] uppercase tracking-[0.2em] disabled:opacity-50 hover:shadow-[0_0_20px_-4px_var(--primary)]"
                  >
                    {connecting ? "CONNECTING…" : "▶ CONNECT"}
                  </button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <h2 className="font-mono text-lg font-bold tracking-[0.12em] text-primary">
                  🖥 WHAT'S YOUR MACHINE?
                </h2>
                <p className="font-sans text-xs text-muted-foreground">
                  Helps us warn you before you exceed safe limits.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[280px] overflow-y-auto pr-1">
                  {MACHINE_PROFILES.map((p) => {
                    const limits = computeLimits(p);
                    const active = selectedProfile === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setSelectedProfile(p.id)}
                        className={`text-left rounded border p-2.5 font-mono transition-all ${
                          active
                            ? "border-primary bg-primary/10 shadow-[0_0_14px_-6px_var(--primary)]"
                            : "border-border bg-surface/40 hover:border-primary/50"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span>{p.icon}</span>
                          <span className={`text-xs font-bold ${active ? "text-primary" : ""}`}>
                            {p.name}
                          </span>
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">{p.blurb}</div>
                        <div className="text-[10px] text-success mt-1">
                          ~{limits.maxAgents} agent{limits.maxAgents === 1 ? "" : "s"}
                        </div>
                      </button>
                    );
                  })}
                </div>
                <div className="flex items-center justify-between gap-3 pt-2">
                  <button
                    type="button"
                    onClick={finish}
                    className="px-4 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground"
                  >
                    SKIP
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveProfile}
                    disabled={!selectedProfile}
                    className="px-5 py-2 rounded bg-gradient-to-br from-primary to-primary-glow text-primary-foreground font-mono text-[11px] uppercase tracking-[0.2em] disabled:opacity-40 hover:shadow-[0_0_20px_-4px_var(--primary)]"
                  >
                    SAVE PROFILE 🐝
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
