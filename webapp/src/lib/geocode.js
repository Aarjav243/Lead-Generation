// City/area name -> {lat, lon} strings, via OpenStreetMap Nominatim (free, no key).
// Used by leadgen-api.js to satisfy the scraper's required lat/lon job fields.
// Nominatim's usage policy requires an identifying User-Agent on every request.

export async function geocode(query) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`;
  const res = await fetch(url, { headers: { "user-agent": "LeadFlow/1.0 (internal lead-gen tool)" } });
  if (!res.ok) return null;
  const [hit] = await res.json();
  return hit ? { lat: hit.lat, lon: hit.lon } : null;
}
