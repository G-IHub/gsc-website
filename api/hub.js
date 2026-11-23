import { neon } from "@neondatabase/serverless";
import { handleHub } from "./_hub_core.js";
import { ensureSchema, makeStore } from "./_hub_store.js";

// The Research Hub endpoint (staff only), chosen with ?action=. All rules are in _hub_core.js.
// Vercel environment variables:
//   HUB_ENABLED=1                 switches the hub on (unset = every call answers 503)
//   SESSION_SECRET                already used by the admin page; the hub signs its own cookie with a different key derived from it
//   DATABASE_URL / POSTGRES_URL   the same Neon database
//   HUB_DIRECTORS_SEE_MONEY=1     optional: lets directors see the money of their own unit's projects (default: no)

let client;
let ready;

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (String(process.env.HUB_ENABLED ?? "") !== "1" || !process.env.SESSION_SECRET || !url) {
    return res.status(503).json({ error: "The hub is not switched on" });
  }
  try {
    client ??= neon(url);
    ready ??= ensureSchema(client).catch((e) => {
      ready = undefined;
      throw e;
    });
    await ready;
    const ip = String(req.headers["x-forwarded-for"] ?? "unknown").split(",")[0].trim();
    const r = await handleHub(
      { method: req.method, action: String(req.query?.action ?? ""), query: req.query ?? {}, body: req.body, headers: req.headers, ip },
      makeStore(client),
      process.env,
    );
    if (r.setCookie) res.setHeader("Set-Cookie", r.setCookie);
    return res.status(r.status).json(r.body);
  } catch (err) {
    console.error("Hub error:", err?.message);
    return res.status(500).json({ error: "Something went wrong" });
  }
}
