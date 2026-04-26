import { useEffect, useState } from "react";
import { BeeLogo } from "./BeeLogo";
import { StatusBadge } from "./StatusBadge";
import { ActivityFeed } from "./ActivityFeed";
import { getIdentity, setIdentity, subscribeIdentity, type Identity } from "@/lib/identity";

function useTheme() {
  const [theme, setTheme] = useState<"dark" | "light">("light");
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem("workerbee_theme");
    const initial = stored === "dark" ? "dark" : "light";
    setTheme(initial);
    document.documentElement.classList.toggle("dark", initial === "dark");
    document.documentElement.classList.remove("light");
  }, []);
  const toggle = () => {
    setTheme((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      document.documentElement.classList.toggle("dark", next === "dark");
      document.documentElement.classList.remove("light");
      try { localStorage.setItem("workerbee_theme", next); } catch {}
      return next;
    });
  };
  return { theme, toggle };
}

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
  autoStatus?: "idle" | "trying" | "connected" | "failed" | "reconnecting";
  reconnectInfo?: { attempt: number; max: number } | null;
  onOpenConfig?: () => void;
}

const TAGLINES = [
  "Building the web, one cell at a time",
  "Always buzzing. Never sleeping.",
  "Your hive. Your rules.",
  "Fueled by Ollama. Guided by you.",
];

export function Header({ connected, model, toolCount, streaming = false, error = false, services, onServiceClick, onSearchOpen, onQueueOpen, queueDepth = 0, parallelMode = false, autoStatus = "idle", reconnectInfo = null, onOpenConfig }: HeaderProps) {
  const [taglineIdx, setTaglineIdx] = useState(0);
  const { theme, toggle: toggleTheme } = useTheme();
  const [identity, setIdentityLocal] = useState<Identity>("toby");
  useEffect(() => {
    setIdentityLocal(getIdentity());
    return subscribeIdentity(setIdentityLocal);
  }, []);

  useEffect(() => {
    const id = setInterval(() => setTaglineIdx((i) => (i + 1) % TAGLINES.length), 6000);
    return () => clearInterval(id);
  }, []);

  return (
    <header
      className="sticky top-0 z-40 flex items-center justify-between pl-14 pr-3 sm:pl-5 sm:pr-5 backdrop-blur gap-2"
      style={{ height: 72, background: "var(--surface)", borderBottom: "1px solid var(--border)" }}
    >
      <div className="flex items-center gap-3 min-w-0">
        <BeeLogo size={44} streaming={streaming} error={error} />
        <div className="flex flex-col leading-none">
          <span
            className="font-mono font-bold tracking-[0.18em] select-none"
            style={{ fontSize: 18 }}
          >
            <span style={{ color: "var(--primary)" }}>WORKER</span>
            <span style={{ color: "var(--success)", marginLeft: 4 }}>BEE</span>
          </span>
          <span
            className="mt-1 font-mono uppercase select-none"
            style={{ color: "var(--muted-foreground)", fontSize: 9, letterSpacing: "0.15em" }}
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
            color: "var(--muted-foreground)",
            fontSize: 11,
            fontFamily: 'var(--font-sans, "IBM Plex Sans"), sans-serif',
            animation: "tagline-fade 6s ease-in-out",
          }}
        >
          {TAGLINES[taglineIdx]}
        </span>
      </div>

      <div className="flex items-center gap-2 min-w-0 flex-shrink">
        {connected ? (
          <StatusBadge variant="success" dot>
            OLLAMA LIVE
          </StatusBadge>
        ) : autoStatus === "trying" || autoStatus === "reconnecting" ? (
          <span
            className="inline-flex items-center gap-1.5 font-mono uppercase"
            style={{
              fontSize: 10,
              letterSpacing: "0.18em",
              color: "var(--primary)",
              border: "1px solid var(--primary)",
              padding: "3px 8px",
              borderRadius: 2,
              background: "color-mix(in oklab, var(--primary) 8%, transparent)",
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "var(--primary)",
                animation: "pulse-neon 1.4s ease-in-out infinite",
                opacity: 0.7,
              }}
            />
            {autoStatus === "reconnecting" && reconnectInfo
              ? `RECONNECTING… (${reconnectInfo.attempt}/${reconnectInfo.max})`
              : "CONNECTING…"}
          </span>
        ) : autoStatus === "failed" ? (
          <button
            type="button"
            onClick={onOpenConfig}
            className="inline-flex items-center gap-1.5 font-mono uppercase hover:bg-surface-2/40 transition"
            style={{
              fontSize: 10,
              letterSpacing: "0.16em",
              color: "var(--primary)",
              border: "1px solid var(--primary)",
              padding: "3px 8px",
              borderRadius: 2,
              background: "color-mix(in oklab, var(--primary) 8%, transparent)",
            }}
            title="Open CONFIG"
          >
            ⚠ AGENT OFFLINE — CHECK CONFIG
          </button>
        ) : (
          <StatusBadge variant="destructive" dot>
            DISCONNECTED
          </StatusBadge>
        )}
        <span className="hidden md:inline-flex">
        <StatusBadge variant="primary">
          [ MODEL: {model ?? "none"} ]
        </StatusBadge>
        </span>
        <span className="hidden lg:inline-flex">
        <StatusBadge variant="success">🔧 {toolCount} tools active</StatusBadge>
        </span>
        {services && (
          <div className="hidden sm:flex items-center gap-1 ml-1 pl-2 border-l border-border">
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
                    filter: on ? "drop-shadow(0 0 6px var(--success))" : "grayscale(0.6)",
                  }}
                >
                  {icon}
                </button>
              );
            })}
          </div>
        )}
        <div className="flex items-center gap-1 ml-1 pl-2 border-l border-border">
          <div
            className="hidden sm:inline-flex items-center mr-1 overflow-hidden"
            role="group"
            aria-label="User identity"
            style={{
              border: "1px solid var(--border)",
              borderRadius: 6,
              background: "var(--surface)",
            }}
          >
            {(["toby", "jay"] as const).map((id) => {
              const on = identity === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setIdentity(id)}
                  aria-pressed={on}
                  title={
                    id === "jay"
                      ? "Jay — short replies, options with time estimates"
                      : "Toby — default style"
                  }
                  className="font-mono uppercase transition"
                  style={{
                    padding: "4px 10px",
                    fontSize: 10,
                    letterSpacing: "0.16em",
                    background: on ? "var(--primary)" : "transparent",
                    color: on ? "var(--primary-foreground)" : "var(--muted-foreground)",
                    cursor: "pointer",
                    border: "none",
                  }}
                >
                  {id === "toby" ? "Toby" : "Jay"}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={onQueueOpen}
            title={`Agent queue${queueDepth ? ` · ${queueDepth} waiting` : ""}${parallelMode ? " · parallel mode ON" : ""}`}
            className="relative text-base leading-none px-1.5 py-0.5 rounded hover:bg-surface-2/40 transition"
            style={{ filter: queueDepth ? "drop-shadow(0 0 6px var(--primary))" : undefined }}
          >
            📋
            {queueDepth > 0 && (
              <span
                className="absolute -top-1 -right-1 font-mono text-[9px] px-1 rounded-full"
                style={{ background: "var(--primary)", color: "var(--primary-foreground)", lineHeight: "12px" }}
              >
                {queueDepth}
              </span>
            )}
            {parallelMode && (
              <span
                className="absolute -bottom-1 -right-1 font-mono text-[8px] px-1 rounded"
                style={{ background: "var(--destructive)", color: "var(--destructive-foreground)", lineHeight: "10px" }}
              >
                ⚡
              </span>
            )}
          </button>
          <ActivityFeed />
          <button
            type="button"
            onClick={onSearchOpen}
            title="Search (⌘K)"
            className="text-base leading-none px-1.5 py-0.5 rounded hover:bg-surface-2/40 transition"
          >
            🔍
          </button>
          <button
            type="button"
            onClick={toggleTheme}
            title={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
            className="flex items-center justify-center transition hover:border-primary"
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: "var(--surface)",
              border: "1px solid var(--border)",
              cursor: "pointer",
              fontSize: 16,
              lineHeight: 1,
            }}
          >
            {theme === "light" ? "☀️" : "🌙"}
          </button>
        </div>
      </div>
    </header>
  );
}
