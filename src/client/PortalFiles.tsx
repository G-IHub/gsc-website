import { useEffect, useState } from "react";
import { Download, ExternalLink, Lock } from "lucide-react";
import { api } from "./clientApi";
import { driveLinks } from "../../shared/driveLinks.js";

// The client's final files. Before release: the names only, with a note on when they arrive.
type F = { id: number; title: string; kind: string; note?: string; version?: string; updated?: string; link?: string };

const PortalFiles = ({ projectId }: { projectId: number }) => {
  const [d, setD] = useState<{ released: boolean; released_at: string | null; files: F[] } | null>(null);
  useEffect(() => {
    api<{ released: boolean; released_at: string | null; files: F[] }>("files", { query: { id: String(projectId) } }).then((r) => r.ok && r.data && setD(r.data));
  }, [projectId]);
  if (!d || d.files.length === 0) return null;
  return (
    <section className="bg-white rounded-[16px] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <h2 className="text-[14px] text-ink font-medium">Your final files</h2>
        {d.released
          ? <span className="rounded-full bg-lime/40 text-plum px-2.5 py-0.5 text-[10.5px]">Released {d.released_at ? new Date(d.released_at).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : ""}</span>
          : <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 text-gray-600 px-2.5 py-0.5 text-[10.5px]"><Lock size={11} /> Released when the balance is paid</span>}
      </div>
      {!d.released && <p className="text-[11.5px] text-muted mb-2">Your team has shown you the work. These files are sent to you here as soon as the balance is paid.</p>}
      <ul className="divide-y divide-gray-100">
        {d.files.map((f) => {
          const l = f.link ? driveLinks(f.link) : null;
          return (
            <li key={f.id} className="py-2 flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-lg bg-magenta-tint text-magenta-dark flex items-center justify-center shrink-0 text-[9.5px] font-medium" aria-hidden="true">{f.kind.slice(0, 3)}</span>
              <div className="flex-1 min-w-0">
                <p className="text-[12.5px] text-ink truncate">{f.title}{f.version ? <span className="text-muted"> · {f.version}</span> : null}</p>
                <p className="text-[10.5px] text-muted truncate">{f.kind}{f.updated ? ` · updated ${f.updated}` : ""}{f.note ? ` · ${f.note}` : ""}</p>
              </div>
              {l && <a href={l.open} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full border border-plum text-plum px-3 py-1 text-[11px]"><ExternalLink size={12} /> Open</a>}
              {l?.original && <a href={l.original} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full bg-plum text-white px-3 py-1 text-[11px]"><Download size={12} /> Download</a>}
            </li>
          );
        })}
      </ul>
      {d.released && <p className="text-[10.5px] text-muted mt-2">If a file does not open, tell your team in the messages; they will check its sharing.</p>}
    </section>
  );
};

export default PortalFiles;
