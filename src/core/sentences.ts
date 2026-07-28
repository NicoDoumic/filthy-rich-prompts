const segmenter = new Intl.Segmenter("en", { granularity: "sentence" });

export function segmentSentences(text: string): string[] {
  return [...segmenter.segment(text)].map((part) => part.segment);
}
