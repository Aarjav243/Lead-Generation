// What does this business already have online?
// Fetches a lead's homepage and reports what they run today, so an outreach
// person knows what to pitch: "Website only — no online booking" vs
// "Website + online booking". No scoring, no ranking — just the facts.
//
// Used by the CSV importer. Self-check: node scripts/lib/capability.js --selftest

const CONCURRENCY = 6;
const TIMEOUT_MS = 10000;
const UA = "Mozilla/5.0 (compatible; LeadFlow/1.0)";

// The capabilities we sell. Presence here is what makes a lead already-served.
const SIGNALS = {
  ordering: /order\s*online|online\s*order|order\s*now|add to cart|checkout|start\s*(your\s*)?order|scan to order|qr\s*menu|digital\s*menu/,
  booking: /book\s*(a\s*)?table|reserv(e|ation)|book\s*(an\s*)?appointment|book\s*now|schedule\s*(a\s*)?(visit|call|demo)|enquiry\s*form|admission\s*form/,
  delivery: /home\s*delivery|free\s*delivery|doorstep|takeaway|take\s*away|parcel|self\s*pickup/,
};

// A "website" that is really someone else's profile page — a social account, a
// Google business.site, or an aggregator listing — means they own no site at all.
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
    return null; // unparseable URL — let the probe decide it's unreachable
  }
}

const isSocialOnly = (url) => socialName(url) !== null;

// Returns the short human description shown in the app's "Website / webapp" column.
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
    // Cap the read: signals live in the homepage markup, not in a 5MB bundle.
    const html = (await res.text()).slice(0, 400000).toLowerCase();
    return { reachable: true, html };
  } catch {
    return { reachable: false };
  }
}

// Fixed-size worker pool — hundreds of parallel fetches would just time out.
async function mapPool(items, limit, fn) {
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) await fn(items[next++]);
    })
  );
}

// rows: [{ website, ... }] → same rows with a `capability` string added.
async function addCapabilities(rows, onProgress) {
  const needsProbe = rows.filter((r) => (r.website || "").trim() && !isSocialOnly(r.website.trim()));
  const probes = new Map();
  let done = 0;
  await mapPool(needsProbe, CONCURRENCY, async (r) => {
    probes.set(r, await probeSite(r.website.trim()));
    if (onProgress) onProgress(++done, needsProbe.length);
  });
  return rows.map((r) => ({ ...r, capability: describe(r.website, probes.get(r)) }));
}

function selftest() {
  const assert = require("assert");
  const site = (html) => ({ reachable: true, html: html.toLowerCase() });

  assert.strictEqual(describe(""), "No website");
  assert.strictEqual(describe("   "), "No website");
  assert.strictEqual(
    describe("https://example.com", site("<h1>About us</h1> Our menu")),
    "Website only — no online booking"
  );
  assert.strictEqual(
    describe("https://example.com", site("Book an appointment with our dentist")),
    "Website + online booking"
  );
  assert.strictEqual(
    describe("https://example.com", site("Order Online now. Book a table. Home delivery available.")),
    "Full webapp — ordering, booking, delivery"
  );
  assert.strictEqual(describe("https://example.com", { reachable: false }), "Website broken / dead");

  // Contact/listing links are not a website they own, and are never probed.
  assert.strictEqual(describe("https://www.instagram.com/foo"), "No real website — Instagram page only");
  assert.strictEqual(describe("https://wa.me/919999900000"), "No real website — WhatsApp link only");
  assert.strictEqual(describe("https://www.zomato.com/foo"), "No real website — aggregator listing only");
  assert.strictEqual(describe("https://foo.business.site/"), "No real website — Google business page only");
  assert(!isSocialOnly("https://tancoffeeindia.com/"), "a real site must not be flagged social");

  console.log("capability selftest ok");
}

if (require.main === module) {
  if (process.argv.includes("--selftest")) { selftest(); process.exit(0); }
  console.error("usage: node scripts/lib/capability.js --selftest   (this is a library)");
  process.exit(1);
}

module.exports = { addCapabilities, describe, probeSite, isSocialOnly };
