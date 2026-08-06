// LeadFlow Worker. Everything under /api/ is handled here; everything else is
// a static file from ./public.
//
// Route table convention (the two UI feature modules extend it):
//   "METHOD /api/path/:param" -> handler({ request, env, body, params, user })
//   A handler returns a plain object (auto-JSON) or a Response.
//   Paths starting /api/core/ are CORE-TEAM ONLY. That prefix IS the permission.
//   PUBLIC below is the only set of routes reachable without logging in.

import { login, logout, seed, currentUser } from "./auth.js";
import { routes as screenRoutes } from "./screens-api.js";
import { routes as dashboardRoutes } from "./dashboard-api.js";
import { routes as leadgenRoutes } from "./leadgen-api.js";

const routes = {
  "POST /api/login": login,
  "POST /api/logout": logout,
  "POST /api/seed": seed,
  "GET /api/session": ({ user }) => ({ user }),
  ...screenRoutes,
  ...dashboardRoutes,
  ...leadgenRoutes,
};

const PUBLIC = new Set(["POST /api/login", "POST /api/seed", "GET /api/session"]);

// "/api/collections/:id/leads" vs "/api/collections/7/leads" -> { id: "7" }
export function matchPath(pattern, path) {
  const p = pattern.split("/"), s = path.split("/");
  if (p.length !== s.length) return null;
  const params = {};
  for (let i = 0; i < p.length; i++) {
    if (p[i].startsWith(":")) params[p[i].slice(1)] = decodeURIComponent(s[i]);
    else if (p[i] !== s[i]) return null;
  }
  return params;
}

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith("/api/")) return env.ASSETS.fetch(request);

    for (const [route, handler] of Object.entries(routes)) {
      const [method, pattern] = route.split(" ");
      if (method !== request.method) continue;
      const params = matchPath(pattern, url.pathname);
      if (!params) continue;

      const user = await currentUser(request, env);
      if (!PUBLIC.has(route) && !user) return json({ error: "Not logged in" }, 401);
      if (url.pathname.startsWith("/api/core/") && user?.role !== "core") {
        return json({ error: "Core team only" }, 403);
      }

      const body = request.method === "GET" ? null : await request.json().catch(() => ({}));
      try {
        const out = await handler({ request, env, body, params, user, url });
        return out instanceof Response ? out : json(out ?? { ok: true });
      } catch (err) {
        return json({ error: err.message }, err.status || 500);
      }
    }
    return json({ error: "No such endpoint" }, 404);
  },
};
