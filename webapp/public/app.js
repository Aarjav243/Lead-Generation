// Shell: login, nav, hash routing. The screens and dashboard register their own
// views into LeadFlow.views — this file never needs to know what they render.
window.LeadFlow = (() => {
  const views = {};                       // name -> render(mountEl, user)
  const TABS = [
    { name: "collections", label: "Collections", core: false },
    { name: "generate", label: "Generate Leads", core: true },
    { name: "converted", label: "Converted Leads", core: true },
    { name: "dashboard", label: "Dashboard", core: true },
  ];

  let user = null;
  const view = () => document.getElementById("view");
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (m) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));

  async function api(path, options = {}) {
    const res = await fetch(path, {
      ...options,
      headers: options.body ? { "content-type": "application/json" } : undefined,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  }

  function renderLogin(message = "") {
    document.getElementById("topbar").hidden = true;
    view().innerHTML = `
      <form id="login" class="login">
        <h1>LeadFlow</h1>
        ${message ? `<p class="err">${esc(message)}</p>` : ""}
        <label>Username <input name="username" autocomplete="username" required autofocus></label>
        <label>Password <input name="password" type="password" autocomplete="current-password" required></label>
        <button type="submit">Log in</button>
      </form>`;
    document.getElementById("login").onsubmit = async (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      try {
        await api("/api/login", { method: "POST", body: { username: f.get("username"), password: f.get("password") } });
        boot();
      } catch (err) { renderLogin(err.message); }
    };
  }

  function renderShell() {
    document.getElementById("topbar").hidden = false;
    document.getElementById("whoami").textContent = `${user.display_name} (${user.role})`;
    document.getElementById("nav").innerHTML = TABS
      .filter((t) => !t.core || user.role === "core")
      .map((t) => `<a href="#/${t.name}" data-tab="${t.name}">${t.label}</a>`).join("");
    document.getElementById("logout").onclick = async () => { await api("/api/logout", { method: "POST" }); boot(); };
    window.onhashchange = route;
    route();
  }

  function route() {
    const name = location.hash.replace("#/", "") || "collections";
    const tab = TABS.find((t) => t.name === name);
    // Outreach people can't reach a core tab by typing the hash.
    if (!tab || (tab.core && user.role !== "core")) { location.hash = "#/collections"; return; }
    for (const a of document.querySelectorAll("#nav a")) a.classList.toggle("on", a.dataset.tab === name);
    view().innerHTML = "";
    if (views[name]) views[name](view(), user);
    else view().innerHTML = `<p class="empty">“${esc(tab.label)}” isn’t built yet.</p>`;
  }

  async function boot() {
    try { ({ user } = await api("/api/session")); } catch { user = null; }
    user ? renderShell() : renderLogin();
  }

  return { boot, api, esc, views };
})();
