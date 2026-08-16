// node src/selftest.mjs — checks the two bits of logic that would fail silently:
// password hashing/verification and the route matcher. No wrangler, no network.
import assert from "node:assert";
import { hashPassword, verifyPassword } from "./auth.js";
import { matchPath } from "./index.js";
import { computeCommission } from "./screens-api.js";

const stored = await hashPassword("hunter2");
assert.match(stored, /^[0-9a-f]{32}:[0-9a-f]{64}$/, "hash format");
assert(await verifyPassword("hunter2", stored), "correct password must verify");
assert(!(await verifyPassword("hunter3", stored)), "wrong password must not verify");
assert.notStrictEqual(await hashPassword("hunter2"), stored, "salt must differ per hash");

assert.deepStrictEqual(matchPath("/api/collections", "/api/collections"), {});
assert.deepStrictEqual(matchPath("/api/collections/:id/leads", "/api/collections/7/leads"), { id: "7" });
assert.strictEqual(matchPath("/api/collections/:id", "/api/collections/7/leads"), null, "length must match");
assert.strictEqual(matchPath("/api/leads/:id", "/api/collections/7"), null, "literal segments must match");

// Commission slab table (PRD-webapp-v2.md) — every named band plus the
// unbounded +5,000 -> +1,000 step past the table.
assert.strictEqual(computeCommission(0), 0, "0 -> 0");
assert.strictEqual(computeCommission(5000), 0, "up to 5,000 -> 0");
assert.strictEqual(computeCommission(5001), 1000, "5,001 -> 1,000");
assert.strictEqual(computeCommission(10000), 1000, "10,000 -> 1,000");
assert.strictEqual(computeCommission(10001), 2000, "10,001 -> 2,000");
assert.strictEqual(computeCommission(15000), 2000, "15,000 -> 2,000");
assert.strictEqual(computeCommission(15001), 3000, "15,001 -> 3,000 (double-width band)");
assert.strictEqual(computeCommission(25000), 3000, "25,000 -> 3,000 (double-width band)");
assert.strictEqual(computeCommission(25001), 4000, "25,001 -> 4,000");
assert.strictEqual(computeCommission(30000), 4000, "30,000 -> 4,000");
assert.strictEqual(computeCommission(35000), 5000, "35,000 -> 5,000");
assert.strictEqual(computeCommission(40000), 6000, "40,000 -> 6,000");
assert.strictEqual(computeCommission(40001), 7000, "40,001 -> 7,000 (first +5,000 step)");
assert.strictEqual(computeCommission(45000), 7000, "45,000 -> 7,000 (still first step)");
assert.strictEqual(computeCommission(45001), 8000, "45,001 -> 8,000 (second +5,000 step)");

console.log("webapp selftest ok");
