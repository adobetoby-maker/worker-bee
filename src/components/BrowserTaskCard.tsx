import { useEffect, useState } from "react";

const KEYWORDS = ["screenshot", "scrape", "navigate", "click", "fill", "test", "crawl"];

export function detectBrowserAction(text: string): string | null {
  const lower = text.toLowerCase();
  for (const k of KEYWORDS) {
    if (lower.includes(k)) {
      const verb = k.charAt(0).toUpperCase() + k.slice(1);
      return `${verb}ing target`;
    }
  }
  return null;
}

interface Props {
  action: string;
  onStop: () => void;
}

export function BrowserTaskCard({ action, onStop }: Props) {
  const [progress, setProgress] = useState(5);
  const [showShot, setShowShot] = useState(false);

  useEffect(() => {
    // Animate from current to 95% over a randomized 3–8s window.
    const total = 3000 + Math.random() * 5000;
    const start = Date.now();
    const id = setInterval(() => {
      const elapsed = Date.now() - start;
      const pct = Math.min(95, 5 + (elapsed / total) * 90);
      setProgress(pct);
      if (pct >= 95) clearInterval(id);
    }, 80);
    return () => clearInterval(id);
  }, [action]);

  const filled = Math.round(progress / 10);
  const bar = "█".repeat(filled) + "░".repeat(10 - filled);

  return (
    <div
      className="rounded-md p-3 font-mono text-[11px] shadow-lg"
      style={{
        background: "#0d0a00",
        border: "1px solid #ffaa0066",
        color: "#ffaa00",
        animation: "var(--animate-slide-down)",
      }}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="font-bold tracking-[0.18em]">🌐 BROWSER TASK IN PROGRESS</span>
        <span className="text-[10px]" style={{ color: "#886600" }}>
          PID 48291 · Chromium
        </span>
      </div>
      <div style={{ color: "#ddc488" }}>Action: {action}</div>
      <div className="mt-1 flex items-center gap-2" style={{ color: "#ffaa00" }}>
        <span>Status:</span>
        <span>{bar}</span>
        <span>{Math.round(progress)}%</span>
      </div>
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={() => setShowShot((s) => !s)}
          className="px-2 py-1 rounded text-[10px] uppercase tracking-[0.15em]"
          style={{ background: "transparent", border: "1px solid #ffaa0055", color: "#ffaa00" }}
        >
          {showShot ? "Hide Screenshot" : "View Screenshot"}
        </button>
        <button
          type="button"
          onClick={onStop}
          className="px-2 py-1 rounded text-[10px] uppercase tracking-[0.15em]"
          style={{ background: "transparent", border: "1px solid #ff3b3b55", color: "#ff3b3b" }}
        >
          ◼ Stop
        </button>
      </div>
      {showShot && (
        <div
          className="mt-3 rounded flex flex-col items-center justify-center"
          style={{
            width: 400,
            height: 250,
            maxWidth: "100%",
            background: "linear-gradient(135deg, #1a1a1a, #2a2a2a)",
            border: "1px solid #333",
            color: "#666",
          }}
        >
          <div style={{ fontSize: 48 }}>🌐</div>
          <div className="mt-2 text-[11px] text-center px-3" style={{ color: "#777" }}>
            Screenshot will appear here during live sessions
          </div>
        </div>
      )}
    </div>
  );
}
