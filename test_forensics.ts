import { findOrphanedStrings } from './src/lib/pdfForensics';

// Test string encoding for text decoder to latin1
function createData(str: string): Uint8Array {
  // Use latin1 encoding
  const buffer = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) {
    buffer[i] = str.charCodeAt(i) & 0xff;
  }
  return buffer;
}

const tests = [
  {
    input: "(hello world) <12345678>",
    description: "simple matching",
    expectedHas: ["hello world"],
    expectedNotHas: ["12345678"] // hex string decoded length must be >=4 printable. "1234" is not printable
  },
  {
    input: "random text (this is valid) more random (abc) (this is too short)",
    description: "multiple and short filtering",
    expectedHas: ["this is valid"],
    expectedNotHas: ["abc"] // filtered out due to length < 4
  },
  {
    input: "a".repeat(300) + "(" + "b".repeat(201) + ")" + "(this is valid too)",
    description: "too long string is ignored",
    expectedHas: ["this is valid too"],
    expectedNotHas: ["b".repeat(201)]
  },
  {
    input: "unmatched (paren with text ",
    description: "unmatched paren",
    expectedHas: [],
  },
  {
    input: "nested \\(paren\\) text (this is valid)",
    description: "escaped paren inside string",
    expectedHas: ["this is valid"],
  },
  {
    input: "(".repeat(1000000) + ")",
    description: "DoS attempt with 1M open parens",
    expectedHas: [], // It will be too long since it matches the first ( and the last )
                     // length is 1M - 1, which is > 200, so it skips it.
  }
];

let allPassed = true;

for (const t of tests) {
  const data = createData(t.input);
  const results = findOrphanedStrings(data);

  console.log(`Test: ${t.description}`);
  console.log(`Results: ${JSON.stringify(results)}`);

  for (const expected of t.expectedHas) {
    if (!results.includes(expected)) {
      console.error(`  ❌ Failed: Expected to find "${expected}" in results`);
      allPassed = false;
    } else {
      console.log(`  ✅ Passed: Found "${expected}"`);
    }
  }

  for (const notExpected of (t.expectedNotHas || [])) {
    if (results.includes(notExpected)) {
      console.error(`  ❌ Failed: Expected NOT to find "${notExpected}" in results`);
      allPassed = false;
    } else {
      console.log(`  ✅ Passed: Did not find "${notExpected}"`);
    }
  }
}

if (!allPassed) {
  process.exit(1);
} else {
  console.log('All tests passed!');
}
