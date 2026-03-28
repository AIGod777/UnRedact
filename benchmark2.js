import { crossReferencePersons } from './src/lib/personsApi.ts';

async function main() {
  let fetchCount = 0;
  // Mock fetch
  global.fetch = async (url) => {
    fetchCount++;
    // Simulate network delay
    await new Promise(r => setTimeout(r, 100));
    return {
      ok: true,
      status: 200,
      json: async () => [{ id: 1, name: "Test Person" }]
    };
  };

  const text1 = "John Doe is here.";
  const text2 = "John Doe went there.";
  const text3 = "Mark Smith is with John Doe.";

  console.log("Starting benchmark...");
  const start = performance.now();
  await crossReferencePersons(text1);
  await crossReferencePersons(text2);
  await crossReferencePersons(text3);
  const end = performance.now();
  console.log(`With Cache: ${(end - start).toFixed(2)} ms (Fetches: ${fetchCount})`);
}

main();
