import { useMemo } from "react";

// Looping bioinformatics visuals: an analysis pipeline working through its stages, reads lining up against a
// reference, a tree growing and a gene-expression heatmap. Illustrations only, no real data.

const BASE_COLOR: Record<string, string> = { A: "#cde24a", T: "#b241b7", G: "#ffffffd9", C: "#8b5cf6" };

const seeded = (seed: number) => () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
};

const STAGES = ["Quality control", "Alignment", "Variant calling", "Annotation", "Report"];
const CYCLE = 15; // seconds for one pass through the pipeline

// Stages lighting up one after another, each with a bar that fills while it is active
export const Pipeline = () => (
  <ol className="space-y-2.5" aria-hidden="true">
    {STAGES.map((s, i) => (
      <li key={s} className="flex items-center gap-3">
        <span
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/20 text-[11px] font-bold text-white/70"
          style={{ animation: `stage-on-${i} ${CYCLE}s linear infinite` }}
        >
          {i + 1}
        </span>
        <span className="w-28 shrink-0 text-sm text-white/85">{s}</span>
        <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
          <span
            className="block h-full origin-left rounded-full bg-linear-to-r from-magenta to-lime"
            style={{ animation: `stage-fill-${i} ${CYCLE}s linear infinite` }}
          />
        </span>
      </li>
    ))}
  </ol>
);

// Reads sliding into place under a reference, with the differences ringed
const REF = "ATGCGTACCTGAATGCCGTA";
const READS = ["ATGCGTACCTGA", "GCGTACGTGAAT", "ACCTGAATGCAG", "GTACCTGAATGC", "TGCGTACCTGAA"];
export const Alignment = () => (
  <div className="space-y-1.5 overflow-hidden font-mono text-[11px] sm:text-xs" aria-hidden="true">
    <div className="flex gap-[2px]">
      {REF.split("").map((b, i) => (
        <span key={i} className="flex h-5 w-5 items-center justify-center rounded-[3px] font-bold text-plum" style={{ background: BASE_COLOR[b] }}>
          {b}
        </span>
      ))}
    </div>
    {READS.map((read, r) => {
      const offset = [0, 2, 8, 3, 1][r];
      return (
        <div
          key={r}
          className="flex gap-[2px]"
          style={{
            paddingLeft: `${offset * 22}px`,
            ["--from" as string]: `${(r % 2 ? -1 : 1) * (60 + r * 20)}px`,
            animation: "align-slide 5s ease-out infinite",
            animationDelay: `${r * 0.3}s`,
          }}
        >
          {read.split("").map((b, i) => {
            const differs = REF[offset + i] !== b;
            return (
              <span
                key={i}
                className={`flex h-5 w-5 items-center justify-center rounded-[3px] font-bold text-plum ${differs ? "ring-2 ring-white" : "opacity-75"}`}
                style={{ background: BASE_COLOR[b] }}
              >
                {b}
              </span>
            );
          })}
        </div>
      );
    })}
  </div>
);

// A tree drawing itself branch by branch
const TREE: { d: string; len: number; delay: number }[] = [
  { d: "M10 60 H50", len: 40, delay: 0 },
  { d: "M50 28 V92", len: 64, delay: 0.5 },
  { d: "M50 28 H110", len: 60, delay: 1 },
  { d: "M50 92 H95", len: 45, delay: 1.2 },
  { d: "M110 14 V42", len: 28, delay: 1.7 },
  { d: "M110 14 H175", len: 65, delay: 2.1 },
  { d: "M110 42 H160", len: 50, delay: 2.3 },
  { d: "M95 78 V106", len: 28, delay: 1.9 },
  { d: "M95 78 H150", len: 55, delay: 2.4 },
  { d: "M95 106 H180", len: 85, delay: 2.6 },
];
const LEAVES: [number, number][] = [[175, 14], [160, 42], [150, 78], [180, 106]];
export const Tree = () => (
  <svg viewBox="0 0 200 120" className="h-28 w-full" aria-hidden="true">
    <g key="tree" fill="none" stroke="#cde24a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {TREE.map((t, i) => (
        <path
          key={i}
          d={t.d}
          strokeDasharray={t.len}
          style={{ ["--len" as string]: t.len, animation: "tree-draw 8s ease-in-out infinite", animationDelay: `${t.delay * 0.4}s` } as React.CSSProperties}
        />
      ))}
    </g>
    {LEAVES.map(([x, y], i) => (
      <circle key={i} cx={x} cy={y} r="4" fill="#b241b7" style={{ animation: "node-pulse 2.4s ease-in-out infinite", animationDelay: `${i * 0.4}s` }} />
    ))}
  </svg>
);

// Gene-expression style heatmap, cells brightening and fading
export const Heatmap = ({ cols = 16, rows = 6 }: { cols?: number; rows?: number }) => {
  const cells = useMemo(() => {
    const r = seeded(17);
    return Array.from({ length: cols * rows }, () => ({ hue: r(), delay: -r() * 6, dur: 4 + r() * 4 }));
  }, [cols, rows]);
  return (
    <div className="grid gap-[3px]" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }} aria-hidden="true">
      {cells.map((c, i) => (
        <span
          key={i}
          className="aspect-square rounded-[3px]"
          style={{
            background: c.hue > 0.5 ? "#b241b7" : "#cde24a",
            animation: `cell-glow ${c.dur}s ease-in-out infinite`,
            animationDelay: `${c.delay}s`,
          }}
        />
      ))}
    </div>
  );
};

const Card = ({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) => (
  <div className={`min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-black/20 p-4 sm:p-5 ${className}`}>
    <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-white/50">{label}</p>
    {children}
  </div>
);

// The full "analysis running" screen
export const AnalysisRun = () => (
  <div className="mx-auto w-full max-w-5xl text-left">
    <div className="mb-4 flex items-center justify-between gap-3 text-xs text-white/70">
      <span className="inline-flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-lime" style={{ animation: "pulse-ring 2s ease-out infinite" }} />
        Analysis running
      </span>
      <span className="font-mono">reproducible pipeline</span>
    </div>
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <Card label="Pipeline">
        <Pipeline />
      </Card>
      <Card label="Reads aligning to the reference">
        <Alignment />
      </Card>
      <Card label="Phylogenetic tree">
        <Tree />
      </Card>
      <Card label="Gene expression">
        <Heatmap />
      </Card>
    </div>
  </div>
);
