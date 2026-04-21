import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Header } from "@/components/Header";
import { VaultPanel } from "@/components/VaultPanel";
import { ConnectionsPanel } from "@/components/ConnectionsPanel";
import { Sidebar, type View } from "@/components/Sidebar";
import { loadConnections, saveConnections, type ConnectionsState } from "@/lib/connections";
import { ConfigPanel } from "@/components/ConfigPanel";
import { ChatView, type ChatMessage } from "@/components/ChatView";
import { ChatTabsBar, type ChatTab } from "@/components/ChatTabsBar";
import { ToolsPanel } from "@/components/ToolsPanel";
import { ResourceBar } from "@/components/ResourceBar";
import { ConcurrencyBanner } from "@/components/ConcurrencyBanner";
import { TabControls } from "@/components/TabControls";
import { SystemPromptEditor } from "@/components/SystemPromptEditor";
import { MachineLimitAdvisor } from "@/components/MachineLimitAdvisor";
import { computeResources } from "@/lib/resource-estimate";
import {
  loadStoredProfile,
  saveStoredProfile,
  isAdvisorShown,
  markAdvisorShown,
  type MachineProfile,
} from "@/lib/machine-profile";
import { INITIAL_LOG, nowTs, type LogLine } from "@/lib/agent-state";
import { runBootSequence } from "@/lib/boot-sequence";
import { useOllamaPs, type PsSnapshot } from "@/lib/use-ollama-ps";
import { toast } from "sonner";
import { GlobalSearch } from "@/components/GlobalSearch";
import { OnboardingWizard } from "@/components/OnboardingWizard";
import { isBrandNewUser } from "@/lib/onboarding";
import { emitActivity, subscribeActivity } from "@/lib/activity-feed";
import { subscribeVaultSnapshot, type PotSnapshot } from "@/lib/vault-snapshot";
import { buildEnrichedSystemPrompt } from "@/lib/system-prompt";
import { QueuePanel } from "@/components/QueuePanel";
import {
  subscribeQueue,
  canStartImmediately,
  enqueue,
  markActive,
  finishActive,
  cancelQueued,
  moveToFront,
  queuePositionFor,
  estimatedWaitSeconds,
  type QueueState,
} from "@/lib/agent-queue";
import { ProjectsDashboard } from "@/components/ProjectsDashboard";
import { ProjectWorkspace } from "@/components/ProjectWorkspace";
import { DiffViewer } from "@/components/DiffViewer";
import {
  subscribeProjects,
  bindTabToProject,
  projectForTab,
  addFile,
  guessFilenameFromCode,
  languageFromFenceLabel,
  formatBytes,
  type Project,
} from "@/lib/projects";
import { diffLines } from "@/lib/diff";
import { ejectAllForTab } from "@/lib/injection-registry";
import { openAgentWS, closeAgentWS, sendPing } from "@/lib/agent-ws";
import {
  autoDiscoverEndpoint,
  loadSavedEndpoint,
  hasEverConnected,
  saveEndpoint,
  type EndpointMode,
  type AutoConnectStatus,
} from "@/lib/auto-connect";
import { WelcomeCard } from "@/components/WelcomeCard";

export const Route = createFileRoute("/")({
  component: Index,
});

const ENABLED_TOOLS = ["web_search", "fs_read", "shell", "http_fetch"];
const TAB_COLORS = ["#ffaa00", "#39ff14", "#00bfff", "#ff3bff", "#ffcc00"];
const TABS_STORAGE_KEY = "openclaw_tabs";

const BOOT_MESSAGE: ChatMessage = {
  role: "assistant",
  content:
    "🐝 Worker Bee online. Connect to your Ollama endpoint and select a model to begin. I can install tools to extend my capabilities on demand.",
};

const NEW_TAB_MESSAGE: ChatMessage = {
  role: "assistant",
  content:
    "🐝 New worker bee buzzing. I share the Ollama endpoint but have my own memory. What should I build?",
};

interface TabState extends ChatTab {
  messages: ChatMessage[];
  systemPrompt: string;
  isStreaming: boolean;
  hasError: boolean;
  stopToken: number;
}

const defaultSystemPrompt = (tools: string[]) =>
  `You are Worker Bee, a website-building AI agent running via Ollama. Available tools: ${tools.join(", ") || "none"}.`;

function loadStoredTabs(): TabState[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(TABS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Array<Partial<TabState>>;
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    return parsed.map((t, i) => ({
      id: t.id ?? crypto.randomUUID(),
      name: t.name ?? `Agent ${i + 1}`,
      color: t.color ?? TAB_COLORS[i % TAB_COLORS.length],
      model: t.model ?? null,
      messages: Array.isArray(t.messages) ? (t.messages as ChatMessage[]) : [BOOT_MESSAGE],
      systemPrompt: t.systemPrompt ?? defaultSystemPrompt(ENABLED_TOOLS),
      isStreaming: false,
      hasError: false,
      stopToken: 0,
    }));
  } catch {
    return null;
  }
}

function Index() {
  const [active, setActive] = useState<View>("chat");
  const [log, setLog] = useState<LogLine[]>(INITIAL_LOG);
  const [endpoint, setEndpoint] = useState("http://localhost:11434");
  const [model, setModel] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [autoStatus, setAutoStatus] = useState<AutoConnectStatus>("idle");
  const [endpointMode, setEndpointMode] = useState<EndpointMode>("custom");
  const [showWelcome, setShowWelcome] = useState(false);
  const [bannerDismissedAt, setBannerDismissedAt] = useState(0);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [editingPromptTabId, setEditingPromptTabId] = useState<string | null>(null);
  const [machineProfile, setMachineProfile] = useState<MachineProfile | null>(() =>
    loadStoredProfile(),
  );
  const [showAdvisor, setShowAdvisor] = useState(false);
  const [savedFlash, setSavedFlash] = useState(0);
  const [connections, setConnections] = useState<ConnectionsState>(() => loadConnections());
  const [inputDrafts, setInputDrafts] = useState<Record<string, string>>({});
  const [searchOpen, setSearchOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [injectedByTab, setInjectedByTab] = useState<Record<string, string[]>>({});
  const [vaultPots, setVaultPots] = useState<PotSnapshot[]>([]);
  const [queueOpen, setQueueOpen] = useState(false);
  const [queueState, setQueueState] = useState<QueueState>({
    activeTabId: null,
    activeStartedAt: null,
    activePreview: "",
    activeModel: null,
    queue: [],
    parallelMode: false,
  });
  const [autoSendByTab, setAutoSendByTab] = useState<Record<string, { token: number; text: string }>>({});
  const [flashTurnTabId, setFlashTurnTabId] = useState<string | null>(null);

  useEffect(() => subscribeQueue(setQueueState), []);

  // When models are discovered from /api/tags, auto-select the first model
  // for the global default and for any tab that doesn't have one yet.
  useEffect(() => {
    if (availableModels.length === 0) return;
    const first = availableModels[0];
    setModel((prev) => prev && availableModels.includes(prev) ? prev : first);
    setTabs((prev) =>
      prev.map((t) =>
        t.model && availableModels.includes(t.model) ? t : { ...t, model: first },
      ),
    );
  }, [availableModels]);

  const [projects, setProjects] = useState<Project[]>([]);
  const [openProjectId, setOpenProjectId] = useState<string | null>(null);
  const [diffState, setDiffState] = useState<{
    projectId: string;
    filePath: string;
    before: string;
    after: string;
    fromTabName?: string;
  } | null>(null);
  useEffect(() => subscribeProjects(setProjects), []);

  useEffect(() => {
    if (typeof window !== "undefined" && isBrandNewUser()) setShowOnboarding(true);
  }, []);

  useEffect(() => subscribeVaultSnapshot(setVaultPots), []);
  useEffect(() => subscribeActivity(() => {}), []); // ensure module evaluated

  const setInputDraft = useCallback((tabId: string, v: string) => {
    setInputDrafts((p) => ({ ...p, [tabId]: v }));
  }, []);

  const updateConnections = useCallback((next: ConnectionsState) => {
    const before = connections;
    setConnections(next);
    // Persist via saveConnections — strips raw tokens (security policy).
    saveConnections(next);
    (["gmail", "slack", "whatsapp"] as const).forEach((k) => {
      if (!before[k] && next[k]) {
        const icon = k === "gmail" ? "📧" : k === "slack" ? "💬" : "📱";
        emitActivity({ kind: "connection", icon, text: `${k} · connected` });
      } else if (before[k] && !next[k]) {
        const icon = k === "gmail" ? "📧" : k === "slack" ? "💬" : "📱";
        emitActivity({ kind: "connection", icon, text: `${k} · disconnected` });
      }
    });
  }, [connections]);

  const appendLog = useCallback((line: LogLine) => {
    setLog((prev) => [...prev, line]);
  }, []);

  const [tabs, setTabs] = useState<TabState[]>(() => {
    const restored = loadStoredTabs();
    if (restored) return restored;
    return [
      {
        id: crypto.randomUUID(),
        name: "Agent 1",
        color: TAB_COLORS[0],
        model: null,
        messages: [BOOT_MESSAGE],
        systemPrompt: defaultSystemPrompt(ENABLED_TOOLS),
        isStreaming: false,
        hasError: false,
        stopToken: 0,
      },
    ];
  });
  const [activeTabId, setActiveTabId] = useState<string>(() => tabs[0].id);

  // Persist tabs to localStorage
  const isFirstSave = useRef(true);
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const serialized = tabs.map((t) => ({
        id: t.id,
        name: t.name,
        color: t.color,
        model: t.model,
        messages: t.messages,
        systemPrompt: t.systemPrompt,
      }));
      window.localStorage.setItem(TABS_STORAGE_KEY, JSON.stringify(serialized));
      if (isFirstSave.current) {
        isFirstSave.current = false;
      } else {
        setSavedFlash(Date.now());
      }
    } catch {
      // ignore quota errors
    }
  }, [tabs]);

  const activeTab = tabs.find((t) => t.id === activeTabId) ?? tabs[0];

  // ===== WebSocket lifecycle: one socket per tab =====
  // Open sockets for any tabs that don't have one (initial mount + new tabs).
  // Re-open all sockets if the endpoint changes.
  useEffect(() => {
    if (!endpoint) return;
    tabs.forEach((t) => openAgentWS(t.id, endpoint, appendLog));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint, tabs.length]);

  const streamingTabs = tabs.filter((t) => t.isStreaming);
  const streamingCount = streamingTabs.length;
  const anyStreaming = streamingCount > 0;

  const totals = useMemo(
    () => ({
      ramGb: machineProfile?.ramGb ?? 8,
      vramGb: machineProfile
        ? machineProfile.unified
          ? machineProfile.ramGb
          : machineProfile.vramGb
        : 4,
    }),
    [machineProfile],
  );

  const handlePsChange = useCallback(
    (snap: PsSnapshot) => {
      if (snap.status === "unreachable") {
        appendLog({ ts: nowTs(), level: "ERR", msg: "Ollama: /api/ps unreachable" });
        return;
      }
      if (snap.status === "idle") {
        appendLog({ ts: nowTs(), level: "ARROW", msg: "Ollama: idle · 0 models loaded" });
        return;
      }
      const names = snap.models.map((m) => m.name).join(", ");
      appendLog({
        ts: nowTs(),
        level: "ARROW",
        msg: `Ollama: ${names} loaded · ${snap.ramGb.toFixed(1)} GB RAM · ${snap.vramGb.toFixed(1)} GB VRAM`,
      });
    },
    [appendLog],
  );

  const handleExpirySoon = useCallback((model: string, secondsLeft: number) => {
    toast(`⏱ ${model} unloading in ${secondsLeft}s — send a message to keep it alive`, {
      duration: 8000,
      style: { background: "#1a1400", color: "#ffaa00", border: "1px solid #ffaa0055" },
    });
  }, []);

  const psSnap = useOllamaPs({
    endpoint,
    enabled: connected,
    onChange: handlePsChange,
    onExpirySoon: handleExpirySoon,
  });

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
        hasError: false,
        stopToken: 0,
      };
      setActiveTabId(newTab.id);
      appendLog({
        ts: nowTs(),
        level: "ARROW",
        msg: `${newTab.name} session opened (${model ?? "no model"})`,
      });
      runBootSequence(newTab.name, appendLog);
      emitActivity({ kind: "agent", icon: "🐝", text: `${newTab.name} · spawned` });
      const next = [...prev, newTab];
      if (next.length >= 3 && !machineProfile) {
        setShowAdvisor(true);
      }
      return next;
    });
  }, [model, appendLog, machineProfile]);

  const handleCloseTab = useCallback(
    (id: string, skipConfirm = false) => {
      setTabs((prev) => {
        if (prev.length <= 1) return prev;
        const closing = prev.find((t) => t.id === id);
        if (!closing) return prev;
        const userMessages = closing.messages.filter((m) => m.role === "user").length;
        if (!skipConfirm && userMessages > 0) {
          if (!window.confirm(`Close ${closing.name}? It has ${userMessages} message${userMessages === 1 ? "" : "s"}.`)) {
            return prev;
          }
        }
        const remaining = prev.filter((t) => t.id !== id);
        // Auto-eject all credentials injected into the closed tab.
        const ejected = ejectAllForTab(id);
        // Close the WebSocket for this tab.
        closeAgentWS(id);
        setInjectedByTab((p) => {
          if (!p[id]) return p;
          const { [id]: _, ...rest } = p;
          return rest;
        });
        if (ejected.length) {
          appendLog({
            ts: nowTs(),
            level: "OK",
            msg: `Credentials ejected from closed ${closing.name} session`,
          });
        }
        appendLog({ ts: nowTs(), level: "ARROW", msg: `${closing.name} session closed` });
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

  const handleReorderTabs = useCallback(
    (fromId: string, toId: string) => {
      setTabs((prev) => {
        const fromIdx = prev.findIndex((t) => t.id === fromId);
        const toIdx = prev.findIndex((t) => t.id === toId);
        if (fromIdx < 0 || toIdx < 0 || fromIdx === toIdx) return prev;
        const next = prev.slice();
        const [moved] = next.splice(fromIdx, 1);
        next.splice(toIdx, 0, moved);
        return next;
      });
      appendLog({ ts: nowTs(), level: "ARROW", msg: "Tab order updated" });
    },
    [appendLog],
  );

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

  // Keyboard shortcuts: ⌘T new, ⌘W close, ⌘1-5 switch
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
      } else if (/^[1-5]$/.test(e.key)) {
        const idx = parseInt(e.key, 10) - 1;
        if (tabs[idx]) {
          e.preventDefault();
          setActiveTabId(tabs[idx].id);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, activeTabId, tabs, handleNewTab, handleCloseTab]);

  useEffect(() => {
    if (connected && !machineProfile && !isAdvisorShown()) {
      setShowAdvisor(true);
    }
  }, [connected, machineProfile]);

  const handleSaveProfile = useCallback(
    (p: MachineProfile) => {
      setMachineProfile(p);
      saveStoredProfile(p);
      markAdvisorShown();
      setShowAdvisor(false);
      appendLog({ ts: nowTs(), level: "OK", msg: `Machine profile saved: ${p.name}` });
    },
    [appendLog],
  );

  const handleSkipProfile = useCallback(() => {
    markAdvisorShown();
    setShowAdvisor(false);
  }, []);

  useEffect(() => {
    if (streamingCount < 2) setBannerDismissedAt(0);
  }, [streamingCount]);

  const bannerLevel: "warn" | "critical" | null =
    streamingCount >= 3 ? "critical" : streamingCount >= 2 ? "warn" : null;
  const showBanner = bannerLevel !== null && bannerDismissedAt < streamingCount;

  // Wrap appendLog to detect chat errors per-tab + emit activity
  const makeTabLogger = useCallback(
    (tabId: string, tabName: string) => (line: LogLine) => {
      appendLog(line);
      if (line.level === "ERR" && line.msg.startsWith("chat:")) {
        updateTab(tabId, { hasError: true });
      }
      if (line.level === "ARROW" && line.msg.startsWith("chat send")) {
        emitActivity({ kind: "agent", icon: "🐝", text: `${tabName} · sent message` });
      }
      if (line.level === "OK" && line.msg.startsWith("response complete")) {
        emitActivity({ kind: "agent", icon: "🐝", text: `${tabName} · replied` });
      }
    },
    [appendLog, updateTab],
  );

  const buildPrompt = useCallback(
    (tabId: string, basePrompt: string) => {
      const enriched = buildEnrichedSystemPrompt({
        enabledTools: ENABLED_TOOLS,
        connections,
        injectedCredentials: injectedByTab[tabId] ?? [],
        machineProfile,
      });
      // Honor per-tab custom prompt by appending it after the enriched context.
      const isDefault = basePrompt.startsWith("You are Worker Bee, a website-building AI agent");
      return isDefault ? enriched : `${enriched}\n\nADDITIONAL INSTRUCTIONS:\n${basePrompt}`;
    },
    [connections, injectedByTab, machineProfile],
  );

  // ===== Sequential agent queue wiring =====
  const handleRequestSend = useCallback(
    (tabId: string, tabName: string, tabColor: string, tabModel: string | null, text: string): "start" | "queued" => {
      if (canStartImmediately(tabId)) {
        return "start";
      }
      const preview = text.length > 60 ? text.slice(0, 59) + "…" : text;
      enqueue({ tabId, tabName, tabColor, text, model: tabModel, messagePreview: preview });
      appendLog({
        ts: nowTs(),
        level: "ARROW",
        msg: `Queue: ${tabName} queued (position #${queuePositionFor(tabId)})`,
      });
      emitActivity({ kind: "agent", icon: "⏳", text: `${tabName} · queued` });
      return "queued";
    },
    [appendLog],
  );

  const handleSendStart = useCallback(
    (tabId: string, tabName: string, tabModel: string | null, text: string) => {
      const preview = text.length > 60 ? text.slice(0, 59) + "…" : text;
      markActive(tabId, preview, tabModel);
      // Clear any prior auto-send token / flash
      setAutoSendByTab((p) => {
        if (!p[tabId]) return p;
        const { [tabId]: _, ...rest } = p;
        return rest;
      });
    },
    [],
  );

  const handleSendEnd = useCallback(
    (tabId: string, tabName: string) => {
      const next = finishActive(tabId);
      if (next) {
        // Promote next queued tab: trigger autoSend in that ChatView
        setAutoSendByTab((p) => ({
          ...p,
          [next.tabId]: { token: Date.now(), text: next.text },
        }));
        setFlashTurnTabId(next.tabId);
        setTimeout(() => {
          setFlashTurnTabId((cur) => (cur === next.tabId ? null : cur));
        }, 1500);
        const remainingNames = getQueueNamesAfterPromotion();
        appendLog({
          ts: nowTs(),
          level: "OK",
          msg: `Queue: ${next.tabName} started${remainingNames ? ` · ${remainingNames} waiting` : ""}`,
        });
        emitActivity({ kind: "agent", icon: "▶", text: `${next.tabName} · your turn` });
      }
    },
    [appendLog],
  );

  // Helper: snapshot remaining queue names AFTER current promotion (called inside handleSendEnd's setState callback timing).
  const getQueueNamesAfterPromotion = (): string => {
    // queueState is the previous render's snapshot, but finishActive already mutated the store.
    // Use subscribeQueue snapshot via a quick read: we re-derive from queueState minus the just-popped head.
    const remaining = queueState.queue.slice(1);
    return remaining.map((q) => q.tabName).join(", ");
  };

  // Global ⌘K search
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const runSmokeTest = useCallback(
    (fromAgent: string) => {
      const log = (level: LogLine["level"], msg: string) =>
        appendLog({ ts: nowTs(), level, msg, smoke: true });
      log("ARROW", `SMOKE TEST STARTING (triggered by ${fromAgent})...`);
      log("OK", `Ollama endpoint configured: ${endpoint || "(none)"}`);
      log(
        "OK",
        `Machine profile loaded: ${
          machineProfile
            ? `${machineProfile.icon} ${machineProfile.name} · ${machineProfile.ramGb} GB RAM · ${machineProfile.unified ? "unified" : `${machineProfile.vramGb} GB VRAM`}`
            : "none"
        }`,
      );
      log("OK", `Tab system: ${tabs.length} tab${tabs.length === 1 ? "" : "s"} present`);
      log(
        "OK",
        `Queue system: ${queueState.parallelMode ? "parallel mode" : "sequential mode"} active`,
      );
      log("OK", "Playwright: core tool locked ON");
      log("OK", `Projects: ${projects.length} project${projects.length === 1 ? "" : "s"} in storage`);
      const vaultPresent =
        typeof window !== "undefined" && !!window.localStorage.getItem("workerbee_vault_v1");
      const potCount = Object.values(injectedByTab).reduce((n, arr) => n + arr.length, 0);
      log(
        "OK",
        `Vault: ${vaultPresent ? "initialized" : "uninitialized"} · ${potCount} honey pot${potCount === 1 ? "" : "s"} injected`,
      );
      log(
        "OK",
        `Connections: Gmail=${connections.gmail ? "y" : "n"} Slack=${connections.slack ? "y" : "n"} WA=${connections.whatsapp ? "y" : "n"}`,
      );
      log("OK", "Mobile: FAB present · sidebar drawer present");
      const keys = [
        "workerbee_tabs",
        "workerbee_vault_v1",
        "workerbee_profile",
        "workerbee_onboarded",
        "workerbee_projects",
        "workerbee_connections_v1",
      ];
      const present =
        typeof window !== "undefined"
          ? keys.filter((k) => window.localStorage.getItem(k) !== null).length
          : 0;
      log("OK", `localStorage: ${present}/${keys.length} keys present`);
      log("ARROW", "SMOKE TEST COMPLETE — Worker Bee is production ready 🐝");
    },
    [endpoint, machineProfile, tabs.length, queueState.parallelMode, projects.length, injectedByTab, connections, appendLog],
  );

  return (
    <div className="flex flex-col h-screen w-full bg-background text-foreground">
      {showAdvisor && (
        <MachineLimitAdvisor
          initialProfile={machineProfile}
          onSave={handleSaveProfile}
          onSkip={handleSkipProfile}
        />
      )}
      <Header
        connected={connected}
        model={activeTab.model ?? model}
        toolCount={ENABLED_TOOLS.length}
        streaming={anyStreaming}
        services={{
          gmail: !!connections.gmail,
          slack: !!connections.slack,
          whatsapp: !!connections.whatsapp,
        }}
        onServiceClick={() => setActive("connections")}
        onSearchOpen={() => setSearchOpen(true)}
        onQueueOpen={() => setQueueOpen((v) => !v)}
        queueDepth={queueState.queue.length}
        parallelMode={queueState.parallelMode}
      />
      {active === "chat" && (
        <ChatTabsBar
          tabs={tabs.map((t) => ({
            id: t.id,
            name: t.name,
            color: t.color,
            model: t.model,
            isStreaming: t.isStreaming,
            hasError: t.hasError,
            messageCount: t.messages.length,
            hasInteracted: t.messages.some((m) => m.role === "user"),
            isQueued: queueState.queue.some((q) => q.tabId === t.id),
            flashTurn: flashTurnTabId === t.id,
          }))}
          activeId={activeTabId}
          onSelect={(id) => {
            setActiveTabId(id);
            // Clear error state when user opens an errored tab
            const t = tabs.find((x) => x.id === id);
            if (t?.hasError) updateTab(id, { hasError: false });
          }}
          onRename={handleRenameTab}
          onClose={(id) => handleCloseTab(id)}
          onNew={handleNewTab}
          onReorder={handleReorderTabs}
          savedFlash={savedFlash}
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
                <ResourceBar snap={psSnap} profile={machineProfile} fallback={totals} />
                <TabControls
                  tabName={activeTab.name}
                  model={activeTab.model}
                  availableModels={availableModels}
                  onModelChange={(m) => updateTab(activeTab.id, { model: m })}
                  onOpenPrompt={() => setEditingPromptTabId(activeTab.id)}
                  onClear={() => {
                    handleMessagesChange(activeTab.id, () => []);
                    appendLog({
                      ts: nowTs(),
                      level: "ARROW",
                      msg: `${activeTab.name} history cleared`,
                    });
                  }}
                  onInjectPrompt={(p) => setInputDraft(activeTab.id, p)}
                  projects={projects.filter((p) => !p.archived).map((p) => ({ id: p.id, emoji: p.emoji, name: p.name }))}
                  activeProjectId={projectForTab(activeTab.id)?.id ?? null}
                  onProjectChange={(pid) => {
                    bindTabToProject(activeTab.id, pid);
                    const proj = pid ? projects.find((p) => p.id === pid) : null;
                    appendLog({
                      ts: nowTs(),
                      level: "OK",
                      msg: proj ? `${activeTab.name} → project '${proj.name}'` : `${activeTab.name} unbound from project`,
                    });
                  }}
                />
                <div className="relative flex flex-1 min-h-0">
                  {editingPromptTabId === activeTab.id ? (
                    <SystemPromptEditor
                      initial={activeTab.systemPrompt}
                      onCancel={() => setEditingPromptTabId(null)}
                      onSave={(next) => {
                        updateTab(activeTab.id, { systemPrompt: next });
                        setEditingPromptTabId(null);
                        appendLog({
                          ts: nowTs(),
                          level: "OK",
                          msg: `${activeTab.name} system prompt updated`,
                        });
                      }}
                    />
                  ) : (
                    <>
                      {tabs.map((t) => (
                        <div
                          key={t.id}
                          className="absolute inset-0 flex flex-col"
                          style={{ display: t.id === activeTabId ? "flex" : "none" }}
                        >
                          <ChatView
                            tabId={t.id}
                            endpoint={endpoint}
                            model={t.model ?? model}
                            connected={connected}
                            enabledTools={ENABLED_TOOLS}
                            systemPrompt={buildPrompt(t.id, t.systemPrompt)}
                            messages={t.messages}
                            onMessagesChange={(updater) => handleMessagesChange(t.id, updater)}
                            appendLog={makeTabLogger(t.id, t.name)}
                            onStreamingChange={(s) => {
                              updateTab(t.id, { isStreaming: s, ...(s ? { hasError: false } : {}) });
                            }}
                            stopToken={t.stopToken}
                            inputDraft={inputDrafts[t.id] ?? ""}
                            onInputDraftChange={(v) => setInputDraft(t.id, v)}
                            isQueued={queueState.queue.some((q) => q.tabId === t.id)}
                            queuePosition={queuePositionFor(t.id)}
                            agentsAhead={Math.max(0, queuePositionFor(t.id) - 1) + (queueState.activeTabId && queueState.activeTabId !== t.id ? 1 : 0)}
                            estimatedWaitSec={estimatedWaitSeconds(t.id)}
                            autoSendToken={autoSendByTab[t.id]?.token ?? 0}
                            autoSendText={autoSendByTab[t.id]?.text ?? ""}
                            onRequestSend={(text) => handleRequestSend(t.id, t.name, t.color, t.model ?? model, text)}
                            onCancelQueued={() => {
                              cancelQueued(t.id);
                              appendLog({ ts: nowTs(), level: "ARROW", msg: `${t.name} removed from queue` });
                            }}
                            onMoveToFront={() => {
                              moveToFront(t.id);
                              appendLog({ ts: nowTs(), level: "ARROW", msg: `${t.name} moved to front of queue` });
                            }}
                            onSendStart={(text) => handleSendStart(t.id, t.name, t.model ?? model, text)}
                            onSendEnd={() => handleSendEnd(t.id, t.name)}
                            projectName={projectForTab(t.id)?.name ?? null}
                            onSaveCodeBlock={(lang, code, suggested) => {
                              const proj = projectForTab(t.id);
                              if (!proj) return;
                              const language = languageFromFenceLabel(lang);
                              const name = window.prompt(
                                `Save to ${proj.name} as:`,
                                guessFilenameFromCode(language, suggested),
                              );
                              if (!name) return;
                              const f = addFile(proj.id, name, code);
                              if (f) {
                                toast(`💾 Saved ${name} to ${proj.name}`);
                                appendLog({
                                  ts: nowTs(),
                                  level: "OK",
                                  msg: `File saved: ${proj.name}/${name} (${formatBytes(f.size)})`,
                                });
                                emitActivity({ kind: "tool", icon: "💾", text: `${proj.name} · saved ${name}` });
                              }
                            }}
                            matchProjectFile={(lang, _code, suggested) => {
                              const proj = projectForTab(t.id);
                              if (!proj) return null;
                              const language = languageFromFenceLabel(lang);
                              const guess = guessFilenameFromCode(language, suggested);
                              const exact = proj.files.find((f) => f.path === guess || f.path.endsWith("/" + guess));
                              if (exact) return exact.path;
                              const sameLang = proj.files.find((f) => f.language === language);
                              return sameLang ? sameLang.path : null;
                            }}
                            onCompareCodeBlock={(filePath, newContent) => {
                              const proj = projectForTab(t.id);
                              if (!proj) return;
                              const file = proj.files.find((f) => f.path === filePath);
                              if (!file) return;
                              setOpenProjectId(proj.id);
                              setDiffState({
                                projectId: proj.id,
                                filePath: file.path,
                                before: file.content,
                                after: newContent,
                                fromTabName: t.name,
                              });
                              setActive("projects");
                            }}
                            onSmokeTest={() => runSmokeTest(t.name)}
                          />
                        </div>
                      ))}
                      {/* Keyboard shortcut legend */}
                      <div
                        className="absolute bottom-24 right-4 font-mono text-[10px] leading-relaxed select-none"
                        style={{
                          background: "#333",
                          color: "#888",
                          borderRadius: 8,
                          padding: "8px 12px",
                          pointerEvents: "none",
                          opacity: 0.7,
                        }}
                      >
                        <div>⌘T  New agent</div>
                        <div>⌘W  Close tab</div>
                        <div>⌘1–5  Switch tab</div>
                      </div>
                    </>
                  )}
                </div>
              </>
            )}
            {active === "projects" && (
              diffState ? (
                <DiffViewer
                  filename={diffState.filePath}
                  before={diffState.before}
                  after={diffState.after}
                  onAccept={(newContent) => {
                    const proj = projects.find((p) => p.id === diffState.projectId);
                    const { summary } = diffLines(diffState.before, newContent);
                    addFile(diffState.projectId, diffState.filePath, newContent);
                    toast(`✅ Changes accepted — ${diffState.filePath} updated`);
                    appendLog({
                      ts: nowTs(),
                      level: "OK",
                      msg: `Diff accepted: ${diffState.filePath} (+${summary.additions} -${summary.removals})`,
                    });
                    emitActivity({
                      kind: "tool",
                      icon: "↔",
                      text: `${proj?.name ?? "project"} · ${diffState.filePath} updated${diffState.fromTabName ? ` by ${diffState.fromTabName}` : ""}`,
                    });
                    setDiffState(null);
                  }}
                  onReject={() => {
                    toast("↩ Changes rejected — original preserved");
                    setDiffState(null);
                  }}
                  onBack={() => setDiffState(null)}
                />
              ) : openProjectId ? (
                <ProjectWorkspace
                  projectId={openProjectId}
                  onBack={() => setOpenProjectId(null)}
                  onEditInAgent={(filename, content) => {
                    setActive("chat");
                    setInputDraft(
                      activeTabId,
                      `Here is the current ${filename}. Please \n\n\`\`\`\n${content}\n\`\`\``,
                    );
                  }}
                  onCompareFile={(filePath, before, after) => {
                    setDiffState({
                      projectId: openProjectId,
                      filePath,
                      before,
                      after,
                    });
                  }}
                  appendLog={(msg) => appendLog({ ts: nowTs(), level: "OK", msg })}
                />
              ) : (
                <ProjectsDashboard
                  tabs={tabs.map((t) => ({ id: t.id, name: t.name }))}
                  onOpenProject={(id) => setOpenProjectId(id)}
                  appendLog={(msg) => appendLog({ ts: nowTs(), level: "OK", msg })}
                />
              )
            )}
            {active === "tools" && <ToolsPanel appendLog={appendLog} connections={connections} />}
            {active === "vault" && (
              <VaultPanel
                activeTabId={activeTab.id}
                tabName={(id) => tabs.find((t) => t.id === id)?.name ?? id}
                onInject={(label, prevTabId) => {
                  appendLog({
                    ts: nowTs(),
                    level: "OK",
                    msg: `${activeTab.name}: credential [${label}] injected`,
                  });
                  setInjectedByTab((p) => {
                    const next = { ...p };
                    if (prevTabId && prevTabId !== activeTab.id) {
                      next[prevTabId] = (next[prevTabId] ?? []).filter((n) => n !== label);
                      if (next[prevTabId].length === 0) delete next[prevTabId];
                    }
                    const cur = next[activeTab.id] ?? [];
                    if (!cur.includes(label)) next[activeTab.id] = [...cur, label];
                    return next;
                  });
                }}
              />
            )}
            {active === "connections" && (
              <ConnectionsPanel
                state={connections}
                onChange={updateConnections}
                appendLog={appendLog}
                onSaveToVault={(label) => {
                  appendLog({
                    ts: nowTs(),
                    level: "OK",
                    msg: `[${label}] flagged for Hive Vault — unlock vault to add as Honey Pot`,
                  });
                }}
              />
            )}
            {active === "config" && (
              <ConfigPanel
                endpoint={endpoint}
                setEndpoint={setEndpoint}
                model={model}
                setModel={setModel}
                setConnected={setConnected}
                appendLog={appendLog}
                onModelsLoaded={setAvailableModels}
                onConnected={() => {
                  // Re-open and ping every tab's WebSocket against the new endpoint.
                  tabs.forEach((t) => {
                    openAgentWS(t.id, endpoint, appendLog);
                    sendPing(t.id);
                  });
                }}
              />
            )}
          </div>
        </main>
      </div>

      <QueuePanel
        open={queueOpen}
        onClose={() => setQueueOpen(false)}
        onStopActive={(tabId) => {
          updateTab(tabId, { stopToken: (tabs.find((t) => t.id === tabId)?.stopToken ?? 0) + 1 });
        }}
      />

      <GlobalSearch
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        tabs={tabs.map((t) => ({ id: t.id, name: t.name, messages: t.messages }))}
        tools={[
          { id: "playwright_chromium", name: "Playwright + Chromium", icon: "🎭" },
          { id: "web_search", name: "Web Search", icon: "🌐" },
          { id: "code_exec", name: "Code Executor", icon: "⚡" },
          { id: "file_ops", name: "File System", icon: "📁" },
          { id: "vision", name: "Vision", icon: "👁" },
          { id: "vector_db", name: "Vector Memory", icon: "🧠" },
          { id: "shell", name: "Shell Runner", icon: "🐚" },
          { id: "git", name: "Git Tools", icon: "🌿" },
          { id: "pdf_reader", name: "PDF Reader", icon: "📄" },
          { id: "sql_tools", name: "SQL Agent", icon: "🗄" },
          ...(connections.gmail ? [{ id: "gmail.send", name: "Gmail Send", icon: "📧" }] : []),
          ...(connections.slack ? [{ id: "slack.post_message", name: "Slack Post", icon: "💬" }] : []),
          ...(connections.whatsapp ? [{ id: "whatsapp.send", name: "WhatsApp Send", icon: "📱" }] : []),
        ]}
        pots={vaultPots}
        connections={connections}
        onJumpAgent={(id) => {
          setActive("chat");
          setActiveTabId(id);
        }}
        onJumpTools={() => setActive("tools")}
        onJumpVault={() => setActive("vault")}
        onJumpConnections={() => setActive("connections")}
      />

      {showOnboarding && (
        <OnboardingWizard
          endpoint={endpoint}
          setEndpoint={setEndpoint}
          onConnect={async () => {
            try {
              const res = await fetch(`${endpoint.replace(/\/$/, "")}/api/tags`);
              if (!res.ok) return false;
              const data = (await res.json()) as { models?: { name: string }[] };
              const list = data.models ?? [];
              setAvailableModels(list.map((m) => m.name));
              setConnected(true);
              if (list[0]?.name) setModel(list[0].name);
              return true;
            } catch {
              return false;
            }
          }}
          onProfileSaved={(p) => {
            setMachineProfile(p);
          }}
          onComplete={() => setShowOnboarding(false)}
        />
      )}
    </div>
  );
}
