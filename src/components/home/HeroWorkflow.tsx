import { useEffect, useState } from "react";
import { usePrefersReducedMotion } from "../motion";

// End-to-end hero animation: multi-omics data -> AI integration -> synthetic design -> lab workflow -> results

const LIME = "#cde24a";
const MAGENTA = "#b241b7";

const omics = [
  { label: "Genomics", y: 62, color: LIME },
  { label: "Transcriptomics", y: 118, color: "#e9a7ec" },
  { label: "Proteomics", y: 174, color: "#ffffff" },
  { label: "Metabolomics", y: 230, color: MAGENTA },
];

const HUB = { x: 205, y: 146 };

// Connection paths between stages
const omicsPaths = omics.map((o) => `M128 ${o.y} C 160 ${o.y}, 150 ${HUB.y}, ${HUB.x - 34} ${HUB.y}`);
const hubToDesign = `M${HUB.x + 30} ${HUB.y - 16} C 255 120, 250 66, 272 66`;
const hubToLab = `M${HUB.x + 32} ${HUB.y + 10} C 255 160, 252 196, 272 196`;
const designToLab = "M346 96 L346 150";
const labToReport = "M346 252 L346 290";
const reportToSolutions = "M252 336 L232 336";

const stages = ["Multi-omics", "AI integration", "Synthetic design", "Lab workflow", "Results", "Solutions"];

const Box = ({
  x,
  y,
  w,
  h,
  title,
  active,
  children,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  title: string;
  active: boolean;
  children: React.ReactNode;
}) => (
  <g>
    <rect
      x={x}
      y={y}
      width={w}
      height={h}
      rx="14"
      fill="rgb(42 15 82 / 0.75)"
      stroke={active ? LIME : "rgb(255 255 255 / 0.15)"}
      strokeWidth={active ? 1.6 : 1}
      style={{ transition: "stroke 0.4s" }}
    />
    <text x={x + 12} y={y + 18} fontSize="9" fontWeight="700" letterSpacing="1.2" fill={active ? LIME : "rgb(255 255 255 / 0.6)"}>
      {title.toUpperCase()}
    </text>
    {children}
  </g>
);

const Flow = ({ d, delay = 0, particles }: { d: string; delay?: number; particles: boolean }) => (
  <g>
    <path d={d} fill="none" stroke="rgb(255 255 255 / 0.18)" strokeWidth="1.5" />
    <path
      d={d}
      fill="none"
      stroke={LIME}
      strokeOpacity="0.7"
      strokeWidth="1.5"
      strokeDasharray="4 8"
      style={{ animation: "dash-flow 1.2s linear infinite", animationDelay: `${delay}s` }}
    />
    {particles && (
      <circle r="3.2" fill={LIME}>
        <animateMotion dur="2.6s" repeatCount="indefinite" path={d} begin={`${delay}s`} />
      </circle>
    )}
  </g>
);

const HeroWorkflow = () => {
  const reduced = usePrefersReducedMotion();
  const [stage, setStage] = useState(0);

  useEffect(() => {
    if (reduced) return;
    const t = setInterval(() => setStage((s) => (s + 1) % stages.length), 2200);
    return () => clearInterval(t);
  }, [reduced]);

  return (
    <div className="relative select-none w-full max-w-[340px] sm:max-w-[380px] mx-auto lg:mr-0" aria-hidden="true">
      <div className="rounded-3xl border border-white/10 bg-white/[0.04] backdrop-blur-sm p-3 sm:p-4">
        <svg viewBox="0 0 440 390" className="w-full h-auto">
          {/* Flows */}
          {omicsPaths.map((d, i) => (
            <Flow key={d} d={d} delay={i * 0.35} particles={!reduced} />
          ))}
          <Flow d={hubToDesign} delay={0.4} particles={!reduced} />
          <Flow d={hubToLab} delay={0.9} particles={!reduced} />
          <Flow d={designToLab} delay={0.2} particles={!reduced} />
          <Flow d={labToReport} delay={0.6} particles={!reduced} />
          <Flow d={reportToSolutions} delay={1.1} particles={!reduced} />

          {/* 1. Multi-omics inputs */}
          {omics.map((o, i) => (
            <g key={o.label}>
              <rect
                x="12"
                y={o.y - 17}
                width="116"
                height="34"
                rx="17"
                fill="rgb(42 15 82 / 0.8)"
                stroke={stage === 0 ? LIME : "rgb(255 255 255 / 0.15)"}
                strokeWidth={stage === 0 ? 1.4 : 1}
                style={{ transition: "stroke 0.4s" }}
              />
              <circle cx="30" cy={o.y} r="5" fill={o.color} style={{ animation: "node-pulse 1.8s ease-in-out infinite", animationDelay: `${i * 0.3}s` }} />
              <text x="42" y={o.y + 4} fontSize="11" fontWeight="600" fill="white">
                {o.label}
              </text>
            </g>
          ))}
          <text x="14" y="28" fontSize="9" fontWeight="700" letterSpacing="1.2" fill={stage === 0 ? LIME : "rgb(255 255 255 / 0.6)"}>
            MULTI-OMICS DATA
          </text>

          {/* 2. AI integration hub */}
          <g>
            {!reduced &&
              [0, 1].map((i) => (
                <circle
                  key={i}
                  cx={HUB.x}
                  cy={HUB.y}
                  r="34"
                  fill="none"
                  stroke={MAGENTA}
                  strokeWidth="1.5"
                  style={{ animation: "hub-ring 2.4s ease-out infinite", animationDelay: `${i * 1.2}s` }}
                />
              ))}
            <circle cx={HUB.x} cy={HUB.y} r="34" fill="url(#hubGrad)" stroke={stage === 1 ? LIME : "rgb(255 255 255 / 0.25)"} strokeWidth={stage === 1 ? 2 : 1} />
            {/* tiny network inside the hub */}
            {[
              [-14, -10, 0, -16],
              [0, -16, 14, -6],
              [14, -6, 8, 12],
              [8, 12, -10, 10],
              [-10, 10, -14, -10],
              [-14, -10, 8, 12],
              [0, -16, -10, 10],
            ].map(([x1, y1, x2, y2], i) => (
              <line key={i} x1={HUB.x + x1} y1={HUB.y + y1} x2={HUB.x + x2} y2={HUB.y + y2} stroke="white" strokeOpacity="0.5" strokeWidth="1" />
            ))}
            {[
              [-14, -10],
              [0, -16],
              [14, -6],
              [8, 12],
              [-10, 10],
            ].map(([dx, dy], i) => (
              <circle
                key={i}
                cx={HUB.x + dx}
                cy={HUB.y + dy}
                r="3"
                fill={LIME}
                style={{ animation: "node-pulse 1.4s ease-in-out infinite", animationDelay: `${i * 0.2}s` }}
              />
            ))}
            <text x={HUB.x} y={HUB.y + 52} textAnchor="middle" fontSize="9" fontWeight="700" letterSpacing="1.2" fill={stage === 1 ? LIME : "rgb(255 255 255 / 0.6)"}>
              AI INTEGRATION
            </text>
          </g>

          {/* 3. Synthetic design: a construct assembling part by part */}
          <Box x={272} y={36} w={156} h={60} title="Synthetic design" active={stage === 2}>
            {[
              { x: 284, w: 30, c: LIME, label: "Pro" },
              { x: 318, w: 18, c: "#e9a7ec", label: "RBS" },
              { x: 340, w: 46, c: MAGENTA, label: "Gene" },
              { x: 390, w: 26, c: "#ffffff", label: "Ter" },
            ].map((p, i) => (
              <g
                key={p.label}
                style={{
                  animation: reduced ? undefined : "part-in 4.4s ease-out infinite",
                  animationDelay: `${i * 0.35}s`,
                  transformBox: "fill-box",
                  transformOrigin: "center",
                }}
              >
                <rect x={p.x} y={56} width={p.w} height={14} rx="4" fill={p.c} />
                <text x={p.x + p.w / 2} y={84} textAnchor="middle" fontSize="7.5" fill="rgb(255 255 255 / 0.7)">
                  {p.label}
                </text>
              </g>
            ))}
            <line x1="280" y1="63" x2="420" y2="63" stroke="rgb(255 255 255 / 0.25)" strokeWidth="1" />
          </Box>

          {/* 4. Lab workflow: a well plate filling */}
          <Box x={272} y={150} w={156} h={102} title="Lab workflow" active={stage === 3}>
            {Array.from({ length: 3 }, (_, r) =>
              Array.from({ length: 6 }, (_, c) => (
                <circle
                  key={`${r}-${c}`}
                  cx={290 + c * 24}
                  cy={180 + r * 22}
                  r="7.5"
                  stroke="rgb(255 255 255 / 0.25)"
                  fill="rgb(255 255 255 / 0.08)"
                  style={{ animation: reduced ? undefined : "well-fill 5s ease-in-out infinite", animationDelay: `${(r * 6 + c) * 0.12}s` }}
                />
              )),
            )}
          </Box>

          {/* 5. Results & report */}
          <Box x={252} y={290} w={176} h={92} title="Results" active={stage === 4}>
            {[30, 48, 24, 56, 40].map((h, i) => (
              <rect
                key={i}
                x={266 + i * 20}
                y={372 - h}
                width="13"
                height={h}
                rx="3"
                fill={i % 2 ? MAGENTA : LIME}
                style={{
                  animation: reduced ? undefined : "bar-grow 5s ease-in-out infinite",
                  animationDelay: `${i * 0.15}s`,
                  transformBox: "fill-box",
                  transformOrigin: "bottom",
                }}
              />
            ))}
            <circle cx="400" cy="342" r="14" fill={LIME} />
            <path d="M393 342 l5 5 l9 -11" fill="none" stroke="#2a0f52" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </Box>

          {/* 6. Solutions delivered: test kits, devices, software */}
          <Box x={12} y={290} w={220} h={92} title="Solutions delivered" active={stage === 5}>
            {/* Test kit: box with sample tubes */}
            <g style={{ animation: reduced ? undefined : "part-in 5s ease-out infinite", transformBox: "fill-box", transformOrigin: "center" }}>
              <rect x="26" y="322" width="52" height="34" rx="6" fill="rgb(255 255 255 / 0.12)" stroke={LIME} strokeWidth="1.2" />
              <rect x="26" y="316" width="52" height="8" rx="3" fill={LIME} />
              {[34, 46, 58].map((x, i) => (
                <rect key={x} x={x} y="328" width="7" height="22" rx="3.5" fill={[MAGENTA, "#e9a7ec", "#ffffff"][i]} />
              ))}
              <text x="52" y="372" textAnchor="middle" fontSize="8" fill="rgb(255 255 255 / 0.75)">Test kits</text>
            </g>
            {/* Hardware: handheld device with a live trace and status light */}
            <g style={{ animation: reduced ? undefined : "part-in 5s ease-out infinite", animationDelay: "0.35s", transformBox: "fill-box", transformOrigin: "center" }}>
              <rect x="96" y="314" width="44" height="44" rx="8" fill="rgb(255 255 255 / 0.12)" stroke="rgb(255 255 255 / 0.5)" strokeWidth="1.2" />
              <rect x="102" y="320" width="32" height="20" rx="3" fill="#2a0f52" />
              <path d="M104 332 l5 0 l3 -7 l4 12 l3 -8 l3 3 l10 0" fill="none" stroke={LIME} strokeWidth="1.3" />
              <circle cx="118" cy="349" r="3.5" fill={LIME} style={{ animation: "node-pulse 1s ease-in-out infinite" }} />
              <text x="118" y="372" textAnchor="middle" fontSize="8" fill="rgb(255 255 255 / 0.75)">Devices</text>
            </g>
            {/* Software: dashboard window */}
            <g style={{ animation: reduced ? undefined : "part-in 5s ease-out infinite", animationDelay: "0.7s", transformBox: "fill-box", transformOrigin: "center" }}>
              <rect x="158" y="316" width="62" height="42" rx="6" fill="rgb(255 255 255 / 0.12)" stroke="rgb(255 255 255 / 0.5)" strokeWidth="1.2" />
              <rect x="158" y="316" width="62" height="8" rx="3" fill="rgb(255 255 255 / 0.25)" />
              <path d="M164 350 L176 340 L186 345 L198 332 L212 336" fill="none" stroke={MAGENTA} strokeWidth="1.8" strokeLinecap="round" />
              <circle cx="198" cy="332" r="2.5" fill={LIME} />
              <text x="189" y="372" textAnchor="middle" fontSize="8" fill="rgb(255 255 255 / 0.75)">Software</text>
            </g>
          </Box>

          <defs>
            <radialGradient id="hubGrad">
              <stop offset="0%" stopColor="#b241b7" />
              <stop offset="100%" stopColor="#3d1782" />
            </radialGradient>
          </defs>
        </svg>
      </div>
    </div>
  );
};

export default HeroWorkflow;
