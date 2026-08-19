# HANDOFF — Lead Outreach Dashboard

> **SUPERSEDED (2026-08-04) by `PRD-webapp.md`.** This dashboard (read-only, no auth, localhost,
> 3 numbers per city) still runs on port 8090 and is untouched, but the project has moved to a
> multi-user webapp with logins, editable call outcomes, projects and money tracking. Keep this
> running until the replacement works, then retire it. **Lead scoring has been removed** (2026-08-04);
> only its website capability probe survives, as `scripts/lib/capability.js` — the new app's
> "Website / webapp" column.

## Status
**Built and verified (2026-07-25).** Three files added: `dashboard-manifest.json`, `scripts/dashboard-server.js`, `dashboard/index.html`.
- Run: `node scripts/dashboard-server.js` → open `http://127.0.0.1:8090` (PORT env overrides; 8090 chosen to avoid the 8080 scraper/portfolio collision noted in `HANDOFF.md`).
- Verified: `/api/stats` returns Clinic/Durg **54 total, 32 no-website, 20 messaged**; page polls every 10s; `node scripts/dashboard-server.js --selftest` asserts the aggregation invariants (total ≥ noWebsite ≥ messaged).
- Add a new department/city later: scrape it, run the send script, add one entry to `dashboard-manifest.json` pointing at its three files. No code change.
- Note: "messaged" counts **distinct phones** with `status === "sent"` in the sent log (dedupes re-run rows), matching the "leads messaged" label.

## Website capability probe (2026-08-04)
`scripts/lib/capability.js` — the surviving half of the deleted `score-leads.js`. Probes a lead's
homepage (plain `fetch`, 6 at a time, 10s timeout — **no LLM, no API key**) for online ordering,
QR/digital menu, delivery and table/appointment booking, and returns one description string per lead
(`No website`, `Website only — no online booking`, `Website + online booking`, `Full webapp — …`,
`Website broken / dead`). A "website" on facebook/instagram/wa.me/linktr.ee/business.site/zomato/swiggy
counts as **no real website** (they own nothing) and is never probed. `node scripts/lib/capability.js
--selftest` checks the output strings offline. Consumed by the new app's CSV import, not by this dashboard.

## Scope (as of this version)
Tracks only 3 numbers per department/city, updated automatically:
1. Total leads
2. Leads without a website
3. Leads messaged

**Reply tracking ("leads who replied" + names) is deliberately out of scope for now** — see "Deferred" below. That's an explicit, recent scope cut: it was in the original ask, but was dropped because it needs a WhatsApp listener process staying continuously logged in, which raises ban-risk beyond the current one-off sends. Don't add it back without checking with the user first.

## What already exists that this feature builds on
- `durg-clinics.csv` — full 54-lead Durg clinic scrape.
- `durg-clinics-no-website.csv` — 32-lead subset with no website.
- `whatsapp-sent-log.csv` — outreach log (`phone,title,status,detail,timestamp`), status ∈ `sent | failed | skipped_no_valid_phone`. Currently: 20 sent, 7 failed, 5 skipped.
- `scripts/whatsapp-send.js` — one-off batch sender (`--dry-run` / `--live` / `--limit=N`), keeps running exactly as-is; the dashboard does not change or depend on this script running.

## Planned architecture (simplified — no database, no WhatsApp process)
- **`dashboard-manifest.json`** (new) — small config mapping department → city → its three existing file paths:
  ```json
  { "clinic": { "durg": {
    "leadsFile": "durg-clinics.csv",
    "noWebsiteFile": "durg-clinics-no-website.csv",
    "sentLogFile": "whatsapp-sent-log.csv"
  } } }
  ```
- **`scripts/dashboard-server.js`** (new) — a Node stdlib `http` server (no Express, no new dependency):
  - `GET /api/stats` — for each department/city in the manifest, reads the three CSVs fresh with `csv-parse/sync` (already a project dependency) and returns `{ total, noWebsite, messaged }` (messaged = rows in `sentLogFile` with `status === "sent"`).
  - `GET /` — serves `dashboard/index.html`.
- **`dashboard/index.html`** (new) — plain HTML/CSS/JS, no framework. `fetch('/api/stats')` on load and every ~10s, renders department → city → the 3 counts.

## Why this shape (ponytail reasoning)
- **No separate lead database:** the three CSVs already fully contain what's needed (total, no-website, sent). Re-reading and counting them on each `/api/stats` request is one small function — building an ingestion step + JSON store would just be a slower-to-build duplicate of files that already exist.
- **No WhatsApp process at all:** since replies aren't tracked in this version, the dashboard never needs to touch WhatsApp — it only reads local files. This removes the ban-risk concern entirely for this version.
- **No Express/frontend framework:** the ask is "3 numbers, refreshed periodically" — stdlib `http` + plain JS covers it.
- **Manifest, not code changes, for new departments/cities:** adding "gym / raipur" later is one new entry in `dashboard-manifest.json` pointing at that scrape's three files — no code changes needed as long as the same three-file shape holds.

## Known constraints to carry forward
- The dashboard only updates while `scripts/dashboard-server.js` is running — but unlike the earlier reply-tracking design, this script does **not** need to stay logged into WhatsApp, so there's no meaningful automation/ban risk from leaving it running.
- Counts are only as fresh as the CSVs on disk — running a new scrape or a new `whatsapp-send.js --live` batch updates the files, and the dashboard picks that up on its next poll (no restart needed).

## Build order (next steps, in sequence)
1. `dashboard-manifest.json` — one entry for `clinic` / `durg` pointing at the existing three files.
2. `scripts/dashboard-server.js` — `/api/stats` aggregation + static file serving.
3. `dashboard/index.html` — department → city table, polling every ~10s.
4. Verify against known-good numbers: Clinic/Durg should show 54 total, 32 no-website, 20 messaged.

## Deferred (out of scope for this build — do not implement without re-confirming with the user)
**Reply tracking** — "leads replied" count + names of who replied. Would need:
- A persistent WhatsApp listener (`client.on('message', ...)`) sharing the existing `LocalAuth` session, matching incoming sender phone numbers to contacted leads.
- A place to store reply data (the earlier version of this doc used a `leads-db.json` file for this — that design is shelved, not deleted, in case this comes back).
- Re-acceptance of the higher ban-risk tradeoff (continuous WhatsApp login vs. one-off scripted sends) and the "only works while the listener is running" caveat.
Revisit prior session history for the full original design if/when this gets picked back up.
