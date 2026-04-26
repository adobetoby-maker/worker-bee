// Worker Bee — per-tab WebSocket manager.
// One socket per tab, opened on tab create, closed on tab close.
// Server expects: ws://<host>/ws/<tabId>
// Inbound message shapes: { type: "token"|"done"|"status"|"error"|"pong", ... }

import { nowTs, type LogLine } from "@/lib/agent-state";
import type {
  GmailCategoryCount,
  GmailCategoryId,
  GmailDone,
  GmailEmailPreview,
  GmailProgress,
  GmailTopSender,
} from "@/lib/gmail-protocol";

export type WSStatus = "idle" | "connecting" | "open" | "closed" | "error";

export interface AgentWSMessage {
  type:
    | "token" | "done" | "status" | "error" | "pong"
    | "browser_result" | "shell_output" | "shell_done" | "screenshot"
    | "repair_started" | "repair_log" | "repair_complete"
    | "gmail_summary" | "gmail_preview" | "gmail_top_senders"
    | "gmail_progress" | "gmail_done"
    | "login_log" | "login_result"
    | "tags_result" | "ps_result"
    | "memory_stats" | "memory_search_result" | "memory_consulted" | "memory_stored"
    | "plan_started" | "plan_ready" | "plan_progress" | "plan_log" | "plan_complete" | "plan_error"
    | "voice_transcription" | "voice_error"
    | "dev_server_result" | "build_applied"
    | "build_log" | "build_complete" | "build_error"
    | "build_phase" | "build_brief" | "build_vision"
    | "narrator_status" | "build_committed" | "github_pushed"
    | "projects_list" | "scaffold_result";
  content?: string;
  text?: string;
  message?: string;
  [key: string]: unknown;
}

export interface AgentWSHandlers {
  onToken?: (text: string) => void;
  onDone?: () => void;
  onStatus?: (text: string) => void;
  onError?: (text: string) => void;
  onPong?: () => void;
  onOpen?: () => void;
  onClose?: () => void;
  onSocketError?: () => void;
  onClearThinking?: () => void;
  onBrowserResult?: (result: { text: string; url?: string; visionDescription?: string; raw: unknown }) => void;
  onScreenshot?: (result: { url?: string; screenshotB64: string }) => void;
  onShellOutput?: (chunk: string) => void;
  onShellDone?: (result: { exitCode: number; ok: boolean; output: string }) => void;
  onRepairStarted?: (info: { error: string }) => void;
  onRepairLog?: (line: string) => void;
  onRepairComplete?: (info: { ok: boolean; message?: string; errorLog?: string }) => void;
  onGmailSummary?: (info: { categories: GmailCategoryCount[] }) => void;
  onGmailPreview?: (info: { category: GmailCategoryId; items: GmailEmailPreview[] }) => void;
  onGmailTopSenders?: (info: { senders: GmailTopSender[] }) => void;
  onGmailProgress?: (info: GmailProgress) => void;
  onGmailDone?: (info: GmailDone) => void;
  onLoginLog?: (line: string) => void;
  onLoginResult?: (info: { ok: boolean; url?: string; attempts?: number; error?: string }) => void;
  onMemoryStats?: (info: { conversations: number; actions: number; knowledge: number; total: number }) => void;
  onMemorySearchResult?: (info: { query: string; results: MemorySearchResult[] }) => void;
  onMemoryConsulted?: (info: { count: number }) => void;
  onMemoryStored?: (info: { ok: boolean; message?: string }) => void;
  onPlanStarted?: (info: { goal: string }) => void;
  onPlanReady?: (info: PlanReady) => void;
  onPlanProgress?: (info: PlanProgress) => void;
  onPlanLog?: (info: { message: string; level: PlanLogLevel }) => void;
  onPlanComplete?: (info: PlanComplete) => void;
  onPlanError?: (info: { message: string }) => void;
  onVoiceTranscription?: (info: { text: string }) => void;
  onVoiceError?: (info: { message: string }) => void;
  onDevServerResult?: (info: { success: boolean; url?: string; project?: string; message?: string }) => void;
  onBuildApplied?: (info: { project?: string; message?: string }) => void;
  onBuildLog?: (info: { level?: string; message: string }) => void;
  onBuildComplete?: (info: { ok: boolean; project?: string; filesChanged?: number; message?: string }) => void;
  onBuildError?: (info: { message: string }) => void;
  onBuildPhase?: (info: { phase: string; message?: string }) => void;
  onBuildBrief?: (info: { brief: string }) => void;
  onBuildVision?: (info: { text: string; ok?: boolean }) => void;
  onNarratorStatus?: (info: { line: string }) => void;
  onBuildCommitted?: (info: { commitHash: string }) => void;
  onGithubPushed?: (info: { repoUrl: string }) => void;
  onProjectsList?: (info: { projects: Array<{ name: string; path?: string; updatedAt?: number }> }) => void;
  onScaffoldResult?: (info: { ok: boolean; name?: string; message?: string }) => void;
}

export interface PlanStep {
  id: number;
  action: string;
  description: string;
  params: Record<string, unknown>;
  depends_on: number[];
}
export interface PlanReady {
  goal: string;
  tasks: PlanStep[];
  count: number;
}
export type PlanStepStatus = "running" | "done" | "failed";
export interface PlanProgress {
  step_id: number;
  status: PlanStepStatus;
  action: string;
  desc: string;
  result: Record<string, unknown> | null;
  current: number;
  total: number;
}
export type PlanLogLevel = "info" | "ok" | "error" | "warn";
export interface PlanComplete {
  completed: number;
  failed: number;
  total: number;
  results: Record<string, unknown>;
}

export interface MemorySearchResult {
  score?: number;
  timestamp?: string;
  content: string;
  source?: string;
}

interface Entry {
  ws: WebSocket | null;
  endpoint: string;
  status: WSStatus;
  handlers: Set<AgentWSHandlers>;
  log: ((line: LogLine) => void) | null;
  reconnectAttempts: number;
  reconnectTimer: ReturnType<typeof setTimeout> | null;
  intentionalClose: boolean;
  heartbeatTimer: ReturnType<typeof setInterval> | null;
  pongTimer: ReturnType<typeof setTimeout> | null;
  keepaliveTimer: ReturnType<typeof setInterval> | null;
  keepaliveWarnTimer: ReturnType<typeof setTimeout> | null;
  keepaliveAwaitingPong: boolean;
  lastMessageAt: number;
  awaitingPong: boolean;
}

const tabs = new Map<string, Entry>();

const MAX_RECONNECT_ATTEMPTS = 10;
const BASE_RECONNECT_DELAY_MS = 1000;
const MAX_RECONNECT_DELAY_MS = 30000;
const HEARTBEAT_INTERVAL_MS = 30000;
const PONG_TIMEOUT_MS = 300000;
const KEEPALIVE_INTERVAL_MS = 20000;
const KEEPALIVE_WARN_MS = 10000;

type ReconnectListener = (info: { tabId: string; attempt: number; max: number; status: "trying" | "connected" | "failed" }) => void;
const reconnectListeners = new Set<ReconnectListener>();

export function subscribeReconnectStatus(fn: ReconnectListener): () => void {
  reconnectListeners.add(fn);
  return () => { reconnectListeners.delete(fn); };
}

function emitReconnect(tabId: string, entry: Entry, status: "trying" | "connected" | "failed"): void {
  reconnectListeners.forEach((fn) => fn({
    tabId,
    attempt: entry.reconnectAttempts,
    max: MAX_RECONNECT_ATTEMPTS,
    status,
  }));
}

function clearTimers(entry: Entry): void {
  if (entry.reconnectTimer) { clearTimeout(entry.reconnectTimer); entry.reconnectTimer = null; }
  if (entry.heartbeatTimer) { clearInterval(entry.heartbeatTimer); entry.heartbeatTimer = null; }
  if (entry.pongTimer) { clearTimeout(entry.pongTimer); entry.pongTimer = null; }
  if (entry.keepaliveTimer) { clearInterval(entry.keepaliveTimer); entry.keepaliveTimer = null; }
  if (entry.keepaliveWarnTimer) { clearTimeout(entry.keepaliveWarnTimer); entry.keepaliveWarnTimer = null; }
  entry.keepaliveAwaitingPong = false;
  entry.awaitingPong = false;
}

function startHeartbeat(tabId: string, entry: Entry): void {
  if (entry.heartbeatTimer) clearInterval(entry.heartbeatTimer);
  entry.heartbeatTimer = setInterval(() => {
    const ws = entry.ws;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    const idle = Date.now() - entry.lastMessageAt;
    if (idle < HEARTBEAT_INTERVAL_MS) return;
    try {
      ws.send(JSON.stringify({ action: "ping" }));
      entry.awaitingPong = true;
      if (entry.pongTimer) clearTimeout(entry.pongTimer);
      entry.pongTimer = setTimeout(() => {
        if (entry.awaitingPong) {
          entry.log?.({ ts: nowTs(), level: "ERR", msg: "Heartbeat timeout — reconnecting" });
          try { ws.close(); } catch { /* noop */ }
        }
      }, PONG_TIMEOUT_MS);
    } catch { /* noop */ }
  }, HEARTBEAT_INTERVAL_MS);
}

function startKeepalive(_tabId: string, entry: Entry): void {
  if (entry.keepaliveTimer) clearInterval(entry.keepaliveTimer);
  entry.keepaliveTimer = setInterval(() => {
    const ws = entry.ws;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    try {
      ws.send(JSON.stringify({ action: "ping" }));
      entry.keepaliveAwaitingPong = true;
      if (entry.keepaliveWarnTimer) clearTimeout(entry.keepaliveWarnTimer);
      entry.keepaliveWarnTimer = setTimeout(() => {
        if (entry.keepaliveAwaitingPong) {
          console.warn("[agent-ws] keepalive: no pong within 10s, continuing");
        }
      }, KEEPALIVE_WARN_MS);
    } catch { /* noop */ }
  }, KEEPALIVE_INTERVAL_MS);
}

function scheduleReconnect(tabId: string, entry: Entry): void {
  if (entry.intentionalClose) return;
  if (entry.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    entry.log?.({ ts: nowTs(), level: "ERR", msg: "Agent unreachable — is Worker Bee running?" });
    entry.log?.({ ts: nowTs(), level: "ARROW", msg: "Start it: cd ~/worker-bee && ./start.sh" });
    emitReconnect(tabId, entry, "failed");
    return;
  }
  const delay = Math.min(BASE_RECONNECT_DELAY_MS * Math.pow(2, entry.reconnectAttempts), MAX_RECONNECT_DELAY_MS);
  entry.reconnectAttempts++;
  entry.log?.({ ts: nowTs(), level: "ARROW", msg: `Reconnect attempt ${entry.reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS} in ${Math.round(delay / 1000)}s` });
  emitReconnect(tabId, entry, "trying");
  if (entry.reconnectTimer) clearTimeout(entry.reconnectTimer);
  entry.reconnectTimer = setTimeout(() => {
    entry.reconnectTimer = null;
    createSocket(tabId, entry);
  }, delay);
}

function createSocket(tabId: string, entry: Entry): void {
  entry.status = "connecting";
  let ws: WebSocket;
  try {
    ws = new WebSocket(wsUrl(entry.endpoint, tabId));
  } catch {
    entry.status = "error";
    entry.log?.({ ts: nowTs(), level: "ERR", msg: "WebSocket error — is agent running?" });
    scheduleReconnect(tabId, entry);
    return;
  }
  entry.ws = ws;
  entry.lastMessageAt = Date.now();

  ws.onopen = () => {
    entry.status = "open";
    const wasReconnect = entry.reconnectAttempts > 0;
    entry.reconnectAttempts = 0;
    entry.lastMessageAt = Date.now();
    entry.log?.({ ts: nowTs(), level: "OK", msg: wasReconnect ? "WebSocket reconnected ✓" : "WebSocket connected to agent :8000" });
    try { ws.send(JSON.stringify({ action: "ping" })); } catch { /* noop */ }
    startHeartbeat(tabId, entry);
    startKeepalive(tabId, entry);
    emitReconnect(tabId, entry, "connected");
    entry.handlers.forEach((h) => h.onOpen?.());
  };
  ws.onclose = () => {
    entry.status = "closed";
    if (entry.heartbeatTimer) { clearInterval(entry.heartbeatTimer); entry.heartbeatTimer = null; }
    if (entry.pongTimer) { clearTimeout(entry.pongTimer); entry.pongTimer = null; }
    if (entry.keepaliveTimer) { clearInterval(entry.keepaliveTimer); entry.keepaliveTimer = null; }
    if (entry.keepaliveWarnTimer) { clearTimeout(entry.keepaliveWarnTimer); entry.keepaliveWarnTimer = null; }
    entry.keepaliveAwaitingPong = false;
    entry.handlers.forEach((h) => h.onClose?.());
    if (!entry.intentionalClose) {
      entry.log?.({ ts: nowTs(), level: "ARROW", msg: "WebSocket disconnected — reconnecting..." });
      scheduleReconnect(tabId, entry);
    } else {
      entry.log?.({ ts: nowTs(), level: "ARROW", msg: "WebSocket disconnected" });
    }
  };
  ws.onerror = (event) => {
    entry.status = "error";
    entry.log?.({ ts: nowTs(), level: "ERR", msg: "WebSocket error — is agent running?" });
    console.error("WS error event:", event);
    entry.handlers.forEach((h) => h.onSocketError?.());
  };
  ws.onmessage = (event) => {
    entry.lastMessageAt = Date.now();
    if (entry.awaitingPong) {
      entry.awaitingPong = false;
      if (entry.pongTimer) { clearTimeout(entry.pongTimer); entry.pongTimer = null; }
    }
    handleMessage(entry, event);
  };
}

function wsUrl(endpoint: string, tabId: string): string {
  // Smart protocol detection: https → wss, http → ws.
  // Also auto-upgrade to wss when the page itself is served over https
  // (browsers block ws:// from https:// pages as mixed content).
  const trimmed = endpoint.replace(/\/$/, "");
  const pageIsHttps =
    typeof window !== "undefined" && window.location?.protocol === "https:";
  let proto: "ws" | "wss";
  let host: string;
  if (trimmed.startsWith("https://")) {
    proto = "wss";
    host = trimmed.slice(8);
  } else if (trimmed.startsWith("http://")) {
    proto = pageIsHttps ? "wss" : "ws";
    host = trimmed.slice(7);
  } else {
    proto = pageIsHttps ? "wss" : "ws";
    host = trimmed;
  }
  return `${proto}://${host}/ws/${tabId}`;
}

export function openAgentWS(
  tabId: string,
  endpoint: string,
  log?: (line: LogLine) => void,
): void {
  const existing = tabs.get(tabId);
  if (existing && existing.ws && existing.endpoint === endpoint) {
    if (existing.ws.readyState === WebSocket.OPEN || existing.ws.readyState === WebSocket.CONNECTING) {
      return;
    }
  }
  // Close previous if endpoint changed
  if (existing?.ws) {
    if (existing) existing.intentionalClose = true;
    try { existing.ws.close(); } catch { /* noop */ }
  }

  const entry: Entry = existing ?? {
    ws: null,
    endpoint,
    status: "idle",
    handlers: new Set(),
    log: log ?? null,
    reconnectAttempts: 0,
    reconnectTimer: null,
    intentionalClose: false,
    heartbeatTimer: null,
    pongTimer: null,
    keepaliveTimer: null,
    keepaliveWarnTimer: null,
    keepaliveAwaitingPong: false,
    lastMessageAt: 0,
    awaitingPong: false,
  };
  entry.endpoint = endpoint;
  if (log) entry.log = log;
  entry.intentionalClose = false;
  entry.reconnectAttempts = 0;
  clearTimers(entry);
  tabs.set(tabId, entry);
  createSocket(tabId, entry);
}

function handleMessage(entry: Entry, event: MessageEvent): void {
    console.log("WS received:", event.data);
    let msg: AgentWSMessage;
    try {
      msg = JSON.parse(typeof event.data === "string" ? event.data : "");
    } catch {
      console.warn("WS recv: failed to parse", event.data);
      return;
    }
    // Server sends { type, data } — also support legacy { content/text/message }
    const data = (msg as { data?: unknown }).data;
    let text = "";
    if (typeof data === "string") {
      text = data;
    } else if (typeof msg.content === "string") {
      text = msg.content;
    } else if (typeof msg.text === "string") {
      text = msg.text;
    } else if (typeof msg.message === "string") {
      text = msg.message;
    } else if (data && typeof data === "object" && "content" in data && typeof (data as { content: unknown }).content === "string") {
      text = (data as { content: string }).content;
    }
    if ((msg.type as string) === "heartbeat") return;
    if ((msg.type as string) === "clear_thinking") {
      entry.handlers.forEach((h) => h.onClearThinking?.());
      return;
    }
    console.log("WS msg type:", msg.type, "text:", text);
    switch (msg.type) {
      case "token":
        entry.handlers.forEach((h) => h.onToken?.(text));
        break;
      case "done":
        entry.handlers.forEach((h) => h.onDone?.());
        break;
      case "status":
        if (text) entry.log?.({ ts: nowTs(), level: "ARROW", msg: text });
        entry.handlers.forEach((h) => h.onStatus?.(text));
        break;
      case "error":
        entry.handlers.forEach((h) => h.onError?.(text || "agent error"));
        break;
      case "pong":
        entry.log?.({ ts: nowTs(), level: "OK", msg: "Agent alive" });
        entry.keepaliveAwaitingPong = false;
        if (entry.keepaliveWarnTimer) { clearTimeout(entry.keepaliveWarnTimer); entry.keepaliveWarnTimer = null; }
        entry.handlers.forEach((h) => h.onPong?.());
        break;
      case "voice_transcription": {
        let vText = "";
        if (data && typeof data === "object") {
          const d = data as Record<string, unknown>;
          if (typeof d.text === "string") vText = d.text;
        } else if (typeof data === "string") {
          vText = data;
        }
        if (!vText && text) vText = text;
        entry.log?.({ ts: nowTs(), level: "OK", msg: `voice_transcription chars=${vText.length}` });
        entry.handlers.forEach((h) => h.onVoiceTranscription?.({ text: vText }));
        break;
      }
      case "voice_error": {
        let vMsg = "";
        if (data && typeof data === "object") {
          const d = data as Record<string, unknown>;
          if (typeof d.message === "string") vMsg = d.message;
          else if (typeof d.error === "string") vMsg = d.error;
        } else if (typeof data === "string") {
          vMsg = data;
        }
        if (!vMsg) vMsg = (msg.message as string) || (msg.text as string) || "Voice error";
        entry.log?.({ ts: nowTs(), level: "ERR", msg: `voice_error: ${vMsg}` });
        entry.handlers.forEach((h) => h.onVoiceError?.({ message: vMsg }));
        break;
      }
      case "dev_server_result": {
        let success = false;
        let url: string | undefined;
        let project: string | undefined;
        let dmsg: string | undefined;
        if (data && typeof data === "object") {
          const d = data as Record<string, unknown>;
          if (typeof d.success === "boolean") success = d.success;
          if (typeof d.ok === "boolean") success = success || d.ok;
          if (typeof d.url === "string") url = d.url;
          if (typeof d.project === "string") project = d.project;
          if (typeof d.message === "string") dmsg = d.message;
        }
        entry.log?.({ ts: nowTs(), level: "OK", msg: `dev_server_result success=${success} url=${url ?? ""}` });
        entry.handlers.forEach((h) => h.onDevServerResult?.({ success, url, project, message: dmsg }));
        break;
      }
      case "build_applied": {
        let project: string | undefined;
        let bmsg: string | undefined;
        if (data && typeof data === "object") {
          const d = data as Record<string, unknown>;
          if (typeof d.project === "string") project = d.project;
          if (typeof d.message === "string") bmsg = d.message;
        }
        entry.log?.({ ts: nowTs(), level: "OK", msg: `build_applied${project ? ` project=${project}` : ""}` });
        entry.handlers.forEach((h) => h.onBuildApplied?.({ project, message: bmsg }));
        break;
      }
      case "build_log": {
        let level: string | undefined;
        let bmsg = "";
        if (data && typeof data === "object") {
          const d = data as Record<string, unknown>;
          if (typeof d.level === "string") level = d.level;
          if (typeof d.message === "string") bmsg = d.message;
        } else if (typeof data === "string") {
          bmsg = data;
        }
        if (!bmsg && text) bmsg = text;
        entry.handlers.forEach((h) => h.onBuildLog?.({ level, message: bmsg }));
        break;
      }
      case "build_complete": {
        let ok = false;
        let project: string | undefined;
        let filesChanged: number | undefined;
        let bmsg: string | undefined;
        if (data && typeof data === "object") {
          const d = data as Record<string, unknown>;
          if (typeof d.ok === "boolean") ok = d.ok;
          if (typeof d.success === "boolean") ok = ok || d.success;
          if (typeof d.project === "string") project = d.project;
          if (typeof d.files_changed === "number") filesChanged = d.files_changed;
          if (typeof d.filesChanged === "number") filesChanged = d.filesChanged;
          if (typeof d.message === "string") bmsg = d.message;
        }
        entry.log?.({ ts: nowTs(), level: ok ? "OK" : "ERR", msg: `build_complete ok=${ok}` });
        entry.handlers.forEach((h) => h.onBuildComplete?.({ ok, project, filesChanged, message: bmsg }));
        break;
      }
      case "build_error": {
        let bmsg = "";
        if (data && typeof data === "object") {
          const d = data as Record<string, unknown>;
          if (typeof d.message === "string") bmsg = d.message;
          else if (typeof d.error === "string") bmsg = d.error;
        } else if (typeof data === "string") {
          bmsg = data;
        }
        if (!bmsg) bmsg = text || "build error";
        entry.log?.({ ts: nowTs(), level: "ERR", msg: `build_error: ${bmsg}` });
        entry.handlers.forEach((h) => h.onBuildError?.({ message: bmsg }));
        break;
      }
      case "build_phase": {
        let phase = "";
        let pmsg: string | undefined;
        if (data && typeof data === "object") {
          const d = data as Record<string, unknown>;
          if (typeof d.phase === "string") phase = d.phase;
          if (typeof d.message === "string") pmsg = d.message;
        }
        if (!phase) {
          const mp = (msg as unknown as { phase?: unknown }).phase;
          if (typeof mp === "string") phase = mp;
        }
        entry.handlers.forEach((h) => h.onBuildPhase?.({ phase, message: pmsg }));
        break;
      }
      case "build_brief": {
        let brief = "";
        if (data && typeof data === "object") {
          const d = data as Record<string, unknown>;
          if (typeof d.brief === "string") brief = d.brief;
          else if (typeof d.text === "string") brief = d.text;
          else if (typeof d.message === "string") brief = d.message;
        } else if (typeof data === "string") {
          brief = data;
        }
        if (!brief && text) brief = text;
        entry.handlers.forEach((h) => h.onBuildBrief?.({ brief }));
        break;
      }
      case "build_vision": {
        let vtext = "";
        let vok: boolean | undefined;
        if (data && typeof data === "object") {
          const d = data as Record<string, unknown>;
          if (typeof d.text === "string") vtext = d.text;
          else if (typeof d.message === "string") vtext = d.message;
          if (typeof d.ok === "boolean") vok = d.ok;
        } else if (typeof data === "string") {
          vtext = data;
        }
        if (!vtext && text) vtext = text;
        entry.handlers.forEach((h) => h.onBuildVision?.({ text: vtext, ok: vok }));
        break;
      }
      case "projects_list": {
        let projects: Array<{ name: string; path?: string; updatedAt?: number }> = [];
        const raw = data ?? (msg as { projects?: unknown }).projects;
        if (Array.isArray(raw)) {
          projects = raw
            .map((p: unknown) => {
              if (typeof p === "string") return { name: p };
              if (p && typeof p === "object") {
                const o = p as Record<string, unknown>;
                const name = typeof o.name === "string" ? o.name
                  : typeof o.id === "string" ? o.id : null;
                if (!name) return null;
                return {
                  name,
                  path: typeof o.path === "string" ? o.path : undefined,
                  updatedAt: typeof o.updated_at === "number" ? o.updated_at
                    : typeof o.updatedAt === "number" ? o.updatedAt : undefined,
                };
              }
              return null;
            })
            .filter((x): x is { name: string; path?: string; updatedAt?: number } => x !== null);
        } else if (data && typeof data === "object") {
          const d = data as Record<string, unknown>;
          if (Array.isArray(d.projects)) {
            projects = (d.projects as unknown[]).map((p) => {
              if (typeof p === "string") return { name: p };
              const o = p as Record<string, unknown>;
              return { name: String(o.name ?? o.id ?? "") };
            }).filter((x) => x.name);
          }
        }
        entry.log?.({ ts: nowTs(), level: "OK", msg: `projects_list count=${projects.length}` });
        entry.handlers.forEach((h) => h.onProjectsList?.({ projects }));
        break;
      }
      case "scaffold_result": {
        let ok = false;
        let name: string | undefined;
        let smsg: string | undefined;
        if (data && typeof data === "object") {
          const d = data as Record<string, unknown>;
          if (typeof d.ok === "boolean") ok = d.ok;
          if (typeof d.success === "boolean") ok = ok || d.success;
          if (typeof d.name === "string") name = d.name;
          else if (typeof d.project === "string") name = d.project;
          if (typeof d.message === "string") smsg = d.message;
        }
        entry.log?.({ ts: nowTs(), level: ok ? "OK" : "ERR", msg: `scaffold_result ok=${ok}` });
        entry.handlers.forEach((h) => h.onScaffoldResult?.({ ok, name, message: smsg }));
        break;
      }
      case "browser_result": {
        let bText = "";
        let bUrl: string | undefined;
        let bVision: string | undefined;
        if (data && typeof data === "object") {
          const d = data as Record<string, unknown>;
          if (typeof d.text === "string") bText = d.text;
          else if (typeof d.content === "string") bText = d.content;
          if (typeof d.url === "string") bUrl = d.url;
          if (typeof d.vision_description === "string") bVision = d.vision_description;
          else if (typeof d.visionDescription === "string") bVision = d.visionDescription;
        } else if (typeof data === "string") {
          bText = data;
        }
        entry.log?.({ ts: nowTs(), level: "OK", msg: `browser_result chars=${bText.length}` });
        entry.handlers.forEach((h) => h.onBrowserResult?.({ text: bText, url: bUrl, visionDescription: bVision, raw: data }));
        break;
      }
      case "screenshot": {
        let sUrl: string | undefined;
        let sB64 = "";
        if (data && typeof data === "object") {
          const d = data as Record<string, unknown>;
          if (typeof d.url === "string") sUrl = d.url;
          if (typeof d.screenshot_b64 === "string") sB64 = d.screenshot_b64;
          else if (typeof d.screenshotB64 === "string") sB64 = d.screenshotB64;
        }
        entry.log?.({ ts: nowTs(), level: "OK", msg: `screenshot received bytes=${sB64.length}` });
        entry.handlers.forEach((h) => h.onScreenshot?.({ url: sUrl, screenshotB64: sB64 }));
        break;
      }
      case "shell_output": {
        const chunk = typeof data === "string"
          ? data
          : (data && typeof data === "object" && typeof (data as { text?: unknown }).text === "string"
              ? (data as { text: string }).text
              : text);
        entry.handlers.forEach((h) => h.onShellOutput?.(chunk));
        break;
      }
      case "shell_done": {
        let exitCode = 0;
        let output = "";
        if (data && typeof data === "object") {
          const d = data as Record<string, unknown>;
          if (typeof d.exit_code === "number") exitCode = d.exit_code;
          else if (typeof d.exitCode === "number") exitCode = d.exitCode;
          if (typeof d.output === "string") output = d.output;
          else if (typeof d.text === "string") output = d.text;
        }
        const ok = exitCode === 0;
        entry.log?.({ ts: nowTs(), level: ok ? "OK" : "ERR", msg: `shell_done exit=${exitCode}` });
        entry.handlers.forEach((h) => h.onShellDone?.({ exitCode, ok, output }));
        break;
      }
      case "repair_started": {
        let err = "";
        if (data && typeof data === "object") {
          const d = data as Record<string, unknown>;
          if (typeof d.error === "string") err = d.error;
          else if (typeof d.message === "string") err = d.message;
        } else if (typeof data === "string") {
          err = data;
        }
        if (!err && text) err = text;
        entry.log?.({ ts: nowTs(), level: "ARROW", msg: `self-repair started: ${err}` });
        entry.handlers.forEach((h) => h.onRepairStarted?.({ error: err || "unknown error" }));
        break;
      }
      case "repair_log": {
        const line = typeof data === "string"
          ? data
          : (data && typeof data === "object" && typeof (data as { line?: unknown }).line === "string"
              ? (data as { line: string }).line
              : text);
        if (line) entry.log?.({ ts: nowTs(), level: "ARROW", msg: `repair: ${line}` });
        entry.handlers.forEach((h) => h.onRepairLog?.(line));
        break;
      }
      case "repair_complete": {
        let ok = false;
        let message: string | undefined;
        let errorLog: string | undefined;
        if (data && typeof data === "object") {
          const d = data as Record<string, unknown>;
          if (typeof d.ok === "boolean") ok = d.ok;
          else if (typeof d.success === "boolean") ok = d.success;
          if (typeof d.message === "string") message = d.message;
          if (typeof d.error_log === "string") errorLog = d.error_log;
          else if (typeof d.errorLog === "string") errorLog = d.errorLog;
        }
        entry.log?.({ ts: nowTs(), level: ok ? "OK" : "ERR", msg: `repair_complete ok=${ok}` });
        entry.handlers.forEach((h) => h.onRepairComplete?.({ ok, message, errorLog }));
        break;
      }
      case "gmail_summary": {
        const cats: GmailCategoryCount[] = [];
        if (data && typeof data === "object") {
          const arr = (data as { categories?: unknown }).categories;
          if (Array.isArray(arr)) {
            for (const c of arr) {
              if (c && typeof c === "object" && typeof (c as { id?: unknown }).id === "string" && typeof (c as { count?: unknown }).count === "number") {
                cats.push({ id: (c as { id: GmailCategoryId }).id, count: (c as { count: number }).count });
              }
            }
          }
        }
        entry.log?.({ ts: nowTs(), level: "OK", msg: `gmail_summary categories=${cats.length}` });
        entry.handlers.forEach((h) => h.onGmailSummary?.({ categories: cats }));
        break;
      }
      case "gmail_preview": {
        let category: GmailCategoryId = "inbox_total";
        const items: GmailEmailPreview[] = [];
        if (data && typeof data === "object") {
          const d = data as Record<string, unknown>;
          if (typeof d.category === "string") category = d.category as GmailCategoryId;
          if (Array.isArray(d.items)) {
            for (const it of d.items) {
              if (it && typeof it === "object") {
                const r = it as Record<string, unknown>;
                items.push({
                  id: String(r.id ?? ""),
                  from: String(r.from ?? ""),
                  subject: String(r.subject ?? ""),
                  snippet: typeof r.snippet === "string" ? r.snippet : undefined,
                  date: typeof r.date === "string" ? r.date : undefined,
                });
              }
            }
          }
        }
        entry.handlers.forEach((h) => h.onGmailPreview?.({ category, items }));
        break;
      }
      case "gmail_top_senders": {
        const senders: GmailTopSender[] = [];
        if (data && typeof data === "object") {
          const arr = (data as { senders?: unknown }).senders;
          if (Array.isArray(arr)) {
            for (const s of arr) {
              if (s && typeof s === "object") {
                const r = s as Record<string, unknown>;
                if (typeof r.email === "string" && typeof r.count === "number") {
                  senders.push({
                    email: r.email,
                    name: typeof r.name === "string" ? r.name : undefined,
                    count: r.count,
                  });
                }
              }
            }
          }
        }
        entry.handlers.forEach((h) => h.onGmailTopSenders?.({ senders }));
        break;
      }
      case "gmail_progress": {
        if (!data || typeof data !== "object") break;
        const d = data as Record<string, unknown>;
        const op = (d.op === "delete" ? "delete" : "archive") as "archive" | "delete";
        const processed = typeof d.processed === "number" ? d.processed : 0;
        const total = typeof d.total === "number" ? d.total : 0;
        const label = typeof d.label === "string" ? d.label : undefined;
        entry.handlers.forEach((h) => h.onGmailProgress?.({ op, processed, total, label }));
        break;
      }
      case "gmail_done": {
        if (!data || typeof data !== "object") break;
        const d = data as Record<string, unknown>;
        const op = (d.op === "delete" ? "delete" : "archive") as "archive" | "delete";
        const processed = typeof d.processed === "number" ? d.processed : 0;
        const ok = typeof d.ok === "boolean" ? d.ok : true;
        const message = typeof d.message === "string" ? d.message : undefined;
        entry.log?.({ ts: nowTs(), level: ok ? "OK" : "ERR", msg: `gmail_done op=${op} processed=${processed}` });
        entry.handlers.forEach((h) => h.onGmailDone?.({ op, processed, ok, message }));
        break;
      }
      case "login_log": {
        const line = typeof data === "string"
          ? data
          : (data && typeof data === "object" && typeof (data as { line?: unknown }).line === "string"
              ? (data as { line: string }).line
              : text);
        if (line) entry.log?.({ ts: nowTs(), level: "ARROW", msg: `login: ${line}` });
        entry.handlers.forEach((h) => h.onLoginLog?.(line));
        break;
      }
      case "login_result": {
        let ok = false;
        let url: string | undefined;
        let attempts: number | undefined;
        let error: string | undefined;
        if (data && typeof data === "object") {
          const d = data as Record<string, unknown>;
          if (typeof d.ok === "boolean") ok = d.ok;
          else if (typeof d.success === "boolean") ok = d.success;
          if (typeof d.url === "string") url = d.url;
          if (typeof d.attempts === "number") attempts = d.attempts;
          if (typeof d.error === "string") error = d.error;
          else if (typeof d.message === "string") error = d.message;
        }
        entry.log?.({ ts: nowTs(), level: ok ? "OK" : "ERR", msg: `login_result ok=${ok}${attempts !== undefined ? ` attempts=${attempts}` : ""}` });
        entry.handlers.forEach((h) => h.onLoginResult?.({ ok, url, attempts, error }));
        break;
      }
      case "memory_stats": {
        let conversations = 0, actions = 0, knowledge = 0;
        if (data && typeof data === "object") {
          const d = data as Record<string, unknown>;
          if (typeof d.conversations === "number") conversations = d.conversations;
          if (typeof d.actions === "number") actions = d.actions;
          if (typeof d.knowledge === "number") knowledge = d.knowledge;
        }
        const total = conversations + actions + knowledge;
        entry.handlers.forEach((h) => h.onMemoryStats?.({ conversations, actions, knowledge, total }));
        break;
      }
      case "memory_search_result": {
        let query = "";
        const results: MemorySearchResult[] = [];
        if (data && typeof data === "object") {
          const d = data as Record<string, unknown>;
          if (typeof d.query === "string") query = d.query;
          const arr = d.results;
          if (Array.isArray(arr)) {
            for (const r of arr) {
              if (r && typeof r === "object") {
                const rec = r as Record<string, unknown>;
                results.push({
                  score: typeof rec.score === "number" ? rec.score : undefined,
                  timestamp: typeof rec.timestamp === "string" ? rec.timestamp : undefined,
                  content: typeof rec.content === "string" ? rec.content : String(rec.content ?? ""),
                  source: typeof rec.source === "string" ? rec.source : undefined,
                });
              }
            }
          }
        }
        entry.handlers.forEach((h) => h.onMemorySearchResult?.({ query, results }));
        break;
      }
      case "memory_consulted": {
        let count = 0;
        if (data && typeof data === "object") {
          const d = data as Record<string, unknown>;
          if (typeof d.count === "number") count = d.count;
          else if (typeof d.n === "number") count = d.n;
        } else if (typeof data === "number") {
          count = data;
        }
        entry.handlers.forEach((h) => h.onMemoryConsulted?.({ count }));
        break;
      }
      case "memory_stored": {
        let ok = true;
        let message: string | undefined;
        if (data && typeof data === "object") {
          const d = data as Record<string, unknown>;
          if (typeof d.ok === "boolean") ok = d.ok;
          if (typeof d.message === "string") message = d.message;
        }
        entry.handlers.forEach((h) => h.onMemoryStored?.({ ok, message }));
        break;
      }
      case "plan_started": {
        let goal = "";
        if (data && typeof data === "object") {
          const d = data as Record<string, unknown>;
          if (typeof d.goal === "string") goal = d.goal;
        }
        entry.log?.({ ts: nowTs(), level: "ARROW", msg: `plan_started: ${goal}` });
        entry.handlers.forEach((h) => h.onPlanStarted?.({ goal }));
        break;
      }
      case "plan_ready": {
        let goal = "";
        let count = 0;
        const tasks: PlanStep[] = [];
        if (data && typeof data === "object") {
          const d = data as Record<string, unknown>;
          if (typeof d.goal === "string") goal = d.goal;
          if (typeof d.count === "number") count = d.count;
          if (Array.isArray(d.tasks)) {
            for (const t of d.tasks) {
              if (t && typeof t === "object") {
                const r = t as Record<string, unknown>;
                tasks.push({
                  id: typeof r.id === "number" ? r.id : 0,
                  action: typeof r.action === "string" ? r.action : "",
                  description: typeof r.description === "string" ? r.description : "",
                  params: (r.params && typeof r.params === "object") ? r.params as Record<string, unknown> : {},
                  depends_on: Array.isArray(r.depends_on) ? (r.depends_on as unknown[]).filter((x): x is number => typeof x === "number") : [],
                });
              }
            }
          }
        }
        entry.log?.({ ts: nowTs(), level: "OK", msg: `plan_ready: ${tasks.length} steps` });
        entry.handlers.forEach((h) => h.onPlanReady?.({ goal, tasks, count: count || tasks.length }));
        break;
      }
      case "plan_progress": {
        if (!data || typeof data !== "object") break;
        const d = data as Record<string, unknown>;
        const status = (d.status === "done" || d.status === "failed" ? d.status : "running") as PlanStepStatus;
        const info: PlanProgress = {
          step_id: typeof d.step_id === "number" ? d.step_id : 0,
          status,
          action: typeof d.action === "string" ? d.action : "",
          desc: typeof d.desc === "string" ? d.desc : "",
          result: (d.result && typeof d.result === "object") ? d.result as Record<string, unknown> : null,
          current: typeof d.current === "number" ? d.current : 0,
          total: typeof d.total === "number" ? d.total : 0,
        };
        entry.handlers.forEach((h) => h.onPlanProgress?.(info));
        break;
      }
      case "plan_log": {
        let message = "";
        let level: PlanLogLevel = "info";
        if (data && typeof data === "object") {
          const d = data as Record<string, unknown>;
          if (typeof d.message === "string") message = d.message;
          if (d.level === "ok" || d.level === "error" || d.level === "warn" || d.level === "info") level = d.level;
        } else if (typeof data === "string") {
          message = data;
        }
        if (!message && text) message = text;
        entry.handlers.forEach((h) => h.onPlanLog?.({ message, level }));
        break;
      }
      case "plan_complete": {
        let completed = 0, failed = 0, total = 0;
        let results: Record<string, unknown> = {};
        if (data && typeof data === "object") {
          const d = data as Record<string, unknown>;
          if (typeof d.completed === "number") completed = d.completed;
          if (typeof d.failed === "number") failed = d.failed;
          if (typeof d.total === "number") total = d.total;
          if (d.results && typeof d.results === "object") results = d.results as Record<string, unknown>;
        }
        entry.log?.({ ts: nowTs(), level: failed === 0 ? "OK" : "ERR", msg: `plan_complete ${completed}/${total} (${failed} failed)` });
        entry.handlers.forEach((h) => h.onPlanComplete?.({ completed, failed, total, results }));
        break;
      }
      case "plan_error": {
        let message = "plan error";
        if (data && typeof data === "object") {
          const d = data as Record<string, unknown>;
          if (typeof d.message === "string") message = d.message;
        } else if (typeof data === "string") {
          message = data;
        } else if (text) {
          message = text;
        }
        entry.log?.({ ts: nowTs(), level: "ERR", msg: `plan_error: ${message}` });
        entry.handlers.forEach((h) => h.onPlanError?.({ message }));
        break;
      }
    }
}

export function closeAgentWS(tabId: string): void {
  const entry = tabs.get(tabId);
  if (!entry) return;
  entry.intentionalClose = true;
  clearTimers(entry);
  try { entry.ws?.close(); } catch { /* noop */ }
  tabs.delete(tabId);
}

export function subscribeAgentWS(tabId: string, handlers: AgentWSHandlers): () => void {
  const entry = tabs.get(tabId);
  if (!entry) return () => {};
  entry.handlers.add(handlers);
  return () => { entry.handlers.delete(handlers); };
}

export function getWSStatus(tabId: string): WSStatus {
  return tabs.get(tabId)?.status ?? "idle";
}

export function isWSOpen(tabId: string): boolean {
  const ws = tabs.get(tabId)?.ws;
  return !!ws && ws.readyState === WebSocket.OPEN;
}

export interface SendChatExtras {
  forceClaude?: boolean;
  identity?: "toby" | "jay";
}

export function sendChat(
  tabId: string,
  content: string,
  model: string | null,
  extras: SendChatExtras = {},
): boolean {
  const entry = tabs.get(tabId);
  const ws = entry?.ws;
  if (!ws) {
    entry?.log?.({ ts: nowTs(), level: "ERR", msg: "WebSocket not ready" });
    console.error("WS send aborted: no socket for tab", tabId);
    return false;
  }
  if (ws.readyState !== WebSocket.OPEN) {
    entry?.log?.({ ts: nowTs(), level: "ERR", msg: `WebSocket not ready (readyState=${ws.readyState})` });
    console.error("WS send aborted: readyState=", ws.readyState);
    return false;
  }
  const base: { action: string; content: string; model?: string } =
    !model || model === "__auto__"
      ? { action: "chat", content }
      : { action: "chat", content, model };
  const payload: Record<string, unknown> = { ...base };
  if (extras.forceClaude) payload.force_claude = true;
  if (extras.identity) payload.identity = extras.identity;
  const json = JSON.stringify(payload);
  entry?.log?.({ ts: nowTs(), level: "ARROW", msg: "WS send: " + json });
  console.log("WS readyState:", ws.readyState, "sending:", payload);
  ws.send(json);
  return true;
}

export function sendPing(tabId: string): boolean {
  const ws = tabs.get(tabId)?.ws;
  if (!ws || ws.readyState !== WebSocket.OPEN) return false;
  ws.send(JSON.stringify({ action: "ping" }));
  return true;
}

export function sendStop(tabId: string): boolean {
  const ws = tabs.get(tabId)?.ws;
  if (!ws || ws.readyState !== WebSocket.OPEN) return false;
  ws.send(JSON.stringify({ action: "stop" }));
  return true;
}

export function sendVoiceInput(tabId: string, seconds: number = 5): boolean {
  const ws = tabs.get(tabId)?.ws;
  if (!ws || ws.readyState !== WebSocket.OPEN) return false;
  ws.send(JSON.stringify({ action: "voice_input", seconds }));
  return true;
}

export function sendVoiceTranscribe(tabId: string, audioB64: string, format: string = "webm"): boolean {
  const ws = tabs.get(tabId)?.ws;
  if (!ws || ws.readyState !== WebSocket.OPEN) return false;
  ws.send(JSON.stringify({ action: "voice_transcribe", audio_b64: audioB64, format }));
  return true;
}

export function sendBrowser(tabId: string, url: string): boolean {
  const entry = tabs.get(tabId);
  const ws = entry?.ws;
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    entry?.log?.({ ts: nowTs(), level: "ERR", msg: "browser: WebSocket not open" });
    return false;
  }
  const payload = { action: "browser", url };
  const json = JSON.stringify(payload);
  entry?.log?.({ ts: nowTs(), level: "ARROW", msg: "WS send: " + json });
  console.log("WS readyState:", ws.readyState, "sending:", payload);
  ws.send(json);
  return true;
}

const BROWSER_TRIGGER_RE = /(screenshot|scrape|navigate|browse|visit)/i;
const URL_RE = /\bhttps?:\/\/[^\s]+/i;
const DOMAIN_RE = /\b([a-z0-9-]+\.(?:com|io|app|dev|net|org|ai|co|xyz|tech))(\/[^\s]*)?/i;

export function extractBrowserUrl(text: string): string | null {
  const urlMatch = text.match(URL_RE);
  if (urlMatch) return urlMatch[0].replace(/[.,)]+$/, "");
  const hasTrigger = BROWSER_TRIGGER_RE.test(text);
  const domainMatch = text.match(DOMAIN_RE);
  if (domainMatch) {
    const path = domainMatch[2] ?? "";
    return `https://${domainMatch[1]}${path}`.replace(/[.,)]+$/, "");
  }
  if (hasTrigger) return null;
  return null;
}

// ────────────────────────────────────────────
// Shell action + install detection / safety
// ────────────────────────────────────────────

const INSTALL_PATTERNS: RegExp[] = [
  /\bpip(?:3)?\s+install\s+[^\n`]+/i,
  /\bollama\s+pull\s+[^\n`]+/i,
  /\bbrew\s+install\s+[^\n`]+/i,
  /\bplaywright\s+install(?:\s+[^\n`]+)?/i,
  /\bnpm\s+install\s+[^\n`]+/i,
  /\bapt(?:-get)?\s+install\s+[^\n`]+/i,
];

const UNSAFE_PATTERNS: RegExp[] = [
  /\brm\s+-rf\b/i,
  /\bsudo\s+rm\b/i,
  /\bmkfs\b/i,
  /\bdd\s+if=/i,
  /\bchmod\s+777\s+\//i,
  /curl[^\n|]*\|\s*bash/i,
  /wget[^\n|]*\|\s*bash/i,
];

export function detectInstallCommand(text: string): string | null {
  if (!text) return null;
  for (const re of INSTALL_PATTERNS) {
    const m = text.match(re);
    if (m) {
      // Strip trailing punctuation/markdown noise.
      return m[0]
        .replace(/[`*]+/g, "")
        .replace(/[.,;)\]}>]+$/, "")
        .trim();
    }
  }
  return null;
}

export function isUnsafeCommand(cmd: string): boolean {
  return UNSAFE_PATTERNS.some((re) => re.test(cmd));
}

export function sendShell(tabId: string, command: string): boolean {
  const entry = tabs.get(tabId);
  const ws = entry?.ws;
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    entry?.log?.({ ts: nowTs(), level: "ERR", msg: "shell: WebSocket not open" });
    return false;
  }
  const payload = { action: "shell", command };
  const json = JSON.stringify(payload);
  entry?.log?.({ ts: nowTs(), level: "ARROW", msg: "WS send: " + json });
  console.log("WS readyState:", ws.readyState, "sending:", payload);
  ws.send(json);
  return true;
}

export function sendSelfRepair(tabId: string, error: string): boolean {
  const entry = tabs.get(tabId);
  const ws = entry?.ws;
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    entry?.log?.({ ts: nowTs(), level: "ERR", msg: "self_repair: WebSocket not open" });
    return false;
  }
  const payload = { action: "self_repair", error };
  const json = JSON.stringify(payload);
  entry?.log?.({ ts: nowTs(), level: "ARROW", msg: "WS send: " + json });
  ws.send(json);
  return true;
}

export function sendDevServerStop(tabId: string, project?: string | null): boolean {
  const entry = tabs.get(tabId);
  const ws = entry?.ws;
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    entry?.log?.({ ts: nowTs(), level: "ERR", msg: "dev_server_stop: WebSocket not open" });
    return false;
  }
  const payload: Record<string, unknown> = { action: "dev_server_stop" };
  if (project) payload.project = project;
  const json = JSON.stringify(payload);
  entry?.log?.({ ts: nowTs(), level: "ARROW", msg: "WS send: " + json });
  ws.send(json);
  return true;
}

export function sendDevServerStart(tabId: string, project: string): boolean {
  const entry = tabs.get(tabId);
  const ws = entry?.ws;
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    entry?.log?.({ ts: nowTs(), level: "ERR", msg: "dev_server_start: WebSocket not open" });
    return false;
  }
  const payload = { action: "dev_server_start", project, port: 5173 };
  const json = JSON.stringify(payload);
  entry?.log?.({ ts: nowTs(), level: "ARROW", msg: "WS send: " + json });
  console.log("[BUILDER SEND]", "dev_server_start", payload);
  ws.send(json);
  return true;
}

export function sendListProjects(tabId: string): boolean {
  const entry = tabs.get(tabId);
  const ws = entry?.ws;
  if (!ws || ws.readyState !== WebSocket.OPEN) return false;
  const payload = { action: "list_projects" };
  const json = JSON.stringify(payload);
  entry?.log?.({ ts: nowTs(), level: "ARROW", msg: "WS send: " + json });
  console.log("[BUILDER SEND]", "list_projects", payload);
  ws.send(json);
  return true;
}

export function sendBuildStart(tabId: string, prompt: string, project: string | null, useClaude: boolean = false): boolean {
  const entry = tabs.get(tabId);
  const ws = entry?.ws;
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    entry?.log?.({ ts: nowTs(), level: "ERR", msg: "build: WebSocket not open" });
    return false;
  }
  const payload: Record<string, unknown> = {
    action: "build",
    prompt,
    project: project ?? "",
    use_architect: true,
    use_claude: useClaude,
  };
  const json = JSON.stringify(payload);
  entry?.log?.({ ts: nowTs(), level: "ARROW", msg: "WS send: " + json });
  console.log("[BUILDER SEND]", "build", payload);
  ws.send(json);
  return true;
}

export function sendScaffold(tabId: string, name: string): boolean {
  const entry = tabs.get(tabId);
  const ws = entry?.ws;
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    entry?.log?.({ ts: nowTs(), level: "ERR", msg: "scaffold: WebSocket not open" });
    return false;
  }
  const payload = { action: "scaffold", name };
  const json = JSON.stringify(payload);
  entry?.log?.({ ts: nowTs(), level: "ARROW", msg: "WS send: " + json });
  console.log("[BUILDER SEND]", "scaffold", payload);
  ws.send(json);
  return true;
}

export type GmailAction =
  | { gmail_action: "summary" }
  | { gmail_action: "preview"; category: GmailCategoryId; limit?: number }
  | { gmail_action: "top_senders"; limit?: number }
  | { gmail_action: "archive" | "delete"; category?: GmailCategoryId; sender?: string; dry_run?: boolean };

export function sendGmail(tabId: string, args: GmailAction): boolean {
  const entry = tabs.get(tabId);
  const ws = entry?.ws;
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    entry?.log?.({ ts: nowTs(), level: "ERR", msg: "gmail: WebSocket not open" });
    return false;
  }
  const payload = { action: "gmail", ...args };
  const json = JSON.stringify(payload);
  entry?.log?.({ ts: nowTs(), level: "ARROW", msg: "WS send: " + json });
  ws.send(json);
  return true;
}

// ────────────────────────────────────────────
// Login action — sends credentials to agent.
// CRITICAL: password is sent over the WS but never logged.
// The log line below redacts the password before persisting.
// ────────────────────────────────────────────

export interface LoginArgs {
  url: string;
  username: string;
  password: string;
  max_attempts?: number;
}

export function sendLogin(tabId: string, args: LoginArgs): boolean {
  const entry = tabs.get(tabId);
  const ws = entry?.ws;
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    entry?.log?.({ ts: nowTs(), level: "ERR", msg: "login: WebSocket not open" });
    return false;
  }
  const payload = {
    action: "login",
    url: args.url,
    username: args.username,
    password: args.password,
    max_attempts: args.max_attempts ?? 5,
  };
  // Redacted log — never include the password value.
  entry?.log?.({
    ts: nowTs(),
    level: "ARROW",
    msg: `WS send: {"action":"login","url":"${args.url}","username":"${args.username}","password":"***","max_attempts":${payload.max_attempts}}`,
  });
  ws.send(JSON.stringify(payload));
  return true;
}

// Detect login intent + URL in user text.
const LOGIN_INTENT_RE = /\b(log\s*in(?:to)?|login\s*to|sign\s*in(?:to)?|access\s+my|open\s+my\s+account)\b/i;
const LOGIN_URL_RE = /\bhttps?:\/\/[^\s]+/i;
const LOGIN_DOMAIN_RE = /\b([a-z0-9-]+\.(?:com|io|app|dev|net|org|ai|co|xyz|tech))(\/[^\s]*)?/i;

export function detectLoginIntent(text: string): string | null {
  if (!text) return null;
  if (!LOGIN_INTENT_RE.test(text)) return null;
  const u = text.match(LOGIN_URL_RE);
  if (u) return u[0].replace(/[.,)]+$/, "");
  const d = text.match(LOGIN_DOMAIN_RE);
  if (d) return `https://${d[1]}${d[2] ?? ""}`.replace(/[.,)]+$/, "");
  return null;
}

// ────────────────────────────────────────────
// Memory actions
// ────────────────────────────────────────────

export function sendMemoryStats(tabId: string): boolean {
  const ws = tabs.get(tabId)?.ws;
  if (!ws || ws.readyState !== WebSocket.OPEN) return false;
  ws.send(JSON.stringify({ action: "memory_stats" }));
  return true;
}

export function sendMemorySearch(tabId: string, query: string, n = 5): boolean {
  const entry = tabs.get(tabId);
  const ws = entry?.ws;
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    entry?.log?.({ ts: nowTs(), level: "ERR", msg: "memory_search: WS not open" });
    return false;
  }
  ws.send(JSON.stringify({ action: "memory_search", query, n }));
  entry?.log?.({ ts: nowTs(), level: "ARROW", msg: `memory_search: ${query}` });
  return true;
}

export function sendMemoryStore(
  tabId: string,
  args: { topic: string; content: string; source?: string },
): boolean {
  const entry = tabs.get(tabId);
  const ws = entry?.ws;
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    entry?.log?.({ ts: nowTs(), level: "ERR", msg: "memory_store: WS not open" });
    return false;
  }
  ws.send(JSON.stringify({
    action: "memory_store",
    topic: args.topic,
    content: args.content,
    source: args.source ?? "user",
  }));
  entry?.log?.({ ts: nowTs(), level: "OK", msg: `memory_store: ${args.topic}` });
  return true;
}

export function detectMemoryCommand(text: string):
  | { kind: "remember"; query: string }
  | { kind: "learn"; content: string }
  | null {
  const t = text.trim();
  const r = t.match(/^\/remember\s+(.+)$/is);
  if (r) return { kind: "remember", query: r[1].trim() };
  const l = t.match(/^\/learn\s+(.+)$/is);
  if (l) return { kind: "learn", content: l[1].trim() };
  return null;
}

// ────────────────────────────────────────────
// Plan actions
// ────────────────────────────────────────────

function sendPlanAction(tabId: string, action: string, extra: Record<string, unknown> = {}): boolean {
  const entry = tabs.get(tabId);
  const ws = entry?.ws;
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    entry?.log?.({ ts: nowTs(), level: "ERR", msg: `${action}: WS not open` });
    return false;
  }
  const payload = { action, ...extra };
  const json = JSON.stringify(payload);
  entry?.log?.({ ts: nowTs(), level: "ARROW", msg: "WS send: " + json });
  ws.send(json);
  return true;
}

export function sendPlan(tabId: string, goal: string): boolean {
  return sendPlanAction(tabId, "plan", { goal });
}
export function sendPlanStop(tabId: string): boolean {
  return sendPlanAction(tabId, "plan_stop");
}
export function sendPlanPause(tabId: string): boolean {
  return sendPlanAction(tabId, "plan_pause");
}
export function sendPlanResume(tabId: string): boolean {
  return sendPlanAction(tabId, "plan_resume");
}

const PLAN_INTENT_PATTERNS: RegExp[] = [
  /\bstep[\s-]?by[\s-]?step\b/i,
  /\bautomate\b/i,
  /\bdo\s+all\b/i,
  /\bfor\s+each\b/i,
  /\baudit\s+all\b/i,
  /\bgo\s+through\b/i,
  /\bworkflow\b/i,
  /\bsequence\b/i,
  /\bmulti[\s-]?step\b/i,
  /\bplan\b/i,
];

export function detectPlanIntent(text: string): boolean {
  if (!text) return false;
  return PLAN_INTENT_PATTERNS.some((re) => re.test(text));
}

// ────────────────────────────────────────────
// Control socket — a single shared WebSocket per endpoint used for
// out-of-band requests that used to be HTTP fetches (e.g. /api/tags,
// /api/ps, /health probes). Routing these through WS avoids Chrome
// mixed-content blocks against http://localhost from an https page.
// ────────────────────────────────────────────

export interface OllamaTag { name: string; size?: number; modified_at?: string }
export interface PsResultPayload {
  models: { name: string; size: number; size_vram: number; expires_at?: string }[];
}

interface ControlEntry {
  ws: WebSocket | null;
  endpoint: string;
  status: WSStatus;
  pendingTags: { resolve: (m: OllamaTag[]) => void; reject: (e: Error) => void; timer: ReturnType<typeof setTimeout> }[];
  psListeners: Set<(snap: PsResultPayload) => void>;
  openWaiters: ((ok: boolean) => void)[];
}

const controlByEndpoint = new Map<string, ControlEntry>();

function controlWsUrl(endpoint: string): string {
  const trimmed = endpoint.replace(/\/$/, "");
  const pageIsHttps = typeof window !== "undefined" && window.location?.protocol === "https:";
  let proto: "ws" | "wss";
  let host: string;
  if (trimmed.startsWith("https://")) { proto = "wss"; host = trimmed.slice(8); }
  else if (trimmed.startsWith("http://")) { proto = pageIsHttps ? "wss" : "ws"; host = trimmed.slice(7); }
  else { proto = pageIsHttps ? "wss" : "ws"; host = trimmed; }
  return `${proto}://${host}/ws/control-${Math.random().toString(36).slice(2, 8)}`;
}

function ensureControl(endpoint: string): ControlEntry {
  let entry = controlByEndpoint.get(endpoint);
  if (entry && entry.ws && (entry.ws.readyState === WebSocket.OPEN || entry.ws.readyState === WebSocket.CONNECTING)) {
    return entry;
  }
  entry = entry ?? {
    ws: null,
    endpoint,
    status: "idle",
    pendingTags: [],
    psListeners: new Set(),
    openWaiters: [],
  };
  controlByEndpoint.set(endpoint, entry);
  let ws: WebSocket;
  try {
    ws = new WebSocket(controlWsUrl(endpoint));
  } catch {
    entry.status = "error";
    return entry;
  }
  entry.ws = ws;
  entry.status = "connecting";
  ws.onopen = () => {
    entry!.status = "open";
    const waiters = entry!.openWaiters.splice(0);
    waiters.forEach((w) => w(true));
  };
  ws.onerror = () => {
    entry!.status = "error";
  };
  ws.onclose = () => {
    entry!.status = "closed";
    entry!.ws = null;
    const waiters = entry!.openWaiters.splice(0);
    waiters.forEach((w) => w(false));
    const pend = entry!.pendingTags.splice(0);
    pend.forEach((p) => { clearTimeout(p.timer); p.reject(new Error("control socket closed")); });
  };
  ws.onmessage = (event) => {
    let msg: AgentWSMessage;
    try { msg = JSON.parse(typeof event.data === "string" ? event.data : ""); }
    catch { return; }
    const data = (msg as { data?: unknown }).data;
    if (msg.type === "tags_result") {
      let models: OllamaTag[] = [];
      if (data && typeof data === "object") {
        const arr = (data as { models?: unknown }).models;
        if (Array.isArray(arr)) {
          models = arr.filter((m) => m && typeof m === "object" && typeof (m as { name?: unknown }).name === "string") as OllamaTag[];
        }
      }
      const pend = entry!.pendingTags.splice(0);
      pend.forEach((p) => { clearTimeout(p.timer); p.resolve(models); });
    } else if (msg.type === "ps_result") {
      let payload: PsResultPayload = { models: [] };
      if (data && typeof data === "object") {
        const arr = (data as { models?: unknown }).models;
        if (Array.isArray(arr)) {
          payload = {
            models: arr.map((m) => {
              const r = (m ?? {}) as Record<string, unknown>;
              return {
                name: typeof r.name === "string" ? r.name : "",
                size: typeof r.size === "number" ? r.size : 0,
                size_vram: typeof r.size_vram === "number" ? r.size_vram : 0,
                expires_at: typeof r.expires_at === "string" ? r.expires_at : undefined,
              };
            }).filter((m) => m.name),
          };
        }
      }
      entry!.psListeners.forEach((fn) => fn(payload));
    } else if (msg.type === "pong") {
      // Probe responses — consumed via wsProbe directly.
    }
  };
  return entry;
}

function waitOpen(entry: ControlEntry, timeoutMs: number): Promise<boolean> {
  if (entry.ws && entry.ws.readyState === WebSocket.OPEN) return Promise.resolve(true);
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(false), timeoutMs);
    entry.openWaiters.push((ok) => { clearTimeout(timer); resolve(ok); });
  });
}

/** Fetch model list via WebSocket instead of GET /api/tags. */
export async function getTagsViaWS(endpoint: string, timeoutMs = 15000): Promise<OllamaTag[]> {
  const entry = ensureControl(endpoint);
  const ok = await waitOpen(entry, timeoutMs);
  if (!ok || !entry.ws || entry.ws.readyState !== WebSocket.OPEN) {
    throw new Error("control socket not open");
  }
  return new Promise<OllamaTag[]>((resolve, reject) => {
    const timer = setTimeout(() => {
      const idx = entry.pendingTags.findIndex((p) => p.timer === timer);
      if (idx >= 0) entry.pendingTags.splice(idx, 1);
      reject(new Error("get_tags timeout"));
    }, timeoutMs);
    entry.pendingTags.push({ resolve, reject, timer });
    try { entry.ws!.send(JSON.stringify({ action: "get_tags" })); }
    catch (e) { clearTimeout(timer); reject(e instanceof Error ? e : new Error("send failed")); }
  });
}

/** Subscribe to ps_result events; returns unsubscribe. Triggers periodic
 *  get_ps polls until unsubscribed. */
export function subscribePsViaWS(
  endpoint: string,
  fn: (snap: PsResultPayload) => void,
  intervalMs = 8000,
): () => void {
  const entry = ensureControl(endpoint);
  entry.psListeners.add(fn);
  let cancelled = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  const tick = async () => {
    if (cancelled) return;
    const ok = await waitOpen(entry, 4000);
    if (cancelled) return;
    if (ok && entry.ws && entry.ws.readyState === WebSocket.OPEN) {
      try { entry.ws.send(JSON.stringify({ action: "get_ps" })); } catch { /* noop */ }
    } else {
      // Notify unreachable as empty payload; caller decides how to interpret.
      fn({ models: [] });
    }
    timer = setTimeout(tick, intervalMs);
  };
  tick();
  return () => {
    cancelled = true;
    if (timer) clearTimeout(timer);
    entry.psListeners.delete(fn);
  };
}

/** Probe an endpoint by opening a temporary WebSocket and pinging.
 *  Resolves true if a pong arrives within timeoutMs. */
export function probeEndpointViaWS(endpoint: string, timeoutMs = 3000): Promise<boolean> {
  return new Promise((resolve) => {
    let done = false;
    const finish = (ok: boolean) => {
      if (done) return;
      done = true;
      try { ws.close(); } catch { /* noop */ }
      resolve(ok);
    };
    let ws: WebSocket;
    try { ws = new WebSocket(controlWsUrl(endpoint)); }
    catch { resolve(false); return; }
    const timer = setTimeout(() => finish(false), timeoutMs);
    ws.onopen = () => {
      try { ws.send(JSON.stringify({ action: "ping" })); }
      catch { clearTimeout(timer); finish(false); }
    };
    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(typeof event.data === "string" ? event.data : "");
        if (msg && msg.type === "pong") { clearTimeout(timer); finish(true); }
      } catch { /* ignore */ }
    };
    ws.onerror = () => { clearTimeout(timer); finish(false); };
    ws.onclose = () => { clearTimeout(timer); finish(false); };
  });
}
