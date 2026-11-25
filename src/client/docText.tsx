import type { ReactNode } from "react";
import { parseDoc, splitBold } from "./docFormat.js";

// Shows a client document's text. The text uses a tiny format: "# " title, "## " heading, "- " list item,
// **bold**, and a blank line between paragraphs. Shared by the staff hub and the client portal.

const inline = (text: string): ReactNode[] => splitBold(text).map((p, i) => (p.bold ? <b key={i}>{p.text}</b> : <span key={i}>{p.text}</span>));

const DocText = ({ body }: { body: string }) => (
  <div className="text-[12.5px] leading-relaxed text-ink space-y-2">
    {parseDoc(body).map((b, i) =>
      b.type === "h1" ? <h3 key={i} className="!text-[17px] text-plum font-semibold">{b.text}</h3>
      : b.type === "h2" ? <h4 key={i} className="!text-[13.5px] text-plum font-medium pt-1">{inline(b.text!)}</h4>
      : b.type === "ul" ? <ul key={i} className="list-disc pl-5 space-y-0.5">{b.items!.map((t, j) => <li key={j}>{inline(t)}</li>)}</ul>
      : <p key={i}>{inline(b.text!)}</p>,
    )}
  </div>
);

export default DocText;
