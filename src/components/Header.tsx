import { useEffect, useState } from "react";
import { BeeLogo } from "./BeeLogo";
import { StatusBadge } from "./StatusBadge";
import { ActivityFeed } from "./ActivityFeed";

interface HeaderProps {
  connected: boolean;
  model: string | null;
  toolCount: number;
  streaming?: boolean;
  error?: boolean;
  services?: { gmail: boolean; slack: boolean; whatsapp: boolean };
  onServiceClick?: () => void;
  onSearchOpen?: () => void;
  onQueueOpen?: () => void;
  queueDepth?: number;
  parallelMode?: boolean;
}

const TAGLINES = [
  "Building the web, one cell at a time",
  "Always buzzing. Never sleeping.",
  "Your hive. Your rules.",
  "Fueled by Ollama. Guided by you.",
];

export function Header({ connected, model, toolCount, streaming = false, error = false, services, onServiceClick, onSearchOpen, onQueueOpen, queueDepth = 0, parallelMode = false }: HeaderProps) {
  const [taglineIdx, setTaglineIdx] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTaglineIdx((i) => (i + 1) % TAGLINES.length), 6000);
    return () => clearInterval(id);
  }, []);

  return (
    <header
      className="sticky top-0 z-40 flex items-center justify-between px-5 bg-background/85 backdrop-blur border-b border-primary/30"
      style={{ height: 72 }}
    >
      <div className="flex items-center gap-3">
        <BeeLogo size={44} streaming={streaming} error={error} />
        <div className="flex flex-col leading-none">
          <span
            className="font-mono font-bold tracking-[0.18em] select-none"
            style={{ fontSize: 18 }}
          >
            <span style={{ color: "#ffaa00" }}>WORKER</span>
            <span style={{ color: "#39ff14", marginLeft: 4 }}>BEE</span>
          </span>
          <span
            className="mt-1 font-mono uppercase select-none"
            style={{ color: "#444", fontSize: 9, letterSpacing: "0.15em" }}
          >
            WEBSITE BUILDER AGENT
          </span>
        </div>
      </div>

      <div className="hidden md:flex flex-1 justify-center px-6 overflow-hidden">
        <span
          key={taglineIdx}
          className="italic truncate"
          style={{
            color: "#444",
            fontSize: 11,
            fontFamily: 'var(--font-sans, "IBM Plex Sans"), sans-serif',
            animation: "tagline-fade 6s ease-in-out",
          }}
        >
          {TAGLINES[taglineIdx]}
        </span>
      </div>

      <div className="flex items-center gap-2">
        {connected ? (
          <StatusBadge variant="success" dot>
            OLLAMA LIVE
          </StatusBadge>
        ) : (
          <StatusBadge variant="destructive" dot>
            DISCONNECTED
          </StatusBadge>
        )}
        <StatusBadge variant="primary">
          [ MODEL: {model ?? "none"} ]
        </StatusBadge>
        <StatusBadge variant="success">🔧 {toolCount} tools active</StatusBadge>
        {services && (
          <div className="flex items-center gap-1 ml-1 pl-2 border-l border-border">
            {(["gmail", "slack", "whatsapp"] as const).map((s) => {
              const icon = s === "gmail" ? "📧" : s === "slack" ? "💬" : "📱";
              const on = services[s];
              return (
                <button
                  key={s}
                  type="button"
                  onClick={onServiceClick}
                  title={`${s}: ${on ? "connected" : "not connected"}`}
                  className="text-base leading-none px-1 py-0.5 rounded hover:bg-surface-2/40 transition"
                  style={{
                    opacity: on ? 1 : 0.35,
                    filter: on ? "drop-shadow(0 0 6px #39ff1499)" : "grayscale(0.6)",
                  }}
                >
                  {icon}
                </button>
              );
            })}
          </div>
        )}
        <div className="flex items-center gap-1 ml-1 pl-2 border-l border-border">
          <ActivityFeed />
          <button
            type="button"
            onClick={onSearchOpen}
            title="Search (⌘K)"
            className="text-base leading-none px-1.5 py-0.5 rounded hover:bg-surface-2/40 transition"
          >
            🔍
          </button>
        </div>
      </div>
    </header>
  );
}
