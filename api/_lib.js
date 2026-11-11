import crypto from "node:crypto";
import { neon } from "@neondatabase/serverless";

// Shared helpers for the enquiry and admin functions. The leading underscore keeps Vercel from
// publishing this file as its own endpoint.
//
// Vercel environment variables:
//   DATABASE_URL    added automatically when a Neon Postgres database is connected to the project
//   ADMIN_PASSWORD  the password for the admin page
//   SESSION_SECRET  a long random string used to sign login cookies

const dbUrl = () => process.env.DATABASE_URL || process.env.POSTGRES_URL;

export const dbConfigured = () => Boolean(dbUrl());
export const adminConfigured = () =>
  Boolean(dbUrl() && process.env.ADMIN_PASSWORD && process.env.SESSION_SECRET);

let client;
let ready;

// Returns the query function once the tables exist. Safe to call on every request.
export const db = async () => {
  client ??= neon(dbUrl());
  ready ??= (async () => {
    await client.query(`
      CREATE TABLE IF NOT EXISTS enquiries (
        id BIGSERIAL PRIMARY KEY,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        source TEXT NOT NULL,
        enquiry_type TEXT NOT NULL DEFAULT '',
        name TEXT NOT NULL DEFAULT '',
        organization TEXT NOT NULL DEFAULT '',
        email TEXT NOT NULL DEFAULT '',
        country TEXT NOT NULL DEFAULT '',
        title TEXT NOT NULL DEFAULT '',
        service TEXT NOT NULL DEFAULT '',
        data JSONB NOT NULL,
        status TEXT NOT NULL DEFAULT 'New',
        notes TEXT NOT NULL DEFAULT ''
      )`);
    await client.query(`
      CREATE TABLE IF NOT EXISTS admin_login_failures (
        id BIGSERIAL PRIMARY KEY,
        ip TEXT NOT NULL,
        at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`);
    // Billing: one settings row, the services catalogue and the invoices
    await client.query(`CREATE TABLE IF NOT EXISTS billing_settings (id INT PRIMARY KEY, data JSONB NOT NULL)`);
    await client.query(`
      CREATE TABLE IF NOT EXISTS services (
        id BIGSERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        category TEXT NOT NULL DEFAULT '',
        unit TEXT NOT NULL DEFAULT 'unit',
        pricing TEXT NOT NULL DEFAULT 'unit',
        unit_price NUMERIC(14,2) NOT NULL DEFAULT 0,
        extra_per_sample NUMERIC(14,2),
        tiers JSONB NOT NULL DEFAULT '[]',
        active BOOLEAN NOT NULL DEFAULT true,
        sort INT NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`);
    await client.query(`
      CREATE TABLE IF NOT EXISTS invoices (
        id BIGSERIAL PRIMARY KEY,
        number TEXT NOT NULL UNIQUE,
        doc_type TEXT NOT NULL DEFAULT 'invoice',
        status TEXT NOT NULL DEFAULT 'Draft',
        issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
        due_date DATE,
        client JSONB NOT NULL DEFAULT '{}',
        reference TEXT NOT NULL DEFAULT '',
        items JSONB NOT NULL DEFAULT '[]',
        discount JSONB,
        tax_rate NUMERIC(6,3) NOT NULL DEFAULT 0,
        notes TEXT NOT NULL DEFAULT '',
        terms TEXT NOT NULL DEFAULT '',
        subtotal NUMERIC(16,2) NOT NULL DEFAULT 0,
        total NUMERIC(16,2) NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`);
  })().catch((err) => {
    ready = undefined; // try again on the next request
    throw err;
  });
  await ready;
  return client;
};

// Pass `forcedSource` for forms with their own endpoint (e.g. "young-researchers" from api/apply.js)
export const saveEnquiry = async (f, forcedSource) => {
  const sql = await db();
  // "research-clinic" is the older name for the Research-to-Publication Lab forms; "clinic" is the free Research Clinic
  const source = forcedSource
    ? forcedSource
    : /research-to-publication/i.test(f.enquiryType)
      ? "research-clinic"
      : /research clinic/i.test(f.enquiryType)
        ? "clinic"
        : "contact";
  await sql.query(
    `INSERT INTO enquiries (source, enquiry_type, name, organization, email, country, title, service, data)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)`,
    [source, f.enquiryType, f.name, f.organization, f.email, f.country, f.title, f.service, JSON.stringify(f)],
  );
};

// ---- Login sessions: a signed, expiring token in an HttpOnly cookie ----

const COOKIE = "gsc_admin";
const SESSION_HOURS = 12;

const sign = (payload) =>
  crypto.createHmac("sha256", process.env.SESSION_SECRET).update(payload).digest("base64url");

export const sessionCookie = () => {
  const payload = Buffer.from(JSON.stringify({ exp: Date.now() + SESSION_HOURS * 3600 * 1000 })).toString("base64url");
  return `${COOKIE}=${payload}.${sign(payload)}; HttpOnly; Secure; SameSite=Strict; Path=/api; Max-Age=${SESSION_HOURS * 3600}`;
};

export const clearCookie = () => `${COOKIE}=; HttpOnly; Secure; SameSite=Strict; Path=/api; Max-Age=0`;

export const hasSession = (cookieHeader = "") => {
  const raw = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${COOKIE}=`));
  if (!raw) return false;
  const [payload, sig] = raw.slice(COOKIE.length + 1).split(".");
  if (!payload || !sig) return false;
  const expected = Buffer.from(sign(payload));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) return false;
  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString()).exp > Date.now();
  } catch {
    return false;
  }
};

const digest = (s) => crypto.createHash("sha256").update(String(s)).digest();

// Compares hashes so the check takes the same time whatever is typed
export const passwordOk = (given) => crypto.timingSafeEqual(digest(given), digest(process.env.ADMIN_PASSWORD));
