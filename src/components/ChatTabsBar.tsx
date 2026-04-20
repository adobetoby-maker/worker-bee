import { useEffect, useRef, useState, type DragEvent, type KeyboardEvent } from "react";

export interface ChatTab {
  id: string;
  name: string;
  color: string;
  model: string | null;
  isStreaming?: boolean;
  hasError?: boolean;
  messageCount?: number;
  hasInteracted?: boolean;
  isQueued?: boolean;
  flashTurn?: boolean;
}

interface Props {
  tabs: ChatTab[];
  activeId: string;
  onSelect: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onClose: (id: string) => void;
  onNew: () => void;
  onReorder: (fromId: string, toId: string) => void;
  savedFlash?: number;
}

export function ChatTabsBar({
  tabs,
  activeId,
  onSelect,
  onRename,
  onClose,
  onNew,
  onReorder,
  savedFlash = 0,
}: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [overflow, setOverflow] = useState({ left: false, right: false });
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingId]);

  const updateOverflow = () => {
    const el = scrollerRef.current;
    if (!el) return;
    setOverflow({
      left: el.scrollLeft > 4,
      right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4,
    });
  };

  useEffect(() => {
    updateOverflow();
    const el = scrollerRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateOverflow);
    window.addEventListener("resize", updateOverflow);
    return () => {
      el.removeEventListener("scroll", updateOverflow);
      window.removeEventListener("resize", updateOverflow);
    };
  }, [tabs.length]);

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

  const onDragStart = (e: DragEvent<HTMLDivElement>, id: string) => {
    setDragId(id);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", id);
  };
  const onDragOverTab = (e: DragEvent<HTMLDivElement>, id: string) => {
    if (!dragId || dragId === id) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverId(id);
  };
  const onDropTab = (e: DragEvent<HTMLDivElement>, id: string) => {
    e.preventDefault();
    if (dragId && dragId !== id) onReorder(dragId, id);
    setDragId(null);
    setDragOverId(null);
  };
  const onDragEnd = () => {
    setDragId(null);
    setDragOverId(null);
  };

  const scroll = (dir: -1 | 1) => {
    const el = scrollerRef.current;
    if (el) el.scrollBy({ left: dir * 200, behavior: "smooth" });
  };

  return (
    <div
      className="relative flex items-center gap-2 px-3"
      style={{
        background: "#0a0a0a",
        borderBottom: "1px solid #1a1a1a",
        height: 48,
      }}
    >
      {overflow.left && (
        <button
          type="button"
          onClick={() => scroll(-1)}
          className="shrink-0 h-7 w-7 flex items-center justify-center rounded text-[#777] hover:text-primary hover:bg-primary/10"
          aria-label="Scroll tabs left"
        >
          ‹
        </button>
      )}

      <div
        ref={scrollerRef}
        className="flex items-center gap-2 overflow-x-auto"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" } as React.CSSProperties}
      >
        <style>{`.tabs-scroller::-webkit-scrollbar{display:none}`}</style>
        {tabs.map((tab) => {
          const isActive = tab.id === activeId;
          const isEditing = editingId === tab.id;
          const isDragOver = dragOverId === tab.id;
          const isDragging = dragId === tab.id;
          const streaming = !!tab.isStreaming;
          const errored = !!tab.hasError;
          const queued = !!tab.isQueued;
          const flashTurn = !!tab.flashTurn;
          const idle = !streaming && !errored && !queued && (tab.hasInteracted ?? false);
          const dotColor = errored ? "#ff3b3b" : queued ? "#ffaa00" : tab.color;
          return (
            <div key={tab.id} className="relative flex items-center">
              {isDragOver && dragId !== tab.id && (
                <span
                  className="absolute -left-1 top-1 bottom-1 w-[2px] rounded"
                  style={{ background: "#00bfff", boxShadow: "0 0 6px #00bfff" }}
                />
              )}
              <div
                draggable={!isEditing}
                onDragStart={(e) => onDragStart(e, tab.id)}
                onDragOver={(e) => onDragOverTab(e, tab.id)}
                onDrop={(e) => onDropTab(e, tab.id)}
                onDragEnd={onDragEnd}
                onClick={() => !isEditing && onSelect(tab.id)}
                onDoubleClick={() => startEdit(tab)}
                className="group relative flex items-center gap-2 cursor-pointer rounded-md px-3 py-1.5 transition-all font-mono text-[11px] shrink-0"
                style={{
                  width: 170,
                  border: isActive ? "1px solid transparent" : "1px solid #222",
                  borderLeftWidth: 3,
                  borderLeftColor: isActive ? "#ffaa00" : "#222",
                  background: isActive ? "#ffaa0014" : "transparent",
                  color: isActive ? "#ffaa00" : "#555",
                  opacity: isDragging ? 0.4 : 1,
                }}
              >
                {/* Activity indicator */}
                <span className="relative inline-flex items-center justify-center shrink-0" style={{ width: 14, height: 14 }}>
                  {streaming && (
                    <span
                      className="absolute inset-0 rounded-full"
                      style={{
                        border: `1.5px solid ${dotColor}`,
                        borderTopColor: "transparent",
                        animation: "tab-spin 0.9s linear infinite",
                      }}
                    />
                  )}
                  <span
                    className="inline-block rounded-full"
                    style={{
                      width: 8,
                      height: 8,
                      background: dotColor,
                      opacity: streaming || errored ? 1 : idle ? 0.6 : 0.3,
                      boxShadow: streaming || errored ? `0 0 6px ${dotColor}` : "none",
                      color: dotColor,
                      animation: streaming ? "tab-pulse-ring 1.2s ease-out infinite" : undefined,
                    }}
                  />
                </span>

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
                      <div className="truncate leading-tight">
                        {errored && <span className="mr-1">⚠</span>}
                        {tab.name}
                        <span
                          className="ml-1.5 text-[9px]"
                          style={{ color: isActive ? "#ffaa0080" : "#3a3a3a" }}
                        >
                          · {tab.messageCount ?? 0} msg{(tab.messageCount ?? 0) === 1 ? "" : "s"}
                        </span>
                      </div>
                      <div
                        className="truncate text-[9px] uppercase tracking-[0.1em] mt-0.5"
                        style={{ color: isActive ? "#ffaa0099" : "#444" }}
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
            </div>
          );
        })}
      </div>

      {overflow.right && (
        <button
          type="button"
          onClick={() => scroll(1)}
          className="shrink-0 h-7 w-7 flex items-center justify-center rounded text-[#777] hover:text-primary hover:bg-primary/10"
          aria-label="Scroll tabs right"
        >
          ›
        </button>
      )}

      <button
        type="button"
        onClick={onNew}
        className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-md font-mono text-[11px] uppercase tracking-[0.15em] text-primary border border-primary/40 hover:bg-primary/10 hover:border-primary transition-colors"
      >
        + NEW AGENT
      </button>

      <div className="ml-auto shrink-0 flex items-center gap-3">
        {savedFlash > 0 && (
          <span
            key={savedFlash}
            className="font-mono text-[10px] tracking-[0.1em]"
            style={{ color: "#39ff14", animation: "saved-flash 700ms ease-out forwards" }}
          >
            💾 saved
          </span>
        )}
        <span className="font-mono text-[10px] tracking-[0.1em] text-muted-foreground/50 hidden md:block">
          ⌘T new · ⌘W close · ⌘1–5 switch
        </span>
      </div>
    </div>
  );
}
