import { lineFromService } from "./InvoiceEditor";
import { addDays, todayIso } from "./ui";
import type { Invoice, Line, Service, Settings } from "./types";

// Turns a Sequencing request from the website into a draft pro-forma. Services that match one in the
// catalogue get its price (with our markup); the rest come in without a price for us to fill in.

export type RequestRow = {
  id: number;
  name: string;
  organization: string;
  email: string;
  country: string;
  title: string;
  data: Record<string, unknown>;
};

type Item = { key?: string; name?: string; qty?: number };

// Words that tell us which catalogue service a request line corresponds to
const keywords: Record<string, RegExp> = {
  targeted: /target.?based|\b(16s|its)\b|gene panel/i,
  wgs: /whole.?genome|\bwgs\b/i,
  metagenomics: /metagenom/i,
  rnaseq: /\brna\b|transcriptom/i,
  sanger: /sanger/i,
};

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();

const findService = (services: Service[], item: Item) => {
  const active = services.filter((s) => s.active);
  const re = item.key ? keywords[item.key] : undefined;
  if (re) return active.find((s) => re.test(s.name));
  const n = norm(item.name || "");
  return n ? active.find((s) => norm(s.name) === n) : undefined;
};

// Bioinformatics requests: which catalogue service fits each analysis
const bioKeywords: Record<string, RegExp> = {
  assembly: /assembl|annotat/i,
  variants: /variant|comparative/i,
  rnaseq: /rna|transcriptom|expression/i,
  metagenomics: /metagenom|16s|microbio/i,
  phylogenetics: /phylogen|alignment/i,
  amr: /amr|resistance|virulence/i,
};

function proformaFromBioRequest(row: RequestRow, services: Service[], settings: Settings): { invoice: Invoice; notice: string } {
  const bio = (row.data.bioinformatics || {}) as { items?: Item[]; dataType?: string; dataStatus?: string; organism?: string; deliverable?: string; deadline?: string };
  const items = (bio.items || []).filter((i) => i.name);
  const markup = Number(settings.markup?.sequencing) || 0;
  const active = services.filter((s) => s.active && /bioinformatic|analysis/i.test(s.name));
  const generic = active.find((s) => /bioinformatic/i.test(s.name));

  const lines: Line[] = [];
  const unpriced: string[] = [];
  const general: string[] = [];
  for (const item of items) {
    const qty = Number(item.qty) || 1;
    const re = item.key ? bioKeywords[item.key] : undefined;
    const specific = re ? active.find((s) => re.test(s.name)) : undefined;
    const svc = specific || (item.key !== "other" ? generic : undefined);
    if (svc) {
      lines.push({ ...lineFromService(svc, markup), description: specific ? svc.name : `${item.name}
${svc.name}`, qty });
      if (!specific) general.push(item.name || "");
    } else {
      lines.push({ _k: "", description: item.name || "Bioinformatics analysis", qty, mode: "unit", unitPrice: "" });
      unpriced.push(item.name || "Bioinformatics analysis");
    }
  }
  if (/sequencing done/i.test(bio.dataStatus || "")) {
    lines.push({ _k: "", description: "Sequencing (client also needs this)", qty: 1, mode: "unit", unitPrice: "" });
    unpriced.push("Sequencing");
  }

  const phone = String(row.data.additional || "").match(/Phone \/ WhatsApp:\s*(.+)/i)?.[1]?.trim() || "";
  const issueDate = todayIso();
  const invoice: Invoice = {
    number: "",
    docType: "proforma",
    status: "Draft",
    issueDate,
    dueDate: addDays(issueDate, Number(settings.validDays) || 0),
    client: { name: row.name, org: row.organization, address: row.country, email: row.email, phone },
    reference: `${items.map((i) => `${i.name} (${i.qty ?? 1})`).join(", ")}${bio.organism ? `. ${bio.organism}` : ""}`.slice(0, 300),
    items: lines,
    discount: null,
    taxRate: settings.defaultTaxRate,
    notes: settings.notes,
    terms: settings.terms,
  };
  const notice = [
    `Draft made from website request #${row.id}.`,
    unpriced.length ? `Add a price to: ${unpriced.join(", ")}.` : "",
    general.length ? `${general.join(", ")} took the general bioinformatics price. Check it suits that analysis.` : "",
    bio.deadline ? `Client deadline: ${bio.deadline}.` : "",
    "Check the client details, then save.",
  ]
    .filter(Boolean)
    .join(" ");
  return { invoice, notice };
}

export function proformaFromRequest(row: RequestRow, services: Service[], settings: Settings): { invoice: Invoice; notice: string } {
  if (row.data.bioinformatics) return proformaFromBioRequest(row, services, settings);
  const seq = (row.data.sequencing || {}) as { items?: Item[]; sampleType?: string; organism?: string; analysis?: string };
  const items = (seq.items || []).filter((i) => i.name);
  const markup = Number(settings.markup?.sequencing) || 0;
  const total = items.reduce((n, i) => n + (Number(i.qty) || 1), 0);

  const lines: Line[] = [];
  const unpriced: string[] = [];

  for (const item of items) {
    const qty = Number(item.qty) || 1;
    const svc = findService(services, item);
    if (svc) {
      lines.push({ ...lineFromService(svc, markup), qty });
    } else {
      lines.push({ _k: "", description: item.name || "Sequencing", qty, mode: "unit", unitPrice: "" });
      unpriced.push(item.name || "Sequencing");
    }
  }

  const wantsAnalysis = /standard|full/i.test(seq.analysis || "");
  if (wantsAnalysis) {
    const svc = services.find((s) => s.active && /bioinformatic|analysis/i.test(s.name));
    if (svc) lines.push({ ...lineFromService(svc, markup), qty: total });
    else {
      lines.push({ _k: "", description: `Bioinformatics analysis (${seq.analysis})`, qty: total, mode: "unit", unitPrice: "" });
      unpriced.push("Bioinformatics analysis");
    }
  }

  const phone = String(row.data.additional || "").match(/Phone \/ WhatsApp:\s*(.+)/i)?.[1]?.trim() || "";
  const issueDate = todayIso();
  const detail = [seq.sampleType, seq.organism].filter(Boolean).join(", ");

  const invoice: Invoice = {
    number: "",
    docType: "proforma",
    status: "Draft",
    issueDate,
    dueDate: addDays(issueDate, Number(settings.validDays) || 0),
    client: { name: row.name, org: row.organization, address: row.country, email: row.email, phone },
    reference: `${items.map((i) => `${i.name} (${i.qty ?? 1})`).join(", ")}${detail ? `. Samples: ${detail}` : ""}`.slice(0, 300),
    items: lines,
    discount: null,
    taxRate: settings.defaultTaxRate,
    notes: settings.notes,
    terms: settings.terms,
  };

  const notice = [
    `Draft made from website request #${row.id}.`,
    unpriced.length ? `Add a price to: ${unpriced.join(", ")}.` : "All lines took their price from your catalogue. Check them.",
    /advise|not sure/i.test(seq.analysis || "") ? "The client asked for advice on analysis, so none was added." : "",
    "Check the client details, then save.",
  ]
    .filter(Boolean)
    .join(" ");

  return { invoice, notice };
}
