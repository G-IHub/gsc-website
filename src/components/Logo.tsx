const Logo = ({ light = false }: { light?: boolean }) => (
  <span className="flex items-center gap-2.5">
    <img src="/gsc-logo.png" alt="Genomac Services & Consult logo" className="w-10 h-10 rounded-full" />
    <span className="leading-none whitespace-nowrap">
      <span className={`block font-bold tracking-wide text-[15px] ${light ? "text-white" : "text-plum"}`}>GSC</span>
      <span className={`block text-[10px] mt-0.5 ${light ? "text-white/60" : "text-muted"}`}>
        Genomac Services &amp; Consult
      </span>
    </span>
  </span>
);

export default Logo;
