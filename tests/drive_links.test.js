import test from "node:test";
import assert from "node:assert/strict";
import { driveLinks } from "../shared/driveLinks.js";

// Planted links of every kind management might paste
const ID = "1AbCdEfGhIjKlMnOpQrStUvWxYz_0123456789";

test("Google Docs: preview, PDF and Word", () => {
  const d = driveLinks(`https://docs.google.com/document/d/${ID}/edit?usp=sharing`);
  assert.equal(d.kind, "gdoc");
  assert.equal(d.preview, `https://docs.google.com/document/d/${ID}/preview`);
  assert.equal(d.pdf, `https://docs.google.com/document/d/${ID}/export?format=pdf`);
  assert.equal(d.original, `https://docs.google.com/document/d/${ID}/export?format=docx`);
});

test("Google Sheets and Slides", () => {
  const s = driveLinks(`https://docs.google.com/spreadsheets/d/${ID}/edit#gid=0`);
  assert.equal(s.kind, "gsheet");
  assert.equal(s.pdf, `https://docs.google.com/spreadsheets/d/${ID}/export?format=pdf`);
  assert.equal(s.original, `https://docs.google.com/spreadsheets/d/${ID}/export?format=xlsx`);
  const p = driveLinks(`https://docs.google.com/presentation/d/${ID}/edit`);
  assert.equal(p.kind, "gslides");
  assert.equal(p.pdf, `https://docs.google.com/presentation/d/${ID}/export/pdf`);
});

test("a Word/Excel file uploaded to Drive: preview and original, no PDF", () => {
  for (const url of [`https://drive.google.com/file/d/${ID}/view?usp=drive_link`, `https://drive.google.com/open?id=${ID}`]) {
    const d = driveLinks(url);
    assert.equal(d.kind, "drivefile");
    assert.equal(d.preview, `https://drive.google.com/file/d/${ID}/preview`);
    assert.equal(d.original, `https://drive.google.com/uc?export=download&id=${ID}`);
    assert.equal(d.pdf, undefined);
  }
});

test("anything else is opened only, never embedded", () => {
  for (const url of ["https://onedrive.live.com/edit?id=ABC", "https://example.org/file.docx", "https://evil.example/https://docs.google.com/document/d/" + ID, "", "javascript:alert(1)"]) {
    const d = driveLinks(url);
    assert.equal(d.kind, "other", url);
    assert.equal(d.preview, undefined);
  }
  // a look-alike host must not pass as Google
  assert.equal(driveLinks(`https://docs.google.com.evil.example/document/d/${ID}`).kind, "other");
});
