// Lightweight syntax-highlighted read-only code viewer with line numbers.
// No external deps — token regexes per language for the few colors we need.

interface Props {
  code: string;
  language: string;
}

const COLOR = {
  amber: "#ffaa00",
  blue: "#00bfff",
  green: "#39ff14",
  yellow: "#ffcc00",
  comment: "#555",
  string: "#39ff14",
  text: "#cccccc",
};

const JS_KEYWORDS = new Set([
  "const",
  "let",
  "var",
  "function",
  "return",
  "if",
  "else",
  "for",
  "while",
  "do",
  "switch",
  "case",
  "break",
  "continue",
  "new",
  "class",
  "extends",
  "import",
  "export",
  "from",
  "default",
  "async",
  "await",
  "try",
  "catch",
  "finally",
  "throw",
  "typeof",
  "instanceof",
  "in",
  "of",
  "true",
  "false",
  "null",
  "undefined",
]);

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function span(color: string, text: string): string {
  return `<span style="color:${color}">${escapeHtml(text)}</span>`;
}

function highlightHtml(line: string): string {
  // Comments
  if (line.trim().startsWith("<!--")) return span(COLOR.comment, line);
  // Tag matches: <tag ...>
  return line.replace(/(&lt;\/?)([a-zA-Z0-9-]+)|<(\/?[a-zA-Z0-9-]+)|"([^"]*)"/g, (m, _l, _t, _t2, str) => {
    if (str !== undefined) return span(COLOR.string, `"${str}"`);
    return m;
  }).replace(/<(\/?[a-zA-Z0-9-]+)/g, (_m, name) => `<span style="color:${COLOR.amber}">&lt;${escapeHtml(name)}</span>`)
    .replace(/&gt;/g, `<span style="color:${COLOR.amber}">&gt;</span>`);
}

function highlightCss(line: string): string {
  if (/^\s*\/\*/.test(line) || /\*\/\s*$/.test(line)) return span(COLOR.comment, line);
  // property: value;
  const m = line.match(/^(\s*)([a-zA-Z-]+)\s*:\s*(.+?);?\s*$/);
  if (m) {
    const [, indent, prop, value] = m;
    return `${escapeHtml(indent)}${span(COLOR.blue, prop)}: ${span(COLOR.string, value)};`;
  }
  // selector { or }
  if (/[{}]/.test(line)) {
    return line.replace(/[^{}\s]+/g, (s) => span(COLOR.amber, s)).replace(/[{}]/g, (b) => span(COLOR.text, b));
  }
  return escapeHtml(line);
}

function highlightJs(line: string): string {
  // Line comment
  const cmt = line.indexOf("//");
  if (cmt >= 0) {
    const before = line.slice(0, cmt);
    const comment = line.slice(cmt);
    return `${highlightJs(before)}${span(COLOR.comment, comment)}`;
  }
  // Strings (single/double/backtick)
  const tokens: string[] = [];
  let rest = line;
  let out = "";
  const stringRegex = /(["'`])(?:\\.|(?!\1).)*\1/g;
  let lastIdx = 0;
  let match: RegExpExecArray | null;
  while ((match = stringRegex.exec(rest))) {
    const before = rest.slice(lastIdx, match.index);
    out += before
      ? before.replace(/\b([a-zA-Z_$][\w$]*)\b/g, (w) =>
          JS_KEYWORDS.has(w) ? span(COLOR.green, w) : escapeHtml(w),
        )
      : "";
    out += span(COLOR.string, match[0]);
    lastIdx = match.index + match[0].length;
  }
  const tail = rest.slice(lastIdx);
  out += tail
    ? tail.replace(/\b([a-zA-Z_$][\w$]*)\b/g, (w) =>
        JS_KEYWORDS.has(w) ? span(COLOR.green, w) : escapeHtml(w),
      )
    : "";
  void tokens;
  return out;
}

function highlight(line: string, language: string): string {
  switch (language) {
    case "html":
      return highlightHtml(escapeHtml(line));
    case "css":
      return highlightCss(line);
    case "js":
      return highlightJs(line);
    case "json":
      return line.replace(/("[^"]*")/g, span(COLOR.string, "$1"));
    case "md":
      if (/^\s*#/.test(line)) return span(COLOR.amber, line);
      return escapeHtml(line);
    default:
      return escapeHtml(line);
  }
}

export function CodeViewer({ code, language }: Props) {
  const lines = code.split("\n");
  return (
    <div
      className="font-mono text-[12px] leading-[1.55] overflow-auto h-full"
      style={{ background: "#080808" }}
    >
      <table style={{ borderCollapse: "collapse", width: "100%" }}>
        <tbody>
          {lines.map((ln, i) => (
            <tr key={i}>
              <td
                className="select-none text-right pr-3 pl-3 align-top"
                style={{ color: "#333", width: 50, borderRight: "1px solid #1a1a1a" }}
              >
                {i + 1}
              </td>
              <td
                className="px-3 align-top whitespace-pre"
                style={{ color: COLOR.text }}
                dangerouslySetInnerHTML={{ __html: highlight(ln, language) || "&nbsp;" }}
              />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
