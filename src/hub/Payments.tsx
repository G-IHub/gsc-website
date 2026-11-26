import { useState } from "react";
import { Btn, Card, smallInput } from "../admin/ui";
import { errorText, hub } from "./hubApi";
import { Pill } from "./bits";

type Row = { id: number; name: string; amount: number; due_date: string | null; received_date: string | null; status: string };
const STATUS_LABEL: Record<string, string> = { planned: "Planned", due: "Due", received: "Received", not_used: "Not used" };
const STATUS_STYLE: Record<string, string> = { planned: "bg-gray-200 text-gray-700", due: "bg-amber-100 text-amber-800", received: "bg-lime text-plum", not_used: "bg-gray-100 text-gray-500" };
const fmt = (n: number) => `₦${n.toLocaleString()}`;
const field = "bg-white border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-magenta";

// Payment schedule: Finance and management only. Opening it is logged, like the fee.
// Marking a row Received updates "Received" in the fees card automatically.
const Payments = ({ projectId }: { projectId: number }) => {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [fee, setFee] = useState<number | null>(null);
  const [feeEdit, setFeeEdit] = useState<string | null>(null);
  const [msg, setMsg] = useState("");

  const show = async () => {
    const r = await hub<{ payments: Row[] }>("payments", { query: { id: String(projectId) } });
    if (r.ok && r.data) setRows(r.data.payments);
    else return setMsg(errorText(r));
    const m = await hub<{ money: { fee: number } }>("money", { query: { id: String(projectId) } });
    if (m.ok && m.data) setFee(m.data.money.fee);
  };
  const saveFee = async () => {
    const r = await hub("money-set", { method: "POST", body: { project_id: projectId, fee: Number(feeEdit) } });
    if (r.ok) {
      setFee(Number(feeEdit));
      setFeeEdit(null);
      setMsg("");
    } else setMsg(errorText(r));
  };
  const send = async (action: string, body: Record<string, unknown>) => {
    const r = await hub<{ payments: Row[] }>(action, { method: "POST", body: { project_id: projectId, ...body } });
    if (r.ok && r.data) {
      setRows(r.data.payments);
      setMsg("");
    } else setMsg(errorText(r));
  };
  const save = (row: Row, patch: Partial<Row>) => send("payment-save", { ...row, ...patch });

  if (!rows) {
    return (
      <Card title="Payments">
        <p className="text-sm text-muted mb-3">Fee and payment schedule. Opening this is recorded in the access log. The client sees the fee, what is paid and these rows (except "Not used") in their portal.</p>
        <Btn onClick={show}>Show payments</Btn>
        {msg && <p className="text-sm text-red-600 mt-3">{msg}</p>}
      </Card>
    );
  }
  const received = rows.filter((r) => r.status === "received").reduce((s, r) => s + r.amount, 0);
  const expected = rows.filter((r) => r.status !== "not_used").reduce((s, r) => s + r.amount, 0);

  return (
    <Card title="Payments">
      {rows.length === 0 ? (
        <div className="space-y-3">
          <p className="text-sm text-muted">No schedule yet. The standard one is a non-refundable commitment fee of ₦20,000 (credited to the total), an optional middle payment, and the balance when the work is ready.</p>
          <div className="flex flex-wrap gap-2">
            <Btn variant="primary" onClick={() => send("payment-standard", {})}>Add the standard schedule</Btn>
            <Btn onClick={() => send("payment-save", { name: "Payment", amount: 0, status: "planned" })}>Add one payment</Btn>
          </div>
        </div>
      ) : (
        <>
          <ul className="divide-y divide-gray-100">
            {rows.map((r) => (
              <li key={r.id} className="py-3 text-sm space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <input className={`${field} flex-1 min-w-0`} defaultValue={r.name} onBlur={(e) => e.target.value !== r.name && save(r, { name: e.target.value })} aria-label="Payment name" />
                  <Pill cls={STATUS_STYLE[r.status] ?? STATUS_STYLE.planned!}>{STATUS_LABEL[r.status] ?? r.status}</Pill>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                  <label className="inline-flex items-center gap-1">₦<input className={`${field} w-28`} inputMode="decimal" defaultValue={String(r.amount)} onBlur={(e) => Number(e.target.value) !== r.amount && save(r, { amount: Number(e.target.value) })} aria-label="Amount" /></label>
                  <label className="inline-flex items-center gap-1">Due <input type="date" className={field} value={r.due_date ?? ""} onChange={(e) => save(r, { due_date: e.target.value || null })} /></label>
                  <select className={field} value={r.status} onChange={(e) => save(r, { status: e.target.value })} aria-label="Status">
                    {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                  {r.received_date && <span>received {r.received_date}</span>}
                  <button className="ml-auto hover:text-red-600" onClick={() => window.confirm(`Remove "${r.name}"?`) && send("payment-delete", { id: r.id })}>Remove</button>
                </div>
              </li>
            ))}
          </ul>
          <Btn className="mt-2" onClick={() => send("payment-save", { name: "Payment", amount: 0, status: "planned" })}>Add a payment</Btn>
        </>
      )}
      <div className="mt-3 rounded-2xl bg-mist text-xs text-muted p-3 space-y-2">
        <p>
          Total fee {fee !== null ? fmt(fee) : "…"} · received {fmt(received)} · still to receive {fee !== null ? fmt(Math.max(fee - received, 0)) : "…"}.
          {fee !== null && rows.length > 0 && Math.abs(expected - fee) > 0.5 && <span className="block text-amber-800 mt-1">The schedule adds up to {fmt(expected)}, not the fee.</span>}
        </p>
        {feeEdit === null ? (
          <button className="text-magenta-dark hover:underline" onClick={() => setFeeEdit(String(fee ?? 0))}>Change the total fee</button>
        ) : (
          <div className="flex items-center gap-2">₦<input className={`${field} w-32`} inputMode="decimal" value={feeEdit} onChange={(e) => setFeeEdit(e.target.value)} aria-label="Total fee" /><Btn variant="primary" onClick={saveFee}>Save</Btn><Btn variant="ghost" onClick={() => setFeeEdit(null)}>Cancel</Btn></div>
        )}
        <p>Budget, cost and margin for this project are visible to Finance and management only.</p>
      </div>
      {msg && <p className="text-sm text-red-600 mt-2" role="alert">{msg}</p>}
    </Card>
  );
};

export default Payments;
