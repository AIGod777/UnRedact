import { TextItem, RedactionBox, TextUnderRedaction } from './src/types';

// Original
function findTextUnderRedactionsOriginal(
  textItems: TextItem[],
  redactionBoxes: RedactionBox[]
): TextUnderRedaction[] {
  const results: TextUnderRedaction[] = [];

  for (const box of redactionBoxes) {
    const pageTexts = textItems.filter((t) => t.page === box.page);

    for (const text of pageTexts) {
      const overlap = calculateOverlap(
        { x: text.x, y: text.y, w: text.width, h: text.height },
        { x: box.x, y: box.y, w: box.width, h: box.height }
      );

      if (overlap > 0.3) {
        results.push({
          text: text.str,
          box,
          textItem: text,
          overlapPercent: Math.round(overlap * 100),
        });
      }
    }
  }

  return results;
}

// Optimized
function findTextUnderRedactionsOptimized(
  textItems: TextItem[],
  redactionBoxes: RedactionBox[]
): TextUnderRedaction[] {
  const results: TextUnderRedaction[] = [];

  const textItemsByPage = new Map<number, TextItem[]>();
  for (const text of textItems) {
    const pageTexts = textItemsByPage.get(text.page) || [];
    pageTexts.push(text);
    textItemsByPage.set(text.page, pageTexts);
  }

  for (const box of redactionBoxes) {
    const pageTexts = textItemsByPage.get(box.page) || [];

    for (const text of pageTexts) {
      const overlap = calculateOverlap(
        { x: text.x, y: text.y, w: text.width, h: text.height },
        { x: box.x, y: box.y, w: box.width, h: box.height }
      );

      if (overlap > 0.3) {
        results.push({
          text: text.str,
          box,
          textItem: text,
          overlapPercent: Math.round(overlap * 100),
        });
      }
    }
  }

  return results;
}

function calculateOverlap(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number }
): number {
  const aTop = Math.max(a.y, a.y + a.h);
  const aBottom = Math.min(a.y, a.y + a.h);
  const bTop = Math.max(b.y, b.y + b.h);
  const bBottom = Math.min(b.y, b.y + b.h);

  const xOverlap = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x));
  const yOverlap = Math.max(0, Math.min(aTop, bTop) - Math.max(aBottom, bBottom));

  const intersectionArea = xOverlap * yOverlap;
  const aArea = Math.abs(a.w * a.h);

  if (aArea === 0) return 0;
  return intersectionArea / aArea;
}

// Generate test data
const textItems: TextItem[] = [];
for (let i = 0; i < 50000; i++) {
  textItems.push({
    str: `text ${i}`,
    x: Math.random() * 500,
    y: Math.random() * 500,
    width: 20,
    height: 10,
    fontName: 'Arial',
    page: Math.floor(i / 1000) + 1, // 50 pages, 1000 items each
  });
}

const redactionBoxes: RedactionBox[] = [];
for (let i = 0; i < 1000; i++) {
  redactionBoxes.push({
    x: Math.random() * 500,
    y: Math.random() * 500,
    width: 50,
    height: 20,
    page: Math.floor(i / 20) + 1, // 50 pages, 20 boxes each
  });
}

// Run benchmark
console.time('original');
findTextUnderRedactionsOriginal(textItems, redactionBoxes);
console.timeEnd('original');

console.time('optimized');
findTextUnderRedactionsOptimized(textItems, redactionBoxes);
console.timeEnd('optimized');

console.time('original');
findTextUnderRedactionsOriginal(textItems, redactionBoxes);
console.timeEnd('original');

console.time('optimized');
findTextUnderRedactionsOptimized(textItems, redactionBoxes);
console.timeEnd('optimized');

console.log('Done!');
