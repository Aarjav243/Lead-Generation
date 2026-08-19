// One-off: parse the raw Bhilai restaurants scrape CSV, classify/normalize each
// row (logic ported from webapp/src/lib/capability.js + leadgen-api.js, since the
// in-app "Generate Leads" screen that used to do this was removed in the v2
// rewrite), and emit a SQL file to import into the local D1 `leadflow` db.
import fs from "node:fs";

const CATEGORY = "Restaurants";
const CITY = "Bhilai";
const SOURCE = "scrape:e636bd61-2112-4332-8db6-7fa768c7958f";
const IN_CSV = "scratch/bhilai-restaurants-raw.csv";
const OUT_SQL = "scratch/import-bhilai.sql";

const UA = "Mozilla/5.0 (compatible; LeadFlow/1.0)";
const TIMEOUT_MS = 10000;

const SIGNALS = {
  ordering: /order\s*online|online\s*order|order\s*now|add to cart|checkout|start\s*(your\s*)?order|scan to order|qr\s*menu|digital\s*menu/,
  booking: /book\s*(a\s*)?table|reserv(e|ation)|book\s*(an\s*)?appointment|book\s*now|schedule\s*(a\s*)?(visit|call|demo)|enquiry\s*form|admission\s*form/,
  delivery: /home\s*delivery|free\s*delivery|doorstep|takeaway|take\s*away|parcel|self\s*pickup/,
};
const SOCIAL_HOST =
  /(^|\.)(facebook\.com|fb\.com|instagram\.com|linkedin\.com|twitter\.com|x\.com|wa\.me|whatsapp\.com|linktr\.ee|youtube\.com|business\.site|zomato\.com|swiggy\.com|dotpe\.in)$/;

function socialName(url) {
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (!SOCIAL_HOST.test(host)) return null;
    if (/instagram/.test(host)) return "Instagram page";
    if (/facebook|fb\.com/.test(host)) return "Facebook page";
    if (/wa\.me|whatsapp/.test(host)) return "WhatsApp link";
    if (/zomato|swiggy/.test(host)) return "aggregator listing";
    if (/business\.site/.test(host)) return "Google business page";
    return "social link";
  } catch {
    return null;
  }
}
const isSocialOnly = (url) => socialName(url) !== null;

function describe(website, probe) {
  const url = (website || "").trim();
  if (!url) return "No website";
  const social = socialName(url);
  if (social) return `No real website — ${social} only`;
  if (!probe || !probe.reachable) return "Website broken / dead";
  const has = {};
  for (const [name, re] of Object.entries(SIGNALS)) has[name] = re.test(probe.html);
  if (has.ordering && has.booking && has.delivery) return "Full webapp — ordering, booking, delivery";
  const parts = [];
  if (has.ordering) parts.push("online ordering");
  if (has.booking) parts.push("online booking");
  if (has.delivery) parts.push("delivery");
  if (!parts.length) return "Website only — no online booking";
  return `Website + ${parts.join(", ")}`;
}

async function probeSite(url) {
  try {
    const res = await fetch(url, {
      headers: { "user-agent": UA },
      redirect: "follow",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) return { reachable: false };
    const html = (await res.text()).slice(0, 400000).toLowerCase();
    return { reachable: true, html };
  } catch {
    return { reachable: false };
  }
}

// Extract IG/FB/LinkedIn links out of a page's raw (non-lowercased) HTML.
function extractSocials(html) {
  const found = new Set();
  const re = /https?:\/\/(?:www\.)?(instagram\.com|facebook\.com|fb\.com|linkedin\.com)\/[^\s"'<>)]+/gi;
  let m;
  while ((m = re.exec(html))) found.add(m[0].replace(/[),.]+$/, ""));
  return [...found];
}

function normalizePhone(raw) {
  const digits = (raw || "").replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("0")) return "91" + digits.slice(1);
  if (digits.length === 10) return "91" + digits;
  if (digits.length === 12 && digits.startsWith("91")) return digits;
  return null;
}

function splitAddress(address) {
  const parts = String(address || "").split(",").map((s) => s.trim()).filter(Boolean);
  const withoutCountry = parts.length > 1 && /^india$/i.test(parts.at(-1)) ? parts.slice(0, -1) : parts;
  const state = (withoutCountry.at(-1) || "").replace(/\s*\d{6}\s*$/, "").trim();
  const city = withoutCountry.at(-2) || "";
  const area = withoutCountry.at(-3) || "";
  return { area, city, state };
}

function parseCsv(text) {
  const rows = [];
  let cur = [], field = "", inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else inQ = false; }
      else field += c;
    } else {
      if (c === '"') inQ = true;
      else if (c === ",") { cur.push(field); field = ""; }
      else if (c === "\n") { cur.push(field); rows.push(cur); cur = []; field = ""; }
      else if (c === "\r") { /* skip */ }
      else field += c;
    }
  }
  if (field || cur.length) { cur.push(field); rows.push(cur); }
  return rows;
}

function sqlStr(v) {
  if (v === null || v === undefined || v === "") return "NULL";
  return "'" + String(v).replace(/'/g, "''") + "'";
}

async function main() {
  const text = fs.readFileSync(IN_CSV, "utf8");
  const rows = parseCsv(text);
  const header = rows[0];
  const idx = (name) => header.indexOf(name);
  const dataRows = rows.slice(1).filter((r) => r.length > 1);

  const businesses = dataRows.map((r) => ({
    name: r[idx("title")],
    phone: r[idx("phone")],
    website: r[idx("website")],
    address: r[idx("address")],
    placeId: r[idx("place_id")],
  }));

  const seen = new Set();
  const deduped = businesses.filter((b) => {
    if (!b.placeId) return true;
    if (seen.has(b.placeId)) return false;
    seen.add(b.placeId);
    return true;
  });

  console.log(`Parsed ${businesses.length} rows, ${deduped.length} after dedupe.`);

  const results = [];
  for (const b of deduped) {
    const website = (b.website || "").trim();
    let probe = null;
    let socials = [];
    if (website) {
      if (isSocialOnly(website)) {
        socials = [website];
      } else {
        probe = await probeSite(website);
        if (probe.reachable) socials = extractSocials(probe.html);
      }
    }
    const capability = describe(website, probe);
    const { area, city, state } = splitAddress(b.address);
    const note = socials.length ? `Socials: ${socials.join(", ")}` : null;
    results.push({
      name: b.name,
      phone: normalizePhone(b.phone),
      website: website || null,
      capability,
      address: b.address || null,
      area, city: city || CITY, state,
      note,
    });
    console.log(`  ${b.name} -> ${capability}${socials.length ? " | socials: " + socials.join(", ") : ""}`);
  }

  const lines = [];
  lines.push(
    `INSERT INTO collections (category, city, source_csv) VALUES (${sqlStr(CATEGORY)}, ${sqlStr(CITY)}, ${sqlStr(SOURCE)});`
  );
  for (const r of results) {
    lines.push(
      `INSERT INTO leads (collection_id, name, phone, website, capability, address, area, city, state, note) VALUES ((SELECT id FROM collections WHERE source_csv = ${sqlStr(SOURCE)}), ${sqlStr(r.name)}, ${sqlStr(r.phone)}, ${sqlStr(r.website)}, ${sqlStr(r.capability)}, ${sqlStr(r.address)}, ${sqlStr(r.area)}, ${sqlStr(r.city)}, ${sqlStr(r.state)}, ${sqlStr(r.note)});`
    );
  }

  fs.writeFileSync(OUT_SQL, lines.join("\n") + "\n");
  console.log(`\nWrote ${OUT_SQL} (${results.length} leads).`);
}

main();
