import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Sidebar, type View } from "./Sidebar";
import type { LogLine } from "@/lib/agent-state";

interface MobileNavDrawerProps {
  active: View;
  onChange: (v: View) => void;
  log: LogLine[];
}

/**
 * Floating ☰ button (mobile only) that slides in the full Sidebar
 * — every nav target + AgentLog — without changing existing wiring.
 */
export function MobileNavDrawer({ active, onChange, log }: MobileNavDrawerProps) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          aria-label="Open navigation"
          className="md:hidden fixed top-2 left-2 z-50 inline-flex items-center justify-center rounded-md border shadow-sm"
          style={{
            width: 40,
            height: 40,
            background: "var(--surface)",
            borderColor: "var(--border)",
            color: "var(--foreground)",
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
      </SheetTrigger>
      <SheetContent
        side="left"
        className="p-0 w-[280px] sm:w-[320px]"
        style={{ background: "var(--surface)" }}
      >
        <SheetTitle className="sr-only">Navigation</SheetTitle>
        <Sidebar
          active={active}
          onChange={(v) => {
            onChange(v);
            setOpen(false);
          }}
          log={log}
          alwaysExpanded
          embedded
        />
      </SheetContent>
    </Sheet>
  );
}