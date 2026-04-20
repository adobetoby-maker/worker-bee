import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Header } from "@/components/Header";
import { Sidebar, type View } from "@/components/Sidebar";
import { ClawLogo } from "@/components/ClawLogo";

export const Route = createFileRoute("/")({
  component: Index,
});

function BlinkingCursor() {
  return (
    <span
      className="inline-block w-2 h-4 align-middle bg-primary ml-1"
      style={{ animation: "var(--animate-blink)" }}
    />
  );
}

function ChatView() {
  return (
    <div
      className="relative flex flex-1 flex-col items-center justify-center overflow-hidden"
      style={{ animation: "var(--animate-slide-down)" }}
    >
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.04] text-primary">
        <ClawLogo size={420} active={false} />
      </div>
      <div className="relative z-10 text-center">
        <div className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">
          // session ready
        </div>
        <div className="mt-3 font-mono text-2xl text-foreground">
          <span className="text-primary">openclaw</span>
          <span className="text-muted-foreground">:</span>
          <span className="text-success">~</span>
          <span className="text-muted-foreground">$</span>{" "}
          <span className="text-muted-foreground">awaiting input</span>
          <BlinkingCursor />
        </div>
        <div className="mt-2 font-mono text-[11px] text-muted-foreground/70">
          press <span className="text-foreground">/</span> to focus · <span className="text-foreground">⌘K</span> for tools
        </div>
      </div>
    </div>
  );
}

function ToolsView() {
  return (
    <div
      className="flex flex-1 flex-col items-center justify-center"
      style={{ animation: "var(--animate-slide-down)" }}
    >
      <div className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">
        // registry
      </div>
      <div className="mt-3 font-mono text-2xl text-primary">
        4 tools registered
      </div>
      <div className="mt-2 font-mono text-[11px] text-muted-foreground">
        web_search · fs_read · shell · http_fetch
      </div>
    </div>
  );
}

function ConfigView() {
  return (
    <div
      className="flex flex-1 flex-col items-center justify-center"
      style={{ animation: "var(--animate-slide-down)" }}
    >
      <div className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">
        // runtime configuration
      </div>
      <div className="mt-3 font-mono text-2xl text-success">
        ollama :: localhost:11434
      </div>
      <div className="mt-2 font-mono text-[11px] text-muted-foreground">
        model=llama3.1:8b · ctx=8192 · temp=0.7
      </div>
    </div>
  );
}

function Index() {
  const [active, setActive] = useState<View>("chat");

  return (
    <div className="flex flex-col h-screen w-full bg-background text-foreground">
      <Header />
      <div className="flex flex-1 min-h-0">
        <Sidebar active={active} onChange={setActive} />
        <main key={active} className="flex flex-1 min-h-0 flex-col">
          {active === "chat" && <ChatView />}
          {active === "tools" && <ToolsView />}
          {active === "config" && <ConfigView />}
        </main>
      </div>
    </div>
  );
}
