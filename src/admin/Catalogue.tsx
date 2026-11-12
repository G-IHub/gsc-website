import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { applyMarkup, cleanTiers, formatMoney, isSequencing } from "../../shared/billing.js";
import { billing } from "./billingApi";
import TierEditor from "./TierEditor";
import { Btn, Card, Field, inputClass } from "./ui";
import type { Service, Settings } from "./types";

// The services you invoice for, and their prices. Picking one of these on an invoice fills in the price,
// which can still be changed on that invoice.

const blank = (): Service => ({ name: "", description: "", category: "", unit: "sample", pricing: "unit", unitPrice: "", extraPerSample: null, tiers: [], active: true, sort: 0 });

export default function Catalogue({
  services,
  settings,
  reload,
  onSignedOut,
}: {
  services: Service[];
  settings: Settings;
  reload: () => Promise<void>;
  onSignedOut: () => void;
}) {
  const [editing, setEditing] = useState<Service | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const symbol = settings.currency.symbol;
  const markup = Number(settings.markup?.sequencing) || 0;

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    setError("");
    const r = await billing<{ service: Service }>("service_save", { method: "POST", body: { service: editing } });
    setSaving(false);
    if (r.status === 401) return onSignedOut();
    if (!r.ok) return setError(r.data?.error ?? "Could not save. Please try again.");
    setEditing(null);
    await reload();
  };

  const remove = async (id: number) => {
    const r = await billing("service_delete", { method: "POST", body: { id } });
    if (r.status === 401) return onSignedOut();
    setConfirmId(null);
    await reload();
  };

  const toggleActive = async (s: Service) => {
    const r = await billing("service_save", { method: "POST", body: { service: { ...s, active: !s.active } } });
    if (r.status === 401) return onSignedOut();
    await reload();
  };

  const price = (s: Service) => {
    if (s.pricing === "tier") {
      const t = cleanTiers(s.tiers);
      return t.length ? `Volume pricing, ${t.length} rows, from ${formatMoney(t[0].total, symbol)}` : "Volume pricing (no rows yet)";
    }
    if (isSequencing(s.category)) {
      return `Lab price ${formatMoney(Number(s.unitPrice) || 0, symbol)} + ${markup}% = ${formatMoney(applyMarkup(s.unitPrice, markup), symbol)} per ${s.unit || "unit"}`;
    }
    return `${formatMoney(Number(s.unitPrice) || 0, symbol)} per ${s.unit || "unit"}`;
  };

  const groups = [...new Set(services.map((s) => s.category || "Other"))];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-plum">Services &amp; prices</h1>
          <p className="text-sm text-muted">Set a price once, then pick the service on any invoice. You can still change a price on a single invoice.</p>
        </div>
        <Btn variant="primary" onClick={() => setEditing(blank())}>
          <Plus size={16} /> Add a service
        </Btn>
      </div>

      {editing && (
        <Card title={editing.id ? "Edit service" : "New service"}>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Service name" className="sm:col-span-2">
              <input className={inputClass} value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="For example: 16S rRNA sequencing" />
            </Field>
            <Field label="Description on the invoice (optional)" className="sm:col-span-2">
              <textarea className={inputClass} rows={2} value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
            </Field>
            <Field label="Category" hint="Groups services in the list, for example Sequencing or Analysis">
              <input className={inputClass} value={editing.category} onChange={(e) => setEditing({ ...editing, category: e.target.value })} />
            </Field>
            <Field label="Charged per" hint="sample, run, hour, library…">
              <input className={inputClass} value={editing.unit} onChange={(e) => setEditing({ ...editing, unit: e.target.value })} />
            </Field>
            <Field label="How is it priced?" className="sm:col-span-2">
              <select
                className={inputClass}
                value={editing.pricing}
                onChange={(e) => setEditing({ ...editing, pricing: e.target.value as Service["pricing"] })}
              >
                <option value="unit">One price per {editing.unit || "unit"}</option>
                <option value="tier">Volume pricing: the price depends on how many</option>
              </select>
            </Field>
            {editing.pricing === "unit" ? (
              <Field
                label={isSequencing(editing.category) ? `Partner lab's price per ${editing.unit || "unit"} (${settings.currency.code})` : `Price per ${editing.unit || "unit"} (${settings.currency.code})`}
                hint={isSequencing(editing.category) ? `Our price on invoices: ${formatMoney(applyMarkup(editing.unitPrice, markup), symbol)} (this plus ${markup}%)` : undefined}
              >
                <input className={inputClass} type="number" min="0" step="any" value={editing.unitPrice} onChange={(e) => setEditing({ ...editing, unitPrice: e.target.value })} />
              </Field>
            ) : (
              <div className="sm:col-span-2">
                <TierEditor
                  tiers={editing.tiers}
                  extra={editing.extraPerSample}
                  unitLabel={editing.unit || "sample"}
                  symbol={symbol}
                  onChange={(tiers) => setEditing({ ...editing, tiers })}
                  onExtra={(v) => setEditing({ ...editing, extraPerSample: v })}
                />
              </div>
            )}
            <label className="flex items-center gap-2 text-sm text-ink sm:col-span-2">
              <input type="checkbox" checked={editing.active} onChange={(e) => setEditing({ ...editing, active: e.target.checked })} />
              Offer this service when creating invoices
            </label>
          </div>
          {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
          <div className="mt-5 flex gap-2">
            <Btn variant="primary" onClick={save} disabled={saving}>
              {saving ? "Saving…" : "Save service"}
            </Btn>
            <Btn variant="ghost" onClick={() => { setEditing(null); setError(""); }}>
              Cancel
            </Btn>
          </div>
        </Card>
      )}

      {groups.map((g) => (
        <Card key={g} title={g}>
          <ul className="divide-y divide-gray-100">
            {services
              .filter((s) => (s.category || "Other") === g)
              .map((s) => (
                <li key={s.id} className="py-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                  <div className="flex-1 min-w-48">
                    <p className={`font-medium ${s.active ? "text-plum" : "text-muted line-through"}`}>{s.name}</p>
                    <p className="text-sm text-muted">{price(s)}</p>
                  </div>
                  <label className="flex items-center gap-2 text-xs text-muted">
                    <input type="checkbox" checked={s.active} onChange={() => toggleActive(s)} /> Offered
                  </label>
                  <Btn onClick={() => setEditing({ ...s, extraPerSample: s.extraPerSample ?? null })}>
                    <Pencil size={14} /> Edit
                  </Btn>
                  {confirmId === s.id ? (
                    <span className="flex items-center gap-2 text-sm">
                      <Btn variant="danger" onClick={() => remove(s.id!)}>Yes, delete</Btn>
                      <Btn variant="ghost" onClick={() => setConfirmId(null)}>Cancel</Btn>
                    </span>
                  ) : (
                    <button type="button" onClick={() => setConfirmId(s.id!)} className="p-2 text-muted hover:text-red-600" aria-label={`Delete ${s.name}`}>
                      <Trash2 size={16} />
                    </button>
                  )}
                </li>
              ))}
          </ul>
        </Card>
      ))}

      {!services.length && !editing && <p className="text-center text-muted py-10">No services yet. Add the first one to start.</p>}
    </div>
  );
}
