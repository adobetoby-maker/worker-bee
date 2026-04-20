// Worker Bee — per-tab WebSocket manager.
// One socket per tab, opened on tab create, closed on tab close.
// Server expects: ws://<host>/ws/<tabId>
// Inbound message shapes: { type: "token"|"done"|"status"|"error"|"pong", ... }

import { nowTs, type LogLine } from "@/lib/agent-state";

export type WSStatus = "idle" | "connecting" | "open" | "closed" | "error";

export interface AgentWSMessage {
  type: "token" | "done" | "status" | "error" | "pong";
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
  // Convert http(s):// → ws(s)://
  const trimmed = endpoint.replace(/\/$/, "");
  if (trimmed.startsWith("https://")) return `wss://${trimmed.slice(8)}/ws/${tabId}`;
  if (trimmed.startsWith("http://")) return `ws://${trimmed.slice(7)}/ws/${tabId}`;
  return `ws://${trimmed}/ws/${tabId}`;
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
    entry.handlers.forEach((h) => h.onOpen?.());
  };
  ws.onclose = () => {
    entry.status = "closed";
    entry.log?.({ ts: nowTs(), level: "ARROW", msg: "WebSocket disconnected" });
    entry.handlers.forEach((h) => h.onClose?.());
  };
  ws.onerror = () => {
    entry.status = "error";
    entry.log?.({ ts: nowTs(), level: "ERR", msg: "WebSocket error — is agent running?" });
    entry.handlers.forEach((h) => h.onSocketError?.());
  };
  ws.onmessage = (event) => {
    let msg: AgentWSMessage;
    try {
      msg = JSON.parse(typeof event.data === "string" ? event.data : "");
    } catch {
      return;
    }
    const text = (msg.content ?? msg.text ?? msg.message ?? "") as string;
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
  const ws = tabs.get(tabId)?.ws;
  if (!ws || ws.readyState !== WebSocket.OPEN) return false;
  ws.send(JSON.stringify({ action: "chat", content, model }));
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
