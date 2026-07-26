import { describe, expect, it } from "vitest";
import { applyDiff, diffLines } from "./diff.js";

describe("diffLines", () => {
  it("returns an empty diff for two empty inputs", () => {
    expect(diffLines("", "")).toEqual([]);
  });

  it("marks identical texts as all same", () => {
    const diff = diffLines("a\nb", "a\nb");
    expect(diff).toEqual([
      { type: "same", line: "a" },
      { type: "same", line: "b" },
    ]);
  });

  it("detects insertions", () => {
    expect(diffLines("a", "a\nb")).toEqual([
      { type: "same", line: "a" },
      { type: "add", line: "b" },
    ]);
  });

  it("detects removals", () => {
    expect(diffLines("a\nb", "a")).toEqual([
      { type: "same", line: "a" },
      { type: "remove", line: "b" },
    ]);
  });

  it("handles empty before (all adds) and empty after (all removes)", () => {
    expect(diffLines("", "x\ny")).toEqual([
      { type: "add", line: "x" },
      { type: "add", line: "y" },
    ]);
    expect(diffLines("x\ny", "")).toEqual([
      { type: "remove", line: "x" },
      { type: "remove", line: "y" },
    ]);
  });

  it("handles completely different texts", () => {
    const diff = diffLines("one\ntwo", "three\nfour");
    expect(applyDiff(diff)).toBe("three\nfour");
    expect(diff.filter((d) => d.type === "remove").map((d) => d.line)).toEqual([
      "one",
      "two",
    ]);
    expect(diff.filter((d) => d.type === "add").map((d) => d.line)).toEqual([
      "three",
      "four",
    ]);
  });

  it("reconstructs the after text for mixed edits (round-trip)", () => {
    const before = "# Task\n\nold body\n\n## Context\n\nold context\n";
    const after =
      "# Task\n\nnew body\nmore body\n\n## Context\n\nold context\n";
    expect(applyDiff(diffLines(before, after))).toBe(after);
  });

  it("handles unicode lines", () => {
    const diff = diffLines("fix the bug 🐛", "fix the bug 🐛\nadd tests ✅");
    expect(applyDiff(diff)).toBe("fix the bug 🐛\nadd tests ✅");
  });
});
