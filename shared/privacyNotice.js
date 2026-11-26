// The client portal's privacy notice (NDPA 2023), from "Client Portal Privacy Notice (DRAFT).docx", brought up to
// date for documents and signing, final files, payments and email alerts.
//
// APPROVED = false: the notice is a DRAFT (words in [brackets] still to fill, lawyer review pending). While false,
// the portal shows no link to it and /client/privacy says it is being finalised; management can preview the draft
// at /client/privacy?draft=1. When the lawyer has approved it: fill the brackets, set the date and APPROVED = true.
export const PRIVACY_APPROVED = false;
export const PRIVACY_VERSION = "0.2";
export const PRIVACY_DATE = "[date of approval]";

// Each section: heading, then blocks: { p }, { list: [] }, { table: [[header…], [row…]…] }
export const PRIVACY_SECTIONS = [
  {
    h: "",
    blocks: [
      { p: "This notice explains, in plain language, what personal information we collect when you use our client portal (genomacsc.com/client), why we collect it, who can see it, how long we keep it, and the rights you have. It is written to meet the Nigeria Data Protection Act 2023 (NDPA). It covers the portal only; the agreement for your research project and its confidentiality terms still apply as written there." },
    ],
  },
  {
    h: "1. Who we are",
    blocks: [
      { p: "Genomac Services & Consult, part of Genomac Holdings, is responsible for your information (the \"data controller\")." },
      { list: ["Address: [registered business address]", "Privacy contact: [name or role, e.g. Data Protection Officer], [email address, e.g. privacy@genomacsc.com]", "You can write to this contact about anything in this notice."] },
    ],
  },
  {
    h: "2. What we collect",
    blocks: [
      {
        table: [
          ["Information", "Where it comes from", "Examples"],
          ["Your account", "Your project lead, when they invite you; you, when you change your password", "Name, email address, organization; your password is stored only in a scrambled (hashed) form that no one at Genomac can read"],
          ["Your messages and comments", "You and your Genomac team", "The conversation in the portal's Messages section and your comments on documents"],
          ["Your project information", "Your Genomac team", "Project title and code, stage, planned and completed steps, the updates the team shares with you, the documents sent to you and the final files released to you"],
          ["Your research intake form", "You", "Your research idea, aims, data plans, publication plans and contact details, as you enter them"],
          ["Your online signatures", "You, when you sign a document or a project step", "The name you type, the date and time, your internet address (IP), your browser, and a fingerprint of the exact text you signed"],
          ["Payment information", "Our finance team", "Your project's fee, the payments due and received, and their dates. We do not collect bank or card details in the portal."],
          ["Sign-in and security records", "Our systems, automatically", "Date and time of sign-ins, failed sign-in attempts and the internet address (IP) they came from, and a record of key actions such as being given or removed from a project"],
          ["One sign-in cookie", "Your browser", "A small cookie that keeps you signed in for up to 12 hours. We use no advertising or tracking cookies in the portal."],
        ],
      },
      { p: "We do not ask for your bank or card details, your identity documents, or health information in the portal. Please do not post patients' or research participants' personal details in the messages, comments or intake form." },
    ],
  },
  {
    h: "3. Why we use it, and on what legal basis",
    blocks: [
      {
        table: [
          ["Purpose", "Legal basis under the NDPA"],
          ["To give you access to your project, show its progress, let you talk to your team, sign documents and receive your files", "Performing our contract with you (or taking steps you asked for before a contract)"],
          ["To send you short email alerts that something is waiting in the portal (they never contain the content itself)", "Performing our contract with you"],
          ["To keep a reliable record of what was signed, by whom and when", "Performing our contract, and our legitimate interest in being able to show what was agreed"],
          ["To keep the portal secure: limiting repeated wrong passwords, recording who did what", "Our legitimate interest in protecting your information and our systems"],
          ["To keep records we must keep by law, for example for tax or disputes", "Legal obligation"],
          ["Anything else, such as asking for a testimonial", "Only with your separate consent, which you can withdraw at any time"],
        ],
      },
    ],
  },
  {
    h: "4. Who can see your information",
    blocks: [
      {
        list: [
          "Only the Genomac staff working on your project, and Genomac management. Staff on other projects cannot see it.",
          "Our finance staff see your payment information, and record payments you make.",
          "Service providers that run the portal for us: Vercel Inc. (website hosting), Neon Inc. (database) and [Resend / Zoho, whichever sends our emails] (email alerts). Your final files are shared from Google Drive (Google LLC) [or Microsoft OneDrive]. They process the information only on our instructions and under contract.",
          "We do not sell your information, and we do not share it for advertising.",
          "We may disclose information if the law requires it, for example to a court or a regulator.",
        ],
      },
    ],
  },
  {
    h: "5. Information that leaves Nigeria",
    blocks: [
      { p: "Our service providers store and process data on servers outside Nigeria [confirm the database region, e.g. the European Union or the United States]. Where this happens we rely on the safeguards the NDPA allows, such as the provider's contractual commitments to protect personal data [to be confirmed by our lawyer against sections 41 to 43 of the NDPA and any NDPC guidance]." },
    ],
  },
  {
    h: "6. How long we keep it",
    blocks: [
      {
        table: [
          ["Information", "How long"],
          ["Your portal account", "Until [6] months after your project's support period ends, then closed and deleted, unless you ask us to keep it for another project"],
          ["Messages, comments, intake form and project information", "For the life of the project and [6] years afterwards, as part of the project record (authorship, approvals and disputes)"],
          ["Signed documents and their signature records", "[6] years after the project ends, or longer if a dispute or the law requires it"],
          ["Payment records", "As long as tax and accounting law requires [confirm: e.g. 6 years]"],
          ["Failed sign-in records", "Deleted automatically after 1 day"],
          ["Security and action records", "[2] years"],
        ],
      },
    ],
  },
  {
    h: "7. How we protect it",
    blocks: [
      {
        list: [
          "Access is checked on our server for every request: you only ever see projects you were invited to.",
          "Passwords are stored only in scrambled (hashed) form; repeated wrong passwords are blocked for 15 minutes. When your password is changed or reset, every other signed-in session ends.",
          "The portal is served only over an encrypted (HTTPS) connection, and your sign-in cookie cannot be read by other websites.",
          "Your Genomac team's internal notes, other clients' projects and our internal financial records are kept separate from the portal.",
          "Email alerts never contain message text, document text or amounts — only a note that something is waiting, and a link to sign in.",
        ],
      },
      { p: "No system is perfectly secure. If a breach affecting your information is likely to put you at risk, we will tell you and the Nigeria Data Protection Commission (NDPC) as the NDPA requires." },
    ],
  },
  {
    h: "8. Your rights",
    blocks: [
      { p: "Under the NDPA you can ask us, free of charge, to:" },
      {
        list: [
          "give you a copy of the information we hold about you;",
          "correct information that is wrong or incomplete;",
          "delete your information, where we no longer need it or have no legal reason to keep it;",
          "restrict or object to some uses of it;",
          "give you your information in a common electronic format, or send it to someone else (data portability);",
          "withdraw any consent you gave, without affecting what was done before.",
        ],
      },
      { p: "Write to the privacy contact in section 1. We will reply within [30] days. If you are not satisfied, you can complain to the Nigeria Data Protection Commission (ndpc.gov.ng)." },
    ],
  },
  {
    h: "9. Changes to this notice",
    blocks: [{ p: "If we change this notice, we will show the new version in the portal and tell you about important changes before they apply." }],
  },
];
