-- v2 migration: additive only, safe to run against the existing local D1
-- (119 leads / 35 lead_status rows) without dropping anything.
ALTER TABLE leads ADD COLUMN owner_name TEXT;
ALTER TABLE leads ADD COLUMN available_timings TEXT;
ALTER TABLE leads ADD COLUMN service_wanted TEXT;
ALTER TABLE leads ADD COLUMN note TEXT;
ALTER TABLE leads ADD COLUMN meeting_link TEXT;

UPDATE lead_status SET status = 'Meeting finalized' WHERE status = 'Pre-paid (advance received)';
