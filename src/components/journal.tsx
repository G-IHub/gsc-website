import type { ReactNode } from "react";

// Journal-style page pieces: serif headings, paper and white bands, and the connected step cards.

// Serif section heading
export const Heading = ({
  eyebrow,
  title,
  intro,
  center = false,
}: {
  eyebrow: string;
  title: string;
  intro?: string;
  center?: boolean;
}) => (
  <div className={`mb-10 md:mb-12 max-w-3xl ${center ? "mx-auto text-center" : ""}`}>
    <p className="mb-3 text-xs font-bold uppercase tracking-widest text-magenta-dark">{eyebrow}</p>
    <h2 className="font-journal text-3xl leading-tight text-plum md:text-[40px]">{title}</h2>
    {intro && <p className="mt-4 text-base leading-relaxed text-muted">{intro}</p>}
  </div>
);

// Page section on a paper-coloured or white background
export const Band = ({
  id,
  tone = "paper",
  children,
}: {
  id?: string;
  tone?: "paper" | "white";
  children: ReactNode;
}) => (
  <section id={id} className={`${tone === "paper" ? "bg-paper" : "bg-white"} px-4 py-16 sm:px-6 md:py-24 lg:px-8`}>
    <div className="mx-auto max-w-6xl">{children}</div>
  </section>
);

// Numbered cards joined by one line: zig-zag on desktop, a single column beside the line on phones
export const StepTimeline = ({ steps }: { steps: { title: string; text: string }[] }) => (
  <ol className="relative mx-auto max-w-4xl">
    <span
      aria-hidden="true"
      className="absolute bottom-12 left-5 top-12 w-px bg-linear-to-b from-magenta/60 via-plum/25 to-lime md:left-1/2"
    />
    {steps.map((s, i) => {
      const left = i % 2 === 0;
      return (
        <li
          key={s.title}
          className="relative grid grid-cols-[40px_1fr] items-center gap-x-4 pb-6 last:pb-0 md:grid-cols-[1fr_64px_1fr] md:gap-x-0"
        >
          <span className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full bg-plum font-journal text-lg text-lime ring-4 ring-white md:col-start-2 md:row-start-1 md:mx-auto">
            {i + 1}
          </span>
          <div
            className={`relative rounded-2xl border border-gray-200/80 bg-paper p-5 transition-all hover:-translate-y-0.5 hover:border-magenta/40 hover:shadow-lg hover:shadow-plum/5 md:row-start-1 md:p-6 ${
              left ? "md:col-start-1 md:text-right" : "md:col-start-3"
            }`}
          >
            <span
              aria-hidden="true"
              className={`absolute top-1/2 hidden h-px w-8 bg-plum/25 md:block ${left ? "-right-8" : "-left-8"}`}
            />
            <h3 className="font-journal text-xl text-plum">{s.title}</h3>
            <p className="mt-1.5 text-[15px] leading-relaxed text-muted">{s.text}</p>
          </div>
        </li>
      );
    })}
  </ol>
);
