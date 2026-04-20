import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { Sidebar, type View } from "@/components/Sidebar";
import { ConfigPanel } from "@/components/ConfigPanel";
import { ChatView, type ChatMessage } from "@/components/ChatView";
import { ChatTabsBar, type ChatTab } from "@/components/ChatTabsBar";
import { ToolsPanel } from "@/components/ToolsPanel";
import { INITIAL_LOG, nowTs, type LogLine } from "@/lib/agent-state";

export const Route = createFileRoute("/")({
  component: Index,
});

const ENABLED_TOOLS = ["web_search", "fs_read", "shell", "http_fetch"];
const TAB_COLORS = ["#ff6b00", "#39ff14", "#00bfff", "#ff3bff", "#ffcc00"];

const BOOT_MESSAGE: ChatMessage = {
  role: "assistant",
  content:
    "⚡ OpenClaw online. Connect to your Ollama endpoint and select a model to begin. I can install tools to extend my capabilities on demand.",
};

const NEW_TAB_MESSAGE: ChatMessage = {
  role: "assistant",
  content:
    "⚡ New agent session started. I share the Ollama endpoint but have my own memory. What should I work on?",
};

interface TabState extends ChatTab {
  messages: ChatMessage[];
  systemPrompt: string;
  isStreaming: boolean;
}

const defaultSystemPrompt = (tools: string[]) =>
  `You are OpenClaw, a powerful AI assistant running via Ollama. Available tools: ${tools.join(", ") || "none"}.`;

function Index() {
  const [active, setActive] = useState<View>("chat");
  const [log, setLog] = useState<LogLine[]>(INITIAL_LOG);
  const [endpoint, setEndpoint] = useState("http://localhost:11434");
  const [model, setModel] = useState<string | null>("llama3.1:8b");
  const [connected, setConnected] = useState(false);

  const appendLog = useCallback((line: LogLine) => {
    setLog((prev) => [...prev, line]);
  }, []);

  const [tabs, setTabs] = useState<TabState[]>(() => [
    {
      id: crypto.randomUUID(),
      name: "Agent 1",
      color: TAB_COLORS[0],
      model: "llama3.1:8b",
      messages: [BOOT_MESSAGE],
      systemPrompt: defaultSystemPrompt(ENABLED_TOOLS),
      isStreaming: false,
    },
  ]);
  const [activeTabId, setActiveTabId] = useState<string>(() => tabs[0].id);

  const activeTab = tabs.find((t) => t.id === activeTabId) ?? tabs[0];
  const anyStreaming = tabs.some((t) => t.isStreaming);

  const updateTab = useCallback((id: string, patch: Partial<TabState>) => {
    setTabs((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }, []);

  const handleMessagesChange = useCallback(
    (id: string, updater: (prev: ChatMessage[]) => ChatMessage[]) => {
      setTabs((prev) =>
        prev.map((t) => (t.id === id ? { ...t, messages: updater(t.messages) } : t)),
      );
    },
    [],
  );

  const handleNewTab = useCallback(() => {
    setTabs((prev) => {
      const idx = prev.length;
      const newTab: TabState = {
        id: crypto.randomUUID(),
        name: `Agent ${idx + 1}`,
        color: TAB_COLORS[idx % TAB_COLORS.length],
        model,
        messages: [NEW_TAB_MESSAGE],
        systemPrompt: defaultSystemPrompt(ENABLED_TOOLS),
        isStreaming: false,
      };
      setActiveTabId(newTab.id);
      appendLog({
        ts: nowTs(),
        level: "ARROW",
        msg: `${newTab.name} session opened (${model ?? "no model"})`,
      });
      return [...prev, newTab];
    });
  }, [model, appendLog]);

  const handleCloseTab = useCallback(
    (id: string) => {
      setTabs((prev) => {
        if (prev.length <= 1) return prev;
        const closing = prev.find((t) => t.id === id);
        const remaining = prev.filter((t) => t.id !== id);
        if (closing) {
          appendLog({
            ts: nowTs(),
            level: "ARROW",
            msg: `${closing.name} session closed`,
          });
        }
        if (id === activeTabId) {
          setActiveTabId(remaining[0].id);
        }
        return remaining;
      });
    },
    [activeTabId, appendLog],
  );

  const handleRenameTab = useCallback(
    (id: string, name: string) => updateTab(id, { name }),
    [updateTab],
  );

  // Keyboard shortcuts: ⌘T new, ⌘W close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (active !== "chat") return;
      if (!(e.metaKey || e.ctrlKey)) return;
      if (e.key === "t" || e.key === "T") {
        e.preventDefault();
        handleNewTab();
      } else if (e.key === "w" || e.key === "W") {
        e.preventDefault();
        handleCloseTab(activeTabId);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, activeTabId, handleNewTab, handleCloseTab]);

  return (
    <div className="flex flex-col h-screen w-full bg-background text-foreground">
      <Header
        connected={connected}
        model={activeTab.model ?? model}
        toolCount={ENABLED_TOOLS.length}
        streaming={anyStreaming}
      />
      {active === "chat" && (
        <ChatTabsBar
          tabs={tabs.map((t) => ({ id: t.id, name: t.name, color: t.color, model: t.model }))}
          activeId={activeTabId}
          onSelect={setActiveTabId}
          onRename={handleRenameTab}
          onClose={handleCloseTab}
          onNew={handleNewTab}
        />
      )}
      <div className="flex flex-1 min-h-0">
        <Sidebar active={active} onChange={setActive} log={log} />
        <main className="flex flex-1 min-h-0 flex-col">
          <div key={active} className="flex flex-1 min-h-0 flex-col">
            {active === "chat" && (
              <ChatView
                key={activeTab.id}
                endpoint={endpoint}
                model={activeTab.model ?? model}
                connected={connected}
                enabledTools={ENABLED_TOOLS}
                systemPrompt={activeTab.systemPrompt}
                messages={activeTab.messages}
                onMessagesChange={(updater) => handleMessagesChange(activeTab.id, updater)}
                appendLog={appendLog}
                onStreamingChange={(s) => updateTab(activeTab.id, { isStreaming: s })}
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
