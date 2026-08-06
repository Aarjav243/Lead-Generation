// node src/selftest.mjs — checks the two bits of logic that would fail silently:
// password hashing/verification and the route matcher. No wrangler, no network.
import assert from "node:assert";
import { hashPassword, verifyPassword } from "./auth.js";
import { matchPath } from "./index.js";

const stored = await hashPassword("hunter2");
assert.match(stored, /^[0-9a-f]{32}:[0-9a-f]{64}$/, "hash format");
assert(await verifyPassword("hunter2", stored), "correct password must verify");
assert(!(await verifyPassword("hunter3", stored)), "wrong password must not verify");
assert.notStrictEqual(await hashPassword("hunter2"), stored, "salt must differ per hash");

assert.deepStrictEqual(matchPath("/api/collections", "/api/collections"), {});
assert.deepStrictEqual(matchPath("/api/collections/:id/leads", "/api/collections/7/leads"), { id: "7" });
assert.strictEqual(matchPath("/api/collections/:id", "/api/collections/7/leads"), null, "length must match");
assert.strictEqual(matchPath("/api/leads/:id", "/api/collections/7"), null, "literal segments must match");

console.log("webapp selftest ok");
