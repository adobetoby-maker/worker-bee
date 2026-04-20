import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { Header } from "@/components/Header";
import { Sidebar, type View } from "@/components/Sidebar";
import { ConfigPanel } from "@/components/ConfigPanel";
import { ChatView } from "@/components/ChatView";
import { ToolsPanel } from "@/components/ToolsPanel";
import { INITIAL_LOG, type LogLine } from "@/lib/agent-state";

export const Route = createFileRoute("/")({
  component: Index,
});


const ENABLED_TOOLS = ["web_search", "fs_read", "shell", "http_fetch"];

function Index() {
  const [active, setActive] = useState<View>("chat");
  const [log, setLog] = useState<LogLine[]>(INITIAL_LOG);
  const [endpoint, setEndpoint] = useState("http://localhost:11434");
  const [model, setModel] = useState<string | null>("llama3.1:8b");
  const [connected, setConnected] = useState(false);
  const [streaming, setStreaming] = useState(false);

  const appendLog = useCallback((line: LogLine) => {
    setLog((prev) => [...prev, line]);
  }, []);

  return (
    <div className="flex flex-col h-screen w-full bg-background text-foreground">
      <Header
        connected={connected}
        model={model}
        toolCount={ENABLED_TOOLS.length}
        active={streaming || connected}
      />
      <div className="flex flex-1 min-h-0">
        <Sidebar active={active} onChange={setActive} log={log} />
        <main className="flex flex-1 min-h-0 flex-col">
          <div key={active} className="flex flex-1 min-h-0 flex-col">
            {active === "chat" && (
              <ChatView
                endpoint={endpoint}
                model={model}
                connected={connected}
                enabledTools={ENABLED_TOOLS}
                appendLog={appendLog}
                onStreamingChange={setStreaming}
              />
            )}
            {active === "tools" && <ToolsPanel appendLog={appendLog} />}
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
          </div>
        </main>
      </div>
    </div>
  );
}
