import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { Menu, X, ArrowRight } from "lucide-react";
import Logo from "./Logo";
import { nav } from "../data/site";

const Navbar = () => {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed top-0 inset-x-0 z-50 p-3 md:p-4 flex justify-center">
      <nav className="w-full max-w-6xl bg-white/95 backdrop-blur shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_10px_20px_-2px_rgba(0,0,0,0.04)] rounded-2xl px-4 md:px-6 py-3">
        <div className="flex items-center justify-between gap-4">
          <Link to="/" onClick={() => setOpen(false)} aria-label="GSC home">
            <Logo />
          </Link>

          <div className="hidden xl:flex items-center gap-6 whitespace-nowrap text-sm font-medium text-muted">
            {nav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `transition-colors hover:text-navy ${isActive ? "text-navy" : ""}`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </div>

          <Link
            to="/contact"
            className="hidden xl:inline-flex whitespace-nowrap items-center gap-2 bg-teal hover:bg-teal-dark text-white px-5 py-2 rounded-full text-sm font-medium transition-colors"
          >
            Discuss a Project
            <ArrowRight size={14} />
          </Link>

          <button
            className="xl:hidden p-2 text-muted hover:text-navy"
            onClick={() => setOpen(!open)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {open && (
          <div className="xl:hidden flex flex-col gap-1 pt-3 mt-3 border-t border-gray-100">
            {nav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `px-2 py-2 rounded-lg text-sm font-medium ${isActive ? "text-navy bg-mist" : "text-muted"}`
                }
              >
                {item.label}
              </NavLink>
            ))}
            <Link
              to="/contact"
              onClick={() => setOpen(false)}
              className="mt-2 flex items-center justify-center gap-2 bg-teal text-white px-5 py-2.5 rounded-full text-sm font-medium"
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
