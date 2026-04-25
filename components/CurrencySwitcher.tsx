"use client";

// Visitor-facing checkout currency switcher.
//
// Renders a small "Pay in: [USD ▼]" dropdown driven by the admin's
// `enabledCurrencies` list (read via /api/locale/currencies — public read
// of the currency slice of settings). On mount it asks /api/locale/suggest
// for an IP-derived hint and pre-selects that currency if it's in the
// enabled list. The user's pick is persisted in localStorage so it sticks
// across reloads on the same device.
//
// `useCheckoutCurrency()` exposes the same state for any component that
// needs to render a converted price (see lib/currency-convert.ts).

import { useCallback, useEffect, useState } from "react";
import { byCode, type CurrencyDef } from "@/lib/currencies";

const STORAGE_KEY = "odudoc.checkoutCurrency";

interface EnabledCurrency {
  code: string;
  name: string;
  symbol: string;
  decimals: number;
}

interface ApiPayload {
  default: EnabledCurrency;
  enabled: EnabledCurrency[];
}

interface SwitcherState {
  loading: boolean;
  defaultCode: string;
  enabled: EnabledCurrency[];
  selected: string;
}

// Module-level promise so concurrent <CurrencySwitcher /> instances and
// useCheckoutCurrency() callers all share one network round-trip — keeps
// behaviour consistent with the rest of the in-memory codebase.
let _enabledPromise: Promise<ApiPayload> | null = null;
function loadEnabled(): Promise<ApiPayload> {
  if (!_enabledPromise) {
    _enabledPromise = fetch("/api/locale/currencies", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .catch(() => ({
        default: { code: "USD", name: "US Dollar", symbol: "$", decimals: 2 },
        enabled: [{ code: "USD", name: "US Dollar", symbol: "$", decimals: 2 }],
      } as ApiPayload));
  }
  return _enabledPromise;
}

function readStored(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeStored(code: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, code);
  } catch {
    /* localStorage unavailable / quota exceeded — fail silent */
  }
}

export function useCheckoutCurrency(): {
  code: string;
  def: CurrencyDef | undefined;
  enabled: EnabledCurrency[];
  defaultCode: string;
  loading: boolean;
  set: (code: string) => void;
} {
  const [state, setState] = useState<SwitcherState>({
    loading: true,
    defaultCode: "USD",
    enabled: [],
    selected: readStored() || "USD",
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const payload = await loadEnabled();
      if (cancelled) return;
      const stored = readStored();
      const inEnabled = (c: string) => payload.enabled.some((x) => x.code === c);

      let selected = stored && inEnabled(stored) ? stored : payload.default.code;

      // No stored choice yet — try the geo hint.
      if (!stored) {
        try {
          const r = await fetch("/api/locale/suggest", { cache: "no-store" });
          if (r.ok) {
            const j = await r.json();
            const suggested = j?.currency?.code as string | undefined;
            if (suggested && inEnabled(suggested)) selected = suggested;
          }
        } catch {
          /* keep payload.default */
        }
      }
      if (cancelled) return;
      setState({
        loading: false,
        defaultCode: payload.default.code,
        enabled: payload.enabled,
        selected,
      });
    })();
    return () => { cancelled = true; };
  }, []);

  const set = useCallback((code: string) => {
    writeStored(code);
    setState((prev) => ({ ...prev, selected: code }));
  }, []);

  return {
    code: state.selected,
    def: byCode(state.selected),
    enabled: state.enabled,
    defaultCode: state.defaultCode,
    loading: state.loading,
    set,
  };
}

export default function CurrencySwitcher({ className = "" }: { className?: string }) {
  const { code, enabled, loading, set } = useCheckoutCurrency();
  if (loading || enabled.length === 0) {
    return (
      <span className={`inline-flex items-center gap-1 text-xs text-gray-400 ${className}`}>
        Pay in: <span className="font-medium">{code}</span>
      </span>
    );
  }
  return (
    <label className={`inline-flex items-center gap-2 text-xs ${className}`}>
      <span className="text-gray-500">Pay in:</span>
      <select
        value={code}
        onChange={(e) => set(e.target.value)}
        className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-gray-700 outline-none focus:border-primary-500"
      >
        {enabled.map((c) => (
          <option key={c.code} value={c.code}>
            {c.code} {c.symbol ? `(${c.symbol})` : ""}
          </option>
        ))}
      </select>
    </label>
  );
}
