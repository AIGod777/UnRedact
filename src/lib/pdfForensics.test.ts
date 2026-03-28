import test from "node:test";
import assert from "node:assert";
import { detectIncrementalSaves } from "./pdfForensics.ts";

test("detectIncrementalSaves", async (t) => {
  await t.test("buffer without %%EOF", () => {
    const data = new TextEncoder().encode("just some normal text data");
    const result = detectIncrementalSaves(data);
    assert.deepStrictEqual(result, {
      count: 0,
      eofOffsets: [],
      hasMultipleVersions: false,
    });
  });

  await t.test("buffer with a single %%EOF marker", () => {
    const data = new TextEncoder().encode("some content %%EOF");
    const result = detectIncrementalSaves(data);
    assert.deepStrictEqual(result, {
      count: 1,
      eofOffsets: [18],
      hasMultipleVersions: false,
    });
  });

  await t.test("buffer with multiple %%EOF markers separated by text", () => {
    const data = new TextEncoder().encode("version 1 %%EOF version 2 %%EOF");
    const result = detectIncrementalSaves(data);
    assert.deepStrictEqual(result, {
      count: 2,
      eofOffsets: [15, 31],
      hasMultipleVersions: true,
    });
  });

  await t.test("buffer with consecutive %%EOF%%EOF markers (edge case)", () => {
    const data = new TextEncoder().encode("version 1 %%EOF%%EOF version 3 %%EOF");
    const result = detectIncrementalSaves(data);
    assert.deepStrictEqual(result, {
      count: 3,
      eofOffsets: [15, 20, 36],
      hasMultipleVersions: true,
    });
  });

  await t.test("buffer that ends right after %%EOF", () => {
    const data = new TextEncoder().encode("%%EOF");
    const result = detectIncrementalSaves(data);
    assert.deepStrictEqual(result, {
      count: 1,
      eofOffsets: [5],
      hasMultipleVersions: false,
    });
  });

  await t.test("buffer that starts with %%EOF", () => {
    const data = new TextEncoder().encode("%%EOF trailing data");
    const result = detectIncrementalSaves(data);
    assert.deepStrictEqual(result, {
      count: 1,
      eofOffsets: [5],
      hasMultipleVersions: false,
    });
  });
});
