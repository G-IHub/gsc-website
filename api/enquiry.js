import nodemailer from "nodemailer";

// Receives the Contact page enquiry and emails it to the GSC inbox over Zoho SMTP.
// Needs these Vercel environment variables (see the setup notes in the project README / chat):
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

  const { SMTP_USER, SMTP_PASS, SMTP_HOST = "smtp.zoho.com", ENQUIRY_TO } = process.env;
  if (!SMTP_USER || !SMTP_PASS) {
    // Not configured yet: the page falls back to opening the visitor's email app
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
  ].join("\n");

  try {
    const transport = nodemailer.createTransport({
      host: SMTP_HOST,
      port: 465,
      secure: true,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
    await transport.sendMail({
      from: `"GSC Website" <${SMTP_USER}>`,
      to: ENQUIRY_TO || SMTP_USER,
      replyTo: `"${f.name.replace(/"/g, "")}" <${f.email}>`,
      subject: `Website enquiry: ${f.enquiryType}: ${f.title}`.slice(0, 200),
      text,
    });
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("Enquiry email failed:", err?.message);
    return res.status(502).json({ error: "Your enquiry could not be sent." });
  }
}

function safeParse(s) {
  try {
    return JSON.parse(s);
  } catch {
    return {};
  }
}
