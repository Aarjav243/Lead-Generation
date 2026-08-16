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
  "Phone switched off / out of coverage", "Invalid number", "Meeting finalized",
];
// ponytail: no PRD list for project "kind" (unlike status) — reasonable placeholder set,
// extend when the team says what they actually build.
const KINDS = ["Website", "Web app", "Mobile app", "E-commerce", "Marketing", "Other"];
const WORK_STATUSES = ["Completed & payment received", "Working on project", "Work done, payment not received"];

const { esc, api } = LeadFlow;

// Money inputs accept commas as thousands separators (typed in to double-check
// zero counts, e.g. 10,000 vs 1,000) — strip them before parsing, format them
// back in after a save so the entered value is visually confirmed.
function parseAmount(v) {
  return Number(String(v).replace(/,/g, "").trim());
}
function fmtAmount(n) {
  return n === null || n === undefined || n === "" ? "" : Number(n).toLocaleString("en-IN");
}

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

// Shows which outreach person owns which position-range, using the same
// ranking order assignBulk's SQL sorts by (weak/no-online-presence first,
// then id) so ranges match what "top N" actually assigned.
function assignmentRangesTable(leads) {
  const ranked = [...leads].sort((a, b) => {
    const score = (l) => (/^Website \+ /.test(l.capability || "") || /^Full webapp/.test(l.capability || "")) ? 1 : 0;
    return score(a) - score(b) || a.id - b.id;
  });
  const ranges = new Map();
  ranked.forEach((l, i) => {
    const name = l.assigned_to_name || "Unassigned";
    if (!ranges.has(name)) ranges.set(name, { start: i + 1, end: i + 1, count: 0 });
    const r = ranges.get(name);
    r.end = i + 1;
    r.count++;
  });
  const rows = [...ranges].filter(([name]) => name !== "Unassigned");
  if (!rows.length) return "";
  return `<div class="table-wrap"><table>
    <thead><tr><th>Outreach person</th><th>Lead range</th><th>Count</th></tr></thead>
    <tbody>${rows.map(([name, r]) => `<tr>
      <td>${esc(name)}</td><td>${r.start}–${r.end}</td><td>${r.count}</td>
    </tr>`).join("")}</tbody>
  </table></div>`;
}

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
    <p>${leads.length} lead${leads.length === 1 ? "" : "s"} total</p>
    ${isCore ? assignmentRangesTable(leads) : ""}
    ${isCore ? bulkAssignToolbar(users) : ""}
    <div class="table-wrap"><table>
      <thead><tr>
        <th>Business</th><th>Phone</th><th>Website / webapp</th>
        ${isCore ? "<th>Assigned to</th>" : ""}
        <th>Status</th><th>Owner name</th><th>Available timings</th>
        <th>Service wanted</th><th>Note</th><th>Meeting link</th>
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
    <input id="bulk-count" type="text" placeholder="top N, or 1-30 for a range (blank = all)">
    <button id="bulk-assign-btn" type="button">Assign leads</button>
  </div>`;
}

function wireBulkAssignToolbar(mount, user, collection) {
  document.getElementById("bulk-assign-btn").onclick = async () => {
    const userSelect = document.getElementById("bulk-user");
    const userId = userSelect.value;
    if (!userId) { LeadFlow.toast("Pick an outreach person first"); return; }
    const personName = userSelect.selectedOptions[0].textContent;
    const raw = document.getElementById("bulk-count").value.trim();
    const body = { user_id: Number(userId) };
    const rangeMatch = raw.match(/^(\d+)\s*-\s*(\d+)$/);
    if (rangeMatch) {
      body.from = Number(rangeMatch[1]);
      body.to = Number(rangeMatch[2]);
    } else if (raw !== "") {
      if (!/^\d+$/.test(raw)) { LeadFlow.toast("Enter a number (top N) or a range like 1-30"); return; }
      body.count = Number(raw);
    }
    try {
      const { assigned } = await api(`/api/core/collections/${collection.id}/assign-bulk`, { method: "POST", body });
      LeadFlow.toast(assigned === 0
        ? "No leads in this collection to assign."
        : `Assigned ${assigned} lead${assigned === 1 ? "" : "s"} to ${personName}.`);
      renderLeadTable(mount, user, collection);
    } catch (err) { LeadFlow.toast(err.message); }
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
    ${editableCells(l)}
  </tr>`;
}

// Shared by Screen 2 rows and "my leads" rows — status editing plus the Add-up 2
// lead fields (owner_name, available_timings, service_wanted, note). Screen 2 (core)
// keeps the meeting_link field; outreach's "my leads" gets meeting_date + meeting_time
// instead (NEW CHANGES #1).
function editableCells(l, { meetingLink = true } = {}) {
  const meetingCell = meetingLink
    ? `<td><input class="f-meeting-link" value="${esc(l.meeting_link ?? "")}"></td>`
    : `<td><input class="f-meeting-date" type="date" value="${esc(l.meeting_date ?? "")}"></td>
       <td><input class="f-meeting-time" type="time" value="${esc(l.meeting_time ?? "")}"></td>`;
  return `<td><select class="f-status">
      <option value="">—</option>
      ${STATUSES.map((s) => `<option value="${esc(s)}" ${l.status === s ? "selected" : ""}>${esc(s)}</option>`).join("")}
    </select></td>
    <td><input class="f-owner-name" value="${esc(l.owner_name ?? "")}"></td>
    <td><input class="f-timings" value="${esc(l.available_timings ?? "")}"></td>
    <td><input class="f-service" value="${esc(l.service_wanted ?? "")}"></td>
    <td><input class="f-note" value="${esc(l.note ?? "")}"></td>
    ${meetingCell}`;
}

function wireEditableRow(mount, leadId) {
  const row = mount.querySelector(`tr[data-lead="${leadId}"]`);
  const saveStatus = async (status) => {
    try {
      await api(`/api/leads/${leadId}/status`, { method: "PUT", body: { status } });
      row.classList.remove("row-err");
    } catch (err) {
      row.classList.add("row-err");
      LeadFlow.toast(err.message);
    }
  };
  const saveFields = async (fields) => {
    try {
      await api(`/api/leads/${leadId}`, { method: "PATCH", body: fields });
      row.classList.remove("row-err");
    } catch (err) {
      row.classList.add("row-err");
      LeadFlow.toast(err.message);
    }
  };
  row.querySelector(".f-status").onchange = (e) => saveStatus(e.target.value || null);
  row.querySelector(".f-owner-name").onblur = (e) => saveFields({ owner_name: e.target.value });
  row.querySelector(".f-timings").onblur = (e) => saveFields({ available_timings: e.target.value });
  row.querySelector(".f-service").onblur = (e) => saveFields({ service_wanted: e.target.value });
  row.querySelector(".f-note").onblur = (e) => saveFields({ note: e.target.value });
  row.querySelector(".f-meeting-link")?.addEventListener("blur", (e) => saveFields({ meeting_link: e.target.value }));
  row.querySelector(".f-meeting-date")?.addEventListener("blur", (e) => saveFields({ meeting_date: e.target.value }));
  row.querySelector(".f-meeting-time")?.addEventListener("blur", (e) => saveFields({ meeting_time: e.target.value }));
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
      LeadFlow.toast(err.message);
    }
  };
}

// ---- Outreach: flat "my leads" view (no collection browsing) --------------

async function renderMyLeads(mount, user) {
  mount.innerHTML = `<p class="empty">Loading…</p>`;
  let leads;
  try { ({ leads } = await api("/api/leads/mine")); }
  catch (err) { mount.innerHTML = `<p class="err">${esc(err.message)}</p>`; return; }

  if (!leads.length) {
    mount.innerHTML = `<p class="empty">No leads assigned to you yet — ask a core team member.</p>`;
    return;
  }

  mount.innerHTML = `
    <h2>My leads</h2>
    <div class="table-wrap"><table>
      <thead><tr>
        <th>Business</th><th>Phone</th><th>Website / webapp</th><th>Category</th><th>City</th>
        <th>Status</th><th>Owner name</th><th>Available timings</th>
        <th>Service wanted</th><th>Note</th><th>Meeting date</th><th>Meeting time</th>
      </tr></thead>
      <tbody>${leads.map((l) => myLeadRow(l)).join("")}</tbody>
    </table></div>`;

  leads.forEach((l) => wireEditableRow(mount, l.id));
}

function myLeadRow(l) {
  return `<tr data-lead="${l.id}">
    <td>${esc(l.name)}</td>
    <td>${esc(l.phone)}</td>
    <td>${esc(l.capability)}</td>
    <td>${esc(l.category)}</td>
    <td>${esc(l.collection_city)}</td>
    ${editableCells(l, { meetingLink: false })}
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
    mount.innerHTML = `<p class="empty">No converted leads yet — close a deal on Meetings Finalized.</p>`;
    return;
  }

  mount.innerHTML = `<div class="table-wrap"><table>
    <thead><tr>
      <th>Lead</th><th>Number</th><th>Area</th><th>City</th><th>State</th>
      <th>Kind of project</th><th>Assigned to</th><th>Outreach person</th><th>Incentive</th>
      <th>Paid (₹)</th><th>Left</th>
      <th>Total (₹)</th><th>Work status</th><th>Future scope</th>
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
        ${p.kind && !KINDS.includes(p.kind) ? `<option value="${esc(p.kind)}" selected>${esc(p.kind)}</option>` : ""}
        ${KINDS.map((k) => `<option value="${esc(k)}" ${p.kind === k ? "selected" : ""}>${esc(k)}</option>`).join("")}
      </select>
      <input class="f-description" placeholder="description" value="${esc(p.description ?? "")}">
    </td>
    <td class="f-assignees">
      ${coreUsers.map((u) => `<label><input type="checkbox" value="${u.id}" ${assignedIds.has(u.id) ? "checked" : ""}> ${esc(u.display_name)}</label>`).join("")}
    </td>
    <td>${esc(p.outreach_name || "—")}</td>
    <td><input class="f-commission" type="text" inputmode="decimal" value="${fmtAmount(Math.round(p.commission || 0))}"></td>
    <td><input class="f-paid" type="text" inputmode="decimal" value="${fmtAmount(p.amount_paid || 0)}"></td>
    <td class="f-left">₹${(p.amount_left || 0).toLocaleString("en-IN")}</td>
    <td><input class="f-total" type="text" inputmode="decimal" value="${fmtAmount(p.total_amount)}"></td>
    <td><select class="f-work-status">
      <option value="">—</option>
      ${WORK_STATUSES.map((s) => `<option value="${esc(s)}" ${p.work_status === s ? "selected" : ""}>${esc(s)}</option>`).join("")}
    </select></td>
    <td><input class="f-scope" value="${esc(p.future_scope ?? "")}"></td>
  </tr>`;
}

function wireConvertedRow(mount, projectId) {
  const row = mount.querySelector(`tr[data-project="${projectId}"]`);
  const patch = async (fields) => {
    try { await api(`/api/core/converted/${projectId}`, { method: "PATCH", body: fields }); }
    catch (err) { LeadFlow.toast(err.message); }
  };

  row.querySelector(".f-area").onblur = (e) => patch({ area: e.target.value });
  row.querySelector(".f-city").onblur = (e) => patch({ city: e.target.value });
  row.querySelector(".f-state").onblur = (e) => patch({ state: e.target.value });
  row.querySelector(".f-kind").onchange = (e) => patch({ kind: e.target.value });
  row.querySelector(".f-description").onblur = (e) => patch({ description: e.target.value });
  row.querySelector(".f-work-status").onchange = (e) => patch({ work_status: e.target.value });
  row.querySelector(".f-scope").onblur = (e) => patch({ future_scope: e.target.value });
  // Amount left = total - paid. Both are already known client-side (the other
  // field's current input value), so update that cell in place instead of
  // re-rendering the whole table — a full re-render resets the table's scroll
  // position, which looked like "jumps back to the first row" on every edit.
  const updateLeft = () => {
    const total = parseAmount(row.querySelector(".f-total").value);
    const paid = parseAmount(row.querySelector(".f-paid").value);
    row.querySelector(".f-left").textContent = "₹" + fmtAmount((Number.isNaN(total) ? 0 : total) - (Number.isNaN(paid) ? 0 : paid));
  };

  row.querySelector(".f-total").onblur = (e) => {
    if (e.target.value === "") return;
    const amount = parseAmount(e.target.value);
    e.target.value = fmtAmount(amount);
    patch({ total_amount: amount });
    updateLeft();
  };

  // Commission is auto-computed from deal value at conversion time, but core
  // can override it here (e.g. a manually agreed incentive) — same
  // comma-tolerant input as the other money fields.
  row.querySelector(".f-commission").onblur = (e) => {
    if (e.target.value === "") return;
    const amount = parseAmount(e.target.value);
    e.target.value = fmtAmount(amount);
    patch({ commission: amount });
  };

  row.querySelector(".f-paid").onblur = async (e) => {
    if (e.target.value === "") return;
    const amount = parseAmount(e.target.value);
    e.target.value = fmtAmount(amount);
    try {
      await api(`/api/core/converted/${projectId}`, { method: "PATCH", body: { amount_paid: amount } });
      updateLeft();
    } catch (err) { LeadFlow.toast(err.message); }
  };

  row.querySelectorAll(".f-assignees input[type=checkbox]").forEach((cb) => {
    cb.onchange = async () => {
      const ids = [...row.querySelectorAll(".f-assignees input:checked")].map((i) => Number(i.value));
      try { await api(`/api/core/converted/${projectId}/assignees`, { method: "PUT", body: { user_ids: ids } }); }
      catch (err) { LeadFlow.toast(err.message); }
    };
  });
}

// ---- Add-up 1: Meetings Finalized (core only) -----------------------------
// Auto-synced from the lead fields outreach already entered (Add-up 2) — no
// re-typing. Flipping "Converted" to Yes is the only place core enters money in
// v2 — it locks in the deal value and the row stays visible (not hidden) afterward,
// now showing who gets credit and what they earned (NEW CHANGES #2/#3).

async function renderMeetings(mount) {
  mount.innerHTML = `<p class="empty">Loading…</p>`;
  let leads;
  try { ({ leads } = await api("/api/core/meetings")); }
  catch (err) { mount.innerHTML = `<p class="err">${esc(err.message)}</p>`; return; }

  if (!leads.length) {
    mount.innerHTML = `<p class="empty">No meetings finalized yet.</p>`;
    return;
  }

  mount.innerHTML = `<div class="table-wrap"><table>
    <thead><tr>
      <th>Date</th><th>Owner / lead name</th><th>Business name</th><th>Available timings</th>
      <th>Service wanted</th><th>Note</th><th>Meeting link</th>
      <th>Outreach person</th><th>Incentive</th><th>Deal value</th><th>Converted</th>
    </tr></thead>
    <tbody>${leads.map(meetingRow).join("")}</tbody>
  </table></div>`;

  leads.forEach((l) => wireMeetingRow(mount, l.id));
}

function meetingRow(l) {
  return `<tr data-lead="${l.id}" data-project="${l.project_id ?? ""}">
    <td>${esc((l.finalized_at || "").slice(0, 10))}</td>
    <td><input class="f-owner-name" value="${esc(l.owner_name ?? "")}"></td>
    <td><input class="f-name" value="${esc(l.name ?? "")}"></td>
    <td><input class="f-timings" value="${esc(l.available_timings ?? "")}"></td>
    <td><input class="f-service" value="${esc(l.service_wanted ?? "")}"></td>
    <td><input class="f-note" value="${esc(l.note ?? "")}"></td>
    <td><input class="f-meeting-link" value="${esc(l.meeting_link ?? "")}"></td>
    <td>${esc(l.assigned_to_name || "—")}</td>
    <td class="f-commission">${l.converted ? "₹" + fmtAmount(Math.round(l.commission || 0)) : "—"}</td>
    <td class="f-close-cell">
      <input class="f-total" type="text" inputmode="decimal" placeholder="Deal value (₹)"
        value="${l.converted ? fmtAmount(l.total_amount) : ""}">
    </td>
    <td>
      <select class="f-converted">
        <option value="no" ${!l.converted ? "selected" : ""}>No</option>
        <option value="yes" ${l.converted ? "selected" : ""}>Yes</option>
      </select>
    </td>
  </tr>`;
}

function wireMeetingRow(mount, leadId) {
  const row = mount.querySelector(`tr[data-lead="${leadId}"]`);
  const saveField = async (fields) => {
    try {
      await api(`/api/leads/${leadId}`, { method: "PATCH", body: fields });
      row.classList.remove("row-err");
    } catch (err) {
      row.classList.add("row-err");
      LeadFlow.toast(err.message);
    }
  };
  row.querySelector(".f-owner-name").onblur = (e) => saveField({ owner_name: e.target.value });
  row.querySelector(".f-name").onblur = (e) => saveField({ name: e.target.value });
  row.querySelector(".f-timings").onblur = (e) => saveField({ available_timings: e.target.value });
  row.querySelector(".f-service").onblur = (e) => saveField({ service_wanted: e.target.value });
  row.querySelector(".f-note").onblur = (e) => saveField({ note: e.target.value });
  row.querySelector(".f-meeting-link").onblur = (e) => saveField({ meeting_link: e.target.value });

  const convertedSel = row.querySelector(".f-converted");
  const totalInput = row.querySelector(".f-total");
  const commissionCell = row.querySelector(".f-commission");
  let isConverted = !!row.dataset.project;

  // Deal value stays editable even once converted, so a mistyped amount can
  // be fixed without touching the Converted dropdown (which would otherwise
  // delete-and-recreate the project via reopen/close).
  totalInput.onblur = async (e) => {
    if (e.target.value === "") return;
    const amount = parseAmount(e.target.value);
    e.target.value = fmtAmount(amount);
    if (!isConverted) return; // not converted yet — value is just waiting for "Yes"
    try {
      await api(`/api/core/converted/${row.dataset.project}`, { method: "PATCH", body: { total_amount: amount } });
      LeadFlow.toast("Deal value updated.");
    } catch (err) { LeadFlow.toast(err.message); }
  };

  // Update in place rather than re-rendering the whole table — a full
  // re-render resets table scroll to the top, which read as "jumps back to
  // the first row" on every conversion.
  convertedSel.onchange = async (e) => {
    if (e.target.value === "no") {
      if (!isConverted) return; // wasn't converted, nothing to undo
      try {
        await api(`/api/core/meetings/${leadId}/reopen`, { method: "POST" });
        isConverted = false;
        row.dataset.project = "";
        totalInput.value = "";
        commissionCell.textContent = "—";
        LeadFlow.toast("Reopened — enter the correct deal value and mark converted again.");
      } catch (err) {
        LeadFlow.toast(err.message);
        e.target.value = "yes";
      }
      return;
    }
    const totalAmount = parseAmount(totalInput.value);
    if (!totalAmount || totalAmount <= 0) {
      LeadFlow.toast("Enter the deal value first");
      e.target.value = "no";
      return;
    }
    try {
      const { commission, project_id } = await api(`/api/core/meetings/${leadId}/close`, { method: "POST", body: { total_amount: totalAmount } });
      LeadFlow.toast("Marked as converted.");
      totalInput.value = fmtAmount(totalAmount);
      isConverted = true;
      row.dataset.project = String(project_id);
      commissionCell.textContent = "₹" + fmtAmount(Math.round(commission || 0));
    } catch (err) {
      LeadFlow.toast(err.message);
      e.target.value = "no";
    }
  };
}

LeadFlow.views.collections = renderCollections;
LeadFlow.views.meetings = renderMeetings;
LeadFlow.views.converted = (mount) => renderConverted(mount);
