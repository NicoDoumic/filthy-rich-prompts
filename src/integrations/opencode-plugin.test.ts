import { describe, expect, it } from 'vitest';
import promptRefinerPlugin from './opencode-plugin.js';

type Hook = (input: unknown, output: { messages?: unknown }) => Promise<void>;

async function hookWith(options?: { autoRefine?: boolean }): Promise<Hook> {
  const hooks = (await promptRefinerPlugin({}, options)) as unknown as Record<string, Hook>;
  return hooks['experimental.chat.messages.transform']!;
}

describe('opencode-plugin', () => {
  it('exports a default plugin factory returning the messages transform hook', async () => {
    const hooks = await promptRefinerPlugin({}, { autoRefine: true });
    expect(typeof hooks['experimental.chat.messages.transform']).toBe('function');
  });

  it('does nothing when autoRefine is off', async () => {
    const hook = await hookWith({ autoRefine: false });
    const message = { role: 'user', content: 'write a blog post about tabs' };
    await hook({}, { messages: [message] });
    expect(message.content).toBe('write a blog post about tabs');
  });

  it('refines string-content user messages when enabled', async () => {
    const hook = await hookWith({ autoRefine: true });
    const message = { role: 'user', content: 'write a blog post about tabs' };
    await hook({}, { messages: [message] });
    expect(message.content).toContain('# Task');
  });

  it('refines only text parts of parts-form messages', async () => {
    const hook = await hookWith({ autoRefine: true });
    const imagePart = { type: 'image', url: 'data:image/png;base64,x' };
    const textPart = { type: 'text', text: 'can you make it faster? using react btw' };
    const message = { role: 'user', parts: [imagePart, textPart] };
    await hook({}, { messages: [message] });
    expect(textPart.text).toContain('## Context');
    expect(imagePart).toEqual({ type: 'image', url: 'data:image/png;base64,x' });
  });

  it('only transforms the LAST user message', async () => {
    const hook = await hookWith({ autoRefine: true });
    const earlier = { role: 'user', content: 'write a blog post about tabs' };
    const assistant = { role: 'assistant', content: 'sure' };
    const latest = { role: 'user', content: 'can you make it faster? using react btw' };
    await hook({}, { messages: [earlier, assistant, latest] });
    expect(earlier.content).toBe('write a blog post about tabs');
    expect(latest.content).toContain('## Context');
  });

  it('no-ops on unexpected payloads without throwing', async () => {
    const hook = await hookWith({ autoRefine: true });
    await expect(hook({}, {})).resolves.toBeUndefined();
    await expect(hook({}, { messages: 'nope' })).resolves.toBeUndefined();
    await expect(hook({}, { messages: [] })).resolves.toBeUndefined();
    await expect(hook({}, { messages: [{ role: 'assistant', content: 'hi' }] })).resolves.toBeUndefined();
    await expect(hook(null, undefined as unknown as { messages?: unknown })).resolves.toBeUndefined();
  });

  it('does not throw when message object is frozen', async () => {
    const hook = await hookWith({ autoRefine: true });
    const message = Object.freeze({ role: 'user', content: 'fix the crash on export' });
    const output = { messages: [message] };
    await expect(hook({}, output)).resolves.toBeUndefined();
    expect(message.content).toBe('fix the crash on export');
  });

  it('plugin options override the file config default (off)', async () => {
    // No refine.config.json in cwd in the test environment → default off.
    // The option wins, so this message must be refined.
    const hook = await hookWith({ autoRefine: true });
    const message = { role: 'user', content: 'write a blog post about tabs' };
    await hook({}, { messages: [message] });
    expect(message.content).toContain('# Task');
  });
});
