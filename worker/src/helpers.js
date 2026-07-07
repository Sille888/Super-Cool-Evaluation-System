// Hilfsfunktionen für den Worker

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Admin-Password",
};

export function corsHeaders() {
  return { ...CORS };
}

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

export function err(message, status = 400) {
  return json({ error: message }, status);
}

const ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";
export function genId(len = 10) {
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  let out = "";
  for (let i = 0; i < len; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

export async function sha256(text) {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

const DEFAULT_PASSWORD = "admin123";

// Liefert den gespeicherten Passwort-Hash; legt Standardpasswort an, falls keiner existiert.
export async function getAdminHash(env) {
  const row = await env.DB.prepare(
    "SELECT value FROM settings WHERE key = 'admin_password'"
  ).first();
  if (row && row.value) return row.value;
  const hash = await sha256(DEFAULT_PASSWORD);
  await env.DB.prepare(
    "INSERT OR REPLACE INTO settings (key, value) VALUES ('admin_password', ?)"
  )
    .bind(hash)
    .run();
  return hash;
}

// Prüft das Admin-Passwort aus dem Header. Gibt true/false zurück.
export async function checkAdmin(request, env) {
  const provided = request.headers.get("X-Admin-Password");
  if (!provided) return false;
  const stored = await getAdminHash(env);
  const providedHash = await sha256(provided);
  return providedHash === stored;
}

export function timestamp() {
  return Date.now();
}
