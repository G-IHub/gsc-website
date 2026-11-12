// Pricing, totals and text helpers for invoices.
// Used by the admin screens (live totals, PDF) and by the server (the totals it stores), so both always agree.

export const DOC_TYPES = {
  invoice: "Invoice",
  proforma: "Pro-forma invoice",
  quote: "Quotation",
};

export const STATUSES = ["Draft", "Sent", "Paid", "Cancelled"];

export const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
// Our price from a supplier's price, with our markup (a percentage) added on top
export const applyMarkup = (price, percent) => round2(num(price) * (1 + Math.max(num(percent), 0) / 100));

// Services in this category are bought from a partner lab, so the price entered for them is our cost
export const isSequencing = (category) => /sequenc/i.test(String(category || ""));

const roundTo = (n, step) => Math.round(n / step) * step;

// ---- Volume pricing ------------------------------------------------------------------------
// A tier table says what the whole job costs for a given number of samples, for example
// 1 sample = 100,000, 2 samples = 150,000, 4 samples = 300,000, 7 samples = 450,000.

export const cleanTiers = (tiers) =>
  (Array.isArray(tiers) ? tiers : [])
    .map((t) => ({ qty: num(t?.qty), total: num(t?.total) }))
    .filter((t) => t.qty > 0 && t.total >= 0)
    .sort((a, b) => a.qty - b.qty)
    .filter((t, i, all) => i === 0 || t.qty !== all[i - 1].qty);

// Returns the total price for `qty` samples and how it was worked out:
//   tier       the table has that exact quantity
//   estimated  between two rows, so it is a straight line between them (rounded to the nearest 100)
//   extended   beyond the last row: last total plus a price for each extra sample
//   pro-rata   below the first row
export function tierPrice(tiers, qty, extraPerSample) {
  const t = cleanTiers(tiers);
  const q = num(qty);
  if (!t.length || q <= 0) return { total: 0, method: "none" };

  const exact = t.find((x) => x.qty === q);
  if (exact) return { total: round2(exact.total), method: "tier" };

  const first = t[0];
  if (q < first.qty) return { total: round2((q * first.total) / first.qty), method: "pro-rata" };

  const last = t[t.length - 1];
  if (q > last.qty) {
    const extra = num(extraPerSample) > 0 ? num(extraPerSample) : roundTo(last.total / last.qty, 100);
    return { total: round2(last.total + (q - last.qty) * extra), method: "extended" };
  }

  const lower = [...t].reverse().find((x) => x.qty < q);
  const upper = t.find((x) => x.qty > q);
  const total = lower.total + ((q - lower.qty) * (upper.total - lower.total)) / (upper.qty - lower.qty);
  return { total: round2(roundTo(total, 100)), method: "estimated" };
}

// ---- Lines and totals ----------------------------------------------------------------------
// A line is one of three kinds:
//   unit   quantity x unit price. `billedQty` lets you show one quantity but charge for another
//          (for example show 7 samples but bill for 8).
//   tier   a volume-pricing table decides the amount from the quantity
//   fixed  a set amount for the line

export function discountOf(amount, d) {
  if (!d || num(d.value) <= 0) return 0;
  const value = d.type === "percent" ? (amount * Math.min(num(d.value), 100)) / 100 : Math.min(num(d.value), amount);
  return round2(Math.max(value, 0));
}

export function lineAmount(line) {
  const qty = num(line?.qty);
  let gross = 0;
  let method = "unit";
  if (line?.mode === "tier") {
    const r = tierPrice(line.tiers, qty, line.extraPerSample);
    gross = r.total;
    method = r.method;
  } else if (line?.mode === "fixed") {
    gross = num(line.fixedAmount);
    method = "fixed";
  } else {
    const hasBilled = line?.billedQty !== undefined && line?.billedQty !== null && line?.billedQty !== "";
    gross = (hasBilled ? num(line.billedQty) : qty) * num(line?.unitPrice);
  }
  gross = round2(gross);
  const discount = discountOf(gross, line?.discount);
  return { gross, discount, net: round2(gross - discount), method };
}

export function invoiceTotals(inv) {
  const lines = (inv?.items || []).map(lineAmount);
  const subtotal = round2(lines.reduce((sum, l) => sum + l.net, 0));
  const discount = discountOf(subtotal, inv?.discount);
  const taxable = round2(subtotal - discount);
  const taxRate = Math.max(num(inv?.taxRate), 0);
  const tax = round2((taxable * taxRate) / 100);
  return { lines, subtotal, discount, taxable, taxRate, tax, total: round2(taxable + tax) };
}

export function formatMoney(n, symbol = "₦") {
  const v = num(n);
  const body = Math.abs(v).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${v < 0 ? "-" : ""}${symbol}${body}`;
}

// ---- Word replacement ----------------------------------------------------------------------
// Rules like { from: "Another Lab Ltd", to: "Genomac Services and Consult" } clean text that is pasted
// from a supplier's document, so their name, codes and details never reach your client.

const escapeRegExp = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const sortedRules = (rules) =>
  (Array.isArray(rules) ? rules : [])
    .filter((r) => r && String(r.from || "").trim())
    .sort((a, b) => String(b.from).length - String(a.from).length);

export function applyReplacements(text, rules) {
  let out = String(text ?? "");
  for (const r of sortedRules(rules)) {
    out = out.replace(new RegExp(escapeRegExp(String(r.from).trim()), "gi"), r.to ?? "");
  }
  return out
    .split("\n")
    .map((line) => line.replace(/[ \t]{2,}/g, " ").replace(/\s+([,.;:)])/g, "$1").trim())
    .join("\n")
    .trim();
}

// Which rule words are still in the text (so a warning can stop an invoice leaving with a supplier's name on it)
export function findLeftovers(texts, rules) {
  const joined = (texts || []).filter(Boolean).join("\n");
  return sortedRules(rules)
    .filter((r) => new RegExp(escapeRegExp(String(r.from).trim()), "i").test(joined))
    .map((r) => String(r.from).trim());
}

// ---- Pasting from another document ---------------------------------------------------------
// Turns text copied from a supplier's quote or invoice into draft lines. Rows are recognised by the
// two currency amounts at the end of the row (unit price ... subtotal), with the quantity just before.

const AMOUNT = /(?:₦|NGN|\$|€|£|USD|EUR|GBP)\s*(\d[\d ,]*\.\d{2})/gi;
const SKIP = /^(total|vat|sub-?total|account|bank|swift|branch|payment|invoiced to|delivery|quotation|your reference|sales contact|phone|code\b|page|all quotes|all purchase|product category)/i;
const toNumber = (s) => Number(String(s).replace(/[ ,]/g, ""));

export function parsePastedText(text, rules) {
  const lines = String(text || "").replace(/\r/g, "").split("\n");
  const rows = [];
  let prev = null;

  for (const raw of lines) {
    const line = raw.replace(/\s+/g, " ").trim();
    if (!line) {
      prev = null;
      continue;
    }
    if (SKIP.test(line)) {
      prev = null;
      continue;
    }
    // Stray symbols or numbers on a line of their own (like the % under a VAT column) are not text
    if (!/[A-Za-z]/.test(line)) continue;
    const found = [...line.matchAll(AMOUNT)];
    if (found.length) {
      const before = line.slice(0, found[0].index).trim();
      const qtyMatch = before.match(/(\d+(?:\.\d+)?)\s*$/);
      const qty = qtyMatch ? Number(qtyMatch[1]) : 1;
      const descRaw = (qtyMatch ? before.slice(0, qtyMatch.index) : before).replace(/\bN\/A\b/gi, "").trim();
      const unit = toNumber(found[0][1]);
      const amount = toNumber(found[found.length - 1][1]);
      prev = { description: descRaw, qty, unit: found.length > 1 ? unit : amount / (qty || 1), amount };
      rows.push(prev);
    } else if (prev) {
      prev.description = `${prev.description} ${line.replace(/\bN\/A\b/gi, "").trim()}`.trim();
    } else {
      rows.push({ description: line, qty: 1, unit: 0, amount: null, textOnly: true });
    }
  }

  // Lines of plain text are only kept when no priced rows were found at all
  const priced = rows.filter((r) => !r.textOnly);
  const kept = priced.length ? priced : rows;

  return kept
    .map((r) => {
      const description = applyReplacements(r.description, rules).replace(/\s+/g, " ").trim();
      if (r.textOnly || r.amount === null) {
        return { description, qty: 1, mode: "unit", unitPrice: 0 };
      }
      const matches = Math.abs(r.qty * r.unit - r.amount) <= Math.max(0.01, r.amount * 0.005);
      return matches
        ? { description, qty: r.qty, mode: "unit", unitPrice: round2(r.unit) }
        : { description, qty: r.qty, mode: "fixed", fixedAmount: round2(r.amount) };
    })
    .filter((r) => r.description);
}

// ---- Settings defaults ---------------------------------------------------------------------

export const defaultSettings = {
  company: {
    name: "Genomac Services & Consult",
    tagline: "A Genomac Holdings Company",
    address: "Genomac Building, Under G, Ogbomoso, Oyo State, Nigeria",
    email: "info@genomacsc.com",
    phone: "+234 807 719 1794",
    website: "www.genomacsc.com",
    regNo: "",
    taxNo: "",
  },
  bank: { accountName: "", bankName: "", accountNumber: "", extra: "" },
  currency: { code: "NGN", symbol: "₦" },
  // Added on top of a partner lab's price for sequencing services (percent)
  markup: { sequencing: 25 },
  defaultTaxRate: 0,
  taxLabel: "VAT",
  dueDays: 14,
  validDays: 30,
  terms: "Please quote the document number when you pay.",
  notes: "",
  prefixes: { invoice: "INV", proforma: "PF", quote: "QT" },
  counters: { invoice: 0, proforma: 0, quote: 0 },
  // Words removed or swapped when text is pasted from another lab's document. Edit these in Settings.
  replacements: [
    { from: "Inqaba Biotec West Africa Ltd", to: "Genomac Services and Consult" },
    { from: "IB PACB_SBB_DNA QC", to: "" },
    { from: "IB MiSeq Lib_DNA", to: "" },
    { from: "IB AVITI24_225", to: "" },
    { from: "IB DNA EX", to: "" },
    { from: "IB NGSANA", to: "" },
    { from: "inqaba biotec", to: "" },
    { from: "inqaba", to: "" },
  ],
};

// Fills any missing settings from the defaults (so older saved settings keep working as fields are added)
export function mergeSettings(saved) {
  const s = saved && typeof saved === "object" ? saved : {};
  return {
    ...defaultSettings,
    ...s,
    company: { ...defaultSettings.company, ...(s.company || {}) },
    bank: { ...defaultSettings.bank, ...(s.bank || {}) },
    currency: { ...defaultSettings.currency, ...(s.currency || {}) },
    prefixes: { ...defaultSettings.prefixes, ...(s.prefixes || {}) },
    markup: { ...defaultSettings.markup, ...(s.markup || {}) },
    counters: { ...defaultSettings.counters, ...(s.counters || {}) },
    replacements: Array.isArray(s.replacements) ? s.replacements : defaultSettings.replacements,
  };
}

// The services a fresh catalogue starts with: the lines from your first sequencing pro-forma, plus the
// analysis volume prices. All of it can be edited or removed on the Services & prices screen.
export const starterServices = [
  { name: "Genomic DNA extraction", category: "Sequencing", unit: "sample", pricing: "unit", unitPrice: 11555.78 },
  { name: "DNA/library QC for SBB sequencing", category: "Sequencing", unit: "sample", pricing: "unit", unitPrice: 21184.5 },
  { name: "MiSeq library preparation (gDNA, amplicon, plasmids)", category: "Sequencing", unit: "library", pricing: "unit", unitPrice: 130891.5 },
  { name: "Sequencing, AVITI24 run, 2x150 bp, 225 GB output", category: "Sequencing", unit: "run", pricing: "unit", unitPrice: 663019.17 },
  {
    name: "Bioinformatics analysis (volume pricing)",
    category: "Analysis",
    unit: "sample",
    pricing: "tier",
    unitPrice: 100000,
    tiers: [
      { qty: 1, total: 100000 },
      { qty: 2, total: 150000 },
      { qty: 3, total: 250000 },
      { qty: 4, total: 300000 },
      { qty: 7, total: 450000 },
    ],
  },
];
