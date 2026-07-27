import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadMinConfig } from './min-config.js';

let work: string;

beforeEach(() => {
  work = mkdtempSync(join(tmpdir(), 'frp-minconfig-'));
});

afterEach(() => {
  rmSync(work, { recursive: true, force: true });
});

function writeConfig(dir: string, content: string): string {
  const path = join(dir, 'refine.config.json');
  writeFileSync(path, content);
  return path;
}

describe('loadMinConfig', () => {
  it('defaults to OFF when no config file exists', () => {
    const config = loadMinConfig(work, join(work, 'nope.json'));
    expect(config).toEqual({ autoRefine: false, source: 'default' });
  });

  it('reads autoRefine from the project config', () => {
    writeConfig(work, '{ "autoRefine": true }');
    const config = loadMinConfig(work, join(work, 'nope.json'));
    expect(config).toEqual({ autoRefine: true, source: 'project' });
  });

  it('reads autoRefine from the user config when the project has none', () => {
    const userPath = join(work, 'user-level-refine.config.json');
    writeFileSync(userPath, '{ "autoRefine": true }');
    const projectDir = mkdtempSync(join(tmpdir(), 'frp-minconfig-proj-'));
    try {
      const config = loadMinConfig(projectDir, userPath);
      expect(config).toEqual({ autoRefine: true, source: 'user' });
    } finally {
      rmSync(projectDir, { recursive: true, force: true });
    }
  });

  it('project config wins over user config', () => {
    const userPath = join(work, 'user-refine.config.json');
    writeFileSync(userPath, '{ "autoRefine": true }');
    writeConfig(work, '{ "autoRefine": false }');
    const config = loadMinConfig(work, userPath);
    expect(config).toEqual({ autoRefine: false, source: 'project' });
  });

  it('fails soft to default with a warning on malformed JSON', () => {
    writeConfig(work, '{ not json');
    const config = loadMinConfig(work, join(work, 'nope.json'));
    expect(config.autoRefine).toBe(false);
    expect(config.warning).toContain('not valid JSON');
  });

  it('fails soft to default with a warning when autoRefine is not boolean', () => {
    writeConfig(work, '{ "autoRefine": "yes" }');
    const config = loadMinConfig(work, join(work, 'nope.json'));
    expect(config.autoRefine).toBe(false);
    expect(config.warning).toContain('no boolean');
  });

  it('treats an empty object as absent and falls through', () => {
    writeConfig(work, '{}');
    const config = loadMinConfig(work, join(work, 'nope.json'));
    expect(config.autoRefine).toBe(false);
    expect(config.warning).toContain('no boolean');
  });
});
