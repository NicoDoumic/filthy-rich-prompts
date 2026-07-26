/**
 * Golden-fixture harness utilities (docs/testing-strategy.md §3).
 *
 * Fixtures are executed through the FULL pipeline via refine() — pass
 * interactions are what we're testing, not individual passes.
 *
 * Comparison rules:
 * - Line endings and trailing whitespace are normalized before comparison,
 *   and nowhere else — we test what users see.
 * - Volatile report fields (toolVersion) are replaced with placeholders so
 *   version bumps never break fixtures.
 * - Golden files are (re)generated with UPDATE_GOLDENS=1 and every change
 *   must be justified in the PR body.
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const GOLDEN_DIR = dirname(fileURLToPath(import.meta.url));

export interface Fixture {
  readonly name: string;
  readonly dir: string;
  readonly input: string;
  readonly expectedPath: string;
  readonly expectedReportPath: string;
}

/** Normalizes CRLF → LF and strips trailing whitespace per line. */
export function normalize(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.replace(/\s+$/, ''))
    .join('\n')
    .trim();
}

/** Serializes a report deterministically, masking volatile fields. */
export function normalizeReport(report: unknown): string {
  const clone = JSON.parse(JSON.stringify(report)) as Record<string, unknown>;
  clone.toolVersion = '<version>';
  return JSON.stringify(clone, null, 2) + '\n';
}

/** Loads every fixture directory containing an input.md. */
export function loadFixtures(): Fixture[] {
  return readdirSync(GOLDEN_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const dir = join(GOLDEN_DIR, entry.name);
      const inputPath = join(dir, 'input.md');
      if (!existsSync(inputPath)) return null;
      return {
        name: entry.name,
        dir,
        input: readFileSync(inputPath, 'utf8'),
        expectedPath: join(dir, 'expected.md'),
        expectedReportPath: join(dir, 'expected.report.json'),
      } satisfies Fixture;
    })
    .filter((fixture): fixture is Fixture => fixture !== null)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function readExpected(path: string): string {
  return readFileSync(path, 'utf8');
}

export function writeGolden(fixture: Fixture, refined: string, report: string): void {
  writeFileSync(fixture.expectedPath, refined + '\n');
  writeFileSync(fixture.expectedReportPath, report);
}
