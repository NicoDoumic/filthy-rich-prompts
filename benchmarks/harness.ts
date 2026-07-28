import { readFileSync, readdirSync, writeFileSync, existsSync, mkdirSync, statSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { refine } from "../dist/index.js";
import type { RefineResult } from "../dist/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATASET_DIR = resolve(__dirname, "dataset");
const RESULTS_DIR = resolve(__dirname, "results");

interface FixtureMeta {
  category: string;
  difficulty: string;
  source: string;
  language: string;
}

interface FixtureInvariants {
  intent_must_contain: string[];
  must_not_contain: string[];
}

interface Tier0Result {
  passed: boolean;
  mustContain: { phrase: string; found: boolean }[];
  mustNotContain: { phrase: string; found: boolean }[];
}

interface Tier1Metrics {
  clarity: number;
  specificity: number;
  completeness: number;
  structure: number;
  composite: number;
}

interface FixtureResult {
  id: string;
  category: string;
  difficulty: string;
  tier0: Tier0Result;
  tier1: Tier1Metrics;
  rawWords: number;
  refinedWords: number;
  refinedLength: number;
  durationMs: number;
  error?: string;
}

interface BenchmarkReport {
  generated: string;
  toolVersion: string;
  summary: {
    total: number;
    tier0Passed: number;
    tier0Failed: number;
    errors: number;
    avgComposite: number;
    byCategory: Record<string, { total: number; passed: number; avgComposite: number }>;
    byDifficulty: Record<string, { total: number; passed: number; avgComposite: number }>;
  };
  fixtures: FixtureResult[];
}

function parseSimpleYaml(content: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const lines = content.split("\n");
  let i = 0;
  while (i < lines.length) {
    const raw = lines[i]!;
    const line = raw.trimEnd();
    i++;
    if (line === "" || line.trimStart().startsWith("#")) {
      continue;
    }
    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) {
      continue;
    }
    const key = line.slice(0, colonIdx).trim();
    const rest = line.slice(colonIdx + 1).trim();
    if (rest !== "") {
      result[key] = rest.replace(/^"(.*)"$/, "$1").replace(/^'(.*)'$/, "$1");
    } else {
      const list: string[] = [];
      while (i < lines.length && lines[i]!.trimStart().startsWith("-")) {
        const item = lines[i]!.trimStart().replace(/^-\s*/, "").trim();
        list.push(item.replace(/^"(.*)"$/, "$1").replace(/^'(.*)'$/, "$1"));
        i++;
      }
      result[key] = list;
    }
  }
  return result;
}

function wordCount(text: string): number {
  return text
    .replace(/[#*_`>|\[\]()]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 0).length;
}

function containsPhrase(text: string, phrase: string): boolean {
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(escaped, "i").test(text);
}

const CANONICAL_SECTIONS: Record<string, string[]> = {
  coding: [
    "Background",
    "Context",
    "Requirements",
    "Task",
    "Constraints",
    "Expected Output",
    "Acceptance Criteria",
    "Implementation Notes",
    "Steps",
    "Goal",
  ],
  "bug-report": [
    "Description",
    "Steps to Reproduce",
    "Expected Behavior",
    "Actual Behavior",
    "Environment",
    "Reproduction Steps",
    "Severity",
    "Impact",
  ],
  research: [
    "Context",
    "Options",
    "Criteria",
    "Trade-offs",
    "Comparison",
    "Considerations",
    "Analysis",
    "Recommendation",
  ],
  writing: [
    "Audience",
    "Purpose",
    "Tone",
    "Format",
    "Outline",
    "Structure",
    "Target Audience",
    "Key Points",
  ],
  adversarial: [
    "Background",
    "Context",
    "Goal",
  ],
};

function hasHeadings(text: string): boolean {
  return /^#{1,6}\s/m.test(text);
}

function countSections(text: string): number {
  const matches = text.match(/^#{1,6}\s.+$/gm);
  return matches ? matches.length : 0;
}

function hasLists(text: string): boolean {
  return /^[\t ]*[-*+]\s/m.test(text) || /^[\t ]*\d+[.)]\s/m.test(text);
}

function canonicalSectionCount(text: string, category: string): number {
  const sections = CANONICAL_SECTIONS[category] ?? CANONICAL_SECTIONS["coding"]!;
  let count = 0;
  for (const section of sections) {
    if (containsPhrase(text, section)) {
      count++;
    }
  }
  return count;
}

function computeTier1(
  refined: string,
  rawWords: number,
  category: string,
): Tier1Metrics {
  const refinedWords = wordCount(refined);
  const headingCount = countSections(refined);
  const hasH2 = /^##\s/m.test(refined);

  // Clarity: presence of markdown structure (headings + lists)
  const clarityHeading = hasH2 ? 1.0 : hasHeadings(refined) ? 0.5 : 0.0;
  const clarityLists = hasLists(refined) ? 1.0 : 0.0;
  const clarity = Math.round((clarityHeading * 0.6 + clarityLists * 0.4) * 100) / 100;

  // Specificity: section count relative to a reasonable maximum (5 sections = 1.0)
  const specificity = Math.round(Math.min(headingCount / 5, 1.0) * 100) / 100;

  // Completeness: word count ratio (2x raw = 1.0)
  const completeness = rawWords > 0
    ? Math.round(Math.min(refinedWords / rawWords / 2, 1.0) * 100) / 100
    : 0.0;

  // Structure: canonical sections present (at least 2 = 0.5, 4+ = 1.0)
  const canonCount = canonicalSectionCount(refined, category);
  const structure = Math.round(Math.min(canonCount / 4, 1.0) * 100) / 100;

  // Composite: weighted average
  const composite = Math.round(
    (clarity * 0.25 + specificity * 0.25 + completeness * 0.25 + structure * 0.25) * 100,
  ) / 100;

  return { clarity, specificity, completeness, structure, composite };
}

function collectFixtures(): string[] {
  const dirs: string[] = [];
  for (const category of readdirSync(DATASET_DIR)) {
    const catPath = join(DATASET_DIR, category);
    if (!statSync(catPath).isDirectory()) {
      continue;
    }
    for (const fixture of readdirSync(catPath)) {
      const fixturePath = join(catPath, fixture);
      if (
        statSync(fixturePath).isDirectory() &&
        existsSync(join(fixturePath, "raw.md"))
      ) {
        dirs.push(fixturePath);
      }
    }
  }
  return dirs.sort();
}

async function runFixture(fixtureDir: string): Promise<FixtureResult> {
  const id = fixtureDir
    .replace(DATASET_DIR + "\\", "")
    .replace(DATASET_DIR + "/", "")
    .replace(/\\/g, "/");

  const rawPath = join(fixtureDir, "raw.md");
  const metaPath = join(fixtureDir, "meta.yml");
  const invariantsPath = join(fixtureDir, "invariants.yml");

  const raw = readFileSync(rawPath, "utf-8").trim();
  const meta = parseSimpleYaml(readFileSync(metaPath, "utf-8")) as unknown as FixtureMeta;
  const invariants = parseSimpleYaml(
    readFileSync(invariantsPath, "utf-8"),
  ) as unknown as FixtureInvariants;

  const rawWords = wordCount(raw);
  const start = performance.now();

  let result: RefineResult;
  try {
    result = await refine(raw, { mode: "silent" });
  } catch (err) {
    const durationMs = Math.round(performance.now() - start);
    return {
      id,
      category: meta.category ?? "unknown",
      difficulty: meta.difficulty ?? "unknown",
      tier0: { passed: false, mustContain: [], mustNotContain: [] },
      tier1: { clarity: 0, specificity: 0, completeness: 0, structure: 0, composite: 0 },
      rawWords,
      refinedWords: 0,
      refinedLength: 0,
      durationMs,
      error: err instanceof Error ? err.message : String(err),
    };
  }

  const durationMs = Math.round(performance.now() - start);
  const refined = result.refined;
  const refinedWords = wordCount(refined);

  // Tier 0: invariant verification
  const mustContain = (invariants.intent_must_contain ?? []).map((phrase) => ({
    phrase,
    found: containsPhrase(refined, phrase),
  }));
  const mustNotContain = (invariants.must_not_contain ?? []).map((phrase) => ({
    phrase,
    found: containsPhrase(refined, phrase),
  }));
  const mustContainAllPassed = mustContain.every((c) => c.found);
  const mustNotContainAllPassed = mustNotContain.every((c) => !c.found);
  const tier0Passed = mustContainAllPassed && mustNotContainAllPassed;

  const tier1 = computeTier1(refined, rawWords, meta.category ?? "other");

  return {
    id,
    category: meta.category ?? "unknown",
    difficulty: meta.difficulty ?? "unknown",
    tier0: { passed: tier0Passed, mustContain, mustNotContain },
    tier1,
    rawWords,
    refinedWords,
    refinedLength: refined.length,
    durationMs,
  };
}

async function main() {
  console.log("filthy-rich-prompts benchmark harness\n");

  const fixtureDirs = collectFixtures();
  console.log(`Found ${fixtureDirs.length} fixtures\n`);

  const results: FixtureResult[] = [];
  for (let idx = 0; idx < fixtureDirs.length; idx++) {
    const dir = fixtureDirs[idx]!;
    const id = dir
      .replace(DATASET_DIR + "\\", "")
      .replace(DATASET_DIR + "/", "")
      .replace(/\\/g, "/");
    process.stdout.write(`[${String(idx + 1).padStart(2, "0")}/${fixtureDirs.length}] ${id} `);
    const result = await runFixture(dir);
    results.push(result);
    if (result.error) {
      console.log(`ERROR: ${result.error}`);
    } else if (result.tier0.passed) {
      console.log(`PASS (composite: ${result.tier1.composite.toFixed(2)})`);
    } else {
      const failedMust = result.tier0.mustContain.filter((c) => !c.found);
      const failedMustNot = result.tier0.mustNotContain.filter((c) => c.found);
      const reasons: string[] = [];
      if (failedMust.length > 0) {
        reasons.push(
          `missing: [${failedMust.map((c) => c.phrase).join(", ")}]`,
        );
      }
      if (failedMustNot.length > 0) {
        reasons.push(
          `unwanted: [${failedMustNot.map((c) => c.phrase).join(", ")}]`,
        );
      }
      console.log(`FAIL ${reasons.join("; ")}`);
    }
  }

  const tier0Passed = results.filter((r) => r.tier0.passed && !r.error).length;
  const tier0Failed = results.filter((r) => !r.tier0.passed && !r.error).length;
  const errors = results.filter((r) => r.error).length;
  const allComposites = results.filter((r) => !r.error).map((r) => r.tier1.composite);
  const avgComposite = allComposites.length > 0
    ? Math.round((allComposites.reduce((a, b) => a + b, 0) / allComposites.length) * 100) / 100
    : 0;

  // By category
  const byCategory: Record<string, { total: number; passed: number; avgComposite: number }> = {};
  for (const r of results) {
    const cat = r.category;
    if (!byCategory[cat]) {
      byCategory[cat] = { total: 0, passed: 0, avgComposite: 0 };
    }
    byCategory[cat]!.total++;
    if (r.tier0.passed && !r.error) {
      byCategory[cat]!.passed++;
    }
  }
  for (const cat of Object.keys(byCategory)) {
    const catResults = results.filter((r) => r.category === cat && !r.error);
    const sum = catResults.reduce((a, r) => a + r.tier1.composite, 0);
    byCategory[cat]!.avgComposite = catResults.length > 0
      ? Math.round((sum / catResults.length) * 100) / 100
      : 0;
  }

  // By difficulty
  const byDifficulty: Record<string, { total: number; passed: number; avgComposite: number }> = {};
  for (const r of results) {
    const diff = r.difficulty;
    if (!byDifficulty[diff]) {
      byDifficulty[diff] = { total: 0, passed: 0, avgComposite: 0 };
    }
    byDifficulty[diff]!.total++;
    if (r.tier0.passed && !r.error) {
      byDifficulty[diff]!.passed++;
    }
  }
  for (const diff of Object.keys(byDifficulty)) {
    const diffResults = results.filter((r) => r.difficulty === diff && !r.error);
    const sum = diffResults.reduce((a, r) => a + r.tier1.composite, 0);
    byDifficulty[diff]!.avgComposite = diffResults.length > 0
      ? Math.round((sum / diffResults.length) * 100) / 100
      : 0;
  }

  const report: BenchmarkReport = {
    generated: new Date().toISOString(),
    toolVersion: "0.2.0-next.0",
    summary: {
      total: results.length,
      tier0Passed,
      tier0Failed,
      errors,
      avgComposite,
      byCategory,
      byDifficulty,
    },
    fixtures: results,
  };

  if (!existsSync(RESULTS_DIR)) {
    mkdirSync(RESULTS_DIR, { recursive: true });
  }
  const reportPath = join(RESULTS_DIR, "latest.json");
  writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf-8");

  console.log(`\n---`);
  console.log(`Total: ${results.length} | Tier 0 passed: ${tier0Passed} | Failed: ${tier0Failed} | Errors: ${errors}`);
  console.log(`Average composite score: ${avgComposite.toFixed(2)}`);
  console.log(`Report written to benchmarks/results/latest.json`);
}

main().catch((err) => {
  console.error("Harness crashed:", err);
  process.exit(1);
});
