// Lightweight line-level + word-level diff using LCS.
// Pure JS, no deps — runs fine in the browser.

export type DiffOp = "equal" | "add" | "remove" | "change";

export interface DiffRow {
  op: DiffOp;
  left?: string; // line text on the left (BEFORE)
  right?: string; // line text on the right (AFTER)
  leftNo?: number; // 1-based line number on the left
  rightNo?: number; // 1-based line number on the right
  // Word-level segments — only set when op === "change"
  leftSegments?: WordSeg[];
  rightSegments?: WordSeg[];
}

export interface WordSeg {
  text: string;
  changed: boolean;
}

export interface DiffSummary {
  additions: number;
  removals: number;
  changed: number;
}

export interface DiffResult {
  rows: DiffRow[];
  summary: DiffSummary;
}

// Compute LCS table for two arrays of strings (lines).
function lcsTable(a: string[], b: string[]): number[][] {
  const n = a.length;
  const m = b.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () =>
    new Array(m + 1).fill(0),
  );
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      if (a[i] === b[j]) dp[i][j] = dp[i + 1][j + 1] + 1;
      else dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  return dp;
}

// Walk the LCS table to emit equal/remove/add ops.
function buildOps(
  a: string[],
  b: string[],
  dp: number[][],
): Array<{ op: "equal" | "add" | "remove"; left?: string; right?: string; li?: number; ri?: number }> {
  const out: Array<{ op: "equal" | "add" | "remove"; left?: string; right?: string; li?: number; ri?: number }> = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      out.push({ op: "equal", left: a[i], right: b[j], li: i, ri: j });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      out.push({ op: "remove", left: a[i], li: i });
      i++;
    } else {
      out.push({ op: "add", right: b[j], ri: j });
      j++;
    }
  }
  while (i < a.length) {
    out.push({ op: "remove", left: a[i], li: i });
    i++;
  }
  while (j < b.length) {
    out.push({ op: "add", right: b[j], ri: j });
    j++;
  }
  return out;
}

// Tokenize a line for word-level diffing — keeps whitespace tokens.
function tokenize(line: string): string[] {
  return line.match(/\s+|[^\s]+/g) ?? [];
}

// Word-level diff between two single lines, returning aligned segments.
function wordDiff(a: string, b: string): { left: WordSeg[]; right: WordSeg[] } {
  const ta = tokenize(a);
  const tb = tokenize(b);
  const dp = lcsTable(ta, tb);
  const ops = buildOps(ta, tb, dp);
  const left: WordSeg[] = [];
  const right: WordSeg[] = [];
  for (const o of ops) {
    if (o.op === "equal") {
      left.push({ text: o.left ?? "", changed: false });
      right.push({ text: o.right ?? "", changed: false });
    } else if (o.op === "remove") {
      left.push({ text: o.left ?? "", changed: true });
    } else {
      right.push({ text: o.right ?? "", changed: true });
    }
  }
  return { left, right };
}

// Pair up adjacent remove/add runs into "change" rows so the viewer can
// render them side by side with word-level highlights.
function pairChanges(
  ops: Array<{ op: "equal" | "add" | "remove"; left?: string; right?: string; li?: number; ri?: number }>,
): DiffRow[] {
  const rows: DiffRow[] = [];
  let leftLineNo = 0;
  let rightLineNo = 0;
  let i = 0;
  while (i < ops.length) {
    const op = ops[i];
    if (op.op === "equal") {
      leftLineNo++;
      rightLineNo++;
      rows.push({
        op: "equal",
        left: op.left,
        right: op.right,
        leftNo: leftLineNo,
        rightNo: rightLineNo,
      });
      i++;
      continue;
    }
    // Collect a run of removes followed by adds (or vice-versa).
    const removes: typeof ops = [];
    const adds: typeof ops = [];
    while (i < ops.length && ops[i].op === "remove") {
      removes.push(ops[i]);
      i++;
    }
    while (i < ops.length && ops[i].op === "add") {
      adds.push(ops[i]);
      i++;
    }
    const pairCount = Math.min(removes.length, adds.length);
    for (let k = 0; k < pairCount; k++) {
      leftLineNo++;
      rightLineNo++;
      const wd = wordDiff(removes[k].left ?? "", adds[k].right ?? "");
      rows.push({
        op: "change",
        left: removes[k].left,
        right: adds[k].right,
        leftNo: leftLineNo,
        rightNo: rightLineNo,
        leftSegments: wd.left,
        rightSegments: wd.right,
      });
    }
    for (let k = pairCount; k < removes.length; k++) {
      leftLineNo++;
      rows.push({ op: "remove", left: removes[k].left, leftNo: leftLineNo });
    }
    for (let k = pairCount; k < adds.length; k++) {
      rightLineNo++;
      rows.push({ op: "add", right: adds[k].right, rightNo: rightLineNo });
    }
  }
  return rows;
}

export function diffLines(before: string, after: string): DiffResult {
  const a = before.split("\n");
  const b = after.split("\n");
  const dp = lcsTable(a, b);
  const ops = buildOps(a, b, dp);
  const rows = pairChanges(ops);

  let additions = 0;
  let removals = 0;
  let changed = 0;
  for (const r of rows) {
    if (r.op === "add") additions++;
    else if (r.op === "remove") removals++;
    else if (r.op === "change") changed++;
  }
  return { rows, summary: { additions, removals, changed } };
}
