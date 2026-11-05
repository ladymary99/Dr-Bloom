"use client";

import { useEffect, useId, useRef, useState } from "react";
import { api } from "@/lib/api";
import { inputCls } from "@/components/ui";
import type { Code } from "@/components/encounter/types";

/** Type-ahead ICD-10 search (accessible combobox). Selected codes appear as removable chips. */
export default function Icd10Picker({ value, onChange, disabled }: { value: Code[]; onChange: (c: Code[]) => void; disabled?: boolean }) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Code[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(false);
  const listId = useId();
  const seq = useRef(0);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- clear stale results when the query becomes too short
    if (q.trim().length < 2) { setHits([]); return; }
    const id = ++seq.current;
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const { data } = await api.get<Code[]>("/lookups/icd10", { params: { q: q.trim() } });
        if (id === seq.current) { setHits(data.filter((h) => !value.some((v) => v.code === h.code))); setActive(0); }
      } catch { if (id === seq.current) setHits([]); }
      finally { if (id === seq.current) setLoading(false); }
    }, 250);
    return () => clearTimeout(t);
  }, [q, value]);

  function add(c: Code) { onChange([...value, c]); setQ(""); setHits([]); setOpen(false); }

  function onKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); setActive((a) => Math.min(a + 1, hits.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === "Enter" && open && hits[active]) { e.preventDefault(); add(hits[active]); }
    else if (e.key === "Escape") setOpen(false);
  }

  return (
    <div>
      {value.length > 0 && (
        <ul className="mb-2 flex flex-wrap gap-2" aria-label="Selected diagnoses">
          {value.map((c) => (
            <li key={c.code} className="flex items-center gap-1.5 rounded-full bg-[var(--primary-tint)]/35 py-1 pl-3 pr-1.5 text-xs text-[var(--ink)]">
              <b className="font-mono">{c.code}</b><span className="max-w-[16rem] truncate">{c.description}</span>
              {!disabled && <button type="button" aria-label={`Remove ${c.code}`} onClick={() => onChange(value.filter((v) => v.code !== c.code))} className="flex h-5 w-5 items-center justify-center rounded-full hover:bg-white">×</button>}
            </li>
          ))}
        </ul>
      )}
      {!disabled && (
        <div className="relative">
          <input
            role="combobox" aria-expanded={open && hits.length > 0} aria-controls={listId} aria-autocomplete="list" aria-label="Search ICD-10 diagnosis"
            value={q} onChange={(e) => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)} onKeyDown={onKey}
            placeholder="Search by name or code, e.g. hypertension or I10" className={inputCls}
          />
          {open && q.trim().length >= 2 && (
            <ul id={listId} role="listbox" className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-2xl border border-[var(--border)] bg-white p-1 shadow-xl">
              {loading && hits.length === 0 && <li className="px-3 py-2 text-xs text-[var(--muted)]">Searching…</li>}
              {!loading && hits.length === 0 && <li className="px-3 py-2 text-xs text-[var(--muted)]">No match. You can still describe the diagnosis in words below.</li>}
              {hits.map((h, i) => (
                <li key={h.code} role="option" aria-selected={i === active} onMouseDown={(e) => { e.preventDefault(); add(h); }} onMouseEnter={() => setActive(i)}
                  className={`flex cursor-pointer gap-3 rounded-xl px-3 py-2 text-sm ${i === active ? "bg-[var(--primary-tint)]/30" : ""}`}>
                  <b className="w-16 flex-none font-mono text-[var(--primary)]">{h.code}</b><span>{h.description}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
