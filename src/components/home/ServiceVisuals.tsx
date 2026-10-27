// Small looping "lab screen" animations, one per service

const Screen = ({ children }: { children: React.ReactNode }) => (
  <div className="relative w-full h-full rounded-2xl bg-plum overflow-hidden border border-white/10">
    <div className="absolute top-0 inset-x-0 h-7 flex items-center gap-1.5 px-3 border-b border-white/10">
      <span className="w-2 h-2 rounded-full bg-white/20" />
      <span className="w-2 h-2 rounded-full bg-white/20" />
      <span className="w-2 h-2 rounded-full bg-white/20" />
    </div>
    <div className="absolute inset-0 top-7 p-5 flex items-center justify-center">{children}</div>
  </div>
);

// Research: document lines being read and highlighted
const ResearchVisual = () => (
  <Screen>
    <div className="w-full max-w-[260px] space-y-2.5">
      {[90, 70, 84, 60, 78, 50].map((w, i) => (
        <div key={i} className="h-2.5 rounded-full bg-white/10 overflow-hidden" style={{ width: `${w}%` }}>
          <div
            className="h-full bg-linear-to-r from-magenta to-lime origin-left"
            style={{ animation: "bar-fill 3.6s ease-in-out infinite", animationDelay: `${i * 0.35}s` }}
          />
        </div>
      ))}
      <div className="pt-2 flex gap-2">
        {["Question", "Evidence", "Plan"].map((t) => (
          <span key={t} className="text-[10px] text-lime border border-lime/30 rounded-full px-2 py-0.5">
            {t}
          </span>
        ))}
      </div>
    </div>
  </Screen>
);

// Bioinformatics: sequence reads sliding into alignment
const ALIGN_ROWS = ["ATGCGTACCTGA", "ATGCGTACGTGA", "ATGCATACCTGA", "ATGCGTACCTGA"];
const baseColor: Record<string, string> = { A: "bg-lime", T: "bg-magenta", G: "bg-white/70", C: "bg-[#8b5cf6]" };
const BioinformaticsVisual = () => (
  <Screen>
    <div className="space-y-2 font-mono">
      {ALIGN_ROWS.map((row, r) => (
        <div
          key={r}
          className="flex gap-[3px]"
          style={{ ["--from" as string]: `${(r % 2 ? -1 : 1) * (20 + r * 12)}px`, animation: "align-slide 4s ease-out infinite", animationDelay: `${r * 0.25}s` }}
        >
          {row.split("").map((b, i) => (
            <span
              key={i}
              className={`w-4 h-5 sm:w-5 rounded-[3px] ${baseColor[b]} ${r > 0 && b !== ALIGN_ROWS[0][i] ? "ring-2 ring-white" : "opacity-80"} text-[9px] text-plum font-bold flex items-center justify-center`}
            >
              {b}
            </span>
          ))}
        </div>
      ))}
    </div>
  </Screen>
);

// Consulting: a decision flow lighting up path by path
const ConsultingVisual = () => (
  <Screen>
    <svg viewBox="0 0 240 130" className="w-full max-w-[280px]">
      {[
        "M40 65 L110 30",
        "M40 65 L110 100",
        "M110 30 L190 20",
        "M110 30 L190 55",
        "M110 100 L190 110",
      ].map((d, i) => (
        <path
          key={d}
          d={d}
          stroke="#cde24a"
          strokeWidth="2"
          fill="none"
          strokeDasharray="120"
          style={{ ["--len" as string]: "120", animation: "draw-line 3s ease-in-out infinite alternate", animationDelay: `${i * 0.3}s` }}
        />
      ))}
      {[
        [40, 65, "Brief"],
        [110, 30, "Feasible"],
        [110, 100, "Refine"],
        [190, 20, "Method"],
        [190, 55, "Scope"],
        [190, 110, "Re-plan"],
      ].map(([x, y, t], i) => (
        <g key={String(t)} style={{ animation: "node-pulse 3s ease-in-out infinite", animationDelay: `${i * 0.35}s` }}>
          <circle cx={x as number} cy={y as number} r="7" fill="#b241b7" />
          <text x={x as number} y={(y as number) + 19} textAnchor="middle" fontSize="9" fill="#ffffffb3">
            {t}
          </text>
        </g>
      ))}
    </svg>
  </Screen>
);

// Drug discovery: a slowly rotating molecule
const DrugVisual = () => (
  <Screen>
    <svg viewBox="-70 -70 140 140" className="w-40 h-40 sm:w-44 sm:h-44">
      <g style={{ animation: "spin-slow 18s linear infinite", transformOrigin: "center" }}>
        {[
          [0, 0, 40, -10],
          [0, 0, -30, 30],
          [0, 0, -15, -40],
          [40, -10, 55, 25],
          [-30, 30, -55, 15],
          [-15, -40, 15, -55],
        ].map(([x1, y1, x2, y2], i) => (
          <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#ffffff55" strokeWidth="3" />
        ))}
        {[
          [0, 0, 12, "#b241b7"],
          [40, -10, 9, "#cde24a"],
          [-30, 30, 9, "#cde24a"],
          [-15, -40, 8, "#ffffffcc"],
          [55, 25, 6, "#b241b7"],
          [-55, 15, 6, "#ffffffcc"],
          [15, -55, 6, "#b241b7"],
        ].map(([cx, cy, r, fill], i) => (
          <circle key={i} cx={cx as number} cy={cy as number} r={r as number} fill={fill as string} />
        ))}
      </g>
      <circle r="62" fill="none" stroke="#cde24a" strokeOpacity="0.25" strokeDasharray="4 6" />
    </svg>
  </Screen>
);

// AI & software: a terminal typing a pipeline
const TERMINAL = [
  { text: "$ gsc-pipeline run --input samples/", w: "100%", color: "text-white/80" },
  { text: "✓ quality control", w: "60%", color: "text-lime" },
  { text: "✓ model inference", w: "62%", color: "text-lime" },
  { text: "→ writing report.html", w: "78%", color: "text-magenta-tint" },
];
const SoftwareVisual = () => (
  <Screen>
    <div className="w-full max-w-[280px] font-mono text-[11px] sm:text-xs space-y-2">
      {TERMINAL.map((l, i) => (
        <div
          key={l.text}
          className={`${l.color} whitespace-nowrap overflow-hidden`}
          style={{ ["--w" as string]: l.w, animation: "type-line 5s steps(28) infinite", animationDelay: `${i * 0.6}s` }}
        >
          {l.text}
        </div>
      ))}
      <span className="inline-block w-2 h-3.5 bg-lime align-middle" style={{ animation: "caret 1s steps(1) infinite" }} />
    </div>
  </Screen>
);

// Project management: timeline bars filling against milestones
const PMVisual = () => (
  <Screen>
    <div className="w-full max-w-[280px] space-y-3">
      {[
        ["Scope", 0, 30],
        ["Analysis", 20, 55],
        ["Review", 55, 25],
        ["Delivery", 75, 25],
      ].map(([label, start, width], i) => (
        <div key={String(label)} className="flex items-center gap-3">
          <span className="w-14 text-[10px] text-white/60">{label}</span>
          <div className="relative flex-1 h-3 rounded-full bg-white/10">
            <div
              className="absolute h-full rounded-full bg-linear-to-r from-magenta to-lime origin-left"
              style={{ left: `${start}%`, width: `${width}%`, animation: "bar-fill 4s ease-out infinite", animationDelay: `${i * 0.5}s` }}
            />
          </div>
        </div>
      ))}
      <div className="flex justify-end gap-1 pt-1">
        {[0, 1, 2].map((i) => (
          <span key={i} className="w-1.5 h-1.5 rounded-full bg-lime" style={{ animation: "node-pulse 1.5s ease-in-out infinite", animationDelay: `${i * 0.2}s` }} />
        ))}
      </div>
    </div>
  </Screen>
);

export const serviceVisuals: Record<string, () => React.JSX.Element> = {
  "contract-research": ResearchVisual,
  bioinformatics: BioinformaticsVisual,
  consulting: ConsultingVisual,
  "drug-discovery": DrugVisual,
  "ai-software": SoftwareVisual,
  "project-management": PMVisual,
};
