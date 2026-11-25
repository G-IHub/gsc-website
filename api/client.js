import { neon } from "@neondatabase/serverless";
import { handleClient } from "./_client_core.js";
import { ensureSchema, makeStore } from "./_hub_store.js";

// The Genomac SC client portal endpoint, chosen with ?action=. All rules are in _client_core.js.
// Vercel environment variables: CLIENT_PORTAL_ENABLED=1 (and HUB_ENABLED=1), SESSION_SECRET, DATABASE_URL.

let client;
let ready;

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (String(process.env.CLIENT_PORTAL_ENABLED ?? "") !== "1" || String(process.env.HUB_ENABLED ?? "") !== "1" || !process.env.SESSION_SECRET || !url) {
    return res.status(503).json({ error: "The client portal is not switched on" });
  }
  try {
    client ??= neon(url);
    ready ??= ensureSchema(client).catch((e) => {
      ready = undefined;
      throw e;
    });
    await ready;
    const ip = String(req.headers["x-forwarded-for"] ?? "unknown").split(",")[0].trim();
    const r = await handleClient(
      { method: req.method, action: String(req.query?.action ?? ""), query: req.query ?? {}, body: req.body, headers: req.headers, ip },
      makeStore(client),
      process.env,
    );
    if (r.setCookie) res.setHeader("Set-Cookie", r.setCookie);
    return res.status(r.status).json(r.body);
  } catch (err) {
    console.error("Client portal error:", err?.message);
    return res.status(500).json({ error: "Something went wrong" });
  }
}
