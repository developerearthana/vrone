# Vrone ERP — Application Manual

> Earthana Environmental Solutions Pvt. Ltd.  
> Maintained by: developer@earthana.in  
> Last updated: 2026-06-28

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Architecture](#2-architecture)
3. [Infrastructure & Deployment](#3-infrastructure--deployment)
4. [Design System](#4-design-system)
5. [Module Reference](#5-module-reference)
6. [Authentication & Roles](#6-authentication--roles)
7. [Development Guide](#7-development-guide)
8. [File Structure](#8-file-structure)
9. [Change Log](#9-change-log)

---

## 1. System Overview

**Vrone ERP** is Earthana Environmental Solutions' internal enterprise resource platform. It unifies HR, Finance, Project Management, CRM, Inventory, and AI/Analytics into a single system, replacing fragmented tools and providing one source of truth across all teams.

**Domains:**
| URL | Purpose |
|---|---|
| `dev.vrone.pro` | Development / staging ERP |
| `erp.vrone.pro` | Production ERP |
| `vrone.pro` | Public landing page |

---

## 2. Architecture

### Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router, Server Components) |
| Styling | Tailwind CSS + CSS custom properties |
| UI Components | Radix UI primitives (shadcn-style) |
| Font | Manrope (Google Fonts, 400–800) |
| Authentication | next-auth v5 |
| Database | MongoDB 7 (via Mongoose) |
| Animations | framer-motion |
| Icons | lucide-react |
| Charts | recharts |
| Forms | react-hook-form + zod |
| Drag & Drop | @dnd-kit |
| Rich Commands | cmdk (command palette) |
| Date Utilities | date-fns |
| Toasts | sonner |

### Key Patterns

- **Server Actions** (`app/actions/`) — all data mutations go through Next.js server actions with `safe-action.ts` wrapper
- **RBAC** (`lib/rbac.ts`, `lib/permissions.ts`) — role-based access control checks on every protected route
- **Rate Limiting** (`lib/rate-limit.ts`) — applied at middleware level
- **Sanitization** (`lib/sanitize.ts`) — DOMPurify-based input sanitization
- **Audit Logging** (`lib/audit.ts`) — all write operations logged

---

## 3. Infrastructure & Deployment

### Docker Services

```
vrone-caddy        # Reverse proxy (Caddy 2, ports 80/443)
vrone-dev-app      # Dev ERP (Next.js, internal port 8080)
vrone-prod-app     # Prod ERP (Next.js, internal port 8080)
vrone-dev-mongo    # Dev MongoDB 7
vrone-prod-mongo   # Prod MongoDB 7
```

### Caddy Routing (`/root/vrone/docker/proxy/Caddyfile`)

```
vrone.pro           → /opt/vrone/landing (static files)
dev.vrone.pro       → dev-app:8080
erp.vrone.pro       → prod-app:8080
```

### Volume Mounts

| Host Path | Container Path | Purpose |
|---|---|---|
| `/opt/vrone/landing` | `/var/www/landing` | Landing page static files |
| `/opt/vrone/data/dev-db` | MongoDB data | Dev database |
| `/opt/vrone/data/dev-cache` | `/app/.next/cache` | Next.js build cache |

### Deployment Scripts (`/root/vrone/scripts/`)

| Script | Purpose |
|---|---|
| `setup-dev.sh` | Initial dev environment setup |
| `update-dev.sh` | Pull and redeploy dev environment |
| `deploy-prod.sh` | Production deployment |
| `ssl-renew.sh` | SSL certificate renewal |

---

## 4. Design System

> **Active Design**: Model A — Warm Earth + Terracotta  
> Design system documented in `/root/DESIGN.md`  
> CSS tokens in `app/globals.css`, sidebar colors in `.app-sidebar` CSS block

### Color Tokens (CSS Custom Properties)

**Light Mode** (default)
| Token | Value | Role |
|---|---|---|
| `--background` | `hsl(30 18% 97%)` | Warm near-white page bg |
| `--foreground` | `hsl(16 10% 10%)` | Warm near-black text |
| `--primary` | `hsl(14 52% 43%)` | Terracotta — the sole accent |
| `--primary-foreground` | `hsl(30 20% 97%)` | Light text on terracotta |
| `--card` | `hsl(0 0% 100%)` | White card surface |
| `--secondary` | `hsl(20 10% 93%)` | Warm light secondary |
| `--muted` | `hsl(20 10% 92%)` | Muted background |
| `--muted-foreground` | `hsl(20 6% 42%)` | Muted text |
| `--border` | `hsl(20 10% 86%)` | Warm gray border |
| `--ring` | `hsl(14 52% 43%)` | Focus ring = terracotta |

**Dark Mode** (toggled via theme button)
| Token | Value | Role |
|---|---|---|
| `--background` | `hsl(16 8% 7%)` | Warm dark bg |
| `--primary` | `hsl(14 52% 52%)` | Brighter terracotta on dark |
| `--border` | `hsl(16 8% 20%)` | Dark border |

**Sidebar — Dark Soil (independent of mode toggle)**
| Token | OKLCH | Role |
|---|---|---|
| Soil base | `oklch(14.2% .024 52)` | Sidebar background |
| Soil ink | `oklch(95% .007 68)` | Active/logo text |
| Soil ink-2 | `oklch(67% .012 60)` | Inactive nav text |
| Soil border | `oklch(100% 0 0 / .08)` | Dividers, right edge |
| Active bg | `oklch(57% .13 42)` | Terracotta active item |

### Typography

- **Font**: Manrope (Google Fonts, weights 400–800)
- **Loading**: Via `next/font/google` in `app/layout.tsx`
- **Rule**: Fixed rem sizes in product UI (no `clamp()` in dashboards/forms)

### Utility Classes (`globals.css`)

| Class | Purpose |
|---|---|
| `.app-sidebar` | Dark soil sidebar base color + nav item overrides |
| `.app-sidebar-desktop` | Right border for desktop sidebar |
| `.sidebar-nav-link` | Inactive nav item (soil ink-2 text) |
| `.sidebar-nav-link-active` | Active nav item (terracotta bg + glow) |
| `.sidebar-active-pulse` | White pulse dot on active item |
| `.sidebar-collapse-btn` | Collapse toggle button (soil surface) |
| `.glass-card` | Card with border, shadow, terracotta hover border |
| `.glass-panel` | Panel container |
| `.glass-nav` | Sticky nav bar (`bg-card border-b`) |
| `.glass-1/2/3` | Surface elevation levels |
| `.custom-scrollbar` | 6px scrollbar for light surfaces |
| `.dark-scrollbar` | 4px scrollbar for dark sidebar |
| `.animate-in-fade-slide` | Page entry animation (0.4s ease-out) |
| `.animate-float-subtle` | 2px float loop for badges |
| `.text-gradient-primary` | Bold terracotta text |

### Component Library (`components/ui/`)

| Component | File |
|---|---|
| Sidebar | `sidebar.tsx` |
| Header | `header.tsx` |
| Button | `button.tsx` (CVA variants: default/destructive/outline/secondary/ghost/link) |
| Card | `card.tsx` |
| Command Menu | `command-menu.tsx` |
| Logo | `logo.tsx` |
| Theme Toggle | `theme-toggle.tsx` |
| All Radix UI wrappers | `dialog.tsx`, `dropdown-menu.tsx`, `tabs.tsx`, `select.tsx`, etc. |

---

## 5. Module Reference

### Navigation Items & Permissions

| Module | Route | Permission Key |
|---|---|---|
| Dashboard | `/dashboards/super-admin` or `/dashboards/employee` | `dashboard` |
| Activity | `/activity` | `activity` |
| Goals | `/goals` | `goals` |
| Contacts | `/contacts` | `contacts` |
| Sales | `/sales` | `sales` |
| Marketing | `/marketing` | `marketing` |
| Projects | `/projects` | `projects` |
| Work Orders | `/work-orders` | `work-orders` |
| Accounting | `/accounts` | `accounting` |
| Purchase | `/purchase` | `purchase` |
| Inventory | `/inventory` | `inventory` |
| HRM Admin | `/hrm` | `hrm` |
| Attendance | `/hrm/attendance` | `basic-hrm` (always allowed) |
| Leave | `/hrm/leave` | `basic-hrm` (always allowed) |
| Assets | `/assets` | `assets` |
| Masters | `/masters` | `masters` |
| Admin | `/admin` | `admin` |

### Dashboard Variants

| Role | Route |
|---|---|
| Super Admin / Admin | `/dashboards/super-admin` |
| Employee | `/dashboards/employee` |
| Manager | `/dashboards/manager` |
| Customer | `/dashboards/customer` |
| Vendor | `/dashboards/vendor` |
| Guest | `/dashboards/guest` |

---

## 6. Authentication & Roles

### Roles

| Role | Access Level |
|---|---|
| `super-admin` | Full access to all modules |
| `admin` | Full access to all modules |
| `*` / `all` permission | Full module access |
| Named permission strings | Per-module access (see table above) |
| `basic-hrm` | Attendance and Leave only (always granted) |

### Auth Flow

1. Login at `/login` — credentials validated via next-auth
2. Session stored in MongoDB
3. `middleware.ts` enforces authentication on all protected routes
4. `lib/rbac.ts` provides server-side permission checking in server actions

### Password Management

- `/change-password` — self-service password change
- Passwords hashed with bcryptjs

---

## 7. Development Guide

### Local Development

```bash
# Navigate to dev environment
cd /root/vrone/docker/dev

# Start all services
docker compose up -d

# View logs
docker compose logs -f dev-app

# Rebuild after code changes
docker compose build dev-app && docker compose up -d dev-app
```

### Environment Variables (`/root/vrone/docker/dev/.env`)

Required vars (see `.env.example`):
- `MONGODB_URI` — MongoDB connection string
- `NEXTAUTH_SECRET` — Random secret for next-auth
- `NEXTAUTH_URL` — Full URL of the dev instance
- `PORT` — App port (default: 8080)

### Code Conventions

- **Server actions** in `app/actions/` — always use `safe-action.ts` wrapper
- **Mutations** — audit-log via `lib/audit.ts`
- **Validation** — zod schemas, defined close to the action
- **Sanitization** — run user HTML through `lib/sanitize.ts` before DB writes
- **Components** — Tailwind utility classes; use CSS vars (`bg-primary`, `text-foreground`) not raw colors

### Testing

```bash
# Unit tests (Jest + Testing Library)
docker compose exec dev-app npm test

# Type checking
docker compose exec dev-app npx tsc --noEmit
```

Test files live in `__tests__/` and alongside source files as `*.test.ts`.

---

## 8. File Structure

```
/opt/vrone/dev/app/
├── app/                        # Next.js App Router
│   ├── layout.tsx              # Root layout (Manrope font, ThemeProvider)
│   ├── globals.css             # CSS custom properties + Tailwind base
│   ├── page.tsx                # Root redirect
│   ├── login/                  # Login page
│   ├── dashboards/             # Role-based dashboards
│   │   ├── super-admin/
│   │   ├── employee/
│   │   ├── manager/
│   │   ├── customer/
│   │   ├── vendor/
│   │   └── guest/
│   ├── hrm/                    # HR module
│   ├── projects/               # Projects module
│   ├── accounts/               # Accounting module
│   ├── sales/                  # Sales module
│   ├── contacts/               # CRM contacts
│   ├── marketing/              # Marketing module
│   ├── inventory/              # Inventory module
│   ├── assets/                 # Asset tracking
│   ├── goals/                  # Goals & KPI
│   ├── purchase/               # Purchase orders
│   ├── work-orders/            # Work orders
│   ├── masters/                # Master data
│   ├── admin/                  # Admin panel
│   ├── activity/               # Activity feed
│   └── api/                    # API routes (next-auth, uploads)
│
├── components/
│   ├── layout/
│   │   └── AppShell.tsx        # Sidebar + header wrapper
│   ├── ui/                     # Shared UI components
│   │   ├── sidebar.tsx
│   │   ├── header.tsx
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── command-menu.tsx
│   │   ├── logo.tsx
│   │   └── ...
│   ├── dashboards/             # Dashboard-specific components
│   ├── hrm/                    # HRM components
│   ├── kpi/                    # KPI tracking components
│   └── ...
│
├── lib/                        # Utilities & server logic
│   ├── db.ts                   # MongoDB connection
│   ├── rbac.ts                 # Role-based access control
│   ├── permissions.ts          # Permission definitions
│   ├── audit.ts                # Audit logging
│   ├── safe-action.ts          # Server action wrapper
│   ├── sanitize.ts             # Input sanitization
│   ├── rate-limit.ts           # Rate limiting
│   └── utils.ts                # cn() and general utilities
│
├── models/                     # Mongoose models
├── services/                   # Business logic services
├── hooks/                      # React hooks
├── types/                      # TypeScript types
├── middleware.ts               # Auth middleware
├── auth.ts                     # next-auth config
├── tailwind.config.ts          # Tailwind theme
├── next.config.ts              # Next.js config
└── docs/
    └── APPLICATION_MANUAL.md   # This file
```

---

## 9. Change Log

### 2026-06-28

**UI/UX Revamp — Model A: Warm Earth + Terracotta**

Design selection: User approved Model A with terracotta as highlight color.

*Design exploration (session 1)*
- Created 3 earth & nature tone design preview pages at `vrone.pro/design-*.html`
- Application Manual created at `docs/APPLICATION_MANUAL.md`

*Full revamp (session 2)*
- **`app/globals.css`** — Complete rewrite: terracotta primary (`hsl(14 52% 43%)`), warm-white background, dark soil sidebar CSS block using OKLCH, simplified 6px scrollbar, removed glassmorphism comment, added `.dark-scrollbar` for sidebar, renamed `animate-bounce-subtle` → `animate-float-subtle`
- **`/root/DESIGN.md`** — Fully rewritten to reflect Model A terracotta + soil sidebar system (replaces old Signal Green forest design)
- **`components/ui/sidebar.tsx`** — Removed mobile duplicate sidebar/hamburger (header Sheet handles mobile nav); desktop sidebar now flush (`h-full`, no `m-3 rounded-2xl`), dark soil via `.app-sidebar`/`.app-sidebar-desktop`, nav items use `.sidebar-nav-link` / `.sidebar-nav-link-active` classes, dark scrollbar applied
- **`components/ui/header.tsx`** — Removed floating card style (`mx-3 mt-3 mb-4 rounded-xl`); now `h-14 sticky border-b`; fixed avatar: removed emerald gradient → solid terracotta `bg-primary`; fixed divider `bg-white` → `bg-border`; mobile Sheet nav improved with `basic-hrm` permission support; removed unused icon imports
- **`components/layout/AppShell.tsx`** — Removed `pt-20 sm:pt-16 md:pt-6` override (no longer needed: fixed hamburger gone, header is flush sticky)
- **File cleanup** — Removed 37 build log and temp files from app root (`*.log`, `*.txt`, `test_*.js`, `check_*.mjs`, etc.)

---

*This manual is updated with each significant change. For implementation details see inline code comments and git history.*
