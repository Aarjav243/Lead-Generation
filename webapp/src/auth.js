// Passwords + sessions.
// PBKDF2-SHA256 via WebCrypto, not scrypt: the Workers runtime doesn't implement
// node:crypto's scrypt, and PBKDF2 is native here with no compat flag.

const ITERATIONS = 100_000;
const SESSION_MS = 30 * 24 * 60 * 60 * 1000;

const hex = (bytes) => [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
const unhex = (s) => new Uint8Array(s.match(/../g).map((h) => parseInt(h, 16)));

// Stored form: "<salt hex>:<derived key hex>". Salt is per-user.
export async function hashPassword(password, saltHex) {
  const salt = saltHex ? unhex(saltHex) : crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: ITERATIONS }, key, 256);
  return `${hex(salt)}:${hex(new Uint8Array(bits))}`;
}

// Constant-time: never let response timing leak how much of the hash matched.
function equal(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function verifyPassword(password, stored) {
  const [saltHex] = stored.split(":");
  if (!saltHex) return false;
  return equal(await hashPassword(password, saltHex), stored);
}

export function cookie(request, value, maxAge) {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `sid=${value}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

// Returns the logged-in user, or null. Expired sessions are deleted on sight.
export async function currentUser(request, env) {
  const sid = (request.headers.get("cookie") || "").match(/(?:^|;\s*)sid=([^;]+)/)?.[1];
  if (!sid) return null;
  const row = await env.DB.prepare(
    `SELECT s.expires_at, u.id, u.username, u.role, u.display_name
       FROM sessions s JOIN users u ON u.id = s.user_id
      WHERE s.id = ? AND u.active = 1`
  ).bind(sid).first();
  if (!row) return null;
  if (row.expires_at < Date.now()) {
    await env.DB.prepare("DELETE FROM sessions WHERE id = ?").bind(sid).run();
    return null;
  }
  return { id: row.id, username: row.username, role: row.role, display_name: row.display_name };
}

export async function login({ request, env, body }) {
  const { username, password } = body || {};
  const user = await env.DB.prepare(
    "SELECT id, password_hash FROM users WHERE username = ? AND active = 1"
  ).bind(String(username || "")).first();

  // Same message either way — don't reveal which usernames exist.
  if (!user || !(await verifyPassword(String(password || ""), user.password_hash))) {
    return new Response(JSON.stringify({ error: "Wrong username or password" }), {
      status: 401, headers: { "content-type": "application/json" },
    });
  }

  const sid = crypto.randomUUID();
  await env.DB.prepare("INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)")
    .bind(sid, user.id, Date.now() + SESSION_MS).run();

  return new Response(JSON.stringify({ ok: true }), {
    headers: { "content-type": "application/json", "set-cookie": cookie(request, sid, SESSION_MS / 1000) },
  });
}

export async function logout({ request, env }) {
  const sid = (request.headers.get("cookie") || "").match(/(?:^|;\s*)sid=([^;]+)/)?.[1];
  if (sid) await env.DB.prepare("DELETE FROM sessions WHERE id = ?").bind(sid).run();
  return new Response(JSON.stringify({ ok: true }), {
    headers: { "content-type": "application/json", "set-cookie": cookie(request, "", 0) },
  });
}

// One-shot: creates the 6 core + 10 outreach placeholder accounts and returns
// their generated passwords ONCE. Refuses if any user already exists, so it
// can't be used to mint accounts or reset the team later.
export async function seed({ env }) {
  const { c } = await env.DB.prepare("SELECT COUNT(*) AS c FROM users").first();
  if (c > 0) {
    const e = new Error("Already seeded — delete the users table to re-seed");
    e.status = 409;
    throw e;
  }

  const people = [
    ...Array.from({ length: 6 }, (_, i) => ({ username: `core${i + 1}`, role: "core", display_name: `Core ${i + 1}` })),
    ...Array.from({ length: 10 }, (_, i) => ({ username: `outreach${i + 1}`, role: "outreach", display_name: `Outreach ${i + 1}` })),
  ];

  const created = [];
  for (const p of people) {
    const password = crypto.randomUUID().slice(0, 8);
    await env.DB.prepare(
      "INSERT INTO users (username, password_hash, role, display_name) VALUES (?, ?, ?, ?)"
    ).bind(p.username, await hashPassword(password), p.role, p.display_name).run();
    created.push({ ...p, password });
  }
  return { note: "Save these — they are not shown again.", users: created };
}
