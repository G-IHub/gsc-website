import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { services } from "../../data/site";
import { serviceVisuals } from "./ServiceVisuals";
import { usePrefersReducedMotion } from "../motion";

// One-line summaries for the showcase (full detail lives on the Services page)
const headlines: Record<string, string> = {
  "contract-research": "Research designed, coordinated and executed against an agreed scope.",
  bioinformatics: "From raw sequences to integrated omics insight.",
  consulting: "Turn scientific questions into executable projects.",
  "drug-discovery": "Computational support for early-stage discovery.",
  "ai-software": "Tools, pipelines and AI that make research faster.",
  "project-management": "Multi-team research, delivered on milestones.",
};

const shortTitle = (t: string) => t.split(" & ")[0];

const ServicesShowcase = () => {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    if (paused || reduced) return;
    const t = setInterval(() => setActive((n) => (n + 1) % services.length), 5000);
    return () => clearInterval(t);
  }, [paused, reduced]);

  const select = (i: number) => {
    setActive(i);
    setPaused(true);
  };

  const s = services[active];
  const Visual = serviceVisuals[s.id];

  return (
    <div className="grid lg:grid-cols-[1fr_1.35fr] gap-6 lg:gap-10" onMouseEnter={() => setPaused(true)}>
      {/* Service selector */}
      <div role="tablist" aria-label="Services" className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible -mx-4 px-4 lg:mx-0 lg:px-0 pb-1">
        {services.map((svc, i) => {
          const isActive = i === active;
          return (
            <button
              key={svc.id}
              role="tab"
              aria-selected={isActive}
              onClick={() => select(i)}
              className={`group shrink-0 text-left rounded-2xl px-4 py-3 lg:px-5 lg:py-4 border transition-all ${
                isActive
                  ? "bg-plum border-plum text-white shadow-lg shadow-plum/20"
                  : "bg-white border-gray-200/80 text-plum hover:border-magenta/40"
              }`}
            >
              <span className="flex items-center gap-3">
                <span className={`text-xs font-semibold ${isActive ? "text-lime" : "text-magenta-dark"}`}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="font-semibold text-sm lg:text-[15px] whitespace-nowrap lg:whitespace-normal">
                  {shortTitle(svc.title)}
                </span>
              </span>
              {/* progress bar for the auto-rotation */}
              <span className="hidden lg:block mt-3 h-0.5 rounded-full bg-white/10 overflow-hidden">
                {isActive && !paused && !reduced && (
                  <span key={active} className="block h-full bg-lime origin-left" style={{ animation: "bar-fill 5s linear both" }} />
                )}
              </span>
            </button>
          );
        })}
      </div>

      {/* Active service panel */}
      <div key={s.id} role="tabpanel" className="rounded-3xl border border-gray-200/80 bg-white p-4 sm:p-5" style={{ animation: "word-in 0.45s ease both" }}>
        <div className="h-52 sm:h-60">
          <Visual />
        </div>
        <div className="px-2 pt-6 pb-2">
          <h3 className="text-plum font-bold text-xl leading-snug">{s.title}</h3>
          <p className="mt-2 text-muted">{headlines[s.id]}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {s.items.slice(0, 4).map((item) => (
              <span key={item} className="text-xs text-plum bg-magenta-tint rounded-full px-3 py-1.5">
                {item}
              </span>
            ))}
          </div>
          <Link
            to={`/services#${s.id}`}
            className="mt-5 inline-flex items-center gap-1.5 text-magenta-dark font-medium text-sm hover:gap-2.5 transition-all"
          >
            Explore this service <ArrowRight size={15} />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ServicesShowcase;
