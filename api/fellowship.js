import nodemailer from "nodemailer";
import { dbConfigured, saveEnquiry } from "./_lib.js";

// Receives applications from the Genomac On-Campus Research Fellowship page (fellows.genomachub.com).
// That page lives on another site, so this endpoint answers cross-site requests from the origins below only.
// Applications are saved to the same enquiries table as the other forms, with source "fellowship",
// so they appear in the admin page under their own filter. Needs DATABASE_URL (see api/_lib.js).
// Email alerts use the same settings as api/apply.js (RESEND_API_KEY + ALERT_FROM, or SMTP_USER + SMTP_PASS
// [+ SMTP_HOST]). Alerts go to APPLY_TO if set, else ENQUIRY_TO, else info@genomacsc.com (Resend) / SMTP_USER.
// A failed alert never fails the application: it is already saved.

const ALLOWED_ORIGINS = [
  "https://fellows.genomachub.com",
  "https://genomac-fellowship.vercel.app",
];

const LEVELS = ["100 Level", "200 Level", "300 Level", "400 Level", "500 Level", "Postgraduate"];
// The fellowship's four research tracks (12-week curriculum)
const AREAS = [
  "Clinical & Diagnostic Genomics",
  "Molecular & Pharmaceutical Sciences",
  "Systems, Omics & Human Biology",
  "Population & Life Sciences",
];
const MAX = { short: 200, long: 3000 };
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
    name: oneLine(body.fullName, MAX.short),
    email: oneLine(body.email, MAX.short),
    phone: oneLine(body.phone, MAX.short),
    university: oneLine(body.university, MAX.short),
    department: oneLine(body.department, MAX.short),
    level: oneLine(body.level, MAX.short),
    researchArea: oneLine(body.researchArea, MAX.short),
    priorResearch: oneLine(body.priorResearch, MAX.short),
    motivation: clean(body.motivation, MAX.long),
    goals: clean(body.goals, MAX.long),
    cvLink: oneLine(body.cvLink, MAX.short),
    linkedin: oneLine(body.linkedin, MAX.short),
  };

  const missing = ["name", "email", "phone", "university", "department", "motivation", "goals"].filter((k) => !f[k]);
  if (
    missing.length ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email) ||
    !LEVELS.includes(f.level) ||
    !AREAS.includes(f.researchArea) ||
    !["Yes", "No"].includes(f.priorResearch)
  ) {
    return res.status(400).json({ error: "Please complete the required fields with a valid email." });
  }

  // Fill the shared columns the admin list shows (organization, title, service) with application details
  const record = {
    ...f,
    country: "",
    enquiryType: "Genomac Fellowship application",
    organization: `${f.university} · ${f.department} (${f.level})`,
    title: `Fellowship application: ${f.name}`,
    service: f.researchArea,
  };

  try {
    await saveEnquiry(record, "fellowship");
  } catch (err) {
    console.error("Fellowship application save failed:", err?.message);
    return res.status(502).json({ error: "Your application could not be sent." });
  }

  let emailed = false;
  try {
    emailed = await sendAlert(f);
  } catch (err) {
    console.error("Fellowship application alert failed:", err?.message);
  }
  return res.status(200).json({ ok: true, emailed });
}

// Emails the team about a new application, if an email service is set up. Returns whether it sent.
async function sendAlert(f) {
  const { RESEND_API_KEY, ALERT_FROM, SMTP_USER, SMTP_PASS, SMTP_HOST = "smtp.zoho.com", APPLY_TO, ENQUIRY_TO } = process.env;
  if (!RESEND_API_KEY && !(SMTP_USER && SMTP_PASS)) return false;

  const subject = `New Fellowship application: ${f.name} (${f.researchArea})`.slice(0, 200);
  const replyTo = `"${f.name.replace(/"/g, "")}" <${f.email}>`;
  const text = [
    "A student has applied for the Genomac On-Campus Research Fellowship.",
    "",
    `Name: ${f.name}`,
    `Email: ${f.email}`,
    `Phone / WhatsApp: ${f.phone}`,
    `University: ${f.university}`,
    `Faculty and department: ${f.department}`,
    `Level of study: ${f.level}`,
    `Research area: ${f.researchArea}`,
    `Previous research: ${f.priorResearch}`,
    `CV link: ${f.cvLink || "—"}`,
    `LinkedIn: ${f.linkedin || "—"}`,
    "",
    "Why they want to become a Genomac Fellow:",
    f.motivation,
    "",
    "What they hope to achieve:",
    f.goals,
    "",
    "Reply to this email to answer the applicant directly.",
    "Manage applications: https://www.genomacsc.com/admin (filter: Fellowship)",
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
