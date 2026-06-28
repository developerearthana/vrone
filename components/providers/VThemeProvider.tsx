"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

export type VTheme = "terra" | "travels" | "neo";

const THEME_CYCLE: VTheme[] = ["terra", "travels", "neo"];

interface VThemeCtxValue {
  theme: VTheme;
  toggle: () => void;
}

const VThemeCtx = createContext<VThemeCtxValue>({ theme: "terra", toggle: () => {} });

function applyTheme(t: VTheme) {
  if (t === "neo" || t === "travels") {
    document.documentElement.setAttribute("data-vtheme", t);
  } else {
    document.documentElement.removeAttribute("data-vtheme");
  }
}

export function VThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<VTheme>("terra");

  useEffect(() => {
    const stored = typeof window !== "undefined"
      ? (localStorage.getItem("vtheme") as VTheme | null)
      : null;
    if (stored === "neo" || stored === "travels") setTheme(stored);
  }, []);

  const toggle = useCallback(() => {
    setTheme(prev => {
      const next = THEME_CYCLE[(THEME_CYCLE.indexOf(prev) + 1) % THEME_CYCLE.length];
      try { localStorage.setItem("vtheme", next); } catch {}
      applyTheme(next);
      return next;
    });
  }, []);

  return <VThemeCtx.Provider value={{ theme, toggle }}>{children}</VThemeCtx.Provider>;
}

export const useVTheme = () => useContext(VThemeCtx);
