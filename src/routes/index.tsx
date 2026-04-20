import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { Header } from "@/components/Header";
import { Sidebar, type View } from "@/components/Sidebar";
import { ClawLogo } from "@/components/ClawLogo";
import { ConfigPanel } from "@/components/ConfigPanel";
import { INITIAL_LOG, type LogLine } from "@/lib/agent-state";

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
          press <span className="text-foreground">/</span> to focus ·{" "}
          <span className="text-foreground">⌘K</span> for tools
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
      <div className="mt-3 font-mono text-2xl text-primary">4 tools registered</div>
      <div className="mt-2 font-mono text-[11px] text-muted-foreground">
        web_search · fs_read · shell · http_fetch
      </div>
    </div>
  );
}

function Index() {
  const [active, setActive] = useState<View>("chat");
  const [log, setLog] = useState<LogLine[]>(INITIAL_LOG);
  const [endpoint, setEndpoint] = useState("http://localhost:11434");
  const [model, setModel] = useState<string | null>("llama3.1:8b");
  const [connected, setConnected] = useState(false);

  const appendLog = useCallback((line: LogLine) => {
    setLog((prev) => [...prev, line]);
  }, []);

  return (
    <div className="flex flex-col h-screen w-full bg-background text-foreground">
      <Header connected={connected} model={model} toolCount={4} />
      <div className="flex flex-1 min-h-0">
        <Sidebar active={active} onChange={setActive} log={log} />
        <main key={active} className="flex flex-1 min-h-0 flex-col">
          {active === "chat" && <ChatView />}
          {active === "tools" && <ToolsView />}
          {active === "config" && (
            <ConfigPanel
              endpoint={endpoint}
              setEndpoint={setEndpoint}
              model={model}
              setModel={setModel}
              setConnected={setConnected}
              appendLog={appendLog}
            />
          )}
        </main>
      </div>
    </div>
  );
}
