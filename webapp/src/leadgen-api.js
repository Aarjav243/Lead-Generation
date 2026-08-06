// Generate Leads (core only): trigger a real Google Maps scrape from inside the
// webapp, then poll it to completion and import the results as a new collection.
// Owned by the leadgen agent — add routes here, don't touch screens-api.js.
//
// Async job model (see .claude/skills/google-maps-scraper/SKILL.md):
//   POST /api/core/scrape        -> geocodes area+city, creates the scraper job, returns { id }
//   GET  /api/core/scrape/:id    -> the browser polls this; the FIRST poll that sees the
//                                    scraper report "ok" does the download+parse+import
//                                    inline (that's the slow part, ~10s-1min) and flips
//                                    scrape_jobs.status to "done". Later polls just read the row.
//   GET  /api/core/scrape        -> recent job history for the screen's job list

import { parse } from "csv-parse/sync";
import { geocode } from "./lib/geocode.js";
import { addCapabilities } from "./lib/capability.js";

const SCRAPER_BASE = "http://localhost:8080";

function fail(message, status) {
  const e = new Error(message);
  e.status = status;
  throw e;
}

// Ported from scripts/lib/normalize-phone.js (Node CLI original).
function normalizePhone(raw) {
  const digits = (raw || "").replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("0")) return "91" + digits.slice(1);
  if (digits.length === 10) return "91" + digits;
  if (digits.length === 12 && digits.startsWith("91")) return digits;
  return null;
}

// Ported from scripts/import-leads-sql.js's splitAddress: Google Maps addresses
// run "..., Area, City, State PIN, Country" often enough that the tail is worth
// splitting; anything unexpected just comes back empty and stays editable in the app.
function splitAddress(address) {
  const parts = String(address || "").split(",").map((s) => s.trim()).filter(Boolean);
  const withoutCountry = parts.length > 1 && /^india$/i.test(parts.at(-1)) ? parts.slice(0, -1) : parts;
  const state = (withoutCountry.at(-1) || "").replace(/\s*\d{6}\s*$/, "").trim();
  const city = withoutCountry.at(-2) || "";
  const area = withoutCountry.at(-3) || "";
  return { area, city, state };
}

async function startScrape({ env, body, user }) {
  const category = String(body.category || "").trim();
  const city = String(body.city || "").trim();
  const area = String(body.area || "").trim();
  if (!category || !city) fail("Category and city are required", 422);

  const keyword = area ? `${category} in ${area} ${city}` : `${category} in ${city}`;
  const loc = await geocode(area ? `${area}, ${city}` : city);
  if (!loc) fail("Could not find that location", 422);

  const res = await fetch(`${SCRAPER_BASE}/api/v1/jobs`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      name: keyword, keywords: [keyword], lang: "en", zoom: 15,
      lat: loc.lat, lon: loc.lon, fast_mode: false, radius: 10000,
      depth: body.depth ? Number(body.depth) : 5, email: true, max_time: 300,
    }),
  });
  if (!res.ok) fail("Scraper request failed — is the scraper container running? (docker compose up -d)", 502);
  const { id } = await res.json();

  await env.DB.prepare(
    `INSERT INTO scrape_jobs (id, category, area, city, keyword, status, created_by) VALUES (?, ?, ?, ?, ?, 'working', ?)`
  ).bind(id, category, area || null, city, keyword, user.id).run();

  return { id };
}

async function pollScrape({ env, params }) {
  const job = await env.DB.prepare("SELECT * FROM scrape_jobs WHERE id = ?").bind(params.id).first();
  if (!job) fail("No such scrape job", 404);
  if (job.status === "done" || job.status === "failed") return { job };

  const res = await fetch(`${SCRAPER_BASE}/api/v1/jobs/${job.id}`);
  if (!res.ok) fail("Could not reach the scraper", 502);
  const { Status } = await res.json();

  if (Status === "working") return { job };

  if (Status === "failed") {
    await env.DB.prepare("UPDATE scrape_jobs SET status = 'failed', error = ? WHERE id = ?")
      .bind("Scrape failed — Google may be rate-limiting this IP", job.id).run();
    return { job: { ...job, status: "failed" } };
  }

  // Status === "ok": first poll to see this downloads, parses, and imports.
  const dl = await fetch(`${SCRAPER_BASE}/api/v1/jobs/${job.id}/download`);
  if (!dl.ok) fail("Could not download scrape results", 502);
  const rows = parse(await dl.text(), { columns: true, skip_empty_lines: true });

  const leadRows = rows.map((r) => {
    const a = splitAddress(r.address);
    return {
      name: r.title || null,
      phone: normalizePhone(r.phone) || r.phone || null,
      website: r.website || null,
      address: r.address || null,
      area: a.area || job.area || null,
      city: a.city || job.city,
      state: a.state || null,
    };
  });
  const withCapability = await addCapabilities(leadRows);

  const collection = await env.DB.prepare(
    "INSERT INTO collections (category, city, source_csv) VALUES (?, ?, ?) RETURNING id"
  ).bind(job.category, job.city, `scrape:${job.id}`).first();

  if (withCapability.length) {
    await env.DB.batch(
      withCapability.map((r) =>
        env.DB.prepare(
          `INSERT INTO leads (collection_id, name, phone, website, capability, address, area, city, state)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(collection.id, r.name, r.phone, r.website, r.capability, r.address, r.area, r.city, r.state)
      )
    );
  }

  await env.DB.prepare("UPDATE scrape_jobs SET status = 'done', collection_id = ? WHERE id = ?")
    .bind(collection.id, job.id).run();

  return { job: { ...job, status: "done", collection_id: collection.id }, imported: withCapability.length };
}

async function listScrapeJobs({ env }) {
  const { results } = await env.DB.prepare(
    "SELECT * FROM scrape_jobs ORDER BY created_at DESC LIMIT 30"
  ).all();
  return { jobs: results };
}

export const routes = {
  "POST /api/core/scrape": startScrape,
  "GET /api/core/scrape": listScrapeJobs,
  "GET /api/core/scrape/:id": pollScrape,
};
