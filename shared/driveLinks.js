// Works out how to show and download a library document from the share link management pasted.
// Google Drive / Docs / Sheets / Slides links get an in-hub preview and download links; anything else
// (OneDrive, other sites) is opened in a new tab only.
//
// PDF: Google only converts files kept in Google format (Docs, Sheets, Slides). A Word or Excel file
// uploaded to Drive as it is can be previewed and downloaded as the original, but not converted to PDF.

const ID = "([A-Za-z0-9_-]{10,})";

/**
 * @param {string} link
 * @returns {{ kind: "gdoc" | "gsheet" | "gslides" | "drivefile" | "other", id?: string,
 *   preview?: string, pdf?: string, original?: string, originalLabel?: string, open: string }}
 */
export function driveLinks(link) {
  const url = String(link || "").trim();
  let m;
  if ((m = url.match(new RegExp(`^https://docs\\.google\\.com/document/d/${ID}`)))) {
    const id = m[1];
    const base = `https://docs.google.com/document/d/${id}`;
    return { kind: "gdoc", id, preview: `${base}/preview`, pdf: `${base}/export?format=pdf`, original: `${base}/export?format=docx`, originalLabel: "Word", open: url };
  }
  if ((m = url.match(new RegExp(`^https://docs\\.google\\.com/spreadsheets/d/${ID}`)))) {
    const id = m[1];
    const base = `https://docs.google.com/spreadsheets/d/${id}`;
    return { kind: "gsheet", id, preview: `${base}/preview`, pdf: `${base}/export?format=pdf`, original: `${base}/export?format=xlsx`, originalLabel: "Excel", open: url };
  }
  if ((m = url.match(new RegExp(`^https://docs\\.google\\.com/presentation/d/${ID}`)))) {
    const id = m[1];
    const base = `https://docs.google.com/presentation/d/${id}`;
    return { kind: "gslides", id, preview: `${base}/preview`, pdf: `${base}/export/pdf`, original: `${base}/export/pptx`, originalLabel: "PowerPoint", open: url };
  }
  if ((m = url.match(new RegExp(`^https://drive\\.google\\.com/file/d/${ID}`))) || (m = url.match(new RegExp(`^https://drive\\.google\\.com/open\\?id=${ID}`)))) {
    const id = m[1];
    return { kind: "drivefile", id, preview: `https://drive.google.com/file/d/${id}/preview`, original: `https://drive.google.com/uc?export=download&id=${id}`, originalLabel: "original", open: url };
  }
  return { kind: "other", open: url };
}
