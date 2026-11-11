// Shapes used by the billing screens. Numbers can be held as text while someone is typing in a box.

export type Num = number | string;
export type Discount = { type: "percent" | "amount"; value: Num } | null;
export type Tier = { qty: Num; total: Num };
export type DocType = "invoice" | "proforma" | "quote";
export type DocStatus = "Draft" | "Sent" | "Paid" | "Cancelled";

export type Line = {
  _k: string; // only used by the screen to keep rows steady; the server ignores it
  description: string;
  qty: Num;
  mode: "unit" | "tier" | "fixed";
  unitPrice: Num;
  billedQty?: Num;
  fixedAmount?: Num;
  tiers?: Tier[];
  extraPerSample?: Num;
  discount?: Discount;
  unit?: string;
  serviceId?: number;
};

export type Client = { name: string; org: string; address: string; email: string; phone: string };

export type Invoice = {
  id?: number;
  number: string;
  docType: DocType;
  status: DocStatus;
  issueDate: string;
  dueDate: string | null;
  client: Client;
  reference: string;
  items: Line[];
  discount: Discount;
  taxRate: Num;
  notes: string;
  terms: string;
  subtotal?: number;
  total?: number;
};

export type Service = {
  id?: number;
  name: string;
  description: string;
  category: string;
  unit: string;
  pricing: "unit" | "tier";
  unitPrice: Num;
  extraPerSample: Num | null;
  tiers: Tier[];
  active: boolean;
  sort: number;
};

export type Settings = {
  company: { name: string; tagline: string; address: string; email: string; phone: string; website: string; regNo: string; taxNo: string };
  bank: { accountName: string; bankName: string; accountNumber: string; extra: string };
  currency: { code: string; symbol: string };
  defaultTaxRate: Num;
  taxLabel: string;
  dueDays: Num;
  validDays: Num;
  terms: string;
  notes: string;
  prefixes: { invoice: string; proforma: string; quote: string };
  counters: { invoice: number; proforma: number; quote: number };
  replacements: { from: string; to: string }[];
};
