const Logo = ({ light = false }: { light?: boolean }) => (
  <span className="flex items-center gap-2.5">
    <img src="/favicon.svg" alt="" className={`w-8 h-8 rounded-lg ${light ? "ring-1 ring-white/20" : ""}`} />
    <span className="leading-none whitespace-nowrap">
      <span className={`block font-bold tracking-wide text-[15px] ${light ? "text-white" : "text-navy"}`}>GSC</span>
      <span className={`block text-[10px] mt-0.5 ${light ? "text-white/60" : "text-muted"}`}>
        Genomac Services &amp; Consult
      </span>
    </span>
  </span>
);

export default Logo;
