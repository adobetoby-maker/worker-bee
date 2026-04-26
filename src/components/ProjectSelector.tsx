import { useEffect, useState } from "react";

interface Project {
  name: string;
  path?: string;
}

interface ProjectSelectorProps {
  selectedProject: string | null;
  onProjectChange: (project: string) => void;
  /** Optional: override the agent base URL. Defaults to http://localhost:8001 */
  agentUrl?: string;
}

export function ProjectSelector({
  selectedProject,
  onProjectChange,
  agentUrl = "http://localhost:8001",
}: ProjectSelectorProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`${agentUrl}/api/projects`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        if (cancelled) return;
        setProjects(Array.isArray(data?.projects) ? data.projects : []);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("Failed to load projects:", err);
        setError(err?.message ?? "Failed to load projects");
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [agentUrl]);

  return (
    <div className="mb-4">
      <label
        className="block mb-2"
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 10,
          color: "var(--muted-foreground)",
          textTransform: "uppercase",
          letterSpacing: "0.15em",
        }}
      >
        Current Project
      </label>

      {loading ? (
        <div
          className="w-full"
          style={{
            padding: "10px 12px",
            background: "var(--background)",
            color: "var(--muted-foreground)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 12,
          }}
        >
          Loading projects…
        </div>
      ) : (
        <select
          value={selectedProject ?? ""}
          onChange={(e) => onProjectChange(e.target.value)}
          className="w-full transition-colors"
          style={{
            padding: "10px 12px",
            background: "var(--background)",
            color: "var(--foreground)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 12,
            outline: "none",
          }}
        >
          <option value="">Select a project…</option>
          {projects.map((p) => (
            <option key={p.name} value={p.name}>
              {p.name}
            </option>
          ))}
        </select>
      )}

      {error && (
        <div
          className="mt-2"
          style={{
            padding: "8px 10px",
            background: "color-mix(in oklab, var(--destructive) 12%, transparent)",
            color: "var(--destructive)",
            border: "1px solid var(--destructive)",
            borderRadius: 6,
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 11,
          }}
        >
          Couldn't reach agent: {error}
        </div>
      )}

      {selectedProject && (
        <div
          className="mt-3"
          style={{
            padding: "10px 12px",
            background: "color-mix(in oklab, var(--primary) 10%, transparent)",
            borderLeft: "4px solid var(--primary)",
            borderRadius: 6,
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 12,
            color: "var(--foreground)",
          }}
        >
          <span style={{ fontWeight: 600 }}>Building in:</span>{" "}
          <code
            style={{
              background: "color-mix(in oklab, var(--primary) 18%, transparent)",
              padding: "1px 6px",
              borderRadius: 4,
              color: "var(--primary)",
            }}
          >
            {selectedProject}
          </code>
        </div>
      )}
    </div>
  );
}
