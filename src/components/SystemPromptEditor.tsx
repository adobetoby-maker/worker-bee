import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { SYSTEM_PROMPT_PRESETS } from "./TabControls";

interface Props {
  initial: string;
  onSave: (next: string) => void;
  onCancel: () => void;
}

export function SystemPromptEditor({ initial, onSave, onCancel }: Props) {
  const [draft, setDraft] = useState(initial);

  return (
    <div
      className="flex flex-1 min-h-0 flex-col px-6 py-5 gap-4"
      style={{ animation: "var(--animate-slide-down)" }}
    >
      <div>
        <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
          // system prompt editor
        </div>
        <h2 className="mt-1 font-mono text-lg text-primary">Define this agent's behavior</h2>
      </div>

      <div className="flex flex-wrap gap-2">
        {SYSTEM_PROMPT_PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setDraft(p.prompt)}
            className="flex items-center gap-2 px-3 py-2 rounded border border-border bg-surface/60 hover:border-primary/60 hover:bg-primary/10 transition-colors font-mono text-[11px] text-foreground"
          >
            <span className="text-base leading-none">{p.icon}</span>
            <span>{p.label}</span>
          </button>
        ))}
      </div>

      <Textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        rows={10}
        placeholder="Describe how this agent should behave…"
        className="flex-1 min-h-[220px] resize-none font-mono text-[13px] bg-background border-border focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary"
      />

      <div
        className="font-mono italic text-[11px]"
        style={{ color: "#444" }}
      >
        💡 Each tab holds its full message history in the context window. Long conversations
        consume more RAM per inference pass. Clear history periodically to keep responses fast.
      </div>

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded border border-border font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground hover:text-foreground"
        >
          CANCEL
        </button>
        <button
          type="button"
          onClick={() => onSave(draft)}
          className="px-4 py-2 rounded bg-gradient-to-br from-primary to-primary-glow text-primary-foreground font-mono text-[11px] uppercase tracking-[0.15em] hover:shadow-[0_0_20px_-4px_var(--primary)]"
        >
          SAVE
        </button>
      </div>
    </div>
  );
}
