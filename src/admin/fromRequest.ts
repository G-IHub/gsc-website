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

export function proformaFromRequest(row: RequestRow, services: Service[], settings: Settings): { invoice: Invoice; notice: string } {
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
