import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Download, LogOut, Mail, RefreshCw, Search, Trash2, X } from "lucide-react";

// Private page for reading and managing form enquiries. It is not linked anywhere on the site, is kept
// out of search results, and every call goes through /api/admin, which checks a signed login cookie.

const STATUSES = ["New", "Contacted", "In progress", "Won", "Closed"] as const;
type Status = (typeof STATUSES)[number];

type Enquiry = {
  id: number;
  created_at: string;
  source: "contact" | "research-clinic" | "clinic";
  enquiry_type: string;
  name: string;
  organization: string;
  email: string;
  country: string;
  title: string;
  service: string;
  status: Status;
  notes: string;
  data: Record<string, string>;
};

type Counts = Record<Status, number>;

const statusStyle: Record<Status, string> = {
  New: "bg-magenta text-white",
  Contacted: "bg-blue-100 text-blue-800",
  "In progress": "bg-amber-100 text-amber-800",
  Won: "bg-lime text-plum",
  Closed: "bg-gray-200 text-gray-700",
};

const sourceLabel: Record<Enquiry["source"], string> = {
  contact: "Contact form",
  "research-clinic": "Research-to-Publication Lab",
  clinic: "Research Clinic",
};

const fieldLabels: [string, string][] = [
  ["enquiryType", "Enquiry type"],
  ["name", "Name"],
  ["organization", "Organization"],
  ["email", "Email"],
  ["country", "Country"],
  ["title", "Project title"],
  ["service", "Service"],
  ["engagement", "Engagement model"],
  ["timeline", "Timeline"],
  ["budget", "Budget"],
  ["description", "Description"],
  ["deliverables", "Expected deliverables"],
  ["additional", "Additional information"],
];

type Result<T> = { ok: boolean; status: number; data: (T & { error?: string }) | null };

const call = async <T,>(
  action: string,
  opts: { method?: string; body?: unknown; query?: Record<string, string> } = {},
): Promise<Result<T>> => {
  const qs = new URLSearchParams({ action, ...opts.query });
  try {
    const res = await fetch(`/api/admin?${qs}`, {
      method: opts.method ?? "GET",
      headers: { "X-Requested-With": "gsc-admin", ...(opts.body ? { "Content-Type": "application/json" } : {}) },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
    const data = await res.json().catch(() => null);
    return { ok: res.ok, status: res.status, data };
  } catch {
    return { ok: false, status: 0, data: null };
  }
};

const when = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

const inputClass =
  "w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-[15px] text-ink placeholder:text-gray-400 focus:outline-none focus:border-magenta focus:ring-2 focus:ring-magenta/15 transition";

const Login = ({ onDone }: { onDone: () => void }) => {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    const r = await call("login", { method: "POST", body: { password } });
    setBusy(false);
    if (r.ok) return onDone();
    setError(
      r.status === 401
        ? "That password is not correct."
        : r.status === 429
          ? (r.data?.error ?? "Too many attempts. Try again later.")
          : "Could not sign in. Please try again.",
    );
  };

  return (
    <form onSubmit={submit} className="w-full max-w-sm bg-white rounded-3xl border border-gray-200/80 p-8 shadow-xl shadow-plum/5">
      <h1 className="text-xl font-bold text-plum">GSC Admin</h1>
      <p className="text-sm text-muted mt-1 mb-6">Sign in to view website enquiries.</p>
      <label className="block text-sm font-medium text-plum mb-1.5" htmlFor="admin-password">
        Password
      </label>
      <input
        id="admin-password"
        type="password"
        autoComplete="current-password"
        autoFocus
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className={inputClass}
      />
      {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
      <button
        type="submit"
        disabled={busy || !password}
        className="mt-5 w-full bg-magenta hover:bg-magenta-dark disabled:opacity-60 text-white py-3 rounded-full text-sm font-medium transition-colors"
      >
        {busy ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
};

const Detail = ({
  enquiry,
  onClose,
  onChange,
  onDelete,
}: {
  enquiry: Enquiry;
  onClose: () => void;
  onChange: (row: Enquiry) => void;
  onDelete: (id: number) => void;
}) => {
  const [notes, setNotes] = useState(enquiry.notes);
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");

  const save = async (patch: { status?: Status; notes?: string }) => {
    setSaving(true);
    setError("");
    const r = await call<{ row: Enquiry }>("update", { method: "POST", body: { id: enquiry.id, ...patch } });
    setSaving(false);
    if (r.ok && r.data) onChange(r.data.row);
    else setError("Could not save. Please try again.");
  };

  const remove = async () => {
    const r = await call("delete", { method: "POST", body: { id: enquiry.id } });
    if (r.ok) onDelete(enquiry.id);
    else setError("Could not delete. Please try again.");
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-plum/50" onClick={onClose}>
      <aside
        className="w-full max-w-xl h-full overflow-y-auto bg-white p-6 md:p-8 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Enquiry details"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold tracking-widest uppercase text-magenta-dark">{sourceLabel[enquiry.source]}</p>
            <h2 className="text-xl font-bold text-plum leading-snug mt-1">{enquiry.title || "(no title)"}</h2>
            <p className="text-sm text-muted mt-1">Received {when(enquiry.created_at)}</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="p-2 text-muted hover:text-plum">
            <X size={20} />
          </button>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <label className="text-sm font-medium text-plum" htmlFor="status">
            Status
          </label>
          <select
            id="status"
            value={enquiry.status}
            disabled={saving}
            onChange={(e) => save({ status: e.target.value as Status })}
            className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm"
          >
            {STATUSES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <a
            href={`mailto:${enquiry.email}?subject=${encodeURIComponent(`Re: ${enquiry.title}`)}`}
            className="ml-auto inline-flex items-center gap-2 bg-magenta hover:bg-magenta-dark text-white px-4 py-2 rounded-full text-sm font-medium transition-colors"
          >
            <Mail size={15} /> Reply by email
          </a>
        </div>

        <dl className="mt-6 space-y-4">
          {fieldLabels.map(([key, label]) => {
            const value = enquiry.data?.[key];
            if (!value) return null;
            return (
              <div key={key}>
                <dt className="text-xs font-bold tracking-widest uppercase text-muted">{label}</dt>
                <dd className="mt-1 text-[15px] text-ink whitespace-pre-wrap break-words">{value}</dd>
              </div>
            );
          })}
        </dl>

        <div className="mt-8 pt-6 border-t border-gray-100">
          <label className="block text-sm font-medium text-plum mb-1.5" htmlFor="notes">
            Private notes
          </label>
          <textarea
            id="notes"
            rows={4}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="For example: called on Monday, sending proposal Friday"
            className={inputClass}
          />
          <button
            onClick={() => save({ notes })}
            disabled={saving || notes === enquiry.notes}
            className="mt-3 bg-plum hover:bg-plum-soft disabled:opacity-50 text-white px-5 py-2 rounded-full text-sm font-medium transition-colors"
          >
            {saving ? "Saving…" : "Save notes"}
          </button>
          {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
        </div>

        <div className="mt-8 pt-6 border-t border-gray-100">
          {confirming ? (
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm text-ink">Delete this enquiry permanently?</span>
              <button onClick={remove} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-full text-sm font-medium">
                Yes, delete
              </button>
              <button onClick={() => setConfirming(false)} className="text-sm text-muted hover:text-plum">
                Cancel
              </button>
            </div>
          ) : (
            <button onClick={() => setConfirming(true)} className="inline-flex items-center gap-2 text-sm text-red-600 hover:text-red-700">
              <Trash2 size={15} /> Delete enquiry
            </button>
          )}
        </div>
      </aside>
    </div>
  );
};

const Dashboard = ({ onSignedOut }: { onSignedOut: () => void }) => {
  const [rows, setRows] = useState<Enquiry[]>([]);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState<Counts | null>(null);
  const [status, setStatus] = useState("");
  const [source, setSource] = useState("");
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openId, setOpenId] = useState<number | null>(null);

  // Wait for typing to pause before searching
  useEffect(() => {
    const t = setTimeout(() => setQ(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const fetchPage = useCallback(
    async (offset: number) => {
      setLoading(true);
      setError("");
      const r = await call<{ rows: Enquiry[]; total: number; counts: Counts }>("list", {
        query: { status, source, q, offset: String(offset) },
      });
      setLoading(false);
      if (r.status === 401) return onSignedOut();
      if (!r.ok || !r.data) return setError("Could not load enquiries. Please try again.");
      const { rows: page, total: t, counts: c } = r.data;
      setRows((prev) => (offset ? [...prev, ...page] : page));
      setTotal(t);
      setCounts(c);
    },
    [status, source, q, onSignedOut],
  );

  useEffect(() => {
    // Loads from the server whenever a filter changes; state is set once the response arrives
    fetchPage(0);
  }, [fetchPage]);

  const signOut = async () => {
    await call("logout", { method: "POST" });
    onSignedOut();
  };

  const open = rows.find((r) => r.id === openId) ?? null;

  return (
    <div className="w-full max-w-6xl">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-plum">Enquiries</h1>
          <p className="text-sm text-muted">
            {total} {total === 1 ? "enquiry" : "enquiries"}
            {status || source || q ? " match your filters" : " in total"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchPage(0)}
            className="inline-flex items-center gap-2 bg-white border border-gray-200 hover:border-gray-300 text-plum px-4 py-2 rounded-full text-sm font-medium"
          >
            <RefreshCw size={15} /> Refresh
          </button>
          <a
            href="/api/admin?action=export"
            className="inline-flex items-center gap-2 bg-white border border-gray-200 hover:border-gray-300 text-plum px-4 py-2 rounded-full text-sm font-medium"
          >
            <Download size={15} /> Export CSV
          </a>
          <button onClick={signOut} className="inline-flex items-center gap-2 text-sm text-muted hover:text-plum px-2 py-2">
            <LogOut size={15} /> Sign out
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => setStatus("")}
          className={`px-4 py-1.5 rounded-full text-sm font-medium border ${status === "" ? "bg-plum text-white border-plum" : "bg-white text-plum border-gray-200"}`}
        >
          All
        </button>
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setStatus(status === s ? "" : s)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border ${status === s ? "bg-plum text-white border-plum" : "bg-white text-plum border-gray-200"}`}
          >
            {s} {counts ? <span className="opacity-60">· {counts[s]}</span> : null}
          </button>
        ))}
      </div>

      <div className="grid sm:grid-cols-[1fr_auto] gap-3 mb-6">
        <div className="relative">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, organization, email, country or project"
            className={`${inputClass} pl-10`}
            aria-label="Search enquiries"
          />
        </div>
        <select value={source} onChange={(e) => setSource(e.target.value)} className={`${inputClass} sm:w-52`} aria-label="Filter by form">
          <option value="">All forms</option>
          <option value="contact">Contact form</option>
          <option value="research-clinic">Research-to-Publication Lab</option>
          <option value="clinic">Research Clinic</option>
        </select>
      </div>

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      <div className="space-y-3">
        {rows.map((r) => (
          <button
            key={r.id}
            onClick={() => setOpenId(r.id)}
            className="w-full text-left bg-white border border-gray-200/80 hover:border-magenta/40 hover:shadow-lg hover:shadow-plum/5 rounded-2xl p-4 md:p-5 transition-all grid md:grid-cols-[1.2fr_1.6fr_auto] gap-x-6 gap-y-2 items-center"
          >
            <span>
              <span className={`block text-[15px] text-plum ${r.status === "New" ? "font-bold" : "font-semibold"}`}>{r.name}</span>
              <span className="block text-sm text-muted">{r.organization}</span>
            </span>
            <span>
              <span className="block text-[15px] text-ink line-clamp-1">{r.title}</span>
              <span className="block text-xs text-muted">
                {sourceLabel[r.source]} · {r.service} · {r.country}
              </span>
            </span>
            <span className="flex md:flex-col md:items-end items-center gap-2">
              <span className={`text-[11px] font-bold tracking-wide uppercase px-3 py-1 rounded-full ${statusStyle[r.status]}`}>{r.status}</span>
              <span className="text-xs text-muted">{when(r.created_at)}</span>
            </span>
          </button>
        ))}
        {!loading && rows.length === 0 && !error && (
          <p className="text-center text-muted py-16">
            {status || source || q ? "No enquiries match those filters." : "No enquiries yet. They will appear here as soon as someone submits a form."}
          </p>
        )}
      </div>

      {rows.length < total && (
        <div className="text-center mt-6">
          <button
            onClick={() => fetchPage(rows.length)}
            disabled={loading}
            className="bg-white border border-gray-200 hover:border-gray-300 text-plum px-6 py-2.5 rounded-full text-sm font-medium disabled:opacity-60"
          >
            {loading ? "Loading…" : `Load more (${total - rows.length} left)`}
          </button>
        </div>
      )}

      {open && (
        <Detail
          enquiry={open}
          onClose={() => setOpenId(null)}
          onChange={(row) => {
            // Update in place (not a reload) so the panel stays open even if the row no longer matches the filter
            if (open.status !== row.status) {
              setCounts((c) => c && { ...c, [open.status]: c[open.status] - 1, [row.status]: c[row.status] + 1 });
            }
            setRows((prev) => prev.map((r) => (r.id === row.id ? row : r)));
          }}
          onDelete={(id) => {
            setOpenId(null);
            setCounts((c) => c && { ...c, [open.status]: c[open.status] - 1 });
            setRows((prev) => prev.filter((r) => r.id !== id));
            setTotal((t) => t - 1);
          }}
        />
      )}
    </div>
  );
};

type Auth = "checking" | "out" | "in" | "unconfigured";

const Admin = () => {
  const [auth, setAuth] = useState<Auth>("checking");

  useEffect(() => {
    document.title = "Admin — GSC";
    call("me").then((r) => setAuth(r.ok ? "in" : r.status === 503 ? "unconfigured" : "out"));
  }, []);

  const signedOut = useCallback(() => setAuth("out"), []);

  return (
    <div className="min-h-screen bg-mist px-4 sm:px-6 py-10 md:py-14 flex justify-center items-start">
      {auth === "checking" && <p className="text-muted mt-24">Loading…</p>}
      {auth === "unconfigured" && (
        <div className="max-w-md bg-white rounded-3xl border border-gray-200/80 p-8 mt-16">
          <h1 className="text-xl font-bold text-plum">Admin is not set up yet</h1>
          <p className="text-sm text-muted mt-2">
            The database and admin password still need to be added in Vercel. Once they are, reload this page.
          </p>
        </div>
      )}
      {auth === "out" && (
        <div className="mt-16">
          <Login onDone={() => setAuth("in")} />
        </div>
      )}
      {auth === "in" && <Dashboard onSignedOut={signedOut} />}
    </div>
  );
};

export default Admin;
