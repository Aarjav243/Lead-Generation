// Turn a scrape CSV into SQL the webapp can load as one collection.
//
//   node scripts/import-leads-sql.js delhi-restaurants.csv --category Restaurants --city Delhi
//   cd webapp && npx wrangler d1 execute leadflow --local --file=../delhi-restaurants.sql
//
// Probing every lead's homepage takes a while — that's why this is a file you
// generate once, not an endpoint the app calls.
// Self-check: node scripts/import-leads-sql.js --selftest

const fs = require("fs");
const path = require("path");
const { parse } = require("csv-parse/sync");
const { addCapabilities } = require("./lib/capability");
const { normalizePhone } = require("./lib/normalize-phone");

const q = (v) => (v == null || v === "" ? "NULL" : `'${String(v).replace(/'/g, "''")}'`);

// Google Maps addresses run "..., Area, City, State PIN, Country" often enough
// that the tail is worth splitting; anything unexpected just comes back empty
// and stays editable in the app.
function splitAddress(address) {
  const parts = String(address || "").split(",").map((s) => s.trim()).filter(Boolean);
  const withoutCountry = parts.length > 1 && /^india$/i.test(parts.at(-1)) ? parts.slice(0, -1) : parts;
  const state = (withoutCountry.at(-1) || "").replace(/\s*\d{6}\s*$/, "").trim();
  const city = withoutCountry.at(-2) || "";
  const area = withoutCountry.at(-3) || "";
  return { area, city, state };
}

function toSql(rows, { category, city, sourceCsv }) {
  const out = [
    `INSERT INTO collections (category, city, source_csv) VALUES (${q(category)}, ${q(city)}, ${q(sourceCsv)});`,
  ];
  const values = rows.map((r) => {
    const a = splitAddress(r.address);
    return `((SELECT MAX(id) FROM collections), ${q(r.title)}, ${q(normalizePhone(r.phone) || r.phone)}, ` +
      `${q(r.website)}, ${q(r.capability)}, ${q(r.address)}, ${q(a.area)}, ${q(a.city || city)}, ${q(a.state)})`;
  });
  // Chunked so one oversized statement can't blow D1's limits.
  for (let i = 0; i < values.length; i += 50) {
    out.push(
      "INSERT INTO leads (collection_id, name, phone, website, capability, address, area, city, state) VALUES\n" +
      values.slice(i, i + 50).join(",\n") + ";"
    );
  }
  return out.join("\n\n") + "\n";
}

function selftest() {
  const assert = require("assert");
  assert.deepStrictEqual(
    splitAddress("Shop 5, Connaught Place, New Delhi, Delhi 110001, India"),
    { area: "Connaught Place", city: "New Delhi", state: "Delhi" }
  );
  assert.deepStrictEqual(splitAddress(""), { area: "", city: "", state: "" });
  assert.strictEqual(q("Bob's Cafe"), "'Bob''s Cafe'");   // quote injection can't escape the literal
  assert.strictEqual(q(""), "NULL");
  const sql = toSql([{ title: "X", phone: "", website: "", capability: "No website", address: "" }],
    { category: "Cafes", city: "Bhilai", sourceCsv: "x.csv" });
  assert(sql.includes("INSERT INTO collections") && sql.includes("INSERT INTO leads"));
  console.log("import-leads-sql selftest ok");
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes("--selftest")) return selftest();

  const csvPath = args.find((a) => !a.startsWith("--"));
  const flag = (name) => { const i = args.indexOf(`--${name}`); return i === -1 ? null : args[i + 1]; };
  const category = flag("category");
  const city = flag("city");
  if (!csvPath || !category || !city) {
    console.error('usage: node scripts/import-leads-sql.js <leads.csv> --category "Restaurants" --city Delhi [--out file.sql]');
    process.exit(1);
  }

  const rows = parse(fs.readFileSync(csvPath), { columns: true, skip_empty_lines: true });
  process.stderr.write(`Probing ${rows.length} leads…\n`);
  const withCaps = await addCapabilities(rows, (done, total) => {
    process.stderr.write(`\r  ${done}/${total}`);
  });
  process.stderr.write("\n");

  const outPath = flag("out") || csvPath.replace(/\.csv$/, ".sql");
  fs.writeFileSync(outPath, toSql(withCaps, { category, city, sourceCsv: path.basename(csvPath) }));

  const counts = {};
  for (const r of withCaps) counts[r.capability] = (counts[r.capability] || 0) + 1;
  console.log(`Wrote ${outPath} — ${withCaps.length} leads`);
  for (const [cap, n] of Object.entries(counts).sort((a, b) => b[1] - a[1])) console.log(`  ${n}\t${cap}`);
}

main();
