import { INTAKE_SECTIONS } from "../../shared/intakeForm.js";

// The Research Intake Form: editable for the client in the portal, read-only for the team in the hub.
type Value = Record<string, string | string[]>;
type Field = { key: string; label: string; type: "text" | "long" | "choice" | "multi"; required?: boolean; hint?: string; options?: string[] };
const box = "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-[12.5px] focus:outline-none focus:border-plum";

const IntakeFields = ({ value, onChange, readOnly = false }: { value: Value; onChange?: (v: Value) => void; readOnly?: boolean }) => {
  const set = (k: string, v: string | string[]) => onChange?.({ ...value, [k]: v });
  return (
    <div className="space-y-4">
      {(INTAKE_SECTIONS as { title: string; fields: Field[] }[]).map((s) => (
        <fieldset key={s.title} className="space-y-2.5">
          <legend className="text-[12.5px] text-plum font-medium mb-1">{s.title}</legend>
          {s.fields.map((f) => {
            const v = value[f.key];
            if (readOnly) {
              const shown = Array.isArray(v) ? v.join("; ") : v;
              return (
                <div key={f.key} className="text-[12px]">
                  <p className="text-[10.5px] text-muted">{f.label}</p>
                  <p className="whitespace-pre-wrap text-ink">{shown || <span className="text-muted">—</span>}</p>
                </div>
              );
            }
            return (
              <div key={f.key}>
                <p className="text-[11.5px] text-ink">{f.label}{f.required && <span className="text-magenta"> *</span>}</p>
                {f.hint && <p className="text-[10.5px] text-muted">{f.hint}</p>}
                <div className="mt-1">
                  {f.type === "text" && <input className={box} value={(v as string) ?? ""} onChange={(e) => set(f.key, e.target.value)} aria-label={f.label} />}
                  {f.type === "long" && <textarea className={box} rows={3} value={(v as string) ?? ""} onChange={(e) => set(f.key, e.target.value)} aria-label={f.label} />}
                  {f.type === "choice" && (
                    <div className="flex flex-wrap gap-1.5">
                      {f.options!.map((o) => (
                        <button type="button" key={o} onClick={() => set(f.key, v === o ? "" : o)} className={`rounded-full px-3 py-1 text-[11.5px] border ${v === o ? "bg-plum text-white border-plum" : "bg-white text-ink border-gray-200 hover:border-plum/40"}`}>{o}</button>
                      ))}
                    </div>
                  )}
                  {f.type === "multi" && (
                    <div className={f.key === "confirm" ? "space-y-1" : "flex flex-wrap gap-x-4 gap-y-1"}>
                      {f.options!.map((o) => {
                        const list = Array.isArray(v) ? v : [];
                        return (
                          <label key={o} className="flex items-start gap-1.5 text-[12px]">
                            <input type="checkbox" className="mt-0.5" checked={list.includes(o)} onChange={(e) => set(f.key, e.target.checked ? [...list, o] : list.filter((x) => x !== o))} />
                            <span>{o}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </fieldset>
      ))}
    </div>
  );
};

export default IntakeFields;
