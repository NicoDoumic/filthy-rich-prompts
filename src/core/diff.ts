/**
 * Line-wise diff (Myers O(ND) algorithm), hand-rolled to keep the core at zero
 * runtime dependencies (D2, coding-standards §2). Prompts are kilobytes, so the
 * algorithm's theoretical worst case never matters in practice.
 *
 * Produces the minimal edit script between two texts, line by line, used for
 * raw↔refined diffs (architecture §6) and by property test P3.
 */
import type { DiffLine } from "./types.js";

const splitLines = (text: string): string[] =>
  text.length === 0 ? [] : text.split("\n");

/**
 * Computes the minimal line-wise edit script transforming `before` into `after`.
 * Unchanged lines are emitted as `same`, so the result covers both inputs fully.
 */
export function diffLines(before: string, after: string): DiffLine[] {
  const a = splitLines(before);
  const b = splitLines(after);
  const n = a.length;
  const m = b.length;
  if (n === 0 && m === 0) return [];

  // Forward pass: find the length of the shortest edit path, recording the V
  // array after each D for the backtrack.
  const max = n + m;
  const v = new Map<number, number>();
  v.set(1, 0);
  const trace: Map<number, number>[] = [];
  let distance = -1;

  outer: for (let d = 0; d <= max; d++) {
    for (let k = -d; k <= d; k += 2) {
      const down = v.get(k + 1);
      const right = v.get(k - 1);
      let x: number;
      if (k === -d || (k !== d && (right ?? -1) < (down ?? -1))) {
        x = down ?? 0;
      } else {
        x = (right ?? 0) + 1;
      }
      let y = x - k;
      while (x < n && y < m && a[x] === b[y]) {
        x++;
        y++;
      }
      v.set(k, x);
      if (x >= n && y >= m) {
        distance = d;
        trace.push(new Map(v));
        break outer;
      }
    }
    if (distance === -1) trace.push(new Map(v));
  }

  // Backtrack from (n, m) through the recorded V arrays to recover the script.
  const result: DiffLine[] = [];
  let x = n;
  let y = m;
  for (let d = distance; d > 0; d--) {
    /* v8 ignore next -- trace[d-1] always exists for d >= 1; TS index guard */
    const vPrev = trace[d - 1] ?? new Map<number, number>();
    const k = x - y;
    const down = vPrev.get(k + 1);
    const right = vPrev.get(k - 1);
    const cameFromDown = k === -d || (k !== d && (right ?? -1) < (down ?? -1));
    const prevK = cameFromDown ? k + 1 : k - 1;
    /* v8 ignore next -- prevK is always present in a well-formed trace */
    const prevX = vPrev.get(prevK) ?? 0;
    const prevY = prevX - prevK;
    while (x > prevX && y > prevY) {
      /* v8 ignore next -- index guaranteed by loop condition */
      result.push({ type: "same", line: a[x - 1] ?? "" });
      x--;
      y--;
    }
    if (x === prevX) {
      /* v8 ignore next -- index guaranteed by backtrack invariant */
      result.push({ type: "add", line: b[y - 1] ?? "" });
      y--;
    } else {
      /* v8 ignore next -- index guaranteed by backtrack invariant */
      result.push({ type: "remove", line: a[x - 1] ?? "" });
      x--;
    }
  }
  while (x > 0 && y > 0) {
    /* v8 ignore next -- index guaranteed by loop condition */
    result.push({ type: "same", line: a[x - 1] ?? "" });
    x--;
    y--;
  }
  return result.reverse();
}

/**
 * Reconstructs the "after" text from a diff — useful in tests:
 * `applyDiff(diffLines(a, b)) === b` must always hold.
 */
export function applyDiff(diff: readonly DiffLine[]): string {
  return diff
    .filter((entry) => entry.type !== "remove")
    .map((entry) => entry.line)
    .join("\n");
}
