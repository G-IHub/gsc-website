import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { DOC_TYPES, formatMoney, invoiceTotals } from "../../shared/billing.js";

// Draws an invoice, pro-forma or quotation as an A4 PDF in GSC's name.
//   invoice   the document (see api/billing.js for its shape)
//   settings  company details, bank details, currency (billing settings)
//   fonts     { regular, bold }  base64 text of the Noto Sans files (they contain the Naira sign)
//   logo      optional data URL of the logo image
// It returns the jsPDF document, so the caller can save it or open it.

const PLUM = [42, 15, 82];
const MAGENTA = [178, 65, 183];
const LIME = [205, 226, 74];
const INK = [31, 41, 55];
const MUTED = [91, 100, 114];
const PAPER = [250, 248, 243];
const RULE = [221, 213, 232];

const MARGIN = 16;
const FONT = "NotoSans";

const trimNumber = (n) => String(Number(n)); // 7 -> "7", 2.5 -> "2.5"

const longDate = (iso) => {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  return `${d} ${months[m - 1]} ${y}`;
};

export function buildInvoicePdf({ invoice, settings, fonts, logo }) {
  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });
  doc.addFileToVFS("NotoSans-Regular.ttf", fonts.regular);
  doc.addFont("NotoSans-Regular.ttf", FONT, "normal");
  doc.addFileToVFS("NotoSans-Bold.ttf", fonts.bold);
  doc.addFont("NotoSans-Bold.ttf", FONT, "bold");

  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const right = W - MARGIN;
  const co = settings.company;
  const symbol = settings.currency?.symbol || "₦";
  const money = (n) => formatMoney(n, symbol);
  const totals = invoiceTotals(invoice);
  const title = (DOC_TYPES[invoice.docType] || "Invoice").toUpperCase();

  const text = (str, x, y, opts = {}) => {
    doc.setFont(FONT, opts.bold ? "bold" : "normal");
    doc.setFontSize(opts.size || 9);
    doc.setTextColor(...(opts.color || INK));
    doc.text(String(str), x, y, { align: opts.align || "left", maxWidth: opts.maxWidth });
  };

  // ---- header ----
  let textX = MARGIN;
  if (logo) {
    try {
      doc.addImage(logo, "PNG", MARGIN, 14, 20, 20);
      textX = MARGIN + 25;
    } catch {
      // a missing or unreadable logo should not stop the invoice
    }
  }
  text(co.name, textX, 21, { bold: true, size: 15, color: PLUM });
  if (co.tagline) text(co.tagline, textX, 26.5, { size: 8.5, color: MUTED });
  const contactLines = [co.address, [co.phone, co.email].filter(Boolean).join("  |  "), co.website].filter(Boolean);
  contactLines.forEach((l, i) => text(l, textX, 31.5 + i * 4, { size: 8, color: MUTED, maxWidth: 95 }));

  text(title, right, 21, { bold: true, size: 17, color: PLUM, align: "right" });
  text(`No. ${invoice.number || "(not yet numbered)"}`, right, 28, { bold: true, size: 10.5, align: "right" });
  if (invoice.status === "Paid" || invoice.status === "Cancelled") {
    text(invoice.status.toUpperCase(), right, 34, { bold: true, size: 10, color: invoice.status === "Paid" ? MAGENTA : MUTED, align: "right" });
  }

  let y = 49;
  doc.setDrawColor(...LIME);
  doc.setLineWidth(0.9);
  doc.line(MARGIN, y - 4, right, y - 4);

  // ---- bill to, and dates ----
  const c = invoice.client || {};
  text("BILL TO", MARGIN, y, { bold: true, size: 8, color: MAGENTA });
  let ly = y + 5.5;
  if (c.name) {
    text(c.name, MARGIN, ly, { bold: true, size: 10.5 });
    ly += 5;
  }
  const clientLines = [c.org, ...String(c.address || "").split("\n"), c.email, c.phone].filter((l) => l && String(l).trim());
  for (const l of clientLines) {
    const wrapped = doc.splitTextToSize(String(l), 85);
    for (const w of wrapped) {
      text(w, MARGIN, ly, { size: 9, color: INK });
      ly += 4.3;
    }
  }

  const metaX = 118;
  const meta = [
    ["Date", longDate(invoice.issueDate)],
    [invoice.docType === "invoice" ? "Due date" : "Valid until", longDate(invoice.dueDate)],
    ["Reference", invoice.reference],
  ].filter(([, v]) => v);
  let my = y;
  text("DETAILS", metaX, my, { bold: true, size: 8, color: MAGENTA });
  my += 5.5;
  for (const [k, v] of meta) {
    text(k, metaX, my, { size: 8.5, color: MUTED });
    const wrapped = doc.splitTextToSize(String(v), right - metaX - 26);
    wrapped.forEach((w, i) => text(w, metaX + 26, my + i * 4.3, { size: 9 }));
    my += Math.max(wrapped.length, 1) * 4.3 + 1.2;
  }
  y = Math.max(ly, my) + 7;

  // ---- items ----
  const rows = (invoice.items || []).map((item, i) => {
    const calc = totals.lines[i];
    const billedDiffers = item.mode === "unit" && item.billedQty !== undefined && item.billedQty !== "" && item.billedQty !== null && Number(item.billedQty) !== Number(item.qty);
    let rate = money(item.unitPrice);
    if (item.mode === "tier") rate = "Volume price";
    else if (item.mode === "fixed" || billedDiffers) rate = "-";
    let desc = item.description || "";
    if (calc.discount > 0) {
      const d = item.discount;
      desc += `\nLess discount${d?.type === "percent" ? ` (${trimNumber(d.value)}%)` : ""}: -${money(calc.discount)}`;
    }
    return [String(i + 1), desc, trimNumber(item.qty), rate, money(calc.net)];
  });

  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN, bottom: 22 },
    head: [["#", "Description", "Qty", "Unit price", `Amount (${settings.currency?.code || "NGN"})`]],
    body: rows.length ? rows : [["", "No items", "", "", ""]],
    theme: "plain",
    styles: { font: FONT, fontSize: 9, textColor: INK, cellPadding: { top: 2.6, bottom: 2.6, left: 2.2, right: 2.2 }, lineColor: RULE, lineWidth: 0 },
    headStyles: { fillColor: PLUM, textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8.5 },
    alternateRowStyles: { fillColor: PAPER },
    columnStyles: {
      0: { cellWidth: 9, halign: "center", textColor: MUTED },
      1: { cellWidth: "auto" },
      2: { cellWidth: 16, halign: "right" },
      3: { cellWidth: 32, halign: "right" },
      4: { cellWidth: 36, halign: "right", fontStyle: "bold" },
    },
    didParseCell: (data) => {
      if (data.section === "head" && data.column.index >= 2) data.cell.styles.halign = "right";
      if (data.section === "head" && data.column.index === 0) data.cell.styles.halign = "center";
    },
  });

  y = doc.lastAutoTable.finalY + 6;

  // ---- totals ----
  const need = 12 + (totals.discount > 0 ? 6 : 0) + (totals.taxRate > 0 ? 6 : 0) + 12;
  if (y + need > H - 24) {
    doc.addPage();
    y = 20;
  }
  const boxW = 84;
  const boxX = right - boxW;
  const line = (label, value, opts = {}) => {
    text(label, boxX + 3, y, { size: 9, color: MUTED, ...opts.label });
    text(value, right - 3, y, { size: 9.5, align: "right", ...opts.value });
    y += 6;
  };
  line("Subtotal", money(totals.subtotal));
  if (totals.discount > 0) {
    const d = invoice.discount;
    line(d?.type === "percent" ? `Discount (${trimNumber(d.value)}%)` : "Discount", `-${money(totals.discount)}`);
  }
  if (totals.taxRate > 0) line(`${settings.taxLabel || "VAT"} (${trimNumber(totals.taxRate)}%)`, money(totals.tax));
  y += 0.5;
  doc.setFillColor(...PLUM);
  doc.roundedRect(boxX, y - 5, boxW, 10, 1.5, 1.5, "F");
  text("TOTAL", boxX + 3, y + 1.4, { bold: true, size: 10, color: [255, 255, 255] });
  text(money(totals.total), right - 3, y + 1.4, { bold: true, size: 11.5, color: [255, 255, 255], align: "right" });
  y += 14;

  // ---- payment details, notes and terms ----
  const bank = settings.bank || {};
  const bankLines = [
    bank.accountName && ["Account name", bank.accountName],
    bank.bankName && ["Bank", bank.bankName],
    bank.accountNumber && ["Account number", bank.accountNumber],
    bank.extra && ["", bank.extra],
  ].filter(Boolean);

  const blocks = [];
  if (bankLines.length) blocks.push({ heading: "PAYMENT DETAILS", rows: bankLines });
  if (invoice.notes) blocks.push({ heading: "NOTES", body: invoice.notes });
  if (invoice.terms) blocks.push({ heading: "TERMS", body: invoice.terms });

  for (const b of blocks) {
    const bodyLines = b.rows ? b.rows.map(([k, v]) => (k ? `${k}: ${v}` : v)) : doc.splitTextToSize(b.body, W - MARGIN * 2);
    const height = 5.5 + bodyLines.length * 4.4 + 4;
    if (y + height > H - 22) {
      doc.addPage();
      y = 20;
    }
    text(b.heading, MARGIN, y, { bold: true, size: 8, color: MAGENTA });
    let by = y + 5.2;
    for (const l of bodyLines) {
      text(l, MARGIN, by, { size: 9 });
      by += 4.4;
    }
    y = by + 4;
  }

  // ---- footer on every page ----
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setDrawColor(...RULE);
    doc.setLineWidth(0.3);
    doc.line(MARGIN, H - 15, right, H - 15);
    const foot = [co.name, co.website, co.email, co.phone].filter(Boolean).join("   |   ");
    text(foot, MARGIN, H - 10.5, { size: 7.5, color: MUTED });
    text(`Page ${p} of ${pages}`, right, H - 10.5, { size: 7.5, color: MUTED, align: "right" });
  }

  return doc;
}

export const pdfFileName = (invoice) =>
  `${(invoice.number || "document").replace(/[^A-Za-z0-9._-]+/g, "-")}${invoice.client?.name ? `_${invoice.client.name.replace(/[^A-Za-z0-9]+/g, "-").slice(0, 30)}` : ""}.pdf`;
