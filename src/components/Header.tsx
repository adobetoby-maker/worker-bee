import { useEffect, useState } from "react";
import { BeeLogo } from "./BeeLogo";
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
      try {
        localStorage.setItem("workerbee_theme", next);
      } catch (_) {
        // ignore localStorage quota errors
      }
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

export function Header({
  connected,
  model,
  toolCount,
  streaming = false,
  error = false,
  services,
  onServiceClick,
  onSearchOpen,
  onQueueOpen,
  queueDepth = 0,
  parallelMode = false,
  autoStatus = "idle",
  reconnectInfo = null,
  onOpenConfig,
}: HeaderProps) {
  const { theme, toggle: toggleTheme } = useTheme();
  const [identity, setIdentityLocal] = useState<Identity>("toby");
  useEffect(() => {
    setIdentityLocal(getIdentity());
    return subscribeIdentity(setIdentityLocal);
  }, []);

  return (
    <header
      className="sticky top-0 z-40 flex items-center justify-between pl-14 pr-3 sm:pl-4 sm:pr-4 backdrop-blur gap-3"
      style={{ height: 60, background: "var(--surface)", borderBottom: "1px solid var(--border)" }}
    >
      {/* Logo + name */}
      <div className="flex items-center gap-2.5 min-w-0 shrink-0">
        <BeeLogo size={36} streaming={streaming} error={error} />
        <div className="flex flex-col leading-none">
          <span
            className="font-semibold text-[15px] tracking-tight select-none"
            style={{ color: "var(--foreground)" }}
          >
            Worker<span style={{ color: "var(--primary)" }}>Bee</span>
          </span>
          <span
            className="mt-0.5 text-[10px] select-none"
            style={{ color: "var(--muted-foreground)" }}
          >
            website builder
          </span>
        </div>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-1.5 min-w-0">
        {/* Connection status */}
        {connected ? (
          <span
            className="hidden sm:inline-flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-md"
            style={{
              color: "var(--success)",
              background: "color-mix(in oklab, var(--success) 10%, transparent)",
              border: "1px solid color-mix(in oklab, var(--success) 25%, transparent)",
            }}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--success)" }} />
            Ollama live
          </span>
        ) : autoStatus === "trying" || autoStatus === "reconnecting" ? (
          <span
            className="inline-flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-md"
            style={{
              color: "var(--primary)",
              background: "color-mix(in oklab, var(--primary) 8%, transparent)",
              border: "1px solid color-mix(in oklab, var(--primary) 20%, transparent)",
            }}
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{
                background: "var(--primary)",
                animation: "pulse-neon 1.4s ease-in-out infinite",
              }}
            />
            {autoStatus === "reconnecting" && reconnectInfo
              ? `Reconnecting… (${reconnectInfo.attempt}/${reconnectInfo.max})`
              : "Connecting…"}
          </span>
        ) : autoStatus === "failed" ? (
          <button
            type="button"
            onClick={onOpenConfig}
            className="inline-flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-md hover:opacity-80 transition"
            style={{
              color: "var(--destructive)",
              background: "color-mix(in oklab, var(--destructive) 8%, transparent)",
              border: "1px solid color-mix(in oklab, var(--destructive) 20%, transparent)",
            }}
          >
            ⚠ Offline — check config
          </button>
        ) : (
          <span
            className="hidden sm:inline-flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-md"
            style={{
              color: "var(--muted-foreground)",
              background: "color-mix(in oklab, var(--border) 50%, transparent)",
              border: "1px solid var(--border)",
            }}
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: "var(--muted-foreground)" }}
            />
            Disconnected
          </span>
        )}

        {/* Model badge */}
        {model && model !== "none" && (
          <span
            className="hidden md:inline-flex items-center text-[11px] px-2 py-1 rounded-md font-mono truncate max-w-[140px]"
            style={{
              color: "var(--muted-foreground)",
              background: "var(--surface-2)",
              border: "1px solid var(--border)",
            }}
            title={model}
          >
            {model}
          </span>
        )}

        {/* Tool count */}
        <span
          className="hidden lg:inline-flex items-center text-[11px] px-2 py-1 rounded-md"
          style={{
            color: "var(--muted-foreground)",
            background: "var(--surface-2)",
            border: "1px solid var(--border)",
          }}
        >
          🔧 {toolCount}
        </span>

        {/* Services */}
        {services && (
          <div
            className="hidden sm:flex items-center gap-0.5 pl-1.5 ml-0.5 border-l"
            style={{ borderColor: "var(--border)" }}
          >
            {(["gmail", "slack", "whatsapp"] as const).map((s) => {
              const icon = s === "gmail" ? "📧" : s === "slack" ? "💬" : "📱";
              const on = services[s];
              return (
                <button
                  key={s}
                  type="button"
                  onClick={onServiceClick}
                  title={`${s}: ${on ? "connected" : "not connected"}`}
                  className="text-[15px] leading-none px-1 py-1 rounded-md hover:bg-surface-2/70 transition"
                  style={{ opacity: on ? 1 : 0.3 }}
                >
                  {icon}
                </button>
              );
            })}
          </div>
        )}

        <div
          className="flex items-center gap-0.5 pl-1.5 ml-0.5 border-l"
          style={{ borderColor: "var(--border)" }}
        >
          {/* Identity toggle */}
          <div
            className="hidden sm:inline-flex items-center mr-0.5 overflow-hidden rounded-md"
            role="group"
            aria-label="User identity"
            style={{ border: "1px solid var(--border)", background: "var(--surface-2)" }}
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
                  className="text-[11px] transition px-2.5 py-1"
                  style={{
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

          {/* Queue button */}
          <button
            type="button"
            onClick={onQueueOpen}
            title={`Agent queue${queueDepth ? ` · ${queueDepth} waiting` : ""}${parallelMode ? " · parallel mode ON" : ""}`}
            className="relative text-[15px] leading-none px-1.5 py-1.5 rounded-md hover:bg-surface-2/70 transition"
          >
            📋
            {queueDepth > 0 && (
              <span
                className="absolute -top-1 -right-1 font-mono text-[9px] px-1 rounded-full leading-[12px]"
                style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
              >
                {queueDepth}
              </span>
            )}
            {parallelMode && (
              <span
                className="absolute -bottom-1 -right-1 font-mono text-[8px] px-1 rounded leading-[10px]"
                style={{ background: "var(--destructive)", color: "var(--destructive-foreground)" }}
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
            className="text-[15px] leading-none px-1.5 py-1.5 rounded-md hover:bg-surface-2/70 transition"
          >
            🔍
          </button>

          <button
            type="button"
            onClick={toggleTheme}
            title={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
            className="flex items-center justify-center transition hover:bg-surface-2/70 rounded-md"
            style={{ width: 32, height: 32, fontSize: 15, border: "1px solid var(--border)" }}
          >
            {theme === "light" ? "☀️" : "🌙"}
          </button>
        </div>
      </div>
    </header>
  );
}
