import { AgentLog } from "./AgentLog";
import type { LogLine } from "@/lib/agent-state";

export type View = "chat" | "tools" | "vault" | "connections" | "config";

interface SidebarProps {
  active: View;
  onChange: (v: View) => void;
  log: LogLine[];
}

const NAV: { id: View; label: string; icon: string }[] = [
  { id: "chat", label: "CHAT", icon: "💬" },
  { id: "tools", label: "TOOLS", icon: "🔧" },
  { id: "vault", label: "KEY VAULT", icon: "🔐" },
  { id: "connections", label: "CONNECTIONS", icon: "🔗" },
  { id: "config", label: "CONFIG", icon: "⚙" },
];

export function Sidebar({ active, onChange, log }: SidebarProps) {
  return (
    <aside
      className="flex flex-col border-r border-border bg-surface/40"
      style={{ width: 240 }}
    >
      <nav className="flex flex-col py-3">
        {NAV.map((item) => {
          const isActive = active === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChange(item.id)}
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
              <span>{item.label}</span>
              {isActive && (
                <span className="ml-auto text-[10px] text-primary">●</span>
              )}
            </button>
          );
        })}
      </nav>

      <AgentLog lines={log} />
    </aside>
  );
}
