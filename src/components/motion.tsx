import { useEffect, useRef, useState, type ReactNode } from "react";

// True once the element has scrolled into view (fires once)
export const useInView = <T extends HTMLElement>(threshold = 0.2) => {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let done = false;
    const show = () => {
      if (done) return;
      done = true;
      setInView(true);
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) show();
      },
      { threshold },
    );
    // Fast scrolls and anchor jumps can skip straight past an element without it ever
    // intersecting, so also reveal anything whose top is already above the viewport bottom
    const onScroll = () => {
      if (el.getBoundingClientRect().top < window.innerHeight * 0.9) show();
    };
    io.observe(el);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
  }, [threshold]);
  return { ref, inView };
};

export const usePrefersReducedMotion = () => {
  const [reduced, setReduced] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
};

// Fade-and-rise as the block scrolls into view
export const Reveal = ({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) => {
  const { ref, inView } = useInView<HTMLDivElement>(0.15);
  return (
    <div
      ref={ref}
      className={`reveal ${inView ? "is-visible" : ""} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
};

// Cycles through words with a soft blur-in
export const RotatingWords = ({ words, interval = 2200 }: { words: string[]; interval?: number }) => {
  const [i, setI] = useState(0);
  const reduced = usePrefersReducedMotion();
  useEffect(() => {
    if (reduced) return;
    const t = setInterval(() => setI((n) => (n + 1) % words.length), interval);
    return () => clearInterval(t);
  }, [words.length, interval, reduced]);
  return (
    <span className="relative inline-flex overflow-hidden align-bottom">
      <span key={i} className="inline-block" style={{ animation: "word-in 0.5s ease both" }}>
        {words[i]}
      </span>
    </span>
  );
};
