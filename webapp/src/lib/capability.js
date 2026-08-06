// What does this business already have online? Ported from
// scripts/lib/capability.js (Node CLI) to run inside the Worker — same logic,
// ESM export, no Node built-ins (fetch/URL/AbortSignal are all Workers-native).
// Used by leadgen-api.js right after a scrape finishes.

const CONCURRENCY = 6;
const TIMEOUT_MS = 10000;
const UA = "Mozilla/5.0 (compatible; LeadFlow/1.0)";

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

export const isSocialOnly = (url) => socialName(url) !== null;

export function describe(website, probe) {
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

export async function probeSite(url) {
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

async function mapPool(items, limit, fn) {
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) await fn(items[next++]);
    })
  );
}

// rows: [{ website, ... }] → same rows with a `capability` string added.
export async function addCapabilities(rows) {
  const needsProbe = rows.filter((r) => (r.website || "").trim() && !isSocialOnly(r.website.trim()));
  const probes = new Map();
  await mapPool(needsProbe, CONCURRENCY, async (r) => {
    probes.set(r, await probeSite(r.website.trim()));
  });
  return rows.map((r) => ({ ...r, capability: describe(r.website, probes.get(r)) }));
}
