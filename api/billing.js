import { adminConfigured, db, hasSession } from "./_lib.js";
import { DOC_TYPES, STATUSES, cleanTiers, defaultSettings, invoiceTotals, mergeSettings, round2, starterServices } from "../shared/billing.js";

// Invoices, the services catalogue and billing settings, for the admin page. One endpoint, chosen with ?action=
//   settings_get, settings_save
//   services_list, service_save, service_delete
//   invoices_list, invoice_get, invoice_save, invoice_status, invoice_delete, clients_recent
// Everything needs the admin login cookie; changes also need the X-Requested-With header (see admin.js).

const reply = (res, code, body) => {
  res.setHeader("Cache-Control", "no-store");
  return res.status(code).json(body);
};

const str = (v, max) => String(v ?? "").replace(/\r/g, "").trim().slice(0, max);
const num = (v, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};
const money = (v) => Math.max(round2(num(v)), 0);
const isoDate = (v) => (/^\d{4}-\d{2}-\d{2}$/.test(String(v ?? "")) ? String(v) : null);
const like = (q) => `%${String(q).slice(0, 100).replace(/[\\%_]/g, "\\$&")}%`;

// ---- settings ----

async function loadSettings(sql) {
  await sql.query(`INSERT INTO billing_settings (id, data) VALUES (1, $1::jsonb) ON CONFLICT (id) DO NOTHING`, [JSON.stringify(defaultSettings)]);
  const [row] = await sql.query(`SELECT data FROM billing_settings WHERE id = 1`);
  return { ...mergeSettings(row?.data), seeded: row?.data?.seeded === true };
}

const cleanSettings = (input, existing) => {
  const s = input && typeof input === "object" ? input : {};
  const c = s.company || {};
  const b = s.bank || {};
  const cur = s.currency || {};
  const merged = {
    ...existing,
    company: {
      name: str(c.name, 120),
      tagline: str(c.tagline, 120),
      address: str(c.address, 300),
      email: str(c.email, 120),
      phone: str(c.phone, 60),
      website: str(c.website, 120),
      regNo: str(c.regNo, 60),
      taxNo: str(c.taxNo, 60),
    },
    bank: {
      accountName: str(b.accountName, 120),
      bankName: str(b.bankName, 120),
      accountNumber: str(b.accountNumber, 60),
      extra: str(b.extra, 300),
    },
    currency: { code: str(cur.code, 8) || "NGN", symbol: str(cur.symbol, 4) || "₦" },
    markup: { sequencing: Math.min(Math.max(num(s.markup?.sequencing, 25), 0), 500) },
    defaultTaxRate: Math.min(Math.max(num(s.defaultTaxRate), 0), 100),
    taxLabel: str(s.taxLabel, 20) || "VAT",
    dueDays: Math.min(Math.max(Math.round(num(s.dueDays, 14)), 0), 365),
    validDays: Math.min(Math.max(Math.round(num(s.validDays, 30)), 0), 365),
    terms: str(s.terms, 2000),
    notes: str(s.notes, 2000),
    prefixes: {
      invoice: str(s.prefixes?.invoice, 12).replace(/[^A-Za-z0-9-]/g, "") || "INV",
      proforma: str(s.prefixes?.proforma, 12).replace(/[^A-Za-z0-9-]/g, "") || "PF",
      quote: str(s.prefixes?.quote, 12).replace(/[^A-Za-z0-9-]/g, "") || "QT",
    },
    replacements: (Array.isArray(s.replacements) ? s.replacements : [])
      .map((r) => ({ from: str(r?.from, 200), to: str(r?.to, 200) }))
      .filter((r) => r.from)
      .slice(0, 100),
  };
  if (s.counters && typeof s.counters === "object") {
    merged.counters = Object.fromEntries(
      Object.keys(DOC_TYPES).map((k) => [k, Math.max(Math.round(num(s.counters[k], existing.counters?.[k] ?? 0)), 0)]),
    );
  }
  return merged;
};

// ---- services ----

const toService = (r) => ({
  id: Number(r.id),
  name: r.name,
  description: r.description,
  category: r.category,
  unit: r.unit,
  pricing: r.pricing,
  unitPrice: Number(r.unit_price),
  extraPerSample: r.extra_per_sample === null ? null : Number(r.extra_per_sample),
  tiers: r.tiers || [],
  active: r.active,
  sort: r.sort,
});

async function seedServices(sql, settings) {
  if (settings.seeded) return;
  const [{ n }] = await sql.query(`SELECT count(*)::int AS n FROM services`);
  if (n === 0) {
    let i = 0;
    for (const s of starterServices) {
      await sql.query(
        `INSERT INTO services (name, category, unit, pricing, unit_price, tiers, sort) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7)`,
        [s.name, s.category, s.unit, s.pricing, s.unitPrice, JSON.stringify(s.tiers || []), i++],
      );
    }
  }
  await sql.query(`UPDATE billing_settings SET data = jsonb_set(data, '{seeded}', 'true'::jsonb) WHERE id = 1`);
  settings.seeded = true;
}

// ---- invoices ----

const INVOICE_COLUMNS = `id::int AS id, number, doc_type, status, to_char(issue_date, 'YYYY-MM-DD') AS issue_date,
  to_char(due_date, 'YYYY-MM-DD') AS due_date, client, reference, items, discount, tax_rate, notes, terms, subtotal, total`;

const toInvoice = (r) => ({
  id: r.id,
  number: r.number,
  docType: r.doc_type,
  status: r.status,
  issueDate: r.issue_date,
  dueDate: r.due_date,
  client: r.client || {},
  reference: r.reference,
  items: r.items || [],
  discount: r.discount || null,
  taxRate: Number(r.tax_rate),
  notes: r.notes,
  terms: r.terms,
  subtotal: Number(r.subtotal),
  total: Number(r.total),
});

const cleanLine = (l) => {
  const mode = ["unit", "tier", "fixed"].includes(l?.mode) ? l.mode : "unit";
  const line = {
    description: str(l?.description, 1000),
    qty: Math.max(num(l?.qty, 1), 0),
    mode,
    unitPrice: money(l?.unitPrice),
  };
  if (l?.billedQty !== undefined && l?.billedQty !== null && l?.billedQty !== "") line.billedQty = Math.max(num(l.billedQty), 0);
  if (mode === "fixed") line.fixedAmount = money(l?.fixedAmount);
  if (mode === "tier") {
    line.tiers = cleanTiers(l?.tiers).slice(0, 50);
    if (num(l?.extraPerSample) > 0) line.extraPerSample = money(l.extraPerSample);
  }
  if (l?.unit) line.unit = str(l.unit, 30);
  if (l?.serviceId) line.serviceId = Math.round(num(l.serviceId));
  const d = l?.discount;
  if (d && num(d.value) > 0) line.discount = { type: d.type === "amount" ? "amount" : "percent", value: Math.max(num(d.value), 0) };
  return line;
};

async function nextNumber(sql, docType, issueDate) {
  const settings = await loadSettings(sql);
  const prefix = settings.prefixes[docType] || "INV";
  const year = (issueDate || new Date().toISOString()).slice(0, 4);
  for (let attempt = 0; attempt < 20; attempt++) {
    const [row] = await sql.query(
      `UPDATE billing_settings SET data = jsonb_set(data, ARRAY['counters', $1::text], to_jsonb(coalesce((data #>> ARRAY['counters', $1::text])::int, 0) + 1)) WHERE id = 1 RETURNING (data #>> ARRAY['counters', $1::text])::int AS n`,
      [docType],
    );
    const number = `${prefix}-${year}-${String(row.n).padStart(4, "0")}`;
    const [taken] = await sql.query(`SELECT 1 AS x FROM invoices WHERE number = $1`, [number]);
    if (!taken) return number;
  }
  throw new Error("Could not find a free number");
}

export default async function handler(req, res) {
  if (!adminConfigured()) return reply(res, 503, { error: "Admin is not set up yet" });
  if (req.method !== "GET" && req.headers["x-requested-with"] !== "gsc-admin") return reply(res, 403, { error: "Forbidden" });

  let sql;
  try {
    sql = await db();
  } catch (err) {
    console.error("Billing database error:", err?.message);
    return reply(res, 500, { error: "Could not reach the database" });
  }
  if (!hasSession(req.headers.cookie)) return reply(res, 401, { error: "Not signed in" });

  const action = String(req.query?.action ?? "");
  const body = typeof req.body === "object" && req.body ? req.body : {};

  try {
    // ---- settings ----
    if (action === "settings_get" && req.method === "GET") {
      return reply(res, 200, { settings: await loadSettings(sql) });
    }
    if (action === "settings_save" && req.method === "POST") {
      const existing = await loadSettings(sql);
      const next = cleanSettings(body.settings, existing);
      await sql.query(`UPDATE billing_settings SET data = $1::jsonb WHERE id = 1`, [JSON.stringify(next)]);
      return reply(res, 200, { settings: next });
    }

    // ---- services ----
    if (action === "services_list" && req.method === "GET") {
      await seedServices(sql, await loadSettings(sql));
      const rows = await sql.query(`SELECT * FROM services ORDER BY sort, id`);
      return reply(res, 200, { services: rows.map(toService) });
    }
    if (action === "service_save" && req.method === "POST") {
      const s = body.service || {};
      const name = str(s.name, 200);
      if (!name) return reply(res, 400, { error: "Give the service a name" });
      const values = [
        name,
        str(s.description, 500),
        str(s.category, 60),
        str(s.unit, 30) || "unit",
        s.pricing === "tier" ? "tier" : "unit",
        money(s.unitPrice),
        num(s.extraPerSample) > 0 ? money(s.extraPerSample) : null,
        JSON.stringify(cleanTiers(s.tiers).slice(0, 50)),
        s.active !== false,
        Math.round(num(s.sort)),
      ];
      const id = Math.round(num(s.id));
      const rows = id
        ? await sql.query(
            `UPDATE services SET name=$2, description=$3, category=$4, unit=$5, pricing=$6, unit_price=$7, extra_per_sample=$8, tiers=$9::jsonb, active=$10, sort=$11 WHERE id=$1 RETURNING *`,
            [id, ...values],
          )
        : await sql.query(
            `INSERT INTO services (name, description, category, unit, pricing, unit_price, extra_per_sample, tiers, active, sort) VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10) RETURNING *`,
            values,
          );
      if (!rows.length) return reply(res, 404, { error: "Not found" });
      return reply(res, 200, { service: toService(rows[0]) });
    }
    if (action === "service_delete" && req.method === "POST") {
      const id = Math.round(num(body.id));
      if (!id) return reply(res, 400, { error: "Bad request" });
      await sql.query(`DELETE FROM services WHERE id = $1`, [id]);
      return reply(res, 200, { ok: true });
    }

    // ---- invoices ----
    if (action === "invoices_list" && req.method === "GET") {
      const { status, docType, q } = req.query;
      const where = [];
      const params = [];
      if (STATUSES.includes(status)) {
        params.push(status);
        where.push(`status = $${params.length}`);
      }
      if (Object.keys(DOC_TYPES).includes(docType)) {
        params.push(docType);
        where.push(`doc_type = $${params.length}`);
      }
      if (q) {
        params.push(like(q));
        const n = params.length;
        where.push(`(number ILIKE $${n} OR client->>'name' ILIKE $${n} OR client->>'org' ILIKE $${n} OR reference ILIKE $${n})`);
      }
      const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
      const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 100);
      const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);
      const rows = await sql.query(
        `SELECT ${INVOICE_COLUMNS} FROM invoices ${clause} ORDER BY issue_date DESC, id DESC LIMIT ${limit} OFFSET ${offset}`,
        params,
      );
      const [{ n: total }] = await sql.query(`SELECT count(*)::int AS n FROM invoices ${clause}`, params);
      const counts = Object.fromEntries(STATUSES.map((s) => [s, 0]));
      for (const c of await sql.query(`SELECT status, count(*)::int AS n FROM invoices GROUP BY status`)) counts[c.status] = c.n;
      const [{ owed }] = await sql.query(`SELECT coalesce(sum(total), 0) AS owed FROM invoices WHERE status = 'Sent' AND doc_type = 'invoice'`);
      return reply(res, 200, { invoices: rows.map(toInvoice), total, counts, outstanding: Number(owed) });
    }
    if (action === "invoice_get" && req.method === "GET") {
      const id = Math.round(num(req.query.id));
      const rows = await sql.query(`SELECT ${INVOICE_COLUMNS} FROM invoices WHERE id = $1`, [id]);
      if (!rows.length) return reply(res, 404, { error: "Not found" });
      return reply(res, 200, { invoice: toInvoice(rows[0]) });
    }
    if (action === "invoice_save" && req.method === "POST") {
      const inv = body.invoice || {};
      const docType = Object.keys(DOC_TYPES).includes(inv.docType) ? inv.docType : "invoice";
      const status = STATUSES.includes(inv.status) ? inv.status : "Draft";
      const issueDate = isoDate(inv.issueDate) || new Date().toISOString().slice(0, 10);
      const dueDate = isoDate(inv.dueDate);
      const c = inv.client || {};
      const client = { name: str(c.name, 200), org: str(c.org, 200), address: str(c.address, 400), email: str(c.email, 200), phone: str(c.phone, 60) };
      const items = (Array.isArray(inv.items) ? inv.items : []).slice(0, 100).map(cleanLine);
      const d = inv.discount;
      const discount = d && num(d.value) > 0 ? { type: d.type === "amount" ? "amount" : "percent", value: Math.max(num(d.value), 0) } : null;
      const taxRate = Math.min(Math.max(num(inv.taxRate), 0), 100);
      const totals = invoiceTotals({ items, discount, taxRate });
      const id = Math.round(num(inv.id));

      let number = str(inv.number, 40);
      if (!number) number = await nextNumber(sql, docType, issueDate);

      const values = [number, docType, status, issueDate, dueDate, JSON.stringify(client), str(inv.reference, 300), JSON.stringify(items), discount ? JSON.stringify(discount) : null, taxRate, str(inv.notes, 2000), str(inv.terms, 2000), totals.subtotal, totals.total];
      try {
        const rows = id
          ? await sql.query(
              `UPDATE invoices SET number=$2, doc_type=$3, status=$4, issue_date=$5, due_date=$6, client=$7::jsonb, reference=$8, items=$9::jsonb, discount=$10::jsonb, tax_rate=$11, notes=$12, terms=$13, subtotal=$14, total=$15, updated_at=now() WHERE id=$1 RETURNING ${INVOICE_COLUMNS}`,
              [id, ...values],
            )
          : await sql.query(
              `INSERT INTO invoices (number, doc_type, status, issue_date, due_date, client, reference, items, discount, tax_rate, notes, terms, subtotal, total) VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7,$8::jsonb,$9::jsonb,$10,$11,$12,$13,$14) RETURNING ${INVOICE_COLUMNS}`,
              values,
            );
        if (!rows.length) return reply(res, 404, { error: "Not found" });
        return reply(res, 200, { invoice: toInvoice(rows[0]) });
      } catch (err) {
        if (err?.code === "23505") return reply(res, 409, { error: "That number is already used by another document" });
        throw err;
      }
    }
    if (action === "invoice_status" && req.method === "POST") {
      const id = Math.round(num(body.id));
      if (!id || !STATUSES.includes(body.status)) return reply(res, 400, { error: "Bad request" });
      const rows = await sql.query(`UPDATE invoices SET status = $2, updated_at = now() WHERE id = $1 RETURNING ${INVOICE_COLUMNS}`, [id, body.status]);
      if (!rows.length) return reply(res, 404, { error: "Not found" });
      return reply(res, 200, { invoice: toInvoice(rows[0]) });
    }
    if (action === "invoice_delete" && req.method === "POST") {
      const id = Math.round(num(body.id));
      if (!id) return reply(res, 400, { error: "Bad request" });
      await sql.query(`DELETE FROM invoices WHERE id = $1`, [id]);
      return reply(res, 200, { ok: true });
    }
    if (action === "clients_recent" && req.method === "GET") {
      const rows = await sql.query(
        `SELECT client, max(created_at) AS last FROM invoices WHERE coalesce(client->>'name', '') <> '' GROUP BY client ORDER BY last DESC LIMIT 30`,
      );
      return reply(res, 200, { clients: rows.map((r) => r.client) });
    }

    return reply(res, 404, { error: "Unknown action" });
  } catch (err) {
    console.error("Billing error:", err?.message);
    return reply(res, 500, { error: "Something went wrong" });
  }
}
