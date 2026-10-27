import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check } from "lucide-react";

// Small uppercase label with an accent line (same pattern as the iGENE site)
export const Eyebrow = ({ children, light = false }: { children: ReactNode; light?: boolean }) => (
  <div className="flex items-center gap-3 mb-4">
    <div className={`w-8 h-0.5 ${light ? "bg-teal" : "bg-teal"}`}></div>
    <span
      className={`font-bold text-xs tracking-widest uppercase ${light ? "text-teal-tint" : "text-teal-dark"}`}
    >
      {children}
    </span>
  </div>
);

export const SectionHeading = ({
  eyebrow,
  title,
  intro,
  center = false,
  light = false,
}: {
  eyebrow?: string;
  title: string;
  intro?: ReactNode;
  center?: boolean;
  light?: boolean;
}) => (
  <div className={`mb-10 md:mb-12 max-w-3xl ${center ? "mx-auto text-center [&>div:first-child]:justify-center" : ""}`}>
    {eyebrow && <Eyebrow light={light}>{eyebrow}</Eyebrow>}
    <h2
      className={`text-2xl md:text-[28px] font-bold leading-tight tracking-tight ${light ? "text-white" : "text-navy"}`}
    >
      {title}
    </h2>
    {intro && (
      <div className={`mt-4 text-base leading-relaxed space-y-3 ${light ? "text-white/75" : "text-muted"}`}>
        {intro}
      </div>
    )}
  </div>
);

export const Section = ({
  children,
  tone = "white",
  id,
}: {
  children: ReactNode;
  tone?: "white" | "mist" | "navy";
  id?: string;
}) => {
  const bg = tone === "mist" ? "bg-mist" : tone === "navy" ? "bg-navy" : "bg-white";
  return (
    <section id={id} className={`${bg} py-16 md:py-24 px-4 sm:px-6 lg:px-8`}>
      <div className="max-w-6xl mx-auto">{children}</div>
    </section>
  );
};

type ButtonProps = {
  to: string;
  children: ReactNode;
  variant?: "primary" | "secondary" | "light";
};

export const Button = ({ to, children, variant = "primary" }: ButtonProps) => {
  const styles = {
    primary: "bg-teal hover:bg-teal-dark text-white shadow-md shadow-teal/20",
    secondary: "bg-white border border-gray-200 hover:border-gray-300 text-navy",
    light: "bg-white/10 border border-white/25 hover:bg-white/20 text-white",
  }[variant];
  return (
    <Link
      to={to}
      className={`${styles} inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full text-sm font-medium transition-colors`}
    >
      {children}
      {variant !== "secondary" && <ArrowRight size={15} />}
    </Link>
  );
};

// Top-of-page banner used by every inner page
export const PageHero = ({
  eyebrow,
  title,
  intro,
  children,
}: {
  eyebrow: string;
  title: string;
  intro?: ReactNode;
  children?: ReactNode;
}) => (
  <header className="bg-navy pt-36 md:pt-44 pb-16 md:pb-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
    <div className="absolute -top-40 -right-40 w-125 h-125 rounded-full bg-teal/20 blur-3xl pointer-events-none"></div>
    <div className="max-w-6xl mx-auto relative">
      <Eyebrow light>{eyebrow}</Eyebrow>
      <h1 className="text-3xl md:text-[44px] font-semibold text-white leading-tight tracking-tight max-w-3xl">
        {title}
      </h1>
      {intro && <div className="mt-5 text-base md:text-lg text-white/75 leading-relaxed max-w-2xl space-y-3">{intro}</div>}
      {children && <div className="mt-8 flex flex-col sm:flex-row gap-3">{children}</div>}
    </div>
  </header>
);

export const Card = ({
  title,
  children,
  index,
}: {
  title: string;
  children: ReactNode;
  index?: string;
}) => (
  <div className="bg-white border border-gray-200/80 rounded-2xl p-6 md:p-7 h-full hover:border-teal/40 hover:shadow-lg hover:shadow-navy/5 transition-all">
    {index && <span className="block text-teal-dark font-semibold text-sm mb-3">{index}</span>}
    <h3 className="text-navy font-semibold text-lg leading-snug mb-2">{title}</h3>
    <div className="text-muted text-[15px] leading-relaxed">{children}</div>
  </div>
);

export const CheckList = ({ items, columns = 1 }: { items: string[]; columns?: 1 | 2 }) => (
  <ul className={`grid gap-x-8 gap-y-3 ${columns === 2 ? "sm:grid-cols-2" : ""}`}>
    {items.map((item) => (
      <li key={item} className="flex gap-3 text-[15px] text-ink leading-snug">
        <span className="mt-0.5 shrink-0 w-5 h-5 rounded-full bg-teal-tint text-teal-dark flex items-center justify-center">
          <Check size={13} strokeWidth={3} />
        </span>
        {item}
      </li>
    ))}
  </ul>
);

// Closing call-to-action band
export const CtaBand = ({
  title,
  text,
  primary,
  secondary,
}: {
  title: string;
  text?: ReactNode;
  primary: { to: string; label: string };
  secondary?: { to: string; label: string };
}) => (
  <section className="px-4 sm:px-6 lg:px-8 py-16 md:py-20 bg-white">
    <div className="max-w-6xl mx-auto bg-navy rounded-3xl px-6 py-12 md:px-14 md:py-16 relative overflow-hidden">
      <div className="absolute -bottom-32 -left-24 w-96 h-96 rounded-full bg-teal/25 blur-3xl pointer-events-none"></div>
      <div className="relative max-w-2xl">
        <h2 className="text-2xl md:text-[32px] font-semibold text-white leading-tight tracking-tight">{title}</h2>
        {text && <div className="mt-4 text-white/75 text-base leading-relaxed space-y-3">{text}</div>}
        <div className="mt-8 flex flex-col sm:flex-row gap-3">
          <Button to={primary.to}>{primary.label}</Button>
          {secondary && (
            <Button to={secondary.to} variant="light">
              {secondary.label}
            </Button>
          )}
        </div>
      </div>
    </div>
  </section>
);
