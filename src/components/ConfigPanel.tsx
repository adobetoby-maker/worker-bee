import { useState } from "react";
import { nowTs, type LogLine } from "@/lib/agent-state";

type Mode = "http" | "https" | "tailscale" | "custom";

interface OllamaModel {
  name: string;
  size?: number;
  modified_at?: string;
}

interface ConfigPanelProps {
  endpoint: string;
  setEndpoint: (s: string) => void;
  model: string | null;
  setModel: (m: string | null) => void;
  setConnected: (c: boolean) => void;
  appendLog: (line: LogLine) => void;
  onModelsLoaded?: (models: string[]) => void;
  onConnected?: () => void;
}

const MODES: { id: Mode; label: string; icon: string }[] = [
  { id: "http", label: "Local (HTTP)", icon: "🖥" },
  { id: "https", label: "Local (HTTPS)", icon: "🔒" },
  { id: "tailscale", label: "Tailscale", icon: "🔒" },
  { id: "custom", label: "Custom", icon: "✏" },
];

const QUICK_PULL = [
  { name: "llama3.2", desc: "Meta · general purpose · 3B" },
  { name: "mistral", desc: "Mistral · fast 7B" },
  { name: "gemma3", desc: "Google · efficient" },
  { name: "phi4", desc: "Microsoft · reasoning" },
  { name: "deepseek-r1", desc: "DeepSeek · chain-of-thought" },
  { name: "llava", desc: "Vision · multimodal" },
];

const ENDPOINT_FOR: Record<Mode, string> = {
  http: "http://localhost:8000",
  https: "https://localhost:8000",
  tailscale: "https://100.64.0.1:8000",
  custom: "",
};

export function ConfigPanel({
  endpoint,
  setEndpoint,
  model,
  setModel,
  setConnected,
  appendLog,
  onModelsLoaded,
  onConnected,
}: ConfigPanelProps) {
  const [mode, setMode] = useState<Mode>("https");
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "err">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [models, setModels] = useState<OllamaModel[]>([]);
  const [showTroubleshoot, setShowTroubleshoot] = useState(false);

  const handleMode = (m: Mode) => {
    setMode(m);
    if (m !== "custom") setEndpoint(ENDPOINT_FOR[m]);
    else if (
      endpoint === ENDPOINT_FOR.http ||
      endpoint === ENDPOINT_FOR.https ||
      endpoint === ENDPOINT_FOR.tailscale
    ) {
      setEndpoint("");
    }
  };

  const connect = async () => {
    if (!endpoint.trim()) {
      setStatus("err");
      setErrorMsg("endpoint is empty");
      appendLog({ ts: nowTs(), level: "ERR", msg: "connect: empty endpoint" });
      return;
    }
    setStatus("loading");
    setErrorMsg(null);
    appendLog({ ts: nowTs(), level: "ARROW", msg: `GET ${endpoint}/api/tags` });

    try {
      const res = await fetch(`${endpoint.replace(/\/$/, "")}/api/tags`);
      if (!res.ok) throw new Error(`http ${res.status}`);
      const data = (await res.json()) as { models?: OllamaModel[] };
      const list = data.models ?? [];
      setModels(list);
      setStatus("ok");
      setConnected(true);
      const first = list[0]?.name ?? null;
      if (first && !model) setModel(first);
      onModelsLoaded?.(list.map((m) => m.name));
      appendLog({
        ts: nowTs(),
        level: "OK",
        msg: `connected · ${list.length} model${list.length === 1 ? "" : "s"}`,
      });
      onConnected?.();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "unknown error";
      setStatus("err");
      setErrorMsg(msg);
      setConnected(false);
      appendLog({ ts: nowTs(), level: "ERR", msg: `connect failed · ${msg}` });
    }
  };

  return (
    <div
      className="flex-1 min-h-0 overflow-y-auto px-8 py-8"
      style={{ animation: "var(--animate-slide-down)" }}
    >
      <div className="mx-auto max-w-3xl space-y-8">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
            // runtime configuration
          </div>
          <h1 className="mt-1 font-mono text-2xl text-foreground">
            <span className="text-primary">CONNECT</span>
            <span className="text-muted-foreground">::</span>
            <span className="text-success">OLLAMA</span>
          </h1>
        </div>

        {/* Mode selector */}
        <section>
          <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            // connection mode
          </div>
          <div className="grid grid-cols-3 gap-2">
            {MODES.map((m) => {
              const active = mode === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => handleMode(m.id)}
                  className={`group flex items-center justify-center gap-2 border px-3 py-3 font-mono text-[11px] uppercase tracking-[0.18em] transition-colors ${
                    active
                      ? "border-primary bg-primary/10 text-success"
                      : "border-border bg-surface/40 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                  }`}
                >
                  <span className="text-base">{m.icon}</span>
                  <span>{m.label}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Endpoint input */}
        <section>
          <label className="mb-2 block font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            // ollama endpoint
          </label>
          <input
            type="text"
            value={endpoint}
            onChange={(e) => {
              setEndpoint(e.target.value);
              if (mode !== "custom") setMode("custom");
            }}
            placeholder="http://host:11434"
            spellCheck={false}
            className="w-full border border-border bg-surface px-3 py-2.5 font-mono text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary/40"
          />
          <a
            href="https://worker-bee.lovable.app/install"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block font-mono"
            style={{ color: "#555", fontSize: "11px" }}
          >
            Need to install the agent server? → Install Guide
          </a>
          <div className="mt-2 font-mono" style={{ color: "#555", fontSize: "11px" }}>
            Already installed? Run:
          </div>
          <CopyCmd cmd="cd ~/worker-bee && ./start.sh" />
        </section>

        {/* Tip box */}
        <section>
          <div className="border border-border bg-surface/40 p-4">
            {mode === "http" && (
              <TipBlock
                title="LOCAL HTTP TIP"
                lines={[
                  "Requires browser mixed content exception when this page is served over HTTPS.",
                  "Safari: Develop menu → Disable Local File Restrictions.",
                  "Chrome: Site settings → Insecure content → Allow.",
                ]}
                cmds={["http://localhost:8000"]}
              />
            )}
            {mode === "https" && (
              <TipBlock
                title="LOCAL HTTPS TIP — RECOMMENDED"
                lines={[
                  "Run this in iTerm2 to start the agent with HTTPS:",
                ]}
                cmds={[
                  'mkdir -p ~/.ssl && openssl req -x509 -newkey rsa:4096 -keyout ~/.ssl/key.pem -out ~/.ssl/cert.pem -days 365 -nodes -subj "/CN=localhost" && cd ~/worker-bee && source .venv/bin/activate && uvicorn main:app --reload --host 0.0.0.0 --port 8000 --ssl-keyfile ~/.ssl/key.pem --ssl-certfile ~/.ssl/cert.pem',
                  "open https://localhost:8000/health",
                ]}
              />
            )}
            {mode === "tailscale" && (
              <TipBlock
                title="TAILSCALE TIP"
                lines={[
                  "Find your Tailscale IP, then point at the agent on that IP over HTTPS:",
                ]}
                cmds={["tailscale ip -4", "https://100.x.x.x:8000"]}
              />
            )}
            {mode === "custom" && (
              <TipBlock
                title="CUSTOM TIP"
                lines={[
                  "Point at any reachable Worker Bee agent. Include scheme and port.",
                ]}
                cmds={["https://10.0.0.42:8000", "https://agent.mydomain.dev"]}
              />
            )}
          </div>
        </section>

        {/* Connect button */}
        <section>
          <button
            type="button"
            onClick={connect}
            disabled={status === "loading"}
            className="relative w-full overflow-hidden border border-primary/60 px-4 py-3 font-mono text-sm font-bold uppercase tracking-[0.25em] text-primary-foreground transition-transform active:translate-y-[1px] disabled:opacity-60"
            style={{
              background:
                "linear-gradient(90deg, var(--primary) 0%, color-mix(in oklab, var(--primary) 70%, var(--success)) 100%)",
              boxShadow:
                "0 0 24px color-mix(in oklab, var(--primary) 35%, transparent)",
            }}
          >
            {status === "loading" ? "CONNECTING…" : "▶ CONNECT TO OLLAMA"}
          </button>

          <div className="mt-3 font-mono text-[11px]">
            {status === "ok" && (
              <span className="text-success">
                [OK] handshake successful · {models.length} model
                {models.length === 1 ? "" : "s"} discovered
              </span>
            )}
            {status === "err" && (
              <span className="text-destructive">[ERR] {errorMsg}</span>
            )}
            {status === "idle" && (
              <span className="text-muted-foreground">// awaiting connection</span>
            )}
          </div>

          {status === "err" && (
            <div
              className="mt-3 border p-3 font-mono text-[11px]"
              style={{
                background: "#1a1500",
                borderColor: "#ffaa0055",
                color: "#ffd166",
              }}
            >
              <button
                type="button"
                onClick={() => setShowTroubleshoot((v) => !v)}
                className="flex w-full items-center justify-between text-left uppercase tracking-[0.18em]"
                style={{ color: "#ffaa00" }}
              >
                <span>⚠ Connection failed — common fixes</span>
                <span>{showTroubleshoot ? "▾" : "▸"}</span>
              </button>
              {showTroubleshoot && (
                <div className="mt-3 space-y-3">
                  <div>
                    <div>• Mixed content blocked? Open</div>
                    <CopyCmd cmd="https://localhost:8000/health" />
                    <div className="mt-1" style={{ color: "#888" }}>
                      in a new tab first, click through the security warning, then try connecting again.
                    </div>
                  </div>
                  <div>
                    <div>• Agent not running? In iTerm2 run:</div>
                    <CopyCmd cmd="cd ~/worker-bee && ./start.sh" />
                  </div>
                  <div>
                    <div>• Ollama not running? In iTerm2 run:</div>
                    <CopyCmd cmd="ollama serve" />
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Model picker */}
        {status === "ok" && models.length > 0 && (
          <section>
            <label className="mb-2 block font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              // active model
            </label>
            <select
              value={model ?? ""}
              onChange={(e) => {
                setModel(e.target.value);
                appendLog({
                  ts: nowTs(),
                  level: "ARROW",
                  msg: `model switched → ${e.target.value}`,
                });
              }}
              className="w-full border border-border bg-surface px-3 py-2.5 font-mono text-sm text-foreground outline-none focus:border-primary"
            >
              {models.map((m) => (
                <option key={m.name} value={m.name}>
                  {m.name}
                </option>
              ))}
            </select>
          </section>
        )}

        {/* Quick pull table */}
        <section>
          <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            // quick pull · reference
          </div>
          <div className="border border-border bg-surface/40">
            <table className="w-full font-mono text-[12px]">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="px-3 py-2 font-normal uppercase tracking-[0.15em] text-[10px]">
                    Model
                  </th>
                  <th className="px-3 py-2 font-normal uppercase tracking-[0.15em] text-[10px]">
                    Notes
                  </th>
                  <th className="px-3 py-2 font-normal uppercase tracking-[0.15em] text-[10px]">
                    Pull
                  </th>
                </tr>
              </thead>
              <tbody>
                {QUICK_PULL.map((m, i) => (
                  <tr
                    key={m.name}
                    className={i % 2 ? "bg-surface/30" : ""}
                  >
                    <td className="px-3 py-2 text-success">{m.name}</td>
                    <td className="px-3 py-2 text-muted-foreground">{m.desc}</td>
                    <td className="px-3 py-2">
                      <code className="inline-block border border-border bg-background/60 px-2 py-0.5 text-primary">
                        ollama pull {m.name}
                      </code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}

function TipBlock({
  title,
  lines,
  cmds,
}: {
  title: string;
  lines: string[];
  cmds: string[];
}) {
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">
        // {title}
      </div>
      {lines.map((l, i) => (
        <p key={i} className="mt-2 text-[12px] text-muted-foreground">
          {l}
        </p>
      ))}
      <div className="mt-3 space-y-1.5">
        {cmds.map((c) => (
          <div
            key={c}
            className="flex items-center gap-2 border border-border bg-background/60 px-3 py-1.5"
          >
            <span className="text-primary font-mono text-[11px]">$</span>
            <code className="font-mono text-[12px] text-foreground">{c}</code>
          </div>
        ))}
      </div>
    </div>
  );
}
