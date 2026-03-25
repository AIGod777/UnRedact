import { describe, it } from 'node:test';
import * as assert from 'node:assert';
import { extractPreviousVersion } from './pdfForensics.ts';
import type { VersionInfo } from '../types.ts';

describe('extractPreviousVersion', () => {
  it('should return null if versionIndex is less than 0', () => {
    const data = new Uint8Array([1, 2, 3, 4, 5]);
    const versionInfo: VersionInfo = {
      count: 2,
      eofOffsets: [2, 4],
      hasMultipleVersions: true,
    };
    const result = extractPreviousVersion(data, versionInfo, -1);
    assert.strictEqual(result, null);
  });

  it('should return null if versionIndex is greater than or equal to eofOffsets.length', () => {
    const data = new Uint8Array([1, 2, 3, 4, 5]);
    const versionInfo: VersionInfo = {
      count: 2,
      eofOffsets: [2, 4],
      hasMultipleVersions: true,
    };

    assert.strictEqual(extractPreviousVersion(data, versionInfo, 2), null);
    assert.strictEqual(extractPreviousVersion(data, versionInfo, 5), null);
  });

  it('should return a sliced Uint8Array for a valid versionIndex', () => {
    const data = new Uint8Array([10, 20, 30, 40, 50, 60]);
    const versionInfo: VersionInfo = {
      count: 3,
      eofOffsets: [2, 4, 6],
      hasMultipleVersions: true,
    };

    // Index 0: endOffset is 2 -> slices data from 0 to 2
    const result0 = extractPreviousVersion(data, versionInfo, 0);
    assert.notStrictEqual(result0, null);
    assert.deepStrictEqual(Array.from(result0 as Uint8Array), [10, 20]);

    // Index 1: endOffset is 4 -> slices data from 0 to 4
    const result1 = extractPreviousVersion(data, versionInfo, 1);
    assert.notStrictEqual(result1, null);
    assert.deepStrictEqual(Array.from(result1 as Uint8Array), [10, 20, 30, 40]);
  });

  it('should handle empty data safely as long as offsets are provided', () => {
    const data = new Uint8Array([]);
    const versionInfo: VersionInfo = {
      count: 1,
      eofOffsets: [0],
      hasMultipleVersions: false,
    };

    const result = extractPreviousVersion(data, versionInfo, 0);
    assert.notStrictEqual(result, null);
    assert.deepStrictEqual(Array.from(result as Uint8Array), []);
  });
});
