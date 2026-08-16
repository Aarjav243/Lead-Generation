-- v2 NEW CHANGES: outreach's "My leads" screen swaps the free-text meeting_link
-- field for a proper date + time (core's Meetings Finalized screen keeps meeting_link).
ALTER TABLE leads ADD COLUMN meeting_date TEXT;
ALTER TABLE leads ADD COLUMN meeting_time TEXT;
