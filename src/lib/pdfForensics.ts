import type { VersionInfo } from '../types';

/**
 * Scans raw PDF bytes for multiple %%EOF markers, indicating incremental saves.
 * Each %%EOF marks the end of a document version — multiple means the PDF
 * contains recoverable previous versions (potentially before redaction).
 */
export function detectIncrementalSaves(data: Uint8Array): VersionInfo {
  const eofMarker = new TextEncoder().encode('%%EOF');
  const offsets: number[] = [];

  for (let i = 0; i <= data.length - eofMarker.length; i++) {
    let match = true;
    for (let j = 0; j < eofMarker.length; j++) {
      if (data[i + j] !== eofMarker[j]) {
        match = false;
        break;
      }
    }
    if (match) {
      offsets.push(i + eofMarker.length);
      i += eofMarker.length; // Skip past this marker
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

const ESCAPE_N_PATTERN = /\\n/g;
const ESCAPE_R_PATTERN = /\\r/g;
const ESCAPE_T_PATTERN = /\\t/g;
const ESCAPE_SLASH_PATTERN = /\\\\/g;
const ESCAPE_PAREN_PATTERN = /\\([()])/g;

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
      .replace(ESCAPE_N_PATTERN, '\n')
      .replace(ESCAPE_R_PATTERN, '\r')
      .replace(ESCAPE_T_PATTERN, '\t')
      .replace(ESCAPE_SLASH_PATTERN, '\\')
      .replace(ESCAPE_PAREN_PATTERN, '$1');

    // Filter: must contain mostly printable ASCII/Unicode, min 4 chars
    let printableCount = 0;
    for (let i = 0; i < str.length; i++) {
      const charCode = str.charCodeAt(i);
      if (charCode >= 0x20 && charCode <= 0x7E) {
        printableCount++;
      }
    }
    const printableRatio = printableCount / str.length;
    const trimmedStr = str.trim();
    if (printableRatio > 0.7 && trimmedStr.length >= 4 && !seen.has(trimmedStr)) {
      seen.add(trimmedStr);
      results.push(trimmedStr);
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
