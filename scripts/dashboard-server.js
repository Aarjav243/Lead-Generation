// Lead Outreach Dashboard — stdlib http server.
// Reads dashboard-manifest.json, aggregates the three CSVs per department/city,
// serves dashboard/index.html + GET /api/stats. No framework, no database.
// Run: node scripts/dashboard-server.js   (PORT env overrides default 8090)

const http = require("http");
const fs = require("fs");
const path = require("path");
const { parse } = require("csv-parse/sync");
const { normalizePhone } = require("./lib/normalize-phone");

const ROOT = path.join(__dirname, "..");
const MANIFEST = path.join(ROOT, "dashboard-manifest.json");
const INDEX = path.join(ROOT, "dashboard", "index.html");
const PORT = process.env.PORT || 8090;

function readCsv(relPath) {
  const abs = path.join(ROOT, relPath);
  return parse(fs.readFileSync(abs), { columns: true, skip_empty_lines: true });
}

// For each department/city, recompute the 3 counts fresh from disk.
// Per-city try/catch so a missing/renamed file surfaces as one broken card,
// not a dead server or a silent zero.
function buildStats() {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST));
  const out = [];
  for (const [department, cities] of Object.entries(manifest)) {
    for (const [city, files] of Object.entries(cities)) {
      try {
        const total = readCsv(files.leadsFile).length;
        const noWebsiteRows = readCsv(files.noWebsiteFile);
        const noWebsite = noWebsiteRows.length;
        // sentLogFile may be shared across departments (whatsapp-send.js only
        // supports one global log), so scope "messaged" to phones that are
        // actually this department's own no-website leads — otherwise every
        // department sharing a log would inherit each other's sent counts.
        const eligiblePhones = new Set(
          noWebsiteRows.map((r) => normalizePhone(r.phone)).filter(Boolean)
        );
        const seen = new Set();
        const contacted = [];
        for (const r of readCsv(files.sentLogFile)) {
          const phone = normalizePhone(r.phone);
          if (r.status !== "sent" || !phone || !eligiblePhones.has(phone) || seen.has(phone)) continue;
          seen.add(phone);
          contacted.push({ title: r.title, phone: r.phone, timestamp: r.timestamp });
        }
        out.push({ department, city, total, noWebsite, messaged: contacted.length, contacted });
      } catch (err) {
        out.push({ department, city, error: err.message });
      }
    }
  }
  return out;
}

// node scripts/dashboard-server.js --selftest  → assert aggregation invariants, exit.
if (process.argv.includes("--selftest")) {
  const stats = buildStats();
  const assert = require("assert");
  assert(stats.length > 0, "manifest produced no stats");
  for (const s of stats) {
    if (s.error) throw new Error(`${s.department}/${s.city}: ${s.error}`);
    assert(Number.isInteger(s.total) && s.total >= 0, "total not a non-negative int");
    assert(s.noWebsite <= s.total, "noWebsite exceeds total");   // subset of leads
    assert(s.messaged <= s.noWebsite, "messaged exceeds noWebsite"); // only no-website leads are messaged
  }
  console.log("selftest ok:", JSON.stringify(stats));
  process.exit(0);
}

const server = http.createServer((req, res) => {
  if (req.url === "/api/stats") {
    try {
      const body = JSON.stringify({ stats: buildStats(), generatedAt: new Date().toISOString() });
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(body);
    } catch (err) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }
  if (req.url === "/" || req.url === "/index.html") {
    fs.readFile(INDEX, (err, data) => {
      if (err) {
        res.writeHead(500, { "Content-Type": "text/plain" });
        res.end("dashboard/index.html not found");
        return;
      }
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(data);
    });
    return;
  }
  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("Not found");
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Dashboard: http://127.0.0.1:${PORT}`);
});
