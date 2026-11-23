// Calls to /api/hub (the Research Hub, staff only)

export type ApiResult<T> = { ok: boolean; status: number; data: (T & { error?: string }) | null };

export type HubUser = { id: number; email: string; name: string; role: string; unit: string; active: boolean };
export type Project = {
  id: number;
  ref: string;
  title: string;
  stage: string;
  unit: string;
  health: "green" | "amber" | "red";
  payment_status: "not_cleared" | "cleared" | "balance_due" | "paid";
  target_date: string | null;
  last_update: string | null;
  lead: string | null;
  my_role?: string | null;
  client?: { name: string; contact: string };
};
export type Me = { user: HubUser; canSeeMoney: boolean };

export const ROLE_LABEL: Record<string, string> = {
  management: "Management",
  finance: "Finance",
  director: "Subsidiary director",
  lead: "Lead researcher",
  member: "Team member",
  coordinator: "Project coordinator",
};

export const hub = async <T,>(
  action: string,
  opts: { method?: "GET" | "POST"; body?: unknown; query?: Record<string, string> } = {},
): Promise<ApiResult<T>> => {
  const qs = new URLSearchParams({ action, ...opts.query });
  try {
    const res = await fetch(`/api/hub?${qs}`, {
      method: opts.method ?? "GET",
      headers: { "X-Requested-With": "gsc-hub", ...(opts.body ? { "Content-Type": "application/json" } : {}) },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
    const data = await res.json().catch(() => null);
    return { ok: res.ok, status: res.status, data };
  } catch {
    return { ok: false, status: 0, data: null };
  }
};

export const errorText = (r: ApiResult<unknown>, fallback = "Something went wrong. Try again.") =>
  r.status === 0 ? "Could not reach the server." : (r.data?.error ?? fallback);
