import { useState } from "react";

interface QuickCmd {
  id: string;
  icon: string;
  label: string;
  template: (url: string) => string;
}

const COMMANDS: QuickCmd[] = [
  { id: "screenshot", icon: "📸", label: "Screenshot", template: (u) => `Take a screenshot of ${u}` },
  { id: "scrape", icon: "🔍", label: "Scrape Page", template: (u) => `Scrape all text from ${u}` },
  { id: "fill", icon: "📝", label: "Fill Form", template: (u) => `Fill the form at ${u} with...` },
  { id: "tests", icon: "🧪", label: "Run Tests", template: (u) => `Test all links on ${u}` },
  { id: "css", icon: "🎨", label: "Inspect CSS", template: (u) => `Extract all CSS variables from ${u}` },
  { id: "audit", icon: "📊", label: "Audit Site", template: (u) => `Audit ${u} for performance issues` },
];

interface Props {
  onClose: () => void;
  onInject: (prompt: string) => void;
}

export function BrowserQuickCommands({ onClose, onInject }: Props) {
  const [urls, setUrls] = useState<Record<string, string>>({});

  const setUrl = (id: string, v: string) => setUrls((p) => ({ ...p, [id]: v }));

  return (
    <div
      className="absolute right-0 top-full mt-1 z-30 rounded-md p-4"
      style={{
        background: "#0a0a0a",
        border: "1px solid #ffaa0055",
        width: 540,
        boxShadow: "0 12px 32px -8px #000",
        animation: "var(--animate-slide-down)",
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <h3
          className="font-mono font-bold tracking-[0.18em]"
          style={{ color: "#ffaa00", fontSize: 12 }}
        >
          🎭 BROWSER QUICK COMMANDS
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground hover:text-foreground"
        >
          ✕
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {COMMANDS.map((cmd) => {
          const url = urls[cmd.id] ?? "";
          return (
            <div
              key={cmd.id}
              className="rounded p-2 flex flex-col gap-1.5"
              style={{ background: "#111", border: "1px solid #222" }}
            >
              <button
                type="button"
                onClick={() => onInject(cmd.template(url || "https://example.com"))}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded font-mono text-[11px] hover:bg-surface-2/60 transition"
                style={{ color: "#ffaa00", background: "#ffaa0010", border: "1px solid #ffaa0033" }}
              >
                <span style={{ fontSize: 14 }}>{cmd.icon}</span>
                <span className="uppercase tracking-[0.15em]">{cmd.label}</span>
              </button>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(cmd.id, e.target.value)}
                placeholder="https://..."
                className="font-mono text-[10px] px-2 py-1 rounded outline-none"
                style={{
                  background: "#0a0a0a",
                  border: "1px solid #2a2a2a",
                  color: "#bbb",
                }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
