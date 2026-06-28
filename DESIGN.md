---
name: Vrone ERP
description: Precision operations platform for Earthana Environmental Solutions
colors:
  # Primary — terracotta fired clay
  terracotta: "oklch(57% .13 42)"
  terracotta-dark: "oklch(43% .11 38)"
  terracotta-light: "oklch(70% .11 42)"
  terracotta-ghost: "oklch(57% .13 42 / .10)"

  # Sidebar — dark soil
  soil-base: "oklch(14.2% .024 52)"
  soil-surface: "oklch(18% .022 52)"
  soil-ink: "oklch(95% .007 68)"
  soil-ink-2: "oklch(67% .012 60)"
  soil-border: "oklch(100% 0 0 / .08)"
  soil-hover: "oklch(100% 0 0 / .08)"
  soil-icon: "oklch(80% .008 65)"

  # Content surfaces — warm white
  bg: "oklch(97% .005 65)"
  card: "oklch(100% 0 0)"
  ink: "oklch(10% .014 42)"
  ink-2: "oklch(42% .010 42)"
  border: "oklch(86% .008 42)"
  muted: "oklch(92% .008 42)"

  # Module accents
  module-hr: "#60a5fa"
  module-projects: "#fbbf24"
  module-crm: "#a78bfa"
  module-finance: "oklch(57% .13 42)"
  module-inventory: "#f97316"
  module-ai: "#ec4899"

  # Semantic
  signal-green: "#22c55e"
  signal-red: "hsl(0 84% 60%)"

  # ── Neomirai alternate theme
  neo-teal:           "hsl(190 90% 50%)"
  neo-teal-hi:        "hsl(190 90% 60%)"
  neo-teal-bright:    "hsl(190 90% 55%)"
  neo-teal-bright-glow: "hsl(190 90% 55% / .70)"
  neo-teal-a05:       "hsl(190 90% 50% / .055)"
  neo-teal-a07:       "hsl(190 90% 50% / .07)"
  neo-teal-a08:       "hsl(190 90% 50% / .08)"
  neo-teal-a10:       "hsl(190 90% 50% / .10)"
  neo-teal-a12:       "hsl(190 90% 50% / .12)"
  neo-teal-a14:       "hsl(190 90% 50% / .14)"
  neo-teal-a18:       "hsl(190 90% 50% / .18)"
  neo-teal-a20:       "hsl(190 90% 50% / .20)"
  neo-teal-a22:       "hsl(190 90% 50% / .22)"
  neo-teal-a32:       "hsl(190 90% 50% / .32)"
  neo-teal-aurora:    "hsl(190 90% 50% / .025)"
  neo-violet-aurora:  "hsl(270 70% 60% / .07)"
  neo-dot-grid:       "hsl(210 25% 92% / .022)"
  neo-sidebar:        "oklch(7% .02 252)"
  neo-sidebar-btn:    "oklch(11% .02 252)"
  neo-ink:            "oklch(88% .008 252)"
  neo-ink-2:          "oklch(50% .012 252)"
  neo-scrollbar:      "hsl(225 22% 28%)"
  neo-scrollbar-hi:   "hsl(225 22% 36%)"
  neo-card-border:    "hsl(225 22% 20%)"
  neo-deep-shadow-40: "hsl(225 35% 3% / .40)"
  neo-deep-shadow-50: "hsl(225 35% 3% / .50)"

typography:
  display:
    fontFamily: "Manrope, -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "3rem"
    fontWeight: 800
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Manrope, -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 700
    lineHeight: 1.25
  title:
    fontFamily: "Manrope, -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "1.05rem"
    fontWeight: 700
    lineHeight: 1.4
  body:
    fontFamily: "Manrope, -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Manrope, -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "0.85rem"
    fontWeight: 600
    letterSpacing: "0.04em"
rounded:
  pill: "100px"
  lg: "12px"
  md: "8px"
  sm: "6px"
  xs: "4px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "24px"
  lg: "48px"
  xl: "80px"
components:
  button-primary:
    backgroundColor: "{colors.terracotta}"
    textColor: "{colors.bg}"
    rounded: "{rounded.sm}"
    padding: "10px 20px"
  button-primary-hover:
    backgroundColor: "{colors.terracotta-light}"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.terracotta}"
    borderColor: "{colors.terracotta}"
    rounded: "{rounded.sm}"
    padding: "10px 20px"
  button-ghost:
    backgroundColor: "{colors.muted}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "10px 20px"
---

# Design System: Vrone ERP

## 1. Overview

**Creative North Star: "The Field Instrument"**

Vrone is built for operations professionals — environmental managers, field leads, finance teams. The interface must communicate that work is in progress, decisions are being made, and precision matters. The warm earth palette is not eco-branding or nature aesthetics; it is the color of soil samples, ceramic crucibles, and field gear that has been trusted for years. These are the colors of physical precision.

**Terracotta** is the single accent color. Fired clay — not amber, not orange, not rust. It marks every place the interface makes a claim: "this requires your attention," "this is active," "this is the action to take." Its rarity is part of its authority.

The **dark soil sidebar** (oklch 14%) creates a permanent anchor on the left — a visual column that never changes, providing orientation while the content area breathes. The content area is warm-white, not cream. No texture. No grain. Clean surfaces that put the data first.

**Manrope** carries the entire system. Variable weight from 400 to 800 creates hierarchy without a second typeface. At 700–800 in product UI it is direct and authoritative; at 400–500 in body copy it is readable across the 12-hour shifts these users work.

## 2. Colors

### Primary — Terracotta
- **Terracotta** (`oklch(57% .13 42)`): The sole action accent. Active nav, primary buttons, focus rings, active badges. Used on ≤12% of any screen.
- **Terracotta Dark** (`oklch(43% .11 38)`): Pressed/active state. Text on elevated surfaces when default terracotta would fail contrast.
- **Terracotta Light** (`oklch(70% .11 42)`): Hover brightening for buttons. Never as a surface color.
- **Terracotta Ghost** (`oklch(57% .13 42 / .10)`): Subtle hover tint for ghost buttons and secondary highlights.

**The Signal Rule.** Terracotta answers one question: "does this element require action, confirm a state, or mark a current selection?" If the answer is no, terracotta is not the right choice.

### Sidebar — Dark Soil (Independent System)
The sidebar operates with its own color vocabulary, independent of the light/dark mode toggle. It is always dark.

- **Soil Base** (`oklch(14.2% .024 52)`): Sidebar background. Warm near-black with a trace of iron.
- **Soil Surface** (`oklch(18% .022 52)`): Elevated elements within the sidebar (collapse button, profile area).
- **Soil Ink** (`oklch(95% .007 68)`): Primary text in sidebar — logo, active item label.
- **Soil Ink 2** (`oklch(67% .012 60)`): Default nav item text. Legible but not visually competing.
- **Soil Border** (`oklch(100% 0 0 / .08)`): Dividers within the sidebar (brand area border, footer border, right edge).
- **Soil Hover** (`oklch(100% 0 0 / .08)`): Hover background on inactive nav items.

### Content — Warm White
- **Background** (`oklch(97% .005 65)`): Page background. Warm-tinted near-white — not cream, not sand. Just off neutral.
- **Card** (`oklch(100% 0 0)`): Card and popover surfaces. Pure white stands against the background.
- **Ink** (`oklch(10% .014 42)`): Primary text. Warm near-black.
- **Ink 2** (`oklch(42% .010 42)`): Secondary text, descriptions, metadata.
- **Border** (`oklch(86% .008 42)`): Structural borders and dividers.
- **Muted** (`oklch(92% .008 42)`): Muted backgrounds, disabled states.

### Module Accents
Six distinct accent colors for module context indicators. Used exclusively on module-specific UI — hover states, category tags, data viz. Never as ambient decoration.

- HR: `#60a5fa` (slate blue)
- Projects: `#fbbf24` (amber)
- CRM: `#a78bfa` (violet)
- Finance: `oklch(57% .13 42)` (terracotta — same as primary)
- Inventory: `#f97316` (orange)
- AI/Analytics: `#ec4899` (rose)

## 3. Typography

**Primary Font:** Manrope (Google Fonts, weights 400–800)

Manrope is a geometric humanist — structured but not cold. At high weights it is authoritative without shouting; at low weights it is inviting without being casual. In a system where users read dense data tables and leave request forms, this range of expression in one family is essential.

### Scale (Fixed rem — no clamp() in product UI)

- **Display** (800, `3rem`, -0.02em): Page-level hero headings only. Not for dashboard cards or section titles.
- **Headline** (700, `1.75rem`, -0.01em): Major section headings, page titles, modal titles.
- **Title** (700, `1.05rem`): Card headings, table section labels, dialog subtitles.
- **Body** (400–500, `1rem`, 1.6 line-height): All descriptive copy. Capped at 65–75ch for prose.
- **Label** (600, `0.85rem`, 0.04em tracking): Status badges, column headers, form labels.

**The One Family Rule.** No second typeface. Manrope at weight 400–800 handles every hierarchy role in this system.

**Fixed Scale in Product.** Do not use `clamp()` for product UI headings. Dashboard panels, form sections, and sidebar labels should have consistent sizes regardless of viewport width. Fluid sizes are for landing-page heroes; product UI users deserve predictability.

## 4. Elevation

Flat by default. Surfaces define their layer via background color (warm bg → card white) rather than shadows. Shadows exist only in two contexts: interaction response, or permanent elevation above the flow (dropdown, modal, tooltip).

### Shadow Vocabulary
- **Card Resting** (`0 1px 3px hsl(20 10% 50% / .08)`): Minimal depth for cards on the warm background. Use only when the bg/card tonal difference isn't sufficient.
- **Hover Lift** (`0 4px 16px hsl(20 10% 50% / .12)`): Interactive card hover state.
- **Active Glow** (`0 2px 10px oklch(57% .13 42 / .30)`): Applied to active sidebar nav items. Terracotta bloom signals live state.
- **Elevated** (`0 8px 30px hsl(0 0% 0% / .12)`): Modals, dropdowns, command menus.

## 5. Components

### Buttons
Three variants, 6px radius (consistent with `--radius: 0.5rem`).

- **Primary:** Terracotta background, warm-white text, 10px/20px padding. Hover: terracotta-light. Focus: 2px terracotta ring, 3px offset. Active: terracotta-dark.
- **Outline:** Transparent background, 1px terracotta border, terracotta text. Hover: terracotta-ghost fill.
- **Ghost:** Muted background, ink text. Hover: muted + border. For tertiary actions.

**One Primary per section.** If two actions compete, one is Primary and the other is Outline or Ghost.

### Sidebar
- **Container:** Dark soil (oklch 14.2%), full height, flush left, no border-radius, no shadow, 1px soil-border right edge.
- **Nav item default:** Soil Ink 2 text, no background.
- **Nav item hover:** Soil Hover background, Soil Ink text.
- **Nav item active:** Terracotta background, warm-white text, active glow shadow. One pulse dot at trailing edge.
- **Collapse toggle:** Soil Surface button, positioned at `-right-3 top-8`, exits the sidebar boundary.
- **Desktop widths:** 288px expanded (`w-72`), 80px collapsed (`w-20`).

### Header
- **Style:** Flush top, full content-width, `h-14` (56px), solid card background, 1px border-b.
- **Content:** Breadcrumbs left, search + notifications + theme + profile right.
- **Avatar:** Primary (terracotta) circle, no gradients.

### Cards
- **Background:** Card (white) on Background (warm off-white). The contrast is subtle but visible.
- **Border:** 1px border, `hsl(var(--border))` — warm gray.
- **Radius:** 8px (`rounded-lg`).
- **Shadow:** None at rest. Hover lift on interactive cards.
- **Padding:** 24px standard.

### Navigation / Breadcrumbs
- **Separator:** `/` in muted-foreground/30.
- **Active segment:** Foreground text, semibold.
- **Previous segments:** Muted-foreground, hover → primary.

## 6. Do's and Don'ts

### Do:
- **Do** use terracotta exclusively for action, state, and confirmation. Active sidebar items, primary buttons, focus rings, live indicators.
- **Do** keep the sidebar always dark (oklch 14.2% soil base), independent of the app's light/dark mode.
- **Do** use flat surfaces at rest. Reserve shadows for interaction and elevation.
- **Do** apply fixed rem for all product UI type sizes. No `clamp()` inside dashboards, forms, or data tables.
- **Do** give every interactive component all states: default, hover, focus-visible, active, disabled.
- **Do** use `@media (prefers-reduced-motion: reduce)` alternatives for every animation.
- **Do** verify contrast — body text 4.5:1, large text 3:1. The warm muted foreground on warm background is the common failure point; bump toward ink end of the ramp if close.

### Don't:
- **Don't** use gradient text (`background-clip: text`). Use solid terracotta for emphasis.
- **Don't** use glassmorphism (backdrop-filter blur) decoratively. One structural use (scrolled nav) is intentional design; everywhere else is trend-chasing.
- **Don't** use `border-left` or `border-right` > 1px as a colored accent stripe. Use full borders, background tints, or leading icons instead.
- **Don't** build identical card grids (same icon + heading + text × 4–6). Use the module accent system, vary density, or use lists when cards are redundant.
- **Don't** put small-caps eyebrow labels above every section heading. One deliberate kicker per logical group; eyebrows on every section are AI grammar.
- **Don't** use `clamp()` for product UI type sizes. Fixed rem scales in the app; fluid scales on landing.
- **Don't** use an emerald, mint, or lime accent alongside terracotta — they fight. The module accent system uses its own restrained palette.
- **Don't** apply terracotta to decorative or inactive elements. Its rarity carries its authority.
