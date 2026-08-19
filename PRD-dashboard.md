# PRD — Lead Outreach Dashboard

## Problem
Lead data (scraped) and outreach data (sent/failed/skipped) currently live in separate flat files (`durg-clinics.csv`, `durg-clinics-no-website.csv`, `whatsapp-sent-log.csv`) with no combined view. As more departments (business categories) and cities get scraped over time, checking progress by hand won't scale.

## Goals
- One dashboard, organized by **department → city/district**, showing for each, **updated automatically**:
  1. Total leads
  2. Leads without a website
  3. Leads messaged (contacted)
- That's it for now — see Non-Goals.

## Non-Goals (for now — scoped down from the original ask)
- **No "leads replied" tracking and no list of who replied** — deliberately dropped for this version. Tracking replies would require a WhatsApp listener process staying logged in and reading messages continuously, which raises ban-risk on the number beyond what a one-off send does. Parked as a future addition (see bottom of this doc) — build it only if/when it's actually wanted.
- No multi-user login/auth (single operator, localhost only).
- No cloud hosting/remote access — runs on your machine.
- No editing leads through the UI.

## Users
Just you, checking outreach progress.

## Data Source (no new database needed)
Each department/city is just a pointer to the three files the existing pipeline already produces:
```
department: "clinic"
  city: "durg"
    leadsFile:     durg-clinics.csv              → total leads = row count
    noWebsiteFile: durg-clinics-no-website.csv   → leads without website = row count
    sentLogFile:   whatsapp-sent-log.csv         → leads messaged = rows where status = "sent"
```
Adding a new department/city later = scrape it, run the send script, add one entry to this manifest. No re-ingestion step, no separate lead database.

## Functional Requirements
- **FR1 — Aggregate:** read the three files above per department/city and compute the 3 counts.
- **FR2 — Dashboard view:** table of department → city → the 3 counts.
- **FR3 — Live updates:** the page reflects new scrapes/sends without a manual reload (polling is enough — see Assumptions).

## Assumptions (flag if any of these are wrong)
1. "Department" is a business category; only **Clinic / Durg** has real data today, but the manifest format supports adding more.
2. Polling every ~10s counts as "live" — no websockets needed for a single local viewer.
3. Single viewer, localhost only — no login needed.
4. No WhatsApp client needs to run for this version — the dashboard only reads local CSV files, it never touches WhatsApp itself. (The existing `whatsapp-send.js` still runs separately, on demand, exactly as it does today.)

## Risks
- Low, by design: nothing here logs into WhatsApp or runs continuously against it — it's a local file reader + a small web page. The only requirement is that `scripts/dashboard-server.js` (planned) is running while you want to view/refresh the dashboard.

## Success Criteria
- Dashboard shows Clinic/Durg: 54 total, 32 no-website, 20 messaged — matching the real files today.
- Re-running a `whatsapp-send.js --live` batch (or a fresh scrape) updates the dashboard's counts on the next poll, with no restart of the dashboard needed.

## Deferred (build later, only if wanted)
**Reply tracking** — "leads who replied" + names — requires a persistent WhatsApp listener (`client.on('message', ...)`) matching incoming messages to contacted leads by phone number. This was the original scope; it's parked because it needs the automation to stay continuously logged into WhatsApp (higher ban-risk than the current one-off sends), and only works while that listener process is left running. Revisit this PRD's earlier version in git/session history if/when you want to add it back.
