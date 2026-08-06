// Generate Leads (core only): trigger a real Google Maps scrape, poll it to
// completion, and point the user at the resulting collection.
// Backend: src/leadgen-api.js — POST/GET /api/core/scrape[/:id].

(() => {
const { esc, api } = LeadFlow;

let pollTimer = null;
function stopPolling() {
  if (pollTimer) { clearTimeout(pollTimer); pollTimer = null; }
}

async function renderGenerate(mount) {
  stopPolling(); // leaving/re-entering this view kills any in-flight poll loop

  mount.innerHTML = `
    <h2>Generate Leads</h2>
    <p class="empty">Real Google Maps search — takes ~30-90s, avoid running many back-to-back to prevent temporary IP rate-limiting.</p>
    <form id="scrape-form">
      <label>Category <input name="category" required placeholder="e.g. restaurants"></label>
      <label>Area <input name="area" placeholder="e.g. Hadapsar (optional)"></label>
      <label>City <input name="city" required placeholder="e.g. Pune"></label>
      <label>Depth <input name="depth" type="number" min="1" step="1" placeholder="default 5"></label>
      <p class="empty">Depth = results per search, default 5 — higher takes longer.</p>
      <button type="submit">Search</button>
    </form>
    <div id="status"></div>
    <h3>Recent scrapes</h3>
    <div id="jobs"><p class="empty">Loading…</p></div>`;

  mount.querySelector("#scrape-form").onsubmit = (e) => { e.preventDefault(); submitScrape(mount, e.target); };
  loadJobs(mount);
}

async function submitScrape(mount, form) {
  stopPolling();
  const f = new FormData(form);
  const body = { category: f.get("category").trim(), city: f.get("city").trim(), area: f.get("area").trim() };
  if (f.get("depth")) body.depth = Number(f.get("depth"));

  const statusEl = mount.querySelector("#status");
  statusEl.innerHTML = `<p class="empty">Searching… this can take a minute or two.</p>`;
  try {
    const { id } = await api("/api/core/scrape", { method: "POST", body });
    poll(mount, id);
  } catch (err) {
    statusEl.innerHTML = `<p class="err">${esc(err.message)}</p>`;
  }
}

function poll(mount, id) {
  stopPolling();
  const tick = async () => {
    const statusEl = mount.querySelector("#status");
    if (!statusEl) { pollTimer = null; return; } // view was navigated away from — stop

    let job, imported;
    try { ({ job, imported } = await api(`/api/core/scrape/${id}`)); }
    catch (err) { statusEl.innerHTML = `<p class="err">${esc(err.message)}</p>`; return; }

    if (job.status === "working") { pollTimer = setTimeout(tick, 4000); return; }

    if (job.status === "failed") {
      statusEl.innerHTML = `<p class="err">${esc(job.error || "Scrape failed")}</p>`;
      loadJobs(mount);
      return;
    }

    statusEl.innerHTML = `<p>Imported ${imported ?? 0} leads — <button class="link" id="go-collections">see it in Collections</button></p>`;
    mount.querySelector("#go-collections").onclick = () => { location.hash = "#/collections"; };
    loadJobs(mount);
  };
  tick();
}

async function loadJobs(mount) {
  const el = mount.querySelector("#jobs");
  if (!el) return;
  let jobs;
  try { ({ jobs } = await api("/api/core/scrape")); }
  catch (err) { el.innerHTML = `<p class="err">${esc(err.message)}</p>`; return; }

  if (!jobs.length) { el.innerHTML = `<p class="empty">No scrapes yet.</p>`; return; }

  el.innerHTML = `<div class="table-wrap"><table>
    <thead><tr><th>Keyword</th><th>City</th><th>Status</th><th></th></tr></thead>
    <tbody>${jobs.map(jobRow).join("")}</tbody>
  </table></div>`;
}

function jobRow(j) {
  const statusText = j.status === "failed" && j.error ? `failed — ${esc(j.error)}` : esc(j.status);
  const action = j.status === "done" && j.collection_id
    ? `<button class="link" onclick="location.hash='#/collections'">view</button>` : "";
  return `<tr><td>${esc(j.keyword)}</td><td>${esc(j.city)}</td><td>${statusText}</td><td>${action}</td></tr>`;
}

LeadFlow.views.generate = renderGenerate;
})();
