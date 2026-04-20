import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Textarea } from "@/components/ui/textarea";
import { nowTs, type LogLine } from "@/lib/agent-state";
import { BrowserTaskCard, detectBrowserAction } from "./BrowserTaskCard";

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

interface Props {
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
}

export function ChatView({
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

  useEffect(() => {
    onStreamingChange(streaming);
  }, [streaming, onStreamingChange]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

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

  const resolvedSystemPrompt =
    systemPrompt ??
    `You are Worker Bee, a website-building AI agent running via Ollama. Available tools: ${enabledTools.join(", ") || "none"}.`;

  const stop = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStreaming(false);
  };

  const startStream = async (text: string) => {
    if (!connected || !model) {
      appendLog({ ts: nowTs(), level: "ERR", msg: "not connected — open CONFIG" });
      return;
    }
    const next: ChatMessage[] = [...messages, { role: "user", content: text }];
    onMessagesChange(() => [...next, { role: "assistant", content: "" }]);
    setStreaming(true);
    onSendStart?.(text);
    appendLog({ ts: nowTs(), level: "ARROW", msg: `chat send chars=${text.length}` });

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch(`${endpoint.replace(/\/$/, "")}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          stream: true,
          messages: [{ role: "system", content: resolvedSystemPrompt }, ...next],
        }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let assistantText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          try {
            const json = JSON.parse(trimmed);
            const tok = json.message?.content ?? "";
            if (tok) {
              assistantText += tok;
              onMessagesChange((prev) => {
                const copy = prev.slice();
                copy[copy.length - 1] = { role: "assistant", content: assistantText };
                return copy;
              });
            }
          } catch {
            // ignore malformed line
          }
        }
      }

      appendLog({ ts: nowTs(), level: "OK", msg: `response complete chars=${assistantText.length}` });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "stream error";
      if (msg !== "AbortError" && !msg.includes("aborted")) {
        appendLog({ ts: nowTs(), level: "ERR", msg: `chat: ${msg}` });
      } else {
        appendLog({ ts: nowTs(), level: "ARROW", msg: "stream aborted" });
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
      onSendEnd?.();
    }
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
    if (!connected || !model) {
      appendLog({ ts: nowTs(), level: "ERR", msg: "not connected — open CONFIG" });
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

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div
      className="flex flex-1 min-h-0 flex-col"
      style={{ animation: "var(--animate-slide-down)" }}
    >
      <div ref={scrollerRef} className="flex-1 min-h-0 overflow-y-auto px-6 py-6 space-y-4">
        {!connected && (
          <div className="flex justify-center">
            <div className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground border border-border bg-surface/40 px-4 py-2 rounded">
              ⚠ Connect to Ollama in CONFIG to start chatting
            </div>
          </div>
        )}
        {messages.map((m, i) => {
          const isUser = m.role === "user";
          const isLast = i === messages.length - 1;
          const showCursor = !isUser && isLast && streaming;
          return (
            <div
              key={i}
              className={`flex items-start gap-3 ${isUser ? "justify-end" : "justify-start"}`}
            >
              {!isUser && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border bg-surface text-base">
                  🦾
                </div>
              )}
              <div
                className={
                  isUser
                    ? "max-w-[75%] px-4 py-3 text-sm text-primary-foreground bg-gradient-to-br from-primary to-primary-glow shadow-[var(--shadow-elegant,0_8px_24px_-12px_rgba(255,107,0,0.5))]"
                    : "max-w-[75%] px-4 py-3 text-sm text-foreground/90 bg-surface border border-border font-sans"
                }
                style={{
                  borderRadius: isUser ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                }}
              >
                <div className="whitespace-pre-wrap break-words">
                  {m.content}
                  {showCursor && (
                    <span
                      className="inline-block w-2 h-4 align-middle bg-primary ml-1"
                      style={{ animation: "var(--animate-blink)" }}
                    />
                  )}
                </div>
              </div>
              {isUser && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-primary/40 bg-primary/10 text-base">
                  👤
                </div>
              )}
            </div>
          );
        })}
      </div>

      {streaming && (() => {
        const last = messages[messages.length - 1];
        if (!last || last.role !== "assistant") return null;
        const action = detectBrowserAction(last.content);
        if (!action) return null;
        return <BrowserTaskCard action={action} onStop={stop} />;
      })()}

      <div className="border-t border-border bg-surface/40 px-4 py-3">
        <div className="flex items-end gap-3">
          <Textarea
            rows={3}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={connected ? "Message Worker Bee…  (Enter to send · Shift+Enter newline)" : "Connect to Ollama in CONFIG first"}
            className="flex-1 resize-none font-mono text-[13px] bg-background border-border focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary focus-visible:shadow-[0_0_0_3px_color-mix(in_oklab,var(--primary)_25%,transparent)]"
          />
          <button
            type="button"
            onClick={streaming ? stop : send}
            disabled={!streaming && !input.trim()}
            className={`h-[72px] w-28 shrink-0 rounded-md font-mono text-xs uppercase tracking-[0.2em] transition-all ${
              streaming
                ? "bg-destructive/20 text-destructive border border-destructive/60"
                : "bg-gradient-to-br from-primary to-primary-glow text-primary-foreground disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-[0_0_24px_-4px_var(--primary)]"
            }`}
            style={streaming ? { animation: "var(--animate-pulse-neon)" } : undefined}
          >
            {streaming ? "◼ STOP" : "SEND ▶"}
          </button>
        </div>
      </div>
    </div>
  );
}
