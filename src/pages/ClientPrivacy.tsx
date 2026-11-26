import { useEffect } from "react";
import { PRIVACY_APPROVED, PRIVACY_DATE, PRIVACY_SECTIONS, PRIVACY_VERSION } from "../../shared/privacyNotice.js";

// /client/privacy — the client portal's privacy notice. Until it is approved, visitors see "being finalised";
// management can read the draft with ?draft=1 (marked DRAFT on every view).
type Block = { p?: string; list?: string[]; table?: string[][] };

const ClientPrivacy = () => {
  const draft = !PRIVACY_APPROVED && new URLSearchParams(window.location.search).get("draft") === "1";
  useEffect(() => {
    document.title = "Privacy notice — Genomac client portal";
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex, nofollow";
    document.head.appendChild(meta);
    return () => meta.remove();
  }, []);
  const show = PRIVACY_APPROVED || draft;
  return (
    <div className="hub-root min-h-screen bg-[#e9ebec] px-3 py-6">
      <article className="max-w-3xl mx-auto bg-white rounded-[22px] p-6 md:p-9">
        <a href="/client" className="text-[12px] text-muted hover:text-plum">← Client portal</a>
        <p className="text-[12px] text-magenta-dark mt-4">Genomac Services &amp; Consult</p>
        <h1 className="!text-[24px] text-plum mt-1">Client Portal Privacy Notice</h1>
        {!show && <p className="text-[13px] text-muted mt-4">This notice is being finalised. For any question about your information, write to info@genomacsc.com.</p>}
        {show && (
          <>
            <p className="text-[11.5px] text-muted mt-1">Version {PRIVACY_VERSION} · {PRIVACY_DATE}</p>
            {draft && <p className="mt-3 rounded-lg bg-amber-50 text-amber-800 text-[12px] px-3 py-2">DRAFT for review: not yet approved by management or checked by a lawyer. Words in [brackets] must be completed. Clients cannot see this yet.</p>}
            <div className="mt-4 space-y-5 text-[13px] leading-relaxed text-ink">
              {PRIVACY_SECTIONS.map((s, i) => (
                <section key={i} className="space-y-2">
                  {s.h && <h2 className="!text-[15px] text-plum font-medium">{s.h}</h2>}
                  {(s.blocks as Block[]).map((b, j) =>
                    b.p ? <p key={j}>{b.p}</p>
                    : b.list ? <ul key={j} className="list-disc pl-5 space-y-1">{b.list.map((t, k) => <li key={k}>{t}</li>)}</ul>
                    : b.table ? (
                      <div key={j} className="overflow-x-auto">
                        <table className="w-full text-[12px] border-collapse">
                          <thead><tr>{b.table[0]!.map((h, k) => <th key={k} className="text-left bg-mist text-plum font-medium px-2.5 py-1.5 border border-gray-100">{h}</th>)}</tr></thead>
                          <tbody>{b.table.slice(1).map((r, k) => <tr key={k}>{r.map((c, m) => <td key={m} className="align-top px-2.5 py-1.5 border border-gray-100">{c}</td>)}</tr>)}</tbody>
                        </table>
                      </div>
                    ) : null,
                  )}
                </section>
              ))}
            </div>
          </>
        )}
      </article>
    </div>
  );
};

export default ClientPrivacy;
