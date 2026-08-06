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
  "Pre-paid (advance received)",
];
const PRE_PAID = "Pre-paid (advance received)";
const COMMISSION_RATE = 0.10;

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
            ls.status, ls.called_by, ls.deal_value, ls.updated_at, ls.updated_by,
            u.display_name AS called_by_name
       FROM leads l
       LEFT JOIN lead_status ls ON ls.lead_id = l.id
       LEFT JOIN users u ON u.id = ls.called_by
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

// Bulk-assigns unassigned leads in a collection to one outreach user. No `count` = all of them.
// Leads with weak/no online presence go first (better outreach prospects).
async function assignBulk({ env, params, body }) {
  const collectionId = Number(params.id);
  const collection = await env.DB.prepare("SELECT id FROM collections WHERE id = ?").bind(collectionId).first();
  if (!collection) fail("No such collection", 404);
  if (body.user_id === null || body.user_id === undefined) fail("user_id is required", 422);
  const userId = await checkOutreachUser(env, body.user_id);

  let sql = `SELECT id FROM leads WHERE collection_id = ? AND assigned_to IS NULL
             ORDER BY CASE WHEN capability LIKE 'Website + %' OR capability LIKE 'Full webapp%' THEN 1 ELSE 0 END, id`;
  if (body.count !== undefined && body.count !== null) {
    const count = Number(body.count);
    if (!Number.isInteger(count) || count <= 0) fail("count must be a positive integer", 422);
    sql += ` LIMIT ${count}`;
  }
  const { results: unassigned } = await env.DB.prepare(sql).bind(collectionId).all();

  if (unassigned.length) {
    await env.DB.batch(
      unassigned.map((l) => env.DB.prepare("UPDATE leads SET assigned_to = ? WHERE id = ?").bind(userId, l.id))
    );
  }
  return { ok: true, assigned: unassigned.length };
}

// ---- Outreach: "my leads" flat view ---------------------------------------

async function myLeads({ env, user }) {
  const { results } = await env.DB.prepare(
    `SELECT l.id, l.name, l.phone, l.website, l.capability, l.address, l.area, l.city, l.state,
            c.category, c.city AS collection_city,
            ls.status, ls.called_by, ls.deal_value, ls.updated_at, ls.updated_by,
            u.display_name AS called_by_name
       FROM leads l
       JOIN collections c ON c.id = l.collection_id
       LEFT JOIN lead_status ls ON ls.lead_id = l.id
       LEFT JOIN users u ON u.id = ls.called_by
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

// Partial update: only fields present in body are changed. Setting status to
// Pre-paid creates the project (once) and locks commission = 10% of deal_value.
async function updateLeadStatus({ env, params, body, user }) {
  const leadId = Number(params.id);
  const lead = await env.DB.prepare("SELECT id, assigned_to FROM leads WHERE id = ?").bind(leadId).first();
  if (!lead) fail("No such lead", 404);
  if (user.role === "outreach" && lead.assigned_to !== user.id) fail("Not your lead", 403);

  const existing = await env.DB.prepare("SELECT * FROM lead_status WHERE lead_id = ?").bind(leadId).first();
  const status = body.status !== undefined ? body.status : existing?.status ?? null;
  const called_by = body.called_by !== undefined ? body.called_by : existing?.called_by ?? null;
  const deal_value = body.deal_value !== undefined ? body.deal_value : existing?.deal_value ?? null;

  // status is NOT NULL in the schema — a lead's first-ever edit must set it,
  // even if the outreach person touched "Called by" or "Amount" first.
  if (status === null) fail("Pick a status first", 422);
  if (!STATUSES.includes(status)) fail("Invalid status", 422);
  if (status === PRE_PAID && (deal_value === null || deal_value === "" || Number.isNaN(Number(deal_value)))) {
    fail("Amount finalized is required before marking Pre-paid", 422);
  }

  const now = new Date().toISOString();
  await env.DB.prepare(
    `INSERT INTO lead_status (lead_id, status, called_by, deal_value, updated_at, updated_by)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(lead_id) DO UPDATE SET
       status = excluded.status, called_by = excluded.called_by, deal_value = excluded.deal_value,
       updated_at = excluded.updated_at, updated_by = excluded.updated_by`
  ).bind(leadId, status, called_by, deal_value, now, user.id).run();

  let projectCreated = false;
  if (status === PRE_PAID) {
    const existingProject = await env.DB.prepare("SELECT id FROM projects WHERE lead_id = ?").bind(leadId).first();
    if (!existingProject) {
      // Locked here, forever — never recomputed even if deal_value or total_amount change later.
      const commission = COMMISSION_RATE * Number(deal_value);
      await env.DB.prepare(
        `INSERT INTO projects (lead_id, total_amount, commission, converted_at) VALUES (?, ?, ?, ?)`
      ).bind(leadId, Number(deal_value), commission, now).run();
      projectCreated = true;
    }
  }

  return { ok: true, projectCreated };
}

// ---- Screen 3: Converted Leads (core only, /api/core/ prefix) ------------

async function listConverted({ env }) {
  const { results: projects } = await env.DB.prepare(
    `SELECT p.id AS project_id, p.lead_id, p.kind, p.description, p.total_amount, p.work_status,
            p.future_scope, p.deadline, p.commission, p.converted_at,
            l.name, l.phone, l.area, l.city, l.state,
            COALESCE((SELECT SUM(amount) FROM payments WHERE project_id = p.id), 0) AS amount_paid
       FROM projects p JOIN leads l ON l.id = p.lead_id
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
const PROJECT_FIELDS = ["kind", "description", "total_amount", "work_status", "future_scope"];

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

  return { ok: true };
}

// Amount paid is SUM(payments.amount) per schema — this appends to that ledger,
// it does not overwrite a total.
async function addPayment({ env, params, body }) {
  const projectId = Number(params.id);
  const amount = Number(body.amount);
  if (!amount || amount <= 0) fail("Payment amount must be a positive number", 422);
  const project = await env.DB.prepare("SELECT id FROM projects WHERE id = ?").bind(projectId).first();
  if (!project) fail("No such project", 404);
  await env.DB.prepare("INSERT INTO payments (project_id, amount, received_at) VALUES (?, ?, ?)")
    .bind(projectId, amount, new Date().toISOString()).run();
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

export const routes = {
  "GET /api/core/collections": listCollections,
  "GET /api/core/collections/:id/leads": leadsForCollection,
  "GET /api/users": listUsers,
  "PUT /api/leads/:id/status": updateLeadStatus,
  "GET /api/leads/mine": myLeads,
  "GET /api/core/converted": listConverted,
  "PATCH /api/core/converted/:id": updateConverted,
  "POST /api/core/converted/:id/payments": addPayment,
  "PUT /api/core/converted/:id/assignees": setAssignees,
  "PUT /api/core/leads/:id/assign": assignLead,
  "POST /api/core/collections/:id/assign-bulk": assignBulk,
};
