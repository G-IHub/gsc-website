import { loadAssets } from "../admin/pdfClient.js";
import { parseDoc, splitBold } from "./docFormat.js";

// Makes the PDF of a client document with its signature record (who signed, when, and the fingerprint of the
// exact text). Made in the browser from what the server returned; the server's record stays the evidence.

const PLUM = [42, 15, 82];
const MAGENTA = [178, 65, 183];
const INK = [31, 41, 55];
const MUTED = [91, 100, 114];
const RULE = [221, 213, 232];
const M = 18;
const FONT = "NotoSans";

const stamp = (iso) => {
  const d = new Date(iso);
  return `${d.toISOString().slice(0, 10)} ${d.toISOString().slice(11, 16)} UTC`;
};

export async function buildSignedPdf(view, project) {
  const [{ jsPDF }, a] = await Promise.all([import("jspdf"), loadAssets()]);
  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });
  doc.addFileToVFS("NotoSans-Regular.ttf", a.fonts.regular);
  doc.addFont("NotoSans-Regular.ttf", FONT, "normal");
  doc.addFileToVFS("NotoSans-Bold.ttf", a.fonts.bold);
  doc.addFont("NotoSans-Bold.ttf", FONT, "bold");
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const width = W - 2 * M;
  let y = 0;

  const footer = () => {
    doc.setDrawColor(...RULE);
    doc.line(M, H - 14, W - M, H - 14);
    doc.setFont(FONT, "normal");
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    doc.text(`${project.ref} · ${view.title} · version ${view.version} · SHA-256 ${view.hash}`, M, H - 9, { maxWidth: width - 14 });
    doc.text(String(doc.getNumberOfPages()), W - M, H - 9, { align: "right" });
  };
  const header = (first) => {
    if (first && a.logo) {
      try { doc.addImage(a.logo, "PNG", M, 12, 14, 14); } catch { /* no logo */ }
    }
    doc.setFont(FONT, "bold");
    doc.setFontSize(first ? 11 : 8);
    doc.setTextColor(...PLUM);
    doc.text("Genomac Services & Consult", first && a.logo ? M + 18 : M, first ? 18 : 12);
    if (first) {
      doc.setFont(FONT, "normal");
      doc.setFontSize(8);
      doc.setTextColor(...MUTED);
      doc.text(`${project.ref} · ${project.title}`, a.logo ? M + 18 : M, 23);
    }
    y = first ? 34 : 20;
  };
  const room = (h) => {
    if (y + h > H - 20) {
      footer();
      doc.addPage();
      header(false);
    }
  };
  // writes one paragraph with bold pieces, wrapping words
  const para = (text, { size = 9.5, indent = 0, bullet = false, color = INK, boldAll = false } = {}) => {
    doc.setFontSize(size);
    const lh = size * 0.45;
    const words = [];
    for (const piece of splitBold(text)) for (const w of piece.text.split(/(\s+)/)) if (w) words.push({ w, bold: boldAll || piece.bold });
    const x0 = M + indent + (bullet ? 4 : 0);
    let x = x0;
    room(lh + 1);
    if (bullet) {
      doc.setFont(FONT, "normal");
      doc.setTextColor(...color);
      doc.text("•", M + indent, y);
    }
    for (const { w, bold } of words) {
      doc.setFont(FONT, bold ? "bold" : "normal");
      const ww = doc.getTextWidth(w);
      if (/^\s+$/.test(w)) { if (x > x0) x += ww; continue; }
      if (x + ww > M + width && x > x0) { y += lh; room(lh); x = x0; }
      doc.setTextColor(...color);
      doc.text(w, x, y);
      x += ww;
    }
    y += lh + 2.2;
  };

  header(true);
  for (const b of parseDoc(view.body)) {
    if (b.type === "h1") { room(10); y += 1; para(b.text, { size: 15, color: PLUM, boldAll: true }); y += 1; }
    else if (b.type === "h2") { room(9); y += 1.5; para(b.text, { size: 11, color: PLUM, boldAll: true }); }
    else if (b.type === "ul") for (const t of b.items) para(t, { bullet: true, indent: 1 });
    else para(b.text);
  }

  // ---- signature record ----
  const sigs = view.signatures.filter((s) => s.version === view.version);
  room(40);
  y += 4;
  doc.setDrawColor(...MAGENTA);
  doc.line(M, y, W - M, y);
  y += 7;
  para("Signatures", { size: 12, color: PLUM, boldAll: true });
  const wanted = view.countersign ? ["client", "genomac"] : ["client"];
  for (const who of wanted) {
    const s = sigs.find((x) => x.signer === who);
    room(18);
    para(who === "client" ? "Client" : "For Genomac Services & Consult", { size: 9, color: MUTED, boldAll: true });
    if (s) {
      para(s.name, { size: 13, color: INK });
      para(`Signed electronically on ${stamp(s.at)} by typing their full name and confirming agreement in the Genomac client portal.`, { size: 8, color: MUTED });
    } else {
      para("Not signed yet.", { size: 9, color: MUTED });
    }
    y += 2;
  }
  room(14);
  para(`This record is for version ${view.version} of the document. Fingerprint of the exact text (SHA-256): ${view.hash}. Any change to the text gives a different fingerprint and needs signing again.`, { size: 7.5, color: MUTED });
  footer();
  return doc;
}

export async function downloadSignedPdf(view, project) {
  const doc = await buildSignedPdf(view, project);
  const safe = `${project.ref}-${view.title}-v${view.version}`.replace(/[^\w.-]+/g, "-");
  doc.save(`${safe}.pdf`);
}
