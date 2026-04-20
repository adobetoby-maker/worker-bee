import { useEffect, useMemo, useRef, useState } from "react";
import type { ConnectionsState } from "@/lib/connections";

export interface SearchableTab {
  id: string;
  name: string;
  messages: { role: string; content: string }[];
}

export interface SearchableTool {
  id: string;
  name: string;
  icon: string;
}

export interface SearchablePot {
  id: string;
  service: string;
  emoji: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  tabs: SearchableTab[];
  tools: SearchableTool[];
  pots: SearchablePot[];
  connections: ConnectionsState;
  onJumpAgent: (tabId: string) => void;
  onJumpTools: () => void;
  onJumpVault: () => void;
  onJumpConnections: () => void;
}

interface Hit {
  category: "AGENTS" | "TOOLS" | "VAULT" | "CONNECTIONS";
  id: string;
  label: string;
  hint?: string;
  icon: string;
  action: () => void;
}

export function GlobalSearch({
  open,
  onClose,
  tabs,
  tools,
  pots,
  connections,
  onJumpAgent,
  onJumpTools,
  onJumpVault,
  onJumpConnections,
}: Props) {
  const [q, setQ] = useState("");
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQ("");
      setCursor(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  const hits: Hit[] = useMemo(() => {
    if (!open) return [];
    const ql = q.trim().toLowerCase();
    const out: Hit[] = [];

    for (const t of tabs) {
      const inName = t.name.toLowerCase().includes(ql);
      const msgHit = t.messages.find((m) => m.content.toLowerCase().includes(ql));
      if (!ql || inName || msgHit) {
        out.push({
          category: "AGENTS",
          id: `tab-${t.id}`,
          icon: "🐝",
          label: t.name,
          hint: !ql || inName ? `${t.messages.length} msgs` : msgHit?.content.slice(0, 60),
          action: () => {
            onJumpAgent(t.id);
            onClose();
          },
        });
      }
    }
    for (const tool of tools) {
      if (!ql || tool.name.toLowerCase().includes(ql) || tool.id.toLowerCase().includes(ql)) {
        out.push({
          category: "TOOLS",
          id: `tool-${tool.id}`,
          icon: tool.icon,
          label: tool.name,
          hint: tool.id,
          action: () => {
            onJumpTools();
            onClose();
          },
        });
      }
    }
    for (const p of pots) {
      if (!ql || p.service.toLowerCase().includes(ql)) {
        out.push({
          category: "VAULT",
          id: `pot-${p.id}`,
          icon: p.emoji || "🍯",
          label: p.service,
          hint: "Open vault",
          action: () => {
            onJumpVault();
            onClose();
          },
        });
      }
    }
    const services: { key: keyof ConnectionsState; label: string; icon: string }[] = [
      { key: "gmail", label: "Gmail", icon: "📧" },
      { key: "slack", label: "Slack", icon: "💬" },
      { key: "whatsapp", label: "WhatsApp", icon: "📱" },
    ];
    for (const s of services) {
      if (!ql || s.label.toLowerCase().includes(ql)) {
        out.push({
          category: "CONNECTIONS",
          id: `conn-${s.key}`,
          icon: s.icon,
          label: s.label,
          hint: connections[s.key] ? "● connected" : "not connected",
          action: () => {
            onJumpConnections();
            onClose();
          },
        });
      }
    }
    return out.slice(0, 30);
  }, [q, tabs, tools, pots, connections, open, onJumpAgent, onJumpTools, onJumpVault, onJumpConnections, onClose]);

  useEffect(() => {
    setCursor(0);
  }, [q]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setCursor((c) => Math.min(hits.length - 1, c + 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setCursor((c) => Math.max(0, c - 1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        hits[cursor]?.action();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, hits, cursor, onClose]);

  if (!open) return null;

  // Group by category for display
  const grouped = hits.reduce<Record<string, Hit[]>>((acc, h) => {
    (acc[h.category] ||= []).push(h);
    return acc;
  }, {});
  const categories: Hit["category"][] = ["AGENTS", "TOOLS", "VAULT", "CONNECTIONS"];

  let flatIdx = -1;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center pt-[12vh] px-4"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)" }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-2xl rounded-lg border border-primary/50 bg-background shadow-[0_0_60px_-10px_var(--primary)] overflow-hidden">
        <div className="relative">
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search agents, tools, credentials..."
            className="w-full bg-background text-foreground font-mono text-base px-5 outline-none border-b-2 border-primary/40 focus:border-primary transition-colors"
            style={{ height: 48 }}
          />
          <span
            className="absolute right-4 top-1/2 -translate-y-1/2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground border border-border rounded px-1.5 py-0.5"
            style={{ pointerEvents: "none" }}
          >
            ⌘K
          </span>
        </div>
        <div className="max-h-[60vh] overflow-y-auto">
          {hits.length === 0 ? (
            <div className="px-5 py-10 text-center font-mono text-sm text-muted-foreground">
              No matches.
            </div>
          ) : (
            categories.map((cat) => {
              const list = grouped[cat];
              if (!list?.length) return null;
              return (
                <div key={cat}>
                  <div className="px-4 pt-3 pb-1 font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                    {cat}
                  </div>
                  {list.map((h) => {
                    flatIdx++;
                    const sel = flatIdx === cursor;
                    return (
                      <button
                        key={h.id}
                        type="button"
                        onMouseEnter={() => setCursor(hits.indexOf(h))}
                        onClick={h.action}
                        className={`w-full flex items-center gap-3 px-4 py-2 text-left transition-colors ${
                          sel ? "bg-primary/15 text-foreground" : "hover:bg-surface/60"
                        }`}
                      >
                        <span className="text-lg">{h.icon}</span>
                        <span className="font-mono text-sm flex-1 truncate">{h.label}</span>
                        {h.hint && (
                          <span className="font-mono text-[11px] text-muted-foreground truncate max-w-[260px]">
                            {h.hint}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>
        <div className="px-4 py-2 border-t border-border flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          <span>↑↓ navigate · ↵ open · esc close</span>
          <span>{hits.length} results</span>
        </div>
      </div>
    </div>
  );
}
