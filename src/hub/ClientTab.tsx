import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Copy, Plus } from "lucide-react";
import { Btn, Field, smallInput } from "../admin/ui";
import { errorText, hub } from "./hubApi";
import ClientDocs from "./ClientDocs";
import ClientFiles from "./ClientFiles";

// The project's "Client" tab in the staff hub: who the client is in the portal, inviting them, and the
// conversation with them (separate from the team's internal discussion, which the client never sees).

type Client = { id: number; name: string; email: string; organization: string; active: boolean; added: string };
type Message = { id: number; at: string; text: string; from: "client" | "team"; who: string; mine: boolean };
const when = (iso: string) => new Date(iso).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const initials = (n: string) => n.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("");

const ClientTab = ({ projectId }: { projectId: number }) => {
  const [clients, setClients] = useState<Client[] | null>(null);
  const [canInvite, setCanInvite] = useState(false);
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [inviting, setInviting] = useState(false);
  const [f, setF] = useState({ name: "", email: "", organization: "" });
  const [temp, setTemp] = useState<{ email: string; password: string; reset?: boolean } | null>(null);
  const [text, setText] = useState("");
  const [msg, setMsg] = useState("");
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    const r = await hub<{ clients: Client[]; canInvite: boolean }>("client-list", { query: { id: String(projectId) } });
    if (r.ok && r.data) {
      setClients(r.data.clients);
      setCanInvite(r.data.canInvite);
    } else setMsg(errorText(r));
    const m = await hub<{ messages: Message[] }>("client-messages", { query: { id: String(projectId) } });
    if (m.ok && m.data) setMessages(m.data.messages);
  }, [projectId]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const invite = async (e: FormEvent) => {
    e.preventDefault();
    const r = await hub<{ tempPassword: string | null; existing: boolean }>("client-invite", { method: "POST", body: { project_id: projectId, ...f } });
    if (r.ok && r.data) {
      setTemp(r.data.tempPassword ? { email: f.email, password: r.data.tempPassword } : null);
      setMsg(r.data.existing ? `${f.email} already had a client account; this project was added to it.` : "");
      setF({ name: "", email: "", organization: "" });
      setInviting(false);
      load();
    } else setMsg(errorText(r));
  };
  const reset = async (c: Client) => {
    if (!window.confirm(`Give ${c.name} a new one-time password? Their old password stops working and they are signed out everywhere.`)) return;
    const r = await hub<{ tempPassword: string; email: string }>("client-reset", { method: "POST", body: { project_id: projectId, client_id: c.id } });
    if (r.ok && r.data) { setTemp({ email: r.data.email, password: r.data.tempPassword, reset: true }); setMsg(""); }
    else setMsg(errorText(r));
  };
  const revoke = async (c: Client) => {
    if (!window.confirm(`Remove ${c.name}'s access to this project in the client portal?`)) return;
    const r = await hub("client-revoke", { method: "POST", body: { project_id: projectId, client_id: c.id } });
    if (r.ok) load();
    else setMsg(errorText(r));
  };
  const send = async (e: FormEvent) => {
    e.preventDefault();
    const r = await hub("client-message-post", { method: "POST", body: { project_id: projectId, text } });
    if (r.ok) {
      setText("");
      load();
    } else setMsg(errorText(r));
  };

  return (
    <div className="space-y-2.5">
    <ClientDocs projectId={projectId} />
    <ClientFiles projectId={projectId} />
    <div className="hub-two grid gap-2.5 lg:grid-cols-2">
      <section className="bg-white rounded-[14px] p-3.5 flex flex-col">
        <div className="flex items-center justify-between gap-2 mb-2">
          <h2 className="text-[13px] text-ink font-medium">Conversation with the client</h2>
          <span className="text-[10.5px] text-muted">The client sees this. The Workspace discussion stays internal.</span>
        </div>
        <div className="flex-1 max-h-96 overflow-y-auto pr-1 space-y-2.5">
          {messages && messages.length === 0 && <p className="text-[12px] text-muted">No messages with the client yet.</p>}
          {messages?.map((m) => (
            <div key={m.id} className={`flex gap-2 ${m.mine ? "flex-row-reverse" : ""}`}>
              {!m.mine && <span className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-semibold shrink-0 ${m.from === "client" ? "bg-lime text-plum" : "bg-gradient-to-br from-magenta to-plum text-white"}`} aria-hidden="true">{initials(m.who || "?")}</span>}
              <div className={`max-w-[80%] rounded-2xl px-3 py-2 ${m.mine ? "bg-plum text-white rounded-tr-sm" : m.from === "client" ? "bg-lime/30 text-ink rounded-tl-sm" : "bg-mist text-ink rounded-tl-sm"}`}>
                <p className={`text-[10.5px] ${m.mine ? "text-white/70" : "text-muted"}`}>{m.mine ? "You" : `${m.who}${m.from === "client" ? " · client" : ""}`} · {when(m.at)}</p>
                <p className="text-[12px] whitespace-pre-wrap mt-0.5">{m.text}</p>
              </div>
            </div>
          ))}
        </div>
        <form onSubmit={send} className="mt-3 flex items-end gap-2">
          <textarea className={`${smallInput} flex-1`} rows={1} placeholder="Write to the client…" value={text} onChange={(e) => setText(e.target.value)} aria-label="Message to the client" />
          <button type="submit" disabled={!text.trim()} className="rounded-full bg-plum hover:bg-plum-soft disabled:opacity-50 text-white px-3 py-2 text-[11px]">Send</button>
        </form>
      </section>

      <section className="bg-white rounded-[14px] p-3.5">
        <div className="flex items-center justify-between gap-2 mb-2">
          <h2 className="text-[13px] text-ink font-medium">Client portal access</h2>
          {canInvite && !inviting && <button onClick={() => { setInviting(true); setTemp(null); }} className="inline-flex items-center gap-1 rounded-full bg-plum hover:bg-plum-soft text-white px-3 py-1 text-[11px]"><Plus size={12} /> Invite client</button>}
        </div>
        {inviting && (
          <form onSubmit={invite} className="space-y-2 rounded-xl bg-mist p-3 mb-3">
            <div className="grid gap-2 sm:grid-cols-2">
              <Field label="Name"><input className={smallInput} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
              <Field label="Email"><input type="email" className={smallInput} value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
            </div>
            <Field label="Organization (optional)"><input className={smallInput} value={f.organization} onChange={(e) => setF({ ...f, organization: e.target.value })} /></Field>
            <div className="flex gap-2"><Btn variant="primary" type="submit" disabled={!f.name || !f.email}>Invite</Btn><Btn onClick={() => setInviting(false)}>Cancel</Btn></div>
          </form>
        )}
        {temp && (
          <div className="rounded-xl bg-magenta-tint/60 p-3 mb-3 text-[12px]">
            <p className="text-plum font-medium">{temp.reset ? "New password" : "Client account created"} for {temp.email}</p>
            <p className="text-[11px] text-muted mt-0.5">Send them the address <b>genomacsc.com/client</b> and this one-time password privately. They change it after signing in.</p>
            <div className="flex items-center gap-2 mt-2">
              <code className="bg-white px-2.5 py-1 rounded-md text-[13px]">{temp.password}</code>
              <button onClick={async () => { try { await navigator.clipboard.writeText(temp.password); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { setCopied(false); } }}
                className="inline-flex items-center gap-1 rounded-full border border-plum text-plum px-3 py-1 text-[11px]"><Copy size={12} /> {copied ? "Copied" : "Copy"}</button>
            </div>
          </div>
        )}
        {clients && clients.length === 0 && <p className="text-[12px] text-muted">No client has access yet.{canInvite ? " Invite them to follow progress and talk to the team." : ""}</p>}
        <ul className="divide-y divide-gray-100">
          {clients?.map((c) => (
            <li key={c.id} className="py-2 flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-full bg-lime text-plum flex items-center justify-center text-[10px] font-semibold shrink-0" aria-hidden="true">{initials(c.name)}</span>
              <div className="flex-1 min-w-0"><p className="text-[12px] text-ink truncate">{c.name}{!c.active && <span className="ml-1 text-[10px] text-muted">(switched off)</span>}</p><p className="text-[10.5px] text-muted truncate">{c.email}{c.organization ? ` · ${c.organization}` : ""} · added {c.added}</p></div>
              {canInvite && <button onClick={() => reset(c)} className="text-[11px] text-muted hover:text-plum">Reset password</button>}
              {canInvite && <button onClick={() => revoke(c)} className="text-[11px] text-muted hover:text-red-600">Remove</button>}
            </li>
          ))}
        </ul>
        <div className="mt-3 rounded-xl bg-blue-50 text-blue-800 text-[11px] p-3 space-y-1">
          <p><b>The client sees:</b> project code and title, stage, target date, the 14 steps, the team's names and roles, updates you mark "Share with client", documents you send, the final files once released, their fee, payments and balance (from the payment schedule), and this conversation.</p>
          <p><b>Never:</b> health, the internal payment or clearance flags, budget, cost or margin, the internal discussion, files, tasks, QA or other projects.</p>
        </div>
        {msg && <p className="text-[12px] text-muted mt-2" role="status">{msg}</p>}
      </section>
    </div>
    </div>
  );
};

export default ClientTab;
