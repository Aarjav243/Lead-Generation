// One-shot local demo data: populates every table so a fresh clone of this repo
// shows a fully working CRM (all 4 screens, both roles) without any real lead data.
// Usage: npm run db && node seed-demo.mjs   (schema.sql must run first — it drops tables)
// All 16 accounts share the password "demo1234".
import { execSync } from "node:child_process";
import { writeFileSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { hashPassword } from "./src/auth.js";

const esc = (v) => (v === null || v === undefined ? "NULL" : `'${String(v).replace(/'/g, "''")}'`);
const sqlLines = [];
const insert = (table, cols, rows) => {
  for (const row of rows) sqlLines.push(`INSERT INTO ${table} (${cols.join(",")}) VALUES (${row.map(esc).join(",")});`);
};

const CORE = Array.from({ length: 6 }, (_, i) => ({ id: i + 1, username: `core${i + 1}`, display_name: `Core ${i + 1}` }));
const OUTREACH = Array.from({ length: 10 }, (_, i) => ({ id: i + 7, username: `outreach${i + 1}`, display_name: `Outreach ${i + 1}` }));
const DEMO_PASSWORD = "demo1234";

const users = [];
for (const u of CORE) users.push([u.id, u.username, await hashPassword(DEMO_PASSWORD), "core", u.display_name, 1]);
for (const u of OUTREACH) users.push([u.id, u.username, await hashPassword(DEMO_PASSWORD), "outreach", u.display_name, 1]);
insert("users", ["id", "username", "password_hash", "role", "display_name", "active"], users);

const COLLECTIONS = [
  { id: 1, category: "Restaurants", city: "Demo City" },
  { id: 2, category: "Cafes", city: "Sample Town" },
  { id: 3, category: "Dental Clinics", city: "Example City" },
  { id: 4, category: "Gyms", city: "Test City" },
];
insert("collections", ["id", "category", "city"], COLLECTIONS.map((c) => [c.id, c.category, c.city]));

// 10 leads per collection, ids 1-40. Spread ownership across the first 5 outreach people.
const STATUSES = ["Hot lead", "Cold lead", "Not interested", "Not picking",
  "Phone switched off / out of coverage", "Invalid number"];
const leads = [];
const leadStatus = [];
let leadId = 1;
for (const col of COLLECTIONS) {
  for (let i = 1; i <= 10; i++, leadId++) {
    const assignedTo = i <= 2 ? null : OUTREACH[(leadId - 1) % 5].id; // first 2 per collection unassigned
    leads.push([
      leadId, col.id, `Demo Business ${leadId}`, `90000${String(leadId).padStart(5, "0")}`,
      null, null, `${leadId} Demo Street`, "Demo Area", col.city, "Demo State", assignedTo,
      "Demo Owner", "10am-6pm", "Website + online booking", null, null, null, null,
    ]);
    if (assignedTo && i <= 8) {
      // 6 of 8 assigned leads per collection get a called status
      const status = STATUSES[leadId % STATUSES.length];
      leadStatus.push([leadId, status, assignedTo, null, "2026-07-15T10:00:00.000Z", assignedTo]);
    }
  }
}
insert("leads", ["id", "collection_id", "name", "phone", "website", "capability", "address", "area", "city", "state",
  "assigned_to", "owner_name", "available_timings", "service_wanted", "note", "meeting_link", "meeting_date", "meeting_time"], leads);

// 8 "Meeting finalized" leads (2 per collection: i=9,10, which got no status in the loop above): 5 converted, 3 not.
const MEETING_LEAD_IDS = [9, 10, 19, 20, 29, 30, 39, 40];
for (const id of MEETING_LEAD_IDS) {
  const owner = leads.find((l) => l[0] === id)[10];
  leadStatus.push([id, "Meeting finalized", owner, null, "2026-08-01T09:00:00.000Z", owner]);
}
insert("lead_status", ["lead_id", "status", "called_by", "deal_value", "updated_at", "updated_by"], leadStatus);

// 5 converted projects across commission slabs and work statuses, dated across July/August 2026.
const PROJECTS = [
  { id: 1, lead_id: 9, total_amount: 8000, work_status: "Completed & payment received", converted_at: "2026-07-10T12:00:00.000Z", commission: 1000, paid: 8000 },
  { id: 2, lead_id: 19, total_amount: 18000, work_status: "Working on project", converted_at: "2026-07-22T12:00:00.000Z", commission: 3000, paid: 9000 },
  { id: 3, lead_id: 29, total_amount: 32000, work_status: "Work done, payment not received", converted_at: "2026-08-02T12:00:00.000Z", commission: 5000, paid: 0 },
  { id: 4, lead_id: 39, total_amount: 42000, work_status: "Working on project", converted_at: "2026-08-09T12:00:00.000Z", commission: 7000, paid: 20000 },
  { id: 5, lead_id: 10, total_amount: 50000, work_status: "Completed & payment received", converted_at: "2026-08-14T12:00:00.000Z", commission: 8000, paid: 50000 },
];
insert("projects", ["id", "lead_id", "kind", "total_amount", "work_status", "commission", "converted_at"],
  PROJECTS.map((p) => [p.id, p.lead_id, "Website + online booking", p.total_amount, p.work_status, p.commission, p.converted_at]));

const payments = [];
let paymentId = 1;
for (const p of PROJECTS) {
  if (p.paid > 0) payments.push([paymentId++, p.id, p.paid, p.converted_at]);
}
insert("payments", ["id", "project_id", "amount", "received_at"], payments);

// Assign a core person to each converted project (feeds the D2 projects-summary dashboard).
insert("project_assignees", ["project_id", "user_id"], PROJECTS.map((p) => [p.id, CORE[p.id % CORE.length].id]));

// Salaries + expenses grid starts July 2026 — cover both months so the grid isn't empty.
const salaries = [];
for (const u of OUTREACH.slice(0, 5)) {
  salaries.push([u.id, 2026, 7, 1]);
  salaries.push([u.id, 2026, 8, 0]);
}
insert("salaries", ["user_id", "year", "month", "paid"], salaries);
insert("expenses", ["year", "month", "ai_fees"], [[2026, 7, 5000], [2026, 8, 6000]]);

const sqlFile = join(tmpdir(), `leadflow-demo-seed-${Date.now()}.sql`);
writeFileSync(sqlFile, sqlLines.join("\n"), "utf8");
try {
  execSync(`npx wrangler d1 execute leadflow --local --file="${sqlFile}"`, { stdio: "inherit", cwd: import.meta.dirname });
  console.log(`\nSeeded ${users.length} users (all passwords: ${DEMO_PASSWORD}), ${COLLECTIONS.length} collections, ${leads.length} leads, ${PROJECTS.length} converted projects.`);
} finally {
  unlinkSync(sqlFile);
}
