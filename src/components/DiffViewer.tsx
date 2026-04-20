import { forwardRef, useMemo, useRef } from "react";
import { diffLines, type DiffRow, type WordSeg } from "@/lib/diff";

interface Props {
  filename: string;
  before: string;
  after: string;
  onAccept: (newContent: string) => void;
  onReject: () => void;
  onBack: () => void;
}

export function DiffViewer({ filename, before, after, onAccept, onReject, onBack }: Props) {
  const { rows, summary } = useMemo(() => diffLines(before, after), [before, after]);
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  const lockRef = useRef(false);

  const beforeLineCount = before.split("\n").length;
  const afterLineCount = after.split("\n").length;

  const syncScroll = (source: "left" | "right") => {
    const src = source === "left" ? leftRef.current : rightRef.current;
    const dst = source === "left" ? rightRef.current : leftRef.current;
    if (!src || !dst) return;
    if (lockRef.current) return;
    lockRef.current = true;
    dst.scrollTop = src.scrollTop;
    requestAnimationFrame(() => {
      lockRef.current = false;
    });
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col" style={{ background: "#050505" }}>
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-2 font-mono"
        style={{ background: "#0a0a0a", borderBottom: "1px solid #1a1a1a" }}
      >
        <div className="text-[13px] tracking-[0.15em]" style={{ color: "#ffaa00" }}>
          ↔ CODE DIFF — {filename}
        </div>
        <div className="ml-auto flex gap-2">
          <button
            type="button"
            onClick={() => onAccept(after)}
            className="px-3 py-1.5 rounded font-mono text-[11px] tracking-[0.15em]"
            style={{ background: "#39ff14", color: "#001a00" }}
          >
            ✅ ACCEPT CHANGES
          </button>
          <button
            type="button"
            onClick={onReject}
            className="px-3 py-1.5 rounded border font-mono text-[11px] tracking-[0.15em]"
            style={{ borderColor: "#333", color: "#aaa" }}
          >
            ✖ REJECT
          </button>
          <button
            type="button"
            onClick={onBack}
            className="px-3 py-1.5 rounded border font-mono text-[11px] tracking-[0.15em]"
            style={{ borderColor: "#222", color: "#666" }}
          >
            ← BACK TO CHAT
          </button>
        </div>
      </div>

      {/* Summary */}
      <div
        className="flex items-center gap-4 px-4 py-1.5 font-mono text-[11px]"
        style={{ background: "#080808", borderBottom: "1px solid #1a1a1a" }}
      >
        <span style={{ color: "#39ff14" }}>✚ {summary.additions} additions</span>
        <span style={{ color: "#ff6b6b" }}>✖ {summary.removals} removals</span>
        <span style={{ color: "#ffaa00" }}>~ {summary.changed} changed lines</span>
      </div>

      {/* Two columns */}
      <div className="flex flex-1 min-h-0">
        <DiffColumn
          ref={leftRef}
          side="left"
          title="BEFORE"
          titleColor="#555"
          filename={filename}
          lineCount={beforeLineCount}
          rows={rows}
          background="#0a0a0a"
          onScroll={() => syncScroll("left")}
        />
        <DiffColumn
          ref={rightRef}
          side="right"
          title="AFTER"
          titleColor="#39ff14"
          filename={filename}
          lineCount={afterLineCount}
          rows={rows}
          background="#0d0d0d"
          onScroll={() => syncScroll("right")}
        />
      </div>
    </div>
  );
}

interface ColumnProps {
  side: "left" | "right";
  title: string;
  titleColor: string;
  filename: string;
  lineCount: number;
  rows: DiffRow[];
  background: string;
  onScroll: () => void;
}

const DiffColumn = forwardRef<HTMLDivElement, ColumnProps>(function DiffCol(
  { side, title, titleColor, filename, lineCount, rows, background, onScroll },
  ref,
) {
  return (
    <div className="flex flex-col flex-1 min-w-0" style={{ background }}>
      <div
        className="px-3 py-1.5 font-mono text-[10px] tracking-[0.15em] flex items-center gap-2"
        style={{ borderBottom: "1px solid #1a1a1a" }}
      >
        <span style={{ color: titleColor }}>{title}</span>
        <span style={{ color: "#666" }}>· {filename}</span>
        <span className="ml-auto" style={{ color: "#444" }}>
          {lineCount} lines
        </span>
      </div>
      <div ref={ref} onScroll={onScroll} className="flex-1 overflow-auto">
        <table style={{ borderCollapse: "collapse", width: "100%" }}>
          <tbody>
            {rows.map((r, i) => (
              <DiffRowCell key={i} row={r} side={side} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
});

function DiffRowCell({ row, side }: { row: DiffRow; side: "left" | "right" }) {
  let bg = "transparent";
  let gutterColor = "#333";
  let marker = " ";
  let textColor = "#888";
  let text: string | undefined;
  let lineNo: number | undefined;
  let segments: WordSeg[] | undefined;

  if (side === "left") {
    text = row.left;
    lineNo = row.leftNo;
    segments = row.leftSegments;
    if (row.op === "remove") {
      bg = "#1a0000";
      gutterColor = "#ff6b6b";
      marker = "−";
      textColor = "#ff6b6b";
    } else if (row.op === "change") {
      bg = "#1a0000";
      gutterColor = "#ff6b6b";
      marker = "~";
      textColor = "#ff9b9b";
    } else if (row.op === "add") {
      bg = "#001a0044";
      text = "";
      lineNo = undefined;
    }
  } else {
    text = row.right;
    lineNo = row.rightNo;
    segments = row.rightSegments;
    if (row.op === "add") {
      bg = "#001a00";
      gutterColor = "#39ff14";
      marker = "+";
      textColor = "#39ff14";
    } else if (row.op === "change") {
      bg = "#001a00";
      gutterColor = "#39ff14";
      marker = "~";
      textColor = "#9bff9b";
    } else if (row.op === "remove") {
      bg = "#1a000044";
      text = "";
      lineNo = undefined;
    }
  }

  return (
    <tr style={{ background: bg }}>
      <td
        className="select-none text-right pr-2 pl-2 align-top font-mono text-[11px]"
        style={{ color: gutterColor, width: 44, borderRight: "1px solid #151515" }}
      >
        {lineNo ?? ""}
      </td>
      <td
        className="select-none text-center align-top font-mono text-[11px]"
        style={{ color: gutterColor, width: 16 }}
      >
        {marker}
      </td>
      <td className="px-2 align-top font-mono text-[12px] whitespace-pre" style={{ color: textColor }}>
        {row.op === "change" && segments ? (
          segments.map((s, i) => (
            <span
              key={i}
              style={
                s.changed
                  ? side === "left"
                    ? { background: "#5a0000", color: "#ffd0d0" }
                    : { background: "#003a00", color: "#d4ffd4" }
                  : undefined
              }
            >
              {s.text}
            </span>
          ))
        ) : text === "" || text === undefined ? (
          "\u00A0"
        ) : (
          text
        )}
      </td>
    </tr>
  );
}
