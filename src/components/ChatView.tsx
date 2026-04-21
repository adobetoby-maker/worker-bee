import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Textarea } from "@/components/ui/textarea";
import { nowTs, type LogLine } from "@/lib/agent-state";
import { BrowserTaskCard, detectBrowserAction } from "./BrowserTaskCard";
import {
  sendChat,
  sendStop,
  subscribeAgentWS,
  isWSOpen,
  sendBrowser,
  extractBrowserUrl,
  sendShell,
  detectInstallCommand,
  isUnsafeCommand,
  sendSelfRepair,
  sendLogin,
  detectLoginIntent,
  sendMemorySearch,
  sendMemoryStore,
  sendMemoryStats,
  detectMemoryCommand,
  type MemorySearchResult,
  sendPlan,
  sendPlanStop,
  sendPlanPause,
  sendPlanResume,
  detectPlanIntent,
  type PlanStep,
} from "@/lib/agent-ws";
import { toast } from "sonner";
import { InstallActionCard, type InstallCardState } from "./InstallActionCard";
import { RepairCard, type RepairCardState } from "./RepairCard";
import { LoginPromptCard, type LoginSubmitArgs } from "./LoginPromptCard";
import { LoginStatusCard, type LoginCardState } from "./LoginStatusCard";
import { PlanCard, type PlanCardState, type PlanLogLine, type PlanStepRuntime } from "./PlanCard";

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  // Optional rich payloads — when present, rendered with custom UI.
  screenshotB64?: string;
  screenshotUrl?: string;
  visionDescription?: string;
}

interface Props {
  tabId: string;
  endpoint: string;
  model: string | null;
  connected: boolean;
  enabledTools: string[];
  systemPrompt?: string;
  messages: ChatMessage[];
  onMessagesChange: (updater: (prev: ChatMessage[]) => ChatMessage[]) => void;
  appendLog: (line: LogLine) => void;
  onStreamingChange: (streaming: boolean) => void;
  stopToken?: number;
  inputDraft?: string;
  onInputDraftChange?: (v: string) => void;
  // Sequential queue gating
  isQueued?: boolean;
  queuePosition?: number;
  agentsAhead?: number;
  estimatedWaitSec?: number;
  // When set (truthy + changed), ChatView starts streaming this text immediately,
  // bypassing the normal click flow. Used by the queue when it's this tab's turn.
  autoSendToken?: number;
  autoSendText?: string;
  // Hooks for queue integration
  onRequestSend?: (text: string) => "start" | "queued";
  onCancelQueued?: () => void;
  onMoveToFront?: () => void;
  onSendStart?: (text: string) => void;
  onSendEnd?: () => void;
  // Project binding — when set, code blocks render save/copy/download toolbar
  projectName?: string | null;
  onSaveCodeBlock?: (language: string, code: string, suggestedName: string) => void;
  // When provided, returns the matching project file path (e.g. "index.html")
  // for a given code block; if a match exists a "↔ Compare" button appears.
  matchProjectFile?: (language: string, code: string, suggestedName: string) => string | null;
  onCompareCodeBlock?: (filePath: string, newContent: string) => void;
  // Hidden developer smoke test — triggered by typing exactly "🐝🐝🐝".
  onSmokeTest?: () => void;
  // Manual self-repair trigger token — when increments, ChatView sends self_repair.
  repairToken?: number;
  onOpenConfig?: () => void;
  // Memory
  onMemoryStatsChange?: (total: number) => void;
  // Manual plan trigger — when planToken increments, ChatView starts a plan with planGoal.
  planToken?: number;
  planGoal?: string;
}

export function ChatView({
  tabId,
  endpoint,
  model,
  connected,
  enabledTools,
  systemPrompt,
  messages,
  onMessagesChange,
  appendLog,
  onStreamingChange,
  stopToken = 0,
  inputDraft,
  onInputDraftChange,
  isQueued = false,
  queuePosition = 0,
  agentsAhead = 0,
  estimatedWaitSec = 0,
  autoSendToken = 0,
  autoSendText = "",
  onRequestSend,
  onCancelQueued,
  onMoveToFront,
  onSendStart,
  onSendEnd,
  projectName = null,
  onSaveCodeBlock,
  matchProjectFile,
  onCompareCodeBlock,
  onSmokeTest,
  repairToken = 0,
  onOpenConfig,
  onMemoryStatsChange,
  planToken = 0,
  planGoal = "",
}: Props) {
  const [localInput, setLocalInput] = useState("");
  const input = inputDraft !== undefined ? inputDraft : localInput;
  const setInput = (v: string) => {
    if (onInputDraftChange) onInputDraftChange(v);
    else setLocalInput(v);
  };
  const [streaming, setStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);

  // Terminal-style input history.
  const HISTORY_KEY = "workerbee_input_history";
  const [inputHistory, setInputHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [savedDraft, setSavedDraft] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load history from localStorage on mount.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(HISTORY_KEY);
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) setInputHistory(arr.filter((s) => typeof s === "string").slice(0, 100));
      }
    } catch { /* noop */ }
  }, []);

  const pushHistory = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setInputHistory((prev) => {
      const next = [trimmed, ...prev.filter((s) => s !== trimmed)].slice(0, 100);
      try {
        if (typeof window !== "undefined") {
          window.localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
        }
      } catch { /* noop */ }
      return next;
    });
    setHistoryIndex(-1);
    setSavedDraft("");
  };

  const TAB_COMPLETIONS: Array<[string, string]> = [
    ["/re", "/remember "],
    ["/le", "/learn "],
    ["ana", "Analyze https://"],
    ["scr", "Take a screenshot of https://"],
    ["log", "Log into https://"],
    ["pla", "Plan: "],
    ["bui", "Build a "],
  ];

  // Install action card state — driven by post-stream scan of assistant text.
  const [installCard, setInstallCard] = useState<{
    command: string;
    state: InstallCardState;
    output: string;
    exitCode?: number;
    blockedReason?: string;
  } | null>(null);
  const installUnsubRef = useRef<(() => void) | null>(null);

  // Self-repair card state.
  const [repairCard, setRepairCard] = useState<{
    state: RepairCardState;
    error: string;
    logs: string[];
  } | null>(null);
  const repairUnsubRef = useRef<(() => void) | null>(null);

  // Login flow state.
  const [loginPrompt, setLoginPrompt] = useState<{ url: string } | null>(null);
  const [loginStatus, setLoginStatus] = useState<{
    state: LoginCardState;
    url: string;
    logs: string[];
    attempts?: number;
    error?: string;
  } | null>(null);
  const loginUnsubRef = useRef<(() => void) | null>(null);

  // Error-burst banner: count consecutive recent ERR log lines for THIS tab.
  const [errBurst, setErrBurst] = useState(0);
  const [burstDismissed, setBurstDismissed] = useState(false);
  const consecutiveErrRef = useRef(0);

  // Memory: search card + per-message consulted counters.
  const [memorySearchCard, setMemorySearchCard] = useState<{
    query: string;
    results: MemorySearchResult[];
    loading: boolean;
  } | null>(null);
  const [consultedByMessage, setConsultedByMessage] = useState<Record<number, number>>({});
  const pendingConsultedRef = useRef<number | null>(null);

  // Task planner state.
  const [planCard, setPlanCard] = useState<{
    goal: string;
    state: PlanCardState;
    steps: PlanStep[];
    runtime: Record<number, PlanStepRuntime>;
    current: number;
    total: number;
    logs: PlanLogLine[];
    completed: number;
    failed: number;
    errorMsg?: string;
    showResults: boolean;
  } | null>(null);
  const [planSuggestion, setPlanSuggestion] = useState<string | null>(null);

  useEffect(() => {
    onStreamingChange(streaming);
  }, [streaming, onStreamingChange]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
    if (isNearBottom) {
      el.scrollTop = el.scrollHeight;
      setShowScrollButton(false);
    } else {
      setShowScrollButton(true);
    }
  }, [messages]);

  // Hide scroll button when user scrolls back to bottom or streaming stops.
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const onScroll = () => {
      const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
      if (nearBottom) setShowScrollButton(false);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!streaming) setShowScrollButton(false);
  }, [streaming]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (stopToken > 0) {
      abortRef.current?.abort();
    }
  }, [stopToken]);

  // Subscribe to repair events for this tab — always live, regardless of streaming.
  useEffect(() => {
    repairUnsubRef.current?.();
    const unsub = subscribeAgentWS(tabId, {
      onRepairStarted: ({ error }) => {
        setRepairCard({ state: "started", error, logs: [] });
        consecutiveErrRef.current = 0;
        setErrBurst(0);
      },
      onRepairLog: (line) => {
        if (!line) return;
        setRepairCard((prev) => prev ? { ...prev, logs: [...prev.logs, line] } : prev);
      },
      onRepairComplete: ({ ok, message }) => {
        setRepairCard((prev) => {
          if (!prev) return prev;
          const finalLogs = message ? [...prev.logs, message] : prev.logs;
          return { ...prev, state: ok ? "complete" : "failed", logs: finalLogs };
        });
      },
    });
    repairUnsubRef.current = unsub;
    return () => { unsub(); repairUnsubRef.current = null; };
  }, [tabId]);

  // Wrap appendLog to track consecutive ERR lines and trigger banner at 3.
  const trackedAppendLog = (line: LogLine) => {
    if (line.level === "ERR") {
      consecutiveErrRef.current += 1;
      if (consecutiveErrRef.current >= 3 && !burstDismissed && !repairCard) {
        setErrBurst(consecutiveErrRef.current);
      }
    } else if (line.level === "OK") {
      consecutiveErrRef.current = 0;
    }
    appendLog(line);
  };

  // Manual repair trigger from TabControls.
  const triggerSelfRepair = (errorText: string) => {
    if (!isWSOpen(tabId)) {
      trackedAppendLog({ ts: nowTs(), level: "ERR", msg: "self_repair: WS not open" });
      return;
    }
    setRepairCard({ state: "started", error: errorText, logs: [] });
    consecutiveErrRef.current = 0;
    setErrBurst(0);
    setBurstDismissed(false);
    sendSelfRepair(tabId, errorText);
  };

  const lastRepairTokenRef = useRef(0);
  useEffect(() => {
    if (repairToken > 0 && repairToken !== lastRepairTokenRef.current) {
      lastRepairTokenRef.current = repairToken;
      triggerSelfRepair("Manual repair requested by user");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repairToken]);

  const lastPlanTokenRef = useRef(0);
  useEffect(() => {
    if (planToken > 0 && planToken !== lastPlanTokenRef.current && planGoal) {
      lastPlanTokenRef.current = planToken;
      startPlan(planGoal);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planToken, planGoal]);

  const resolvedSystemPrompt =
    systemPrompt ??
    `You are Worker Bee, a website-building AI agent running via Ollama. Available tools: ${enabledTools.join(", ") || "none"}.`;

  const stop = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    sendStop(tabId);
    setStreaming(false);
  };

  const startStream = async (text: string) => {
    if (!connected || !model) {
      trackedAppendLog({ ts: nowTs(), level: "ERR", msg: "not connected — open CONFIG" });
      return;
    }
    const next: ChatMessage[] = [...messages, { role: "user", content: text }];
    onMessagesChange(() => [...next, { role: "assistant", content: "" }]);
    // Track which message index any incoming memory_consulted should attach to.
    pendingConsultedRef.current = next.length; // index of the assistant placeholder
    setStreaming(true);
    onSendStart?.(text);
    trackedAppendLog({ ts: nowTs(), level: "ARROW", msg: `chat send chars=${text.length}` });

    if (!isWSOpen(tabId)) {
      trackedAppendLog({ ts: nowTs(), level: "ERR", msg: "chat: WebSocket not open — is agent running?" });
      onMessagesChange((prev) => {
        const copy = prev.slice();
        copy[copy.length - 1] = { role: "assistant", content: "⚠ WebSocket not connected to agent. Start the Worker Bee agent server and reconnect in CONFIG." };
        return copy;
      });
      setStreaming(false);
      onSendEnd?.();
      return;
    }

    let assistantText = "";
    let finished = false;
    const finish = (errorText?: string) => {
      if (finished) return;
      finished = true;
      unsub?.();
      if (errorText) {
        onMessagesChange((prev) => {
          const copy = prev.slice();
          copy[copy.length - 1] = { role: "assistant", content: `⚠ ${errorText}` };
          return copy;
        });
        trackedAppendLog({ ts: nowTs(), level: "ERR", msg: `chat: ${errorText}` });
      } else {
        trackedAppendLog({ ts: nowTs(), level: "OK", msg: `response complete chars=${assistantText.length}` });
        // Scan completed assistant message for install commands.
        const cmd = detectInstallCommand(assistantText);
        if (cmd) {
          if (isUnsafeCommand(cmd)) {
            trackedAppendLog({ ts: nowTs(), level: "ERR", msg: `BLOCKED unsafe command: ${cmd}` });
            setInstallCard({
              command: cmd,
              state: "blocked",
              output: "",
              blockedReason: "This command is on the unsafe-command blocklist and was not executed.",
            });
          } else {
            trackedAppendLog({ ts: nowTs(), level: "ARROW", msg: `install detected: ${cmd}` });
            setInstallCard({ command: cmd, state: "prompt", output: "" });
          }
        }
      }
      setStreaming(false);
      abortRef.current = null;
      onSendEnd?.();
    };

    const controller = new AbortController();
    abortRef.current = controller;
    controller.signal.addEventListener("abort", () => {
      trackedAppendLog({ ts: nowTs(), level: "ARROW", msg: "stream aborted" });
      finish();
    });

    const unsub = subscribeAgentWS(tabId, {
      onToken: (tok) => {
        if (!tok) return;
        assistantText += tok;
        onMessagesChange((prev) => {
          const copy = prev.slice();
          copy[copy.length - 1] = { role: "assistant", content: assistantText };
          return copy;
        });
      },
      onDone: () => finish(),
      onError: (msg) => finish(msg || "agent error"),
      onClose: () => finish("WebSocket closed during stream"),
      onBrowserResult: (res) => {
        trackedAppendLog({ ts: nowTs(), level: "OK", msg: `browser_result received (${res.text.length} chars) — sending to model` });
        const urlForPrompt = res.url ?? extractBrowserUrl(text) ?? "the requested URL";
        if (res.visionDescription) {
          onMessagesChange((prev) => {
            // Insert vision card BEFORE the in-progress assistant placeholder.
            const copy = prev.slice();
            const visionMsg: ChatMessage = {
              role: "assistant",
              content: "",
              visionDescription: res.visionDescription,
            };
            if (copy.length > 0 && copy[copy.length - 1].role === "assistant" && copy[copy.length - 1].content === "") {
              copy.splice(copy.length - 1, 0, visionMsg);
            } else {
              copy.push(visionMsg);
            }
            return copy;
          });
        }
        const followUp = `${text}\n\nYou are Worker Bee, an AI agent with a real Playwright browser. You just navigated to ${urlForPrompt} and retrieved this content. You CAN browse websites, take screenshots, and interact with pages. Analyze what you found and respond helpfully:\n\n${res.text}`;
        const ok = sendChat(tabId, followUp, model);
        if (!ok) finish("failed to send chat after browser_result");
      },
      onScreenshot: (shot) => {
        if (!shot.screenshotB64) return;
        onMessagesChange((prev) => {
          const copy = prev.slice();
          const shotMsg: ChatMessage = {
            role: "assistant",
            content: "",
            screenshotB64: shot.screenshotB64,
            screenshotUrl: shot.url,
          };
          if (copy.length > 0 && copy[copy.length - 1].role === "assistant" && copy[copy.length - 1].content === "") {
            copy.splice(copy.length - 1, 0, shotMsg);
          } else {
            copy.push(shotMsg);
          }
          return copy;
        });
      },
    });

    const browserUrl = extractBrowserUrl(text);
    if (browserUrl) {
      trackedAppendLog({ ts: nowTs(), level: "ARROW", msg: `browser action → ${browserUrl}` });
      const ok = sendBrowser(tabId, browserUrl);
      if (!ok) finish("failed to send browser action");
      return;
    }

    const ok = sendChat(tabId, text, model);
    if (!ok) finish("failed to send over WebSocket");
  };

  const lastAutoTokenRef = useRef(0);
  useEffect(() => {
    if (autoSendToken > 0 && autoSendToken !== lastAutoTokenRef.current && autoSendText) {
      lastAutoTokenRef.current = autoSendToken;
      startStream(autoSendText);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSendToken, autoSendText]);

  const send = async () => {
    const text = input.trim();
    if (!text || streaming) return;
    pushHistory(text);
    // Hidden developer smoke test trigger.
    if (text === "🐝🐝🐝" && onSmokeTest) {
      setInput("");
      onSmokeTest();
      return;
    }
    // Memory commands — intercept before anything else.
    const memCmd = detectMemoryCommand(text);
    if (memCmd) {
      if (!isWSOpen(tabId)) {
        trackedAppendLog({ ts: nowTs(), level: "ERR", msg: "memory: WebSocket not open" });
        return;
      }
      setInput("");
      if (memCmd.kind === "remember") {
        onMessagesChange((prev) => [...prev, { role: "user", content: text }]);
        setMemorySearchCard({ query: memCmd.query, results: [], loading: true });
        sendMemorySearch(tabId, memCmd.query, 5);
      } else {
        // /learn
        onMessagesChange((prev) => [...prev, { role: "user", content: text }]);
        sendMemoryStore(tabId, {
          topic: "user instruction",
          content: memCmd.content,
          source: "user",
        });
      }
      return;
    }
    if (!connected || !model) {
      trackedAppendLog({ ts: nowTs(), level: "ERR", msg: "not connected — open CONFIG" });
      return;
    }
    // Login intent detection — open credential prompt instead of streaming.
    const loginUrl = detectLoginIntent(text);
    if (loginUrl && !loginPrompt && !loginStatus) {
      onMessagesChange((prev) => [...prev, { role: "user", content: text }]);
      setInput("");
      setLoginPrompt({ url: loginUrl });
      return;
    }
    // Plan intent detection — show suggestion bar (one chance per message).
    if (!planCard && !planSuggestion && detectPlanIntent(text)) {
      onMessagesChange((prev) => [...prev, { role: "user", content: text }]);
      setPlanSuggestion(text);
      return;
    }
    const decision = onRequestSend ? onRequestSend(text) : "start";
    if (decision === "queued") {
      setInput("");
      return;
    }
    setInput("");
    await startStream(text);
  };

  // Subscribe to login events for this tab.
  useEffect(() => {
    loginUnsubRef.current?.();
    const unsub = subscribeAgentWS(tabId, {
      onLoginLog: (line) => {
        if (!line) return;
        setLoginStatus((prev) => prev ? { ...prev, logs: [...prev.logs, line] } : prev);
      },
      onLoginResult: ({ ok, url, attempts, error }) => {
        setLoginStatus((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            state: ok ? "success" : "failed",
            url: url ?? prev.url,
            attempts,
            error,
          };
        });
      },
    });
    loginUnsubRef.current = unsub;
    return () => { unsub(); loginUnsubRef.current = null; };
  }, [tabId]);

  // Subscribe to plan events for this tab.
  useEffect(() => {
    const unsub = subscribeAgentWS(tabId, {
      onPlanStarted: ({ goal }) => {
        setPlanCard({
          goal,
          state: "generating",
          steps: [],
          runtime: {},
          current: 0,
          total: 0,
          logs: [],
          completed: 0,
          failed: 0,
          showResults: false,
        });
      },
      onPlanReady: ({ goal, tasks, count }) => {
        setPlanCard((prev) => ({
          goal: goal || prev?.goal || "",
          state: "ready",
          steps: tasks,
          runtime: Object.fromEntries(tasks.map((t) => [t.id, { status: "pending" as const }])),
          current: 0,
          total: count || tasks.length,
          logs: prev?.logs ?? [],
          completed: 0,
          failed: 0,
          showResults: false,
        }));
      },
      onPlanProgress: (info) => {
        setPlanCard((prev) => {
          if (!prev) return prev;
          const runtime = {
            ...prev.runtime,
            [info.step_id]: { status: info.status, result: info.result },
          };
          return {
            ...prev,
            state: "running",
            runtime,
            current: info.current,
            total: info.total || prev.total,
          };
        });
      },
      onPlanLog: ({ message, level }) => {
        if (!message) return;
        setPlanCard((prev) => prev ? { ...prev, logs: [...prev.logs, { message, level }] } : prev);
      },
      onPlanComplete: ({ completed, failed, total, results }) => {
        setPlanCard((prev) => {
          if (!prev) return prev;
          // Merge any per-step results provided in the bulk results map.
          const runtime = { ...prev.runtime };
          for (const step of prev.steps) {
            const r = (results as Record<string, unknown>)[String(step.id)];
            if (r && typeof r === "object" && !runtime[step.id]?.result) {
              runtime[step.id] = {
                status: runtime[step.id]?.status ?? "done",
                result: r as Record<string, unknown>,
              };
            }
          }
          return {
            ...prev,
            state: "complete",
            runtime,
            completed,
            failed,
            total: total || prev.total,
            current: total || prev.current,
          };
        });
      },
      onPlanError: ({ message }) => {
        setPlanCard((prev) => prev
          ? { ...prev, state: "error", errorMsg: message }
          : {
              goal: "",
              state: "error",
              steps: [],
              runtime: {},
              current: 0,
              total: 0,
              logs: [],
              completed: 0,
              failed: 0,
              errorMsg: message,
              showResults: false,
            });
      },
    });
    return () => { unsub(); };
  }, [tabId]);

  const startPlan = (goal: string) => {
    if (!isWSOpen(tabId)) {
      trackedAppendLog({ ts: nowTs(), level: "ERR", msg: "plan: WS not open" });
      return;
    }
    setPlanCard({
      goal,
      state: "generating",
      steps: [],
      runtime: {},
      current: 0,
      total: 0,
      logs: [],
      completed: 0,
      failed: 0,
      showResults: false,
    });
    sendPlan(tabId, goal);
  };

  const handleConfirmPlan = () => {
    const goal = planSuggestion;
    setPlanSuggestion(null);
    setInput("");
    if (goal) startPlan(goal);
  };

  const handleJustChat = async () => {
    const goal = planSuggestion;
    setPlanSuggestion(null);
    if (!goal) return;
    setInput("");
    const decision = onRequestSend ? onRequestSend(goal) : "start";
    if (decision === "queued") return;
    await startStream(goal);
  };

  const handleLoginSubmit = (args: LoginSubmitArgs) => {
    if (!isWSOpen(tabId)) {
      trackedAppendLog({ ts: nowTs(), level: "ERR", msg: "login: WS not open" });
      return;
    }
    setLoginPrompt(null);
    setLoginStatus({ state: "running", url: args.url, logs: [`[🔐] Attempting login to ${args.url}...`] });
    sendLogin(tabId, {
      url: args.url,
      username: args.username,
      password: args.password,
      max_attempts: args.maxAttempts,
    });
  };

  const handleLoginCancel = () => setLoginPrompt(null);

  // Memory subscription — stats, search results, consulted indicator.
  useEffect(() => {
    const unsub = subscribeAgentWS(tabId, {
      onMemoryStats: ({ total }) => {
        onMemoryStatsChange?.(total);
      },
      onMemorySearchResult: ({ query, results }) => {
        setMemorySearchCard({ query, results, loading: false });
      },
      onMemoryConsulted: ({ count }) => {
        if (count <= 0) return;
        // Attach to current in-flight assistant message (last one).
        const idx = pendingConsultedRef.current;
        if (idx !== null && idx >= 0) {
          setConsultedByMessage((prev) => ({ ...prev, [idx]: count }));
        }
      },
      onMemoryStored: ({ ok, message }) => {
        if (ok) toast.success("🧠 Stored in memory");
        else toast.error(message ?? "Failed to store memory");
        // Refresh stats after a store.
        sendMemoryStats(tabId);
      },
      onOpen: () => {
        // Fetch stats on (re)connect.
        sendMemoryStats(tabId);
      },
    });
    // Try immediately if already open.
    if (isWSOpen(tabId)) sendMemoryStats(tabId);
    return () => { unsub(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabId]);

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    const ta = e.currentTarget;
    if (e.key === "ArrowUp") {
      // Only hijack if cursor is on first line (no newline before caret) — keeps multi-line editing usable.
      const before = ta.value.slice(0, ta.selectionStart);
      if (!before.includes("\n") && inputHistory.length > 0) {
        e.preventDefault();
        if (historyIndex === -1) setSavedDraft(input);
        const next = Math.min(historyIndex + 1, inputHistory.length - 1);
        setHistoryIndex(next);
        setInput(inputHistory[next]);
        setTimeout(() => {
          const t = textareaRef.current;
          if (t) {
            t.style.height = "auto";
            t.style.height = Math.min(t.scrollHeight, 200) + "px";
            t.selectionStart = t.value.length;
            t.selectionEnd = t.value.length;
          }
        }, 0);
        return;
      }
    }
    if (e.key === "ArrowDown") {
      if (historyIndex !== -1) {
        e.preventDefault();
        const next = historyIndex - 1;
        setHistoryIndex(next);
        const newVal = next === -1 ? savedDraft : inputHistory[next];
        setInput(newVal);
        setTimeout(() => {
          const t = textareaRef.current;
          if (t) {
            t.style.height = "auto";
            t.style.height = Math.min(t.scrollHeight, 200) + "px";
            t.selectionStart = t.value.length;
            t.selectionEnd = t.value.length;
          }
        }, 0);
        return;
      }
    }
    if (e.key === "Escape") {
      e.preventDefault();
      if (input.length > 0) {
        setInput("");
      } else {
        ta.blur();
      }
      setHistoryIndex(-1);
      setSavedDraft("");
      return;
    }
    if (e.key === "Tab") {
      e.preventDefault();
      const match = TAB_COMPLETIONS.find(([prefix]) => input.toLowerCase().startsWith(prefix));
      if (match && input.trim().toLowerCase() === match[0]) {
        setInput(match[1]);
        setTimeout(() => {
          const t = textareaRef.current;
          if (t) {
            t.selectionStart = t.value.length;
            t.selectionEnd = t.value.length;
          }
        }, 0);
      } else {
        // Insert 2 spaces at caret.
        const start = ta.selectionStart;
        const end = ta.selectionEnd;
        const newVal = input.slice(0, start) + "  " + input.slice(end);
        setInput(newVal);
        setTimeout(() => {
          const t = textareaRef.current;
          if (t) {
            t.selectionStart = start + 2;
            t.selectionEnd = start + 2;
          }
        }, 0);
      }
      return;
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  // Cleanup any in-flight shell subscription on unmount.
  useEffect(() => {
    return () => {
      installUnsubRef.current?.();
      installUnsubRef.current = null;
    };
  }, []);

  const sendFollowUpChat = (content: string) => {
    if (!model) return;
    if (!isWSOpen(tabId)) {
      trackedAppendLog({ ts: nowTs(), level: "ERR", msg: "follow-up chat: WS not open" });
      return;
    }
    onMessagesChange((prev) => [
      ...prev,
      { role: "user", content },
      { role: "assistant", content: "" },
    ]);
    setStreaming(true);
    onSendStart?.(content);
    let assistantText = "";
    let finished = false;
    const finish = (errorText?: string) => {
      if (finished) return;
      finished = true;
      unsub?.();
      if (errorText) {
        onMessagesChange((prev) => {
          const copy = prev.slice();
          copy[copy.length - 1] = { role: "assistant", content: `⚠ ${errorText}` };
          return copy;
        });
      }
      setStreaming(false);
      onSendEnd?.();
    };
    const unsub = subscribeAgentWS(tabId, {
      onToken: (tok) => {
        if (!tok) return;
        assistantText += tok;
        onMessagesChange((prev) => {
          const copy = prev.slice();
          copy[copy.length - 1] = { role: "assistant", content: assistantText };
          return copy;
        });
      },
      onDone: () => finish(),
      onError: (m) => finish(m || "agent error"),
      onClose: () => finish("WebSocket closed during stream"),
    });
    const ok = sendChat(tabId, content, model);
    if (!ok) finish("failed to send over WebSocket");
  };

  const handleApproveInstall = () => {
    if (!installCard || installCard.state !== "prompt") return;
    const cmd = installCard.command;
    if (!isWSOpen(tabId)) {
      trackedAppendLog({ ts: nowTs(), level: "ERR", msg: "shell: WS not open" });
      return;
    }
    setInstallCard({ command: cmd, state: "running", output: "" });
    trackedAppendLog({ ts: nowTs(), level: "ARROW", msg: `shell approved: ${cmd}` });
    let buf = "";
    installUnsubRef.current?.();
    const unsub = subscribeAgentWS(tabId, {
      onShellOutput: (chunk) => {
        if (!chunk) return;
        buf += chunk;
        setInstallCard((prev) => prev ? { ...prev, output: buf } : prev);
      },
      onShellDone: ({ exitCode, ok, output }) => {
        const finalOutput = output && output.length > buf.length ? output : buf;
        setInstallCard((prev) => prev ? { ...prev, state: "done", output: finalOutput, exitCode } : prev);
        installUnsubRef.current?.();
        installUnsubRef.current = null;
        if (ok) {
          sendFollowUpChat("The installation completed successfully. Please continue with the original task.");
        } else {
          sendFollowUpChat(`The installation failed (exit code ${exitCode}). Please suggest an alternative approach.`);
        }
      },
    });
    installUnsubRef.current = unsub;
    const sent = sendShell(tabId, cmd);
    if (!sent) {
      setInstallCard({ command: cmd, state: "done", output: "failed to send shell command", exitCode: 1 });
      installUnsubRef.current?.();
      installUnsubRef.current = null;
    }
  };

  const handleDenyInstall = () => {
    if (!installCard) return;
    trackedAppendLog({ ts: nowTs(), level: "ARROW", msg: `shell denied: ${installCard.command}` });
    setInstallCard(null);
    sendFollowUpChat("The user denied the install request. Please suggest an alternative approach that does not require installing new packages.");
  };

  const handleDismissInstall = () => setInstallCard(null);

  return (
    <div
      className="flex flex-1 min-h-0 flex-col relative"
      style={{ animation: "var(--animate-slide-down)" }}
    >
      <div ref={scrollerRef} className="flex-1 min-h-0 overflow-y-auto py-6">
        <div className="mx-auto w-full space-y-6" style={{ maxWidth: 680, padding: "0 16px" }}>
        {!connected && (
          <div className="flex justify-center">
            <div className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground border border-border bg-surface/40 px-4 py-2 rounded">
              ⚠ Connect to Ollama in CONFIG to start chatting
            </div>
          </div>
        )}
        {connected && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-4 py-16">
            <span style={{ fontSize: 48 }}>🐝</span>
            <div
              style={{
                fontFamily: "JetBrains Mono, monospace",
                fontSize: 22,
                fontWeight: 700,
                color: "var(--primary)",
              }}
            >
              Worker Bee
            </div>
            <div
              className="text-muted-foreground"
              style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 14 }}
            >
              Your local AI website builder
            </div>
            <div className="flex flex-row gap-2.5 flex-wrap justify-center" style={{ marginTop: 8 }}>
              {[
                "🌐 Analyze a website",
                "💻 Build a landing page",
                "📸 Take a screenshot",
              ].map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => setInput(chip)}
                  className="suggestion-chip"
                  style={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: 999,
                    padding: "8px 16px",
                    fontFamily: "JetBrains Mono, monospace",
                    fontSize: 12,
                    color: "var(--muted-foreground)",
                    cursor: "pointer",
                    transition: "border-color 0.15s, color 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "var(--primary)";
                    e.currentTarget.style.color = "var(--primary)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--border)";
                    e.currentTarget.style.color = "var(--muted-foreground)";
                  }}
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => {
          const isUser = m.role === "user";
          const isLast = i === messages.length - 1;
          const showCursor = !isUser && isLast && streaming;
          // Special rich messages: screenshot / vision analysis.
          if (!isUser && m.screenshotB64) {
            return (
              <div key={i} className="flex items-start justify-start">
                <div
                  className="w-full"
                  style={{
                    background: "var(--background)",
                    border: "1px solid var(--primary)",
                    borderRadius: 8,
                    padding: 12,
                    marginBottom: 8,
                  }}
                >
                  <div
                    style={{
                      color: "var(--primary)",
                      fontFamily: "JetBrains Mono, monospace",
                      fontSize: 11,
                      marginBottom: 8,
                    }}
                  >
                    🌐 SCREENSHOT — {m.screenshotUrl ?? ""}
                  </div>
                  <img
                    src={`data:image/png;base64,${m.screenshotB64}`}
                    alt="browser screenshot"
                    style={{ width: "100%", borderRadius: 6, display: "block" }}
                  />
                </div>
              </div>
            );
          }
          if (!isUser && m.visionDescription) {
            return (
              <div key={i} className="flex items-start justify-start">
                <div
                  className="w-full"
                  style={{
                    background: "var(--background)",
                    border: "1px solid var(--success)",
                    borderRadius: 8,
                    padding: 12,
                    color: "var(--success)",
                    fontFamily: "JetBrains Mono, monospace",
                    fontSize: 13,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                >
                  <div style={{ fontSize: 11, marginBottom: 8, opacity: 0.85 }}>
                    🔍 VISUAL ANALYSIS (via llava):
                  </div>
                  {m.visionDescription}
                </div>
              </div>
            );
          }
          return (
            <div
              key={i}
              className={`flex items-start ${isUser ? "justify-end" : "justify-start"}`}
            >
              <div
                className={
                  isUser
                    ? "text-sm text-primary-foreground bg-gradient-to-br from-primary to-primary-glow shadow-[var(--shadow-elegant,0_8px_24px_-12px_rgba(255,170,0,0.5))]"
                    : "w-full"
                }
                style={
                  isUser
                    ? {
                        maxWidth: "85%",
                        padding: "10px 14px",
                        borderRadius: "18px 18px 4px 18px",
                      }
                    : {
                        background: "transparent",
                        borderLeft: "2px solid var(--border)",
                        padding: "8px 0 8px 16px",
                        borderRadius: 0,
                        fontFamily: "'IBM Plex Sans', sans-serif",
                        fontSize: 15,
                        lineHeight: 1.75,
                      }
                }
              >
                {isUser ? (
                  <div className="whitespace-pre-wrap break-words">{m.content}</div>
                ) : (
                  <>
                    <AssistantContent
                      content={m.content}
                      showCursor={showCursor}
                      projectName={projectName}
                      onSaveCodeBlock={onSaveCodeBlock}
                      matchProjectFile={matchProjectFile}
                      onCompareCodeBlock={onCompareCodeBlock}
                    />
                    {consultedByMessage[i] > 0 && (
                      <div
                        style={{
                          marginTop: 6,
                          fontFamily: "JetBrains Mono, monospace",
                          fontSize: 10,
                          color: "var(--muted-foreground)",
                          opacity: 0.75,
                        }}
                      >
                        🧠 {consultedByMessage[i]} memories consulted
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
        </div>
      </div>

      {streaming && (() => {
        const last = messages[messages.length - 1];
        if (!last || last.role !== "assistant") return null;
        const action = detectBrowserAction(last.content);
        if (!action) return null;
        return <BrowserTaskCard action={action} onStop={stop} />;
      })()}

      {memorySearchCard && (
        <div className="px-4 pb-2">
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid #9b59b6",
              borderRadius: 8,
              padding: 12,
              fontFamily: "JetBrains Mono, monospace",
              fontSize: 12,
              color: "var(--foreground)",
            }}
          >
            <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
              <div style={{ color: "#9b59b6", fontSize: 11, letterSpacing: "0.1em" }}>
                🧠 MEMORY SEARCH — {memorySearchCard.query}
              </div>
              <button
                type="button"
                onClick={() => setMemorySearchCard(null)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#9b59b6",
                  cursor: "pointer",
                  fontSize: 11,
                }}
              >
                ✕
              </button>
            </div>
            {memorySearchCard.loading ? (
              <div style={{ opacity: 0.7 }}>searching memories…</div>
            ) : memorySearchCard.results.length === 0 ? (
              <div style={{ opacity: 0.7 }}>no matching memories</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {memorySearchCard.results.map((r, idx) => (
                  <div
                    key={idx}
                    style={{
                      borderTop: idx === 0 ? "none" : "1px dashed rgba(155,89,182,0.25)",
                      paddingTop: idx === 0 ? 0 : 6,
                    }}
                  >
                    <div style={{ color: "#c084fc", fontSize: 10, opacity: 0.85 }}>
                      {r.score !== undefined ? `score ${r.score.toFixed(3)}` : "—"}
                      {r.timestamp ? ` · ${r.timestamp}` : ""}
                      {r.source ? ` · ${r.source}` : ""}
                    </div>
                    <div style={{ color: "#e9d5ff", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                      {r.content}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {planCard && (
        <PlanCard
          goal={planCard.goal}
          state={planCard.state}
          steps={planCard.steps}
          runtime={planCard.runtime}
          current={planCard.current}
          total={planCard.total}
          logs={planCard.logs}
          completed={planCard.completed}
          failed={planCard.failed}
          errorMsg={planCard.errorMsg}
          showResults={planCard.showResults}
          onExecute={() => {
            if (!planCard) return;
            sendPlan(tabId, planCard.goal);
            setPlanCard((prev) => prev ? { ...prev, state: "running", logs: prev.logs } : prev);
          }}
          onCancel={() => setPlanCard(null)}
          onPause={() => sendPlanPause(tabId)}
          onResume={() => sendPlanResume(tabId)}
          onStop={() => sendPlanStop(tabId)}
          onToggleResults={() => setPlanCard((prev) => prev ? { ...prev, showResults: !prev.showResults } : prev)}
          onDismiss={() => setPlanCard(null)}
        />
      )}

      {planSuggestion && (
        <div
          className="mx-4 mb-2 px-3 py-2 rounded-md flex items-center justify-between gap-3 font-mono"
          style={{
            background: "color-mix(in oklab, var(--primary) 12%, var(--surface))",
            border: "1px solid var(--primary)",
            color: "var(--foreground)",
            fontSize: 12,
          }}
        >
          <span>🗺 This sounds like a multi-step task.</span>
          <span className="flex gap-2">
            <button
              type="button"
              onClick={handleConfirmPlan}
              className="px-3 py-1 rounded uppercase tracking-[0.18em]"
              style={{ background: "var(--primary)", color: "var(--primary-foreground)", border: "none", fontSize: 10 }}
            >
              Create Plan
            </button>
            <button
              type="button"
              onClick={handleJustChat}
              className="px-3 py-1 rounded border uppercase tracking-[0.18em]"
              style={{ borderColor: "var(--border)", color: "var(--muted-foreground)", background: "transparent", fontSize: 10 }}
            >
              Just Chat
            </button>
          </span>
        </div>
      )}

      {installCard && (
        <div className="space-y-1">
          <InstallActionCard
            command={installCard.command}
            state={installCard.state}
            output={installCard.output}
            exitCode={installCard.exitCode}
            blockedReason={installCard.blockedReason}
            onApprove={handleApproveInstall}
            onDeny={handleDenyInstall}
          />
          {(installCard.state === "done" || installCard.state === "blocked") && (
            <div className="px-4 pb-1 text-right">
              <button
                type="button"
                onClick={handleDismissInstall}
                className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground"
              >
                dismiss ✕
              </button>
            </div>
          )}
        </div>
      )}

      {repairCard && (
        <div className="px-4 pb-2">
          <RepairCard
            state={repairCard.state}
            error={repairCard.error}
            logs={repairCard.logs}
            onCopyLog={() => {
              const text = `Error: ${repairCard.error}\n\n${repairCard.logs.join("\n")}`;
              navigator.clipboard?.writeText(text);
            }}
            onOpenConfig={onOpenConfig}
            onDismiss={() => setRepairCard(null)}
          />
        </div>
      )}

      {loginPrompt && (
        <LoginPromptCard
          initialUrl={loginPrompt.url}
          onSubmit={handleLoginSubmit}
          onCancel={handleLoginCancel}
        />
      )}

      {loginStatus && (
        <LoginStatusCard
          state={loginStatus.state}
          url={loginStatus.url}
          logs={loginStatus.logs}
          attempts={loginStatus.attempts}
          error={loginStatus.error}
          onTryRepair={loginStatus.state === "failed" ? () => {
            const err = `Login to ${loginStatus.url} failed${loginStatus.attempts ? ` after ${loginStatus.attempts} attempts` : ""}: ${loginStatus.error ?? "unknown error"}`;
            triggerSelfRepair(err);
            setLoginStatus(null);
          } : undefined}
          onDismiss={() => setLoginStatus(null)}
        />
      )}

      {errBurst >= 3 && !repairCard && !burstDismissed && (
        <div
          className="px-4 py-2 flex items-center justify-between gap-3 font-mono text-[11px]"
          style={{
            background: "var(--surface)",
            color: "var(--primary)",
            borderTop: "1px solid var(--border)",
          }}
        >
          <span>⚠ Multiple errors detected ({errBurst} in a row)</span>
          <span className="flex gap-2">
            <button
              type="button"
              onClick={() => triggerSelfRepair(`Auto-detected: ${errBurst} consecutive errors in tab log`)}
              className="px-2 py-0.5 rounded border"
              style={{ borderColor: "var(--primary)", color: "var(--primary)", background: "var(--background)" }}
            >
              🔧 RUN SELF-REPAIR
            </button>
            <button
              type="button"
              onClick={() => { setBurstDismissed(true); setErrBurst(0); consecutiveErrRef.current = 0; }}
              className="px-2 py-0.5 rounded border"
              style={{ borderColor: "var(--border)", color: "var(--muted-foreground)" }}
            >
              DISMISS
            </button>
          </span>
        </div>
      )}

      {isQueued && (
        <div
          className="px-4 py-2 flex items-center justify-between gap-3 font-mono text-[11px]"
          style={{
            background: "var(--surface)",
            color: "var(--primary)",
            borderTop: "1px solid var(--border)",
          }}
        >
          <span>
            ⏳ Queued — {agentsAhead} agent{agentsAhead === 1 ? "" : "s"} ahead of you. Estimated wait: ~{estimatedWaitSec}s
          </span>
          <span className="flex gap-2">
            <button
              type="button"
              onClick={() => onMoveToFront?.()}
              className="px-2 py-0.5 rounded border"
              style={{ borderColor: "var(--primary)", color: "var(--primary)" }}
            >
              MOVE TO FRONT
            </button>
            <button
              type="button"
              onClick={() => onCancelQueued?.()}
              className="px-2 py-0.5 rounded border"
              style={{ borderColor: "var(--destructive)", color: "var(--destructive)" }}
            >
              CANCEL
            </button>
          </span>
        </div>
      )}

      {showScrollButton && (
        <button
          type="button"
          onClick={() => {
            const el = scrollerRef.current;
            if (el) el.scrollTop = el.scrollHeight;
            setShowScrollButton(false);
          }}
          style={{
            position: "absolute",
            bottom: 80,
            right: 24,
            zIndex: 10,
            background: "var(--primary)",
            color: "var(--primary-foreground)",
            border: "1px solid var(--border)",
            borderRadius: 999,
            padding: "6px 14px",
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 11,
            cursor: "pointer",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          }}
        >
          ↓ scroll to latest
        </button>
      )}

      <div
        style={{
          background: "var(--surface)",
          borderTop: "1px solid var(--border)",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        <div className="mx-auto w-full" style={{ maxWidth: 680, padding: "12px 16px" }}>
          {historyIndex > -1 && (
            <div
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 10,
                color: "var(--muted-foreground)",
                paddingBottom: 4,
                opacity: historyIndex > -1 ? 1 : 0,
                transition: "opacity 0.15s",
              }}
            >
              ⌃ history {historyIndex + 1}/{inputHistory.length}  ↑↓ navigate  ESC clear
            </div>
          )}
          <div
            className="chat-pill flex flex-row items-end"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 16,
              padding: "10px 14px",
              gap: 10,
              transition: "border-color 0.15s, box-shadow 0.15s",
            }}
          >
            <button
              type="button"
              title="Attach"
              className="chat-attach-btn"
              style={{
                width: 28,
                height: 28,
                background: "transparent",
                border: "none",
                color: "var(--muted-foreground)",
                cursor: "pointer",
                fontSize: 16,
                flexShrink: 0,
                transition: "color 0.15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--primary)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--muted-foreground)")}
            >
              📎
            </button>
            <Textarea
              rows={1}
              ref={textareaRef}
              value={input}
              onChange={(e) => {
                const ta = e.target as HTMLTextAreaElement;
                ta.style.height = "auto";
                ta.style.height = Math.min(ta.scrollHeight, 200) + "px";
                setInput(ta.value);
                if (historyIndex !== -1) setHistoryIndex(-1);
              }}
              onKeyDown={onKeyDown}
              placeholder={connected ? "Message Worker Bee…" : "Connect to Ollama in CONFIG first"}
              className="flex-1 resize-none border-0 bg-transparent shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
              style={{
                padding: 0,
                height: "auto",
                minHeight: 24,
                maxHeight: 200,
                overflowY: "auto",
                resize: "none",
                fontSize: 14,
                boxShadow: "none",
              }}
            />
            <button
              type="button"
              onClick={streaming ? stop : send}
              disabled={!streaming && !input.trim() && !isQueued}
              title={streaming ? "Stop" : "Send"}
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 16,
                fontWeight: 700,
                cursor: streaming || input.trim() || isQueued ? "pointer" : "not-allowed",
                transition: "all 0.15s",
                ...(streaming
                  ? {
                      background: "color-mix(in oklab, var(--destructive) 15%, transparent)",
                      border: "1px solid var(--destructive)",
                      color: "var(--destructive)",
                    }
                  : input.trim() || isQueued
                  ? {
                      background:
                        "linear-gradient(135deg, var(--primary), var(--primary-glow, var(--primary)))",
                      color: "var(--primary-foreground)",
                      border: "none",
                    }
                  : {
                      background: "var(--surface-2)",
                      color: "var(--muted-foreground)",
                      border: "none",
                    }),
              }}
            >
              {streaming ? "◼" : "↑"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface AssistantContentProps {
  content: string;
  showCursor: boolean;
  projectName: string | null;
  onSaveCodeBlock?: (language: string, code: string, suggestedName: string) => void;
  matchProjectFile?: (language: string, code: string, suggestedName: string) => string | null;
  onCompareCodeBlock?: (filePath: string, newContent: string) => void;
}

function AssistantContent({ content, showCursor, projectName, onSaveCodeBlock, matchProjectFile, onCompareCodeBlock }: AssistantContentProps) {
  // Split on fenced ```lang\n...\n``` code blocks
  const parts: Array<{ type: "text" | "code"; lang?: string; text: string }> = [];
  const re = /```([a-zA-Z0-9]*)\n([\s\S]*?)```/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content))) {
    if (m.index > last) parts.push({ type: "text", text: content.slice(last, m.index) });
    parts.push({ type: "code", lang: m[1] || "text", text: m[2] });
    last = m.index + m[0].length;
  }
  if (last < content.length) parts.push({ type: "text", text: content.slice(last) });
  if (parts.length === 0) parts.push({ type: "text", text: content });

  return (
    <div className="space-y-2">
      {parts.map((p, i) => {
        if (p.type === "text") {
          return (
            <div key={i} className="whitespace-pre-wrap break-words">
              {p.text}
              {showCursor && i === parts.length - 1 && (
                <span
                  style={{
                    display: "inline-block",
                    marginLeft: 4,
                    fontSize: 14,
                    animation: "bee-wing 0.15s ease-in-out infinite",
                    transformOrigin: "center",
                  }}
                >
                  🐝
                </span>
              )}
            </div>
          );
        }
        const lang = p.lang ?? "text";
        const guess = guessName(lang);
        const matchedPath = matchProjectFile?.(lang, p.text, guess) ?? null;
        return (
          <div key={i} className="rounded overflow-hidden" style={{ border: "1px solid var(--border)" }}>
            <div
              className="flex items-center gap-2 px-2 py-1 font-mono text-[10px]"
              style={{ background: "var(--surface)", color: "var(--muted-foreground)", borderBottom: "1px solid var(--border)" }}
            >
              <span style={{ color: "var(--primary)" }}>{lang}</span>
              <div className="ml-auto flex gap-1">
                {matchedPath && onCompareCodeBlock && (
                  <button
                    type="button"
                    onClick={() => onCompareCodeBlock(matchedPath, p.text)}
                    className="px-2 py-0.5 rounded text-[10px] tracking-[0.1em]"
                    style={{ background: "var(--success)", color: "var(--success-foreground)" }}
                    title={`Compare with ${matchedPath}`}
                  >
                    ↔ Compare
                  </button>
                )}
                {projectName && onSaveCodeBlock && (
                  <button
                    type="button"
                    onClick={() => onSaveCodeBlock(lang, p.text, guess)}
                    className="px-2 py-0.5 rounded text-[10px] tracking-[0.1em]"
                    style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
                    title={`Save to ${projectName}`}
                  >
                    💾 Save to Project
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(p.text)}
                  className="px-2 py-0.5 rounded border text-[10px]"
                  style={{ borderColor: "var(--border)", color: "var(--muted-foreground)" }}
                >
                  📋 Copy
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const blob = new Blob([p.text], { type: "text/plain" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = guess;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="px-2 py-0.5 rounded border text-[10px]"
                  style={{ borderColor: "var(--border)", color: "var(--muted-foreground)" }}
                >
                  ⬇ Download
                </button>
              </div>
            </div>
            <pre
              className="px-3 py-2 overflow-x-auto font-mono text-[12px]"
              style={{ background: "var(--background)", color: "var(--foreground)" }}
            >
              {p.text}
            </pre>
          </div>
        );
      })}
    </div>
  );
}

function guessName(lang: string): string {
  switch (lang) {
    case "html": return "index.html";
    case "css": return "styles.css";
    case "js": case "javascript": return "script.js";
    case "ts": case "typescript": return "script.ts";
    case "json": return "data.json";
    case "md": case "markdown": return "README.md";
    default: return "snippet.txt";
  }
}

