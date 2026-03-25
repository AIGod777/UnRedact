import type { VersionInfo } from '../types';

/**
 * Scans raw PDF bytes for multiple %%EOF markers, indicating incremental saves.
 * Each %%EOF marks the end of a document version — multiple means the PDF
 * contains recoverable previous versions (potentially before redaction).
 */
export function detectIncrementalSaves(data: Uint8Array): VersionInfo {
  const offsets: number[] = [];
  const len = data.length;
  // %%EOF is [37, 37, 69, 79, 70]

  let i = data.indexOf(37);
  while (i !== -1 && i <= len - 5) {
    if (
      data[i + 1] === 37 &&
      data[i + 2] === 69 &&
      data[i + 3] === 79 &&
      data[i + 4] === 70
    ) {
      offsets.push(i + 5);
      i = data.indexOf(37, i + 5);
    } else {
      i = data.indexOf(37, i + 1);
    }
  }

  return {
    count: offsets.length,
    eofOffsets: offsets,
    hasMultipleVersions: offsets.length > 1,
  };
}

/**
 * Extracts a previous version of the PDF by truncating at an earlier %%EOF marker.
 * Version 0 = original, Version N-1 = latest.
 */
export function extractPreviousVersion(
  data: Uint8Array,
  versionInfo: VersionInfo,
  versionIndex: number
): Uint8Array | null {
  if (versionIndex < 0 || versionIndex >= versionInfo.eofOffsets.length) {
    return null;
  }
  const endOffset = versionInfo.eofOffsets[versionIndex];
  return data.slice(0, endOffset);
}

/**
 * Scans raw PDF bytes for text strings that may be orphaned (not displayed but
 * still present in the file). Looks for parenthesized strings in content streams.
 * 
 * This is a heuristic approach — it finds strings enclosed in PDF string delimiters
 * that contain readable text content. These may include text that was "removed"
 * by redaction but not actually deleted from the file.
 */
export function findOrphanedStrings(data: Uint8Array): string[] {
  const text = new TextDecoder('latin1').decode(data);
  const results: string[] = [];
  const seen = new Set<string>();

  // Match PDF text strings: (text) preceded by Tj or TJ operators, or in streams
  // Also match hex strings: <hex>
  const stringPattern = /\(([^)]{4,200})\)/g;
  let match: RegExpExecArray | null;

  while ((match = stringPattern.exec(text)) !== null) {
    const str = match[1]
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, '\r')
      .replace(/\\t/g, '\t')
      .replace(/\\\\/g, '\\')
      .replace(/\\([()])/g, '$1');

    // Filter: must contain mostly printable ASCII/Unicode, min 4 chars
    const printableRatio = (str.match(/[\x20-\x7E]/g) || []).length / str.length;
    if (printableRatio > 0.7 && str.trim().length >= 4 && !seen.has(str.trim())) {
      seen.add(str.trim());
      results.push(str.trim());
    }
  }

  // Also find hex-encoded strings
  const hexPattern = /<([0-9A-Fa-f]{8,})>/g;
  while ((match = hexPattern.exec(text)) !== null) {
    const hex = match[1];
    let decoded = '';
    for (let i = 0; i < hex.length; i += 2) {
      const code = parseInt(hex.substring(i, i + 2), 16);
      if (code >= 32 && code <= 126) {
        decoded += String.fromCharCode(code);
      }
    }
    if (decoded.length >= 4 && !seen.has(decoded)) {
      seen.add(decoded);
      results.push(decoded);
    }
  }

  return results;
}
