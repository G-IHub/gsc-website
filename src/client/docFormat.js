// The tiny text format of client documents: "# " title, "## " heading, "- " list item, **bold**, blank line between paragraphs.
// Plain JS so the page, the PDF and Node tests share it.

export const parseDoc = (body) => {
  const out = [];
  for (const chunk of body.replace(/\r/g, "").split(/\n\s*\n/)) {
    const lines = chunk.split("\n").map((l) => l.trimEnd()).filter((l) => l.trim());
    if (!lines.length) continue;
    let para = [];
    let list = [];
    const flush = () => {
      if (para.length) out.push({ type: "p", text: para.join(" ") });
      if (list.length) out.push({ type: "ul", items: list });
      para = [];
      list = [];
    };
    for (const l of lines) {
      if (l.startsWith("# ")) { flush(); out.push({ type: "h1", text: l.slice(2) }); }
      else if (l.startsWith("## ")) { flush(); out.push({ type: "h2", text: l.slice(3) }); }
      else if (/^\s*- /.test(l)) { if (para.length) { out.push({ type: "p", text: para.join(" ") }); para = []; } list.push(l.replace(/^\s*- /, "")); }
      else { if (list.length) { out.push({ type: "ul", items: list }); list = []; } para.push(l.trim()); }
    }
    flush();
  }
  return out;
};

// "**bold** rest" -> pieces with bold flags (used by the PDF too)
export const splitBold = (text) => text.split(/(\*\*[^*]+\*\*)/).filter(Boolean).map((t) => (t.startsWith("**") && t.endsWith("**") ? { bold: true, text: t.slice(2, -2) } : { bold: false, text: t }));

