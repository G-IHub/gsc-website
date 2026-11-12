import { useState } from "react";
import { Plus, X } from "lucide-react";
import { billing } from "./billingApi";
import { Btn, Card, Field, inputClass, smallInput } from "./ui";
import type { Settings } from "./types";

// Details printed on every document, defaults for new ones, numbering, and the words to strip from pasted text.

export default function BillingSettings({
  settings,
  onSaved,
  onSignedOut,
}: {
  settings: Settings;
  onSaved: (s: Settings) => void;
  onSignedOut: () => void;
}) {
  const [s, setS] = useState<Settings>(settings);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  const co = (k: keyof Settings["company"], v: string) => setS({ ...s, company: { ...s.company, [k]: v } });
  const bank = (k: keyof Settings["bank"], v: string) => setS({ ...s, bank: { ...s.bank, [k]: v } });

  const save = async () => {
    setSaving(true);
    setMsg("");
    setError("");
    const r = await billing<{ settings: Settings }>("settings_save", { method: "POST", body: { settings: s } });
    setSaving(false);
    if (r.status === 401) return onSignedOut();
    if (!r.ok || !r.data) return setError(r.data?.error ?? "Could not save. Please try again.");
    setS(r.data.settings);
    onSaved(r.data.settings);
    setMsg("Saved");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-plum">Billing settings</h1>
        <p className="text-sm text-muted">These details appear on every invoice, pro-forma and quotation.</p>
      </div>

      <Card title="Company details">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Company name"><input className={inputClass} value={s.company.name} onChange={(e) => co("name", e.target.value)} /></Field>
          <Field label="Line under the name"><input className={inputClass} value={s.company.tagline} onChange={(e) => co("tagline", e.target.value)} /></Field>
          <Field label="Address" className="sm:col-span-2"><input className={inputClass} value={s.company.address} onChange={(e) => co("address", e.target.value)} /></Field>
          <Field label="Email"><input className={inputClass} value={s.company.email} onChange={(e) => co("email", e.target.value)} /></Field>
          <Field label="Phone"><input className={inputClass} value={s.company.phone} onChange={(e) => co("phone", e.target.value)} /></Field>
          <Field label="Website"><input className={inputClass} value={s.company.website} onChange={(e) => co("website", e.target.value)} /></Field>
          <span />
          <Field label="Registration number (optional)"><input className={inputClass} value={s.company.regNo} onChange={(e) => co("regNo", e.target.value)} /></Field>
          <Field label="Tax or VAT number (optional)"><input className={inputClass} value={s.company.taxNo} onChange={(e) => co("taxNo", e.target.value)} /></Field>
        </div>
      </Card>

      <Card title="Payment details">
        <p className="text-sm text-muted mb-4">Shown at the bottom of each document so clients know where to pay. Leave blank to hide the section.</p>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Account name"><input className={inputClass} value={s.bank.accountName} onChange={(e) => bank("accountName", e.target.value)} /></Field>
          <Field label="Bank"><input className={inputClass} value={s.bank.bankName} onChange={(e) => bank("bankName", e.target.value)} /></Field>
          <Field label="Account number"><input className={inputClass} value={s.bank.accountNumber} onChange={(e) => bank("accountNumber", e.target.value)} /></Field>
          <Field label="Anything else (optional)" hint="For example a branch or payment instructions"><input className={inputClass} value={s.bank.extra} onChange={(e) => bank("extra", e.target.value)} /></Field>
        </div>
      </Card>

      <Card title="Tax, dates and wording">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Field label="Currency code"><input className={inputClass} value={s.currency.code} onChange={(e) => setS({ ...s, currency: { ...s.currency, code: e.target.value } })} /></Field>
          <Field label="Currency symbol"><input className={inputClass} value={s.currency.symbol} onChange={(e) => setS({ ...s, currency: { ...s.currency, symbol: e.target.value } })} /></Field>
          <Field label="Tax name"><input className={inputClass} value={s.taxLabel} onChange={(e) => setS({ ...s, taxLabel: e.target.value })} /></Field>
          <Field label="Usual tax rate (%)" hint="Use 0 if you do not charge it. Changeable on each document.">
            <input className={inputClass} type="number" min="0" max="100" step="any" value={s.defaultTaxRate} onChange={(e) => setS({ ...s, defaultTaxRate: e.target.value })} />
          </Field>
          <Field label="Invoice due after (days)"><input className={inputClass} type="number" min="0" value={s.dueDays} onChange={(e) => setS({ ...s, dueDays: e.target.value })} /></Field>
          <Field label="Pro-forma or quote valid for (days)"><input className={inputClass} type="number" min="0" value={s.validDays} onChange={(e) => setS({ ...s, validDays: e.target.value })} /></Field>
        </div>
        <div className="grid gap-4 mt-4">
          <Field label="Usual terms"><textarea className={inputClass} rows={3} value={s.terms} onChange={(e) => setS({ ...s, terms: e.target.value })} /></Field>
          <Field label="Usual note (optional)"><textarea className={inputClass} rows={2} value={s.notes} onChange={(e) => setS({ ...s, notes: e.target.value })} /></Field>
        </div>
      </Card>

      <Card title="Our markup on sequencing">
        <p className="text-sm text-muted mb-4">
          For services in the Sequencing category, the price you enter on Services &amp; prices is what the partner lab charges you. This percentage is added on top, and the client sees only the total.
        </p>
        <div className="max-w-xs">
          <Field label="Markup on the partner lab's price (%)">
            <input className={inputClass} type="number" min="0" max="500" step="any" value={s.markup.sequencing} onChange={(e) => setS({ ...s, markup: { ...s.markup, sequencing: e.target.value } })} />
          </Field>
        </div>
      </Card>

      <Card title="Numbering">
        <p className="text-sm text-muted mb-4">Numbers look like PF-2026-0004. Change the starting letters, or set the last number used so the next one continues from it.</p>
        <div className="grid sm:grid-cols-3 gap-4">
          {(["invoice", "proforma", "quote"] as const).map((k) => (
            <div key={k} className="rounded-2xl bg-mist p-4 space-y-3">
              <p className="text-xs font-bold uppercase tracking-widest text-muted">{k === "invoice" ? "Invoices" : k === "proforma" ? "Pro-formas" : "Quotations"}</p>
              <Field label="Starts with"><input className={smallInput} value={s.prefixes[k]} onChange={(e) => setS({ ...s, prefixes: { ...s.prefixes, [k]: e.target.value } })} /></Field>
              <Field label="Last number used"><input className={smallInput} type="number" min="0" value={s.counters[k]} onChange={(e) => setS({ ...s, counters: { ...s.counters, [k]: Number(e.target.value) } })} /></Field>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Words to remove from other labs' documents">
        <p className="text-sm text-muted mb-4">
          When you paste text from a supplier's quote or invoice, these words are removed or swapped, so their name and product codes
          never reach your client. If any are still in a document, the invoice screen warns you before you download it.
        </p>
        <div className="space-y-2">
          {s.replacements.map((r, i) => (
            <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
              <input className={smallInput} placeholder="Find this" value={r.from} onChange={(e) => setS({ ...s, replacements: s.replacements.map((x, j) => (j === i ? { ...x, from: e.target.value } : x)) })} />
              <input className={smallInput} placeholder="Replace with (blank removes it)" value={r.to} onChange={(e) => setS({ ...s, replacements: s.replacements.map((x, j) => (j === i ? { ...x, to: e.target.value } : x)) })} />
              <button type="button" onClick={() => setS({ ...s, replacements: s.replacements.filter((_, j) => j !== i) })} className="p-1.5 text-muted hover:text-red-600" aria-label="Remove">
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
        <button type="button" onClick={() => setS({ ...s, replacements: [...s.replacements, { from: "", to: "" }] })} className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-magenta-dark hover:underline">
          <Plus size={15} /> Add a word
        </button>
      </Card>

      <div className="flex items-center gap-3">
        <Btn variant="primary" onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save settings"}
        </Btn>
        {msg && <span className="text-sm text-plum">{msg}</span>}
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>
    </div>
  );
}
