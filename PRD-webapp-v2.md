# PRD — LeadFlow v2 (deployed CRM + local lead generation)

**Status:** spec only — no code written yet.
**Date:** 2026-08-11.
**Supersedes** `PRD-webapp.md`. Every decision below was confirmed in chat on 2026-08-11 and
overrides the v1 spec where they conflict.

Source of requirements: the user's "Problems with crm" doc (6 numbered problems + 2 add-ups).

---

## Headline change: where things run

v1 assumed the whole app, including a Generate Leads screen, runs on Cloudflare Workers. That
cannot work — the Worker runs in Cloudflare's datacenters and cannot reach anyone's `localhost`,
and the Workers runtime cannot run the headless browser the scraper needs. Asking 16 people to
install Docker was rejected.

| Runs locally (operator's machine only) | Runs deployed (whole team) |
|---|---|
| Docker Google Maps scraper | Login, roles, sessions |
| Geocoding (Nominatim) | Collections + lead tables |
| Website capability probe | Lead assignment |
| SQL generation + push to live D1 | Meetings Finalized, Converted Leads, dashboards |

**Lead flow:** operator asks Claude in chat → Claude scrapes locally, probes capabilities, generates
SQL → pushes straight into the live D1 (`wrangler d1 execute leadflow --remote`) → leads appear for
every core member in the deployed CRM → core assigns them to outreach people.

**Why this shape:** it leaves the deployed Worker making *zero* outbound requests. That matters
concretely — the capability probe fetches one homepage per lead, and 119 leads would blow past the
free plan's per-invocation sub-request cap. Running it locally removes the limit instead of working
around it. No tunnel, no VPS, no scraping API, no API keys, no per-user install.

**No CSV upload screen.** `scripts/import-leads-sql.js` already generates the SQL, so the push is a
one-command local step. Build an upload screen only if the operator ever needs to import without Claude.

---

## Commission model (replaces v1's flat 10%)

Confirmed exactly. Commission is a **slab lookup on the deal value**, not a percentage:

| Deal value (₹) | Commission (₹) |
|---|---|
| up to 5,000 | 0 |
| 5,001 – 10,000 | 1,000 |
| 10,001 – 15,000 | 2,000 |
| 15,001 – 25,000 | 3,000 |
| 25,001 – 30,000 | 4,000 |
| 30,001 – 35,000 | 5,000 |
| 35,001 – 40,000 | 6,000 |
| each further +5,000 | +1,000 |

The 15,001–25,000 band is deliberately double-width; the user confirmed this over a uniform ladder,
because a uniform ladder would have paid 4,000 at 25k and 5,000 at 30k, contradicting their figures.
Store the table as one editable constant so a band can be corrected without a code change.

- Commission is **locked at conversion** and never recomputed (unchanged from v1).
- It is owed to the lead's **`assigned_to`** outreach person. This changes from v1's `called_by`,
  which is being removed from the UI — `assigned_to` is the only attribution left.
- Outreach pay remains commission-only.

---

## New conversion funnel

v1: outreach set status `Pre-paid (advance received)` + typed the amount → project created.
v2: **outreach never sees or enters money.**

1. Outreach works a lead and sets status **`Meeting finalized`** (this replaces `Pre-paid (advance received)`
   in the status list). They also record the owner's name, available timings, what service the lead wants,
   a free note, and a meeting link.
2. The lead automatically appears in the core-only **Meetings Finalized** section, synced from what
   outreach entered — no re-typing.
3. **Core closes the deal there**, entering the total deal value. *That* creates the project /
   Converted Lead and locks the slab commission to the assigned outreach person.

---

## Per-problem changes

### Problem 1 — lead generation
Root causes found: Docker Desktop was not running (scraper unreachable); the friendly
"is the container running?" error was swallowed into `internal error` because an unreachable host makes
`fetch` throw rather than return a non-OK response; and the CSV import only ran on the browser poll that
first saw the job finish, so navigating away meant the scrape completed but **the leads were never imported**.

Resolution: **remove the Generate Leads tab and the `/api/core/scrape*` routes entirely.** Generation
moves to chat-driven local runs, which dissolves 1(c) and 1(d) rather than fixing them. The state
dropdown / city / target-lead-count requests become parameters the operator gives Claude in chat.
Target count semantics: keep pulling until N unique leads or Google runs dry, then report the honest number.

### Problem 2 — Converted Leads
- (a) Fix the "Assigned to" / "Paid" column overlap (the assignees checkbox list overflows its cell).
- (b) **Amount paid becomes directly editable.** Amount **left stays computed** (`total − paid`) so the
  two can never contradict each other.
- (c) Remove the "Add payment" button and column.
- Behind the scenes the dated `payments` ledger is **kept**: editing paid from 5,000 to 10,000 silently
  records a +5,000 row dated today. This is what keeps per-month collections answerable for D4 — a bare
  editable number carries no date and would break it.

### Problem 3 — Dashboard → Projects
- Table 1 columns: **delivered · continuing · delivered but payment not received · payment outstanding (₹)**.
  The `Work done, payment not received` status is currently counted nowhere.
- Table 2: add **amount paid · amount left · total amount**.

### Problem 4 — Dashboard → Expenses
- (a) AI subscription fees is **already editable**; verify it works rather than rebuilding it.
- (b) Outreach team fees = sum of that month's locked slab commissions (already computed this way).
- (c) Total money = cash collected that month, from the dated payments ledger.
- (d) Money left = total money − AI fees − outreach fees (already computed).

Mostly already correct; the real work is making sure (c) survives paid becoming editable.

### Problem 5 — Lead table
Remove **Called by** and **Amount finalized**. Add **meeting link**. Replace status
`Pre-paid (advance received)` with `Meeting finalized`.

### Problem 6 — Dashboard → Salaries
- Outreach cells show that month's aggregated slab commissions (sum across their converted deals),
  with the Paid/Unpaid toggle recording handover.
- **Remove the core team salaries grid** and its `PATCH .../salaries/core/...` route. The `salaries`
  table stays for the outreach paid toggle.

### Add-up 1 — Meetings Finalized (core only)
A new core-team section listing leads whose status is `Meeting finalized`. **Fixed columns, editable
values** (explicitly chosen over runtime-configurable columns): date · owner/lead name · business name ·
available timings · service wanted · note · meeting link. Auto-synced from outreach's entries.
Also carries the **close-the-deal action** that creates the project.

### Add-up 2 — new lead fields
Outreach can record on any lead: `owner_name`, `available_timings`, `service_wanted`, `note`,
`meeting_link`. These flow straight through to Meetings Finalized.

---

## Schema changes

```
leads:        + owner_name, available_timings, service_wanted, note, meeting_link
lead_status:  status value "Pre-paid (advance received)" -> "Meeting finalized" (migrate existing rows)
              called_by / deal_value: stop writing; retain existing values as history
projects:     no new columns — total_amount already holds the deal value,
              commission already holds the locked slab amount
payments:     unchanged and still dated — now written as deltas when paid is edited
salaries:     unchanged (outreach toggle only)
```

Outreach performance (D1) must switch from `called_by` to `leads.assigned_to`, for the same reason
commission does.

---

## Deployment checklist

1. `wrangler d1 create leadflow` → put the real id in `wrangler.toml` (currently
   `database_id = "local-only-placeholder"`).
2. Apply `schema.sql` + the v2 migrations to the remote D1.
3. **Copy the existing local data up** — 119 leads, 7 lead statuses, and the project/salary rows.
   Confirmed: nothing is to be lost.
4. **Remove the public `POST /api/seed` route.** It is reachable without logging in and only refuses
   once users exist, so on a fresh deploy whoever hits it first receives all 16 passwords. Seed via CLI.
5. Verify login from a phone off the office network. Session cookies already set `Secure` over HTTPS.

## Access rules (unchanged from v1 unless noted)
- **Core assigns, outreach receives.** Outreach cannot assign or claim leads.
- Outreach see only their own assigned leads, and **no money anywhere** — not deal values, not their
  own commission totals.
- Everything under `/api/core/` stays core-only; that prefix is the permission.

## Removed in v2
Generate Leads tab · `/api/core/scrape*` routes · server-side `geocode.js` · Add payment UI ·
core salaries grid · Called by + Amount finalized on the lead table · public seed route ·
flat 10% commission · `Pre-paid (advance received)` status.
