import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Header } from "@/components/Header";
import { Sidebar, type View } from "@/components/Sidebar";
import { ConfigPanel } from "@/components/ConfigPanel";
import { ChatView, type ChatMessage } from "@/components/ChatView";
import { ChatTabsBar, type ChatTab } from "@/components/ChatTabsBar";
import { ToolsPanel } from "@/components/ToolsPanel";
import { ResourceBar } from "@/components/ResourceBar";
import { ConcurrencyBanner } from "@/components/ConcurrencyBanner";
import { computeResources } from "@/lib/resource-estimate";
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
  stopToken: number;
}

const defaultSystemPrompt = (tools: string[]) =>
  `You are OpenClaw, a powerful AI assistant running via Ollama. Available tools: ${tools.join(", ") || "none"}.`;

function Index() {
  const [active, setActive] = useState<View>("chat");
  const [log, setLog] = useState<LogLine[]>(INITIAL_LOG);
  const [endpoint, setEndpoint] = useState("http://localhost:11434");
  const [model, setModel] = useState<string | null>("llama3.1:8b");
  const [connected, setConnected] = useState(false);
  const [bannerDismissedAt, setBannerDismissedAt] = useState(0);

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
      stopToken: 0,
    },
  ]);
  const [activeTabId, setActiveTabId] = useState<string>(() => tabs[0].id);

  const activeTab = tabs.find((t) => t.id === activeTabId) ?? tabs[0];
  const streamingTabs = tabs.filter((t) => t.isStreaming);
  const streamingCount = streamingTabs.length;
  const anyStreaming = streamingCount > 0;

  const resources = useMemo(
    () => computeResources(streamingTabs.map((t) => t.model)),
    [streamingTabs],
  );

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
        stopToken: 0,
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

  // Bump stopToken on tabs other than `keepId` to abort their in-flight streams
  const stopOthers = useCallback(
    (keepId: string) => {
      setTabs((prev) =>
        prev.map((t) =>
          t.id === keepId || !t.isStreaming ? t : { ...t, stopToken: t.stopToken + 1 },
        ),
      );
      appendLog({ ts: nowTs(), level: "ARROW", msg: `pausing other agents` });
    },
    [appendLog],
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

  // Reset dismissal when streaming count drops below threshold
  useEffect(() => {
    if (streamingCount < 2) setBannerDismissedAt(0);
  }, [streamingCount]);

  const bannerLevel: "warn" | "critical" | null =
    streamingCount >= 3 ? "critical" : streamingCount >= 2 ? "warn" : null;
  const showBanner = bannerLevel !== null && bannerDismissedAt < streamingCount;

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
      {active === "chat" && showBanner && bannerLevel && (
        <ConcurrencyBanner
          level={bannerLevel}
          count={streamingCount}
          onPrimary={() => stopOthers(activeTabId)}
          onDismiss={() => setBannerDismissedAt(streamingCount)}
        />
      )}
      <div className="flex flex-1 min-h-0">
        <Sidebar active={active} onChange={setActive} log={log} />
        <main className="flex flex-1 min-h-0 flex-col">
          <div key={active} className="flex flex-1 min-h-0 flex-col">
            {active === "chat" && (
              <>
                <ResourceBar resources={resources} />
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
                  stopToken={activeTab.stopToken}
                />
              </>
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
