// Light/dark theme provider for the public OduDoc site.
//
// Strategy:
// 1. On first paint: read localStorage. If absent, fall back to
//    prefers-color-scheme. Set `class="dark"` on <html> accordingly.
// 2. User clicks toggle → flip class on <html>, persist to localStorage.
// 3. A small inline script in app/layout.tsx applies the class BEFORE
//    React hydrates so there's no flash of unstyled content (FOUC).
//
// The admin panel (app/admin/**) has its own slate→indigo→violet gradient
// chrome and ignores this provider — admin pages stay visually consistent
// regardless of the public-site theme.

"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type Theme = "light" | "dark";

interface ThemeContextValue {
  theme: Theme;
  toggle: () => void;
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Initial state matches whatever the no-flash script set on <html>.
  // We re-read it client-side after mount to avoid hydration mismatch.
  const [theme, setThemeState] = useState<Theme>("light");

  useEffect(() => {
    const stored = localStorage.getItem("odudoc-theme") as Theme | null;
    const initial: Theme =
      stored ??
      (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    applyTheme(initial);
    setThemeState(initial);
  }, []);

  const setTheme = useCallback((t: Theme) => {
    applyTheme(t);
    localStorage.setItem("odudoc-theme", t);
    setThemeState(t);
  }, []);

  const toggle = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [theme, setTheme]);

  return (
    <ThemeContext.Provider value={{ theme, toggle, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

function applyTheme(t: Theme): void {
  const root = document.documentElement;
  if (t === "dark") root.classList.add("dark");
  else root.classList.remove("dark");
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    // Used outside provider — return a safe no-op so the call site
    // doesn't crash. Mainly affects unit tests that mount components
    // without the provider.
    return {
      theme: "light",
      toggle: () => {},
      setTheme: () => {},
    };
  }
  return ctx;
}

// No-flash inline script. Embed this in <head> via `dangerouslySetInnerHTML`
// in app/layout.tsx so the `dark` class is set BEFORE the first paint.
export const NO_FLASH_SCRIPT = `
(function() {
  try {
    var stored = localStorage.getItem('odudoc-theme');
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var theme = stored || (prefersDark ? 'dark' : 'light');
    if (theme === 'dark') document.documentElement.classList.add('dark');
  } catch (e) {}
})();
`.trim();
