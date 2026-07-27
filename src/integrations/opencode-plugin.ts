/**
 * opencode-plugin — the OpenCode integration hook for auto-refine.
 *
 * Built by tsup as a SELF-CONTAINED single file (dist/opencode-plugin.js, core
 * inlined — D2 of the pre-release plan), so users drop one file into
 * `.opencode/plugin/` with no package resolution at all.
 *
 * What it does: registers `experimental.chat.messages.transform`, and when
 * auto-refine is enabled, replaces the text of the last user message with its
 * refined version before it reaches the model. All payload shapes are handled
 * defensively: anything unexpected is a no-op, never a crash — OpenCode marks
 * this hook `experimental` in 1.18.5, and interception must never be worse
 * than no interception (architecture §8).
 *
 * Toggle (precedence, minimal M2 subset): plugin options
 * `["./.opencode/plugin/opencode-plugin.js", { "autoRefine": true }]` in
 * opencode.json → refine.config.json `autoRefine` → default OFF.
 */
import { loadMinConfig } from './min-config.js';
import { refineOutgoing } from './refine-outgoing.js';

/** Plugin options tuple form: `["<plugin>", { "autoRefine": true }]`. */
export interface PromptRefinerPluginOptions {
  readonly autoRefine?: boolean;
}

/* Structural payload types — intentionally loose; validated at runtime. */
interface MessagePart {
  type?: unknown;
  text?: unknown;
}
interface ChatMessage {
  role?: unknown;
  content?: unknown;
  parts?: unknown;
}
interface TransformOutput {
  messages?: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object';
}

/** Refines one text-bearing part or string in place. Returns nothing; mutates the container. */
async function transformMessage(message: ChatMessage, autoRefine: boolean): Promise<void> {
  if (typeof message.content === 'string') {
    const result = await refineOutgoing(message.content, { autoRefine });
    message.content = result.text;
    return;
  }
  const parts = Array.isArray(message.parts)
    ? (message.parts as MessagePart[])
    : Array.isArray(message.content)
      ? (message.content as MessagePart[])
      : null;
  if (parts === null) return;
  for (const part of parts) {
    if (isRecord(part) && part.type === 'text' && typeof part.text === 'string') {
      const result = await refineOutgoing(part.text, { autoRefine });
      part.text = result.text;
    }
  }
}

/**
 * The OpenCode plugin. OpenCode calls it with the plugin input and the
 * user-supplied options tuple value; it returns the hook table.
 */
export default async function promptRefinerPlugin(
  _input: unknown,
  options?: PromptRefinerPluginOptions,
) {
  const autoRefine = options?.autoRefine ?? loadMinConfig(process.cwd()).autoRefine;

  return {
    'experimental.chat.messages.transform': async (
      _hookInput: unknown,
      output: TransformOutput,
    ): Promise<void> => {
      if (!autoRefine) return;
      if (!isRecord(output) || !Array.isArray(output.messages)) return;
      const messages = output.messages as ChatMessage[];
      const lastUser = [...messages]
        .reverse()
        .find((message) => isRecord(message) && message.role === 'user');
      if (lastUser === undefined) return;
      try {
        await transformMessage(lastUser, autoRefine);
      } catch {
        // Failure doctrine: interception must never be worse than no interception.
      }
    },
  };
}
