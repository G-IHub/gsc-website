import type { ReactNode } from "react";
import type { Project } from "./hubApi";

// Small shared pieces for the hub screens: pills, initials, dates, and what needs attention

export const HEALTH_STYLE: Record<string, string> = {
  green: "bg-lime text-plum",
  amber: "bg-amber-100 text-amber-800",
  red: "bg-red-100 text-red-700",
};
export const HEALTH_LABEL: Record<string, string> = { green: "On track", amber: "Watch", red: "Late" };
export const PAY_LABEL: Record<string, string> = { not_cleared: "Not cleared", cleared: "Cleared", balance_due: "Balance due", paid: "Paid" };
export const PAY_STYLE: Record<string, string> = {
  not_cleared: "bg-gray-200 text-gray-700",
  cleared: "bg-blue-100 text-blue-800",
  balance_due: "bg-amber-100 text-amber-800",
  paid: "bg-lime text-plum",
};

export const Pill = ({ cls, children }: { cls: string; children: ReactNode }) => (
  <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${cls}`}>{children}</span>
);

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");

export const Avatar = ({ name }: { name: string }) => (
  <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-magenta-tint text-magenta-dark text-xs font-bold shrink-0" aria-hidden="true">
    {initials(name)}
  </span>
);

export const StatTile = ({ label, value, note }: { label: string; value: ReactNode; note?: string }) => (
  <div className="bg-white border border-gray-200/80 rounded-3xl p-5">
    <p className="text-xs text-muted">{label}</p>
    <p className="font-journal text-3xl text-plum mt-1.5">{value}</p>
    {note && <p className="text-xs text-muted mt-1">{note}</p>}
  </div>
);

export const ViewingAs = ({ label }: { label: string }) => (
  <span className="inline-block rounded-full bg-amber-100 text-amber-800 px-3 py-1 text-xs font-medium">Viewing as: {label}</span>
);

// Whole days from today to the target date (negative = past). null when there is no date.
export const daysLeft = (iso: string | null | undefined, today = new Date()) => {
  if (!iso) return null;
  const t = new Date(`${iso}T00:00:00`);
  const d0 = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((t.getTime() - d0.getTime()) / 86400000);
};

export const daysText = (days: number | null) =>
  days === null ? "" : days < 0 ? `${-days} ${-days === 1 ? "day" : "days"} late` : days === 0 ? "Due today" : `${days} ${days === 1 ? "day" : "days"} left`;

export type Attention = { tag: string; cls: string; text: string; project: number };

// What deserves a look this week, worked out from the projects the person is allowed to see
export const attentionFor = (projects: Project[]): Attention[] => {
  const items: Attention[] = [];
  for (const p of projects) {
    const d = daysLeft(p.target_date);
    if (d !== null && d < 0) items.push({ tag: "Late", cls: "bg-red-100 text-red-700", text: `${p.ref} is ${-d} ${-d === 1 ? "day" : "days"} past its target date.`, project: p.id });
    else if (p.health === "red") items.push({ tag: "Late", cls: "bg-red-100 text-red-700", text: `${p.ref} is marked late.`, project: p.id });
    else if (d !== null && d <= 7) items.push({ tag: "Due soon", cls: "bg-amber-100 text-amber-800", text: `${p.ref} is due ${d === 0 ? "today" : `in ${d} ${d === 1 ? "day" : "days"}`}.`, project: p.id });
    if (p.payment_status === "balance_due") items.push({ tag: "Payment", cls: "bg-amber-100 text-amber-800", text: `${p.ref} has a balance due.`, project: p.id });
    if (p.payment_status === "not_cleared") items.push({ tag: "Clearance", cls: "bg-blue-100 text-blue-800", text: `${p.ref} is not cleared to start yet.`, project: p.id });
  }
  return items;
};
