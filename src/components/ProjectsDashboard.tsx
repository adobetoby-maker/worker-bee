import { useEffect, useRef, useState } from "react";
import {
  subscribeProjects,
  deleteProject,
  updateProject,
  relativeTime,
  STATUS_META,
  type Project,
} from "@/lib/projects";
import { NewProjectModal } from "./NewProjectModal";
import { GithubSyncIndicator } from "./GithubSyncIndicator";

interface Props {
  tabs: { id: string; name: string }[];
  onOpenProject: (id: string) => void;
  appendLog: (msg: string) => void;
}

export function ProjectsDashboard({ tabs, onOpenProject, appendLog }: Props) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const renameRef = useRef<HTMLInputElement>(null);

  useEffect(() => subscribeProjects(setProjects), []);
  useEffect(() => {
    if (renamingId && renameRef.current) {
      renameRef.current.focus();
      renameRef.current.select();
    }
  }, [renamingId]);
  useEffect(() => {
    const onDown = () => setMenuOpenId(null);
    if (menuOpenId) {
      document.addEventListener("click", onDown);
      return () => document.removeEventListener("click", onDown);
    }
  }, [menuOpenId]);

  const visible = projects.filter((p) => !p.archived);

  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-6">
      <GithubSyncIndicator />
      <div className="flex items-start justify-between mb-2">
        <div>
          <h2
            className="font-mono tracking-[0.18em] mb-1"
            style={{ color: "#ffaa00", fontSize: 18 }}
          >
            📂 MY HIVE PROJECTS
          </h2>
          <p
            className="font-sans text-[12px]"
            style={{ color: "#888" }}
          >
            Every website you build, organized in one place.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="font-mono text-[11px] tracking-[0.15em] px-3 py-2 rounded"
          style={{ background: "#ffaa00", color: "#000" }}
        >
          + NEW PROJECT
        </button>
      </div>

      {visible.length === 0 ? (
        <div
          className="text-center py-16 font-mono text-[12px]"
          style={{ color: "#444" }}
        >
          🐝 No projects yet — create your first build.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          {visible.map((p) => {
            const status = STATUS_META[p.status];
            const activeTabName = p.assignedTabId
              ? tabs.find((t) => t.id === p.assignedTabId)?.name
              : null;
            return (
              <div
                key={p.id}
                onClick={() => onOpenProject(p.id)}
                className="relative cursor-pointer rounded-lg p-4 transition hover:border-primary/60"
                style={{
                  background: "#0a0a0a",
                  border: "1px solid #1a1a1a",
                  borderLeft: `3px solid ${status.color}`,
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-2xl">{p.emoji}</span>
                    {renamingId === p.id ? (
                      <input
                        ref={renameRef}
                        value={renameDraft}
                        onChange={(e) => setRenameDraft(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        onBlur={() => {
                          if (renameDraft.trim()) updateProject(p.id, { name: renameDraft.trim() });
                          setRenamingId(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            (e.target as HTMLInputElement).blur();
                          } else if (e.key === "Escape") {
                            setRenamingId(null);
                          }
                        }}
                        className="bg-background border border-primary/60 rounded px-2 py-0.5 text-[13px] font-mono text-foreground min-w-0"
                      />
                    ) : (
                      <div
                        className="font-mono text-[13px] truncate"
                        style={{ color: "#eee" }}
                      >
                        {p.name}
                      </div>
                    )}
                  </div>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpenId(menuOpenId === p.id ? null : p.id);
                      }}
                      className="text-[14px] px-1.5"
                      style={{ color: "#666" }}
                    >
                      ⋯
                    </button>
                    {menuOpenId === p.id && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="absolute right-0 top-full mt-1 z-30 rounded border"
                        style={{
                          background: "#0a0a0a",
                          borderColor: "#333",
                          minWidth: 140,
                        }}
                      >
                        <MenuItem
                          onClick={() => {
                            setRenamingId(p.id);
                            setRenameDraft(p.name);
                            setMenuOpenId(null);
                          }}
                        >
                          ✏ Rename
                        </MenuItem>
                        <MenuItem
                          onClick={() => {
                            updateProject(p.id, { archived: true });
                            appendLog(`Project '${p.name}' archived`);
                            setMenuOpenId(null);
                          }}
                        >
                          📦 Archive
                        </MenuItem>
                        <MenuItem
                          danger
                          onClick={() => {
                            if (window.confirm(`Delete project '${p.name}'?`)) {
                              deleteProject(p.id);
                              appendLog(`Project '${p.name}' deleted`);
                            }
                            setMenuOpenId(null);
                          }}
                        >
                          🗑 Delete
                        </MenuItem>
                      </div>
                    )}
                  </div>
                </div>

                <div
                  className="inline-block mt-2 font-mono text-[9px] tracking-[0.15em] px-2 py-0.5 rounded"
                  style={{
                    background: `${status.color}22`,
                    color: status.color,
                    border: `1px solid ${status.color}55`,
                  }}
                >
                  {status.label}
                </div>

                <div
                  className="font-mono text-[10px] mt-3"
                  style={{ color: "#777" }}
                >
                  Last updated: {relativeTime(p.updatedAt)}
                </div>
                <div
                  className="font-mono text-[10px] mt-1"
                  style={{ color: "#666" }}
                >
                  {p.files.length} file{p.files.length === 1 ? "" : "s"} · {p.screenshots.length} screenshot{p.screenshots.length === 1 ? "" : "s"}
                </div>
                {activeTabName && (
                  <div
                    className="font-mono text-[10px] mt-2"
                    style={{ color: "#39ff14" }}
                  >
                    🐝 {activeTabName} working...
                  </div>
                )}
                {p.targetUrl && (
                  <div
                    className="font-mono text-[10px] mt-2 truncate"
                    style={{ color: "#00bfff" }}
                  >
                    🌐 {p.targetUrl}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <NewProjectModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        tabs={tabs}
        onCreated={(_id, name) => {
          setModalOpen(false);
          appendLog(`Project '${name}' created`);
        }}
      />
    </div>
  );
}

function MenuItem({
  children,
  onClick,
  danger = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left px-3 py-2 font-mono text-[11px] hover:bg-primary/10"
      style={{ color: danger ? "#ff8a8a" : "#ddd" }}
    >
      {children}
    </button>
  );
}
