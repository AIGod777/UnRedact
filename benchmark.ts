import { detectIncrementalSaves as detectIncrementalSavesNew } from './src/lib/pdfForensics.ts';

function detectIncrementalSavesOld(data: Uint8Array) {
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


// Generate a large dummy PDF buffer
const size = 50 * 1024 * 1024; // 50MB
const data = new Uint8Array(size);
// fill with random noise
for (let i = 0; i < size; i++) {
  data[i] = Math.floor(Math.random() * 256);
}

// Insert some EOF markers
const marker = new TextEncoder().encode('%%EOF');
data.set(marker, 1000000);
data.set(marker, 25000000);
data.set(marker, 49000000);

console.log("Warming up...");
detectIncrementalSavesOld(data);
detectIncrementalSavesNew(data);

console.log("Benchmarking Old...");
const startOld = performance.now();
for (let i = 0; i < 10; i++) {
  detectIncrementalSavesOld(data);
}
const endOld = performance.now();
console.log(`Old: ${(endOld - startOld).toFixed(2)} ms`);

console.log("Benchmarking New...");
const startNew = performance.now();
for (let i = 0; i < 10; i++) {
  detectIncrementalSavesNew(data);
}
const endNew = performance.now();
console.log(`New: ${(endNew - startNew).toFixed(2)} ms`);

console.log(`Improvement: ${( (endOld - startOld) / (endNew - startNew) ).toFixed(2)}x faster`);

const oldRes = detectIncrementalSavesOld(data);
const newRes = detectIncrementalSavesNew(data);
console.log(JSON.stringify(oldRes) === JSON.stringify(newRes) ? "Results match" : "Results DO NOT match");
