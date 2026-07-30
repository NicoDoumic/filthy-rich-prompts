const segmenters = new Map<string, Intl.Segmenter>();

function getSegmenter(locale: string): Intl.Segmenter {
  let segmenter = segmenters.get(locale);
  if (!segmenter) {
    segmenter = new Intl.Segmenter(locale, { granularity: "sentence" });
    segmenters.set(locale, segmenter);
  }
  return segmenter;
}

/** Segment text into sentences using Intl.Segmenter. Returns empty array for empty/whitespace-only input. */
export function segmentSentences(text: string, locale = "en"): string[] {
  return [...getSegmenter(locale).segment(text)].map((part) => part.segment);
}
