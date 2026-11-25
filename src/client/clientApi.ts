// Calls to /api/client (the client portal)
export type Res<T> = { ok: boolean; status: number; data: (T & { error?: string; missing?: string[] }) | null };

export const api = async <T,>(action: string, opts: { method?: "GET" | "POST"; body?: unknown; query?: Record<string, string> } = {}): Promise<Res<T>> => {
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
export const errText = (r: Res<unknown>) => (r.status === 0 ? "Could not reach the server." : r.data?.error ?? "Something went wrong.");
