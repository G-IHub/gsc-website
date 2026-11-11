import { useCallback, useEffect, useState } from "react";
import { Copy, Download, Plus, Search } from "lucide-react";
import { DOC_TYPES, STATUSES, formatMoney } from "../../shared/billing.js";
import { billing } from "./billingApi";
import { downloadPdf } from "./pdfClient.js";
import { Btn, inputClass, shortDate, statusStyle } from "./ui";
import type { Invoice, Settings } from "./types";

export default function InvoiceList({
  settings,
  onOpen,
  onNew,
  onSignedOut,
}: {
  settings: Settings;
  onOpen: (id: number) => void;
  onNew: (copyOf?: Invoice) => void;
  onSignedOut: () => void;
}) {
  const [rows, setRows] = useState<Invoice[]>([]);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [outstanding, setOutstanding] = useState(0);
  const [status, setStatus] = useState("");
  const [docType, setDocType] = useState("");
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);
  const symbol = settings.currency.symbol;

  useEffect(() => {
    const t = setTimeout(() => setQ(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(
    async (offset: number) => {
      setLoading(true);
      setError("");
      const r = await billing<{ invoices: Invoice[]; total: number; counts: Record<string, number>; outstanding: number }>("invoices_list", {
        query: { status, docType, q, offset: String(offset) },
      });
      setLoading(false);
      if (r.status === 401) return onSignedOut();
      if (!r.ok || !r.data) return setError("Could not load documents. Please try again.");
      setRows((prev) => (offset ? [...prev, ...r.data!.invoices] : r.data!.invoices));
      setTotal(r.data.total);
      setCounts(r.data.counts);
      setOutstanding(r.data.outstanding);
    },
    [status, docType, q, onSignedOut],
  );

  useEffect(() => {
    load(0);
  }, [load]);

  const changeStatus = async (inv: Invoice, next: string) => {
    const r = await billing<{ invoice: Invoice }>("invoice_status", { method: "POST", body: { id: inv.id, status: next } });
    if (r.status === 401) return onSignedOut();
    if (r.ok) load(0);
  };

  const pdf = async (inv: Invoice) => {
    setBusyId(inv.id!);
    try {
      await downloadPdf(inv, settings);
    } catch {
      setError("Could not make the PDF. Please try again.");
    }
    setBusyId(null);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-plum">Invoices</h1>
          <p className="text-sm text-muted">
            {total} {total === 1 ? "document" : "documents"}
            {outstanding > 0 && <> · <strong className="text-plum">{formatMoney(outstanding, symbol)}</strong> waiting to be paid</>}
          </p>
        </div>
        <Btn variant="primary" onClick={() => onNew()}>
          <Plus size={16} /> New document
        </Btn>
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => setStatus("")} className={`px-4 py-1.5 rounded-full text-sm font-medium border ${status === "" ? "bg-plum text-white border-plum" : "bg-white text-plum border-gray-200"}`}>
          All
        </button>
        {STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatus(status === s ? "" : s)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border ${status === s ? "bg-plum text-white border-plum" : "bg-white text-plum border-gray-200"}`}
          >
            {s} <span className="opacity-60">· {counts[s] ?? 0}</span>
          </button>
        ))}
      </div>

      <div className="grid sm:grid-cols-[1fr_auto] gap-3">
        <div className="relative">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
          <input className={`${inputClass} pl-10`} placeholder="Search number, client or reference" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search documents" />
        </div>
        <select className={`${inputClass} sm:w-52`} value={docType} onChange={(e) => setDocType(e.target.value)} aria-label="Filter by type">
          <option value="">All types</option>
          {Object.entries(DOC_TYPES).map(([k, v]) => (
            <option key={k} value={k}>{v as string}</option>
          ))}
        </select>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="space-y-3">
        {rows.map((inv) => (
          <div key={inv.id} className="bg-white border border-gray-200/80 rounded-2xl p-4 md:p-5 grid md:grid-cols-[1.1fr_1.5fr_auto_auto] gap-x-6 gap-y-3 items-center hover:border-magenta/40 transition-colors">
            <button type="button" onClick={() => onOpen(inv.id!)} className="text-left">
              <span className="block font-semibold text-plum">{inv.number}</span>
              <span className="block text-xs text-muted">{DOC_TYPES[inv.docType as keyof typeof DOC_TYPES]} · {shortDate(inv.issueDate)}</span>
            </button>
            <button type="button" onClick={() => onOpen(inv.id!)} className="text-left">
              <span className="block text-[15px] text-ink">{inv.client.name || "(no client name)"}</span>
              <span className="block text-xs text-muted line-clamp-1">{[inv.client.org, inv.reference].filter(Boolean).join(" · ")}</span>
            </button>
            <div className="md:text-right">
              <span className="block font-semibold text-plum">{formatMoney(inv.total ?? 0, symbol)}</span>
              <select
                value={inv.status}
                onChange={(e) => changeStatus(inv, e.target.value)}
                className={`mt-1 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide border-0 ${statusStyle[inv.status]}`}
                aria-label={`Status of ${inv.number}`}
              >
                {STATUSES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <Btn onClick={() => pdf(inv)} disabled={busyId === inv.id} aria-label={`Download PDF of ${inv.number}`}>
                <Download size={14} /> {busyId === inv.id ? "…" : "PDF"}
              </Btn>
              <Btn onClick={() => onNew(inv)} aria-label={`Copy ${inv.number}`}>
                <Copy size={14} />
              </Btn>
            </div>
          </div>
        ))}
        {!loading && rows.length === 0 && !error && (
          <p className="text-center text-muted py-14">{status || docType || q ? "No documents match those filters." : "No documents yet. Click New document to make the first one."}</p>
        )}
      </div>

      {rows.length < total && (
        <div className="text-center">
          <Btn onClick={() => load(rows.length)} disabled={loading}>
            {loading ? "Loading…" : `Load more (${total - rows.length} left)`}
          </Btn>
        </div>
      )}
    </div>
  );
}
