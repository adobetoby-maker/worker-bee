import type { View } from "./Sidebar";
import { Link } from "@tanstack/react-router";

interface MobileTabBarProps {
  active: View;
  onChange: (v: View) => void;
}

const ITEMS: { id: View; label: string; icon: string }[] = [
  { id: "chat", label: "Chat", icon: "💬" },
  { id: "tools", label: "Tools", icon: "🔧" },
  { id: "config", label: "Config", icon: "⚙" },
];

/**
 * Bottom tab bar shown only on phone-width screens (<md).
 * Re-uses the same `View` state as the desktop Sidebar — no duplicate wiring.
 */
export function MobileTabBar({ active, onChange }: MobileTabBarProps) {
  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-40 flex items-stretch border-t overflow-x-auto"
      style={{
        background: "var(--surface)",
        borderColor: "var(--border)",
        paddingBottom: "env(safe-area-inset-bottom)",
        scrollbarWidth: "none",
        WebkitOverflowScrolling: "touch",
      }}
      aria-label="Primary"
    >
      {ITEMS.map((it) => {
        const isActive = active === it.id;
        return (
          <button
            key={it.id}
            type="button"
            onClick={() => onChange(it.id)}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 font-mono text-[10px] uppercase tracking-[0.14em] transition-colors ${
              isActive ? "text-success" : "text-muted-foreground active:text-foreground"
            }`}
            style={{
              borderTop: isActive ? "2px solid var(--primary)" : "2px solid transparent",
              minHeight: 56,
            }}
            aria-current={isActive ? "page" : undefined}
          >
            <span className="text-lg leading-none">{it.icon}</span>
            <span>{it.label}</span>
          </button>
        );
      })}
      <Link
        to="/learning"
        className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 font-mono text-[10px] uppercase tracking-[0.14em] transition-colors text-muted-foreground active:text-foreground"
        activeProps={{
          className:
            "flex-1 flex flex-col items-center justify-center gap-0.5 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-success",
          style: { borderTop: "2px solid var(--primary)", minHeight: 56 },
        }}
        style={{ borderTop: "2px solid transparent", minHeight: 56 }}
      >
        <span className="text-lg leading-none">🎓</span>
        <span>Learn</span>
      </Link>
      <Link
        to="/practice"
        className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 font-mono text-[10px] uppercase tracking-[0.14em] transition-colors text-muted-foreground active:text-foreground"
        activeProps={{
          className:
            "flex-1 flex flex-col items-center justify-center gap-0.5 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-success",
          style: { borderTop: "2px solid var(--primary)", minHeight: 56 },
        }}
        style={{ borderTop: "2px solid transparent", minHeight: 56 }}
      >
        <span className="text-lg leading-none">🔁</span>
        <span>Practice</span>
      </Link>
      <Link
        to="/report"
        className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 font-mono text-[10px] uppercase tracking-[0.14em] transition-colors text-muted-foreground active:text-foreground"
        activeProps={{
          className:
            "flex-1 flex flex-col items-center justify-center gap-0.5 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-success",
          style: { borderTop: "2px solid var(--primary)", minHeight: 56 },
        }}
        style={{ borderTop: "2px solid transparent", minHeight: 56 }}
      >
        <span className="text-lg leading-none">☀️</span>
        <span>Report</span>
      </Link>
      <Link
        to="/skills"
        className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 font-mono text-[10px] uppercase tracking-[0.14em] transition-colors text-muted-foreground active:text-foreground"
        activeProps={{
          className:
            "flex-1 flex flex-col items-center justify-center gap-0.5 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-success",
          style: { borderTop: "2px solid var(--primary)", minHeight: 56 },
        }}
        style={{ borderTop: "2px solid transparent", minHeight: 56 }}
      >
        <span className="text-lg leading-none">🧠</span>
        <span>Skills</span>
      </Link>
    </nav>
  );
}