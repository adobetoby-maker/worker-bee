import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  subscribeProjects,
  getProject,
  addFile,
  deleteFile,
  fileIcon,
  formatBytes,
  relativeTime,
  STATUS_META,
  type Project,
  type ProjectFile,
} from "@/lib/projects";
import { CodeViewer } from "./CodeViewer";

interface Props {
  projectId: string;
  onBack: () => void;
  onEditInAgent: (filename: string, content: string) => void;
  onCompareFile?: (filePath: string, before: string, after: string) => void;
  appendLog: (msg: string) => void;
}

export function ProjectWorkspace({ projectId, onBack, onEditInAgent, onCompareFile, appendLog }: Props) {
  const [project, setProject] = useState<Project | undefined>(() => getProject(projectId));
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [addingFile, setAddingFile] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [tab, setTab] = useState<"files" | "code" | "screens">("code");
  const [diffPasteOpen, setDiffPasteOpen] = useState(false);
  const [diffPasteText, setDiffPasteText] = useState("");

  useEffect(() => {
    return subscribeProjects(() => setProject(getProject(projectId)));
  }, [projectId]);

  const files = project?.files ?? [];

  // Auto-select the first file when one becomes available.
  useEffect(() => {
    if (!activeFileId && files[0]) setActiveFileId(files[0].id);
    if (activeFileId && !files.find((f) => f.id === activeFileId)) {
      setActiveFileId(files[0]?.id ?? null);
    }
  }, [files, activeFileId]);

  const activeFile = useMemo<ProjectFile | undefined>(
    () => files.find((f) => f.id === activeFileId),
    [files, activeFileId],
  );

  if (!project) {
    return (
      <div className="flex-1 flex items-center justify-center font-mono text-[12px] text-[#666]">
        Project not found.{" "}
        <button onClick={onBack} className="ml-2 underline" style={{ color: "#ffaa00" }}>
          back
        </button>
      </div>
    );
  }

  const status = STATUS_META[project.status];

  const onAddFile = () => {
    const name = newFileName.trim();
    if (!name) return;
    const f = addFile(project.id, name, "");
    if (f) {
      setActiveFileId(f.id);
      appendLog(`File created: ${project.name}/${name}`);
    }
    setNewFileName("");
    setAddingFile(false);
  };

  const copyToClipboard = async (txt: string) => {
    try {
      await navigator.clipboard.writeText(txt);
      toast("📋 Copied to clipboard");
    } catch {
      toast.error("Copy failed");
    }
  };

  const downloadFile = (f: ProjectFile) => {
    const blob = new Blob([f.content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = f.path.split("/").pop() ?? "file.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      {/* Header bar */}
      <div
        className="flex items-center gap-3 px-4 py-2 font-mono"
        style={{ background: "#0a0a0a", borderBottom: "1px solid #1a1a1a" }}
      >
        <button
          type="button"
          onClick={onBack}
          className="text-[11px] tracking-[0.15em] px-2 py-1 rounded border"
          style={{ borderColor: "#333", color: "#888" }}
        >
          ← PROJECTS
        </button>
        <span className="text-xl">{project.emoji}</span>
        <span className="text-[13px]" style={{ color: "#eee" }}>
          {project.name}
        </span>
        <span
          className="text-[9px] tracking-[0.15em] px-2 py-0.5 rounded"
          style={{
            background: `${status.color}22`,
            color: status.color,
            border: `1px solid ${status.color}55`,
          }}
        >
          {status.label}
        </span>
        {project.targetUrl && (
          <a
            href={project.targetUrl}
            target="_blank"
            rel="noreferrer"
            className="text-[10px] underline ml-auto"
            style={{ color: "#00bfff" }}
          >
            🌐 {project.targetUrl}
          </a>
        )}
      </div>

      {/* Mobile tab switcher */}
      <div
        className="md:hidden flex gap-1 px-3 py-1 font-mono"
        style={{ background: "#080808", borderBottom: "1px solid #1a1a1a" }}
      >
        {(["files", "code", "screens"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="text-[10px] px-2 py-1 rounded uppercase tracking-[0.15em]"
            style={{
              background: tab === t ? "#ffaa0022" : "transparent",
              color: tab === t ? "#ffaa00" : "#666",
            }}
          >
            {t === "files" ? "📂 Files" : t === "code" ? "💻 Code" : "📸 Assets"}
          </button>
        ))}
      </div>

      <div className="flex flex-1 min-h-0">
        {/* LEFT — File tree */}
        <div
          className={`${tab === "files" ? "flex" : "hidden"} md:flex flex-col`}
          style={{ width: 220, background: "#080808", borderRight: "1px solid #1a1a1a" }}
        >
          <div
            className="px-3 py-2 font-mono text-[10px] tracking-[0.15em]"
            style={{ color: "#777", borderBottom: "1px solid #1a1a1a" }}
          >
            📂 {slugify(project.name)}/
          </div>
          <div className="flex-1 overflow-y-auto py-1">
            {files.length === 0 && (
              <div className="px-3 py-4 text-[10px] font-mono" style={{ color: "#444" }}>
                No files yet.
              </div>
            )}
            {files.map((f) => {
              const meta = fileIcon(f.language);
              const isActive = f.id === activeFileId;
              return (
                <div
                  key={f.id}
                  onClick={() => {
                    setActiveFileId(f.id);
                    setTab("code");
                  }}
                  className="group flex items-center gap-2 px-3 py-1 cursor-pointer font-mono text-[11px]"
                  style={{
                    background: isActive ? "#ffaa0014" : "transparent",
                    borderLeft: isActive ? "2px solid #ffaa00" : "2px solid transparent",
                    color: isActive ? "#ffaa00" : "#aaa",
                  }}
                >
                  <span style={{ color: meta.color }}>{meta.icon}</span>
                  <span className="truncate flex-1">{f.path}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm(`Delete ${f.path}?`)) {
                        deleteFile(project.id, f.id);
                        appendLog(`File deleted: ${project.name}/${f.path}`);
                      }
                    }}
                    className="opacity-0 group-hover:opacity-100 text-[10px] px-1"
                    style={{ color: "#ff8a8a" }}
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
          <div style={{ borderTop: "1px solid #1a1a1a" }} className="p-2">
            {addingFile ? (
              <div className="flex gap-1">
                <input
                  autoFocus
                  value={newFileName}
                  onChange={(e) => setNewFileName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") onAddFile();
                    if (e.key === "Escape") {
                      setAddingFile(false);
                      setNewFileName("");
                    }
                  }}
                  placeholder="index.html"
                  className="flex-1 bg-background border border-border rounded px-1 py-0.5 text-[11px] font-mono"
                />
                <button
                  type="button"
                  onClick={onAddFile}
                  className="px-2 py-0.5 rounded text-[10px] font-mono"
                  style={{ background: "#ffaa00", color: "#000" }}
                >
                  ADD
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setAddingFile(true)}
                className="w-full px-2 py-1 rounded border font-mono text-[10px] tracking-[0.15em]"
                style={{ borderColor: "#333", color: "#aaa" }}
              >
                + ADD FILE
              </button>
            )}
          </div>
        </div>

        {/* CENTER — Code viewer */}
        <div
          className={`${tab === "code" ? "flex" : "hidden"} md:flex flex-col flex-1 min-w-0`}
        >
          {activeFile ? (
            <>
              <div
                className="flex items-center gap-2 px-3 py-2 font-mono text-[11px]"
                style={{ background: "#0a0a0a", borderBottom: "1px solid #1a1a1a" }}
              >
                <span style={{ color: fileIcon(activeFile.language).color }}>
                  {fileIcon(activeFile.language).icon}
                </span>
                <span style={{ color: "#eee" }}>{activeFile.path}</span>
                <span style={{ color: "#555" }}>· {formatBytes(activeFile.size)}</span>
                <div className="ml-auto flex gap-2">
                  <button
                    type="button"
                    onClick={() => copyToClipboard(activeFile.content)}
                    className="px-2 py-1 rounded border text-[10px] tracking-[0.15em]"
                    style={{ borderColor: "#333", color: "#aaa" }}
                  >
                    📋 COPY
                  </button>
                  <button
                    type="button"
                    onClick={() => downloadFile(activeFile)}
                    className="px-2 py-1 rounded border text-[10px] tracking-[0.15em]"
                    style={{ borderColor: "#333", color: "#aaa" }}
                  >
                    💾 DOWNLOAD
                  </button>
                  <button
                    type="button"
                    onClick={() => onEditInAgent(activeFile.path, activeFile.content)}
                    className="px-2 py-1 rounded text-[10px] tracking-[0.15em]"
                    style={{ background: "#ffaa00", color: "#000" }}
                  >
                    ✏ EDIT IN AGENT
                  </button>
                </div>
              </div>
              <div className="flex-1 min-h-0">
                <CodeViewer code={activeFile.content || "(empty file)"} language={activeFile.language} />
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center font-mono text-[12px]" style={{ color: "#444" }}>
              Select a file or add one to get started.
            </div>
          )}
        </div>

        {/* RIGHT — Screenshots & audits */}
        <div
          className={`${tab === "screens" ? "flex" : "hidden"} md:flex flex-col`}
          style={{ width: 240, background: "#080808", borderLeft: "1px solid #1a1a1a" }}
        >
          <div
            className="px-3 py-2 font-mono text-[10px] tracking-[0.15em]"
            style={{ color: "#777", borderBottom: "1px solid #1a1a1a" }}
          >
            📸 SCREENSHOTS
          </div>
          <div className="p-2 grid grid-cols-2 gap-2">
            {project.screenshots.length === 0 && (
              <div className="col-span-2 text-[10px] font-mono py-3 text-center" style={{ color: "#444" }}>
                None yet
              </div>
            )}
            {project.screenshots.map((s) => (
              <div
                key={s.id}
                className="group relative aspect-video rounded flex items-center justify-center cursor-pointer"
                style={{ background: "#1a1a1a", border: "1px solid #222" }}
                title={s.label}
              >
                <span style={{ color: "#444", fontSize: 22 }}>🌐</span>
                <span
                  className="absolute bottom-1 left-1 right-1 truncate text-[8px] font-mono"
                  style={{ color: "#777" }}
                >
                  {relativeTime(s.takenAt)}
                </span>
                <span
                  className="absolute inset-0 hidden group-hover:flex items-center justify-center text-[10px] font-mono"
                  style={{ background: "#000000cc", color: "#ffaa00" }}
                >
                  View Full
                </span>
              </div>
            ))}
          </div>

          <div
            className="px-3 py-2 font-mono text-[10px] tracking-[0.15em] mt-2"
            style={{ color: "#777", borderTop: "1px solid #1a1a1a", borderBottom: "1px solid #1a1a1a" }}
          >
            📊 AUDIT REPORTS
          </div>
          <div className="p-2 flex flex-col gap-1">
            {project.audits.length === 0 && (
              <div className="text-[10px] font-mono py-2 text-center" style={{ color: "#444" }}>
                None yet
              </div>
            )}
            {project.audits.map((a) => {
              const c = a.score >= 90 ? "#39ff14" : a.score >= 70 ? "#ffaa00" : "#ff3b3b";
              const dot = a.score >= 90 ? "🟢" : a.score >= 70 ? "🟡" : "🔴";
              return (
                <div
                  key={a.id}
                  className="rounded px-2 py-1 font-mono text-[10px]"
                  style={{ background: "#0c0c0c", border: `1px solid ${c}33` }}
                >
                  <span style={{ color: c }}>
                    {dot} {labelForCategory(a.category)}: {a.score}/100
                  </span>
                  <span style={{ color: "#666" }}> · {relativeTime(a.takenAt)}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function labelForCategory(c: string): string {
  switch (c) {
    case "performance":
      return "Performance";
    case "seo":
      return "SEO";
    case "accessibility":
      return "Accessibility";
    case "best_practices":
      return "Best Practices";
    default:
      return c;
  }
}
