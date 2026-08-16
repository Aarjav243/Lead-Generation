# LeadFlow CRM

Cloudflare Worker + D1 app. `src/index.js` is the Worker; `public/` is the static UI served
at every path not under `/api/`.

## Local dev setup

```bash
npm install
npm run db          # creates local tables from schema.sql (local SQLite only, never touches production)
npm run seed:demo   # fills every table with synthetic demo data — no real leads/contacts
npm run dev         # starts wrangler dev, usually http://localhost:8787
```

`wrangler dev` always uses its own local SQLite copy under `.wrangler/state/`, regardless of the
`database_id` in `wrangler.toml` — running the commands above never reads or writes the real
production database.

## Logging in

`npm run seed:demo` creates 16 demo accounts, all with password `demo1234`:

- `core1` … `core6` — core role (sees all collections, meetings, conversions, dashboard)
- `outreach1` … `outreach10` — outreach role (sees only their assigned leads)

This gives you every screen — Collections, Meetings Finalized, Converted Leads, Dashboard
(Outreach performance / Projects / Salaries / Expenses) — fully populated, for both roles.

## Re-seeding

`npm run seed:demo` is safe to re-run any time; `npm run db` re-runs `schema.sql`, which drops
and recreates all tables first. Run both together to reset to a clean demo state.
