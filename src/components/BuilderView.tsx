import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  subscribeAgentWS,
  sendBuildStart,
  sendListProjects,
  sendDevServerStart,
  sendDevServerStop,
  sendScaffold,
} from "@/lib/agent-ws";
import { createProject } from "@/lib/projects";
import type { LogLine } from "@/lib/agent-state";
import { nowTs } from "@/lib/agent-state";
import {
  BuilderStatusPanel,
  type BuilderStage,
  type BuilderStageId,
} from "@/components/BuilderStatusPanel";

interface BuildHistoryEntry {
  id: string;
  prompt: string;
  project: string | null;
  status: "running" | "ok" | "error";
  startedAt: number;
  finishedAt?: number;
  log: BuildLogLine[];
  filesChanged?: number;
}

interface BuildLogLine {
  level?: string;
  message: string;
  ts: number;
}

interface RemoteProject {
  name: string;
  path?: string;
  updatedAt?: number;
}

interface Props {
  tabId: string;
  connected: boolean;
  appendLog: (line: LogLine) => void;
}

const BUILDER_MODEL = "qwen2.5-coder:32b";
const HISTORY_KEY = "workerbee_builder_history";

function loadHistory(): BuildHistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as BuildHistoryEntry[];
    if (!Array.isArray(parsed)) return [];
    // Any entries left in "running" from a previous session can't possibly
    // still be running — mark them as errored so the UI doesn't show a spinner.
    return parsed.map((h) =>
      h.status === "running" ? { ...h, status: "error" as const } : h,
    );
  } catch {
    return [];
  }
}

function saveHistory(history: BuildHistoryEntry[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 50)));
  } catch {
    /* ignore quota */
  }
}

function fmtTime(ts: number): string {
  try {
    return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

export function BuilderView({ tabId, connected, appendLog }: Props) {
  const [remoteProjects, setRemoteProjects] = useState<RemoteProject[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [projectsLoaded, setProjectsLoaded] = useState(false);
  const [currentProject, setCurrentProject] = useState<string | null>(null);
  const [history, setHistory] = useState<BuildHistoryEntry[]>(() => loadHistory());
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [building, setBuilding] = useState(false);
  const [devServerUrl, setDevServerUrl] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");
  const [refreshKey, setRefreshKey] = useState(0);
  const [updatedFlash, setUpdatedFlash] = useState(false);
  const [showNewModal, setShowNewModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [scaffolding, setScaffolding] = useState(false);
  const [lastBuildAt, setLastBuildAt] = useState<number | null>(null);
  const [lastFilesChanged, setLastFilesChanged] = useState<number | null>(null);
  const buildIdRef = useRef<string | null>(null);
  const flashTimerRef = useRef<number | null>(null);
  const pendingProjectRef = useRef<string | null>(null);
  const [stageCurrent, setStageCurrent] = useState<BuilderStage | null>(null);
  const [stageHistory, setStageHistory] = useState<BuilderStage[]>([]);
  const [statusActive, setStatusActive] = useState(false);
  const inBuildRef = useRef(false);
  const doneTimerRef = useRef<number | null>(null);
  const lastPromptRef = useRef<string>("");

  const pushStage = (next: Omit<BuilderStage, "ts">) => {
    setStageCurrent((prev) => {
      if (prev) setStageHistory((h) => [...h, prev].slice(-12));
      return { ...next, ts: Date.now() };
    });
  };

  const resetStages = () => {
    setStageCurrent(null);
    setStageHistory([]);
    setStatusActive(false);
    inBuildRef.current = false;
    if (doneTimerRef.current) {
      window.clearTimeout(doneTimerRef.current);
      doneTimerRef.current = null;
    }
  };

  // Save history on change
  useEffect(() => {
    saveHistory(history);
  }, [history]);

  // Refresh projects from agent on mount, on connect, and whenever the tab
  // becomes visible again. Never use cached/local values for the dropdown.
  useEffect(() => {
    if (!connected) return;
    const refresh = () => {
      setProjectsLoading(true);
      sendListProjects(tabId);
    };
    refresh();
    const onVis = () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        refresh();
      }
    };
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", onVis);
    }
    if (typeof window !== "undefined") {
      window.addEventListener("focus", refresh);
    }
    return () => {
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", onVis);
      }
      if (typeof window !== "undefined") {
        window.removeEventListener("focus", refresh);
      }
    };
  }, [connected, tabId]);

  // WebSocket subscription for builder events
  useEffect(() => {
    return subscribeAgentWS(tabId, {
      onProjectsList: ({ projects }) => {
        setRemoteProjects(projects);
        setProjectsLoading(false);
        setProjectsLoaded(true);
        console.log("[BUILDER RECV] projects_list", projects);
        setCurrentProject((cur) => {
          // If current selection no longer exists on disk, drop it.
          if (cur && projects.some((p) => p.name === cur)) return cur;
          const first = projects[0]?.name;
          if (first) {
            if (connected) sendDevServerStart(tabId, first);
            return first;
          }
          return null;
        });
      },
      onBuildComplete: ({ ok, filesChanged, message }) => {
        const id = buildIdRef.current;
        setBuilding(false);
        if (filesChanged !== undefined) setLastFilesChanged(filesChanged);
        setLastBuildAt(Date.now());
        inBuildRef.current = false;
        if (ok) {
          pushStage({
            id: "done",
            label: "✓ Done!",
            subtext: `${filesChanged ?? 0} files updated`,
            color: "#34d399",
          });
          if (doneTimerRef.current) window.clearTimeout(doneTimerRef.current);
          doneTimerRef.current = window.setTimeout(() => {
            resetStages();
          }, 3000);
        } else {
          pushStage({
            id: "error",
            label: "✗ Something went wrong",
            subtext: message || "Build failed",
            color: "#ff3b3b",
            errorMessage: message,
          });
        }
        if (!id) return;
        setHistory((prev) =>
          prev.map((h) =>
            h.id === id
              ? {
                  ...h,
                  status: ok ? "ok" : "error",
                  finishedAt: Date.now(),
                  filesChanged,
                  log: message
                    ? [...h.log, { message, ts: Date.now(), level: ok ? "ok" : "error" }]
                    : h.log,
                }
              : h,
          ),
        );
        buildIdRef.current = null;
        toast(ok ? "✅ Build complete" : "❌ Build failed");
      },
      onBuildError: ({ message }) => {
        const id = buildIdRef.current;
        setBuilding(false);
        inBuildRef.current = false;
        pushStage({
          id: "error",
          label: "✗ Something went wrong",
          subtext: message,
          color: "#ff3b3b",
          errorMessage: message,
        });
        if (id) {
          setHistory((prev) =>
            prev.map((h) =>
              h.id === id
                ? {
                    ...h,
                    status: "error",
                    finishedAt: Date.now(),
                    log: [...h.log, { level: "error", message, ts: Date.now() }],
                  }
                : h,
            ),
          );
        }
        buildIdRef.current = null;
        toast.error(`Build error: ${message}`);
      },
      onBuildApplied: () => {
        // Reload preview iframe
        setRefreshKey((n) => n + 1);
        setUpdatedFlash(true);
        if (flashTimerRef.current) window.clearTimeout(flashTimerRef.current);
        flashTimerRef.current = window.setTimeout(() => setUpdatedFlash(false), 2000);
        if (inBuildRef.current) {
          pushStage({
            id: "applying",
            label: "◎ Applying changes...",
            color: "#34d399",
            files: [],
          });
        }
      },
      onBuildPhase: ({ phase }) => {
        if (!inBuildRef.current) return;
        const p = phase.toLowerCase();
        if (p === "architect") {
          pushStage({
            id: "dreaming",
            label: "✦ Dreaming...",
            subtext: "deepseek is imagining the perfect design",
            color: "#a78bfa",
          });
        } else if (p === "builder") {
          pushStage({
            id: "building",
            label: "⚡ Building...",
            subtext: "qwen is writing the code",
            color: "var(--primary)",
          });
        }
      },
      onBuildBrief: ({ brief }) => {
        if (!inBuildRef.current) return;
        const trimmed = brief.length > 120 ? brief.slice(0, 120) + "..." : brief;
        pushStage({
          id: "planning",
          label: "◈ Planning...",
          subtext: trimmed,
          color: "#60a5fa",
        });
      },
      onBuildVision: ({ text, ok }) => {
        if (!inBuildRef.current) return;
        const passed = ok === true || /\bYES\b/.test(text);
        if (passed) {
          pushStage({
            id: "critiquing",
            label: "◉ Critiquing...",
            subtext: "llava is reviewing the visual result",
            color: "#f59e0b",
          });
        } else {
          pushStage({
            id: "fixing",
            label: "⟳ Fixing...",
            subtext: text.length > 100 ? text.slice(0, 100) + "..." : text,
            color: "#fb923c",
          });
        }
      },
      onScreenshot: () => {
        if (!inBuildRef.current) return;
        setStageCurrent((cur) => {
          if (cur && (cur.id === "critiquing" || cur.id === "fixing")) return cur;
          if (cur) setStageHistory((h) => [...h, cur].slice(-12));
          return {
            id: "critiquing" as BuilderStageId,
            label: "◉ Critiquing...",
            subtext: "llava is reviewing the visual result",
            color: "#f59e0b",
            ts: Date.now(),
          };
        });
      },
      onBuildLog: ({ level, message }) => {
        const id = buildIdRef.current;
        if (!id) return;
        setHistory((prev) =>
          prev.map((h) =>
            h.id === id
              ? { ...h, log: [...h.log, { level, message, ts: Date.now() }] }
              : h,
          ),
        );
        // If applying stage is active and log mentions a file, append
        if (inBuildRef.current && /\.(tsx?|jsx?|css|html|json|md|py)\b/.test(message)) {
          const m = message.match(/[\w./-]+\.(tsx?|jsx?|css|html|json|md|py)/);
          if (m) {
            const fname = m[0];
            setStageCurrent((cur) => {
              if (!cur || cur.id !== "applying") return cur;
              const files = cur.files ?? [];
              if (files.includes(fname)) return cur;
              return { ...cur, files: [...files, fname].slice(-12) };
            });
          }
        }
      },
      onDevServerResult: ({ success, url, project }) => {
        if (success && url) {
          setDevServerUrl(url);
          if (project) setCurrentProject(project);
          appendLog({ ts: nowTs(), level: "OK", msg: `Preview live at ${url}` });
        } else {
          toast.error("Dev server failed to start");
        }
      },
      onScaffoldResult: ({ ok, name, message }) => {
        setScaffolding(false);
        const alreadyExists = !ok && !!message && /already exists/i.test(message);
        if ((ok || alreadyExists) && name) {
          toast.success(`✨ Project ${name} scaffolded`);
          setShowNewModal(false);
          setNewProjectName("");
          // Auto-select + start dev server
          setCurrentProject(name);
          pendingProjectRef.current = name;
          sendListProjects(tabId);
          sendDevServerStart(tabId, name);
          if (alreadyExists) {
            toast(`Using existing project: ${name}`);
          }
        } else {
          toast.error(message || "Scaffold failed");
        }
      },
    });
  }, [tabId, appendLog]);

  // ONLY show projects that the agent reports from disk via list_projects.
  // Never merge in localStorage / hardcoded names — stale entries with
  // spaces or deleted projects must not appear in this dropdown.
  const allProjects = useMemo(() => {
    const seen = new Set<string>();
    const list: { name: string }[] = [];
    for (const r of remoteProjects) {
      if (!r?.name || seen.has(r.name)) continue;
      seen.add(r.name);
      list.push({ name: r.name });
    }
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [remoteProjects]);

  const handleProjectChange = (name: string) => {
    if (name === "__new__") {
      setShowNewModal(true);
      return;
    }
    if (!name) {
      setCurrentProject(null);
      setDevServerUrl(null);
      return;
    }
    setCurrentProject(name);
    setDevServerUrl(null);
    if (connected) {
      sendDevServerStart(tabId, name);
      appendLog({ ts: nowTs(), level: "ARROW", msg: `Starting dev server for ${name}…` });
    }
  };

  const handleBuild = () => {
    const text = prompt.trim();
    if (!text) return;
    if (!connected) {
      toast.error("Not connected to agent");
      return;
    }
    const id = crypto.randomUUID();
    const entry: BuildHistoryEntry = {
      id,
      prompt: text,
      project: currentProject,
      status: "running",
      startedAt: Date.now(),
      log: [{ message: `▶ build_start project=${currentProject ?? "—"}`, ts: Date.now() }],
    };
    buildIdRef.current = id;
    setHistory((prev) => [entry, ...prev]);
    setSelectedHistoryId(id);
    setBuilding(true);
    setPrompt("");
    sendBuildStart(tabId, text, currentProject);
    // Status panel: reset and seed with received stage
    if (doneTimerRef.current) { window.clearTimeout(doneTimerRef.current); doneTimerRef.current = null; }
    inBuildRef.current = true;
    lastPromptRef.current = text;
    setStatusActive(true);
    setStageHistory([]);
    setStageCurrent({
      id: "received",
      label: "Got it. Starting build...",
      color: "var(--muted-foreground)",
      ts: Date.now(),
    });
  };

  const handleTryAgain = () => {
    if (!lastPromptRef.current) {
      resetStages();
      return;
    }
    setPrompt(lastPromptRef.current);
    resetStages();
  };

  const handleNewProject = () => {
    const name = newProjectName.trim();
    if (!name) return;
    if (!connected) {
      // Just create locally
      createProject({
        emoji: "🏗",
        name,
        status: "planning",
        description: "",
      });
      setCurrentProject(name);
      setShowNewModal(false);
      setNewProjectName("");
      toast.success(`📦 Created local project ${name}`);
      return;
    }
    setScaffolding(true);
    sendScaffold(tabId, name);
  };

  const closePreview = () => {
    if (currentProject && connected) {
      sendDevServerStop(tabId, currentProject);
    }
    setDevServerUrl(null);
  };

  const selectedHistory = useMemo(
    () => history.find((h) => h.id === selectedHistoryId) ?? null,
    [history, selectedHistoryId],
  );

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex flex-1 min-h-0">
        {/* LEFT PANEL */}
        <div
          className="flex flex-col min-h-0"
          style={{
            width: "35%",
            minWidth: 320,
            borderRight: "1px solid var(--border)",
            background: "var(--surface)",
          }}
        >
          {/* Project selector */}
          <div style={{ padding: 14, borderBottom: "1px solid var(--border)" }}>
            <div
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 10,
                color: "var(--muted-foreground)",
                textTransform: "uppercase",
                letterSpacing: "0.15em",
                marginBottom: 6,
              }}
            >
              Project
            </div>
            <select
              value={currentProject ?? ""}
              onChange={(e) => handleProjectChange(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 10px",
                background: "var(--background)",
                color: "var(--foreground)",
                border: "1px solid var(--border)",
                borderRadius: 6,
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 12,
              }}
            >
              <option value="">
                {projectsLoading && !projectsLoaded
                  ? "Loading projects…"
                  : allProjects.length === 0
                    ? "No projects — create one below"
                    : "— Select a project —"}
              </option>
              {allProjects.map((p) => (
                <option key={p.name} value={p.name}>
                  {p.name}
                </option>
              ))}
              <option value="__new__">＋ New Project…</option>
            </select>
          </div>

          {/* Build history */}
          <div className="flex-1 min-h-0 overflow-y-auto" style={{ padding: 14 }}>
            <div
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 10,
                color: "var(--muted-foreground)",
                textTransform: "uppercase",
                letterSpacing: "0.15em",
                marginBottom: 8,
              }}
            >
              Build History
            </div>
            {history.length === 0 ? (
              <div
                style={{
                  fontSize: 12,
                  color: "var(--muted-foreground)",
                  fontStyle: "italic",
                  padding: "12px 0",
                }}
              >
                No builds yet
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {history.map((h) => {
                  const active = h.id === selectedHistoryId;
                  const icon =
                    h.status === "ok" ? "✅" : h.status === "error" ? "❌" : "⏳";
                  return (
                    <button
                      key={h.id}
                      type="button"
                      onClick={() => setSelectedHistoryId(h.id)}
                      style={{
                        textAlign: "left",
                        padding: "8px 10px",
                        background: active ? "var(--surface-2)" : "transparent",
                        border: "1px solid",
                        borderColor: active ? "var(--primary)" : "var(--border)",
                        borderRadius: 6,
                        cursor: "pointer",
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: 11,
                        color: "var(--foreground)",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          color: "var(--muted-foreground)",
                          fontSize: 10,
                          marginBottom: 4,
                        }}
                      >
                        <span>{fmtTime(h.startedAt)}</span>
                        <span>{icon}</span>
                      </div>
                      <div style={{ wordBreak: "break-word" }}>
                        {h.prompt.length > 50 ? h.prompt.slice(0, 50) + "…" : h.prompt}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Selected build's log */}
            {selectedHistory && selectedHistory.log.length > 0 && (
              <div
                style={{
                  marginTop: 14,
                  padding: 10,
                  background: "var(--background)",
                  border: "1px solid var(--border)",
                  borderRadius: 6,
                  maxHeight: 240,
                  overflowY: "auto",
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 10,
                  color: "var(--foreground)",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {selectedHistory.log.map((l, i) => (
                  <div
                    key={i}
                    style={{
                      color:
                        l.level === "error"
                          ? "var(--destructive)"
                          : l.level === "ok"
                            ? "var(--success)"
                            : "var(--muted-foreground)",
                    }}
                  >
                    {l.message}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Input area */}
          <div style={{ padding: 12, borderTop: "1px solid var(--border)" }}>
            <BuilderStatusPanel
              active={statusActive}
              current={stageCurrent}
              history={stageHistory}
              onTryAgain={handleTryAgain}
            />
            <textarea
              rows={3}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  handleBuild();
                }
              }}
              placeholder="Describe what to build or change…"
              style={{
                width: "100%",
                background: "var(--background)",
                color: "var(--foreground)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                padding: 10,
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 12,
                resize: "none",
              }}
            />
            <div style={{ display: "flex", gap: 6, marginTop: 8, alignItems: "center" }}>
              <button
                type="button"
                title="Attach"
                style={{
                  width: 32,
                  height: 32,
                  background: "transparent",
                  border: "1px solid var(--border)",
                  borderRadius: 6,
                  color: "var(--muted-foreground)",
                  cursor: "pointer",
                  fontSize: 14,
                }}
              >
                📎
              </button>
              <span style={{ position: "relative", display: "inline-flex" }}>
                <button
                  type="button"
                  title="Voice (Beta)"
                  style={{
                    width: 32,
                    height: 32,
                    background: "transparent",
                    border: "1px solid var(--border)",
                    borderRadius: 6,
                    color: "var(--muted-foreground)",
                    cursor: "pointer",
                    fontSize: 14,
                  }}
                >
                  🎙
                </button>
                <span
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    top: -4,
                    right: -4,
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
              <button
                type="button"
                onClick={handleBuild}
                disabled={!prompt.trim() || building || !connected}
                style={{
                  flex: 1,
                  height: 36,
                  background:
                    prompt.trim() && !building && connected
                      ? "linear-gradient(135deg, var(--primary), var(--primary-glow, var(--primary)))"
                      : "var(--surface-2)",
                  color:
                    prompt.trim() && !building && connected
                      ? "var(--primary-foreground)"
                      : "var(--muted-foreground)",
                  border: "none",
                  borderRadius: 6,
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  cursor:
                    prompt.trim() && !building && connected ? "pointer" : "not-allowed",
                }}
              >
                {building ? "⏳ BUILDING…" : "▶ BUILD"}
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="flex flex-col flex-1 min-h-0" style={{ background: "var(--background)" }}>
          {/* Toolbar */}
          <div
            style={{
              padding: "10px 14px",
              borderBottom: "1px solid var(--border)",
              background: "var(--surface)",
              display: "flex",
              alignItems: "center",
              gap: 10,
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11,
            }}
          >
            {devServerUrl ? (
              <>
                <span style={{ color: "var(--primary)", fontWeight: 700 }}>
                  {currentProject ?? "preview"}
                </span>
                <a
                  href={devServerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: "var(--muted-foreground)",
                    textDecoration: "underline",
                    textUnderlineOffset: 3,
                  }}
                >
                  {devServerUrl}
                </a>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    color: "var(--success)",
                    marginLeft: 6,
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: "var(--success)",
                      animation: "pulse-dot 1.6s ease-in-out infinite",
                    }}
                  />
                  LIVE
                </span>
                <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
                  <button
                    type="button"
                    title="Refresh"
                    onClick={() => setRefreshKey((n) => n + 1)}
                    style={toolbarBtn}
                  >
                    🔄
                  </button>
                  <button
                    type="button"
                    title="Mobile (375px)"
                    onClick={() => setPreviewMode("mobile")}
                    style={toolbarBtn}
                    aria-pressed={previewMode === "mobile"}
                  >
                    📱
                  </button>
                  <button
                    type="button"
                    title="Desktop"
                    onClick={() => setPreviewMode("desktop")}
                    style={toolbarBtn}
                    aria-pressed={previewMode === "desktop"}
                  >
                    🖥
                  </button>
                  <button
                    type="button"
                    title="Deploy"
                    onClick={() => toast("Deploy: not yet wired")}
                    style={{
                      ...toolbarBtn,
                      background: "var(--primary)",
                      color: "var(--primary-foreground)",
                      borderColor: "var(--primary)",
                    }}
                  >
                    📤 Deploy
                  </button>
                  <button
                    type="button"
                    title="Stop preview"
                    onClick={closePreview}
                    style={toolbarBtn}
                  >
                    ✕
                  </button>
                </div>
              </>
            ) : (
              <span style={{ color: "var(--muted-foreground)" }}>Preview</span>
            )}
          </div>

          {/* Preview body */}
          <div className="flex-1 min-h-0 relative" style={{ overflow: "hidden" }}>
            {devServerUrl ? (
              <div
                style={{
                  height: "100%",
                  width: "100%",
                  display: "flex",
                  alignItems: previewMode === "mobile" ? "flex-start" : "stretch",
                  justifyContent: "center",
                  padding: previewMode === "mobile" ? 24 : 0,
                  background:
                    previewMode === "mobile" ? "var(--surface-2)" : "var(--background)",
                }}
              >
                <iframe
                  key={refreshKey}
                  src={devServerUrl}
                  title="Project Preview"
                  style={{
                    width: previewMode === "mobile" ? 375 : "100%",
                    maxWidth: "100%",
                    height: previewMode === "mobile" ? 720 : "100%",
                    border:
                      previewMode === "mobile"
                        ? "8px solid #111"
                        : "none",
                    borderRadius: previewMode === "mobile" ? 24 : 0,
                    background: "#fff",
                    boxShadow:
                      previewMode === "mobile"
                        ? "0 12px 40px rgba(0,0,0,0.25)"
                        : "none",
                  }}
                />
                {updatedFlash && (
                  <div
                    style={{
                      position: "absolute",
                      top: 16,
                      right: 16,
                      background: "var(--success)",
                      color: "var(--success-foreground)",
                      padding: "6px 12px",
                      borderRadius: 999,
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 11,
                      fontWeight: 700,
                      animation: "slide-down 220ms ease-out",
                    }}
                  >
                    ⚡ Updated
                  </div>
                )}
              </div>
            ) : (
              <div
                style={{
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexDirection: "column",
                  gap: 12,
                  color: "var(--muted-foreground)",
                  textAlign: "center",
                  padding: 24,
                }}
              >
                <div style={{ fontSize: 48 }}>🏗</div>
                <div
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 14,
                  }}
                >
                  Select a project or create one to start building
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Status bar */}
      <div
        style={{
          borderTop: "1px solid var(--border)",
          background: "var(--surface)",
          padding: "6px 14px",
          display: "flex",
          gap: 18,
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 10,
          color: "var(--muted-foreground)",
          textTransform: "uppercase",
          letterSpacing: "0.1em",
        }}
      >
        <span>
          MODEL: <span style={{ color: "var(--primary)" }}>{BUILDER_MODEL}</span>
        </span>
        <span>
          LAST BUILD:{" "}
          <span style={{ color: "var(--foreground)" }}>
            {lastBuildAt ? fmtTime(lastBuildAt) : "—"}
          </span>
        </span>
        <span>
          FILES CHANGED:{" "}
          <span style={{ color: "var(--foreground)" }}>
            {lastFilesChanged ?? "—"}
          </span>
        </span>
        <span style={{ marginLeft: "auto" }}>
          {connected ? "● connected" : "○ offline"}
        </span>
      </div>

      {/* New project modal */}
      {showNewModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 60,
          }}
          onClick={() => !scaffolding && setShowNewModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              padding: 24,
              minWidth: 360,
              maxWidth: 480,
            }}
          >
            <div
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 14,
                fontWeight: 700,
                marginBottom: 14,
                color: "var(--foreground)",
              }}
            >
              ＋ New Project
            </div>
            <input
              type="text"
              autoFocus
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleNewProject();
                if (e.key === "Escape") setShowNewModal(false);
              }}
              placeholder="my-awesome-site"
              style={{
                width: "100%",
                padding: "10px 12px",
                background: "var(--background)",
                color: "var(--foreground)",
                border: "1px solid var(--border)",
                borderRadius: 6,
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 13,
              }}
            />
            <div style={{ display: "flex", gap: 8, marginTop: 14, justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => setShowNewModal(false)}
                disabled={scaffolding}
                style={{
                  padding: "8px 14px",
                  background: "transparent",
                  color: "var(--muted-foreground)",
                  border: "1px solid var(--border)",
                  borderRadius: 6,
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 11,
                  cursor: "pointer",
                }}
              >
                CANCEL
              </button>
              <button
                type="button"
                onClick={handleNewProject}
                disabled={!newProjectName.trim() || scaffolding}
                style={{
                  padding: "8px 14px",
                  background: "var(--primary)",
                  color: "var(--primary-foreground)",
                  border: "none",
                  borderRadius: 6,
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 11,
                  fontWeight: 700,
                  cursor:
                    !newProjectName.trim() || scaffolding ? "not-allowed" : "pointer",
                }}
              >
                {scaffolding ? "⏳ SCAFFOLDING…" : "CREATE"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const toolbarBtn: React.CSSProperties = {
  background: "transparent",
  color: "var(--muted-foreground)",
  border: "1px solid var(--border)",
  borderRadius: 6,
  padding: "4px 10px",
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: 11,
  cursor: "pointer",
};