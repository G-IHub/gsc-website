import { useEffect, useMemo, useState } from "react";

// Looping sequencing visuals: a flow cell whose clusters flash one colour per base, streams of base
// calls, a signal trace, and counters that climb like a run in progress. Illustrations only, no real data.

const BASES = ["A", "T", "G", "C"];
const BASE_COLOR = ["#cde24a", "#b241b7", "#ffffffd9", "#8b5cf6"];

// Same numbers every time the page loads, so the picture does not jump around
const seeded = (seed: number) => () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
};

// Clusters on a flow cell: each one flashes A, T, G, C in turn, out of step with its neighbours
export const FlowCell = ({ cols, rows, className = "" }: { cols: number; rows: number; className?: string }) => {
  const dots = useMemo(() => {
    const r = seeded(11);
    return Array.from({ length: cols * rows }, () => ({
      on: r() > 0.22,
      delay: -r() * 8,
      duration: 5 + r() * 4,
    }));
  }, [cols, rows]);
  return (
    <div className={`grid gap-[5px] ${className}`} style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }} aria-hidden="true">
      {dots.map((d, i) => (
        <span
          key={i}
          className="aspect-square rounded-full"
          style={
            d.on
              ? { animation: `cluster-cycle ${d.duration}s linear infinite`, animationDelay: `${d.delay}s` }
              : { background: "rgba(255,255,255,0.06)" }
          }
        />
      ))}
    </div>
  );
};

// A line of base letters sliding past, like calls coming off the instrument
export const BaseStream = ({ seed, seconds, reverse = false }: { seed: number; seconds: number; reverse?: boolean }) => {
  const letters = useMemo(() => {
    const r = seeded(seed);
    return Array.from({ length: 48 }, () => Math.floor(r() * 4));
  }, [seed]);
  const row = (suffix: string) =>
    letters.map((b, i) => (
      <span key={`${suffix}${i}`} className="inline-block w-[1.1ch] text-center font-bold" style={{ color: BASE_COLOR[b] }}>
        {BASES[b]}
      </span>
    ));
  return (
    <div className="overflow-hidden whitespace-nowrap font-mono text-sm sm:text-base" aria-hidden="true">
      <div
        className="flex w-max"
        style={{ animation: `marquee ${seconds}s linear infinite`, animationDirection: reverse ? "reverse" : "normal" }}
      >
        <span className="flex">{row("a")}</span>
        <span className="flex">{row("b")}</span>
      </div>
    </div>
  );
};

// Four coloured signal peaks scrolling by, one colour per base
const TRACE_WIDTH = 400;
const buildTrace = () => {
  const r = seeded(5);
  const peaks: { x: number; base: number; amp: number }[] = Array.from({ length: 20 }, (_, i) => ({
    x: 10 + i * 20,
    base: Math.floor(r() * 4),
    amp: 38 + r() * 38,
  }));
  return BASE_COLOR.map((_, c) => {
    const mine = peaks.filter((p) => p.base === c);
    let d = "";
    for (let x = 0; x <= TRACE_WIDTH; x += 4) {
      const y = 84 - mine.reduce((s, p) => s + p.amp * Math.exp(-((x - p.x) ** 2) / 26), 0);
      d += `${x === 0 ? "M" : "L"}${x} ${y.toFixed(1)} `;
    }
    return d;
  });
};

export const SignalTrace = () => {
  const paths = useMemo(buildTrace, []);
  return (
    <svg viewBox={`0 0 ${TRACE_WIDTH * 2} 90`} preserveAspectRatio="none" className="h-24 w-full overflow-hidden sm:h-28" aria-hidden="true">
      <g style={{ animation: "trace-scroll 9s linear infinite" }}>
        {[0, TRACE_WIDTH, TRACE_WIDTH * 2].map((shift) => (
          <g key={shift} transform={`translate(${shift} 0)`}>
            {paths.map((d, c) => (
              <path key={c} d={d} fill="none" stroke={BASE_COLOR[c]} strokeWidth="1.8" strokeLinejoin="round" opacity="0.95" />
            ))}
          </g>
        ))}
      </g>
    </svg>
  );
};

// Numbers that climb while the run "progresses"
const useRun = () => {
  const [run, setRun] = useState({ reads: 1204000, cycle: 37, q30: 94.6 });
  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => {
      setRun((s) => {
        const reads = s.reads > 480000000 ? 1204000 : s.reads + 9000 + Math.floor(Math.random() * 26000);
        const cycle = reads < s.reads ? 1 : Math.min(150, 37 + Math.floor((reads - 1204000) / 3200000));
        return { reads, cycle, q30: Math.round((94 + Math.random() * 2.4) * 10) / 10 };
      });
    }, 160);
    return () => clearInterval(t);
  }, []);
  return run;
};

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left">
    <p className="text-[10px] font-bold uppercase tracking-widest text-white/50">{label}</p>
    <p className="mt-1 font-mono text-lg tabular-nums text-lime sm:text-xl">{value}</p>
  </div>
);

// The full "run in progress" screen
export const SequencingRun = () => {
  const run = useRun();
  const gb = (run.reads * 300) / 1e9;
  return (
    <div className="mx-auto w-full max-w-5xl text-left">
      <div className="mb-4 flex items-center justify-between gap-3 text-xs text-white/70">
        <span className="inline-flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-lime" style={{ animation: "pulse-ring 2s ease-out infinite" }} />
          Run in progress
        </span>
        <span className="font-mono">Cycle {run.cycle} / 150</span>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
        <div className="min-w-0 rounded-2xl border border-white/10 bg-black/20 p-4 sm:p-5">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-white/50">Flow cell, clusters imaging</p>
          <FlowCell cols={22} rows={11} />
        </div>

        <div className="grid min-w-0 gap-4">
          <div className="min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-black/20 p-4 sm:p-5">
            <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-white/50">Base calls</p>
            <div className="space-y-1.5">
              <BaseStream seed={3} seconds={26} />
              <BaseStream seed={8} seconds={34} reverse />
              <BaseStream seed={21} seconds={22} />
            </div>
          </div>
          <div className="min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-black/20 p-4 sm:p-5">
            <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-white/50">Signal</p>
            <SignalTrace />
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <Stat label="Reads" value={run.reads.toLocaleString("en-US")} />
        <Stat label="Q30" value={`${run.q30.toFixed(1)}%`} />
        <Stat label="Data (Gb)" value={gb.toFixed(2)} />
      </div>
    </div>
  );
};
