import nodemailer from "nodemailer";

// Short email alerts for the client portal: "something is waiting for you" — never the content itself
// (no message text, no document text, no amounts), only the project code and a link to sign in.
//
// Sends through the same email service as the website's enquiry form:
//   RESEND_API_KEY (+ optional ALERT_FROM)   or   SMTP_USER + SMTP_PASS (+ optional SMTP_HOST)
// With neither set, nothing is sent (and nothing fails). Kill switch: CLIENT_EMAILS=0.
// Message alerts are limited to one per person per project every 30 minutes, so a chat does not flood the inbox.
// A failed email never breaks the action that triggered it.

const SITE = "https://www.genomacsc.com";
const MESSAGE_GAP_MIN = 30;

export const emailConfigured = (env) => Boolean(env.RESEND_API_KEY || (env.SMTP_USER && env.SMTP_PASS));

const deliver = async (env, { to, subject, text }) => {
  if (env.__sendMail) return env.__sendMail({ to, subject, text }); // tests
  if (env.RESEND_API_KEY) {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: env.ALERT_FROM || "Genomac Services & Consult <notifications@genomacsc.com>", to: [to], subject, text }),
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) throw new Error(`Resend ${r.status}`);
    return;
  }
  const t = nodemailer.createTransport({ host: env.SMTP_HOST || "smtp.zoho.com", port: 465, secure: true, auth: { user: env.SMTP_USER, pass: env.SMTP_PASS } });
  await t.sendMail({ from: `"Genomac Services & Consult" <${env.SMTP_USER}>`, to, subject, text });
};

// What each alert says. kind -> (project) -> { subject, line }
const KINDS = {
  // to the client
  team_message: (p) => ["New message from your Genomac team", `Your Genomac team sent you a message about project ${p.ref}.`],
  doc_sent: (p) => ["A document is ready for you to read and sign", `A document for project ${p.ref} is ready for you to read and sign.`],
  doc_complete: (p) => ["Your document is fully signed", `A document for project ${p.ref} is now signed by both sides. You can download the signed PDF.`],
  signoff_ready: (p) => ["A project step is ready for your sign-off", `A step of project ${p.ref} is complete and waiting for your sign-off.`],
  files_released: (p) => ["Your final files are ready", `The final files for project ${p.ref} have been released to you.`],
  // to the team
  client_message: (p) => [`Client message on ${p.ref}`, `The client sent a message on project ${p.ref}.`],
  client_signed: (p) => [`Client signed a document on ${p.ref}`, `The client signed a document on project ${p.ref}.`],
  countersign_needed: (p) => [`Countersignature needed on ${p.ref}`, `The client signed a document on project ${p.ref} that needs Genomac's countersignature.`],
  client_comment: (p) => [`Client comment on a document, ${p.ref}`, `The client commented on a document on project ${p.ref}.`],
  client_signoff: (p) => [`Client signed off a step on ${p.ref}`, `The client signed off a step of project ${p.ref}.`],
  intake_sent: (p) => [`Intake form received for ${p.ref}`, `The client sent the research intake form for project ${p.ref}.`],
};
const TEAM = new Set(["client_message", "client_signed", "countersign_needed", "client_comment", "client_signoff", "intake_sent"]);

// Returns notify(kind, project, recipients[]) — recipients are { email, name }
export function makeNotifier(store, env = {}) {
  return async (kind, project, recipients) => {
    try {
      if (String(env.CLIENT_EMAILS ?? "") === "0" || (!emailConfigured(env) && !env.__sendMail)) return 0;
      const make = KINDS[kind];
      if (!make || !project) return 0;
      const [subject, line] = make(project);
      const link = TEAM.has(kind) ? `${SITE}/hub` : `${SITE}/client`;
      let sent = 0;
      const seen = new Set();
      for (const r of recipients || []) {
        const to = String(r?.email || "").toLowerCase();
        if (!to || seen.has(to)) continue;
        seen.add(to);
        if (kind === "team_message" || kind === "client_message") {
          const key = `notify:${kind}:${project.id}:${to}`;
          const last = await store.getMeta(key);
          if (last && Date.now() - Number(last) < MESSAGE_GAP_MIN * 60 * 1000) continue;
          await store.setMeta(key, String(Date.now()));
        }
        const text = [`Hello ${r.name || ""}`.trim() + ",", "", line, "", `Sign in to see it: ${link}`, "", "Genomac Services & Consult", "(This is an automatic alert; it never contains the content itself.)"].join("\n");
        try {
          await deliver(env, { to, subject: `${subject} (${project.ref})`, text });
          sent += 1;
        } catch (err) {
          console.error("Client alert email failed:", err?.message);
        }
      }
      return sent;
    } catch (err) {
      console.error("Client alert failed:", err?.message);
      return 0;
    }
  };
}

// Who to tell on the team: the project's lead(s); for a countersignature, management
export async function teamRecipients(store, projectId, { management = false } = {}) {
  if (management) return (await store.listUsers()).filter((u) => u.active && u.role === "management").map((u) => ({ email: u.email, name: u.name }));
  const leads = (await store.listMembers(projectId)).filter((m) => String(m.project_role).toLowerCase() === "lead");
  const out = [];
  for (const m of leads) {
    const u = await store.getUserById(m.user_id);
    if (u?.active) out.push({ email: u.email, name: u.name });
  }
  return out;
}
export const clientRecipients = async (store, projectId) => (await store.listProjectClients(projectId)).filter((c) => c.active).map((c) => ({ email: c.email, name: c.name }));
