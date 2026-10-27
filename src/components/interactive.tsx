import { useState, type ComponentType, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

type IconType = ComponentType<{ size?: number; className?: string }>;

// Expandable rows: short title always visible, detail on click
export const Accordion = ({
  items,
  defaultOpen = 0,
}: {
  items: { title: string; body: ReactNode; icon?: IconType }[];
  defaultOpen?: number | null;
}) => {
  const [open, setOpen] = useState<number | null>(defaultOpen);
  return (
    <div className="divide-y divide-gray-200/80 border-y border-gray-200/80">
      {items.map(({ title, body, icon: Icon }, i) => {
        const isOpen = open === i;
        return (
          <div key={title}>
            <button
              onClick={() => setOpen(isOpen ? null : i)}
              aria-expanded={isOpen}
              className="w-full flex items-center gap-4 py-5 text-left group"
            >
              {Icon && (
                <span className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center transition-colors ${isOpen ? "bg-magenta text-white" : "bg-magenta-tint text-magenta-dark"}`}>
                  <Icon size={19} />
                </span>
              )}
              <span className="flex-1 font-semibold text-plum group-hover:text-magenta-dark transition-colors">{title}</span>
              <ChevronDown size={20} className={`shrink-0 text-muted transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} />
            </button>
            <div className={`grid transition-all duration-300 ease-out ${isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
              <div className="overflow-hidden">
                <div className={`pb-5 text-muted leading-relaxed text-[15px] ${Icon ? "pl-14" : ""}`}>{body}</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// List on the left, detail panel on the right (stacks on phones)
export const Explorer = <T extends { title: string; icon: IconType }>({
  items,
  renderPanel,
  dark = false,
}: {
  items: T[];
  renderPanel: (item: T, index: number) => ReactNode;
  dark?: boolean;
}) => {
  const [active, setActive] = useState(0);
  return (
    <div className="grid lg:grid-cols-[1fr_1.4fr] gap-6 lg:gap-10 items-start">
      <div role="tablist" className="grid sm:grid-cols-2 lg:grid-cols-1 gap-2">
        {items.map((item, i) => {
          const Icon = item.icon;
          const isActive = i === active;
          return (
            <button
              key={item.title}
              role="tab"
              aria-selected={isActive}
              onClick={() => setActive(i)}
              className={`flex items-center gap-3 text-left rounded-2xl border px-4 py-3 transition-all ${
                isActive
                  ? "bg-plum border-plum text-white shadow-lg shadow-plum/20"
                  : dark
                    ? "border-white/10 text-white/75 hover:border-white/30"
                    : "bg-white border-gray-200/80 text-plum hover:border-magenta/40"
              }`}
            >
              <span className={`w-9 h-9 shrink-0 rounded-lg flex items-center justify-center ${isActive ? "bg-lime text-plum" : "bg-magenta-tint text-magenta-dark"}`}>
                <Icon size={18} />
              </span>
              <span className="font-medium text-sm leading-snug">{item.title}</span>
            </button>
          );
        })}
      </div>
      <div key={active} role="tabpanel" className="lg:sticky lg:top-28" style={{ animation: "word-in 0.4s ease both" }}>
        {renderPanel(items[active], active)}
      </div>
    </div>
  );
};

// Pills that light up one after another — for short lists like models or values
export const ChipCloud = ({ items, tone = "light" }: { items: string[]; tone?: "light" | "dark" }) => (
  <div className="flex flex-wrap gap-2.5">
    {items.map((item, i) => (
      <span
        key={item}
        className={`text-sm font-medium px-4 py-2 rounded-full border ${
          tone === "dark" ? "border-white/15 text-white/85 bg-white/5" : "border-gray-200 text-plum bg-white"
        }`}
        style={{ animation: "word-in 0.5s ease both", animationDelay: `${i * 70}ms` }}
      >
        {item}
      </span>
    ))}
  </div>
);
