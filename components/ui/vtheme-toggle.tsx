"use client";

import { useVTheme, type VTheme } from "@/components/providers/VThemeProvider";

const THEME_DOTS: { id: VTheme; label: string; color: string; ring: string }[] = [
  {
    id: "terra",
    label: "Terracotta",
    color: "oklch(57% .13 42)",
    ring: "oklch(57% .13 42 / .30)",
  },
  {
    id: "travels",
    label: "Travels",
    color: "hsl(222 62% 44%)",
    ring: "hsl(222 62% 44% / .28)",
  },
  {
    id: "neo",
    label: "Neomirai",
    color: "var(--neo-primary)",
    ring: "color-mix(in srgb, var(--neo-primary) 35%, transparent)",
  },
];

const NEXT_LABEL: Record<VTheme, string> = {
  terra:   "Travels",
  travels: "Neomirai",
  neo:     "Terracotta",
};

export function VThemeToggle() {
  const { theme, toggle } = useVTheme();

  return (
    <button
      onClick={toggle}
      aria-label={`Switch to ${NEXT_LABEL[theme]} theme`}
      title={`Switch to ${NEXT_LABEL[theme]}`}
      className="
        flex items-center gap-1.5 h-9 px-2.5 rounded-lg
        border border-border bg-muted/40
        hover:bg-muted transition-colors duration-150
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
      "
    >
      {THEME_DOTS.map(dot => (
        <span
          key={dot.id}
          className="block h-3 w-3 rounded-full transition-all duration-200"
          style={{
            background: dot.color,
            opacity: theme === dot.id ? 1 : 0.28,
            boxShadow: theme === dot.id ? `0 0 0 2px ${dot.ring}` : "none",
          }}
        />
      ))}
    </button>
  );
}
