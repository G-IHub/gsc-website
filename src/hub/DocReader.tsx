import { ArrowLeft, Download, ExternalLink, FileDown } from "lucide-react";
import { driveLinks } from "../../shared/driveLinks.js";

// Reads one library document inside the hub (Google's own viewer), with download buttons.
type Doc = { title: string; kind: string; version: string; owner: string; updated: string; description: string; link: string };

const btn = "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px]";

const DocReader = ({ doc, onBack }: { doc: Doc; onBack: () => void }) => {
  const d = driveLinks(doc.link);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button onClick={onBack} className="inline-flex items-center gap-1.5 text-[12px] text-muted hover:text-plum"><ArrowLeft size={14} /> All documents</button>
        <div className="flex flex-wrap gap-2">
          {d.pdf && <a href={d.pdf} target="_blank" rel="noopener noreferrer" className={`${btn} bg-plum hover:bg-plum-soft text-white`}><FileDown size={12} /> Download PDF</a>}
          {d.original && <a href={d.original} target="_blank" rel="noopener noreferrer" className={`${btn} border border-plum text-plum hover:bg-white`}><Download size={12} /> Download {d.originalLabel}</a>}
          {doc.link && <a href={d.open} target="_blank" rel="noopener noreferrer" className={`${btn} border border-gray-300 text-ink hover:bg-white`}><ExternalLink size={12} /> {d.kind === "other" ? "Open" : "Open in Drive"}</a>}
        </div>
      </div>

      <div className="bg-white rounded-[14px] shadow-sm overflow-hidden">
        <div className="border-b border-gray-100 px-5 py-3">
          <p className="text-[15px] text-ink font-medium">{doc.title}</p>
          <p className="text-[11px] text-muted mt-0.5">{doc.kind} · Version {doc.version || "0.1"}{doc.owner ? ` · ${doc.owner}` : ""}</p>
        </div>
        {!doc.link ? (
          <p className="p-6 text-sm text-muted">This document has no link yet. Management adds the Google Drive share link with Edit.</p>
        ) : d.preview ? (
          <iframe
            title={doc.title}
            src={d.preview}
            className="block w-full bg-mist"
            style={{ height: "calc(100vh - 230px)", minHeight: 420, border: 0 }}
            referrerPolicy="no-referrer"
            allow="autoplay"
          />
        ) : (
          <div className="p-6 text-sm text-muted space-y-2">
            <p>This link is not a Google Drive link, so it cannot be shown inside the hub. Use <b className="text-plum">Open</b> to read it in a new tab.</p>
            <p>To read documents here, management can move the file to Google Drive and paste its share link.</p>
          </div>
        )}
        {d.kind === "drivefile" && (
          <p className="border-t border-gray-100 px-5 py-2.5 text-[11px] text-muted">
            To offer a PDF download as well, open the file in Google Drive, choose File → Save as Google Docs (or Sheets), and paste the new link here.
          </p>
        )}
        {d.preview && (
          <p className="border-t border-gray-100 px-5 py-2.5 text-[11px] text-muted">
            If the document does not show, the file is not shared with you on Google Drive. Ask management to share it with your Google account (or with anyone at Genomac who has the link).
          </p>
        )}
      </div>
    </div>
  );
};

export default DocReader;
