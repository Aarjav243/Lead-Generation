// Shared by whatsapp-send.js (to build @c.us ids) and dashboard-server.js
// (to match raw lead phones against the normalized phones in the sent log).
function normalizePhone(raw) {
  const digits = (raw || "").replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("0")) return "91" + digits.slice(1);
  if (digits.length === 10) return "91" + digits;
  if (digits.length === 12 && digits.startsWith("91")) return digits;
  return null;
}

module.exports = { normalizePhone };
