"use client";

// Client hook: resolves the signed-in doctor's display currency
// (from their country) + a USD→target FX rate, then exposes a
// `format(usdAmount)` helper. Use this on every /dashboard/doctor
// surface that renders money so India-based doctors see ₹, US
// doctors see $, etc.
//
// Single fetch chain on mount:
//   /api/doctors/me   → displayCurrency
//   /api/fx/rates?base=USD (only if displayCurrency != USD)

import { useEffect, useMemo, useState } from "react";
import {
  ALL_CURRENCIES,
  type CurrencyDef,
} from "@/lib/currencies";
import {
  DEFAULT_DOCTOR_CURRENCY,
  formatAmount,
  formatConverted,
} from "@/lib/doctor-display-currency";

interface State {
  ready: boolean;
  currency: CurrencyDef;
  rates: Record<string, number>;
}

export function useDoctorMoney(): State & {
  /** Format a USD amount into the doctor's display currency. */
  format: (usdAmount: number) => string;
  /** Format an amount in any source currency into the doctor's
   *  display currency. */
  formatFrom: (amount: number, fromCurrency: string) => string;
} {
  const [state, setState] = useState<State>({
    ready: false,
    currency: DEFAULT_DOCTOR_CURRENCY,
    rates: {},
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const meRes = await fetch("/api/doctors/me", { cache: "no-store" });
        if (!meRes.ok) {
          // Not a doctor or not signed in — fall back to USD with no
          // FX rates. format() will still produce a sensible "$X.XX".
          if (!cancelled) setState((s) => ({ ...s, ready: true }));
          return;
        }
        const meData = await meRes.json();
        const code: string = meData?.displayCurrency?.code || "USD";
        const def =
          ALL_CURRENCIES.find((c) => c.code === code) ||
          DEFAULT_DOCTOR_CURRENCY;
        let rates: Record<string, number> = {};
        if (def.code !== "USD") {
          try {
            const fxRes = await fetch("/api/fx/rates?base=USD", {
              cache: "no-store",
            });
            if (fxRes.ok) {
              const fxData = await fxRes.json();
              rates = fxData?.rates || {};
            }
          } catch {
            // FX unavailable — formatConverted falls back to a raw
            // "X.XX USD" string so we don't mis-state numbers.
          }
        }
        if (!cancelled) setState({ ready: true, currency: def, rates });
      } catch {
        if (!cancelled) setState((s) => ({ ...s, ready: true }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return useMemo(() => {
    const format = (usdAmount: number): string =>
      state.currency.code === "USD"
        ? formatAmount(usdAmount, state.currency)
        : formatConverted(usdAmount, "USD", state.currency, state.rates);
    const formatFrom = (amount: number, fromCurrency: string): string =>
      formatConverted(
        amount,
        (fromCurrency || "USD").toUpperCase(),
        state.currency,
        state.rates,
      );
    return { ...state, format, formatFrom };
  }, [state]);
}
