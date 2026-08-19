# HANDOFF — Lead Generator (Scrape → Outreach → Dashboard)

## Current state (2026-08-16) — READ THIS FIRST, supersedes everything below

Working session against the running local webapp (`npx wrangler dev` in `webapp/`, port 8787,
auto-reloads on save). All items below were **verified live via Playwright** (login as
`core1`/`e3d72403`), not just claimed — this session had a prior pattern of wrong "fixed" claims
(bad measurement methodology on a sticky-header bug), so every fix here was re-checked against the
real DOM/API before reporting done.

**Sticky table headers — fixed, and the earlier "still broken" report was a test bug, not a CSS
bug.** `<thead>`'s own bounding box doesn't move even when its child `<th>` cells are individually
`position: sticky` — measure the `<th>` itself. Confirmed fixed on both the core lead table and the
outreach "My Leads" screen.

**"Problem Set 2" (from the user's "Problems with crm" Google Doc) — fixed:**
- Money inputs (`total_amount`, `amount_paid`, `ai_fees`, commission) now accept comma-formatted
  digit grouping (`type="text" inputmode="decimal"` + a `parseAmount`/`fmtAmount` helper pair in
  each of `screens.js` and `dashboard.js`) — `type="number"` was rejecting typed commas outright,
  making it easy to mistype 1,000 vs 10,000.
- Auto-calculated fields (Left = Total − Paid on Converted Leads; commission on Meetings Finalized)
  update **in place** now instead of calling a full `render*(mount)` re-render — a full re-render
  reset the now-scrollable `.table-wrap`'s `scrollTop`, which read as "jumps back to the first row"
  on every edit.
- Meetings Finalized's "Converted" dropdown can be flipped Yes→No to undo a wrongly-entered
  conversion: `POST /api/core/meetings/:id/reopen` deletes the `projects` row (and its
  `payments`/`project_assignees`, since there's no `ON DELETE CASCADE`) so the lead goes back to
  unconverted and can be re-closed with the correct value.

**This session's new work (2026-08-16), all live-verified:**
1. **Converted Leads now shows "Outreach person" and "Incentive" columns**, mirroring what Meetings
   Finalized already showed. `listConverted()` in `webapp/src/screens-api.js` gained a
   `LEFT JOIN users ou ON ou.id = l.assigned_to`; `convertedRow()` in `webapp/public/screens.js`
   renders `p.outreach_name` and `p.commission`.
2. **Outreach Performance dashboard (D1) now shows a per-month "Incentive" column** — same
   `SUM(p.commission) GROUP BY month` join pattern already used by Salaries (D3) and Expenses (D4),
   just scoped to one `userId`. `outreachPerformance()` in `webapp/src/dashboard-api.js`;
   `renderOutreach()` in `webapp/public/dashboard.js`.
3. **Incentive/commission is now editable**, not locked. The `schema.sql` comment above
   `projects.commission` ("LOCKED at conversion time... never moves afterwards") is **now stale** —
   the user explicitly asked to be able to change it. `commission` was added to `PROJECT_FIELDS` in
   `screens-api.js` (so `PATCH /api/core/converted/:id` accepts it), and the Converted Leads
   "Incentive" cell is now an `<input class="f-commission">` wired the same way as the other money
   fields. Editing it here also changes what Meetings Finalized displays — both read the same
   `projects.commission` column.
4. **Deal value on Meetings Finalized is now editable after conversion, without touching the
   Converted dropdown.** Previously the `.f-total` input was `disabled` once converted, and the only
   way to fix a mistyped deal value was the reopen/re-close dance (which deletes-and-recreates the
   project, e.g. resetting `converted_at`). Now the field stays enabled; on blur, if the row is
   already converted it `PATCH`es `/api/core/converted/:projectId` with the new `total_amount`
   directly, leaving Converted=Yes and the commission untouched. Required `closeMeeting()` to start
   returning `project_id` (`result.meta.last_row_id`) so the frontend has it without a reload; rows
   now carry `data-project="<id or empty>"` (set in `meetingRow()`) which `wireMeetingRow()` uses
   as the "is this row converted" flag instead of `totalInput.disabled`.

**Not done / open:**
- None of this session's 2026-08-16 changes are committed — standing instruction is never commit to
  `main` unless explicitly asked.
- `schema.sql`'s comment on `projects.commission` still says "LOCKED... never moves afterwards" —
  now inaccurate given item 3 above. Low-priority doc hygiene, not fixed yet.
- Scratchpad Playwright test scripts and `/tmp/*.png` screenshots from this session's verification
  runs haven't been cleaned up (low priority, hygiene only).
- The "keep or delete `scratch/bhilai-*` files" question from the 2026-08-14 entry below is still
  unresolved.

## Current state (2026-08-14) — supersedes "Next Steps" below

**v2 fixes landed** (from `PRD-webapp-v2.md` Problems 1, 2, 5 + add-ups 1, 2), verified live against
the running local D1, not just read:
- **Bulk-assign now reassigns leads that already have an owner**, not just unassigned ones.
  `webapp/src/screens-api.js` `assignBulk` dropped its `assigned_to IS NULL` filter — it now
  overwrites `assigned_to` for every lead in scope (or top N if a count is given), ordered so
  weak/no-website leads go first. This is a deliberate behavior change per explicit user request.
- **Native `alert()` after bulk-assign replaced with an in-app toast** (`LeadFlow.toast(message)` in
  `webapp/public/app.js`, styled in `webapp/public/style.css`, wired in `webapp/public/screens.js`).
  Plain DOM/CSS, no native dialog — renders identically once deployed. Names the outreach person in
  the message.
- Dev server: use **`npx wrangler dev`** inside `webapp/`, not `npm run dev` — `wrangler` isn't on
  PATH / in `node_modules/.bin` in this environment; `npm run dev` fails with "not recognized". This
  is a standing fix, not a one-off.

**New: "Restaurants · Bhilai" collection imported into the CRM** (user request: "Find all restaurants
in bhilai and put it in the crm"). Since v2 removed the in-app "Generate Leads" screen (see
`webapp/src/leadgen-api.js` etc., deleted from the working tree but recoverable via `git show
HEAD:<path>`), this was done as a standalone one-off pipeline rather than re-adding that screen:
- `scratch/bhilai-restaurants-raw.csv` — first scrape, single keyword "restaurants in Bhilai",
  depth 5, 20 results. **This was NOT "all restaurants"** — the user correctly called this out
  (Kwality and others were missing). Google Maps depth-5/single-keyword search only returns the top
  ~20 hits for that one term.
- `scratch/import-bhilai.mjs` — one-off Node script (capability classification, address split, phone
  normalization, IG/FB/LinkedIn social extraction ported from the deleted `webapp/src/lib/capability.js`
  / `leadgen-api.js`) that turns a raw scraper CSV into SQL matching the `collections`/`leads` schema.
  Emits **individual `INSERT` statements**, not a `UNION ALL` — SQLite's compound-SELECT term limit
  rejected the first attempt ("too many terms in compound SELECT").
  Run: `node scratch/import-bhilai.mjs` then `npx wrangler d1 execute leadflow --local --file=scratch/import-bhilai.sql`
  (from `webapp/`). Verified via the app's own `/api/core/collections` API afterward.
  First batch imported: collection id 4, 20 leads.
- **Deeper multi-keyword scrape found a real scraper bug**: a single job with 9 keywords + depth 15
  hit the scraper's own **~60s inactivity watchdog**, which force-killed the job mid-scroll on the
  first big listing ("family restaurants in Bhilai", 108 places found) *before* any place-detail
  pages were visited — job reports `"Status":"ok"` but the CSV download is genuinely empty. Root
  cause confirmed via `docker logs gmaps-scraper` (`"error":"inactivity timeout"` right as the
  60034ms listing job finished). **Fix: one keyword per job, depth ~10, run sequentially** — keeps
  each listing phase safely under the watchdog window. `scratch/deep-scrape-bhilai.sh` did this for
  9 keywords (family/veg/non-veg/dhaba/fast food/fine dining/hotel restaurant/cafe + "Kwality
  restaurant Bhilai" by name) → `scratch/bhilai-kw-1.csv` .. `bhilai-kw-9.csv`.
- **DONE: merged into collection id 4.** Deduped all 9 keyword CSVs by `place_id` against the
  original 20 (whose `place_id`s live in `scratch/bhilai-restaurants-raw.csv`, not in the `leads`
  table) → 99 unique new restaurants, incl. **Kwality** (`scratch/bhilai-new-merged.json`).
  Classified with `scratch/import-bhilai-new.mjs` (same capability/address/phone/social logic as
  `import-bhilai.mjs`, but targets `collection_id = 4` directly, no new collection row) →
  `scratch/import-bhilai-new.sql`, executed via `npx wrangler d1 execute leadflow --local
  --file=../scratch/import-bhilai-new.sql` from `webapp/`. **Verified**: collection 4 now has
  **119 total leads** (20 + 99), and "KWALITY VEG RESTAURANT AND ICE CREAM" (phone
  919981042355, no website) is confirmed present — the specific gap the user flagged is closed.

## Next Steps (current, read before the older "Next Steps" section below)
1. Ask the user whether to keep or delete the `scratch/bhilai-*` working files (raw/kw-N CSVs,
   merged JSON, SQL, scripts) now that the import is verified — not yet resolved.
2. Decide whether to commit the `assignBulk`/toast changes AND the Bhilai import scripts —
   **not committed yet**, standing instruction is never commit to `main` unless explicitly asked.


## Goal
Three-stage local lead-gen pipeline:
1. **Google Maps scraper** (`gosom/google-maps-scraper`, Dockerized, REST API on `http://127.0.0.1:8080`) — bulk-finds businesses by keyword+location, returns name/phone/email/website/address/rating.
2. **ScrapeGraphAI enrichment** (`scripts/enrich.py`, LLM-based, optional) — reads a lead's website and extracts contact-name, direct email, services, business-size signal that plain scraping can't get.
3. **WhatsApp outreach** (`scripts/whatsapp-send.js`) — pitches a website + online booking system (₹10,000, signed "Arc Studio") to leads with no website, via the user's own WhatsApp Web session.

Most recent concrete work: scraped Durg, Chhattisgarh clinics, found the 32 with no website, and WhatsApp-pitched all of them. Now planning a live dashboard to track this (and future department/city batches) going forward — **not built yet**.

## Current Progress
- **Scraper pipeline**: built and verified end-to-end (Maps scrape → CSV → optional AI enrichment).
  - Ran: "clinics in Durg Chhattisgarh", depth 20, email extraction on.
  - Result: **54 clinics found, 32 have no website** → `durg-clinics-no-website.csv` (project root, fields: title, phone, emails, website, category, address, review_rating, review_count). Full 54 in `durg-clinics.csv`.
  - `.env` set up with `SCRAPER_BASE_URL`, `GOOGLE_API_KEY` (user's live Gemini key, free tier) for `enrich.py`. Not yet run on the Durg batch.
- **WhatsApp outreach**: `scripts/whatsapp-send.js` built and run live against all 32 no-website leads (`node scripts/whatsapp-send.js --live`; `--dry-run` for a preview, `--limit=N` to cap).
  - Uses the user's real number (7987358884) via `whatsapp-web.js` + `LocalAuth` — session is already authenticated (no QR needed on future runs unless the session is cleared).
  - Result (final, in `whatsapp-sent-log.csv`): **20 sent, 7 failed, 5 skipped** (no phone number in scrape data). Failures were all `"No LID for user..."` — numbers not reachable on WhatsApp (landline/not registered), not a script bug.
  - Script is resume-safe: re-running `--live` skips numbers already logged as `sent`, so it's safe to re-run after adding new leads.
- **Dashboard (planned, not built)**: `PRD-dashboard.md` and `HANDOFF-dashboard.md` (project root) spec a per-department → per-city live dashboard (total leads / no-website / contacted / replied + replier names), backed by a persistent WhatsApp listener that also watches for incoming replies. See those two files for the full spec and build order — this section will be updated once work actually starts.

## What Worked
- **Always use `127.0.0.1:8080`, never `localhost:8080`** for the scraper API — an unrelated local Python dev server (portfolio site) also listens on 8080 and Windows sometimes resolves `localhost` to it via IPv6. Both `scripts/scrape.py` and `scripts/scrape.sh` default to `127.0.0.1`.
- **Bumped `docker-compose.yml` image pin from `v1.15.0` → `v1.17.2`.** `v1.15.0`'s Playwright driver download 404s permanently (upstream CDN pruned that build) — job gets stuck `"Status":"working"` forever. Confirmed NOT a transient blip (retried twice). If it recurs, check `docker logs gmaps-scraper` for the same driver-install 404 and bump to the newest tag (Docker Hub API: `curl https://hub.docker.com/v2/repositories/gosom/google-maps-scraper/tags`).
- **`gemini-flash-latest` model alias** works for the user's Gemini key; `gemini-2.5-flash` 404s ("no longer available to new users") despite being listed in the models API.
- For big/slow scrapes (high depth + `email:true`), **poll job status directly via `curl`** in a background command rather than relying only on `scrape.py`'s internal poll loop — it gives up after ~16 min even if the server job is still legitimately working.
- **csv-parse/sync** (not naive `.split(',')`) for reading lead CSVs — the `address` field contains embedded commas inside quotes.
- **Resumable send log** (`whatsapp-sent-log.csv`, checked before each send) avoids double-messaging leads on a re-run — important since `--live` runs can be interrupted.
- **QR as a PNG file** (`qrcode` npm package writing to `whatsapp-qr.png`), in addition to the ASCII terminal render — the terminal QR was hard for the user to scan reliably from chat.
- A "couldn't link device" WhatsApp error during QR scan resolved itself on a clean retry after ruling out the common causes (linked-device limit, VPN, wrong phone date/time, outdated app) — treat as transient unless it recurs consistently.

## What Didn't Work / Known Bugs (fixed, but watch for regressions)
- **`scrapegraphai` 1.76.0 package bug**: imports `ChatOllama` from `langchain_community.chat_models`, which no longer exists in `langchain-community>=0.4.0`. Fixed by patching 9 files in `.venv/Lib/site-packages/scrapegraphai/nodes/*.py` to import from `langchain_ollama` instead. **This patch lives in the venv, not project source** — lost if the venv is recreated; reapply or downgrade `langchain-community` if upstream hasn't fixed it.
- **Windows console Unicode crashes (cp1252)**: `scripts/scrape.py` / `scripts/enrich.py` print ▶/✓/✗. Fixed with `sys.stdout.reconfigure(encoding="utf-8")` / `sys.stderr.reconfigure(...)` after imports in both files.
- **Separate Unicode bug**: `scripts/scrape.py`'s CSV/JSON writer didn't specify `encoding="utf-8"`, crashing on Devanagari characters in real business names. Fixed by adding `encoding="utf-8"` to both `open()` calls in `main()` (~line 367, 370).
- **Docker Desktop can silently not be running** even if a container was "started" earlier that day — check `docker info` before assuming the daemon is up; `docker ps` failing with an `npipe` error means Docker Desktop itself isn't running.
- **`whatsapp-web.js` "couldn't link device"** on first QR scan attempt — see What Worked; resolved by retry, no code fix applied. If it becomes persistent (not just a one-off), the documented fallback is pinning `webVersionCache` to a specific WhatsApp Web version via the wppconnect-team/wa-version repo (researched but not needed this session).

## Direction set 2026-08-04 (historical — see "Current state (2026-08-11)" below)
The project pivoted from "scripts + read-only dashboard" to a **multi-user internal webapp**.
Outreach people log in and record call outcomes; a core team of 6 tracks converted leads, projects,
revenue, salaries and expenses. **This section used to say "`PRD-webapp.md`, spec only, nothing built"
— that was stale for weeks. The webapp is fully built under `webapp/` and runs.**

What this changes about the existing work:
- **The lead rating feature is removed (done 2026-08-04)** — `scripts/score-leads.js`, the four
  `*-scored.csv` files, `scoring()` in `scripts/dashboard-server.js` and the tier UI in
  `dashboard/index.html` are all gone. "Hot / cold" is now a human status an outreach person sets
  after a call. **The website capability probe survives as `scripts/lib/capability.js`** and becomes
  the app's "Website / webapp" column — it answers "clinic with a website, or website + online
  booking?". Verified: `node scripts/lib/capability.js --selftest` and
  `node scripts/dashboard-server.js --selftest` both pass.
- The old dashboard (`PRD-dashboard.md`, `HANDOFF-dashboard.md`, port 8090) still runs and is
  untouched, but is **superseded** by the new app. Keep it until the replacement works.
- Scraping stays chat-driven: Claude scrapes → CSV → the app imports the CSV. No scrape button in the UI.

**Decisions settled 2026-08-04** (details + sources in `PRD-webapp.md`):
- **Hosting: Cloudflare Workers + D1.** The only researched option that is free, permitted for
  commercial use, and persistent. Vercel Hobby is non-commercial only and has no persistent disk
  (kills the `node:sqlite` plan); Render's free Postgres is deleted after 30 days; Fly.io has no free
  tier for new users in 2026. Cost: the server becomes a Workers `fetch` handler, not stdlib Node http.
- **Commission: 10% of the full deal value, locked in the moment the lead is marked `Pre-paid`** —
  not pro-rated against cash collected. Watch for commission owed on deals that later underpay.
- **Outreach pay is commission-only** (no base), so the outreach salary grid and the "Outreach team
  fees" expense line are the same computed number. Core salaries are entered manually.
- Seed accounts are placeholders — `core1`…`core6`, `outreach1`…`outreach10` — real names later.

---

## Current state (2026-08-11) — READ THIS FIRST

### The webapp is built and running
`webapp/` is a complete Cloudflare Workers + D1 app, not a spec. Run it with
`npx wrangler dev` inside `webapp/` → **http://localhost:8787**. Wrangler prints its bindings
*before* it starts listening, so a `curl` at ~4s returns 000; wait ~9s.

- **16 accounts exist** (`core1`–`core6`, `outreach1`–`outreach10`). Passwords are in
  `webapp/CREDENTIALS.md` (plaintext, gitignored — added to `.gitignore` under `# Secrets`).
- **Local D1 holds real work:** 119 `leads`, 7 `lead_status`, 1 `scrape_jobs`, 2 `salaries`,
  2 `project_assignees`. **Do not wipe it.** Nothing is to be lost in the deploy.
- Screens built: login, collections/lead table, Converted Leads, Generate Leads (core only),
  and dashboards D1–D4.

### The v2 spec is written — implementation NOT started
**`PRD-webapp-v2.md` is the authority now.** It captures every decision confirmed with the user on
2026-08-11 from their "Problems with crm" Google Doc (6 problems + 2 add-ups). `PRD-webapp.md` now
carries a superseded banner and is only the record of what was built.

The user's standing instruction is **"don't start fixing things now"** — the spec is awaiting their
review. All doubts have already been asked and answered across four rounds; do not re-ask them.

Headline v2 decisions (full detail in the v2 PRD):
- **Lead generation moves out of the app entirely.** The deployed Worker cannot reach anyone's
  `localhost` and cannot run a headless browser, so per-user Docker is impossible. Claude scrapes
  locally, then pushes SQL to the live D1 (`wrangler d1 execute leadflow --remote`); leads then show
  up for every core member in the deployed CRM, who assign them to outreach.
- **Commission becomes a slab lookup**, not 10%. Locked at conversion, owed to `assigned_to`.
- **New funnel:** outreach sets `Meeting finalized` (+ owner name / timings / service / note / meeting
  link) → core-only **Meetings Finalized** section → **core** enters the total and closes the deal.
  Outreach never see money.

### Recovering CRM access (already done — for reference if it happens again)
`seed()` prints passwords **once** and refuses to run if any user exists; there is no reset script.
A `DELETE FROM users` was attempted and hit `FOREIGN KEY constraint failed` — which was lucky,
because it would have orphaned the 119 leads. **Fix used: reset `password_hash` in place**, replicating
`webapp/src/auth.js`'s exact scheme (PBKDF2-SHA256, 100,000 iterations, stored as
`<salt hex>:<derived key hex>`) in a throwaway `.mjs` script. There is no `sqlite3` CLI on this
machine — use `npx wrangler d1 execute --local`.

## Known bugs found 2026-08-11 (root-caused, not yet fixed)
- **Generate Leads silently loses leads.** `webapp/src/leadgen-api.js` imports the CSV only on the
  *browser poll* that first sees the job finish, and `webapp/public/generate.js` kills that poll on
  navigation. Leave the tab mid-scrape → the scrape completes server-side and the leads are **never
  imported**. Moot in v2 (the whole tab is being removed) but don't "fix" it by re-adding a poll.
- **`POST /api/core/scrape` returns `internal error` instead of the friendly message.** An unreachable
  host makes `fetch` **throw**, so the `!res.ok` branch at `leadgen-api.js:65` never runs. Proved by
  standing up a `python -m http.server 8080` stub, which made the friendly message appear — so workerd
  *can* reach localhost. Stub was killed; port 8080 confirmed free.
- **`POST /api/seed` is public** (`webapp/src/index.js:25` `PUBLIC` set). It only refuses once users
  exist, so on a fresh remote deploy whoever hits it first receives all 16 passwords.
  **Must be removed before deploying.**
- **`wrangler.toml:16` has `database_id = "local-only-placeholder"`** — no real D1 exists yet.

## Next Steps
1. **Wait for the user to review `PRD-webapp-v2.md`.** Do not write app code before they do.
2. Then implement Problems 1–6 + both add-ups in the order the v2 PRD lists them.
3. Then run the v2 deployment checklist — create the real D1, apply schema + migrations remotely,
   **copy the existing 119 leads / 7 statuses / project + salary rows up**, remove the public seed
   route and seed via CLI, verify login from a phone off the network.
4. Old backlog below is still open but lower priority than the CRM work.

## Older backlog
1. **Dashboard build** — follow the build order in `HANDOFF-dashboard.md`: `scripts/import-leads.js` → fold `contacted` writes into a persistent `scripts/whatsapp-daemon.js` → add the `client.on('message', ...)` reply listener → `/api/stats` endpoint → `dashboard/index.html`. Confirm the open assumptions in `PRD-dashboard.md` with the user before starting (JSON-file storage, ~10s polling, continuous WhatsApp listening = higher ban-risk than one-shot sends).
2. **7 failed WhatsApp sends** — numbers unreachable via WhatsApp; follow up by phone/call if the user wants those clinics covered too (list is in `whatsapp-sent-log.csv`, status=`failed`).
3. **5 skipped leads** (no phone in scrape data) — would need a different contact method or a re-scrape to find a number.
4. Optional, only if the user asks: run `scripts/enrich.py` on the Durg batch for owner names/services; add proxies to the scrape job if re-running regularly (rate-limit risk); periodically `DELETE` old scraper jobs to free the `gmaps_data` Docker volume.
