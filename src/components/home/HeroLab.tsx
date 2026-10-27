// Animated "lab" visual for the hero: a rotating DNA helix over streaming sequence data

const BASES = "ACGT";
const seqColumn = (seed: number, length = 28) =>
  Array.from({ length }, (_, i) => BASES[(seed * 7 + i * 13 + ((i * seed) % 5)) % 4]);

const RUNGS = 16;

const chips = [
  { label: "FASTQ → QC", className: "top-[8%] -left-2 sm:left-0", delay: "0s" },
  { label: "Sequence alignment", className: "top-[38%] -right-2 sm:right-0", delay: "1.2s" },
  { label: "Variant calling", className: "bottom-[24%] left-0 sm:left-4", delay: "0.6s" },
  { label: "Report ✓", className: "bottom-[4%] right-6", delay: "1.8s" },
];

const HeroLab = () => (
  <div className="relative h-[340px] sm:h-[420px] select-none" aria-hidden="true">
    {/* Sequence stream */}
    <div className="absolute inset-0 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] [mask-image:linear-gradient(to_bottom,transparent,black_18%,black_82%,transparent)]">
      <div className="absolute inset-0 flex justify-around px-4 font-mono text-[11px] leading-5 text-white/20">
        {Array.from({ length: 9 }, (_, c) => {
          const col = seqColumn(c + 3);
          return (
            <div
              key={c}
              className="flex flex-col"
              style={{ animation: `seq-scroll ${14 + (c % 4) * 3}s linear infinite`, animationDelay: `-${c * 1.7}s` }}
            >
              {[...col, ...col].map((b, i) => (
                <span key={i} className={i % 9 === c % 9 ? "text-lime/70" : ""}>
                  {b}
                </span>
              ))}
            </div>
          );
        })}
      </div>
    </div>

    {/* Double helix */}
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="flex flex-col gap-[9px] sm:gap-[12px] -rotate-[18deg]">
        {Array.from({ length: RUNGS }, (_, i) => {
          const delay = `-${(i * 0.16).toFixed(2)}s`;
          return (
            <div key={i} className="relative w-[150px] sm:w-[190px] h-[6px] flex items-center" style={{ ["--span" as string]: "calc(100% - 12px)" }}>
              <div
                className="absolute inset-x-[6px] h-[2px] rounded-full bg-linear-to-r from-magenta via-white/60 to-lime"
                style={{ animation: "helix-rung 3.2s ease-in-out infinite", animationDelay: delay }}
              />
              <span
                className="absolute left-0 w-3 h-3 rounded-full bg-magenta shadow-[0_0_12px_rgb(178_65_183/0.8)]"
                style={{ animation: "helix-dot-a 3.2s ease-in-out infinite", animationDelay: delay }}
              />
              <span
                className="absolute right-0 w-3 h-3 rounded-full bg-lime shadow-[0_0_12px_rgb(205_226_74/0.8)]"
                style={{ animation: "helix-dot-b 3.2s ease-in-out infinite", animationDelay: delay }}
              />
            </div>
          );
        })}
      </div>
    </div>

    {/* Floating pipeline chips */}
    {chips.map((c) => (
      <div
        key={c.label}
        className={`absolute ${c.className} bg-plum/80 backdrop-blur border border-white/15 text-white text-xs font-medium px-3 py-1.5 rounded-full shadow-lg`}
        style={{ animation: "float-y 5s ease-in-out infinite", animationDelay: c.delay }}
      >
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-lime mr-2 align-middle" />
        {c.label}
      </div>
    ))}
  </div>
);

export default HeroLab;
