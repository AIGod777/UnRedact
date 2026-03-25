import { performance } from 'perf_hooks';

const ESCAPE_N_PATTERN = /\\n/g;
const ESCAPE_R_PATTERN = /\\r/g;
const ESCAPE_T_PATTERN = /\\t/g;
const ESCAPE_SLASH_PATTERN = /\\\\/g;
const ESCAPE_PAREN_PATTERN = /\\([()])/g;
const PRINTABLE_PATTERN = /[\x20-\x7E]/g;

// Dummy implementation of the loop
function original(text: string) {
  const stringPattern = /\(([^)]{4,200})\)/g;
  let match: RegExpExecArray | null;
  const results = [];
  const seen = new Set<string>();

  while ((match = stringPattern.exec(text)) !== null) {
    const str = match[1]
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, '\r')
      .replace(/\\t/g, '\t')
      .replace(/\\\\/g, '\\')
      .replace(/\\([()])/g, '$1');

    const printableRatio = (str.match(/[\x20-\x7E]/g) || []).length / str.length;
    if (printableRatio > 0.7 && str.trim().length >= 4 && !seen.has(str.trim())) {
      seen.add(str.trim());
      results.push(str.trim());
    }
  }
  return results;
}

function optimized(text: string) {
  const stringPattern = /\(([^)]{4,200})\)/g;
  let match: RegExpExecArray | null;
  const results = [];
  const seen = new Set<string>();

  while ((match = stringPattern.exec(text)) !== null) {
    const str = match[1]
      .replace(ESCAPE_N_PATTERN, '\n')
      .replace(ESCAPE_R_PATTERN, '\r')
      .replace(ESCAPE_T_PATTERN, '\t')
      .replace(ESCAPE_SLASH_PATTERN, '\\')
      .replace(ESCAPE_PAREN_PATTERN, '$1');

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
  return results;
}

// Generate some text
let text = '';
for (let i = 0; i < 50000; i++) {
  text += `(This is a test string number ${i} with some escaped chars \\n \\r \\t \\\\ \\( \\) and regular text.)\n`;
}

console.log('Running benchmark...');

// Warmup
for(let i=0; i<5; i++) {
  original(text);
  optimized(text);
}

const startOriginal = performance.now();
for(let i=0; i<10; i++) {
  original(text);
}
const endOriginal = performance.now();

const startOptimized = performance.now();
for(let i=0; i<10; i++) {
  optimized(text);
}
const endOptimized = performance.now();

const originalTime = endOriginal - startOriginal;
const optimizedTime = endOptimized - startOptimized;

console.log(`Original: ${originalTime.toFixed(2)} ms`);
console.log(`Optimized: ${optimizedTime.toFixed(2)} ms`);
console.log(`Improvement: ${((originalTime - optimizedTime) / originalTime * 100).toFixed(2)}%`);
