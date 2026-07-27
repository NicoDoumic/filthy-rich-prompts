#!/usr/bin/env node
// Standalone smoke test for dist/opencode-plugin.js (pre-release D2).
// Verifies the self-contained plugin bundle: it must import with NO
// node_modules present, and its hook must actually refine a message.
import { mkdtempSync, rmSync, copyFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const work = mkdtempSync(join(tmpdir(), 'frp-plugin-smoke-'));
try {
  const pluginPath = join(work, 'opencode-plugin.js');
  copyFileSync(join(process.cwd(), 'dist', 'opencode-plugin.js'), pluginPath);
  // A package.json with type:module and NO dependencies — the bundle must not
  // resolve anything external.
  writeFileSync(join(work, 'package.json'), JSON.stringify({ name: 'frp-plugin-smoke', type: 'module' }));

  const plugin = await import(pathToFileURL(pluginPath).href);
  if (typeof plugin.default !== 'function') {
    throw new Error('plugin default export is not a function');
  }

  const hooks = await plugin.default({}, { autoRefine: true });
  const transform = hooks['experimental.chat.messages.transform'];
  if (typeof transform !== 'function') {
    throw new Error('experimental.chat.messages.transform hook missing');
  }

  const message = { role: 'user', content: 'can you make it faster? using react btw' };
  await transform({}, { messages: [message] });
  if (!message.content.includes('## Context')) {
    throw new Error(`hook did not refine the message: ${JSON.stringify(message.content.slice(0, 80))}`);
  }

  console.log('✓ Plugin bundle smoke test passed (standalone import + hook refines).');
} finally {
  rmSync(work, { recursive: true, force: true });
}
