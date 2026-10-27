import { useEffect, useState, type ComponentType } from "react";
import { Search, FileSignature, Users, FlaskConical, PackageCheck } from "lucide-react";
import { useInView, usePrefersReducedMotion } from "../motion";

export type PipelineStep = {
  icon: ComponentType<{ size?: number }>;
  title: string;
  line: string;
  outputs: string[];
};

const defaultSteps: PipelineStep[] = [
  {
    icon: Search,
    title: "Understand",
    line: "We unpack the scientific question, data, constraints and the outcome you need.",
    outputs: ["Discovery call", "Data review", "Objectives"],
  },
  {
    icon: FileSignature,
    title: "Define",
    line: "Scope, methods, deliverables, timeline and budget, agreed in writing.",
    outputs: ["Scope", "Proposal", "Contract"],
  },
  {
    icon: Users,
    title: "Assemble",
    line: "The right specialists, tools and resources for this engagement.",
    outputs: ["Team", "Tools", "Resources"],
  },
  {
    icon: FlaskConical,
    title: "Execute",
    line: "We run the work, report progress and resolve technical issues as they arise.",
    outputs: ["Milestones", "Updates", "QC"],
  },
  {
    icon: PackageCheck,
    title: "Deliver",
    line: "Agreed outputs, reviewed against the brief, with documentation.",
    outputs: ["Reports", "Code", "Results"],
  },
];

// Interactive research pipeline: auto-advances once in view, click any step to jump
const Pipeline = ({ steps = defaultSteps }: { steps?: PipelineStep[] }) => {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useInView<HTMLDivElement>(0.35);

  useEffect(() => {
    if (!inView || paused || reduced) return;
    const t = setInterval(() => setActive((n) => (n + 1) % steps.length), 3200);
    return () => clearInterval(t);
  }, [inView, paused, reduced, steps.length]);

  const progress = (active / (steps.length - 1)) * 100;
  const step = steps[active];

  return (
    <div ref={ref}>
      {/* Track */}
      <div className="relative">
        {/* line (horizontal on desktop, vertical on mobile) */}
        <div
          className="absolute hidden md:block top-7 h-0.5 bg-white/10"
          style={{ left: `${50 / steps.length}%`, right: `${50 / steps.length}%` }}
        >
          <div className="h-full bg-linear-to-r from-magenta to-lime transition-[width] duration-700 ease-out" style={{ width: `${progress}%` }} />
        </div>
        <div className="absolute md:hidden left-7 top-7 bottom-7 w-0.5 bg-white/10">
          <div className="w-full bg-linear-to-b from-magenta to-lime transition-[height] duration-700 ease-out" style={{ height: `${progress}%` }} />
        </div>

        <ol
          className="relative grid md:[grid-template-columns:var(--cols)] gap-4 md:gap-2"
          style={{ ["--cols" as string]: `repeat(${steps.length}, minmax(0, 1fr))` }}
        >
          {steps.map((s, i) => {
            const Icon = s.icon;
            const done = i <= active;
            const isActive = i === active;
            return (
              <li key={s.title}>
                <button
                  onClick={() => {
                    setActive(i);
                    setPaused(true);
                  }}
                  aria-current={isActive ? "step" : undefined}
                  className="flex md:flex-col items-center gap-4 md:gap-3 w-full text-left md:text-center"
                >
                  <span
                    className={`relative z-10 shrink-0 w-14 h-14 rounded-full flex items-center justify-center border-2 transition-all duration-500 ${
                      isActive
                        ? "bg-lime border-lime text-plum scale-110"
                        : done
                          ? "bg-plum-soft border-magenta text-white"
                          : "bg-plum border-white/15 text-white/50"
                    }`}
                    style={isActive && !reduced ? { animation: "pulse-ring 1.6s ease-out infinite" } : undefined}
                  >
                    <Icon size={22} />
                  </span>
                  <span>
                    <span className={`block text-[11px] font-bold tracking-widest uppercase ${done ? "text-lime" : "text-white/40"}`}>
                      Step {i + 1}
                    </span>
                    <span className={`block font-semibold ${isActive ? "text-white" : "text-white/70"}`}>{s.title}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>

      {/* Detail card for the active step */}
      <div
        key={active}
        className="mt-10 mx-auto max-w-2xl rounded-2xl border border-white/10 bg-white/[0.06] backdrop-blur p-6 md:p-7 text-center"
        style={{ animation: "word-in 0.45s ease both" }}
      >
        <p className="text-white text-lg leading-relaxed">{step.line}</p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {step.outputs.map((o) => (
            <span key={o} className="text-xs font-medium text-plum bg-lime rounded-full px-3 py-1">
              {o}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Pipeline;
