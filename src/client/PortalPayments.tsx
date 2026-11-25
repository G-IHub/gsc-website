import { useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";
import { api } from "./clientApi";
import { formatMoney } from "../../shared/billing.js";

// The client's own payments: fee, paid, balance, the schedule finance keeps, and how to pay. Read-only.
type Row = { name: string; amount: number; due_date: string | null; received_date: string | null; status: string; label: string };
type How = { accountName: string; bankName: string; accountNumber: string; extra: string; email: string; terms: string };
type Data = { currency: string; fee: number; paid: number; balance: number; schedule: Row[]; how_to_pay: How | null };

const SYMBOL: Record<string, string> = { NGN: "₦", USD: "$", GBP: "£", EUR: "€" };
const day = (iso: string | null) => (iso ? new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "");
const STYLE: Record<string, string> = { planned: "bg-gray-100 text-gray-600", due: "bg-amber-50 text-amber-700", received: "bg-lime/40 text-plum" };

const PortalPayments = ({ projectId }: { projectId: number }) => {
  const [d, setD] = useState<Data | null>(null);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    api<Data>("payments", { query: { id: String(projectId) } }).then((r) => r.ok && r.data && setD(r.data));
  }, [projectId]);
  if (!d || (!d.fee && d.schedule.length === 0)) return null;
  const money = (n: number) => formatMoney(n, SYMBOL[d.currency] ?? `${d.currency} `);
  const pct = d.fee ? Math.min(100, Math.round((d.paid / d.fee) * 100)) : 0;
  const copy = async () => {
    try { await navigator.clipboard.writeText(d.how_to_pay!.accountNumber); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { setCopied(false); }
  };
  return (
    <section className="bg-white rounded-[16px] p-4">
      <h2 className="text-[14px] text-ink font-medium mb-3">Payments</h2>
      <div className="grid gap-3 lg:grid-cols-[1fr_1fr]">
        <div>
          <div className="grid grid-cols-3 gap-2">
            {[["Total fee", d.fee], ["Paid", d.paid], ["Balance", d.balance]].map(([k, v]) => (
              <div key={k as string} className="rounded-xl bg-mist px-3 py-2">
                <p className="text-[10.5px] text-muted">{k}</p>
                <p className={`text-[15px] font-semibold ${k === "Balance" && d.balance > 0 ? "text-magenta-dark" : "text-plum"}`}>{money(v as number)}</p>
              </div>
            ))}
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mt-3"><i className="block h-full bg-plum" style={{ width: `${pct}%` }} /></div>
          <p className="text-[10.5px] text-muted mt-1">{pct}% paid{d.balance === 0 && d.fee > 0 ? " · thank you, fully paid" : ""}</p>
          <ul className="divide-y divide-gray-100 mt-3">
            {d.schedule.map((r, i) => (
              <li key={i} className="py-2 flex items-center gap-2.5 text-[12.5px]">
                <span className="flex-1 min-w-0">
                  <span className="block text-ink truncate">{r.name}</span>
                  <span className="block text-[10.5px] text-muted">{r.status === "received" ? `Received ${day(r.received_date)}` : r.due_date ? `Due ${day(r.due_date)}` : "Date to be agreed"}</span>
                </span>
                <span className="text-ink">{money(r.amount)}</span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] inline-flex items-center gap-1 ${STYLE[r.status] ?? STYLE.planned}`}>{r.status === "received" && <Check size={10} />}{r.label}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-gray-100 p-3 text-[12px]">
          <p className="text-[12.5px] text-ink font-medium mb-1.5">How to pay</p>
          {d.how_to_pay ? (
            <div className="space-y-1">
              <p><span className="text-muted">Bank:</span> {d.how_to_pay.bankName}</p>
              <p><span className="text-muted">Account name:</span> {d.how_to_pay.accountName}</p>
              <p className="flex items-center gap-2"><span className="text-muted">Account number:</span> <b className="tracking-wide">{d.how_to_pay.accountNumber}</b>
                <button onClick={copy} className="inline-flex items-center gap-1 text-[10.5px] text-plum border border-plum/40 rounded-full px-2 py-0.5"><Copy size={10} /> {copied ? "Copied" : "Copy"}</button></p>
              {d.how_to_pay.extra && <p className="text-muted whitespace-pre-wrap">{d.how_to_pay.extra}</p>}
              <p className="text-[11px] text-muted pt-1">Use your project code as the payment reference. {d.how_to_pay.email ? `Send proof of payment to ${d.how_to_pay.email} or in the messages here.` : "Send proof of payment in the messages here."}</p>
            </div>
          ) : (
            <p className="text-muted">Your team sends you the payment details with your invoice. Ask in the messages if you need them again.</p>
          )}
          <p className="text-[10.5px] text-muted mt-2">Payments show here once our finance team records them, usually within two working days. Your final files are released when the balance is paid.</p>
        </div>
      </div>
    </section>
  );
};

export default PortalPayments;
