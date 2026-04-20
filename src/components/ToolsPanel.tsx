import { useMemo, useState } from "react";
import { nowTs, type LogLine } from "@/lib/agent-state";
import type { ConnectionsState } from "@/lib/connections";

interface Tool {
  id: string;
  icon: string;
  name: string;
  desc: string;
  installCmd: string;
  /** When true, this tool is gated by a live connection and cannot be installed/uninstalled. */
  connectionTool?: boolean;
  /** When true, this tool is the always-on Playwright/Chromium core. */
  coreTool?: boolean;
}

const PLAYWRIGHT_TOOL: Tool = {
  id: "playwright_chromium",
  icon: "🎭",
  name: "Playwright + Chromium",
  desc: "Headless browser engine. Scrape, screenshot, fill forms, test websites. Chromium auto-installed on first launch.",
  installCmd: "core: playwright + chromium",
  coreTool: true,
};

const BASE_TOOLS: Tool[] = [
  { id: "web_search", icon: "🌐", name: "Web Search", desc: "DuckDuckGo / Brave API", installCmd: "pip install duckduckgo-search" },
  { id: "code_exec", icon: "⚡", name: "Code Executor", desc: "Sandboxed Python & JS", installCmd: "pip install jupyter_client" },
  { id: "file_ops", icon: "📁", name: "File System", desc: "Read/write local directories", installCmd: "pip install watchdog" },
  { id: "vision", icon: "👁", name: "Vision", desc: "Image analysis via LLaVA", installCmd: "ollama pull llava" },
  { id: "vector_db", icon: "🧠", name: "Vector Memory", desc: "ChromaDB embedding store", installCmd: "pip install chromadb" },
  { id: "shell", icon: "🐚", name: "Shell Runner", desc: "Execute bash with approval", installCmd: "built-in" },
  { id: "git", icon: "🌿", name: "Git Tools", desc: "Clone, diff, commit", installCmd: "pip install gitpython" },
  { id: "pdf_reader", icon: "📄", name: "PDF Reader", desc: "Extract & chunk PDFs", installCmd: "pip install pypdf" },
  { id: "sql_tools", icon: "🗄", name: "SQL Agent", desc: "Query SQLite / Postgres", installCmd: "pip install sqlalchemy" },
];

interface ToolState {
  installed: boolean;
  enabled: boolean;
  installing: boolean;
}

interface Props {
  appendLog: (line: LogLine) => void;
  connections?: ConnectionsState;
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const jitter = () => 600 + Math.floor(Math.random() * 200);

export function ToolsPanel({ appendLog, connections }: Props) {
  const TOOLS = useMemo<Tool[]>(() => {
    const conn: Tool[] = [];
    if (connections?.gmail) {
      conn.push({
        id: "gmail.send",
        icon: "📧",
        name: "Gmail Send",
        desc: `Send email as ${connections.gmail.email}. Reads from connected Gmail.`,
        installCmd: "connection: gmail",
        connectionTool: true,
      });
    }
    if (connections?.slack) {
      conn.push({
        id: "slack.post_message",
        icon: "💬",
        name: "Slack Post Message",
        desc: `Post to channels in ${connections.slack.workspace} as @${connections.slack.botUser}.`,
        installCmd: "connection: slack",
        connectionTool: true,
      });
    }
    if (connections?.whatsapp) {
      conn.push({
        id: "whatsapp.send",
        icon: "📱",
        name: "WhatsApp Send",
        desc: `Send WhatsApp messages via Meta Cloud API (phone ${connections.whatsapp.phoneNumberId}).`,
        installCmd: "connection: whatsapp",
        connectionTool: true,
      });
    }
    return [PLAYWRIGHT_TOOL, ...conn, ...BASE_TOOLS];
  }, [connections]);

  const [state, setState] = useState<Record<string, ToolState>>(() =>
    Object.fromEntries(
      BASE_TOOLS.map((t) => [
        t.id,
        { installed: t.id === "shell", enabled: t.id === "shell", installing: false },
      ]),
    ),
  );

  const getToolState = (tool: Tool): ToolState =>
    tool.connectionTool || tool.coreTool
      ? { installed: true, enabled: true, installing: false }
      : (state[tool.id] ?? { installed: false, enabled: false, installing: false });

  const update = (id: string, patch: Partial<ToolState>) =>
    setState((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));

  const install = async (tool: Tool) => {
    update(tool.id, { installing: true });
    appendLog({ ts: nowTs(), level: "ARROW", msg: `Installing ${tool.id}…` });
    await wait(jitter());
    appendLog({ ts: nowTs(), level: "ARROW", msg: `Resolving dependencies for ${tool.id}…` });
    await wait(jitter());
    appendLog({ ts: nowTs(), level: "OK", msg: `Installed ${tool.id}` });
    update(tool.id, { installed: true, enabled: true, installing: false });
  };

  const toggle = (tool: Tool) => {
    const current = state[tool.id];
    const next = !current.enabled;
    update(tool.id, { enabled: next });
    appendLog({
      ts: nowTs(),
      level: next ? "OK" : "ARROW",
      msg: `${tool.id} ${next ? "enabled" : "disabled"}`,
    });
  };

  return (
    <div
      className="flex flex-1 min-h-0 flex-col overflow-y-auto"
      style={{ animation: "var(--animate-slide-down)" }}
    >
      <div className="px-6 pt-6 pb-4 border-b border-border">
        <h1 className="font-mono text-xl font-bold tracking-[0.2em] text-primary">
          🔧 TOOL ARSENAL
        </h1>
        <p className="mt-2 font-sans text-sm text-muted-foreground max-w-2xl">
          Tools extend Worker Bee's capabilities. Enabled tools are injected into the system
          prompt so the agent knows what it can call during a session. Connection-backed tools
          appear automatically when the matching service is linked in 🔗 Connections.
        </p>
      </div>

      <div className="grid gap-4 p-6 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
        {TOOLS.map((tool) => {
          const s = getToolState(tool);
          const glow = tool.coreTool
            ? "border-[#ffaa00] shadow-[0_0_28px_-4px_#ffaa00aa]"
            : s.enabled
              ? "border-primary shadow-[0_0_24px_-6px_var(--primary)]"
              : "border-border";
          return (
            <div
              key={tool.id}
              className={`flex flex-col rounded-lg bg-surface/60 border ${glow} transition-all p-4`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-md bg-background border border-border text-xl"
                    style={tool.coreTool ? { borderColor: "#ffaa00aa" } : undefined}
                  >
                    {tool.icon}
                  </div>
                  <div>
                    <div className="font-mono text-sm font-bold text-foreground">
                      {tool.name}
                    </div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                      {tool.id}
                    </div>
                  </div>
                </div>
                {tool.coreTool ? (
                  <span
                    className="font-mono text-[10px] uppercase tracking-[0.15em] px-2 py-0.5 rounded font-bold"
                    style={{ background: "#ffaa00", color: "#000" }}
                  >
                    🔒 CORE — ALWAYS ON
                  </span>
                ) : tool.connectionTool ? (
                  <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-success border border-success/40 bg-success/10 px-2 py-0.5 rounded">
                    ● LIVE
                  </span>
                ) : s.installed ? (
                  <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-success border border-success/40 bg-success/10 px-2 py-0.5 rounded">
                    INSTALLED
                  </span>
                ) : null}
              </div>

              <p className="mt-3 font-sans text-sm text-muted-foreground flex-1">
                {tool.desc}
              </p>

              <div className="mt-4 flex items-center justify-between gap-3">
                {tool.connectionTool ? (
                  <div
                    className="flex-1 flex items-center justify-between rounded-md border border-primary/60 bg-primary/10 text-primary px-3 py-2 font-mono text-xs uppercase tracking-[0.18em]"
                  >
                    <span>Connected</span>
                    <span className="text-[10px] text-muted-foreground normal-case tracking-normal">
                      via 🔗 Connections
                    </span>
                  </div>
                ) : !s.installed ? (
                  <button
                    type="button"
                    onClick={() => install(tool)}
                    disabled={s.installing}
                    className="flex-1 rounded-md bg-gradient-to-br from-primary to-primary-glow text-primary-foreground font-mono text-xs uppercase tracking-[0.18em] py-2 disabled:opacity-60 disabled:cursor-wait hover:shadow-[0_0_20px_-4px_var(--primary)] transition-shadow"
                  >
                    {s.installing ? "Installing…" : "Install"}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => toggle(tool)}
                    className={`flex-1 flex items-center justify-between rounded-md border px-3 py-2 font-mono text-xs uppercase tracking-[0.18em] transition-colors ${
                      s.enabled
                        ? "border-primary/60 bg-primary/10 text-primary"
                        : "border-border bg-background text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <span>{s.enabled ? "ON" : "OFF"}</span>
                    <span
                      className={`relative inline-flex h-4 w-8 items-center rounded-full transition-colors ${
                        s.enabled ? "bg-primary" : "bg-border"
                      }`}
                    >
                      <span
                        className={`inline-block h-3 w-3 rounded-full bg-background transition-transform ${
                          s.enabled ? "translate-x-4" : "translate-x-1"
                        }`}
                      />
                    </span>
                  </button>
                )}
              </div>

              <code className="mt-3 block font-mono text-[10px] text-muted-foreground/70 bg-background/60 border border-border rounded px-2 py-1.5 truncate">
                $ {tool.installCmd}
              </code>
            </div>
          );
        })}
      </div>
    </div>
  );
}
