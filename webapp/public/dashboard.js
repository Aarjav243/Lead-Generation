// Dashboard agent owns this file.
// Helpers available: LeadFlow.api(path, {method, body}), LeadFlow.esc(str).
LeadFlow.views.dashboard = (mount, user) => {
  const { api, esc } = LeadFlow;
  const fmt = (n) => "₹" + Math.round(Number(n) || 0).toLocaleString("en-IN");
  // Same comma-tolerant parsing as screens.js's money inputs — typing commas
  // to double-check zero counts shouldn't be rejected by a type="number" field.
  const parseAmount = (v) => Number(String(v).replace(/,/g, "").trim());
  const thisYear = new Date().getFullYear();
  const SECTIONS = [
    { id: "outreach", label: "Outreach performance" },
    { id: "projects", label: "Projects" },
    { id: "salaries", label: "Salaries" },
    { id: "expenses", label: "Expenses" },
  ];
  let active = "outreach";

  mount.innerHTML = `
    <nav class="dash-nav"></nav>
    <div class="dash-body"></div>`;
  const navEl = mount.querySelector(".dash-nav");
  const bodyEl = mount.querySelector(".dash-body");

  function renderNav() {
    navEl.innerHTML = SECTIONS.map((s) =>
      `<button class="dash-tab${s.id === active ? " on" : ""}" data-id="${s.id}">${s.label}</button>`
    ).join("");
    for (const btn of navEl.querySelectorAll(".dash-tab")) {
      btn.onclick = () => { active = btn.dataset.id; renderNav(); renderBody(); };
    }
  }

  async function renderBody() {
    bodyEl.innerHTML = "<p class=\"empty\">Loading…</p>";
    try {
      if (active === "outreach") await renderOutreach();
      else if (active === "projects") await renderProjects();
      else if (active === "salaries") await renderSalaries();
      else await renderExpenses();
    } catch (err) {
      bodyEl.innerHTML = `<p class="err">${esc(err.message)}</p>`;
    }
  }

  // ---- D1 — outreach performance ------------------------------------------------

  async function renderOutreach() {
    const outreachPeople = await api("/api/core/dashboard/people/outreach");
    if (outreachPeople.length === 0) {
      bodyEl.innerHTML = "<p class=\"empty\">No outreach team members yet.</p>";
      return;
    }
    bodyEl.innerHTML = `
      <label class="dash-picker">Outreach person
        <select id="op-pick">${outreachPeople.map((p) => `<option value="${p.id}">${esc(p.display_name)}</option>`).join("")}</select>
      </label>
      <div id="op-tables"></div>`;
    const select = bodyEl.querySelector("#op-pick");
    const load = async () => {
      const { years } = await api(`/api/core/dashboard/outreach/${select.value}`);
      const tables = bodyEl.querySelector("#op-tables");
      if (years.length === 0) {
        tables.innerHTML = "<p class=\"empty\">No calls logged for this person yet.</p>";
        return;
      }
      tables.innerHTML = years.map((y) => `
        <h3>${y.year}</h3>
        <table><thead><tr>
          <th>Month</th><th>Hot</th><th>Cold</th><th>Not interested</th>
          <th>Switched off / unreachable</th><th>Not picking</th><th>Invalid</th>
          <th>Meeting finalized</th><th>Revenue finalized</th><th>Revenue collected</th><th>Incentive</th>
        </tr></thead><tbody>
          ${y.rows.map((r) => `<tr>
            <td>${r.month_name}</td><td>${r.hot}</td><td>${r.cold}</td><td>${r.not_interested}</td>
            <td>${r.switched_off}</td><td>${r.not_picking}</td><td>${r.invalid}</td>
            <td>${r.converted}</td><td>${fmt(r.revenue_finalized)}</td><td>${fmt(r.revenue_collected)}</td>
            <td>${fmt(r.incentive)}</td>
          </tr>`).join("")}
        </tbody></table>`).join("");
    };
    select.onchange = load;
    await load();
  }

  // ---- D2 — projects --------------------------------------------------------------

  async function renderProjects() {
    const [summary, list] = await Promise.all([
      api("/api/core/dashboard/projects-summary"),
      api("/api/core/dashboard/projects"),
    ]);
    bodyEl.innerHTML = `
      <table><thead><tr>
        <th>Core member</th><th>Total delivered</th><th>Continuing</th>
        <th>Delivered but payment not received</th><th>Payment outstanding</th>
      </tr></thead><tbody>
        ${summary.map((s) => `<tr>
          <td>${esc(s.display_name)}</td><td>${s.delivered}</td><td>${s.continuing}</td>
          <td>${s.payment_not_received}</td><td>${fmt(s.outstanding)}</td>
        </tr>`).join("") || `<tr><td colspan="5" class="empty">No core members.</td></tr>`}
      </tbody></table>
      <h3>All projects</h3>
      <table><thead><tr>
        <th>Lead name</th><th>Kind of work</th><th>Handled by</th><th>Status</th>
        <th>Total amount</th><th>Amount paid</th><th>Amount left</th><th>Deadline</th>
      </tr></thead><tbody>
        ${list.map((p) => `<tr>
          <td>${esc(p.lead_name)}</td><td>${esc(p.kind || "")}${p.description ? " — " + esc(p.description) : ""}</td>
          <td>${esc(p.handled_by || "—")}</td><td>${esc(p.work_status || "")}</td>
          <td>${fmt(p.total_amount)}</td><td>${fmt(p.amount_paid)}</td>
          <td>${fmt((p.total_amount || 0) - (p.amount_paid || 0))}</td>
          <td><input type="date" class="deadline-input" data-id="${p.id}" value="${p.deadline ? esc(p.deadline) : ""}"></td>
        </tr>`).join("") || `<tr><td colspan="8" class="empty">No projects yet.</td></tr>`}
      </tbody></table>`;
    for (const input of bodyEl.querySelectorAll(".deadline-input")) {
      input.onchange = async () => {
        try {
          await api(`/api/core/dashboard/projects/${input.dataset.id}/deadline`, {
            method: "PATCH", body: { deadline: input.value || null },
          });
        } catch (err) { alert(err.message); }
      };
    }
  }

  // ---- D3 — salaries ----------------------------------------------------------------

  async function renderSalaries() {
    let year = thisYear < 2026 ? 2026 : thisYear;
    bodyEl.innerHTML = `
      <label class="dash-picker">Year
        <select id="sal-year">${[2026, 2027, 2028].map((y) => `<option value="${y}">${y}</option>`).join("")}</select>
      </label>
      <div id="sal-grid"></div>`;
    const yearSel = bodyEl.querySelector("#sal-year");
    yearSel.value = String(year);

    const load = async () => {
      year = yearSel.value;
      const grid = await api(`/api/core/dashboard/salaries/outreach/${year}`);
      const gridEl = bodyEl.querySelector("#sal-grid");
      if (grid.months.length === 0) {
        gridEl.innerHTML = "<p class=\"empty\">No salary months in this year yet (grid starts July 2026).</p>";
        return;
      }
      if (grid.people.length === 0) {
        gridEl.innerHTML = "<p class=\"empty\">No outreach team members yet.</p>";
        return;
      }
      gridEl.innerHTML = `<table><thead><tr>
          <th>Employee</th>${grid.months.map((m) => `<th>${m.month_name}</th>`).join("")}
        </tr></thead><tbody>
          ${grid.people.map((p) => `<tr>
            <td>${esc(p.display_name)}</td>
            ${p.cells.map((c) => `<td><span class="sal-cell-inner">
              <span class="sal-computed">${fmt(c.amount)}</span>
              <button class="sal-toggle ${c.paid ? "paid" : "unpaid"}" data-user="${p.user_id}" data-month="${c.month}">${c.paid ? "Paid" : "Unpaid"}</button>
            </span></td>`).join("")}
          </tr>`).join("")}
        </tbody></table>`;

      for (const btn of gridEl.querySelectorAll(".sal-toggle")) {
        btn.onclick = async () => {
          try {
            await api(`/api/core/dashboard/salaries/${year}/${btn.dataset.user}/${btn.dataset.month}/toggle`, { method: "POST" });
            await load();
          } catch (err) { alert(err.message); }
        };
      }
    };
    yearSel.onchange = load;
    await load();
  }

  // ---- D4 — expenses ------------------------------------------------------------------

  async function renderExpenses() {
    let year = thisYear < 2026 ? 2026 : thisYear;
    bodyEl.innerHTML = `
      <label class="dash-picker">Year
        <select id="exp-year">${[2026, 2027, 2028].map((y) => `<option value="${y}">${y}</option>`).join("")}</select>
      </label>
      <div id="exp-table"></div>`;
    const yearSel = bodyEl.querySelector("#exp-year");
    yearSel.value = String(year);

    const load = async () => {
      year = yearSel.value;
      const rows = await api(`/api/core/dashboard/expenses/${year}`);
      const table = bodyEl.querySelector("#exp-table");
      if (rows.length === 0) {
        table.innerHTML = "<p class=\"empty\">No expense months in this year yet (starts July 2026).</p>";
        return;
      }
      table.innerHTML = `<table><thead><tr>
          <th>Month</th><th>AI subscription fees</th><th>Outreach team fees</th><th>Total money</th><th>Money left for main employees</th>
        </tr></thead><tbody>
          ${rows.map((r) => `<tr>
            <td>${r.month_name}</td>
            <td><input type="text" inputmode="decimal" class="exp-ai" data-month="${r.month}" value="${Number(r.ai_fees).toLocaleString("en-IN")}"></td>
            <td>${fmt(r.outreach_fees)}</td>
            <td>${fmt(r.total_money)}</td>
            <td>${fmt(r.money_left)}</td>
          </tr>`).join("")}
        </tbody></table>`;
      for (const input of table.querySelectorAll(".exp-ai")) {
        input.onchange = async () => {
          try {
            await api(`/api/core/dashboard/expenses/${year}/${input.dataset.month}`, {
              method: "PATCH", body: { ai_fees: parseAmount(input.value) || 0 },
            });
            await load();
          } catch (err) { alert(err.message); }
        };
      }
    };
    yearSel.onchange = load;
    await load();
  }

  renderNav();
  renderBody();
};
