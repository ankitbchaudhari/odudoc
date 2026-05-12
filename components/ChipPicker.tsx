"use client";

// Scrollable chip picker used on the AI Prescription form.
//
// Displays a capped-height, vertically-scrollable panel of preset chips
// under an input. Clicking a chip toggles it in a comma-separated
// string. The doctor can still free-type in the input — the picker only
// adds / removes items it recognises.
//
// Collapsible so it doesn't dominate the form when not needed.

import { useMemo, useState } from "react";

interface ChipPickerProps {
  /** Full list of preset options shown inside the scrollable panel. */
  options: string[];
  /** Current comma-separated value (from the parent input). */
  value: string;
  /** Called with the new comma-separated value. */
  onChange: (next: string) => void;
  /** Collapsed-by-default toggle label. */
  label?: string;
  /** Enable the search box inside the panel. Defaults to true for >15 options. */
  searchable?: boolean;
  /** Max visible height for the scroll region (px). */
  maxHeight?: number;
}

function splitValue(v: string): string[] {
  return v
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function joinValue(items: string[]): string {
  return items.join(", ");
}

export default function ChipPicker({
  options,
  value,
  onChange,
  label = "Pick from common",
  searchable,
  maxHeight = 200,
}: ChipPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selected = useMemo(() => {
    const set = new Set(splitValue(value).map((s) => s.toLowerCase()));
    return set;
  }, [value]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.toLowerCase().includes(q));
  }, [options, query]);

  const showSearch = searchable ?? options.length > 15;

  function toggle(opt: string) {
    const items = splitValue(value);
    const idx = items.findIndex((s) => s.toLowerCase() === opt.toLowerCase());
    if (idx >= 0) {
      items.splice(idx, 1);
    } else {
      items.push(opt);
    }
    onChange(joinValue(items));
  }

  return (
    <div className="mt-1">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-700"
      >
        <svg
          className={`h-3 w-3 transition-transform ${open ? "rotate-90" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
        {label} ({options.length})
      </button>

      {open && (
        <div className="mt-2 rounded-lg border border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-900 p-2">
          {showSearch && (
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search…"
              className="mb-2 w-full rounded-md border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2 py-1 text-xs outline-none focus:border-indigo-400"
            />
          )}
          <div
            className="overflow-y-auto pr-1"
            style={{ maxHeight }}
          >
            <div className="flex flex-wrap gap-1.5">
              {filtered.map((opt) => {
                const on = selected.has(opt.toLowerCase());
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => toggle(opt)}
                    className={`rounded-full border px-2.5 py-1 text-[11px] transition ${
                      on
                        ? "border-indigo-600 bg-indigo-600 text-white shadow-sm"
                        : "border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-700 dark:text-slate-300 hover:border-indigo-400 hover:text-indigo-700"
                    }`}
                  >
                    {on ? "✓ " : "+ "}
                    {opt}
                  </button>
                );
              })}
              {filtered.length === 0 && (
                <p className="px-2 py-1 text-[11px] text-gray-500 dark:text-slate-400">
                  No matches.
                </p>
              )}
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-gray-500 dark:text-slate-400">
            <span>{selected.size} selected</span>
            {selected.size > 0 && (
              <button
                type="button"
                onClick={() => onChange("")}
                className="text-rose-600 hover:underline"
              >
                Clear all
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
