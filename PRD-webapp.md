# PRD — Lead Outreach & Delivery Webapp ("LeadFlow")

**Status:** spec only — nothing built yet.
**Date:** 2026-08-04.
**Supersedes** `PRD-dashboard.md` (that spec'd a read-only, no-auth, localhost 3-number dashboard;
this replaces it with a multi-user app).

---

## Problem
Leads are scraped into CSVs and messaged by script, but everything after "we found a lead" lives in
people's heads: who called, what the lead said, what price was agreed, who's building it, who's been
paid, and what the business actually earned. There is no shared place for an outreach person to record
a call outcome, and no way for the core team to see performance, delivery, or money.

## Goals
1. Claude scrapes leads on request in chat → they appear in the app as a browsable collection.
2. Outreach people log in and record, per lead: call outcome, who called, price finalized.
3. Leads that pay an advance flow into a core-team-only **Converted Leads** / project tracker.
4. Core team gets a dashboard: outreach performance, project delivery, revenue, salaries, expenses.

## Non-goals (this version)
- No WhatsApp reply tracking (unchanged from `PRD-dashboard.md` — still deferred, still ban-risk).
- No lead-generation button in the UI. Scraping stays chat-driven through Claude, as asked.
- No client-facing portal. Internal only.
- No automated lead rating. **The 0–100 score and hot/warm/cold tier from `score-leads.js` are being
  removed** — "hot lead / cold lead" is now a human judgement the outreach person enters after a call,
  not a computed guess. The *website capability probe* inside that script is kept and reused below.

---

## Users & roles
| Role | Count | Can see |
|---|---|---|
| **Outreach** | a few, grows | Collections + lead tables. Sets status, claims a lead as theirs, enters finalized amount. |
| **Core** | 6 | Everything: Converted Leads, projects, all dashboard analytics, salaries, expenses. |

- Username + password login. Passwords hashed (scrypt, `node:crypto`); no self-signup.
- Accounts created by CLI (`node scripts/user-add.js <username> <role>`), not through the UI.
- An outreach person never sees salaries, expenses, or other people's performance.

---

## Lead ingestion
Unchanged from today: Claude runs the Google Maps scraper → CSV in the project root. A new import step
loads that CSV into the app as a **collection**, tagged `category` + `city`
(e.g. "Dental Clinics · Indore", "Cafes · Bhilai", "Theatres · Lucknow").
The CSV remains the scrape artifact of record; the app imports from it.

### Website / webapp column
Reuses the existing capability probe (fetch homepage; look for ordering / QR-or-digital menu /
delivery / table-or-appointment booking). Rendered as a short description of what they have **now**,
which is what tells the outreach person what to pitch:

| Detected | Shown as |
|---|---|
| nothing | `No website` |
| social/listing link only (Instagram, wa.me, business.site, Zomato…) | `No real website — Instagram page only` |
| loads, no ordering or booking | `Website only — no online booking` |
| booking present | `Website + online booking` |
| ordering present | `Website + online ordering` |
| ordering + booking + delivery | `Full webapp — ordering, booking, delivery` |
| unreachable | `Website broken / dead` |

Per the user's clinic example, this reads `Website only — no online booking` vs `Website + online booking`.

---

## Screen 1 — Collections (all logged-in users)
Tiles, one per scraped batch: **Dental Clinics · Indore**, **Cafes · Bhilai**, **Theatres · Lucknow**.
Each shows total leads and how many have been called. Click → Screen 2.

## Screen 2 — Lead table (all logged-in users)
| Column | Type | Notes |
|---|---|---|
| Business name | text | from scrape |
| Phone | text | from scrape |
| Website / webapp | text | capability description above |
| **Status** | dropdown | `Hot lead` · `Cold lead` · `Not interested` · `Not picking` · `Phone switched off / out of coverage` · `Invalid number` · `Pre-paid (advance received)` |
| **Called by** | dropdown | outreach users; the caller picks their own name |
| **Amount finalized** | number (₹) | price agreed on the call |

- `Pre-paid` is the trigger: setting it creates the project in Converted Leads.
- Every edit records a timestamp + who made it — the monthly performance tables depend on this.

> **"Not picking" was added.** The original dropdown list omitted it, but the performance table
> requires it. The duplicated "not interested" in that list was collapsed to one entry.

## Screen 3 — Converted Leads (core team only)
Only leads with an advance paid.

| Column | Type |
|---|---|
| Lead name | text |
| Lead number | text |
| Area, City, State | text (parsed from scraped address, editable) |
| Kind of project | dropdown + free-text description |
| Assigned to | **multi-select** over core team (several people per project) |
| Amount paid | number (₹) |
| Amount left to be paid | computed = total − paid |
| Total amount | number (₹), defaults to Screen 2's finalized amount |
| Work status | `Completed & payment received` · `Working on project` · `Work done, payment not received` |
| Future project scope | free text ("may want data analytics", "wants marketing later") |

---

## Money model (single source of truth — everything below derives from these)
| Field | Meaning |
|---|---|
| `deal_value` | price the outreach person closed at (Screen 2 "Amount finalized"). |
| `amount_paid` | cumulative cash actually received from that client. |
| `amount_left` | `deal_value − amount_paid`. |
| `commission` | **10% of the full `deal_value`** to the outreach person who closed it. Rate stored as config (default `0.10`), overridable per-deal. |

Worked examples (the user's own): closed at ₹20,000 → commission ₹2,000. Closed at ₹10,000 → ₹1,000.
No fixed price list — the outreach person negotiates, and 10% follows whatever they close.

**When commission is earned:** the moment the lead is marked `Pre-paid` (advance received), the full
10% of the *total* deal value is locked in to that outreach person's account — not pro-rated against
what the client has actually paid so far. An advance of ₹5,000 on a ₹20,000 deal still earns the full
₹2,000. Commission is therefore a property of the deal, fixed at conversion time, and does not move
afterwards even if the client later underpays.

> **Consequence to be aware of:** if a client pays an advance and then defaults on the balance, the
> commission is already owed in full. Worth watching in D4 — "Outreach team fees" can exceed what the
> matching projects actually collected.

**Outreach pay is commission only** — no base salary. So an outreach person's monthly pay *is* the sum
of commissions locked in that month. This means D3's salary grid and D4's "Outreach team fees" are the
same underlying number, computed automatically from converted deals rather than typed in. The
Paid/Unpaid toggle records whether that computed amount has actually been handed over.

**Finalized and collected are tracked separately everywhere** (user's choice): "finalized" credits the
deal when agreed; "collected" counts only cash in hand. The gap between the two is the unpaid-work figure.

---

## Dashboard (core team only)

### D1 — Outreach performance
Pick a person → one table per year, one row per month:

`Month | Hot | Cold | Not interested | Switched off / unreachable | Not picking | Invalid | Converted | Revenue finalized | Revenue collected`

### D2 — Projects
Per core member: `Total projects delivered | Projects continuing | Payment still outstanding`.

Then one table across all projects:

`Lead name | Kind of work (described) | Handled by | Status (delivered / delivered–payment left / work continuing) | Deadline (editable inline)`

### D3 — Salaries
One table per year, per team (outreach and core), starting **July 2026**:

`Employee | Jul | Aug | Sep | …` — each cell `Paid` / `Unpaid`, click to toggle.

- **Outreach rows show a computed amount** (that month's locked-in commissions) next to the toggle,
  since outreach pay is commission-only.
- **Core rows are typed in manually** — core salaries aren't formula-driven.

### D4 — Expenses
Per year, one row per month:

`Month | AI subscription fees | Outreach team fees | Total money | Money left for main employees`

- `AI subscription fees` — entered manually.
- `Outreach team fees` — **computed**: commissions locked in that month (same figure as D3's outreach column).
- `Total money` — cash actually collected that month, from `payments`.
- `Money left for main employees` = `Total money − AI fees − Outreach team fees`.

---

## Data model (tables)
```
users(id, username, password_hash, role, display_name, active)
collections(id, category, city, source_csv, created_at)
leads(id, collection_id, name, phone, website, capability, address, area, city, state)
lead_status(lead_id, status, called_by, deal_value, updated_at, updated_by)
projects(lead_id, kind, description, amount_paid, total_amount, work_status, future_scope, deadline)
project_assignees(project_id, user_id)     -- many-to-many; several people per project
payments(id, project_id, amount, received_at)  -- makes "collected in month X" answerable
salaries(user_id, year, month, paid)
expenses(year, month, ai_fees, outreach_fees)
```

---

## Hosting — researched 2026-08-04, **recommendation: Cloudflare Workers + D1**
The user asked whether this could be deployed free on Vercel. It cannot. Findings:

| Option | Free? | Commercial use | Persistent data | Verdict |
|---|---|---|---|---|
| **Cloudflare Workers + D1** | Yes, no card | **Explicitly allowed** | D1 5 GB, SQLite-based | **Chosen** |
| Render | 750 hr/mo | Allowed | **Free Postgres deleted 30 days after creation**; 15-min spin-down, ~1 min cold start | Rejected |
| Fly.io | **No free tier for new users in 2026** (2 VM-hours / 7-day trial) | — | — | Rejected |
| Vercel Hobby | Yes | **No — non-commercial only**; this app tracks revenue/salaries | No persistent disk | Rejected |
| Vercel Pro | $20/mo/member | Yes | Needs separate hosted Postgres | Fallback if Cloudflare disappoints |

Why Cloudflare wins: it is the only option that is simultaneously free, permitted for commercial use,
and keeps the data. D1 is SQLite-compatible, so the schema below carries over essentially unchanged.
Free limits (5 GB storage; Workers 100K requests/day) are far above this app's needs — ~16 users and a
few thousand leads.

**Costs of this choice, accepted knowingly:**
- The Workers runtime is **not Node**. The server becomes a `fetch(request)` handler rather than the
  stdlib `http` server used elsewhere in this repo, and D1 is reached through a binding
  (`env.DB.prepare(...)`), not `node:sqlite`. Mechanical, but it is a rewrite of the server shell.
- **No SLA and no direct support on the free plan** (community/Discord only). Acceptable at this size;
  revisit if the team depends on it operationally.
- Deploys via the `wrangler` CLI.

Sources: [Vercel Hobby plan](https://vercel.com/docs/plans/hobby),
[Cloudflare Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/),
[Cloudflare community — free plan commercial use](https://community.cloudflare.com/t/is-cloudflare-pages-workers-free-plan-free-for-commercial-use/291741),
[Render free tier](https://render.com/articles/platforms-with-a-real-free-tier-for-developers-in-2026),
[Fly.io free tier 2026](https://www.saaspricepulse.com/blog/flyio-free-tier-2026).

---

## Seed accounts (placeholders)
Real names to be supplied later in chat; until then the app seeds obvious placeholders so the
dropdowns and salary tables are usable immediately:
- **Core (6):** `core1` … `core6`, display names "Core 1" … "Core 6".
- **Outreach (10):** `outreach1` … `outreach10`, display names "Outreach 1" … "Outreach 10".

Renaming later is a `display_name` update, not a schema change. Temporary passwords are generated at
seed time and printed once.

## Assumptions (correct any that are wrong)
1. Commission is a flat 10% of `deal_value`, same for every outreach person and project type.
2. Setting a lead to `Pre-paid` is what creates a project — no separate "convert" action — and is also
   the moment commission is locked in.
3. Salary/expense tables use **calendar years** (Jan–Dec) with data simply starting July 2026, rather
   than a July→June fiscal year.
4. Currency is INR throughout; no multi-currency.
5. Outreach people cannot see each other's performance, or any money beyond their own leads.
6. One outreach person owns a lead (single "Called by"), while a project can have several assignees.
7. Core team members are salaried manually — D3's core-team grid is typed in, not computed, since only
   outreach pay is formula-driven.

## Build order
1. Remove the rating feature (`score-leads.js` scoring + dashboard tiers); keep the capability probe.
2. Schema + auth + login + roles + CSV import + seed accounts.
   **Shared foundation — must exist before anything else; not parallelisable.**
3. Then, in parallel: (A) Screens 1–3, (B) Dashboard D1–D4.
4. Deploy to Cloudflare via `wrangler`; verify login works from a phone off the office network.
