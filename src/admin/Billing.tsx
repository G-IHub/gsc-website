import { useCallback, useEffect, useState } from "react";
import { FileText, Settings as SettingsIcon, Tag } from "lucide-react";
import { billing } from "./billingApi";
import BillingSettings from "./BillingSettings";
import Catalogue from "./Catalogue";
import InvoiceEditor from "./InvoiceEditor";
import InvoiceList from "./InvoiceList";
import type { Invoice, Service, Settings } from "./types";

// The Billing tab of the admin page: invoices, the services-and-prices dashboard, and settings.

type View =
  | { name: "list" }
  | { name: "edit"; id: number | null; template?: Invoice; k: number }
  | { name: "services" }
  | { name: "settings" };

const tabs = [
  { name: "list", label: "Invoices", icon: FileText },
  { name: "services", label: "Services & prices", icon: Tag },
  { name: "settings", label: "Settings", icon: SettingsIcon },
] as const;

export default function Billing({ onSignedOut }: { onSignedOut: () => void }) {
  const [view, setView] = useState<View>({ name: "list" });
  const [settings, setSettings] = useState<Settings | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);

  const loadServices = useCallback(async () => {
    const r = await billing<{ services: Service[] }>("services_list");
    if (r.status === 401) return onSignedOut();
    if (r.ok && r.data) setServices(r.data.services);
  }, [onSignedOut]);

  useEffect(() => {
    billing<{ settings: Settings }>("settings_get").then((r) => {
      if (r.status === 401) return onSignedOut();
      if (!r.ok || !r.data) return setError("Could not load billing. Please reload the page.");
      setSettings(r.data.settings);
    });
    loadServices();
  }, [loadServices, onSignedOut]);

  if (error) return <p className="text-red-600">{error}</p>;
  if (!settings) return <p className="text-muted py-10">Loading billing…</p>;

  const current = view.name === "edit" ? "list" : view.name;

  return (
    <div>
      <div className="mb-6 flex flex-wrap gap-2">
        {tabs.map(({ name, label, icon: Icon }) => (
          <button
            key={name}
            type="button"
            onClick={() => setView({ name } as View)}
            className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium ${current === name ? "border-plum bg-plum text-white" : "border-gray-200 bg-white text-plum hover:border-gray-300"}`}
          >
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {view.name === "list" && (
        <InvoiceList
          key={refresh}
          settings={settings}
          onOpen={(id) => setView({ name: "edit", id, k: Date.now() })}
          onNew={(copyOf) => setView({ name: "edit", id: null, template: copyOf, k: Date.now() })}
          onSignedOut={onSignedOut}
        />
      )}
      {view.name === "edit" && (
        <InvoiceEditor
          key={view.k}
          id={view.id}
          template={view.template}
          settings={settings}
          services={services}
          onBack={() => { setRefresh((n) => n + 1); setView({ name: "list" }); }}
          onSaved={() => setRefresh((n) => n + 1)}
          onDuplicate={(inv) => setView({ name: "edit", id: null, template: inv, k: Date.now() })}
          onSignedOut={onSignedOut}
        />
      )}
      {view.name === "services" && <Catalogue services={services} settings={settings} reload={loadServices} onSignedOut={onSignedOut} />}
      {view.name === "settings" && <BillingSettings settings={settings} onSaved={setSettings} onSignedOut={onSignedOut} />}
    </div>
  );
}
