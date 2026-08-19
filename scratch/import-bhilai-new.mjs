// Classifies the 99 newly-found, deduped Bhilai restaurants (scratch/bhilai-new-merged.json,
// produced by merging the 9 keyword-scrape CSVs and excluding place_ids already in collection 4)
// and appends them to the EXISTING "Restaurants · Bhilai" collection — no new collection row.
// Same classification logic as import-bhilai.mjs (ported from the deleted capability.js/leadgen-api.js).
import fs from "node:fs";

const COLLECTION_ID = 4;
const IN_JSON = "scratch/bhilai-new-merged.json";
const OUT_SQL = "scratch/import-bhilai-new.sql";

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

function sqlStr(v) {
  if (v === null || v === undefined || v === "") return "NULL";
  return "'" + String(v).replace(/'/g, "''") + "'";
}

async function main() {
  const businesses = JSON.parse(fs.readFileSync(IN_JSON, "utf8"));
  console.log(`Classifying ${businesses.length} new restaurants...`);

  const lines = [];
  let i = 0;
  for (const b of businesses) {
    i++;
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
    const name = b.title;
    const phone = normalizePhone(b.phone);
    lines.push(
      `INSERT INTO leads (collection_id, name, phone, website, capability, address, area, city, state, note) VALUES (${COLLECTION_ID}, ${sqlStr(name)}, ${sqlStr(phone)}, ${sqlStr(website || null)}, ${sqlStr(capability)}, ${sqlStr(b.address || null)}, ${sqlStr(area)}, ${sqlStr(city || "Bhilai")}, ${sqlStr(state)}, ${sqlStr(note)});`
    );
    console.log(`  [${i}/${businesses.length}] ${name} -> ${capability}${socials.length ? " | socials: " + socials.join(", ") : ""}`);
  }

  fs.writeFileSync(OUT_SQL, lines.join("\n") + "\n");
  console.log(`\nWrote ${OUT_SQL} (${lines.length} leads).`);
}

main();
