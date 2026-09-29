// Fails when the browser script outgrows its budget (1 KB gzipped), so it stays
// something you add without thinking about it.
import { readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";

const BUDGET = 1024;
const size = gzipSync(readFileSync("dist/auto.js"), { level: 9 }).length;
console.log(`dist/auto.js: ${size} bytes gzipped (budget ${BUDGET})`);
if (size > BUDGET) {
  console.error(`Over budget by ${size - BUDGET} bytes.`);
  process.exit(1);
}
