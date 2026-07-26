/**
 * Golden-fixture runner (docs/testing-strategy.md §3).
 *
 * Regenerate all fixtures with:  UPDATE_GOLDENS=1 pnpm test
 * Every changed golden file must be justified in the PR body — drive-by
 * updates are a review red flag.
 */
import { describe, expect, it } from 'vitest';
import { refine } from '../../src/index.js';
import { loadFixtures, normalize, normalizeReport, readExpected, writeGolden } from './helpers.js';

const UPDATE = process.env.UPDATE_GOLDENS === '1';

const fixtures = loadFixtures();

describe('golden fixtures', () => {
  it('found at least 8 fixtures', () => {
    expect(fixtures.length).toBeGreaterThanOrEqual(8);
  });

  for (const fixture of fixtures) {
    it(`${fixture.name}: pipeline output matches the golden files`, async () => {
      const result = await refine(fixture.input);
      const refined = normalize(result.refined);
      const report = normalizeReport(result.report);

      if (UPDATE) {
        writeGolden(fixture, refined, report);
        return;
      }

      expect(refined).toBe(normalize(readExpected(fixture.expectedPath)));
      expect(report).toBe(normalizeReport(JSON.parse(readExpected(fixture.expectedReportPath))));
    });
  }
});
