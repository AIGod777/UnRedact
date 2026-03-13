import type { ParsedSegment, Redaction } from '../types';

/**
 * Parses reconstructed text containing [RECOVERED:score], [GUESSED:score], and
 * [INFERRED:score] markers into structured segments, enriched with metadata
 * from the redactions array.
 */
export function parseResult(text: string, redactions: Redaction[]): ParsedSegment[] {
  const regex = /\[(RECOVERED|GUESSED|INFERRED):(\d+)\](.*?)\[\/\1\]/g;
  const parts: ParsedSegment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', content: text.substring(lastIndex, match.index) });
    }

    const content = match[3];
    const metadata = redactions.find((r) => r.text === content);

    parts.push({
      type: match[1].toLowerCase() as 'recovered' | 'guessed',
      score: parseInt(match[2], 10),
      content,
      alternatives: metadata?.alternatives ?? [],
      explanation: metadata?.explanation ?? '',
    });
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push({ type: 'text', content: text.substring(lastIndex) });
  }

  return parts;
}
