import { useEffect, useState } from "react";
import { X, Mail, ArrowUpRight } from "lucide-react";
import { Section, SectionHeading } from "./ui";
import { Reveal } from "./motion";
import { sampleTeam, team, type TeamMember } from "../data/team";

// The icon set has no brand logos, so draw LinkedIn's "in" mark directly
const LinkedinIcon = ({ size = 15 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM3 9.75h4v11H3v-11Zm6.5 0h3.8v1.5h.05c.53-1 1.83-2.05 3.77-2.05 4.03 0 4.78 2.65 4.78 6.1v5.45h-4v-4.83c0-1.15-.02-2.63-1.6-2.63-1.6 0-1.85 1.25-1.85 2.55v4.91h-4v-11Z" />
  </svg>
);

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

const Avatar = ({ m, size }: { m: TeamMember; size: "card" | "modal" }) => {
  const cls = size === "card" ? "w-full aspect-square rounded-2xl" : "w-28 h-28 sm:w-32 sm:h-32 rounded-2xl shrink-0";
  return m.photo ? (
    <img src={m.photo} alt={`${m.name}, ${m.role}`} loading="lazy" className={`${cls} object-cover`} />
  ) : (
    <div className={`${cls} bg-linear-to-br from-plum via-plum-soft to-magenta-dark flex items-center justify-center`}>
      <span className={`font-semibold text-lime ${size === "card" ? "text-4xl" : "text-3xl"}`}>{initials(m.name)}</span>
    </div>
  );
};

// Full profile shown when a card is clicked
const ProfileModal = ({ m, onClose }: { m: TeamMember; onClose: () => void }) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${m.name} profile`}
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-6 bg-plum/60 backdrop-blur-sm"
      onClick={onClose}
      style={{ animation: "word-in 0.25s ease both" }}
    >
      <div
        className="relative w-full sm:max-w-xl max-h-[90vh] overflow-y-auto bg-white rounded-t-3xl sm:rounded-3xl p-6 sm:p-8 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} aria-label="Close profile" className="absolute top-4 right-4 w-9 h-9 rounded-full bg-mist text-plum flex items-center justify-center hover:bg-magenta-tint">
          <X size={18} />
        </button>
        <div className="flex flex-col sm:flex-row gap-5 sm:items-center">
          <Avatar m={m} size="modal" />
          <div>
            <h3 className="text-xl font-bold text-plum">{m.name}</h3>
            <p className="text-magenta-dark font-medium text-sm mt-0.5">{m.role}</p>
            {m.credentials && <p className="text-muted text-sm mt-2">{m.credentials}</p>}
          </div>
        </div>
        <p className="mt-6 text-ink leading-relaxed">{m.bio}</p>
        {m.expertise && m.expertise.length > 0 && (
          <div className="mt-5 flex flex-wrap gap-2">
            {m.expertise.map((e) => (
              <span key={e} className="text-xs text-plum bg-magenta-tint rounded-full px-3 py-1.5">
                {e}
              </span>
            ))}
          </div>
        )}
        {(m.linkedin || m.email) && (
          <div className="mt-6 pt-5 border-t border-gray-100 flex flex-wrap gap-3">
            {m.linkedin && (
              <a href={m.linkedin} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm font-medium text-white bg-plum hover:bg-plum-soft px-4 py-2 rounded-full transition-colors">
                <LinkedinIcon /> LinkedIn
              </a>
            )}
            {m.email && (
              <a href={`mailto:${m.email}`} className="inline-flex items-center gap-2 text-sm font-medium text-plum border border-gray-200 hover:border-magenta/40 px-4 py-2 rounded-full transition-colors">
                <Mail size={15} /> {m.email}
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const TeamSection = () => {
  // Real profiles in production; sample cards only while developing locally
  const members = team.length > 0 ? team : import.meta.env.DEV ? sampleTeam : [];
  const isSample = team.length === 0;
  const [open, setOpen] = useState<TeamMember | null>(null);

  if (members.length === 0) return null;

  return (
    <Section id="team">
      <Reveal>
        <SectionHeading
          center
          eyebrow="Our team"
          title="The people behind the science"
          intro={<p>Scientists, analysts and project leads who scope, run and deliver every engagement.</p>}
        />
      </Reveal>
      {isSample && (
        <p className="-mt-6 mb-8 text-center text-xs font-semibold text-magenta-dark">
          Preview only — sample profiles are hidden on the live site until real ones are added in src/data/team.ts
        </p>
      )}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
        {members.map((m, i) => (
          <Reveal key={m.name} delay={(i % 4) * 90}>
            <button
              onClick={() => setOpen(m)}
              className="group w-full text-left rounded-3xl border border-gray-200/80 p-3 hover:border-magenta/40 hover:shadow-xl hover:shadow-plum/5 hover:-translate-y-1 transition-all"
            >
              <div className="relative overflow-hidden rounded-2xl">
                <div className="group-hover:scale-105 transition-transform duration-500">
                  <Avatar m={m} size="card" />
                </div>
                <span className="absolute bottom-2 right-2 w-8 h-8 rounded-full bg-white/90 text-plum flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <ArrowUpRight size={16} />
                </span>
              </div>
              <div className="px-1.5 pt-4 pb-1.5">
                <h3 className="font-semibold text-plum leading-snug">{m.name}</h3>
                <p className="text-sm text-magenta-dark mt-0.5 leading-snug">{m.role}</p>
                <p className="hidden sm:block text-sm text-muted mt-2 leading-relaxed line-clamp-2">{m.bio}</p>
              </div>
            </button>
          </Reveal>
        ))}
      </div>
      {open && <ProfileModal m={open} onClose={() => setOpen(null)} />}
    </Section>
  );
};

export default TeamSection;
