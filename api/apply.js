import nodemailer from "nodemailer";
import { dbConfigured, saveEnquiry } from "./_lib.js";

// Receives applications from the Young Researchers Launchpad landing page (youngresearchers.genomachub.com).
// That page lives on another site, so this endpoint answers cross-site requests from the origins below only.
// Applications are saved to the same enquiries table as the other forms, with source "young-researchers",
// so they appear in the admin page under their own filter. Needs DATABASE_URL (see api/_lib.js).
// Email alerts use the same settings as api/enquiry.js (RESEND_API_KEY + ALERT_FROM, or SMTP_USER + SMTP_PASS
// [+ SMTP_HOST]). Alerts go to APPLY_TO if set, else ENQUIRY_TO, else info@genomacsc.com (Resend) / SMTP_USER.
// A failed alert never fails the application: it is already saved.

const ALLOWED_ORIGINS = [
  "https://youngresearchers.genomachub.com",
  "https://genomac-young-researchers.vercel.app",
];

const SCHOOL_LEVELS = ["Secondary school", "Undergraduate", "Other"];
const MAX = { short: 200, long: 2000 };
const WINDOW_MS = 10 * 60 * 1000;
const LIMIT = 5;
const hits = new Map(); // per server instance only, so this is a basic brake rather than a guarantee

const clean = (v, max) => String(v ?? "").replace(/\r/g, "").trim().slice(0, max);
const oneLine = (v, max) => clean(v, max).replace(/\s+/g, " ");

const tooMany = (ip) => {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > LIMIT;
};

export default async function handler(req, res) {
  const origin = String(req.headers.origin ?? "");
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Access-Control-Max-Age", "86400");
  }
  res.setHeader("Vary", "Origin");
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
    return res.status(405).json({ error: "Method not allowed" });
  }
  if (!ALLOWED_ORIGINS.includes(origin)) return res.status(403).json({ error: "Not allowed" });
  if (!dbConfigured()) return res.status(503).json({ error: "Applications are not connected yet" });

  const body = typeof req.body === "string" ? safeParse(req.body) : req.body ?? {};

  // Hidden field that people never see; bots fill it in. Pretend success so they move on.
  if (clean(body.botcheck, 50)) return res.status(200).json({ ok: true });

  const ip = String(req.headers["x-forwarded-for"] ?? "unknown").split(",")[0].trim();
  if (tooMany(ip)) return res.status(429).json({ error: "Too many applications. Please try again later." });

  const f = {
    name: oneLine(body.parentName, MAX.short),
    email: oneLine(body.email, MAX.short),
    phone: oneLine(body.phone, MAX.short),
    country: oneLine(body.country, MAX.short),
    childName: oneLine(body.childName, MAX.short),
    schoolLevel: oneLine(body.schoolLevel, MAX.short),
    interests: clean(body.interests, MAX.long),
    callTime: oneLine(body.callTime, MAX.short),
    heardFrom: oneLine(body.heardFrom, MAX.short),
  };

  const missing = ["name", "email", "phone", "country", "childName", "schoolLevel"].filter((k) => !f[k]);
  if (
    missing.length ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email) ||
    !SCHOOL_LEVELS.includes(f.schoolLevel) ||
    body.consent !== true
  ) {
    return res.status(400).json({ error: "Please complete the required fields with a valid email." });
  }

  // Fill the shared columns the admin list shows (organization, title, service) with application details
  const record = {
    ...f,
    enquiryType: "Young Researchers Launchpad application",
    organization: `Child: ${f.childName} (${f.schoolLevel})`,
    title: `Young Researchers application: ${f.childName}`,
    service: "Young Researchers Launchpad",
    consent: `Parent or guardian agreed to be contacted (${new Date().toISOString()})`,
  };

  try {
    await saveEnquiry(record, "young-researchers");
  } catch (err) {
    console.error("Application save failed:", err?.message);
    return res.status(502).json({ error: "Your application could not be sent." });
  }

  let emailed = false;
  try {
    emailed = await sendAlert(f);
  } catch (err) {
    console.error("Application alert failed:", err?.message);
  }
  return res.status(200).json({ ok: true, emailed });
}

// Emails the team about a new application, if an email service is set up. Returns whether it sent.
async function sendAlert(f) {
  const { RESEND_API_KEY, ALERT_FROM, SMTP_USER, SMTP_PASS, SMTP_HOST = "smtp.zoho.com", APPLY_TO, ENQUIRY_TO } = process.env;
  if (!RESEND_API_KEY && !(SMTP_USER && SMTP_PASS)) return false;

  const subject = `New Young Researchers application: ${f.childName} (${f.schoolLevel})`.slice(0, 200);
  const replyTo = `"${f.name.replace(/"/g, "")}" <${f.email}>`;
  const text = [
    "A parent has applied for the Young Researchers Launchpad.",
    "",
    `Parent or guardian: ${f.name}`,
    `Email: ${f.email}`,
    `Phone / WhatsApp: ${f.phone}`,
    `Country: ${f.country}`,
    `Child's first name: ${f.childName}`,
    `School level: ${f.schoolLevel}`,
    `Best time for a call: ${f.callTime || "—"}`,
    `How they heard about us: ${f.heardFrom || "—"}`,
    "",
    "Child's interests:",
    f.interests || "—",
    "",
    "Reply to this email to answer the parent directly.",
    "Manage applications: https://www.genomacsc.com/admin (filter: Young Researchers)",
  ].join("\n");

  if (RESEND_API_KEY) {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: ALERT_FROM || "GSC Website <notifications@genomacsc.com>",
        to: [APPLY_TO || ENQUIRY_TO || "info@genomacsc.com"],
        reply_to: replyTo,
        subject,
        text,
      }),
    });
    if (!r.ok) throw new Error(`Resend ${r.status}: ${(await r.text()).slice(0, 200)}`);
    return true;
  }

  const transport = nodemailer.createTransport({
    host: SMTP_HOST,
    port: 465,
    secure: true,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  await transport.sendMail({
    from: `"GSC Website" <${SMTP_USER}>`,
    to: APPLY_TO || ENQUIRY_TO || SMTP_USER,
    replyTo,
    subject,
    text,
  });
  return true;
}

function safeParse(s) {
  try {
    return JSON.parse(s);
  } catch {
    return {};
  }
}
