// Screens agent owns this file. Registers views the shell routes to:
//   LeadFlow.views.collections = (mount, user) => { ... }
//   LeadFlow.views.converted   = (mount, user) => { ... }   // core team only
// Helpers available: LeadFlow.api(path, {method, body}), LeadFlow.esc(str).
//
// Screen 2 (a collection's lead table) has no hash route of its own — clicking
// a tile just swaps what's rendered inside the same mount, and "back" re-runs
// the collections render. Keeps navigation inside the shell's single-level router.

const STATUSES = [
  "Hot lead", "Cold lead", "Not interested", "Not picking",
  "Phone switched off / out of coverage", "Invalid number", "Pre-paid (advance received)",
];
// ponytail: no PRD list for project "kind" (unlike status) — reasonable placeholder set,
// extend when the team says what they actually build.
const KINDS = ["Website", "Web app", "Mobile app", "E-commerce", "Marketing", "Other"];
const WORK_STATUSES = ["Completed & payment received", "Working on project", "Work done, payment not received"];

const { esc, api } = LeadFlow;

// ---- Screen 1: Collections ----------------------------------------------

async function renderCollections(mount, user) {
  if (user.role === "outreach") return renderMyLeads(mount, user);

  mount.innerHTML = `<p class="empty">Loading…</p>`;
  let collections;
  try { ({ collections } = await api("/api/core/collections")); }
  catch (err) { mount.innerHTML = `<p class="err">${esc(err.message)}</p>`; return; }

  if (!collections.length) {
    mount.innerHTML = `<p class="empty">No collections yet — scrape some leads in chat.</p>`;
    return;
  }

  mount.innerHTML = `<div class="tiles">${collections.map((c) => `
    <button class="tile" data-id="${c.id}">
      <h3>${esc(c.category)} · ${esc(c.city)}</h3>
      <p>${c.total} leads · ${c.called} called</p>
    </button>`).join("")}</div>`;

  mount.querySelectorAll(".tile").forEach((btn) => {
    btn.onclick = () => renderLeadTable(mount, user, collections.find((c) => String(c.id) === btn.dataset.id));
  });
}

// ---- Screen 2: Lead table -------------------------------------------------

async function renderLeadTable(mount, user, collection) {
  mount.innerHTML = `<p class="empty">Loading…</p>`;
  let leads, users;
  try {
    [{ leads }, { users }] = await Promise.all([
      api(`/api/core/collections/${collection.id}/leads`),
      api("/api/users?role=outreach"),
    ]);
  } catch (err) { mount.innerHTML = `<p class="err">${esc(err.message)}</p>`; return; }

  const isCore = user.role === "core";
  mount.innerHTML = `
    <p><button class="link" id="back">&larr; Collections</button></p>
    <h2>${esc(collection.category)} · ${esc(collection.city)}</h2>
    ${isCore ? bulkAssignToolbar(users) : ""}
    <div class="table-wrap"><table>
      <thead><tr>
        <th>Business</th><th>Phone</th><th>Website / webapp</th>
        ${isCore ? "<th>Assigned to</th>" : ""}
        <th>Status</th><th>Called by</th><th>Amount finalized (₹)</th>
      </tr></thead>
      <tbody>${leads.map((l) => leadRow(l, users, user)).join("")}</tbody>
    </table></div>`;

  document.getElementById("back").onclick = () => renderCollections(mount, user);
  leads.forEach((l) => wireLeadRow(mount, l.id, user));
  if (isCore) wireBulkAssignToolbar(mount, user, collection);
}

function bulkAssignToolbar(outreachUsers) {
  return `<div id="bulk-assign">
    <select id="bulk-user">
      <option value="">Assign to…</option>
      ${outreachUsers.map((u) => `<option value="${u.id}">${esc(u.display_name)}</option>`).join("")}
    </select>
    <input id="bulk-count" type="number" min="1" step="1" placeholder="top N (blank = all unassigned)">
    <button id="bulk-assign-btn" type="button">Assign unassigned leads</button>
  </div>`;
}

function wireBulkAssignToolbar(mount, user, collection) {
  document.getElementById("bulk-assign-btn").onclick = async () => {
    const userId = document.getElementById("bulk-user").value;
    if (!userId) { alert("Pick an outreach person first"); return; }
    const countVal = document.getElementById("bulk-count").value;
    const body = { user_id: Number(userId) };
    if (countVal !== "") body.count = Number(countVal);
    try {
      await api(`/api/core/collections/${collection.id}/assign-bulk`, { method: "POST", body });
      renderLeadTable(mount, user, collection);
    } catch (err) { alert(err.message); }
  };
}

function leadRow(l, users, user) {
  const assignedCell = user.role === "core" ? `<td><select class="f-assigned">
      <option value="">Unassigned</option>
      ${users.map((u) => `<option value="${u.id}" ${l.assigned_to === u.id ? "selected" : ""}>${esc(u.display_name)}</option>`).join("")}
    </select></td>` : "";
  return `<tr data-lead="${l.id}">
    <td>${esc(l.name)}</td>
    <td>${esc(l.phone)}</td>
    <td>${esc(l.capability)}</td>
    ${assignedCell}
    ${editableCells(l, users)}
  </tr>`;
}

// Shared by Screen 2 rows and "my leads" rows — status / called-by / amount editing.
function editableCells(l, users) {
  return `<td><select class="f-status">
      <option value="">—</option>
      ${STATUSES.map((s) => `<option value="${esc(s)}" ${l.status === s ? "selected" : ""}>${esc(s)}</option>`).join("")}
    </select></td>
    <td><select class="f-called-by">
      <option value="">—</option>
      ${users.map((u) => `<option value="${u.id}" ${l.called_by === u.id ? "selected" : ""}>${esc(u.display_name)}</option>`).join("")}
    </select></td>
    <td><input class="f-amount" type="number" min="0" step="1" value="${l.deal_value ?? ""}"></td>`;
}

function wireEditableRow(mount, leadId) {
  const row = mount.querySelector(`tr[data-lead="${leadId}"]`);
  const save = async (fields) => {
    try {
      await api(`/api/leads/${leadId}/status`, { method: "PUT", body: fields });
      row.classList.remove("row-err");
    } catch (err) {
      row.classList.add("row-err");
      alert(err.message);
    }
  };
  row.querySelector(".f-status").onchange = (e) => save({ status: e.target.value || null });
  row.querySelector(".f-called-by").onchange = (e) => save({ called_by: e.target.value ? Number(e.target.value) : null });
  row.querySelector(".f-amount").onblur = (e) => {
    if (e.target.value === "") return;
    save({ deal_value: Number(e.target.value) });
  };
  return row;
}

function wireLeadRow(mount, leadId, user) {
  const row = wireEditableRow(mount, leadId);
  if (user.role !== "core") return;
  row.querySelector(".f-assigned").onchange = async (e) => {
    try {
      await api(`/api/core/leads/${leadId}/assign`, {
        method: "PUT",
        body: { user_id: e.target.value ? Number(e.target.value) : null },
      });
      row.classList.remove("row-err");
    } catch (err) {
      row.classList.add("row-err");
      alert(err.message);
    }
  };
}

// ---- Outreach: flat "my leads" view (no collection browsing) --------------

async function renderMyLeads(mount, user) {
  mount.innerHTML = `<p class="empty">Loading…</p>`;
  let leads, users;
  try {
    [{ leads }, { users }] = await Promise.all([
      api("/api/leads/mine"),
      api("/api/users?role=outreach"),
    ]);
  } catch (err) { mount.innerHTML = `<p class="err">${esc(err.message)}</p>`; return; }

  if (!leads.length) {
    mount.innerHTML = `<p class="empty">No leads assigned to you yet — ask a core team member.</p>`;
    return;
  }

  mount.innerHTML = `
    <h2>My leads</h2>
    <div class="table-wrap"><table>
      <thead><tr>
        <th>Business</th><th>Phone</th><th>Website / webapp</th><th>Category</th><th>City</th>
        <th>Status</th><th>Called by</th><th>Amount finalized (₹)</th>
      </tr></thead>
      <tbody>${leads.map((l) => myLeadRow(l, users)).join("")}</tbody>
    </table></div>`;

  leads.forEach((l) => wireEditableRow(mount, l.id));
}

function myLeadRow(l, users) {
  return `<tr data-lead="${l.id}">
    <td>${esc(l.name)}</td>
    <td>${esc(l.phone)}</td>
    <td>${esc(l.capability)}</td>
    <td>${esc(l.category)}</td>
    <td>${esc(l.collection_city)}</td>
    ${editableCells(l, users)}
  </tr>`;
}

// ---- Screen 3: Converted Leads (core only) --------------------------------

async function renderConverted(mount) {
  mount.innerHTML = `<p class="empty">Loading…</p>`;
  let projects, coreUsers;
  try {
    [{ projects }, { users: coreUsers }] = await Promise.all([
      api("/api/core/converted"),
      api("/api/users?role=core"),
    ]);
  } catch (err) { mount.innerHTML = `<p class="err">${esc(err.message)}</p>`; return; }

  if (!projects.length) {
    mount.innerHTML = `<p class="empty">No converted leads yet — set a lead to Pre-paid on Screen 2.</p>`;
    return;
  }

  mount.innerHTML = `<div class="table-wrap"><table>
    <thead><tr>
      <th>Lead</th><th>Number</th><th>Area</th><th>City</th><th>State</th>
      <th>Kind of project</th><th>Assigned to</th><th>Paid</th><th>Left</th>
      <th>Total (₹)</th><th>Work status</th><th>Future scope</th><th>Add payment</th>
    </tr></thead>
    <tbody>${projects.map((p) => convertedRow(p, coreUsers)).join("")}</tbody>
  </table></div>`;

  projects.forEach((p) => wireConvertedRow(mount, p.project_id));
}

function convertedRow(p, coreUsers) {
  const assignedIds = new Set((p.assignees || []).map((a) => a.id));
  return `<tr data-project="${p.project_id}">
    <td>${esc(p.name)}</td>
    <td>${esc(p.phone)}</td>
    <td><input class="f-area" value="${esc(p.area ?? "")}"></td>
    <td><input class="f-city" value="${esc(p.city ?? "")}"></td>
    <td><input class="f-state" value="${esc(p.state ?? "")}"></td>
    <td>
      <select class="f-kind">
        <option value="">—</option>
        ${KINDS.map((k) => `<option value="${esc(k)}" ${p.kind === k ? "selected" : ""}>${esc(k)}</option>`).join("")}
      </select>
      <input class="f-description" placeholder="description" value="${esc(p.description ?? "")}">
    </td>
    <td class="f-assignees">
      ${coreUsers.map((u) => `<label><input type="checkbox" value="${u.id}" ${assignedIds.has(u.id) ? "checked" : ""}> ${esc(u.display_name)}</label>`).join("")}
    </td>
    <td>₹${(p.amount_paid || 0).toLocaleString("en-IN")}</td>
    <td>₹${(p.amount_left || 0).toLocaleString("en-IN")}</td>
    <td><input class="f-total" type="number" min="0" step="1" value="${p.total_amount ?? ""}"></td>
    <td><select class="f-work-status">
      <option value="">—</option>
      ${WORK_STATUSES.map((s) => `<option value="${esc(s)}" ${p.work_status === s ? "selected" : ""}>${esc(s)}</option>`).join("")}
    </select></td>
    <td><input class="f-scope" value="${esc(p.future_scope ?? "")}"></td>
    <td class="f-payment-cell">
      <input class="f-payment" type="number" min="0" step="1" placeholder="amount">
      <button class="f-add-payment" type="button">Add</button>
    </td>
  </tr>`;
}

function wireConvertedRow(mount, projectId) {
  const row = mount.querySelector(`tr[data-project="${projectId}"]`);
  const patch = async (fields) => {
    try { await api(`/api/core/converted/${projectId}`, { method: "PATCH", body: fields }); }
    catch (err) { alert(err.message); }
  };

  row.querySelector(".f-area").onblur = (e) => patch({ area: e.target.value });
  row.querySelector(".f-city").onblur = (e) => patch({ city: e.target.value });
  row.querySelector(".f-state").onblur = (e) => patch({ state: e.target.value });
  row.querySelector(".f-kind").onchange = (e) => patch({ kind: e.target.value });
  row.querySelector(".f-description").onblur = (e) => patch({ description: e.target.value });
  row.querySelector(".f-work-status").onchange = (e) => patch({ work_status: e.target.value });
  row.querySelector(".f-scope").onblur = (e) => patch({ future_scope: e.target.value });
  row.querySelector(".f-total").onblur = (e) => {
    if (e.target.value === "") return;
    patch({ total_amount: Number(e.target.value) });
  };

  row.querySelectorAll(".f-assignees input[type=checkbox]").forEach((cb) => {
    cb.onchange = async () => {
      const ids = [...row.querySelectorAll(".f-assignees input:checked")].map((i) => Number(i.value));
      try { await api(`/api/core/converted/${projectId}/assignees`, { method: "PUT", body: { user_ids: ids } }); }
      catch (err) { alert(err.message); }
    };
  });

  row.querySelector(".f-add-payment").onclick = async () => {
    const input = row.querySelector(".f-payment");
    const amount = Number(input.value);
    if (!amount || amount <= 0) return;
    try {
      await api(`/api/core/converted/${projectId}/payments`, { method: "POST", body: { amount } });
      renderConverted(mount);
    } catch (err) { alert(err.message); }
  };
}

LeadFlow.views.collections = renderCollections;
LeadFlow.views.converted = (mount) => renderConverted(mount);
