import regularUrl from "../assets/fonts/NotoSans-Regular.subset.ttf?url";
import boldUrl from "../assets/fonts/NotoSans-Bold.subset.ttf?url";

// Makes the PDF in the browser. The PDF library, the fonts and the logo are only fetched the first time
// someone asks for a PDF, so the rest of the admin page stays light.

const toBase64 = (buffer) => {
  const bytes = new Uint8Array(buffer);
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(s);
};

const blobToDataUrl = (blob) =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(blob);
  });

let assets;
const loadAssets = () => {
  assets ??= (async () => {
    const [regular, bold] = await Promise.all([regularUrl, boldUrl].map((u) => fetch(u).then((r) => r.arrayBuffer())));
    let logo = null;
    try {
      logo = await blobToDataUrl(await fetch("/gsc-logo.png").then((r) => r.blob()));
    } catch {
      // the invoice is still made without the logo
    }
    return { fonts: { regular: toBase64(regular), bold: toBase64(bold) }, logo };
  })().catch((err) => {
    assets = undefined;
    throw err;
  });
  return assets;
};

export async function makePdf(invoice, settings) {
  const [mod, a] = await Promise.all([import("./invoicePdf.js"), loadAssets()]);
  return { doc: mod.buildInvoicePdf({ invoice, settings, ...a }), fileName: mod.pdfFileName(invoice) };
}

export async function downloadPdf(invoice, settings) {
  const { doc, fileName } = await makePdf(invoice, settings);
  doc.save(fileName);
}

// A temporary address the page can show inside a frame
export async function previewUrl(invoice, settings) {
  const { doc } = await makePdf(invoice, settings);
  return doc.output("bloburl");
}
