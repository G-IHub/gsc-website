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

type View = { name: "home" | "projects" | "library" | "reports" | "team" | "people" | "log" | "account" } | { name: "project"; id: number };

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
  const NavItem = ({ it }: { it: Item }) =>
    it.soon ? (
      <span className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white/40 cursor-not-allowed whitespace-nowrap" title="Coming later">
        <it.icon size={18} aria-hidden="true" /> {it.label} <span className="ml-auto text-[10px] uppercase tracking-widest">Soon</span>
      </span>
    ) : (
      <button
        onClick={() => setView(it.go!)}
        aria-current={section === it.key ? "page" : undefined}
        className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-left whitespace-nowrap transition-colors ${section === it.key ? "bg-mist text-plum font-medium" : "text-white/80 hover:bg-white/10 hover:text-white"}`}
      >
        <it.icon size={18} aria-hidden="true" /> {it.label}
      </button>
    );

  return (
    <div className="hub-root min-h-screen bg-mist md:flex">
      <aside className="bg-plum text-white md:w-60 md:shrink-0 md:min-h-screen md:sticky md:top-0 md:h-screen flex flex-col">
        <div className="px-5 pt-5 pb-3">
          <p className="text-[11px] font-bold tracking-widest uppercase text-lime">Staff only</p>
          <p className="text-lg font-journal leading-tight">Genomac Research Hub</p>
        </div>
        <nav className="px-3 flex md:flex-col gap-1 overflow-x-auto md:overflow-visible pb-3" aria-label="Hub">
          {main.map((it) => <NavItem key={it.key} it={it} />)}
          <span className="hidden md:block h-px bg-white/10 my-2" />
          {admin.map((it) => <NavItem key={it.key} it={it} />)}
        </nav>
        <div className="md:mt-auto border-t border-white/10 px-5 py-4 text-sm flex md:block items-center justify-between gap-3">
          <div>
            <p className="font-medium">{me.user.name}</p>
            <p className="text-xs text-white/60">{ROLE_LABEL[role] ?? role}</p>
          </div>
          <button onClick={signOut} className="md:mt-3 inline-flex items-center gap-1.5 text-white/70 hover:text-white">
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 min-w-0 px-4 md:px-8 py-6 md:py-8 max-w-6xl">
        {view.name === "home" && <Home me={me} onOpen={(id) => setView({ name: "project", id })} onAll={() => setView({ name: "projects" })} onReports={() => setView({ name: "reports" })} />}
        {view.name === "projects" && <Projects me={me} onOpen={(id) => setView({ name: "project", id })} />}
        {view.name === "project" && <ProjectPage key={view.id} id={view.id} me={me} onHome={() => setView({ name: "home" })} onProjects={() => setView({ name: "projects" })} />}
        {view.name === "library" && <Library />}
        {view.name === "reports" && !limited && <Reports me={me} />}
        {view.name === "team" && !limited && <Team />}
        {view.name === "people" && isMgmt && <People me={me} />}
        {view.name === "log" && isMgmt && <AccessLog />}
        {view.name === "account" && <Account />}
      </main>
    </div>
  );
};

export default Hub;
