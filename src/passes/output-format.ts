/**
 * output-format inference (phase 50, transformation)
 *
 * Specifies the desired output format when the prompt doesn't explicitly
 * state one. Detects format cues and adds a `## Output Format` section.
 *
 * Mutation doctrine:
 * - Detects format cues in the prompt (list, table, code, JSON, etc.).
 * - If no format is specified, adds a default `## Output Format` section.
 * - The original text is preserved.
 *
 * No-op inputs: prompts that already specify an output format explicitly.
 * Transforms: adds `## Output Format` section.
 */
import type { Explanation, Pass } from "../core/types.js";

/** Cues that indicate a desired output format. */
const FORMAT_CUES: Record<string, RegExp[]> = {
  "list": [/\b(list|bullet|numbered|checklist|enum)\b/i],
  "table": [/\b(table|tabular|grid|matrix|spreadsheet|csv)\b/i],
  "code": [/\b(code|script|function|implementation|snippet)\b/i],
  "json": [/\b(json|yaml|xml|toml|config)\b/i],
  "markdown": [/\b(markdown|md|readme|docs)\b/i],
  "prose": [/\b(prose|paragraph|essay|article|report|summary|explanation)\b/i],
  "diagram": [/\b(diagram|chart|graph|flowchart|mermaid|sequence)\b/i],
};

/** Cues that suggest the output format is already specified. */
const EXPLICIT_FORMAT = /## Output Format|## Deliverables?|## Output|## Result/m;

/** Any markdown heading means the prompt is already structured — skip. */
const HEADING_PRESENT = /^\s{0,3}#{1,6}\s/m;

export const outputFormatInference: Pass = {
  id: "output-format-inference",
  description:
    "Specifies the desired output format when the prompt doesn't explicitly state one.",
  kind: "transformation",
  phase: 50,
  requiresLLM: false,
  requiresNetwork: false,

  run(ctx) {
    const text = ctx.current;

    // No-op: empty prompt.
    if (text.trim().length === 0) return {};

    // No-op: already has an output format section or is already structured.
    if (EXPLICIT_FORMAT.test(text)) return {};
    if (HEADING_PRESENT.test(text)) return {};

    // Detect format cues.
    const detectedFormats: string[] = [];
    for (const [format, cues] of Object.entries(FORMAT_CUES)) {
      for (const cue of cues) {
        if (cue.test(text)) {
          detectedFormats.push(format);
          break;
        }
      }
    }

    const explanations: Explanation[] = [];
    let outputFormat: string;

    if (detectedFormats.length > 0) {
      const formatList = detectedFormats.join(", ");
      outputFormat = `Provide the response as ${detectedFormats.length > 1 ? "a combination of" : "a"} ${formatList} format.`;
      explanations.push({
        pass: "output-format-inference",
        change: `detected desired output format: ${formatList}`,
        reason:
          "specifying the output format prevents the model from choosing a suboptimal structure",
        before: `format cues: ${formatList}`,
        after: "## Output Format",
      });
    } else {
      outputFormat = "Provide the response in a clear, well-structured format appropriate to the content.";
      explanations.push({
        pass: "output-format-inference",
        change: "added default output format specification",
        reason:
          "an explicit output format anchors the executor's response structure",
        before: "no format specified",
        after: "## Output Format",
      });
    }

    return {
      prompt: `${text.trim()}\n\n## Output Format\n\n${outputFormat}\n`,
      explanations,
      metadata: {
        "output-format-inference:formats": detectedFormats,
      },
    };
  },
};