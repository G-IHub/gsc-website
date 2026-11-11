// Calls to /api/billing (the same sign-in cookie as the rest of the admin page)

export type ApiResult<T> = { ok: boolean; status: number; data: (T & { error?: string }) | null };

export const billing = async <T,>(
  action: string,
  opts: { method?: "GET" | "POST"; body?: unknown; query?: Record<string, string> } = {},
): Promise<ApiResult<T>> => {
  const qs = new URLSearchParams({ action, ...opts.query });
  try {
    const res = await fetch(`/api/billing?${qs}`, {
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
