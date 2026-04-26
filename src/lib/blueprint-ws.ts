/**
 * Blueprint WebSocket client.
 *
 * Connects to a SEPARATE blueprint server at wss://blueprint.tobyandertonmd.com.
 * Independent from src/lib/agent-ws.ts — does not touch the main bee endpoint.
 */

export type BlueprintComplexity = "Simple" | "Moderate" | "Complex";

export interface BlueprintPath {
  id: string;
  name: string;
  tagline: string;
  why_recommended: string;
  pros: string[];
  cons: string[];
  tech_approach: string;
  time_estimate: string;
  complexity: BlueprintComplexity;
}

export interface BlueprintPathsPayload {
  recommended: string;
  paths: BlueprintPath[];
  bee_note: string;
}

export type BlueprintInbound =
  | { type: "blueprint_ready" }
  | { type: "blueprint_generating" }
  | { type: "blueprint_paths"; data: BlueprintPathsPayload }
  | { type: "blueprint_error"; message: string };

export type BlueprintStatus = "idle" | "connecting" | "open" | "closed" | "error";

export interface BlueprintHandlers {
  onStatus?: (s: BlueprintStatus) => void;
  onMessage?: (m: BlueprintInbound) => void;
}

const BLUEPRINT_URL = "wss://blueprint.tobyandertonmd.com";

export class BlueprintClient {
  private ws: WebSocket | null = null;
  private handlers: BlueprintHandlers;
  private manuallyClosed = false;
  private reconnectTimer: number | null = null;

  constructor(handlers: BlueprintHandlers = {}) {
    this.handlers = handlers;
  }

  connect() {
    if (typeof window === "undefined") return;
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }
    this.manuallyClosed = false;
    this.handlers.onStatus?.("connecting");
    try {
      const ws = new WebSocket(BLUEPRINT_URL);
      this.ws = ws;
      ws.onopen = () => this.handlers.onStatus?.("open");
      ws.onclose = () => {
        this.handlers.onStatus?.("closed");
        if (!this.manuallyClosed) this.scheduleReconnect();
      };
      ws.onerror = () => this.handlers.onStatus?.("error");
      ws.onmessage = (ev) => {
        try {
          const parsed = JSON.parse(typeof ev.data === "string" ? ev.data : "") as BlueprintInbound;
          this.handlers.onMessage?.(parsed);
        } catch {
          // ignore non-JSON frames
        }
      };
    } catch {
      this.handlers.onStatus?.("error");
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer != null) return;
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      if (!this.manuallyClosed) this.connect();
    }, 2500);
  }

  requestPaths(idea: string, features: string[]) {
    const payload = { action: "blueprint_paths", idea, features };
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
      return true;
    }
    return false;
  }

  close() {
    this.manuallyClosed = true;
    if (this.reconnectTimer != null) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    try {
      this.ws?.close();
    } catch {
      // ignore
    }
    this.ws = null;
  }
}