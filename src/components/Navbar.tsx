import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { Menu, X, ArrowRight, ChevronDown } from "lucide-react";
import Logo from "./Logo";
import { navMenu } from "../data/site";

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState<string | null>(null); // which desktop dropdown is showing
  const barRef = useRef<HTMLElement>(null);
  const { pathname } = useLocation();

  // Close an open dropdown when the visitor clicks elsewhere or presses Escape
  useEffect(() => {
    if (!menu) return;
    const onDown = (e: MouseEvent) => {
      if (!barRef.current?.contains(e.target as Node)) setMenu(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenu(null);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menu]);

  return (
    <div className="fixed top-0 inset-x-0 z-50 p-3 md:p-4 flex justify-center">
      <nav ref={barRef} className="w-full max-w-6xl bg-white/95 backdrop-blur shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_10px_20px_-2px_rgba(0,0,0,0.04)] rounded-2xl px-4 md:px-6 py-3">
        <div className="flex items-center justify-between gap-4">
          <Link to="/" onClick={() => setOpen(false)} aria-label="GSC home">
            <Logo />
          </Link>

          {/* Menu and button sit together on the right; the hamburger takes over below the lg breakpoint */}
          <div className="hidden lg:flex items-center gap-5 xl:gap-8">
          <div className="flex items-center gap-5 xl:gap-8 whitespace-nowrap text-sm font-medium text-muted">
            {navMenu.map((item) => {
              if (!item.items) {
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === "/"}
                    className={({ isActive }) =>
                      `transition-colors hover:text-plum ${isActive ? "text-plum" : ""}`
                    }
                  >
                    {item.label}
                  </NavLink>
                );
              }
              const shown = menu === item.to;
              const active = item.items.some((s) => s.to === pathname);
              return (
                <div
                  key={item.to}
                  className="relative"
                  onMouseEnter={() => setMenu(item.to)}
                  onMouseLeave={() => setMenu(null)}
                >
                  <div className="flex items-center gap-1">
                    <Link
                      to={item.to}
                      onClick={() => setMenu(null)}
                      className={`transition-colors hover:text-plum ${active ? "text-plum" : ""}`}
                    >
                      {item.label}
                    </Link>
                    <button
                      type="button"
                      onClick={() => setMenu(shown ? null : item.to)}
                      aria-label={`${item.label} submenu`}
                      aria-expanded={shown}
                      className="p-0.5 transition-colors hover:text-plum"
                    >
                      <ChevronDown size={14} className={`transition-transform ${shown ? "rotate-180" : ""}`} />
                    </button>
                  </div>
                  {shown && (
                    <div className="absolute left-0 top-full pt-3">
                      <div className="min-w-52 rounded-xl bg-white p-2 shadow-lg ring-1 ring-black/5">
                        {item.items.map((sub) => (
                          <NavLink
                            key={sub.to}
                            to={sub.to}
                            onClick={() => setMenu(null)}
                            className={({ isActive }) =>
                              `block rounded-lg px-3 py-2 transition-colors hover:bg-mist hover:text-plum ${isActive ? "bg-mist text-plum" : ""}`
                            }
                          >
                            {sub.label}
                          </NavLink>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <Link
            to="/contact"
            className="inline-flex whitespace-nowrap items-center gap-2 bg-magenta hover:bg-magenta-dark text-white px-5 py-2 rounded-full text-sm font-medium transition-colors"
          >
            Discuss a Project
            <ArrowRight size={14} />
          </Link>
          </div>

          <button
            className="lg:hidden p-2 text-muted hover:text-plum"
            onClick={() => setOpen(!open)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {open && (
          <div className="lg:hidden flex flex-col gap-1 pt-3 mt-3 border-t border-gray-100">
            {navMenu.map((item) =>
              item.items ? (
                <div key={item.to} className="pt-1">
                  <p className="px-2 pb-1 text-[11px] font-bold tracking-widest uppercase text-magenta-dark">{item.label}</p>
                  {item.items.map((sub) => (
                    <NavLink
                      key={sub.to}
                      to={sub.to}
                      onClick={() => setOpen(false)}
                      className={({ isActive }) =>
                        `block pl-5 pr-2 py-2 rounded-lg text-sm font-medium ${isActive ? "text-plum bg-mist" : "text-muted"}`
                      }
                    >
                      {sub.label}
                    </NavLink>
                  ))}
                </div>
              ) : (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === "/"}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    `px-2 py-2 rounded-lg text-sm font-medium ${isActive ? "text-plum bg-mist" : "text-muted"}`
                  }
                >
                  {item.label}
                </NavLink>
              ),
            )}
            <Link
              to="/contact"
              onClick={() => setOpen(false)}
              className="mt-2 flex items-center justify-center gap-2 bg-magenta text-white px-5 py-2.5 rounded-full text-sm font-medium"
            >
              Discuss a Project
              <ArrowRight size={14} />
            </Link>
          </div>
        )}
      </nav>
    </div>
  );
};

export default Navbar;
