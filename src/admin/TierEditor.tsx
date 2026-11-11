import { useState } from "react";
import { Plus, X } from "lucide-react";
import { cleanTiers, formatMoney, tierPrice } from "../../shared/billing.js";
import { smallInput } from "./ui";
import type { Num, Tier } from "./types";

// Edits a volume-pricing table: what the whole job costs for a given number of samples.
// A small calculator underneath shows the price for any quantity, so gaps in the table are never a surprise.

const methodNote: Record<string, string> = {
  tier: "from your table",
  estimated: "estimated: a straight line between two rows of the table",
  extended: "extended beyond the last row",
  "pro-rata": "pro-rata, below the first row",
  none: "",
};

export default function TierEditor({
  tiers,
  extra,
  unitLabel = "sample",
  symbol,
  onChange,
  onExtra,
}: {
  tiers: Tier[];
  extra: Num | null | undefined;
  unitLabel?: string;
  symbol: string;
  onChange: (tiers: Tier[]) => void;
  onExtra: (v: Num) => void;
}) {
  const [tryQty, setTryQty] = useState<Num>(5);
  const result = tierPrice(tiers, tryQty, extra);
  const set = (i: number, patch: Partial<Tier>) => onChange(tiers.map((t, j) => (j === i ? { ...t, ...patch } : t)));

  return (
    <div className="rounded-2xl bg-mist p-4">
      <div className="grid grid-cols-[1fr_1.4fr_auto] gap-2 text-xs font-bold uppercase tracking-widest text-muted mb-2">
        <span>Number of {unitLabel}s</span>
        <span>Total price</span>
        <span />
      </div>
      <div className="space-y-2">
        {tiers.map((t, i) => (
          <div key={i} className="grid grid-cols-[1fr_1.4fr_auto] gap-2 items-center">
            <input className={smallInput} type="number" min="0" step="any" value={t.qty} onChange={(e) => set(i, { qty: e.target.value })} aria-label="Number of samples" />
            <input className={smallInput} type="number" min="0" step="any" value={t.total} onChange={(e) => set(i, { total: e.target.value })} aria-label="Total price" />
            <button type="button" onClick={() => onChange(tiers.filter((_, j) => j !== i))} className="p-1.5 text-muted hover:text-red-600" aria-label="Remove row">
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
      <button type="button" onClick={() => onChange([...tiers, { qty: "", total: "" }])} className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-magenta-dark hover:underline">
        <Plus size={15} /> Add a row
      </button>

      <div className="mt-4 grid sm:grid-cols-2 gap-3 border-t border-gray-200 pt-4">
        <label className="block">
          <span className="block text-xs font-medium text-plum mb-1">Price for each {unitLabel} beyond the last row (optional)</span>
          <input
            className={smallInput}
            type="number"
            min="0"
            step="any"
            value={extra ?? ""}
            onChange={(e) => onExtra(e.target.value)}
            placeholder={cleanTiers(tiers).length ? `Default: ${formatMoney(tierPrice(tiers, cleanTiers(tiers).at(-1)!.qty + 1).total - cleanTiers(tiers).at(-1)!.total, symbol)}` : ""}
          />
        </label>
        <div>
          <span className="block text-xs font-medium text-plum mb-1">Try a quantity</span>
          <div className="flex items-center gap-2">
            <input className={`${smallInput} max-w-24`} type="number" min="0" step="any" value={tryQty} onChange={(e) => setTryQty(e.target.value)} aria-label="Quantity to try" />
            <span className="text-sm text-ink">
              = <strong>{formatMoney(result.total, symbol)}</strong>
            </span>
          </div>
          {methodNote[result.method] && <span className="block text-xs text-muted mt-1">{methodNote[result.method]}</span>}
        </div>
      </div>
    </div>
  );
}
