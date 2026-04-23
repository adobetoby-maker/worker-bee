import { AgentLog } from "./AgentLog";
import type { LogLine } from "@/lib/agent-state";

export type View = "chat" | "tools" | "vault" | "connections" | "builder" | "config" | "inbox-cleaner" | "email";

interface SidebarProps {
  active: View;
  onChange: (v: View) => void;
  log: LogLine[];
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

export function Sidebar({ active, onChange, log }: SidebarProps) {
  return (
    <aside
      className="flex flex-col w-[56px] md:w-[240px] shrink-0"
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
              className={`group relative flex items-center gap-3 px-4 md:px-5 py-3 text-left font-mono text-[12px] uppercase tracking-[0.18em] transition-colors ${
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
              <span className="hidden md:inline">{item.label}</span>
              {isActive && (
                <span className="ml-auto text-[10px] text-primary hidden md:inline">●</span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="hidden md:flex flex-col flex-1 min-h-0">
        <AgentLog lines={log} />
      </div>
    </aside>
  );
}
