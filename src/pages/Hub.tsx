import { useCallback, useEffect, useState, type FormEvent } from "react";
import { BookOpen, ChartColumn, FolderOpen, House, KeyRound, LogOut, ShieldCheck, UserCog, Users, type LucideIcon } from "lucide-react";
import { Btn, Field, inputClass } from "../admin/ui";
import { ROLE_LABEL, errorText, hub, type Me } from "../hub/hubApi";
import Projects from "../hub/Projects";
import Home from "../hub/Home";
import Library from "../hub/Library";
import Reports from "../hub/Reports";
import Team from "../hub/Team";
import ProjectPage from "../hub/ProjectPage";
import People from "../hub/People";
import AccessLog from "../hub/AccessLog";
import Account from "../hub/Account";

// Genomac Research Hub: private, staff only. Not linked anywhere on the site and kept out of search results.
// Every call goes to /api/hub, which decides what each person may see; this page only shows what comes back.

type View = { name: "home" | "projects" | "library" | "reports" | "team" | "people" | "log" | "account" } | { name: "project"; id: number; tab?: "overview" | "workspace" | "access" };

const SignIn = ({ onDone }: { onDone: () => void }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    const r = await hub("login", { method: "POST", body: { email, password } });
    setBusy(false);
    if (r.ok) onDone();
    else setError(errorText(r));
  };

  return (
    <form onSubmit={submit} className="w-full max-w-sm bg-white rounded-3xl border border-gray-200/80 p-8 shadow-xl shadow-plum/5">
      <p className="text-xs font-bold tracking-widest uppercase text-magenta-dark">Staff only</p>
      <h1 className="text-2xl text-plum mt-1">Genomac Research Hub</h1>
      <p className="text-sm text-muted mt-1 mb-6">Sign in with your own account.</p>
      <div className="space-y-4">
        <Field label="Email">
          <input type="email" autoComplete="username" autoFocus value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Password">
          <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} />
        </Field>
      </div>
      {error && <p className="text-sm text-red-600 mt-3" role="alert">{error}</p>}
      <button
        type="submit"
        disabled={busy || !email || !password}
        className="mt-5 w-full bg-magenta hover:bg-magenta-dark disabled:opacity-60 text-white py-3 rounded-full text-sm font-medium transition-colors"
      >
        {busy ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
};

const Hub = () => {
  const [me, setMe] = useState<Me | null | "loading" | "off">("loading");
  const [view, setView] = useState<View>({ name: "home" });

  useEffect(() => {
    document.title = "Research Hub — GSC";
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex, nofollow";
    document.head.appendChild(meta);
    return () => meta.remove();
  }, []);

  const load = useCallback(async () => {
    const r = await hub<{ user: Me["user"]; canSeeMoney: boolean }>("me");
    if (r.ok && r.data) setMe({ user: r.data.user, canSeeMoney: r.data.canSeeMoney });
    else setMe(r.status === 503 ? "off" : null);
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const signOut = async () => {
    await hub("logout", { method: "POST" });
    setMe(null);
    setView({ name: "home" });
  };

  if (me === "loading") return <div className="hub-root min-h-screen bg-mist" />;
  if (me === "off" || me === null) {
    return (
      <div className="hub-root min-h-screen bg-mist flex items-center justify-center p-4">
        {me === "off" ? (
          <p className="text-muted text-center">The Research Hub is not switched on yet.</p>
        ) : (
          <SignIn onDone={load} />
        )}
      </div>
    );
  }

  const role = me.user.role;
  const isMgmt = role === "management";
  const limited = role === "member" || role === "coordinator"; // team members and coordinators get the shorter menu
  const section = view.name === "project" ? "projects" : view.name;

  type Item = { key: string; label: string; icon: LucideIcon; go?: View; soon?: boolean };
  const main: Item[] = [
    { key: "home", label: "Home", icon: House, go: { name: "home" } },
    { key: "projects", label: limited ? "My projects" : "Projects", icon: FolderOpen, go: { name: "projects" } },
    { key: "library", label: "Resource library", icon: BookOpen, go: { name: "library" } },
    ...(limited ? [] : ([
      { key: "reports", label: "Reports and KPIs", icon: ChartColumn, go: { name: "reports" } },
      { key: "team", label: "Team", icon: Users, go: { name: "team" } },
    ] as Item[])),
  ];
  const admin: Item[] = [
    ...(isMgmt ? ([
      { key: "people", label: "People", icon: UserCog, go: { name: "people" } },
      { key: "log", label: "Access log", icon: ShieldCheck, go: { name: "log" } },
    ] as Item[]) : []),
    { key: "account", label: "My account", icon: KeyRound, go: { name: "account" } },
  ];
  const NavItem = ({ it }: { it: Item }) => (
    <button
      onClick={() => setView(it.go!)}
      aria-current={section === it.key ? "page" : undefined}
      className={`hub-nav w-full flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-left whitespace-nowrap transition-colors ${section === it.key ? "bg-plum/10 text-plum font-medium" : "text-muted hover:text-plum hover:bg-white"}`}
    >
      <it.icon size={18} strokeWidth={section === it.key ? 2.4 : 1.8} aria-hidden="true" /> {it.label}
    </button>
  );
  const initialsOf = (n: string) => n.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("");

  return (
    <div className="hub-root min-h-screen bg-[#e9ebec] p-0 md:p-5">
      <div className="hub-frame md:rounded-[36px] bg-white md:p-4 md:flex gap-4 min-h-screen md:min-h-[calc(100vh-40px)]">
        {/* sidebar */}
        <aside className="hub-side md:w-64 md:shrink-0 bg-[#f3f4f4] md:rounded-[28px] flex flex-col md:sticky md:top-5 md:self-start md:h-[calc(100vh-72px)]">
          <div className="px-6 pt-6 pb-2 flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-plum to-plum-soft text-lime flex items-center justify-center text-sm font-bold" aria-hidden="true">G</span>
            <div className="leading-tight">
              <p className="text-[15px] font-semibold text-plum">Genomac</p>
              <p className="text-[11px] text-muted">Research Hub · staff only</p>
            </div>
          </div>
          <nav className="px-3 md:px-4 flex md:flex-col gap-1 overflow-x-auto md:overflow-visible pb-3 md:pb-0" aria-label="Hub">
            <p className="hidden md:block px-3 pt-5 pb-2 text-[11px] tracking-widest text-muted">MENU</p>
            {main.map((it) => <NavItem key={it.key} it={it} />)}
            <p className="hidden md:block px-3 pt-6 pb-2 text-[11px] tracking-widest text-muted">GENERAL</p>
            {admin.map((it) => <NavItem key={it.key} it={it} />)}
            <button onClick={signOut} className="hub-nav w-full flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-left whitespace-nowrap text-muted hover:text-plum hover:bg-white">
              <LogOut size={18} strokeWidth={1.8} aria-hidden="true" /> Sign out
            </button>
          </nav>
          <div className="hidden md:block mt-auto p-4">
            <div className="relative overflow-hidden rounded-[22px] bg-gradient-to-br from-plum via-plum-soft to-plum p-5 text-white">
              <svg className="absolute -right-10 -top-6 opacity-25" width="200" height="200" viewBox="0 0 200 200" aria-hidden="true"><circle cx="100" cy="100" r="70" fill="none" stroke="#cde24a" strokeWidth="1.5"/><circle cx="100" cy="100" r="45" fill="none" stroke="#b241b7" strokeWidth="1.5"/><circle cx="100" cy="100" r="95" fill="none" stroke="#fff" strokeWidth="1"/></svg>
              <BookOpen size={20} className="text-lime" aria-hidden="true" />
              <p className="mt-3 text-[15px] font-semibold leading-snug">Resource library</p>
              <p className="text-[11px] text-white/70 mt-1">Templates, guides and the research prompts in one place.</p>
              <button onClick={() => setView({ name: "library" })} className="relative mt-4 w-full rounded-xl bg-white text-plum py-2.5 text-sm font-semibold hover:bg-lime transition-colors">Open library</button>
            </div>
          </div>
        </aside>

        {/* main column */}
        <div className="flex-1 min-w-0 flex flex-col gap-4 p-3 md:p-0">
          <header className="bg-[#f3f4f4] rounded-[24px] px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="w-11 h-11 rounded-full bg-gradient-to-br from-magenta to-plum text-white flex items-center justify-center text-sm font-semibold" aria-hidden="true">{initialsOf(me.user.name)}</span>
              <div className="leading-tight">
                <p className="text-[15px] text-ink font-medium">{me.user.name}</p>
                <p className="text-xs text-muted">{me.user.email} · {ROLE_LABEL[role] ?? role}</p>
              </div>
            </div>
            <span className="hidden sm:inline-flex rounded-full bg-white px-3 py-1 text-xs text-muted">{new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}</span>
          </header>
          <main className="hub-panel flex-1 bg-[#f3f4f4] rounded-[28px] px-4 md:px-7 py-6 md:py-7 min-w-0">
            {view.name === "home" && <Home me={me} onOpen={(id, tab) => setView({ name: "project", id, tab })} onAll={() => setView({ name: "projects" })} onReports={() => setView({ name: "reports" })} onPeople={() => setView({ name: "people" })} onTeam={() => setView({ name: "team" })} />}
            {view.name === "projects" && <Projects me={me} onOpen={(id) => setView({ name: "project", id })} />}
            {view.name === "project" && <ProjectPage key={`${view.id}-${view.tab ?? ""}`} id={view.id} initialTab={view.tab} me={me} onHome={() => setView({ name: "home" })} onProjects={() => setView({ name: "projects" })} />}
            {view.name === "library" && <Library />}
            {view.name === "reports" && !limited && <Reports me={me} />}
            {view.name === "team" && !limited && <Team me={me} />}
            {view.name === "people" && isMgmt && <People me={me} />}
            {view.name === "log" && isMgmt && <AccessLog />}
            {view.name === "account" && <Account />}
          </main>
        </div>
      </div>
    </div>
  );
};

export default Hub;
