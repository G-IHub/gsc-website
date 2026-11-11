import type { ButtonHTMLAttributes, ReactNode } from "react";

// Small building blocks shared by the billing screens

export const inputClass =
  "w-full bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 text-[15px] text-ink placeholder:text-gray-400 focus:outline-none focus:border-magenta focus:ring-2 focus:ring-magenta/15 transition";

export const smallInput =
  "w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-ink placeholder:text-gray-400 focus:outline-none focus:border-magenta focus:ring-2 focus:ring-magenta/15 transition";

export const Field = ({ label, hint, children, className = "" }: { label: string; hint?: string; children: ReactNode; className?: string }) => (
  <label className={`block ${className}`}>
    <span className="block text-sm font-medium text-plum mb-1.5">{label}</span>
    {children}
    {hint && <span className="block text-xs text-muted mt-1">{hint}</span>}
  </label>
);

type Variant = "primary" | "secondary" | "danger" | "ghost";
const variants: Record<Variant, string> = {
  primary: "bg-magenta hover:bg-magenta-dark text-white disabled:opacity-60",
  secondary: "bg-white border border-gray-200 hover:border-gray-300 text-plum disabled:opacity-60",
  danger: "bg-red-600 hover:bg-red-700 text-white disabled:opacity-60",
  ghost: "text-muted hover:text-plum disabled:opacity-60",
};

export const Btn = ({ variant = "secondary", className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) => (
  <button
    type="button"
    {...props}
    className={`inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors ${variants[variant]} ${className}`}
  />
);

export const Card = ({ title, children, action }: { title?: string; children: ReactNode; action?: ReactNode }) => (
  <section className="bg-white border border-gray-200/80 rounded-3xl p-5 md:p-7">
    {(title || action) && (
      <div className="flex items-center justify-between gap-3 mb-4">
        {title && <h2 className="font-journal text-xl text-plum">{title}</h2>}
        {action}
      </div>
    )}
    {children}
  </section>
);

export const statusStyle: Record<string, string> = {
  Draft: "bg-gray-200 text-gray-700",
  Sent: "bg-blue-100 text-blue-800",
  Paid: "bg-lime text-plum",
  Cancelled: "bg-red-100 text-red-700",
};

export const todayIso = () => new Date().toISOString().slice(0, 10);

export const addDays = (iso: string, days: number) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

export const shortDate = (iso?: string | null) =>
  iso ? new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "";
