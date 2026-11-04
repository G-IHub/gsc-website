import nodemailer from "nodemailer";
import { dbConfigured, saveEnquiry } from "./_lib.js";

// Receives enquiries from the Contact and Research-to-Publication Lab forms. Each one is saved to the database
// (read it in the admin page) and, if an email service is set up, also emailed to the GSC inbox.
// Either one is enough for the visitor to see "Thank you". Environment variables:
//   DATABASE_URL    Neon Postgres connection (see api/_lib.js)
// Email alert through Resend (recommended; the domain must be verified in Resend):
//   RESEND_API_KEY  an API key with sending access
//   ALERT_FROM      optional, defaults to "GSC Website <notifications@genomacsc.com>"
//   ENQUIRY_TO      optional, where alerts are delivered; defaults to info@genomacsc.com
// Or, instead, an email alert over SMTP:
//   SMTP_USER  the Zoho mailbox that sends and receives, e.g. info@genomacsc.com
//   SMTP_PASS  a Zoho app-specific password for that mailbox
//   SMTP_HOST  optional, defaults to smtp.zoho.com (use smtp.zoho.eu / smtp.zoho.in for those data centres)
//   ENQUIRY_TO optional, where enquiries are delivered; defaults to SMTP_USER

const MAX = { short: 200, long: 5000 };
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
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { RESEND_API_KEY, ALERT_FROM, SMTP_USER, SMTP_PASS, SMTP_HOST = "smtp.zoho.com", ENQUIRY_TO } = process.env;
  const canEmail = Boolean(RESEND_API_KEY || (SMTP_USER && SMTP_PASS));
  if (!canEmail && !dbConfigured()) {
    // Nothing is configured yet: the page falls back to opening the visitor's email app
    return res.status(503).json({ error: "Enquiries are not connected yet" });
  }

  const body = typeof req.body === "string" ? safeParse(req.body) : req.body ?? {};

  // Hidden field that people never see; bots fill it in. Pretend success so they move on.
  if (clean(body.botcheck, 50)) return res.status(200).json({ ok: true });

  const ip = String(req.headers["x-forwarded-for"] ?? "unknown").split(",")[0].trim();
  if (tooMany(ip)) return res.status(429).json({ error: "Too many enquiries. Please try again later." });

  const f = {
    enquiryType: oneLine(body.enquiryType, MAX.short),
    name: oneLine(body.name, MAX.short),
    organization: oneLine(body.organization, MAX.short),
    email: oneLine(body.email, MAX.short),
    country: oneLine(body.country, MAX.short),
    title: oneLine(body.title, MAX.short),
    service: oneLine(body.service, MAX.short),
    engagement: oneLine(body.engagement, MAX.short),
    timeline: oneLine(body.timeline, MAX.short),
    budget: oneLine(body.budget, MAX.short),
    description: clean(body.description, MAX.long),
    deliverables: clean(body.deliverables, MAX.long),
    additional: clean(body.additional, MAX.long),
  };

  const missing = ["name", "organization", "email", "country", "title", "service", "description"].filter((k) => !f[k]);
  if (missing.length || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) {
    return res.status(400).json({ error: "Please complete the required fields with a valid email." });
  }

  const text = [
    `Enquiry type: ${f.enquiryType}`,
    `Name: ${f.name}`,
    `Organization: ${f.organization}`,
    `Work email: ${f.email}`,
    `Country: ${f.country}`,
    `Project title: ${f.title}`,
    `Service required: ${f.service}`,
    `Engagement model: ${f.engagement || "—"}`,
    `Preferred timeline: ${f.timeline || "—"}`,
    `Estimated budget: ${f.budget || "—"}`,
    "",
    "Project description:",
    f.description,
    "",
    "Expected deliverables:",
    f.deliverables || "—",
    "",
    "Additional information:",
    f.additional || "—",
    "",
    "Manage this enquiry: https://www.genomacsc.com/admin",
  ].join("\n");

  let saved = false;
  let emailed = false;

  if (dbConfigured()) {
    try {
      await saveEnquiry(f);
      saved = true;
    } catch (err) {
      console.error("Enquiry save failed:", err?.message);
    }
  }

  if (canEmail) {
    const subject = `Website enquiry: ${f.enquiryType}: ${f.title}`.slice(0, 200);
    const replyTo = `"${f.name.replace(/"/g, "")}" <${f.email}>`;
    try {
      if (RESEND_API_KEY) {
        await sendWithResend({
          key: RESEND_API_KEY,
          from: ALERT_FROM || "GSC Website <notifications@genomacsc.com>",
          to: ENQUIRY_TO || "info@genomacsc.com",
          replyTo,
          subject,
          text,
        });
      } else {
        const transport = nodemailer.createTransport({
          host: SMTP_HOST,
          port: 465,
          secure: true,
          auth: { user: SMTP_USER, pass: SMTP_PASS },
        });
        await transport.sendMail({
          from: `"GSC Website" <${SMTP_USER}>`,
          to: ENQUIRY_TO || SMTP_USER,
          replyTo,
          subject,
          text,
        });
      }
      emailed = true;
    } catch (err) {
      console.error("Enquiry email failed:", err?.message);
    }
  }

  // Saved or emailed is a success for the visitor; only if both failed do they get the fallback
  if (!saved && !emailed) return res.status(502).json({ error: "Your enquiry could not be sent." });
  return res.status(200).json({ ok: true, saved, emailed });
}

// Resend's HTTP API; no extra library needed
async function sendWithResend({ key, from, to, replyTo, subject, text }) {
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [to], reply_to: replyTo, subject, text }),
  });
  if (!r.ok) throw new Error(`Resend ${r.status}: ${(await r.text()).slice(0, 200)}`);
}

function safeParse(s) {
  try {
    return JSON.parse(s);
  } catch {
    return {};
  }
}
