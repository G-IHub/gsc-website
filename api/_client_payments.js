// Client portal part 4: the client's own payments — the fee, what is paid, what is left, the payment schedule
// finance keeps in the hub, and how to pay (the bank details from the admin billing settings).
//
// Rules: read-only for the client; only their own projects; rows finance marked "not used" are left out;
// nothing internal (who recorded a payment, the clearance checklist, the internal payment flag) is sent.

const ROW_LABEL = { planned: "Planned", due: "Due now", received: "Received" };

export async function handleClientPayments({ action, method, req, store, projectOr404, out }) {
  if (action !== "payments" || method !== "GET") return null;
  const p = await projectOr404(req.query?.id);
  if (!p) return out(404, { error: "Not found" });
  const money = await store.getMoney(p.id);
  const rows = (await store.listPayments(p.id)).filter((r) => r.status !== "not_used");
  const fee = Number(money?.fee) || 0;
  const paid = Number(money?.paid) || 0;
  const how = await store.getPayInstructions();
  return out(200, {
    currency: money?.currency || "NGN",
    fee,
    paid,
    balance: Math.max(Math.round((fee - paid) * 100) / 100, 0),
    schedule: rows.map((r) => ({ name: r.name, amount: r.amount, due_date: r.due_date, received_date: r.status === "received" ? r.received_date : null, status: r.status, label: ROW_LABEL[r.status] || r.status })),
    how_to_pay: how,
  });
}
