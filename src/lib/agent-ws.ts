// Worker Bee — per-tab WebSocket manager.
// One socket per tab, opened on tab create, closed on tab close.
// Server expects: ws://<host>/ws/<tabId>
// Inbound message shapes: { type: "token"|"done"|"status"|"error"|"pong", ... }

import { nowTs, type LogLine } from "@/lib/agent-state";

export type WSStatus = "idle" | "connecting" | "open" | "closed" | "error";

export interface AgentWSMessage {
  type: "token" | "done" | "status" | "error" | "pong" | "browser_result" | "shell_output" | "shell_done";
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
  onBrowserResult?: (result: { text: string; url?: string; raw: unknown }) => void;
  onShellOutput?: (chunk: string) => void;
  onShellDone?: (result: { exitCode: number; ok: boolean; output: string }) => void;
}

interface Entry {
  ws: WebSocket | null;
  endpoint: string;
  status: WSStatus;
  handlers: Set<AgentWSHandlers>;
  log: ((line: LogLine) => void) | null;
}

const tabs = new Map<string, Entry>();

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
    try { existing.ws.close(); } catch { /* noop */ }
  }

  const entry: Entry = existing ?? {
    ws: null,
    endpoint,
    status: "idle",
    handlers: new Set(),
    log: log ?? null,
  };
  entry.endpoint = endpoint;
  if (log) entry.log = log;
  entry.status = "connecting";
  tabs.set(tabId, entry);

  let ws: WebSocket;
  try {
    ws = new WebSocket(wsUrl(endpoint, tabId));
  } catch (e) {
    entry.status = "error";
    entry.log?.({ ts: nowTs(), level: "ERR", msg: "WebSocket error — is agent running?" });
    return;
  }
  entry.ws = ws;

  ws.onopen = () => {
    entry.status = "open";
    entry.log?.({ ts: nowTs(), level: "OK", msg: "WebSocket connected to agent :8000" });
    console.log("WS open and ready");
    entry.handlers.forEach((h) => h.onOpen?.());
  };
  ws.onclose = () => {
    entry.status = "closed";
    entry.log?.({ ts: nowTs(), level: "ARROW", msg: "WebSocket disconnected" });
    entry.handlers.forEach((h) => h.onClose?.());
  };
  ws.onerror = (event) => {
    entry.status = "error";
    entry.log?.({ ts: nowTs(), level: "ERR", msg: "WebSocket error — is agent running?" });
    console.error("WS error event:", event);
    entry.handlers.forEach((h) => h.onSocketError?.());
  };
  ws.onmessage = (event) => {
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
        if (data && typeof data === "object") {
          const d = data as Record<string, unknown>;
          if (typeof d.text === "string") bText = d.text;
          else if (typeof d.content === "string") bText = d.content;
          if (typeof d.url === "string") bUrl = d.url;
        } else if (typeof data === "string") {
          bText = data;
        }
        entry.log?.({ ts: nowTs(), level: "OK", msg: `browser_result chars=${bText.length}` });
        entry.handlers.forEach((h) => h.onBrowserResult?.({ text: bText, url: bUrl, raw: data }));
        break;
      }
    }
  };
}

export function closeAgentWS(tabId: string): void {
  const entry = tabs.get(tabId);
  if (!entry) return;
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
