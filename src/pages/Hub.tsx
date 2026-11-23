import { useCallback, useEffect, useState, type FormEvent } from "react";
import { LogOut } from "lucide-react";
import { Btn, Field, inputClass } from "../admin/ui";
import { ROLE_LABEL, errorText, hub, type Me } from "../hub/hubApi";
import Projects from "../hub/Projects";
import People from "../hub/People";
import AccessLog from "../hub/AccessLog";
import Account from "../hub/Account";

// Genomac Research Hub: private, staff only. Not linked anywhere on the site and kept out of search results.
// Every call goes to /api/hub, which decides what each person may see; this page only shows what comes back.

type Tab = "projects" | "people" | "log" | "account";

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
  const [tab, setTab] = useState<Tab>("projects");

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
    setTab("projects");
  };

  if (me === "loading") return <div className="min-h-screen bg-mist" />;
  if (me === "off" || me === null) {
    return (
      <div className="min-h-screen bg-mist flex items-center justify-center p-4">
        {me === "off" ? (
          <p className="text-muted text-center">The Research Hub is not switched on yet.</p>
        ) : (
          <SignIn onDone={load} />
        )}
      </div>
    );
  }

  const isMgmt = me.user.role === "management";
  const tabs: [Tab, string][] = [
    ["projects", "Projects"],
    ...(isMgmt ? ([["people", "People"], ["log", "Access log"]] as [Tab, string][]) : []),
    ["account", "My account"],
  ];

  return (
    <div className="min-h-screen bg-mist">
      <header className="bg-plum text-white">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold tracking-widest uppercase text-lime">Staff only</p>
            <p className="text-lg font-journal">Genomac Research Hub</p>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-white/80">
              {me.user.name} · {ROLE_LABEL[me.user.role] ?? me.user.role}
            </span>
            <button onClick={signOut} className="inline-flex items-center gap-1.5 text-white/80 hover:text-white">
              <LogOut size={16} /> Sign out
            </button>
          </div>
        </div>
        <nav className="max-w-6xl mx-auto px-4 md:px-6 flex gap-1" aria-label="Hub">
          {tabs.map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              aria-current={tab === key ? "page" : undefined}
              className={`px-4 py-2.5 text-sm rounded-t-xl transition-colors ${tab === key ? "bg-mist text-plum font-medium" : "text-white/75 hover:text-white"}`}
            >
              {label}
            </button>
          ))}
        </nav>
      </header>
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-8">
        {tab === "projects" && <Projects me={me} />}
        {tab === "people" && isMgmt && <People me={me} />}
        {tab === "log" && isMgmt && <AccessLog />}
        {tab === "account" && <Account />}
      </div>
    </div>
  );
};

export default Hub;
