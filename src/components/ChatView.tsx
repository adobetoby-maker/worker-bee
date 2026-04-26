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
  sendVoiceTranscribe,
  sendDevServerStop,
} from "@/lib/agent-ws";
import { toast } from "sonner";
import { marked } from "marked";

marked.setOptions({ gfm: true, breaks: true });

function renderInlineMarkdown(text: string): string {
  try {
    // Parse as markdown but disable code fences (they're handled by parent splitter).
    let html = marked.parse(text, { async: false, gfm: true, breaks: true } as any) as unknown as string;
    // Autolink any bare URLs that marked didn't already wrap in <a>.
    // Skip URLs already inside an href="..." or between <a>...</a>.
    html = html.replace(
      /(href="[^"]*"|<a\b[^>]*>[\s\S]*?<\/a>)|(https?:\/\/[^\s<)"']+)/g,
      (_match, skip, url) => {
        if (skip) return skip;
        return `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color:var(--primary);text-decoration:underline;text-underline-offset:3px;cursor:pointer">${url}</a>`;
      }
    );
    return html;
  } catch {
    return text.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]!);
  }
}
import { InstallActionCard, type InstallCardState } from "./InstallActionCard";
import { RepairCard, type RepairCardState } from "./RepairCard";
import { LoginPromptCard, type LoginSubmitArgs } from "./LoginPromptCard";
import { LoginStatusCard, type LoginCardState } from "./LoginStatusCard";
import { PlanCard, type PlanCardState, type PlanLogLine, type PlanStepRuntime } from "./PlanCard";
import { BeeLogo } from "./BeeLogo";
import { getIdentity, subscribeIdentity, type Identity } from "@/lib/identity";
import { TokenStreamPanel } from "./TokenStreamPanel";
import {
  tokenStreamBegin,
  tokenStreamPush,
  tokenStreamEnd,
} from "@/lib/token-stream";
import { CockpitSkillsRail } from "./CockpitSkillsRail";
import { CockpitActivityRail } from "./CockpitActivityRail";

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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  // Track which assistant message index we've already pinned to top, so we
  // don't keep re-scrolling the user on every streamed token (causes bounce).
  const pinnedAsstIdxRef = useRef<number>(-1);

  // Cockpit rails — show/hide skills (left) and activity/stream (right).
  const [leftRailOpen, setLeftRailOpen] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try { return window.localStorage.getItem("wb_cockpit_left") === "1"; } catch { return false; }
  });
  const [rightRailOpen, setRightRailOpen] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try { return window.localStorage.getItem("wb_cockpit_right") === "1"; } catch { return false; }
  });
  useEffect(() => {
    try { window.localStorage.setItem("wb_cockpit_left", leftRailOpen ? "1" : "0"); } catch { /* noop */ }
  }, [leftRailOpen]);
  useEffect(() => {
    try { window.localStorage.setItem("wb_cockpit_right", rightRailOpen ? "1" : "0"); } catch { /* noop */ }
  }, [rightRailOpen]);

  // In-component log mirror so the right rail can show recent agent activity
  // without us refactoring the parent's log store.
  const [recentLog, setRecentLog] = useState<LogLine[]>([]);
  const pushRecentLog = (line: LogLine) => {
    setRecentLog((prev) => {
      const next = [...prev, line];
      return next.length > 200 ? next.slice(next.length - 200) : next;
    });
  };

  // In-chat search overlay state (Cmd+F / Ctrl+F).
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchMatchIdx, setSearchMatchIdx] = useState(0);

  // Edit-and-resend state for user messages.
  const [editingMsgIdx, setEditingMsgIdx] = useState<number | null>(null);
  const [editingDraft, setEditingDraft] = useState("");

  // Force Claude toggle — purple, glows when active, resets after each send.
  const [forceClaude, setForceClaude] = useState(false);

  // User identity (Toby / Jay) — read from header selector via custom event.
  const [identity, setIdentityState] = useState<Identity>("toby");
  useEffect(() => {
    setIdentityState(getIdentity());
    return subscribeIdentity(setIdentityState);
  }, []);
  const identityRef = useRef<Identity>("toby");
  useEffect(() => { identityRef.current = identity; }, [identity]);

  // Terminal-style input history.
  const HISTORY_KEY = "workerbee_input_history";
  const [inputHistory, setInputHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [savedDraft, setSavedDraft] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Attachment dropdown (mirrors Email composer behavior).
  type ChatAttachment = { name: string; size: number; type: string; dataUrl?: string };
  const [attachMenuOpen, setAttachMenuOpen] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<ChatAttachment[]>([]);
  const attachBtnRef = useRef<HTMLButtonElement>(null);
  const attachMenuRef = useRef<HTMLDivElement>(null);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!attachMenuOpen) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (
        attachMenuRef.current?.contains(t) ||
        attachBtnRef.current?.contains(t)
      ) return;
      setAttachMenuOpen(false);
    };
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") {
        setAttachMenuOpen(false);
        attachBtnRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [attachMenuOpen]);

  const addChatFiles = async (files: FileList | File[] | null) => {
    if (!files) return;
    const arr = Array.from(files);
    const next: ChatAttachment[] = [];
    for (const f of arr) {
      if (f.size > 20 * 1024 * 1024) {
        toast.error(`${f.name} exceeds 20MB`);
        continue;
      }
      let dataUrl: string | undefined;
      if (f.type.startsWith("image/")) {
        try {
          dataUrl = await new Promise<string>((res, rej) => {
            const r = new FileReader();
            r.onload = () => res(String(r.result));
            r.onerror = rej;
            r.readAsDataURL(f);
          });
        } catch { /* ignore */ }
      }
      next.push({ name: f.name, size: f.size, type: f.type, dataUrl });
    }
    if (next.length) {
      setPendingAttachments((prev) => [...prev, ...next]);
      toast.success(`Attached ${next.length} file${next.length === 1 ? "" : "s"}`);
    }
  };

  const triggerChatFilePicker = (accept?: string, capture?: "user" | "environment") => {
    setAttachMenuOpen(false);
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = true;
    if (accept) input.accept = accept;
    if (capture) input.setAttribute("capture", capture);
    input.onchange = () => addChatFiles(input.files);
    input.click();
  };

  const captureChatScreenshot = async () => {
    setAttachMenuOpen(false);
    try {
      const md = navigator.mediaDevices as MediaDevices & {
        getDisplayMedia: (c?: unknown) => Promise<MediaStream>;
      };
      const stream = await md.getDisplayMedia({ video: true });
      const track = stream.getVideoTracks()[0];
      const video = document.createElement("video");
      video.srcObject = stream;
      await video.play();
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext("2d")!.drawImage(video, 0, 0);
      const blob = await new Promise<Blob>((res) => canvas.toBlob((b) => res(b!), "image/png"));
      stream.getTracks().forEach((t) => t.stop());
      track.stop();
      const file = new File([blob], `screenshot-${Date.now()}.png`, { type: "image/png" });
      await addChatFiles([file]);
    } catch (err) {
      const msg = (err as Error).message;
      if (!/permission|denied|abort/i.test(msg)) {
        toast.error(`Screenshot failed: ${msg}`);
      }
    }
  };

  const removeChatAttachment = (idx: number) => {
    setPendingAttachments((arr) => arr.filter((_, i) => i !== idx));
  };

  // Voice input state.
  const [micState, setMicState] = useState<"idle" | "recording" | "processing">("idle");
  const voiceUnsubRef = useRef<(() => void) | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const [recordCountdown, setRecordCountdown] = useState<number>(0);
  const countdownIntervalRef = useRef<number | null>(null);
  const transcribeTimeoutRef = useRef<number | null>(null);

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

  // Live preview panel state — shown when agent reports a running dev server.
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");
  const [previewRefreshKey, setPreviewRefreshKey] = useState(0);
  const [previewLastUpdated, setPreviewLastUpdated] = useState<number | null>(null);
  const [previewFlash, setPreviewFlash] = useState(false);
  const previewFlashTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const unsub = subscribeAgentWS(tabId, {
      onDevServerResult: (info) => {
        if (info.success && info.url) {
          setPreviewUrl(info.url);
          setPreviewLastUpdated(Date.now());
          setPreviewRefreshKey((n) => n + 1);
        }
      },
      onBuildApplied: () => {
        setPreviewLastUpdated(Date.now());
        setPreviewRefreshKey((n) => n + 1);
        setPreviewFlash(true);
        if (previewFlashTimerRef.current) {
          window.clearTimeout(previewFlashTimerRef.current);
        }
        previewFlashTimerRef.current = window.setTimeout(() => {
          setPreviewFlash(false);
          previewFlashTimerRef.current = null;
        }, 2000);
      },
      onScreenshot: () => {
        // Belt and suspenders — refresh iframe on any screenshot too.
        if (previewUrl) {
          setPreviewRefreshKey((n) => n + 1);
          setPreviewLastUpdated(Date.now());
        }
      },
    });
    return () => {
      unsub();
      if (previewFlashTimerRef.current) {
        window.clearTimeout(previewFlashTimerRef.current);
        previewFlashTimerRef.current = null;
      }
    };
  }, [tabId, previewUrl]);

  const closePreview = () => {
    const wasOpen = !!previewUrl;
    setPreviewUrl(null);
    setPreviewLastUpdated(null);
    setPreviewFlash(false);
    if (wasOpen) {
      sendDevServerStop(tabId, projectName ?? null);
    }
  };

  useEffect(() => {
    onStreamingChange(streaming);
  }, [streaming, onStreamingChange]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
    const last = messages[messages.length - 1];
    // When the user just sent a message, scroll that user message to the top
    // of the viewport (iMessage / Claude.ai feel).
    if (last?.role === "user") {
      pinnedAsstIdxRef.current = -1;
      window.setTimeout(() => {
        const userEls = el.querySelectorAll<HTMLElement>('[data-role="user"]');
        const lastUserEl = userEls[userEls.length - 1];
        if (lastUserEl) {
          // Compute offset of the user message relative to the scroller and
          // scroll the container directly so the message pins to the top,
          // leaving room below for the streaming response.
          const elRect = el.getBoundingClientRect();
          const msgRect = lastUserEl.getBoundingClientRect();
          const target = el.scrollTop + (msgRect.top - elRect.top) - 8;
          el.scrollTo({ top: Math.max(0, target), behavior: "smooth" });
        } else {
          messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
        }
        setShowScrollButton(false);
      }, 0);
      return;
    }
    // For streaming assistant updates, only follow if user is near the bottom.
    if (isNearBottom) {
      const lastIdx = messages.length - 1;
      // Pin the new assistant message to the top ONCE when it first appears.
      // After that, follow the bottom on subsequent token updates so the user
      // can keep reading without being yanked back up.
      if (last?.role === "assistant" && pinnedAsstIdxRef.current !== lastIdx) {
        pinnedAsstIdxRef.current = lastIdx;
        const assistantEls = el.querySelectorAll<HTMLElement>('[data-role="assistant"]');
        const lastAsstEl = assistantEls[assistantEls.length - 1];
        if (lastAsstEl) {
          const elRect = el.getBoundingClientRect();
          const msgRect = lastAsstEl.getBoundingClientRect();
          const target = el.scrollTop + (msgRect.top - elRect.top) - 24;
          el.scrollTo({ top: Math.max(0, target), behavior: "smooth" });
        }
      } else {
        // Smoothly follow new tokens at the bottom — no bounce to top.
        el.scrollTop = el.scrollHeight;
      }
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

  // Cmd+K / Ctrl+K — clear this agent's chat history (with confirm).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (window.confirm("Clear this agent's history?")) {
          onMessagesChange(() => []);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onMessagesChange]);

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

  // Subscribe to voice transcription results for this tab.
  useEffect(() => {
    voiceUnsubRef.current?.();
    const unsub = subscribeAgentWS(tabId, {
      onVoiceTranscription: ({ text }) => {
        if (transcribeTimeoutRef.current) {
          window.clearTimeout(transcribeTimeoutRef.current);
          transcribeTimeoutRef.current = null;
        }
        setMicState("idle");
        if (typeof text === "string" && text.length > 0) {
          setInput((input ? input + " " : "") + text);
          requestAnimationFrame(() => {
            const ta = textareaRef.current;
            if (ta) {
              ta.focus();
              ta.style.height = "auto";
              ta.style.height = Math.min(ta.scrollHeight, 200) + "px";
              const len = ta.value.length;
              try { ta.setSelectionRange(len, len); } catch { /* noop */ }
            }
          });
        }
      },
      onVoiceError: ({ message }) => {
        if (transcribeTimeoutRef.current) {
          window.clearTimeout(transcribeTimeoutRef.current);
          transcribeTimeoutRef.current = null;
        }
        setMicState("idle");
        toast.error(message || "Voice error");
      },
    });
    voiceUnsubRef.current = unsub;
    return () => { unsub(); voiceUnsubRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabId]);

  const handleMicClick = async () => {
    if (micState !== "idle") return;
    if (!isWSOpen(tabId)) {
      trackedAppendLog({ ts: nowTs(), level: "ERR", msg: "voice_input: WebSocket not open" });
      return;
    }
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      trackedAppendLog({ ts: nowTs(), level: "ERR", msg: "voice_input: MediaRecorder unsupported" });
      return;
    }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      trackedAppendLog({ ts: nowTs(), level: "ERR", msg: `voice_input: mic permission denied (${(err as Error).message})` });
      return;
    }
    mediaStreamRef.current = stream;
    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(stream);
    } catch (err) {
      stream.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
      trackedAppendLog({ ts: nowTs(), level: "ERR", msg: `voice_input: recorder init failed (${(err as Error).message})` });
      return;
    }
    mediaRecorderRef.current = recorder;
    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => { if (e.data && e.data.size > 0) chunks.push(e.data); };
    recorder.onstop = () => {
      // Release mic immediately.
      mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
      mediaRecorderRef.current = null;
      setMicState("processing");
      const mime = recorder.mimeType || "audio/webm";
      const blob = new Blob(chunks, { type: mime });
      const reader = new FileReader();
      reader.onload = () => {
        const result = typeof reader.result === "string" ? reader.result : "";
        const base64 = result.includes(",") ? result.split(",")[1] : result;
        const fmt = mime.includes("ogg") ? "ogg" : mime.includes("mp4") ? "mp4" : mime.includes("wav") ? "wav" : "webm";
        const ok = sendVoiceTranscribe(tabId, base64, fmt);
        if (!ok) {
          setMicState("idle");
          trackedAppendLog({ ts: nowTs(), level: "ERR", msg: "voice_transcribe: send failed" });
          return;
        }
        // Watchdog: reset to idle if no transcription arrives within 15s.
        if (transcribeTimeoutRef.current) window.clearTimeout(transcribeTimeoutRef.current);
        transcribeTimeoutRef.current = window.setTimeout(() => {
          transcribeTimeoutRef.current = null;
          setMicState("idle");
          toast.error("Voice timeout — try again");
          trackedAppendLog({ ts: nowTs(), level: "ERR", msg: "voice_transcribe: timeout (15s)" });
        }, 15000);
      };
      reader.onerror = () => {
        setMicState("idle");
        trackedAppendLog({ ts: nowTs(), level: "ERR", msg: "voice_transcribe: blob read failed" });
      };
      reader.readAsDataURL(blob);
    };
    setMicState("recording");
    setRecordCountdown(4);
    if (countdownIntervalRef.current) window.clearInterval(countdownIntervalRef.current);
    countdownIntervalRef.current = window.setInterval(() => {
      setRecordCountdown((n) => (n > 0 ? n - 1 : 0));
    }, 1000);
    try {
      recorder.start();
    } catch (err) {
      stream.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
      mediaRecorderRef.current = null;
      setMicState("idle");
      if (countdownIntervalRef.current) { window.clearInterval(countdownIntervalRef.current); countdownIntervalRef.current = null; }
      setRecordCountdown(0);
      trackedAppendLog({ ts: nowTs(), level: "ERR", msg: `voice_input: recorder start failed (${(err as Error).message})` });
      return;
    }
    window.setTimeout(() => {
      const r = mediaRecorderRef.current;
      if (r && r.state === "recording") {
        try { r.stop(); } catch { /* noop */ }
      }
      if (countdownIntervalRef.current) { window.clearInterval(countdownIntervalRef.current); countdownIntervalRef.current = null; }
      setRecordCountdown(0);
    }, 4000);
  };

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

  const startStream = async (text: string, opts: { forceClaude?: boolean } = {}) => {
    const useForceClaude = !!opts.forceClaude;
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
      tokenStreamEnd();
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
    tokenStreamBegin(tabId);
    controller.signal.addEventListener("abort", () => {
      trackedAppendLog({ ts: nowTs(), level: "ARROW", msg: "stream aborted" });
      finish();
    });

    const unsub = subscribeAgentWS(tabId, {
      onToken: (tok) => {
        if (!tok) return;
        assistantText += tok;
        tokenStreamPush(tabId, tok);
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
        const ok = sendChat(tabId, followUp, model, {
          forceClaude: useForceClaude,
          identity: identityRef.current,
        });
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

    const ok = sendChat(tabId, text, model, {
      forceClaude: useForceClaude,
      identity: identityRef.current,
    });
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
    const fc = forceClaude;
    if (fc) setForceClaude(false); // resets after each send
    await startStream(text, { forceClaude: fc });
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
    tokenStreamBegin(tabId);
    let assistantText = "";
    let finished = false;
    const finish = (errorText?: string) => {
      if (finished) return;
      finished = true;
      unsub?.();
      tokenStreamEnd();
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
        tokenStreamPush(tabId, tok);
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
    const ok = sendChat(tabId, content, model, { identity: identityRef.current });
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
    <div className="flex flex-1 min-h-0 flex-row relative">
      <TokenStreamPanel />
      <div
        className="flex min-h-0 flex-col relative"
        style={{
          animation: "var(--animate-slide-down)",
          flex: previewUrl ? "0 0 60%" : "1 1 100%",
          minWidth: 0,
        }}
      >
      <div ref={scrollerRef} className="flex-1 min-h-0 overflow-y-auto py-6">
        <div className="mx-auto w-full space-y-6" style={{ maxWidth: 680, padding: "0 16px", paddingBottom: "40vh" }}>
        {!connected && (
          <div className="flex justify-center">
            <div className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground border border-border bg-surface/40 px-4 py-2 rounded">
              ⚠ Connect to Ollama in CONFIG to start chatting
            </div>
          </div>
        )}
        {connected && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-4 py-16">
            <BeeLogo size={48} streaming={streaming} />
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
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
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
                  <BeeLogo size={14} />
                  <span>{chip}</span>
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
                  className="w-full group relative"
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
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 8,
                    }}
                  >
                    <span>🌐 SCREENSHOT — {m.screenshotUrl ?? ""}</span>
                    <DownloadImageButton
                      dataUrl={`data:image/png;base64,${m.screenshotB64}`}
                      filename={`screenshot-${Date.now()}.png`}
                    />
                  </div>
                  <img
                    src={`data:image/png;base64,${m.screenshotB64}`}
                    alt="browser screenshot"
                    style={{ width: "100%", borderRadius: 6, display: "block" }}
                  />
                  <CopyMessageButton text={m.screenshotUrl ? `Screenshot of ${m.screenshotUrl}` : "Screenshot"} />
                </div>
              </div>
            );
          }
          if (!isUser && m.visionDescription) {
            return (
              <div key={i} className="flex items-start justify-start">
                <div
                  className="w-full group relative"
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
                  <CopyMessageButton text={m.visionDescription} />
                </div>
              </div>
            );
          }
          return (
            <div
              key={i}
              data-role={isUser ? "user" : "assistant"}
              className={`flex items-start ${isUser ? "justify-end" : "justify-start"}`}
            >
              <div
                className={
                  isUser
                    ? "text-sm text-primary-foreground bg-gradient-to-br from-primary to-primary-glow shadow-[var(--shadow-elegant,0_8px_24px_-12px_rgba(255,170,0,0.5))] group relative"
                    : "w-full group relative"
                }
                style={
                  isUser
                    ? {
                        maxWidth: "85%",
                        padding: "10px 14px",
                        borderRadius: "18px 18px 4px 18px",
                      }
                    : {
                        background:
                          "color-mix(in oklab, var(--surface) 55%, transparent)",
                        border: "1px solid color-mix(in oklab, var(--border) 60%, transparent)",
                        padding: "12px 16px",
                        borderRadius: 12,
                        fontFamily: "'IBM Plex Sans', sans-serif",
                        fontSize: 15,
                        lineHeight: 1.75,
                      }
                }
              >
                {isUser ? (
                  <>
                    <div className="whitespace-pre-wrap break-words">{m.content}</div>
                    <CopyMessageButton text={m.content} variant="onPrimary" />
                  </>
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
                    {!showCursor && m.content && (
                      <MessageActions
                        text={m.content}
                        messageIndex={i}
                        isLast={i === messages.length - 1}
                        onRerun={() => {
                          // Find the user message immediately before this assistant message.
                          for (let k = i - 1; k >= 0; k--) {
                            if (messages[k].role === "user") {
                              sendFollowUpChat(messages[k].content);
                              break;
                            }
                          }
                        }}
                      />
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} aria-hidden="true" />
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
          {pendingAttachments.length > 0 && (
            <div
              className="flex flex-wrap gap-1.5"
              style={{ paddingBottom: 8 }}
            >
              {pendingAttachments.map((a, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs"
                  style={{
                    background: "var(--surface-2)",
                    border: "1px solid var(--border)",
                    color: "var(--foreground)",
                    maxWidth: 220,
                  }}
                >
                  {a.dataUrl ? (
                    <img
                      src={a.dataUrl}
                      alt=""
                      style={{ width: 18, height: 18, objectFit: "cover", borderRadius: 3 }}
                    />
                  ) : (
                    <span aria-hidden>📎</span>
                  )}
                  <span className="truncate">{a.name}</span>
                  <button
                    type="button"
                    onClick={() => removeChatAttachment(i)}
                    aria-label={`Remove ${a.name}`}
                    className="text-muted-foreground hover:text-destructive"
                    style={{ lineHeight: 1, fontSize: 14 }}
                  >
                    ×
                  </button>
                </span>
              ))}
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
            <span style={{ position: "relative", display: "inline-flex", flexShrink: 0 }}>
              <button
                ref={attachBtnRef}
                type="button"
                aria-haspopup="menu"
                aria-expanded={attachMenuOpen}
                aria-label="Add attachment"
                title="Add attachment"
                onClick={(e) => {
                  e.stopPropagation();
                  setAttachMenuOpen((v) => !v);
                }}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setAttachMenuOpen(true);
                    requestAnimationFrame(() => {
                      const first = attachMenuRef.current?.querySelector<HTMLButtonElement>("button");
                      first?.focus();
                    });
                  }
                }}
                className="chat-attach-btn"
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background: "transparent",
                  border: "1px solid var(--border)",
                  color: "var(--muted-foreground)",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  transition: "color 0.15s, border-color 0.15s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "var(--primary)")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "var(--muted-foreground)")}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </button>
              {attachMenuOpen && (
                <div
                  ref={attachMenuRef}
                  role="menu"
                  className="absolute z-30 min-w-[240px] rounded-lg shadow-xl overflow-hidden py-1"
                  style={{
                    bottom: "calc(100% + 8px)",
                    left: 0,
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                  }}
                >
                  <button
                    type="button"
                    role="menuitem"
                    onClick={captureChatScreenshot}
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-surface-2 flex items-center gap-3 text-foreground focus:outline-none focus:bg-surface-2"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
                      <path d="M3 7V5a2 2 0 0 1 2-2h2" />
                      <path d="M17 3h2a2 2 0 0 1 2 2v2" />
                      <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
                      <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                    Take a screenshot
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => triggerChatFilePicker("image/*")}
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-surface-2 flex items-center gap-3 text-foreground focus:outline-none focus:bg-surface-2"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <path d="m21 15-5-5L5 21" />
                    </svg>
                    Add image
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => triggerChatFilePicker()}
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-surface-2 flex items-center gap-3 text-foreground focus:outline-none focus:bg-surface-2"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
                      <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                    </svg>
                    Attach file
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => triggerChatFilePicker("image/*", "environment")}
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-surface-2 flex items-center gap-3 text-foreground focus:outline-none focus:bg-surface-2 sm:hidden"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                      <circle cx="12" cy="13" r="4" />
                    </svg>
                    Take photo
                  </button>
                  <div
                    className="mt-1 px-4 py-2 text-[10px] text-muted-foreground"
                    style={{ borderTop: "1px solid var(--border)" }}
                  >
                    Tip: paste (⌘V) images directly
                  </div>
                </div>
              )}
            </span>
            <span style={{ position: "relative", display: "inline-flex", flexShrink: 0 }}>
              <button
                type="button"
                title={
                  micState === "recording"
                    ? "Recording…"
                    : micState === "processing"
                    ? "Transcribing…"
                    : "Voice input (Beta) — requires sox & ffmpeg\nMay need: brew install sox ffmpeg\nFirst use: allow mic in System Settings"
                }
                onClick={handleMicClick}
                disabled={micState !== "idle"}
                className="chat-mic-btn"
                style={{
                  width: 28,
                  height: 28,
                  background: "transparent",
                  border: "none",
                  color:
                    micState === "recording"
                      ? "#ef4444"
                      : "var(--muted-foreground)",
                  cursor: micState === "idle" ? "pointer" : "default",
                  fontSize: 16,
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "color 0.15s",
                  animation:
                    micState === "recording"
                      ? "mic-pulse 1s ease-in-out infinite"
                      : "none",
                }}
                onMouseEnter={(e) => {
                  if (micState === "idle") e.currentTarget.style.color = "var(--primary)";
                }}
                onMouseLeave={(e) => {
                  if (micState === "idle") e.currentTarget.style.color = "var(--muted-foreground)";
                }}
              >
                {micState === "recording"
                  ? (recordCountdown > 0 ? `🔴 ${recordCountdown}` : "🔴")
                  : micState === "processing"
                  ? "⏳"
                  : "🎙"}
              </button>
              <span
                aria-hidden="true"
                style={{
                  position: "absolute",
                  top: 0,
                  right: 0,
                  background: "var(--primary)",
                  color: "#fff",
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 7,
                  lineHeight: 1,
                  padding: "1px 3px",
                  borderRadius: 2,
                  pointerEvents: "none",
                }}
              >
                β
              </span>
            </span>
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
              onPaste={(e) => {
                const items = e.clipboardData?.items;
                if (!items) return;
                const files: File[] = [];
                for (const it of Array.from(items)) {
                  if (it.kind === "file") {
                    const f = it.getAsFile();
                    if (f) files.push(f);
                  }
                }
                if (files.length) {
                  e.preventDefault();
                  addChatFiles(files);
                }
              }}
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
            {showScrollButton && (
              <button
                type="button"
                onClick={() => {
                  messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
                  setShowScrollButton(false);
                }}
                title="Scroll to latest"
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--primary)",
                  borderRadius: 999,
                  padding: "6px 12px",
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 11,
                  color: "var(--primary)",
                  whiteSpace: "nowrap",
                  cursor: "pointer",
                  flexShrink: 0,
                  alignSelf: "center",
                }}
              >
                ↓ latest
              </button>
            )}
            <button
              type="button"
              onClick={() => setForceClaude((v) => !v)}
              title={
                forceClaude
                  ? "Force Claude is ON for next message"
                  : "Force this message to Claude"
              }
              aria-pressed={forceClaude}
              style={{
                height: 30,
                padding: "0 10px",
                borderRadius: 999,
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 10,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                cursor: "pointer",
                flexShrink: 0,
                alignSelf: "center",
                transition: "all 0.15s",
                ...(forceClaude
                  ? {
                      background: "color-mix(in oklab, oklch(0.55 0.22 295) 18%, transparent)",
                      color: "oklch(0.82 0.18 295)",
                      border: "1px solid oklch(0.65 0.22 295)",
                      boxShadow: "0 0 12px oklch(0.55 0.22 295 / 0.55), inset 0 0 6px oklch(0.55 0.22 295 / 0.25)",
                    }
                  : {
                      background: "transparent",
                      color: "var(--muted-foreground)",
                      border: "1px solid var(--border)",
                    }),
              }}
            >
              {forceClaude ? "● Ask Claude" : "Ask Claude"}
            </button>
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
      {previewUrl && (
        <PreviewPanel
          url={previewUrl}
          projectName={projectName}
          mode={previewMode}
          onModeChange={setPreviewMode}
          refreshKey={previewRefreshKey}
          onRefresh={() => {
            setPreviewRefreshKey((n) => n + 1);
            setPreviewLastUpdated(Date.now());
          }}
          lastUpdated={previewLastUpdated}
          flash={previewFlash}
          onClose={closePreview}
        />
      )}
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

function MessageActions({
  text,
  messageIndex,
  isLast,
  onRerun,
}: {
  text: string;
  messageIndex: number;
  isLast: boolean;
  onRerun: () => void;
}) {
  const upKey = `wb_feedback_${messageIndex}_up`;
  const downKey = `wb_feedback_${messageIndex}_down`;
  const [up, setUp] = useState(false);
  const [down, setDown] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      setUp(window.localStorage.getItem(upKey) === "1");
      setDown(window.localStorage.getItem(downKey) === "1");
    } catch { /* noop */ }
  }, [upKey, downKey]);

  const persist = (key: string, on: boolean) => {
    try {
      if (typeof window === "undefined") return;
      if (on) window.localStorage.setItem(key, "1");
      else window.localStorage.removeItem(key);
    } catch { /* noop */ }
  };

  const baseBtn = (active: boolean, activeColor?: string): React.CSSProperties => ({
    width: 28,
    height: 28,
    background: "transparent",
    border: `1px solid ${active ? activeColor ?? "var(--primary)" : "var(--border)"}`,
    borderRadius: 6,
    fontSize: 13,
    cursor: "pointer",
    color: active ? activeColor ?? "var(--primary)" : "var(--muted-foreground)",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.15s",
  });

  const onHoverIn = (e: React.MouseEvent<HTMLButtonElement>, active: boolean, activeColor?: string) => {
    if (active) return;
    e.currentTarget.style.background = "var(--surface)";
    e.currentTarget.style.color = "var(--foreground)";
    e.currentTarget.style.borderColor = activeColor ?? "var(--primary)";
  };
  const onHoverOut = (e: React.MouseEvent<HTMLButtonElement>, active: boolean, activeColor?: string) => {
    if (active) return;
    e.currentTarget.style.background = "transparent";
    e.currentTarget.style.color = "var(--muted-foreground)";
    e.currentTarget.style.borderColor = "var(--border)";
    void activeColor;
  };

  return (
    <div
      style={{
        marginTop: 8,
        display: "flex",
        gap: 6,
        justifyContent: "flex-start",
        opacity: isLast ? 1 : 0,
        transition: "opacity 200ms",
      }}
      className={isLast ? "" : "group-hover:opacity-100"}
    >
      <button
        type="button"
        title="Good response"
        onClick={(e) => {
          e.stopPropagation();
          const next = !up;
          setUp(next);
          persist(upKey, next);
          if (next && down) {
            setDown(false);
            persist(downKey, false);
          }
        }}
        onMouseEnter={(e) => onHoverIn(e, up)}
        onMouseLeave={(e) => onHoverOut(e, up)}
        style={baseBtn(up)}
      >
        👍
      </button>
      <button
        type="button"
        title="Bad response"
        onClick={(e) => {
          e.stopPropagation();
          const next = !down;
          setDown(next);
          persist(downKey, next);
          if (next && up) {
            setUp(false);
            persist(upKey, false);
          }
        }}
        onMouseEnter={(e) => onHoverIn(e, down, "#ff3b3b")}
        onMouseLeave={(e) => onHoverOut(e, down, "#ff3b3b")}
        style={baseBtn(down, "#ff3b3b")}
      >
        👎
      </button>
      <button
        type="button"
        title="Regenerate response"
        onClick={(e) => {
          e.stopPropagation();
          onRerun();
        }}
        onMouseEnter={(e) => onHoverIn(e, false)}
        onMouseLeave={(e) => onHoverOut(e, false)}
        style={baseBtn(false)}
      >
        🔄
      </button>
      <button
        type="button"
        title="Copy message"
        onClick={async (e) => {
          e.stopPropagation();
          try {
            await navigator.clipboard.writeText(text);
          } catch { /* noop */ }
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }}
        onMouseEnter={(e) => onHoverIn(e, false)}
        onMouseLeave={(e) => onHoverOut(e, false)}
        style={baseBtn(false)}
      >
        {copied ? "✓" : "📋"}
      </button>
    </div>
  );
}

function CopyMessageButton({ text, variant = "default" }: { text: string; variant?: "default" | "onPrimary" }) {
  const [copied, setCopied] = useState(false);
  const onPrimary = variant === "onPrimary";
  return (
    <button
      type="button"
      onClick={async (e) => {
        e.stopPropagation();
        try {
          await navigator.clipboard.writeText(text);
        } catch {
          // ignore
        }
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="opacity-0 group-hover:opacity-100 transition-opacity"
      style={{
        position: "absolute",
        bottom: 4,
        right: 4,
        background: onPrimary ? "rgba(0,0,0,0.18)" : "transparent",
        border: onPrimary ? "1px solid rgba(255,255,255,0.3)" : "1px solid var(--border)",
        borderRadius: 4,
        padding: "2px 6px",
        fontSize: 10,
        fontFamily: "JetBrains Mono, monospace",
        color: onPrimary ? "var(--primary-foreground)" : "var(--muted-foreground)",
        cursor: "pointer",
      }}
    >
      {copied ? "✓ copied" : "📋 copy"}
    </button>
  );
}

function DownloadImageButton({ dataUrl, filename }: { dataUrl: string; filename: string }) {
  return (
    <a
      href={dataUrl}
      download={filename}
      onClick={(e) => e.stopPropagation()}
      style={{
        background: "transparent",
        border: "1px solid var(--primary)",
        borderRadius: 4,
        padding: "2px 8px",
        fontSize: 10,
        fontFamily: "JetBrains Mono, monospace",
        color: "var(--primary)",
        cursor: "pointer",
        textDecoration: "none",
      }}
      title={`Download ${filename}`}
    >
      ⬇ download
    </a>
  );
}

function AssistantContent({ content, showCursor, projectName, onSaveCodeBlock, matchProjectFile, onCompareCodeBlock }: AssistantContentProps) {
  // Split on fenced ```lang\n...\n``` code blocks
  const parts: Array<{ type: "text" | "code"; lang?: string; text: string }> = [];
  const re = /```([a-zA-Z0-9]*)\n?([\s\S]*?)```/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content))) {
    if (m.index > last) parts.push({ type: "text", text: content.slice(last, m.index) });
    parts.push({ type: "code", lang: m[1] || "", text: m[2] });
    last = m.index + m[0].length;
  }
  if (last < content.length) parts.push({ type: "text", text: content.slice(last) });
  if (parts.length === 0) parts.push({ type: "text", text: content });

  return (
    <div className="space-y-2">
      {parts.map((p, i) => {
        if (p.type === "text") {
          const html = renderInlineMarkdown(p.text);
          return (
            <div key={i} className="break-words assistant-md">
              <span dangerouslySetInnerHTML={{ __html: html }} />
              {showCursor && i === parts.length - 1 && (
                <BeeLogo size={18} streaming={true} />
              )}
            </div>
          );
        }
        const rawLang = (p.lang ?? "").toLowerCase();
        const isPrompt = rawLang === "" || rawLang === "lovable" || rawLang === "prompt";
        if (isPrompt) {
          return <PromptContainer key={i} text={p.text} />;
        }
        const lang = p.lang || "text";
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

function PromptContainer({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // ignore
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div
      style={{
        background: "color-mix(in oklab, var(--primary) 8%, transparent)",
        border: "1px solid var(--primary)",
        borderLeft: "4px solid var(--primary)",
        borderRadius: 8,
        padding: 16,
        margin: "8px 0",
        position: "relative",
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 13,
        color: "var(--foreground)",
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 10,
          gap: 8,
        }}
      >
        <span
          style={{
            color: "var(--primary)",
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10,
            textTransform: "uppercase",
            letterSpacing: "0.12em",
          }}
        >
          📋 PROMPT
        </span>
        <span style={{ display: "inline-flex", gap: 6 }}>
          <button
            type="button"
            onClick={onCopy}
            style={{
              background: "transparent",
              border: "1px solid var(--primary)",
              color: "var(--primary)",
              borderRadius: 4,
              padding: "2px 8px",
              fontSize: 10,
              fontFamily: "'JetBrains Mono', monospace",
              cursor: "pointer",
            }}
          >
            {copied ? "✓ Copied" : "📋 Copy"}
          </button>
          <a
            href="https://lovable.dev"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              background: "var(--primary)",
              color: "var(--primary-foreground)",
              borderRadius: 4,
              padding: "2px 8px",
              fontSize: 10,
              fontFamily: "'JetBrains Mono', monospace",
              cursor: "pointer",
              textDecoration: "none",
              border: "1px solid var(--primary)",
            }}
          >
            ▶ Open Lovable
          </a>
        </span>
      </div>
      {text}
    </div>
  );
}

interface PreviewPanelProps {
  url: string;
  projectName: string | null;
  mode: "desktop" | "mobile";
  onModeChange: (m: "desktop" | "mobile") => void;
  refreshKey: number;
  onRefresh: () => void;
  lastUpdated: number | null;
  flash: boolean;
  onClose: () => void;
}

function PreviewPanel({
  url,
  projectName,
  mode,
  onModeChange,
  refreshKey,
  onRefresh,
  lastUpdated,
  flash,
  onClose,
}: PreviewPanelProps) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick((n) => n + 1), 5000);
    return () => window.clearInterval(id);
  }, []);
  // Reference tick so it influences the relative time render.
  void tick;

  const formatRelative = (ts: number | null): string => {
    if (!ts) return "—";
    const diff = Math.max(0, Date.now() - ts);
    const s = Math.floor(diff / 1000);
    if (s < 5) return "just now";
    if (s < 60) return `${s}s ago`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    return `${h}h ago`;
  };

  return (
    <div
      style={{
        flex: "0 0 40%",
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
        borderLeft: "1px solid var(--border)",
        background: "var(--background)",
        animation: "var(--animate-slide-down)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 12px",
          borderBottom: "1px solid var(--border)",
          background: "var(--surface, var(--background))",
          flexShrink: 0,
        }}
      >
        <span
          aria-label="live"
          title="Live preview"
          style={{
            display: "inline-block",
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: "#22c55e",
            boxShadow: "0 0 8px #22c55e",
            animation: "pulse-neon 1.4s ease-in-out infinite",
            flexShrink: 0,
          }}
        />
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 11,
            color: "#22c55e",
            fontWeight: 700,
            letterSpacing: "0.1em",
          }}
        >
          LIVE
        </span>
        <div style={{ minWidth: 0, flex: 1, display: "flex", flexDirection: "column" }}>
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "var(--foreground)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {projectName ?? "Preview"}
          </span>
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10,
              color: "var(--muted-foreground)",
              textDecoration: "none",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
            title={url}
          >
            {url}
          </a>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          title="Refresh preview"
          style={previewBtnStyle()}
          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--primary)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--muted-foreground)")}
        >
          🔄
        </button>
        <button
          type="button"
          onClick={() => onModeChange(mode === "desktop" ? "mobile" : "desktop")}
          title={mode === "desktop" ? "Switch to mobile preview" : "Switch to desktop preview"}
          style={previewBtnStyle()}
          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--primary)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--muted-foreground)")}
        >
          {mode === "desktop" ? "🖥" : "📱"}
        </button>
        <button
          type="button"
          onClick={onClose}
          title="Close preview & stop dev server"
          style={previewBtnStyle()}
          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--destructive)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--muted-foreground)")}
        >
          ✕
        </button>
      </div>
      <div
        style={{
          flex: 1,
          minHeight: 0,
          background: mode === "mobile" ? "var(--surface-2, var(--background))" : "var(--background)",
          display: "flex",
          alignItems: "stretch",
          justifyContent: "center",
          overflow: "auto",
        }}
      >
        <iframe
          key={refreshKey}
          src={url}
          title="Project Preview"
          style={{
            width: mode === "mobile" ? 375 : "100%",
            maxWidth: "100%",
            height: "100%",
            border: "none",
            background: "#fff",
          }}
        />
      </div>
      <div
        style={{
          padding: "6px 12px",
          borderTop: "1px solid var(--border)",
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 10,
          color: flash ? "#22c55e" : "var(--muted-foreground)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          flexShrink: 0,
          transition: "color 0.2s",
        }}
      >
        <span>{flash ? "⚡ Changes detected — refreshing…" : `Last updated ${formatRelative(lastUpdated)}`}</span>
        {flash && <span>⚡ Updated</span>}
      </div>
    </div>
  );
}

function previewBtnStyle(): React.CSSProperties {
  return {
    width: 28,
    height: 28,
    background: "transparent",
    border: "none",
    color: "var(--muted-foreground)",
    cursor: "pointer",
    fontSize: 14,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    transition: "color 0.15s",
    borderRadius: 4,
  };
}

