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
    | "gmail_progress" | "gmail_done";
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
  lastMessageAt: number;
  awaitingPong: boolean;
}

const tabs = new Map<string, Entry>();

const MAX_RECONNECT_ATTEMPTS = 10;
const BASE_RECONNECT_DELAY_MS = 1000;
const MAX_RECONNECT_DELAY_MS = 30000;
const HEARTBEAT_INTERVAL_MS = 30000;
const PONG_TIMEOUT_MS = 5000;

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
    emitReconnect(tabId, entry, "connected");
    entry.handlers.forEach((h) => h.onOpen?.());
  };
  ws.onclose = () => {
    entry.status = "closed";
    if (entry.heartbeatTimer) { clearInterval(entry.heartbeatTimer); entry.heartbeatTimer = null; }
    if (entry.pongTimer) { clearTimeout(entry.pongTimer); entry.pongTimer = null; }
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
        entry.handlers.forEach((h) => h.onPong?.());
        break;
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

export function sendChat(tabId: string, content: string, model: string | null): boolean {
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
  const payload = { action: "chat", content, model };
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
