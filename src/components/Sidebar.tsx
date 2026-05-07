import { AgentLog } from "./AgentLog";
import type { LogLine } from "@/lib/agent-state";
import { Link } from "@tanstack/react-router";

export type View =
  | "chat"
  | "tools"
  | "vault"
  | "connections"
  | "builder"
  | "blueprint"
  | "config"
  | "inbox-cleaner"
  | "email";

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
  { id: "chat", label: "Chat", icon: "💬" },
  { id: "builder", label: "Builder", icon: "🏗" },
  { id: "blueprint", label: "Blueprint", icon: "🗺" },
  { id: "email", label: "Email", icon: "📧" },
  { id: "tools", label: "Tools", icon: "🔧" },
  { id: "vault", label: "Key Vault", icon: "🔐" },
  { id: "connections", label: "Connections", icon: "🔗" },
  { id: "config", label: "Config", icon: "⚙" },
];

const LINK_NAV: {
  to: "/learning" | "/report" | "/practice" | "/skills";
  label: string;
  icon: string;
}[] = [
  { to: "/learning", label: "Learning", icon: "🎓" },
  { to: "/report", label: "Morning Report", icon: "☀️" },
  { to: "/practice", label: "Practice", icon: "🔁" },
  { to: "/skills", label: "Skills", icon: "🧠" },
];

export function Sidebar({
  active,
  onChange,
  log,
  alwaysExpanded = false,
  embedded = false,
}: SidebarProps) {
  const widthClass = alwaysExpanded ? "w-full" : "w-[220px]";
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
      <nav className="flex flex-col py-2">
        {NAV.map((item) => {
          const isActive = active === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChange(item.id)}
              title={item.label}
              className={`group relative flex items-center gap-2.5 px-4 py-2.5 text-left text-[13px] transition-colors ${
                isActive
                  ? "bg-primary/8 text-foreground font-medium"
                  : "text-muted-foreground hover:bg-surface-2/70 hover:text-foreground"
              }`}
            >
              <span
                className={`absolute left-0 top-1 bottom-1 w-[3px] rounded-r transition-colors ${
                  isActive ? "bg-primary" : "bg-transparent"
                }`}
              />
              <span className="text-[15px] leading-none">{item.icon}</span>
              <span className={labelClass}>{item.label}</span>
            </button>
          );
        })}

        <div
          className="mx-4 my-1.5"
          style={{ height: "1px", background: "var(--border)" }}
          role="separator"
        />

        {LINK_NAV.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            title={item.label}
            className="group relative flex items-center gap-2.5 px-4 py-2.5 text-[13px] transition-colors text-muted-foreground hover:bg-surface-2/70 hover:text-foreground"
            activeProps={{ className: "bg-primary/8 text-foreground font-medium" }}
          >
            <span className="absolute left-0 top-1 bottom-1 w-[3px] rounded-r bg-transparent group-[.active]:bg-primary" />
            <span className="text-[15px] leading-none">{item.icon}</span>
            <span className={labelClass}>{item.label}</span>
          </Link>
        ))}
      </nav>

      <div className={`${logClass} flex-col flex-1 min-h-0`}>
        <AgentLog lines={log} />
      </div>
    </aside>
  );
}
