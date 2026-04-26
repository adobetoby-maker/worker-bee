import { AgentLog } from "./AgentLog";
import type { LogLine } from "@/lib/agent-state";
import { Link } from "@tanstack/react-router";

export type View = "chat" | "tools" | "vault" | "connections" | "builder" | "config" | "inbox-cleaner" | "email";

interface SidebarProps {
  active: View;
  onChange: (v: View) => void;
  log: LogLine[];
  /** When true, renders full-width labels regardless of breakpoint (used inside the mobile drawer). */
  alwaysExpanded?: boolean;
  /** Hide the desktop visibility wrapper (used when embedding inside a Sheet). */
  embedded?: boolean;
}

const NAV: { id: View; label: string; icon: string }[] = [
  { id: "chat", label: "CHAT", icon: "💬" },
  { id: "builder", label: "BUILDER", icon: "🏗" },
  { id: "email", label: "EMAIL", icon: "📧" },
  { id: "tools", label: "TOOLS", icon: "🔧" },
  { id: "vault", label: "KEY VAULT", icon: "🔐" },
  { id: "connections", label: "CONNECTIONS", icon: "🔗" },
  { id: "config", label: "CONFIG", icon: "⚙" },
];

export function Sidebar({ active, onChange, log, alwaysExpanded = false, embedded = false }: SidebarProps) {
  const widthClass = alwaysExpanded ? "w-full" : "w-[240px]";
  const labelClass = alwaysExpanded ? "inline" : "hidden md:inline";
  const logClass = alwaysExpanded ? "flex" : "hidden md:flex";
  const wrapperClass = embedded
    ? `flex flex-col ${widthClass} h-full shrink-0`
    : `hidden md:flex flex-col ${widthClass} shrink-0`;
  return (
    <aside
      className={wrapperClass}
      style={{ background: "var(--surface)", borderRight: "1px solid var(--border)" }}
    >
      <nav className="flex flex-col py-3">
        {NAV.map((item) => {
          const isActive = active === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChange(item.id)}
              title={item.label}
              className={`group relative flex items-center gap-3 px-5 py-3 text-left font-mono text-[12px] uppercase tracking-[0.18em] transition-colors ${
                isActive
                  ? "bg-primary/10 text-success"
                  : "text-muted-foreground hover:bg-surface-2/60 hover:text-foreground"
              }`}
            >
              <span
                className={`absolute left-0 top-0 h-full w-[3px] transition-colors ${
                  isActive ? "bg-primary" : "bg-transparent group-hover:bg-border"
                }`}
              />
              <span className="text-base leading-none">{item.icon}</span>
              <span className={labelClass}>{item.label}</span>
              {isActive && (
                <span className={`ml-auto text-[10px] text-primary ${labelClass}`}>●</span>
              )}
            </button>
          );
        })}
        <Link
          to="/learning"
          title="Learning Sessions"
          className="group relative flex items-center gap-3 px-5 py-3 text-left font-mono text-[12px] uppercase tracking-[0.18em] transition-colors text-muted-foreground hover:bg-surface-2/60 hover:text-foreground"
          activeProps={{ className: "bg-primary/10 text-success" }}
        >
          <span className="absolute left-0 top-0 h-full w-[3px] bg-transparent group-hover:bg-border" />
          <span className="text-base leading-none">🎓</span>
          <span className={labelClass}>LEARNING</span>
        </Link>
        <Link
          to="/report"
          title="Morning Report"
          className="group relative flex items-center gap-3 px-5 py-3 text-left font-mono text-[12px] uppercase tracking-[0.18em] transition-colors text-muted-foreground hover:bg-surface-2/60 hover:text-foreground"
          activeProps={{ className: "bg-primary/10 text-success" }}
        >
          <span className="absolute left-0 top-0 h-full w-[3px] bg-transparent group-hover:bg-border" />
          <span className="text-base leading-none">☀️</span>
          <span className={labelClass}>MORNING REPORT</span>
        </Link>
        <Link
          to="/practice"
          title="Practice Loop"
          className="group relative flex items-center gap-3 px-5 py-3 text-left font-mono text-[12px] uppercase tracking-[0.18em] transition-colors text-muted-foreground hover:bg-surface-2/60 hover:text-foreground"
          activeProps={{ className: "bg-primary/10 text-success" }}
        >
          <span className="absolute left-0 top-0 h-full w-[3px] bg-transparent group-hover:bg-border" />
          <span className="text-base leading-none">🔁</span>
          <span className={labelClass}>PRACTICE</span>
        </Link>
        <Link
          to="/skills"
          title="Skills"
          className="group relative flex items-center gap-3 px-5 py-3 text-left font-mono text-[12px] uppercase tracking-[0.18em] transition-colors text-muted-foreground hover:bg-surface-2/60 hover:text-foreground"
          activeProps={{ className: "bg-primary/10 text-success" }}
        >
          <span className="absolute left-0 top-0 h-full w-[3px] bg-transparent group-hover:bg-border" />
          <span className="text-base leading-none">🧠</span>
          <span className={labelClass}>SKILLS</span>
        </Link>
      </nav>

      <div className={`${logClass} flex-col flex-1 min-h-0`}>
        <AgentLog lines={log} />
      </div>
    </aside>
  );
}
