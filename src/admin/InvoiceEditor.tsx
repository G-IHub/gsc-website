import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowLeft, ArrowUp, ClipboardPaste, Copy, Download, Eraser, Eye, Plus, Save, Trash2, X } from "lucide-react";
import { DOC_TYPES, STATUSES, applyMarkup, applyReplacements, isSequencing, findLeftovers, formatMoney, invoiceTotals, lineAmount, parsePastedText } from "../../shared/billing.js";
import { billing } from "./billingApi";
import { downloadPdf, previewUrl } from "./pdfClient.js";
import TierEditor from "./TierEditor";
import { Btn, Card, Field, addDays, inputClass, smallInput, statusStyle, todayIso } from "./ui";
import type { Client, Discount, DocType, Invoice, Line, Service, Settings } from "./types";

const key = () => Math.random().toString(36).slice(2, 10);
const withKey = (l: Partial<Line>): Line => ({ description: "", qty: 1, mode: "unit", unitPrice: "", ...l, _k: key() }) as Line;
const emptyClient = (): Client => ({ name: "", org: "", address: "", email: "", phone: "" });

const dueFor = (settings: Settings, docType: DocType, issue: string) => addDays(issue, Number(docType === "invoice" ? settings.dueDays : settings.validDays) || 0);

const blankInvoice = (settings: Settings, docType: DocType = "invoice"): Invoice => {
  const issueDate = todayIso();
  return {
    number: "",
    docType,
    status: "Draft",
    issueDate,
    dueDate: dueFor(settings, docType, issueDate),
    client: emptyClient(),
    reference: "",
    items: [],
    discount: null,
    taxRate: settings.defaultTaxRate,
    notes: settings.notes,
    terms: settings.terms,
  };
};

// A copy of an earlier document: same lines and client, but a new number, today's date and Draft status
const copyOf = (inv: Invoice, settings: Settings): Invoice => {
  const issueDate = todayIso();
  return { ...inv, id: undefined, number: "", status: "Draft", issueDate, dueDate: dueFor(settings, inv.docType, issueDate), items: inv.items.map((l) => withKey(l)) };
};

const lineFromService = (s: Service, markup: number): Line =>
  withKey({
    description: s.description ? `${s.name}\n${s.description}` : s.name,
    qty: 1,
    mode: s.pricing === "tier" ? "tier" : "unit",
    unitPrice: s.pricing === "unit" && isSequencing(s.category) ? applyMarkup(s.unitPrice, markup) : s.unitPrice,
    tiers: s.pricing === "tier" ? s.tiers.map((t) => ({ ...t })) : undefined,
    extraPerSample: s.pricing === "tier" ? (s.extraPerSample ?? "") : undefined,
    unit: s.unit,
    serviceId: s.id,
  });

const methodNote: Record<string, string> = {
  estimated: "Estimated from the rows either side in your price table. Add an exact row to change it.",
  extended: "Beyond the last row of your price table, so the extra samples are priced per sample.",
  "pro-rata": "Below the first row of your price table.",
};

function LineCard({
  line,
  index,
  count,
  symbol,
  onChange,
  onMove,
  onRemove,
}: {
  line: Line;
  index: number;
  count: number;
  symbol: string;
  onChange: (patch: Partial<Line>) => void;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
}) {
  const calc = lineAmount(line);
  const d = line.discount;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 md:p-5">
      <div className="flex items-start gap-3">
        <span className="mt-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-plum text-xs font-semibold text-lime">{index + 1}</span>
        <textarea className={inputClass} rows={2} placeholder="What is being charged for" value={line.description} onChange={(e) => onChange({ description: e.target.value })} aria-label={`Description of line ${index + 1}`} />
        <div className="flex flex-col">
          <button type="button" onClick={() => onMove(-1)} disabled={index === 0} className="p-1 text-muted hover:text-plum disabled:opacity-30" aria-label="Move up"><ArrowUp size={15} /></button>
          <button type="button" onClick={() => onMove(1)} disabled={index === count - 1} className="p-1 text-muted hover:text-plum disabled:opacity-30" aria-label="Move down"><ArrowDown size={15} /></button>
        </div>
        <button type="button" onClick={onRemove} className="p-1.5 mt-1 text-muted hover:text-red-600" aria-label={`Remove line ${index + 1}`}><X size={18} /></button>
      </div>

      <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3">
        <Field label={line.mode === "tier" ? "Number of samples" : "Quantity"}>
          <input className={smallInput} type="number" min="0" step="any" value={line.qty} onChange={(e) => onChange({ qty: e.target.value })} />
        </Field>
        <Field label="Priced as">
          <select
            className={smallInput}
            value={line.mode}
            onChange={(e) => {
              const mode = e.target.value as Line["mode"];
              onChange(mode === "fixed" ? { mode, fixedAmount: line.fixedAmount === undefined || line.fixedAmount === "" ? calc.gross : line.fixedAmount } : { mode, tiers: mode === "tier" ? (line.tiers ?? []) : line.tiers });
            }}
          >
            <option value="unit">Price per unit</option>
            <option value="tier">Volume pricing</option>
            <option value="fixed">Fixed amount</option>
          </select>
        </Field>
        {line.mode === "unit" && (
          <>
            <Field label="Unit price">
              <input className={smallInput} type="number" min="0" step="any" value={line.unitPrice} onChange={(e) => onChange({ unitPrice: e.target.value })} />
            </Field>
            <Field label="Bill as (optional)" hint="Charge for a different number than shown">
              <input className={smallInput} type="number" min="0" step="any" value={line.billedQty ?? ""} onChange={(e) => onChange({ billedQty: e.target.value })} placeholder={String(line.qty)} />
            </Field>
          </>
        )}
        {line.mode === "fixed" && (
          <Field label="Amount" className="md:col-span-2">
            <input className={smallInput} type="number" min="0" step="any" value={line.fixedAmount ?? ""} onChange={(e) => onChange({ fixedAmount: e.target.value })} />
          </Field>
        )}
      </div>

      {line.mode === "tier" && (
        <div className="mt-3">
          <TierEditor
            tiers={line.tiers ?? []}
            extra={line.extraPerSample}
            unitLabel="sample"
            symbol={symbol}
            onChange={(tiers) => onChange({ tiers })}
            onExtra={(v) => onChange({ extraPerSample: v })}
          />
          {methodNote[calc.method] && <p className="mt-2 text-xs text-amber-700">{methodNote[calc.method]}</p>}
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        {d ? (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted">Discount</span>
            <select className={`${smallInput} w-28`} value={d.type} onChange={(e) => onChange({ discount: { ...d, type: e.target.value as "percent" | "amount" } })}>
              <option value="percent">percent</option>
              <option value="amount">amount</option>
            </select>
            <input className={`${smallInput} w-28`} type="number" min="0" step="any" value={d.value} onChange={(e) => onChange({ discount: { ...d, value: e.target.value } })} aria-label="Discount value" />
            <button type="button" onClick={() => onChange({ discount: null })} className="text-sm text-muted hover:text-plum">Remove</button>
          </div>
        ) : (
          <button type="button" onClick={() => onChange({ discount: { type: "percent", value: "" } })} className="text-sm font-medium text-magenta-dark hover:underline">
            + Add a discount to this line
          </button>
        )}
        <p className="text-right">
          {calc.discount > 0 && <span className="mr-3 text-xs text-muted line-through">{formatMoney(calc.gross, symbol)}</span>}
          <span className="font-semibold text-plum">{formatMoney(calc.net, symbol)}</span>
        </p>
      </div>
    </div>
  );
}

export default function InvoiceEditor({
  id,
  template,
  settings,
  services,
  onBack,
  onSaved,
  onDuplicate,
  onSignedOut,
}: {
  id: number | null;
  template?: Invoice;
  settings: Settings;
  services: Service[];
  onBack: () => void;
  onSaved: () => void;
  onDuplicate: (inv: Invoice) => void;
  onSignedOut: () => void;
}) {
  const [inv, setInv] = useState<Invoice | null>(id ? null : template ? copyOf(template, settings) : blankInvoice(settings));
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [preview, setPreview] = useState("");
  const [pasteText, setPasteText] = useState("");
  const [showPaste, setShowPaste] = useState(false);
  const [pasteMarkup, setPasteMarkup] = useState<string>(String(settings.markup?.sequencing ?? 25));
  const [clients, setClients] = useState<Client[]>([]);
  const dueTouched = useRef(Boolean(id));
  const symbol = settings.currency.symbol;

  useEffect(() => {
    if (!id) return;
    billing<{ invoice: Invoice }>("invoice_get", { query: { id: String(id) } }).then((r) => {
      if (r.status === 401) return onSignedOut();
      if (!r.ok || !r.data) return setLoadError("Could not open that document.");
      setInv({ ...r.data.invoice, items: r.data.invoice.items.map((l) => withKey(l)) });
    });
  }, [id, onSignedOut]);

  useEffect(() => {
    billing<{ clients: Client[] }>("clients_recent").then((r) => r.ok && r.data && setClients(r.data.clients));
  }, []);

  const totals = useMemo(() => (inv ? invoiceTotals(inv) : null), [inv]);
  const leftovers = useMemo(
    () =>
      inv
        ? findLeftovers([inv.reference, inv.notes, inv.terms, ...Object.values(inv.client), ...inv.items.map((l) => l.description)], settings.replacements)
        : [],
    [inv, settings.replacements],
  );

  if (loadError) return <p className="text-red-600">{loadError}</p>;
  if (!inv || !totals) return <p className="text-muted py-10">Loading…</p>;

  const set = (patch: Partial<Invoice>) => setInv((cur) => (cur ? { ...cur, ...patch } : cur));
  const setLine = (i: number, patch: Partial<Line>) => setInv((cur) => (cur ? { ...cur, items: cur.items.map((l, j) => (j === i ? { ...l, ...patch } : l)) } : cur));
  const addLines = (lines: Line[]) => setInv((cur) => (cur ? { ...cur, items: [...cur.items, ...lines] } : cur));
  const move = (i: number, dir: -1 | 1) =>
    setInv((cur) => {
      if (!cur) return cur;
      const items = [...cur.items];
      [items[i], items[i + dir]] = [items[i + dir], items[i]];
      return { ...cur, items };
    });

  const changeDate = (issueDate: string) => set({ issueDate, ...(dueTouched.current ? {} : { dueDate: dueFor(settings, inv.docType, issueDate) }) });
  const changeType = (docType: DocType) => set({ docType, ...(dueTouched.current ? {} : { dueDate: dueFor(settings, docType, inv.issueDate) }) });

  const addService = (value: string) => {
    const s = services.find((x) => String(x.id) === value);
    if (s) addLines([lineFromService(s, Number(settings.markup?.sequencing) || 0)]);
  };

  const importPasted = () => {
    const pct = Number(pasteMarkup) || 0;
    const lines = parsePastedText(pasteText, settings.replacements).map((l: Partial<Line>) =>
      withKey({
        ...l,
        ...(l.mode === "unit" && l.unitPrice !== "" ? { unitPrice: applyMarkup(l.unitPrice, pct) } : {}),
        ...(l.mode === "fixed" ? { fixedAmount: applyMarkup(l.fixedAmount, pct) } : {}),
      }),
    );
    if (!lines.length) return setMsg("Nothing recognised in that text.");
    addLines(lines);
    setPasteText("");
    setShowPaste(false);
    setMsg(`${lines.length} line${lines.length === 1 ? "" : "s"} added from the pasted text. Check the quantities and prices.`);
  };

  const clean = () => {
    const c = (t: string) => applyReplacements(t, settings.replacements);
    setInv({
      ...inv,
      reference: c(inv.reference),
      notes: c(inv.notes),
      terms: c(inv.terms),
      client: Object.fromEntries(Object.entries(inv.client).map(([k, v]) => [k, c(v)])) as Client,
      items: inv.items.map((l) => ({ ...l, description: c(l.description) })),
    });
    setMsg("Supplier words removed from the text.");
  };

  const save = async (): Promise<Invoice | null> => {
    setSaving(true);
    setError("");
    setMsg("");
    const payload = { ...inv, items: inv.items.map(({ _k, ...rest }) => rest) };
    const r = await billing<{ invoice: Invoice }>("invoice_save", { method: "POST", body: { invoice: payload } });
    setSaving(false);
    if (r.status === 401) {
      onSignedOut();
      return null;
    }
    if (!r.ok || !r.data) {
      setError(r.data?.error ?? "Could not save. Please try again.");
      return null;
    }
    const saved = { ...r.data.invoice, items: r.data.invoice.items.map((l) => withKey(l)) };
    setInv(saved);
    dueTouched.current = true;
    setMsg(`Saved as ${saved.number}`);
    onSaved();
    return saved;
  };

  const withPdf = async (kind: "download" | "preview") => {
    setError("");
    setBusy(kind);
    try {
      let current = inv;
      if (!current.number) {
        const saved = await save(); // numbered first, so the PDF never shows an empty number
        if (!saved) return;
        current = saved;
      }
      if (kind === "download") await downloadPdf(current, settings);
      else setPreview(await previewUrl(current, settings));
    } catch {
      setError("Could not make the PDF. Please try again.");
    } finally {
      setBusy("");
    }
  };

  const remove = async () => {
    if (!inv.id) return;
    const r = await billing("invoice_delete", { method: "POST", body: { id: inv.id } });
    if (r.status === 401) return onSignedOut();
    if (r.ok) {
      onSaved();
      onBack();
    }
  };

  const discount: Discount = inv.discount;
  const label = DOC_TYPES[inv.docType as keyof typeof DOC_TYPES] as string;

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <button type="button" onClick={onBack} className="inline-flex items-center gap-2 text-sm text-muted hover:text-plum">
          <ArrowLeft size={16} /> All documents
        </button>
        <div className="flex items-center gap-3">
          <span className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide ${statusStyle[inv.status]}`}>{inv.status}</span>
          <h1 className="font-journal text-2xl text-plum">{inv.number ? `${label} ${inv.number}` : `New ${label.toLowerCase()}`}</h1>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px] items-start">
        <div className="space-y-6">
          <Card title="Document">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Field label="Type">
                <select className={inputClass} value={inv.docType} onChange={(e) => changeType(e.target.value as DocType)}>
                  {Object.entries(DOC_TYPES).map(([k, v]) => (
                    <option key={k} value={k}>{v as string}</option>
                  ))}
                </select>
              </Field>
              <Field label="Number" hint="Leave blank to number it automatically">
                <input className={inputClass} value={inv.number} onChange={(e) => set({ number: e.target.value })} placeholder="Automatic" />
              </Field>
              <Field label="Status">
                <select className={inputClass} value={inv.status} onChange={(e) => set({ status: e.target.value as Invoice["status"] })}>
                  {STATUSES.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </Field>
              <Field label="Date">
                <input className={inputClass} type="date" value={inv.issueDate} onChange={(e) => changeDate(e.target.value)} />
              </Field>
              <Field label={inv.docType === "invoice" ? "Due date" : "Valid until"}>
                <input className={inputClass} type="date" value={inv.dueDate ?? ""} onChange={(e) => { dueTouched.current = true; set({ dueDate: e.target.value || null }); }} />
              </Field>
              <Field label="Reference (optional)" hint="Shown under the details, for example the project">
                <input className={inputClass} value={inv.reference} onChange={(e) => set({ reference: e.target.value })} />
              </Field>
            </div>
          </Card>

          <Card
            title="Client"
            action={
              clients.length > 0 ? (
                <select className={`${smallInput} max-w-56`} value="" onChange={(e) => e.target.value && set({ client: { ...emptyClient(), ...clients[Number(e.target.value)] } })} aria-label="Use an earlier client">
                  <option value="">Use an earlier client…</option>
                  {clients.map((c, i) => (
                    <option key={i} value={i}>{[c.name, c.org].filter(Boolean).join(", ")}</option>
                  ))}
                </select>
              ) : undefined
            }
          >
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Name"><input className={inputClass} value={inv.client.name} onChange={(e) => set({ client: { ...inv.client, name: e.target.value } })} /></Field>
              <Field label="Organization"><input className={inputClass} value={inv.client.org} onChange={(e) => set({ client: { ...inv.client, org: e.target.value } })} /></Field>
              <Field label="Address" className="sm:col-span-2"><textarea className={inputClass} rows={2} value={inv.client.address} onChange={(e) => set({ client: { ...inv.client, address: e.target.value } })} /></Field>
              <Field label="Email"><input className={inputClass} value={inv.client.email} onChange={(e) => set({ client: { ...inv.client, email: e.target.value } })} /></Field>
              <Field label="Phone"><input className={inputClass} value={inv.client.phone} onChange={(e) => set({ client: { ...inv.client, phone: e.target.value } })} /></Field>
            </div>
          </Card>

          <Card title="What you are charging for">
            <div className="space-y-3">
              {inv.items.map((l, i) => (
                <LineCard
                  key={l._k}
                  line={l}
                  index={i}
                  count={inv.items.length}
                  symbol={symbol}
                  onChange={(patch) => setLine(i, patch)}
                  onMove={(dir) => move(i, dir)}
                  onRemove={() => set({ items: inv.items.filter((_, j) => j !== i) })}
                />
              ))}
              {inv.items.length === 0 && <p className="text-sm text-muted py-4 text-center">No lines yet. Pick a service, add your own line, or paste from another document.</p>}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <select className={`${smallInput} max-w-72`} value="" onChange={(e) => addService(e.target.value)} aria-label="Add a service">
                <option value="">Add a service from your prices…</option>
                {[...new Set(services.filter((s) => s.active).map((s) => s.category || "Other"))].map((g) => (
                  <optgroup key={g} label={g}>
                    {services.filter((s) => s.active && (s.category || "Other") === g).map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <Btn onClick={() => addLines([withKey({})])}><Plus size={15} /> Add your own line</Btn>
              <Btn onClick={() => setShowPaste(!showPaste)}><ClipboardPaste size={15} /> Paste from another document</Btn>
            </div>

            {showPaste && (
              <div className="mt-4 rounded-2xl bg-mist p-4">
                <p className="text-sm text-muted mb-2">
                  Paste the table or the lines from another lab's quote or invoice. Rows with a quantity and prices become lines, and the words in
                  Settings (their name and product codes) are removed.
                </p>
                <textarea className={inputClass} rows={6} value={pasteText} onChange={(e) => setPasteText(e.target.value)} placeholder="Paste here" />
                <label className="mt-3 flex items-center gap-2 text-sm text-ink">
                  Add our markup of
                  <input className={smallInput} type="number" min="0" step="any" value={pasteMarkup} onChange={(e) => setPasteMarkup(e.target.value)} />
                  % to each price (use 0 if the prices are already ours)
                </label>
                <div className="mt-3 flex gap-2">
                  <Btn variant="primary" onClick={importPasted} disabled={!pasteText.trim()}>Add these lines</Btn>
                  <Btn variant="ghost" onClick={() => setShowPaste(false)}>Cancel</Btn>
                </div>
              </div>
            )}
          </Card>

          <Card title="Notes and terms">
            <div className="grid gap-4">
              <Field label="Notes (optional)"><textarea className={inputClass} rows={2} value={inv.notes} onChange={(e) => set({ notes: e.target.value })} /></Field>
              <Field label="Terms"><textarea className={inputClass} rows={3} value={inv.terms} onChange={(e) => set({ terms: e.target.value })} /></Field>
            </div>
          </Card>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-6">
          <Card title="Total">
            <div className="space-y-3">
              <div className="rounded-2xl bg-mist p-4">
                <label className="flex items-center gap-2 text-sm font-medium text-plum">
                  <input type="checkbox" checked={Boolean(discount)} onChange={(e) => set({ discount: e.target.checked ? { type: "percent", value: "" } : null })} />
                  Give a discount
                </label>
                {discount && (
                  <div className="mt-3 flex items-center gap-2">
                    <select className={`${smallInput} w-28`} value={discount.type} onChange={(e) => set({ discount: { ...discount, type: e.target.value as "percent" | "amount" } })}>
                      <option value="percent">percent</option>
                      <option value="amount">amount</option>
                    </select>
                    <input className={smallInput} type="number" min="0" step="any" value={discount.value} onChange={(e) => set({ discount: { ...discount, value: e.target.value } })} aria-label="Discount on the whole document" />
                  </div>
                )}
                <label className="mt-3 flex items-center gap-2 text-sm font-medium text-plum">
                  {settings.taxLabel} rate
                  <input className={`${smallInput} w-24`} type="number" min="0" max="100" step="any" value={inv.taxRate} onChange={(e) => set({ taxRate: e.target.value })} />
                  %
                </label>
              </div>

              <dl className="space-y-2 text-sm">
                <div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd>{formatMoney(totals.subtotal, symbol)}</dd></div>
                {totals.discount > 0 && <div className="flex justify-between"><dt className="text-muted">Discount</dt><dd>-{formatMoney(totals.discount, symbol)}</dd></div>}
                {totals.taxRate > 0 && <div className="flex justify-between"><dt className="text-muted">{settings.taxLabel} ({totals.taxRate}%)</dt><dd>{formatMoney(totals.tax, symbol)}</dd></div>}
                <div className="flex justify-between border-t border-gray-200 pt-3 text-lg font-bold text-plum"><dt>Total</dt><dd>{formatMoney(totals.total, symbol)}</dd></div>
              </dl>
            </div>
          </Card>

          {leftovers.length > 0 && (
            <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
              <p className="font-semibold">Another lab's words are still in this document</p>
              <p className="mt-1">Found: {leftovers.join(", ")}. Remove them before you send it to a client.</p>
              <Btn className="mt-3" onClick={clean}><Eraser size={14} /> Remove them</Btn>
            </div>
          )}

          <div className="space-y-2">
            <Btn variant="primary" className="w-full" onClick={save} disabled={saving}><Save size={15} /> {saving ? "Saving…" : "Save"}</Btn>
            <div className="grid grid-cols-2 gap-2">
              <Btn onClick={() => withPdf("preview")} disabled={Boolean(busy)}><Eye size={15} /> {busy === "preview" ? "…" : "Preview"}</Btn>
              <Btn onClick={() => withPdf("download")} disabled={Boolean(busy)}><Download size={15} /> {busy === "download" ? "…" : "PDF"}</Btn>
            </div>
            {inv.id && (
              <div className="grid grid-cols-2 gap-2">
                <Btn onClick={() => onDuplicate(inv)}><Copy size={15} /> Copy</Btn>
                <ConfirmDelete onConfirm={remove} />
              </div>
            )}
            {msg && <p className="text-sm text-plum">{msg}</p>}
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
        </aside>
      </div>

      {preview && (
        <div className="fixed inset-0 z-50 flex flex-col bg-plum/70 p-3 md:p-8" role="dialog" aria-label="PDF preview">
          <div className="mb-3 flex justify-end gap-2">
            <Btn variant="primary" onClick={() => withPdf("download")}><Download size={15} /> Download</Btn>
            <Btn onClick={() => { URL.revokeObjectURL(preview); setPreview(""); }}><X size={15} /> Close</Btn>
          </div>
          <iframe title="Invoice preview" src={preview} className="w-full flex-1 rounded-2xl bg-white" />
        </div>
      )}
    </div>
  );
}

function ConfirmDelete({ onConfirm }: { onConfirm: () => void }) {
  const [asking, setAsking] = useState(false);
  return asking ? (
    <Btn variant="danger" onClick={onConfirm}>Sure? Delete</Btn>
  ) : (
    <Btn onClick={() => setAsking(true)}><Trash2 size={15} /> Delete</Btn>
  );
}
