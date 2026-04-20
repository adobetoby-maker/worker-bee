import { useEffect, useRef, useState, type KeyboardEvent } from "react";

export interface ChatTab {
  id: string;
  name: string;
  color: string;
  model: string | null;
}

interface Props {
  tabs: ChatTab[];
  activeId: string;
  onSelect: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onClose: (id: string) => void;
  onNew: () => void;
}

export function ChatTabsBar({ tabs, activeId, onSelect, onRename, onClose, onNew }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingId]);

  const startEdit = (tab: ChatTab) => {
    setEditingId(tab.id);
    setDraft(tab.name);
  };

  const commit = () => {
    if (editingId) {
      const trimmed = draft.trim();
      if (trimmed) onRename(editingId, trimmed);
    }
    setEditingId(null);
  };

  const onInputKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      commit();
    } else if (e.key === "Escape") {
      setEditingId(null);
    }
  };

  return (
    <div
      className="flex items-center gap-2 px-3 overflow-x-auto"
      style={{
        background: "#0a0a0a",
        borderBottom: "1px solid #1a1a1a",
        height: 48,
      }}
    >
      <div className="flex items-center gap-2">
        {tabs.map((tab) => {
          const isActive = tab.id === activeId;
          const isEditing = editingId === tab.id;
          return (
            <div
              key={tab.id}
              onClick={() => !isEditing && onSelect(tab.id)}
              onDoubleClick={() => startEdit(tab)}
              className={`group relative flex items-center gap-2 cursor-pointer rounded-md px-3 py-1.5 transition-all font-mono text-[11px] ${
                isActive ? "" : "hover:border-[#333]"
              }`}
              style={{
                width: 160,
                borderLeft: isActive ? "3px solid #ff6b00" : "3px solid transparent",
                border: isActive ? "1px solid transparent" : "1px solid #222",
                borderLeftWidth: 3,
                borderLeftColor: isActive ? "#ff6b00" : "#222",
                background: isActive ? "#ff6b0012" : "transparent",
                color: isActive ? "#ff6b00" : "#555",
              }}
            >
              <span
                className="inline-block h-2 w-2 rounded-full shrink-0"
                style={{ background: tab.color, boxShadow: `0 0 6px ${tab.color}` }}
              />
              <div className="flex-1 min-w-0">
                {isEditing ? (
                  <input
                    ref={inputRef}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onBlur={commit}
                    onKeyDown={onInputKey}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full bg-background border border-primary/60 rounded px-1 py-0 text-[11px] text-foreground font-mono outline-none"
                  />
                ) : (
                  <>
                    <div className="truncate leading-tight">{tab.name}</div>
                    <div
                      className="truncate text-[9px] uppercase tracking-[0.1em] mt-0.5"
                      style={{ color: isActive ? "#ff6b0099" : "#444" }}
                    >
                      {tab.model ?? "no model"}
                    </div>
                  </>
                )}
              </div>
              {tabs.length > 1 && !isEditing && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onClose(tab.id);
                  }}
                  className="shrink-0 text-[14px] leading-none opacity-50 hover:opacity-100 hover:text-destructive"
                  aria-label="Close tab"
                >
                  ×
                </button>
              )}
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={onNew}
        className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-md font-mono text-[11px] uppercase tracking-[0.15em] text-primary border border-primary/40 hover:bg-primary/10 hover:border-primary transition-colors"
      >
        + NEW AGENT
      </button>

      <div className="ml-auto shrink-0 font-mono text-[10px] tracking-[0.1em] text-muted-foreground/50 hidden md:block">
        ⌘T new · ⌘W close
      </div>
    </div>
  );
}
