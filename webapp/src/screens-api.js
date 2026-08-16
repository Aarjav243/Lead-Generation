// Screens 1–3 API (Collections, Lead table, Converted Leads).
// Owned by the screens agent — add routes here, don't touch dashboard-api.js.
// Convention: "/api/core/..." paths are core-team-only, enforced in index.js.

const STATUSES = [
  "Hot lead",
  "Cold lead",
  "Not interested",
  "Not picking",
  "Phone switched off / out of coverage",
  "Invalid number",
  "Meeting finalized",
];
const MEETING_FINALIZED = "Meeting finalized";

// Commission is a slab lookup on deal value, not a percentage. Edit this table
// (not the lookup code below) to correct a band. Locked into projects.commission
// at conversion time in closeMeeting() and never recomputed afterwards.
const COMMISSION_SLABS = [
  { max: 5000, commission: 0 },
  { max: 10000, commission: 1000 },
  { max: 15000, commission: 2000 },
  { max: 25000, commission: 3000 },
  { max: 30000, commission: 4000 },
  { max: 35000, commission: 5000 },
  { max: 40000, commission: 6000 },
];
const COMMISSION_STEP = 5000; // beyond the table: +1000 commission per further +5000 deal value
const COMMISSION_STEP_AMOUNT = 1000;

function computeCommission(dealValue) {
  const v = Number(dealValue) || 0;
  for (const slab of COMMISSION_SLABS) {
    if (v <= slab.max) return slab.commission;
  }
  const last = COMMISSION_SLABS[COMMISSION_SLABS.length - 1];
  const extraSteps = Math.ceil((v - last.max) / COMMISSION_STEP);
  return last.commission + extraSteps * COMMISSION_STEP_AMOUNT;
}

function fail(message, status) {
  const e = new Error(message);
  e.status = status;
  throw e;
}

// ---- Screen 1: Collections ----------------------------------------------

// Core only (route prefix enforces it) — an outreach user must go through
// /api/leads/mine, which self-filters to their own assigned_to instead.
async function listCollections({ env }) {
  const { results } = await env.DB.prepare(
    `SELECT c.id, c.category, c.city, c.created_at,
            COUNT(l.id) AS total,
            COUNT(ls.lead_id) AS called
       FROM collections c
       LEFT JOIN leads l ON l.collection_id = c.id
       LEFT JOIN lead_status ls ON ls.lead_id = l.id
      GROUP BY c.id
      ORDER BY c.created_at DESC`
  ).all();
  return { collections: results };
}

// ---- Screen 2: Lead table -------------------------------------------------

async function leadsForCollection({ env, params }) {
  const { results } = await env.DB.prepare(
    `SELECT l.id, l.name, l.phone, l.website, l.capability, l.address, l.area, l.city, l.state,
            l.assigned_to, au.display_name AS assigned_to_name,
            l.owner_name, l.available_timings, l.service_wanted, l.note, l.meeting_link,
            ls.status, ls.updated_at, ls.updated_by
       FROM leads l
       LEFT JOIN lead_status ls ON ls.lead_id = l.id
       LEFT JOIN users au ON au.id = l.assigned_to
      WHERE l.collection_id = ?
      ORDER BY l.id`
  ).bind(Number(params.id)).all();
  return { leads: results };
}

// Validates user_id refers to an active outreach user (unless null). Throws via fail() otherwise.
async function checkOutreachUser(env, userId) {
  if (userId === null || userId === undefined) return null;
  const u = await env.DB.prepare("SELECT id FROM users WHERE id = ? AND active = 1 AND role = 'outreach'")
    .bind(Number(userId)).first();
  if (!u) fail("user_id must be an active outreach user", 422);
  return Number(userId);
}

async function assignLead({ env, params, body }) {
  const leadId = Number(params.id);
  const lead = await env.DB.prepare("SELECT id FROM leads WHERE id = ?").bind(leadId).first();
  if (!lead) fail("No such lead", 404);

  const userId = body.user_id === null || body.user_id === undefined ? null : await checkOutreachUser(env, body.user_id);
  await env.DB.prepare("UPDATE leads SET assigned_to = ? WHERE id = ?").bind(userId, leadId).run();
  return { ok: true };
}

// Bulk-assigns leads in a collection to one outreach user. Leads with weak/no
// online presence go first (better outreach prospects). Three modes:
//   - neither `count` nor `from`/`to`: all of them, reassigned regardless of
//     current owner (an explicit full hand-over).
//   - `count`: the next N leads NOT yet assigned to anyone — so assigning top
//     50 to one person, then top 20 to another, gives the second person the
//     next 20 in line rather than re-grabbing 20 of the first person's.
//   - `from`/`to` (1-indexed, inclusive rank positions): that exact slice,
//     reassigned regardless of current owner — for moving a specific range
//     (e.g. ranks 1-30) away from whoever already has it.
async function assignBulk({ env, params, body }) {
  const collectionId = Number(params.id);
  const collection = await env.DB.prepare("SELECT id FROM collections WHERE id = ?").bind(collectionId).first();
  if (!collection) fail("No such collection", 404);
  if (body.user_id === null || body.user_id === undefined) fail("user_id is required", 422);
  const userId = await checkOutreachUser(env, body.user_id);

  const ORDER = `ORDER BY CASE WHEN capability LIKE 'Website + %' OR capability LIKE 'Full webapp%' THEN 1 ELSE 0 END, id`;
  let sql;
  if (body.from !== undefined && body.from !== null) {
    const from = Number(body.from);
    const to = body.to !== undefined && body.to !== null ? Number(body.to) : from;
    if (!Number.isInteger(from) || from <= 0) fail("from must be a positive integer", 422);
    if (!Number.isInteger(to) || to < from) fail("to must be an integer >= from", 422);
    sql = `SELECT id FROM leads WHERE collection_id = ? ${ORDER} LIMIT ${to - from + 1} OFFSET ${from - 1}`;
  } else if (body.count !== undefined && body.count !== null) {
    const count = Number(body.count);
    if (!Number.isInteger(count) || count <= 0) fail("count must be a positive integer", 422);
    sql = `SELECT id FROM leads WHERE collection_id = ? AND assigned_to IS NULL ${ORDER} LIMIT ${count}`;
  } else {
    sql = `SELECT id FROM leads WHERE collection_id = ? ${ORDER}`;
  }
  const { results: targets } = await env.DB.prepare(sql).bind(collectionId).all();

  if (targets.length) {
    await env.DB.batch(
      targets.map((l) => env.DB.prepare("UPDATE leads SET assigned_to = ? WHERE id = ?").bind(userId, l.id))
    );
  }
  return { ok: true, assigned: targets.length };
}

// ---- Outreach: "my leads" flat view ---------------------------------------

async function myLeads({ env, user }) {
  const { results } = await env.DB.prepare(
    `SELECT l.id, l.name, l.phone, l.website, l.capability, l.address, l.area, l.city, l.state,
            l.owner_name, l.available_timings, l.service_wanted, l.note, l.meeting_date, l.meeting_time,
            c.category, c.city AS collection_city,
            ls.status, ls.updated_at, ls.updated_by
       FROM leads l
       JOIN collections c ON c.id = l.collection_id
       LEFT JOIN lead_status ls ON ls.lead_id = l.id
      WHERE l.assigned_to = ?
      ORDER BY l.id`
  ).bind(user.id).all();
  return { leads: results };
}

async function listUsers({ env, url }) {
  const role = url.searchParams.get("role");
  const stmt = role
    ? env.DB.prepare("SELECT id, display_name, role FROM users WHERE active = 1 AND role = ? ORDER BY display_name").bind(role)
    : env.DB.prepare("SELECT id, display_name, role FROM users WHERE active = 1 ORDER BY display_name");
  const { results } = await stmt.all();
  return { users: results };
}

// Sets a lead's status. Outreach never enters money here — marking a lead
// "Meeting finalized" just makes it appear in the core-only Meetings Finalized
// list; closing the deal (and creating the project) happens in closeMeeting().
async function updateLeadStatus({ env, params, body, user }) {
  const leadId = Number(params.id);
  const lead = await env.DB.prepare("SELECT id, assigned_to FROM leads WHERE id = ?").bind(leadId).first();
  if (!lead) fail("No such lead", 404);
  if (user.role === "outreach" && lead.assigned_to !== user.id) fail("Not your lead", 403);

  const status = body.status;
  if (!STATUSES.includes(status)) fail("Invalid status", 422);

  const now = new Date().toISOString();
  await env.DB.prepare(
    `INSERT INTO lead_status (lead_id, status, updated_at, updated_by)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(lead_id) DO UPDATE SET
       status = excluded.status, updated_at = excluded.updated_at, updated_by = excluded.updated_by`
  ).bind(leadId, status, now, user.id).run();

  return { ok: true };
}

// Add-up 2: owner_name / available_timings / service_wanted / note / meeting_link,
// plus the business name itself (editable from Meetings Finalized). Outreach can
// only touch their own assigned leads; core can touch any.
const LEAD_EDITABLE_FIELDS = ["name", "owner_name", "available_timings", "service_wanted", "note", "meeting_link", "meeting_date", "meeting_time"];

async function updateLeadFields({ env, params, body, user }) {
  const leadId = Number(params.id);
  const lead = await env.DB.prepare("SELECT id, assigned_to FROM leads WHERE id = ?").bind(leadId).first();
  if (!lead) fail("No such lead", 404);
  if (user.role === "outreach" && lead.assigned_to !== user.id) fail("Not your lead", 403);

  const set = LEAD_EDITABLE_FIELDS.filter((f) => body[f] !== undefined);
  if (!set.length) return { ok: true };
  await env.DB.prepare(`UPDATE leads SET ${set.map((f) => `${f} = ?`).join(", ")} WHERE id = ?`)
    .bind(...set.map((f) => body[f]), leadId).run();
  return { ok: true };
}

// ---- Add-up 1: Meetings Finalized (core only) -----------------------------

// Leads outreach has marked "Meeting finalized". Auto-synced from what outreach
// already entered — no re-typing. Stays here (not hidden) after core converts it,
// so the row keeps showing who gets credit and what they earned.
async function listMeetingsFinalized({ env }) {
  const { results } = await env.DB.prepare(
    `SELECT l.id, l.name, l.owner_name, l.available_timings, l.service_wanted, l.note, l.meeting_link,
            l.assigned_to, au.display_name AS assigned_to_name,
            ls.updated_at AS finalized_at,
            p.id AS project_id, p.total_amount, p.commission
       FROM leads l
       JOIN lead_status ls ON ls.lead_id = l.id
       LEFT JOIN users au ON au.id = l.assigned_to
       LEFT JOIN projects p ON p.lead_id = l.id
      WHERE ls.status = ?
      ORDER BY ls.updated_at DESC`
  ).bind(MEETING_FINALIZED).all();
  return { leads: results.map((l) => ({ ...l, converted: l.project_id != null })) };
}

// Core closes the deal: enters total_amount, which creates the project and
// locks the slab commission (owed to leads.assigned_to) forever. This is the
// only place money enters the system in v2.
async function closeMeeting({ env, params, body }) {
  const leadId = Number(params.id);
  const lead = await env.DB.prepare("SELECT id, service_wanted FROM leads WHERE id = ?").bind(leadId).first();
  if (!lead) fail("No such lead", 404);

  const status = await env.DB.prepare("SELECT status FROM lead_status WHERE lead_id = ?").bind(leadId).first();
  if (!status || status.status !== MEETING_FINALIZED) fail("Lead is not in Meeting finalized status", 422);

  const existingProject = await env.DB.prepare("SELECT id FROM projects WHERE lead_id = ?").bind(leadId).first();
  if (existingProject) fail("Already converted", 409);

  const totalAmount = Number(body.total_amount);
  if (!totalAmount || totalAmount <= 0) fail("Deal value is required", 422);

  const commission = computeCommission(totalAmount);
  const now = new Date().toISOString();
  const result = await env.DB.prepare(
    `INSERT INTO projects (lead_id, kind, total_amount, commission, converted_at) VALUES (?, ?, ?, ?, ?)`
  ).bind(leadId, lead.service_wanted || null, totalAmount, commission, now).run();

  return { ok: true, commission, project_id: result.meta.last_row_id };
}

// Undoes closeMeeting so a wrong deal value can be corrected: deletes the
// project (and its payments/assignees, since there's no ON DELETE CASCADE)
// so the lead goes back to unconverted and can be closed again with the
// right amount. Converted Leads has no equivalent undo — only this screen does.
async function reopenMeeting({ env, params }) {
  const leadId = Number(params.id);
  const project = await env.DB.prepare("SELECT id FROM projects WHERE lead_id = ?").bind(leadId).first();
  if (!project) fail("Not converted", 404);

  await env.DB.batch([
    env.DB.prepare("DELETE FROM payments WHERE project_id = ?").bind(project.id),
    env.DB.prepare("DELETE FROM project_assignees WHERE project_id = ?").bind(project.id),
    env.DB.prepare("DELETE FROM projects WHERE id = ?").bind(project.id),
  ]);
  return { ok: true };
}

// ---- Screen 3: Converted Leads (core only, /api/core/ prefix) ------------

async function listConverted({ env }) {
  const { results: projects } = await env.DB.prepare(
    `SELECT p.id AS project_id, p.lead_id, p.kind, p.description, p.total_amount, p.work_status,
            p.future_scope, p.deadline, p.commission, p.converted_at,
            l.name, l.phone, l.area, l.city, l.state,
            ou.display_name AS outreach_name,
            COALESCE((SELECT SUM(amount) FROM payments WHERE project_id = p.id), 0) AS amount_paid
       FROM projects p JOIN leads l ON l.id = p.lead_id
       LEFT JOIN users ou ON ou.id = l.assigned_to
      ORDER BY p.converted_at DESC`
  ).all();

  const { results: assigneeRows } = await env.DB.prepare(
    `SELECT pa.project_id, u.id, u.display_name
       FROM project_assignees pa JOIN users u ON u.id = pa.user_id`
  ).all();
  const byProject = {};
  for (const r of assigneeRows) (byProject[r.project_id] ??= []).push({ id: r.id, display_name: r.display_name });

  return {
    projects: projects.map((p) => ({
      ...p,
      amount_left: (p.total_amount || 0) - p.amount_paid,
      assignees: byProject[p.project_id] || [],
    })),
  };
}

const LEAD_FIELDS = ["area", "city", "state"];
const PROJECT_FIELDS = ["kind", "description", "total_amount", "work_status", "future_scope", "commission"];

async function updateConverted({ env, params, body }) {
  const projectId = Number(params.id);
  const project = await env.DB.prepare("SELECT id, lead_id FROM projects WHERE id = ?").bind(projectId).first();
  if (!project) fail("No such project", 404);

  const leadSet = LEAD_FIELDS.filter((f) => body[f] !== undefined);
  if (leadSet.length) {
    await env.DB.prepare(`UPDATE leads SET ${leadSet.map((f) => `${f} = ?`).join(", ")} WHERE id = ?`)
      .bind(...leadSet.map((f) => body[f]), project.lead_id).run();
  }

  const projSet = PROJECT_FIELDS.filter((f) => body[f] !== undefined);
  if (projSet.length) {
    await env.DB.prepare(`UPDATE projects SET ${projSet.map((f) => `${f} = ?`).join(", ")} WHERE id = ?`)
      .bind(...projSet.map((f) => body[f]), projectId).run();
  }

  // Amount paid is directly editable, but SUM(payments.amount) stays the source
  // of truth (dated ledger, needed for month-by-month collections). Editing paid
  // from 5,000 to 10,000 records a dated +5,000 row; editing it down records a
  // dated negative row — same reasoning applies either way, no special-casing.
  if (body.amount_paid !== undefined) {
    const newPaid = Number(body.amount_paid);
    if (Number.isNaN(newPaid)) fail("amount_paid must be a number", 422);
    const { paid: currentPaid } = await env.DB.prepare(
      "SELECT COALESCE(SUM(amount), 0) AS paid FROM payments WHERE project_id = ?"
    ).bind(projectId).first();
    const delta = newPaid - currentPaid;
    if (delta !== 0) {
      await env.DB.prepare("INSERT INTO payments (project_id, amount, received_at) VALUES (?, ?, ?)")
        .bind(projectId, delta, new Date().toISOString()).run();
    }
  }

  return { ok: true };
}

// Replaces the full assignee set for a project.
async function setAssignees({ env, params, body }) {
  const projectId = Number(params.id);
  const project = await env.DB.prepare("SELECT id FROM projects WHERE id = ?").bind(projectId).first();
  if (!project) fail("No such project", 404);
  const ids = Array.isArray(body.user_ids) ? [...new Set(body.user_ids.map(Number))] : [];

  await env.DB.prepare("DELETE FROM project_assignees WHERE project_id = ?").bind(projectId).run();
  if (ids.length) {
    await env.DB.batch(
      ids.map((uid) =>
        env.DB.prepare("INSERT INTO project_assignees (project_id, user_id) VALUES (?, ?)").bind(projectId, uid)
      )
    );
  }
  return { ok: true };
}

export { computeCommission };

export const routes = {
  "GET /api/core/collections": listCollections,
  "GET /api/core/collections/:id/leads": leadsForCollection,
  "GET /api/users": listUsers,
  "PUT /api/leads/:id/status": updateLeadStatus,
  "PATCH /api/leads/:id": updateLeadFields,
  "GET /api/leads/mine": myLeads,
  "GET /api/core/meetings": listMeetingsFinalized,
  "POST /api/core/meetings/:id/close": closeMeeting,
  "POST /api/core/meetings/:id/reopen": reopenMeeting,
  "GET /api/core/converted": listConverted,
  "PATCH /api/core/converted/:id": updateConverted,
  "PUT /api/core/converted/:id/assignees": setAssignees,
  "PUT /api/core/leads/:id/assign": assignLead,
  "POST /api/core/collections/:id/assign-bulk": assignBulk,
};
