import { useEffect, useMemo, useRef, useState } from "react";
import { BeeLogo } from "./BeeLogo";
import {
  BlueprintClient,
  type BlueprintInbound,
  type BlueprintPath,
  type BlueprintPathsPayload,
  type BlueprintStatus,
} from "@/lib/blueprint-ws";

type Stage = "idea" | "generating" | "paths";

const COMPLEXITY_COLOR: Record<BlueprintPath["complexity"], string> = {
  Simple: "#39ff14",
  Moderate: "#ffaa00",
  Complex: "#ff6b35",
};

const FONT_MONO = "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace";
const FONT_BODY = "'IBM Plex Sans', system-ui, -apple-system, Segoe UI, Roboto, sans-serif";

const DEFAULT_FEATURES = [
  "User accounts",
  "Realtime updates",
  "AI assistance",
  "File uploads",
  "Notifications",
  "Dashboard",
  "Public sharing",
  "Payments",
];

export function BlueprintView() {
  const [stage, setStage] = useState<Stage>("idea");
  const [status, setStatus] = useState<BlueprintStatus>("idle");
  const [idea, setIdea] = useState("");
  const [features, setFeatures] = useState<string[]>([]);
  const [customFeature, setCustomFeature] = useState("");
  const [paths, setPaths] = useState<BlueprintPathsPayload | null>(null);
  const [selectedPathId, setSelectedPathId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const clientRef = useRef<BlueprintClient | null>(null);

  useEffect(() => {
    const client = new BlueprintClient({
      onStatus: (s) => setStatus(s),
      onMessage: (m: BlueprintInbound) => {
        switch (m.type) {
          case "blueprint_ready":
            setErrorMsg(null);
            break;
          case "blueprint_generating":
            setStage("generating");
            setErrorMsg(null);
            break;
          case "blueprint_paths":
            setPaths(m.data);
            setSelectedPathId(m.data.recommended ?? m.data.paths[0]?.id ?? null);
            setStage("paths");
            break;
          case "blueprint_error":
            setErrorMsg(m.message || "Blueprint error");
            setStage("idea");
            break;
        }
      },
    });
    clientRef.current = client;
    client.connect();
    return () => {
      client.close();
      clientRef.current = null;
    };
  }, []);

  const allFeatures = useMemo(() => {
    const set = new Set<string>(DEFAULT_FEATURES);
    features.forEach((f) => set.add(f));
    return Array.from(set);
  }, [features]);

  function toggleFeature(f: string) {
    setFeatures((prev) => (prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]));
  }

  function addCustomFeature() {
    const v = customFeature.trim();
    if (!v) return;
    setFeatures((prev) => (prev.includes(v) ? prev : [...prev, v]));
    setCustomFeature("");
  }

  function askBee() {
    setErrorMsg(null);
    if (!idea.trim()) {
      setErrorMsg("Describe your core idea first.");
      return;
    }
    const sent = clientRef.current?.requestPaths(idea.trim(), features);
    if (!sent) {
      setErrorMsg("Blueprint server is not connected yet — try again in a moment.");
      return;
    }
    setStage("generating");
  }

  function reset() {
    setStage("idea");
    setPaths(null);
    setSelectedPathId(null);
  }

  return (
    <div
      className="flex flex-col h-full min-h-0 overflow-y-auto"
      style={{
        background: "var(--background)",
        color: "var(--foreground)",
        fontFamily: FONT_BODY,
      }}
    >
      <header
        className="flex items-center justify-between px-6 py-4"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <div className="flex items-center gap-3">
          <span style={{ fontSize: 22 }}>🗺</span>
          <div>
            <div
              style={{
                fontFamily: FONT_MONO,
                letterSpacing: "0.18em",
                fontSize: 12,
                color: "var(--muted-foreground)",
              }}
            >
              BLUEPRINT
            </div>
            <div style={{ fontSize: 18, fontWeight: 600 }}>Map a path before you build</div>
          </div>
        </div>
        <div
          style={{
            fontFamily: FONT_MONO,
            fontSize: 11,
            letterSpacing: "0.16em",
            color:
              status === "open"
                ? "var(--success, #39ff14)"
                : status === "error"
                  ? "#ff3b3b"
                  : "var(--muted-foreground)",
          }}
        >
          ● {status.toUpperCase()}
        </div>
      </header>

      <div className="flex-1 px-6 py-6 max-w-[960px] w-full self-center">
        {stage === "idea" && (
          <IdeaStage
            idea={idea}
            setIdea={setIdea}
            features={features}
            allFeatures={allFeatures}
            toggleFeature={toggleFeature}
            customFeature={customFeature}
            setCustomFeature={setCustomFeature}
            addCustomFeature={addCustomFeature}
            errorMsg={errorMsg}
            onAsk={askBee}
          />
        )}

        {stage === "generating" && <GeneratingStage />}

        {stage === "paths" && paths && (
          <PathsStage
            paths={paths}
            selectedPathId={selectedPathId}
            onSelect={setSelectedPathId}
            onBack={reset}
          />
        )}
      </div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontFamily: FONT_MONO,
        letterSpacing: "0.18em",
        fontSize: 11,
        color: "var(--muted-foreground)",
        textTransform: "uppercase",
        marginBottom: 8,
      }}
    >
      {children}
    </div>
  );
}

function IdeaStage(props: {
  idea: string;
  setIdea: (v: string) => void;
  features: string[];
  allFeatures: string[];
  toggleFeature: (f: string) => void;
  customFeature: string;
  setCustomFeature: (v: string) => void;
  addCustomFeature: () => void;
  errorMsg: string | null;
  onAsk: () => void;
}) {
  const {
    idea,
    setIdea,
    features,
    allFeatures,
    toggleFeature,
    customFeature,
    setCustomFeature,
    addCustomFeature,
    errorMsg,
    onAsk,
  } = props;

  return (
    <div className="flex flex-col gap-6">
      <section>
        <Label>Your core idea</Label>
        <textarea
          value={idea}
          onChange={(e) => setIdea(e.target.value)}
          rows={5}
          placeholder="In one paragraph: what are you trying to build, and for whom?"
          style={{
            width: "100%",
            background: "var(--surface, var(--card))",
            color: "var(--foreground)",
            border: "1px solid var(--border)",
            borderRadius: 10,
            padding: 14,
            fontFamily: FONT_BODY,
            fontSize: 14,
            lineHeight: 1.5,
            resize: "vertical",
            outline: "none",
          }}
        />
      </section>

      <section>
        <Label>Features you want</Label>
        <div className="flex flex-wrap gap-2">
          {allFeatures.map((f) => {
            const on = features.includes(f);
            return (
              <button
                key={f}
                type="button"
                onClick={() => toggleFeature(f)}
                style={{
                  fontFamily: FONT_MONO,
                  fontSize: 11,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  padding: "8px 12px",
                  borderRadius: 999,
                  border: on ? "1px solid var(--primary)" : "1px solid var(--border)",
                  background: on ? "color-mix(in oklab, var(--primary) 18%, transparent)" : "transparent",
                  color: on ? "var(--primary)" : "var(--muted-foreground)",
                  cursor: "pointer",
                  transition: "all 120ms ease",
                }}
              >
                {on ? "✓ " : "+ "}
                {f}
              </button>
            );
          })}
        </div>
        <div className="flex gap-2 mt-3">
          <input
            value={customFeature}
            onChange={(e) => setCustomFeature(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addCustomFeature();
              }
            }}
            placeholder="Add your own…"
            style={{
              flex: 1,
              background: "var(--surface, var(--card))",
              color: "var(--foreground)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              padding: "8px 12px",
              fontFamily: FONT_BODY,
              fontSize: 13,
              outline: "none",
            }}
          />
          <button
            type="button"
            onClick={addCustomFeature}
            style={{
              fontFamily: FONT_MONO,
              fontSize: 11,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              padding: "8px 14px",
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: "transparent",
              color: "var(--foreground)",
              cursor: "pointer",
            }}
          >
            + Add
          </button>
        </div>
      </section>

      {errorMsg && (
        <div
          style={{
            fontFamily: FONT_MONO,
            fontSize: 12,
            color: "#ff3b3b",
            border: "1px solid color-mix(in oklab, #ff3b3b 40%, transparent)",
            background: "color-mix(in oklab, #ff3b3b 8%, transparent)",
            borderRadius: 8,
            padding: "8px 12px",
          }}
        >
          {errorMsg}
        </div>
      )}

      <button
        type="button"
        onClick={onAsk}
        style={{
          width: "100%",
          padding: "16px 20px",
          borderRadius: 12,
          border: "1px solid color-mix(in oklab, var(--primary) 60%, transparent)",
          background:
            "linear-gradient(135deg, var(--primary), color-mix(in oklab, var(--primary) 60%, var(--success, #39ff14)))",
          color: "var(--primary-foreground, #0b0b0b)",
          fontFamily: FONT_MONO,
          fontSize: 13,
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          cursor: "pointer",
          boxShadow: "0 10px 30px -10px color-mix(in oklab, var(--primary) 60%, transparent)",
        }}
      >
        🐝 Ask Bee for a path →
      </button>
    </div>
  );
}

function GeneratingStage() {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-6">
      <BeeLogo size={88} streaming />
      <div
        style={{
          fontFamily: FONT_MONO,
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          fontSize: 12,
          color: "var(--muted-foreground)",
        }}
      >
        Bee is thinking…
      </div>
    </div>
  );
}

function PathsStage(props: {
  paths: BlueprintPathsPayload;
  selectedPathId: string | null;
  onSelect: (id: string) => void;
  onBack: () => void;
}) {
  const { paths, selectedPathId, onSelect, onBack } = props;
  const selected = paths.paths.find((p) => p.id === selectedPathId) ?? null;

  return (
    <div className="flex flex-col gap-6">
      {paths.bee_note && (
        <div
          style={{
            border: "1px solid var(--border)",
            background: "var(--surface, var(--card))",
            borderRadius: 12,
            padding: "14px 16px",
            fontFamily: FONT_BODY,
            fontSize: 14,
            lineHeight: 1.55,
          }}
        >
          <div
            style={{
              fontFamily: FONT_MONO,
              fontSize: 11,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "var(--muted-foreground)",
              marginBottom: 6,
            }}
          >
            🐝 Bee’s note
          </div>
          {paths.bee_note}
        </div>
      )}

      <div
        className="grid gap-4"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}
      >
        {paths.paths.map((p) => (
          <PathCard
            key={p.id}
            path={p}
            recommended={p.id === paths.recommended}
            selected={p.id === selectedPathId}
            onClick={() => onSelect(p.id)}
          />
        ))}
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          style={{
            padding: "10px 16px",
            borderRadius: 8,
            border: "1px solid var(--border)",
            background: "transparent",
            color: "var(--muted-foreground)",
            fontFamily: FONT_MONO,
            fontSize: 11,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            cursor: "pointer",
          }}
        >
          ← Back to idea
        </button>
      </div>

      <button
        type="button"
        disabled={!selected}
        onClick={() => {
          if (!selected) return;
          // Confirm action — host integration left to consumer; emit a console marker.
          // eslint-disable-next-line no-console
          console.info("[blueprint] confirm path", selected);
        }}
        style={{
          width: "100%",
          padding: "16px 20px",
          borderRadius: 12,
          border: "1px solid color-mix(in oklab, var(--primary) 60%, transparent)",
          background:
            "linear-gradient(135deg, var(--primary), color-mix(in oklab, var(--primary) 50%, var(--success, #39ff14)))",
          color: "var(--primary-foreground, #0b0b0b)",
          fontFamily: FONT_MONO,
          fontSize: 13,
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          cursor: selected ? "pointer" : "not-allowed",
          opacity: selected ? 1 : 0.5,
          boxShadow: "0 10px 30px -10px color-mix(in oklab, var(--primary) 60%, transparent)",
        }}
      >
        Use this path → Start mapping 🗺
      </button>
    </div>
  );
}

function PathCard(props: {
  path: BlueprintPath;
  recommended: boolean;
  selected: boolean;
  onClick: () => void;
}) {
  const { path, recommended, selected, onClick } = props;
  const cx = COMPLEXITY_COLOR[path.complexity];

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        textAlign: "left",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        padding: 16,
        borderRadius: 14,
        border: selected ? "2px solid var(--primary)" : "1px solid var(--border)",
        background: "var(--surface, var(--card))",
        cursor: "pointer",
        position: "relative",
        transition: "border-color 120ms ease, transform 120ms ease",
      }}
    >
      {recommended && (
        <span
          style={{
            position: "absolute",
            top: -10,
            left: 14,
            fontFamily: FONT_MONO,
            fontSize: 10,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            padding: "4px 8px",
            borderRadius: 999,
            background: "var(--primary)",
            color: "var(--primary-foreground, #0b0b0b)",
            border: "1px solid color-mix(in oklab, var(--primary) 60%, transparent)",
          }}
        >
          🐝 Bee Recommends
        </span>
      )}

      <div className="flex items-start justify-between gap-3">
        <div>
          <div style={{ fontSize: 16, fontWeight: 600 }}>{path.name}</div>
          <div
            style={{
              fontFamily: FONT_BODY,
              fontSize: 13,
              color: "var(--muted-foreground)",
              marginTop: 2,
            }}
          >
            {path.tagline}
          </div>
        </div>
        <span
          style={{
            fontFamily: FONT_MONO,
            fontSize: 10,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            padding: "4px 8px",
            borderRadius: 6,
            color: cx,
            border: `1px solid ${cx}`,
            background: `color-mix(in oklab, ${cx} 12%, transparent)`,
            whiteSpace: "nowrap",
          }}
        >
          {path.complexity}
        </span>
      </div>

      {path.why_recommended && (
        <div style={{ fontFamily: FONT_BODY, fontSize: 13, lineHeight: 1.5 }}>
          {path.why_recommended}
        </div>
      )}

      {(path.pros?.length ?? 0) > 0 && (
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 4 }}>
          {path.pros.map((pro, i) => (
            <li key={i} style={{ fontFamily: FONT_BODY, fontSize: 13, color: "#39ff14" }}>
              + {pro}
            </li>
          ))}
        </ul>
      )}
      {(path.cons?.length ?? 0) > 0 && (
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 4 }}>
          {path.cons.map((con, i) => (
            <li key={i} style={{ fontFamily: FONT_BODY, fontSize: 13, color: "#ff3b3b" }}>
              − {con}
            </li>
          ))}
        </ul>
      )}

      <div
        className="flex items-center justify-between gap-3"
        style={{ marginTop: 4, paddingTop: 10, borderTop: "1px dashed var(--border)" }}
      >
        <div
          style={{
            fontFamily: FONT_MONO,
            fontSize: 11,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--muted-foreground)",
          }}
          title={path.tech_approach}
        >
          {path.tech_approach}
        </div>
        <div
          style={{
            fontFamily: FONT_MONO,
            fontSize: 11,
            letterSpacing: "0.12em",
            color: "var(--muted-foreground)",
          }}
        >
          ⏱ {path.time_estimate}
        </div>
      </div>
    </button>
  );
}