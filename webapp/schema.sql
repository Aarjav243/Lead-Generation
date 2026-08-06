-- LeadFlow schema (D1 / SQLite). Apply: npm run db
-- Money rules that the tables encode:
--   * amount actually collected is NOT a column — it is SUM(payments.amount),
--     so "collected in month X" is answerable without a second source of truth.
--   * projects.commission is 10% of the deal value, LOCKED at conversion time
--     (projects.converted_at). It never moves afterwards, even if the client underpays.
--   * expenses stores only ai_fees; outreach team fees are computed from commissions.

DROP TABLE IF EXISTS project_assignees;
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS projects;
DROP TABLE IF EXISTS lead_status;
DROP TABLE IF EXISTS scrape_jobs;
DROP TABLE IF EXISTS leads;
DROP TABLE IF EXISTS collections;
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS salaries;
DROP TABLE IF EXISTS expenses;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
  id            INTEGER PRIMARY KEY,
  username      TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('core', 'outreach')),
  display_name  TEXT NOT NULL,
  active        INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE sessions (
  id         TEXT PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id),
  expires_at INTEGER NOT NULL           -- epoch ms
);

CREATE TABLE collections (
  id         INTEGER PRIMARY KEY,
  category   TEXT NOT NULL,             -- "Dental Clinics"
  city       TEXT NOT NULL,             -- "Indore"
  source_csv TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE leads (
  id            INTEGER PRIMARY KEY,
  collection_id INTEGER NOT NULL REFERENCES collections(id),
  name          TEXT,
  phone         TEXT,
  website       TEXT,
  capability    TEXT,                   -- "Website + online booking" (scripts/lib/capability.js)
  address       TEXT,
  area          TEXT,
  city          TEXT,
  state         TEXT,
  assigned_to   INTEGER REFERENCES users(id)  -- outreach person who owns this lead; NULL = unassigned
);
CREATE INDEX idx_leads_collection ON leads(collection_id);
CREATE INDEX idx_leads_assigned ON leads(assigned_to);

-- One row per in-webapp scrape (Generate Leads screen, core only). id = the
-- scraper's own job uuid, so polling never needs a second id to track.
CREATE TABLE scrape_jobs (
  id            TEXT PRIMARY KEY,
  category      TEXT NOT NULL,
  area          TEXT,
  city          TEXT NOT NULL,
  keyword       TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'working',  -- working / ok / failed / done
  collection_id INTEGER REFERENCES collections(id),
  error         TEXT,
  created_by    INTEGER NOT NULL REFERENCES users(id),
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- One row per lead once someone has called it. Outreach people write here.
CREATE TABLE lead_status (
  lead_id    INTEGER PRIMARY KEY REFERENCES leads(id),
  status     TEXT NOT NULL,             -- Hot lead / Cold lead / Not interested / Not picking /
                                        -- Phone switched off / Invalid number / Pre-paid
  called_by  INTEGER REFERENCES users(id),
  deal_value REAL,
  updated_at TEXT NOT NULL,
  updated_by INTEGER REFERENCES users(id)
);

-- Created the moment a lead is marked Pre-paid. Core team only.
CREATE TABLE projects (
  id           INTEGER PRIMARY KEY,
  lead_id      INTEGER NOT NULL UNIQUE REFERENCES leads(id),
  kind         TEXT,
  description  TEXT,
  total_amount REAL,
  work_status  TEXT,                    -- Completed & payment received / Working on project /
                                        -- Work done, payment not received
  future_scope TEXT,
  deadline     TEXT,
  commission   REAL NOT NULL DEFAULT 0, -- locked at conversion, owed to lead_status.called_by
  converted_at TEXT NOT NULL            -- which month the commission lands in
);

CREATE TABLE project_assignees (
  project_id INTEGER NOT NULL REFERENCES projects(id),
  user_id    INTEGER NOT NULL REFERENCES users(id),
  PRIMARY KEY (project_id, user_id)
);

CREATE TABLE payments (
  id          INTEGER PRIMARY KEY,
  project_id  INTEGER NOT NULL REFERENCES projects(id),
  amount      REAL NOT NULL,
  received_at TEXT NOT NULL
);

-- Outreach rows: amount is computed from commissions, `paid` records the handover.
-- Core rows: amount is typed in.
CREATE TABLE salaries (
  user_id INTEGER NOT NULL REFERENCES users(id),
  year    INTEGER NOT NULL,
  month   INTEGER NOT NULL,
  amount  REAL,
  paid    INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, year, month)
);

CREATE TABLE expenses (
  year    INTEGER NOT NULL,
  month   INTEGER NOT NULL,
  ai_fees REAL NOT NULL DEFAULT 0,
  PRIMARY KEY (year, month)
);
