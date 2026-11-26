import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";
import { ArrowLeft, Check, LogOut } from "lucide-react";
import Reader, { DocList } from "../client/PortalDocs";
import PortalIntake from "../client/PortalIntake";
import MilestoneSignoff from "../client/MilestoneSignoff";
import PortalFiles from "../client/PortalFiles";
import PortalPayments from "../client/PortalPayments";
import ChangePassword from "../client/ChangePassword";
import { PRIVACY_APPROVED } from "../../shared/privacyNotice.js";

// Genomac SC client portal: the client's own view of their research project.
// Separate from the staff hub (own sign-in, own address /client). The server decides what a client may see.

type Res<T> = { ok: boolean; status: number; data: (T & { error?: string }) | null };
const api = async <T,>(action: string, opts: { method?: "GET" | "POST"; body?: unknown; query?: Record<string, string> } = {}): Promise<Res<T>> => {
  try {
    const r = await fetch(`/api/client?${new URLSearchParams({ action, ...opts.query })}`, {
      method: opts.method ?? "GET",
      headers: { "X-Requested-With": "gsc-client", ...(opts.body ? { "Content-Type": "application/json" } : {}) },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
    return { ok: r.ok, status: r.status, data: await r.json().catch(() => null) };
  } catch {
    return { ok: false, status: 0, data: null };
  }
};
const errText = (r: Res<unknown>) => (r.status === 0 ? "Could not reach the server." : r.data?.error ?? "Something went wrong.");

type Me = { id: number; name: string; email: string; organization: string };
type ProjectLite = { id: number; ref: string; title: string; stage: string; target_date: string | null; done: number; total: number };
type Milestone = { n: number; name: string; status: string; done: string | null; planned: string | null; signoff: boolean; signed: boolean };
type Detail = { project: { id: number; ref: string; title: string; stage: string; target_date: string | null }; milestones: Milestone[]; team: { name: string; project_role: string }[]; updates: { id: number; date: string; author: string; done: string; next: string }[] };
type Message = { id: number; at: string; text: string; from: "client" | "team"; who: string; mine: boolean };

const day = (iso: string | null) => (iso ? new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "");
const when = (iso: string) => new Date(iso).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const initials = (n: string) => n.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("");
const input = "w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-[13px] focus:outline-none focus:border-plum";

const Panel = ({ title, action, children, className = "" }: { title: string; action?: ReactNode; children: ReactNode; className?: string }) => (
  <section className={`bg-white rounded-[16px] p-4 ${className}`}>
    <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
      <h2 className="text-[14px] text-ink font-medium">{title}</h2>
      {action}
    </div>
    {children}
  </section>
);

const SignIn = ({ onDone }: { onDone: () => void }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const r = await api("login", { method: "POST", body: { email, password } });
    if (r.ok) onDone();
    else setMsg(errText(r));
  };
  return (
    <form onSubmit={submit} className="w-full max-w-sm bg-white rounded-[22px] p-7 shadow-xl shadow-plum/5 space-y-3">
      <div className="flex items-center gap-2.5 mb-2">
        <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-plum to-plum-soft text-lime flex items-center justify-center text-sm font-bold" aria-hidden="true">G</span>
        <div><p className="text-[15px] font-semibold text-plum leading-tight">Genomac Services &amp; Consult</p><p className="text-[11px] text-muted">Client portal</p></div>
      </div>
      <h1 className="text-[20px] text-ink">Sign in to your project</h1>
      <input className={input} type="email" autoComplete="username" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} aria-label="Email" />
      <input className={input} type="password" autoComplete="current-password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} aria-label="Password" />
      {msg && <p className="text-[12px] text-red-600" role="alert">{msg}</p>}
      <button type="submit" disabled={!email || !password} className="w-full rounded-full bg-plum hover:bg-plum-soft disabled:opacity-50 text-white py-2.5 text-[13px]">Sign in</button>
      <p className="text-[11px] text-muted">Your project lead sends you your sign-in details. Forgot your password? Ask your project lead for a new one.</p>
      {PRIVACY_APPROVED && <p className="text-[11px]"><a href="/client/privacy" className="text-plum underline">Privacy notice</a></p>}
    </form>
  );
};

const Thread = ({ projectId }: { projectId: number }) => {
  const [list, setList] = useState<Message[] | null>(null);
  const [text, setText] = useState("");
  const [msg, setMsg] = useState("");
  const load = useCallback(async () => {
    const r = await api<{ messages: Message[] }>("messages", { query: { id: String(projectId) } });
    if (r.ok && r.data) setList(r.data.messages);
  }, [projectId]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [load]);
  const send = async (e: FormEvent) => {
    e.preventDefault();
    const r = await api("message-post", { method: "POST", body: { project_id: projectId, text } });
    if (r.ok) {
      setText("");
      setMsg("");
      load();
    } else setMsg(errText(r));
  };
  return (
    <Panel title="Messages with your Genomac team" className="h-full flex flex-col">
      <div className="flex-1 max-h-96 overflow-y-auto pr-1 space-y-2.5">
        {list && list.length === 0 && <p className="text-[12px] text-muted">No messages yet. Ask your team anything about the project.</p>}
        {list?.map((m) => (
          <div key={m.id} className={`flex gap-2 ${m.mine ? "flex-row-reverse" : ""}`}>
            {!m.mine && <span className="w-7 h-7 rounded-full bg-gradient-to-br from-magenta to-plum text-white flex items-center justify-center text-[10px] font-semibold shrink-0" aria-hidden="true">{initials(m.who || "G")}</span>}
            <div className={`max-w-[80%] rounded-2xl px-3 py-2 ${m.mine ? "bg-plum text-white rounded-tr-sm" : "bg-mist text-ink rounded-tl-sm"}`}>
              <p className={`text-[10.5px] ${m.mine ? "text-white/70" : "text-muted"}`}>{m.mine ? "You" : `${m.who}${m.from === "team" ? " · Genomac team" : ""}`} · {when(m.at)}</p>
              <p className="text-[13px] whitespace-pre-wrap mt-0.5">{m.text}</p>
            </div>
          </div>
        ))}
      </div>
      <form onSubmit={send} className="mt-3 flex items-end gap-2">
        <textarea className={`${input} flex-1`} rows={1} placeholder="Write to your team…" value={text} onChange={(e) => setText(e.target.value)} aria-label="Message" />
        <button type="submit" disabled={!text.trim()} className="rounded-full bg-plum hover:bg-plum-soft disabled:opacity-50 text-white px-4 py-2 text-[12px]">Send</button>
      </form>
      {msg && <p className="text-[12px] text-red-600 mt-1" role="alert">{msg}</p>}
    </Panel>
  );
};

const ProjectView = ({ id, onBack, showBack }: { id: number; onBack: () => void; showBack: boolean }) => {
  const [d, setD] = useState<Detail | null>(null);
  const [msg, setMsg] = useState("");
  const [tick, setTick] = useState(0);
  const [doc, setDoc] = useState<number | null>(null);
  useEffect(() => {
    api<Detail>("project", { query: { id: String(id) } }).then((r) => (r.ok && r.data ? setD(r.data) : setMsg(errText(r))));
  }, [id, tick]);
  if (msg) return <p className="text-[13px] text-red-600">{msg}</p>;
  if (!d) return <p className="text-[13px] text-muted">Loading…</p>;
  const total = d.milestones.length || 14;
  const done = d.milestones.filter((m) => m.status === "done").length;
  const next = d.milestones.find((m) => m.status !== "done");
  const waiting = d.milestones.filter((m) => m.signoff && m.status === "done" && !m.signed);
  if (doc !== null) return <Reader projectId={d.project.id} docId={doc} onBack={() => setDoc(null)} />;
  return (
    <div className="space-y-3">
      {showBack && <button onClick={onBack} className="inline-flex items-center gap-1.5 text-[12px] text-muted hover:text-plum"><ArrowLeft size={14} /> All my projects</button>}
      <section className="relative overflow-hidden rounded-[18px] bg-gradient-to-br from-plum via-plum-soft to-plum text-white p-5">
        <svg className="absolute -right-16 -bottom-20 opacity-20" width="260" height="260" viewBox="0 0 220 220" aria-hidden="true"><circle cx="110" cy="110" r="80" fill="none" stroke="#cde24a" strokeWidth="1.5"/><circle cx="110" cy="110" r="105" fill="none" stroke="#b241b7" strokeWidth="1.5"/></svg>
        <p className="relative text-[11px] text-lime tracking-wide">{d.project.ref}</p>
        <h1 className="relative !text-white !text-[22px] mt-1">{d.project.title}</h1>
        <p className="relative text-[12px] text-white/80 mt-1">Current stage: {d.project.stage || "getting started"}{d.project.target_date ? ` · target delivery ${day(d.project.target_date)}` : ""}</p>
        <div className="relative mt-4 max-w-md">
          <div className="flex justify-between text-[11px] text-white/80"><span>{done} of {total} steps complete</span><span>{Math.round((done / total) * 100)}%</span></div>
          <div className="h-2 bg-white/20 rounded-full overflow-hidden mt-1.5"><i className="block h-full bg-lime" style={{ width: `${(done / total) * 100}%` }} /></div>
          {next && <p className="text-[11px] text-white/80 mt-1.5">Next: {next.name}</p>}
        </div>
      </section>

      <MilestoneSignoff projectId={d.project.id} steps={waiting} onSigned={() => setTick((t) => t + 1)} />

      <div className="grid gap-3 lg:grid-cols-2">
        <Panel title="Project progress" className="h-full">
          <ol className="relative border-l-2 border-gray-100 ml-2 space-y-2.5">
            {d.milestones.map((m) => (
              <li key={m.n} className="ml-4">
                <span className={`absolute -left-[9px] w-4 h-4 rounded-full flex items-center justify-center ${m.status === "done" ? "bg-plum text-white" : m.status === "in_progress" ? "bg-lime" : "bg-gray-200"}`} aria-hidden="true">{m.status === "done" && <Check size={10} />}</span>
                <p className={`text-[12.5px] ${m.status === "done" ? "text-ink" : m.status === "in_progress" ? "text-plum font-medium" : "text-muted"}`}>{m.name}</p>
                <p className="text-[10.5px] text-muted">
                  {m.status === "done" ? `Done ${day(m.done)}` : m.status === "in_progress" ? "In progress" : m.planned ? `Planned ${day(m.planned)}` : "Not started"}
                  {m.signoff && (m.signed ? " · signed off by you" : m.status === "done" ? " · needs your sign-off" : " · you will sign this off")}
                </p>
              </li>
            ))}
          </ol>
        </Panel>
        <Thread projectId={d.project.id} />
      </div>

      <div className="grid gap-3 lg:grid-cols-2 items-start">
        <DocList projectId={d.project.id} onOpen={setDoc} />
        <PortalIntake projectId={d.project.id} />
      </div>

      <PortalFiles projectId={d.project.id} />
      <PortalPayments projectId={d.project.id} />

      <div className="grid gap-3 lg:grid-cols-2">
        <Panel title="Updates from your team" className="h-full">
          {d.updates.length === 0 && <p className="text-[12px] text-muted">Your team's weekly updates will appear here.</p>}
          <ul className="divide-y divide-gray-100">
            {d.updates.map((u) => (
              <li key={u.id} className="py-2.5 text-[12.5px]">
                <p className="text-[10.5px] text-muted">{day(u.date)} · {u.author}</p>
                <p className="mt-0.5 whitespace-pre-wrap">{u.done}</p>
                {u.next && <p className="mt-0.5 text-muted whitespace-pre-wrap">Next: {u.next}</p>}
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title="Your Genomac team" className="h-full">
          <ul className="space-y-2">
            {d.team.map((t) => (
              <li key={t.name} className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-full bg-gradient-to-br from-magenta to-plum text-white flex items-center justify-center text-[10px] font-semibold" aria-hidden="true">{initials(t.name)}</span>
                <div><p className="text-[12.5px] text-ink">{t.name}</p><p className="text-[10.5px] text-muted first-letter:uppercase">{t.project_role || "Team member"}</p></div>
              </li>
            ))}
          </ul>
          <p className="text-[11px] text-muted mt-3">You lead the research; your Genomac team supports it. Your documents to sign are under "Your documents".</p>
        </Panel>
      </div>
    </div>
  );
};

const ClientPortal = () => {
  const [me, setMe] = useState<Me | null | "loading" | "off">("loading");
  const [projects, setProjects] = useState<ProjectLite[] | null>(null);
  const [open, setOpen] = useState<number | null>(null);
  const [pwOpen, setPwOpen] = useState(false);

  useEffect(() => {
    document.title = "Client portal — Genomac Services & Consult";
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex, nofollow";
    document.head.appendChild(meta);
    return () => meta.remove();
  }, []);
  const load = useCallback(async () => {
    const r = await api<{ client: Me }>("me");
    if (!r.ok || !r.data) return setMe(r.status === 503 ? "off" : null);
    setMe(r.data.client);
    const p = await api<{ projects: ProjectLite[] }>("projects");
    const list = p.ok && p.data ? p.data.projects : [];
    setProjects(list);
    if (list.length === 1) setOpen(list[0]!.id);
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const signOut = async () => {
    await api("logout", { method: "POST" });
    setMe(null);
    setProjects(null);
    setOpen(null);
  };

  if (me === "loading") return <div className="hub-root min-h-screen bg-[#e9ebec]" />;
  if (me === "off" || me === null) {
    return (
      <div className="hub-root min-h-screen bg-[#e9ebec] flex items-center justify-center p-4">
        {me === "off" ? <p className="text-muted text-center text-[13px]">The client portal is not open yet.</p> : <SignIn onDone={load} />}
      </div>
    );
  }

  return (
    <div className="hub-root min-h-screen bg-[#e9ebec] p-0 md:p-3">
      <div className="md:rounded-[28px] bg-white md:p-3 min-h-screen md:min-h-[calc(100vh-24px)] flex flex-col gap-3">
        <header className="bg-[#f3f4f4] rounded-[18px] px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-plum to-plum-soft text-lime flex items-center justify-center text-xs font-bold" aria-hidden="true">G</span>
            <div className="leading-tight"><p className="text-[13px] font-semibold text-plum">Genomac Services &amp; Consult</p><p className="text-[10px] text-muted">Client portal</p></div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right leading-tight"><p className="text-[12px] text-ink">{me.name}</p><p className="text-[10px] text-muted">{me.organization || me.email}</p></div>
            <button onClick={() => setPwOpen(true)} className="text-[12px] text-muted hover:text-plum">Password</button>
            <button onClick={signOut} className="inline-flex items-center gap-1 text-[12px] text-muted hover:text-plum"><LogOut size={14} /> Sign out</button>
          </div>
        </header>
        <main className="flex-1 bg-[#f3f4f4] rounded-[22px] px-3 md:px-5 py-4 md:py-5">
          {open !== null ? (
            <ProjectView id={open} onBack={() => setOpen(null)} showBack={(projects?.length ?? 0) > 1} />
          ) : (
            <div className="space-y-3">
              <h1>Your projects</h1>
              {projects && projects.length === 0 && <p className="text-[13px] text-muted">No project is open for you yet. Your project lead will add you.</p>}
              <div className="grid gap-3 sm:grid-cols-2">
                {projects?.map((p) => (
                  <button key={p.id} onClick={() => setOpen(p.id)} className="text-left bg-white rounded-[16px] p-4 hover:shadow-sm border border-transparent hover:border-plum/30">
                    <p className="text-[11px] text-magenta-dark">{p.ref}</p>
                    <p className="text-[14px] text-ink font-medium mt-0.5">{p.title}</p>
                    <p className="text-[11px] text-muted mt-0.5">Stage: {p.stage || "getting started"}</p>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mt-3"><i className="block h-full bg-plum" style={{ width: `${(p.done / p.total) * 100}%` }} /></div>
                    <p className="text-[10.5px] text-muted mt-1">{p.done} of {p.total} steps complete</p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </main>
        {PRIVACY_APPROVED && <footer className="text-center text-[11px] text-muted pb-1"><a href="/client/privacy" className="hover:text-plum">Privacy notice</a></footer>}
      </div>
      {pwOpen && <ChangePassword onClose={() => setPwOpen(false)} />}
    </div>
  );
};

export default ClientPortal;
