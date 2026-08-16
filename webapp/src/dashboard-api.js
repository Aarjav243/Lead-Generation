// Dashboard API (D1 outreach performance, D2 projects, D3 salaries, D4 expenses).
// Owned by the dashboard agent — add routes here, don't touch screens-api.js.
// Every route belongs under "/api/core/", which is what makes it core-team-only.

// Exact strings from PRD Screen 2's status dropdown — the canonical source, since
// screens-api.js (which will actually write these) doesn't exist yet to check against.
const ST = {
  hot: "Hot lead",
  cold: "Cold lead",
  not_interested: "Not interested",
  switched_off: "Phone switched off / out of coverage",
  not_picking: "Not picking",
  invalid: "Invalid number",
  converted: "Meeting finalized",
};
const STATUS_TO_KEY = Object.fromEntries(Object.entries(ST).map(([k, v]) => [v, k]));

const MONTH_NAMES = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Salary/expense grids start July 2026 (PRD D3/D4); calendar years otherwise.
function monthsForYear(year) {
  const y = Number(year);
  if (y < 2026) return [];
  const start = y === 2026 ? 7 : 1;
  return Array.from({ length: 12 - start + 1 }, (_, i) => start + i);
}

const bad = (msg, status = 400) => { const e = new Error(msg); e.status = status; return e; };

async function people(env, role) {
  const { results } = await env.DB.prepare(
    "SELECT id, display_name FROM users WHERE role = ? AND active = 1 ORDER BY id"
  ).bind(role).all();
  return results;
}

// ---- D1 — outreach performance -------------------------------------------------

async function outreachPerformance({ params, env }) {
  const userId = Number(params.userId);
  const { results: yearRows } = await env.DB.prepare(
    `SELECT DISTINCT CAST(strftime('%Y', ls.updated_at) AS INTEGER) AS y
       FROM lead_status ls JOIN leads l ON l.id = ls.lead_id
      WHERE l.assigned_to = ? ORDER BY y`
  ).bind(userId).all();

  const years = [];
  for (const { y } of yearRows) {
    const { results: statusRows } = await env.DB.prepare(
      `SELECT CAST(strftime('%m', ls.updated_at) AS INTEGER) AS month, ls.status, ls.deal_value
         FROM lead_status ls JOIN leads l ON l.id = ls.lead_id
        WHERE l.assigned_to = ? AND strftime('%Y', ls.updated_at) = ?`
    ).bind(userId, String(y)).all();

    const { results: collectedRows } = await env.DB.prepare(
      `SELECT CAST(strftime('%m', pay.received_at) AS INTEGER) AS month, SUM(pay.amount) AS amt
         FROM payments pay
         JOIN projects p ON p.id = pay.project_id
         JOIN leads l ON l.id = p.lead_id
        WHERE l.assigned_to = ? AND strftime('%Y', pay.received_at) = ?
        GROUP BY month`
    ).bind(userId, String(y)).all();

    const { results: commissionRows } = await env.DB.prepare(
      `SELECT CAST(strftime('%m', p.converted_at) AS INTEGER) AS month, SUM(p.commission) AS amt
         FROM projects p JOIN leads l ON l.id = p.lead_id
        WHERE l.assigned_to = ? AND strftime('%Y', p.converted_at) = ?
        GROUP BY month`
    ).bind(userId, String(y)).all();

    const rows = {};
    for (let m = 1; m <= 12; m++) {
      rows[m] = { month: m, month_name: MONTH_NAMES[m], hot: 0, cold: 0, not_interested: 0,
        switched_off: 0, not_picking: 0, invalid: 0, converted: 0, revenue_finalized: 0, revenue_collected: 0, incentive: 0 };
    }
    for (const r of statusRows) {
      const key = STATUS_TO_KEY[r.status];
      if (!key || !rows[r.month]) continue;
      rows[r.month][key]++;
      if (key === "converted") rows[r.month].revenue_finalized += r.deal_value || 0;
    }
    for (const r of collectedRows) if (rows[r.month]) rows[r.month].revenue_collected = r.amt || 0;
    for (const r of commissionRows) if (rows[r.month]) rows[r.month].incentive = r.amt || 0;

    years.push({ year: y, rows: Object.values(rows) });
  }
  return { years };
}

// ---- D2 — projects ---------------------------------------------------------------

async function projectsSummary({ env }) {
  const core = await people(env, "core");
  const { results: agg } = await env.DB.prepare(
    `SELECT pa.user_id,
            SUM(CASE WHEN p.work_status = 'Completed & payment received' THEN 1 ELSE 0 END) AS delivered,
            SUM(CASE WHEN p.work_status = 'Working on project' THEN 1 ELSE 0 END) AS continuing,
            SUM(CASE WHEN p.work_status = 'Work done, payment not received' THEN 1 ELSE 0 END) AS payment_not_received,
            SUM(MAX(p.total_amount - COALESCE(pay.collected, 0), 0)) AS outstanding
       FROM project_assignees pa
       JOIN projects p ON p.id = pa.project_id
       LEFT JOIN (SELECT project_id, SUM(amount) AS collected FROM payments GROUP BY project_id) pay
              ON pay.project_id = p.id
      GROUP BY pa.user_id`
  ).all();
  const byUser = Object.fromEntries(agg.map((r) => [r.user_id, r]));
  return core.map((u) => ({
    user_id: u.id,
    display_name: u.display_name,
    delivered: byUser[u.id]?.delivered || 0,
    continuing: byUser[u.id]?.continuing || 0,
    payment_not_received: byUser[u.id]?.payment_not_received || 0,
    outstanding: byUser[u.id]?.outstanding || 0,
  }));
}

async function projectsList({ env }) {
  const { results } = await env.DB.prepare(
    `SELECT p.id, l.name AS lead_name, p.kind, p.description, p.work_status, p.deadline,
            p.total_amount, COALESCE(pay.paid, 0) AS amount_paid,
            GROUP_CONCAT(u.display_name, ', ') AS handled_by
       FROM projects p
       JOIN leads l ON l.id = p.lead_id
       LEFT JOIN project_assignees pa ON pa.project_id = p.id
       LEFT JOIN users u ON u.id = pa.user_id
       LEFT JOIN (SELECT project_id, SUM(amount) AS paid FROM payments GROUP BY project_id) pay
              ON pay.project_id = p.id
      GROUP BY p.id
      ORDER BY (p.deadline IS NULL), p.deadline ASC`
  ).all();
  return results;
}

async function setDeadline({ params, body, env }) {
  const deadline = body?.deadline ? String(body.deadline) : null;
  await env.DB.prepare("UPDATE projects SET deadline = ? WHERE id = ?").bind(deadline, params.id).run();
  return { ok: true };
}

// ---- D3 — salaries -----------------------------------------------------------------

async function salariesGrid({ params, env }) {
  const { year } = params;
  const months = monthsForYear(year);
  const team_people = await people(env, "outreach");

  const { results: paidRows } = await env.DB.prepare(
    "SELECT user_id, month, paid FROM salaries WHERE year = ?"
  ).bind(Number(year)).all();
  const paidByKey = Object.fromEntries(paidRows.map((r) => [`${r.user_id}-${r.month}`, r]));

  const { results: commissionRows } = await env.DB.prepare(
    `SELECT l.assigned_to AS user_id, CAST(strftime('%m', p.converted_at) AS INTEGER) AS month, SUM(p.commission) AS amt
       FROM projects p JOIN leads l ON l.id = p.lead_id
      WHERE strftime('%Y', p.converted_at) = ?
      GROUP BY l.assigned_to, month`
  ).bind(String(year)).all();
  const computedByKey = Object.fromEntries(commissionRows.map((r) => [`${r.user_id}-${r.month}`, r.amt || 0]));

  return {
    months: months.map((m) => ({ month: m, month_name: MONTH_NAMES[m] })),
    people: team_people.map((u) => ({
      user_id: u.id,
      display_name: u.display_name,
      cells: months.map((m) => {
        const key = `${u.id}-${m}`;
        return { month: m, amount: computedByKey[key] || 0, paid: !!paidByKey[key]?.paid };
      }),
    })),
  };
}

async function toggleSalaryPaid({ params, env }) {
  const { year, userId, month } = params;
  const existing = await env.DB.prepare(
    "SELECT paid FROM salaries WHERE user_id = ? AND year = ? AND month = ?"
  ).bind(userId, year, month).first();
  if (existing) {
    await env.DB.prepare("UPDATE salaries SET paid = ? WHERE user_id = ? AND year = ? AND month = ?")
      .bind(existing.paid ? 0 : 1, userId, year, month).run();
  } else {
    await env.DB.prepare("INSERT INTO salaries (user_id, year, month, paid) VALUES (?, ?, ?, 1)")
      .bind(userId, year, month).run();
  }
  return { ok: true };
}

// ---- D4 — expenses -----------------------------------------------------------------

async function expensesGrid({ params, env }) {
  const { year } = params;
  const months = monthsForYear(year);

  const { results: feeRows } = await env.DB.prepare(
    "SELECT month, ai_fees FROM expenses WHERE year = ?"
  ).bind(Number(year)).all();
  const feesByMonth = Object.fromEntries(feeRows.map((r) => [r.month, r.ai_fees]));

  const { results: commissionRows } = await env.DB.prepare(
    `SELECT CAST(strftime('%m', converted_at) AS INTEGER) AS month, SUM(commission) AS amt
       FROM projects WHERE strftime('%Y', converted_at) = ? GROUP BY month`
  ).bind(String(year)).all();
  const outreachByMonth = Object.fromEntries(commissionRows.map((r) => [r.month, r.amt || 0]));

  const { results: paymentRows } = await env.DB.prepare(
    `SELECT CAST(strftime('%m', received_at) AS INTEGER) AS month, SUM(amount) AS amt
       FROM payments WHERE strftime('%Y', received_at) = ? GROUP BY month`
  ).bind(String(year)).all();
  const totalByMonth = Object.fromEntries(paymentRows.map((r) => [r.month, r.amt || 0]));

  return months.map((m) => {
    const ai_fees = feesByMonth[m] || 0;
    const outreach_fees = outreachByMonth[m] || 0;
    const total_money = totalByMonth[m] || 0;
    return {
      month: m, month_name: MONTH_NAMES[m], ai_fees, outreach_fees, total_money,
      money_left: total_money - ai_fees - outreach_fees,
    };
  });
}

async function setAiFees({ params, body, env }) {
  const ai_fees = Number(body?.ai_fees);
  if (!Number.isFinite(ai_fees)) throw bad("ai_fees must be a number");
  const { year, month } = params;
  await env.DB.prepare(
    `INSERT INTO expenses (year, month, ai_fees) VALUES (?, ?, ?)
     ON CONFLICT(year, month) DO UPDATE SET ai_fees = excluded.ai_fees`
  ).bind(Number(year), Number(month), ai_fees).run();
  return { ok: true };
}

export const routes = {
  "GET /api/core/dashboard/people/:role": ({ params, env }) => people(env, params.role),
  "GET /api/core/dashboard/outreach/:userId": outreachPerformance,
  "GET /api/core/dashboard/projects-summary": projectsSummary,
  "GET /api/core/dashboard/projects": projectsList,
  "PATCH /api/core/dashboard/projects/:id/deadline": setDeadline,
  "GET /api/core/dashboard/salaries/:team/:year": salariesGrid,
  "POST /api/core/dashboard/salaries/:year/:userId/:month/toggle": toggleSalaryPaid,
  "GET /api/core/dashboard/expenses/:year": expensesGrid,
  "PATCH /api/core/dashboard/expenses/:year/:month": setAiFees,
};
