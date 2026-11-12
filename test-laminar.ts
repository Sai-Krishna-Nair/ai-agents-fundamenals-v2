import 'dotenv/config';
import { Laminar, observe } from '@lmnr-ai/lmnr';

console.log(
  "Checking Key:",
  process.env.LMNR_PROJECT_API_KEY
    ? "Found key (starts with " + process.env.LMNR_PROJECT_API_KEY.slice(0, 8) + "...)"
    : "MISSING KEY!"
);

Laminar.initialize({
  projectApiKey: process.env.LMNR_PROJECT_API_KEY,
});

async function main() {
  // Pass the function directly into observe()
  const result = await observe({ name: 'manual-test-agent' }, async () => {
    console.log("Running observed block...");
    return "Hello Laminar";
  });

  console.log("Result:", result);
  console.log("Flushing to Laminar...");
  
  await Laminar.shutdown();
  console.log("Finished. Check your Laminar dashboard now!");
}

main().catch(console.error);