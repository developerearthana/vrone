# Calendar Enhancements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bright Sunday/holiday/festival day-cell treatments and an easy date-time picker with all-day holiday defaults on the activity calendar.

**Architecture:** A pure classification helper (`lib/calendar-day-style.ts`) decides each day-cell's treatment; `app/activity/calendar/page.tsx` consumes it in the existing month/week grid. New reusable picker components live in `components/ui/date-time-picker.tsx` and replace the raw `datetime-local` inputs in both event forms.

**Tech Stack:** Next.js 16 App Router, Tailwind v4, date-fns, jest (`npx jest`), existing `lib/holiday-themes.ts`.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-02-calendar-chat-enhancements-design.md` Part 1.
- Do NOT touch `components/activity/CalendarView.tsx` or the super-admin calendar (orphaned / out of scope).
- All animations must be inside `@media (prefers-reduced-motion: no-preference)`.
- Holiday treatment wins over Sunday treatment on collision.
- No new npm dependencies in this plan.
- Commits: `<type>(<scope>): <description>`, ending with `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.

---

### Task 1: Day-cell treatment helper + festival CSS

**Files:**
- Create: `lib/calendar-day-style.ts`
- Modify: `app/globals.css` (append)
- Test: `__tests__/calendar-day-style.test.ts`

**Interfaces:**
- Produces: `dayCellTreatment(date: Date, holiday: HolidayLike | null): DayTreatment` where `DayTreatment = { kind: 'festival' | 'govt-holiday' | 'sunday' | 'normal'; cellClass: string; dateNumClass: string; ribbonClass?: string; caption?: string }` and `HolidayLike = { name: string; theme?: string; isWorkingDay?: boolean; type?: string }`.

- [ ] **Step 1: Write the failing test**

```ts
// __tests__/calendar-day-style.test.ts
import { dayCellTreatment } from '@/lib/calendar-day-style';

const sunday = new Date('2026-07-05T00:00:00'); // a Sunday
const monday = new Date('2026-07-06T00:00:00');

describe('dayCellTreatment', () => {
    it('classifies plain Sunday as weekend holiday with rose wash', () => {
        const t = dayCellTreatment(sunday, null);
        expect(t.kind).toBe('sunday');
        expect(t.cellClass).toContain('bg-rose-100');
        expect(t.caption).toBe('Weekend Holiday');
    });

    it('classifies festive holiday as festival with animated gradient', () => {
        const t = dayCellTreatment(monday, { name: 'Diwali', theme: 'diwali' });
        expect(t.kind).toBe('festival');
        expect(t.cellClass).toContain('festival-cell');
    });

    it('classifies non-festive holiday as govt-holiday with ribbon', () => {
        const t = dayCellTreatment(monday, { name: 'Gandhi Jayanti', theme: 'gandhi' });
        expect(t.kind).toBe('govt-holiday');
        expect(t.ribbonClass).toBeTruthy();
    });

    it('holiday wins over Sunday on collision', () => {
        const t = dayCellTreatment(sunday, { name: 'Diwali', theme: 'diwali' });
        expect(t.kind).toBe('festival');
    });

    it('working-day override neutralizes the holiday', () => {
        const t = dayCellTreatment(monday, { name: 'Diwali', theme: 'diwali', isWorkingDay: true });
        expect(t.kind).toBe('normal');
    });

    it('plain weekday is normal', () => {
        expect(dayCellTreatment(monday, null).kind).toBe('normal');
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /opt/vrone/dev/app && npx jest __tests__/calendar-day-style.test.ts`
Expected: FAIL — `Cannot find module '@/lib/calendar-day-style'`

- [ ] **Step 3: Write minimal implementation**

```ts
// lib/calendar-day-style.ts
import { HOLIDAY_THEMES, holidayTheme } from '@/lib/holiday-themes';

export interface HolidayLike {
    name: string;
    theme?: string;
    isWorkingDay?: boolean;
    type?: string;
}

export interface DayTreatment {
    kind: 'festival' | 'govt-holiday' | 'sunday' | 'normal';
    cellClass: string;
    dateNumClass: string;
    ribbonClass?: string;
    caption?: string;
}

// Sunday = data-independent weekend holiday. Holidays win over Sunday; festive
// themes get the animated gradient, other holidays get ribbon + bright wash.
export function dayCellTreatment(date: Date, holiday: HolidayLike | null): DayTreatment {
    const active = holiday && !holiday.isWorkingDay ? holiday : null;
    if (active) {
        const theme = holidayTheme(active.theme);
        if (theme.festive) {
            return {
                kind: 'festival',
                cellClass: 'festival-cell text-white',
                dateNumClass: 'text-white drop-shadow-sm',
                ribbonClass: 'bg-white/25 text-white backdrop-blur-sm',
            };
        }
        return {
            kind: 'govt-holiday',
            cellClass: theme.cell,
            dateNumClass: 'text-foreground',
            ribbonClass: theme.chip,
        };
    }
    if (date.getDay() === 0) {
        return {
            kind: 'sunday',
            cellClass: 'bg-rose-100',
            dateNumClass: 'text-rose-600',
            caption: 'Weekend Holiday',
        };
    }
    return { kind: 'normal', cellClass: '', dateNumClass: 'text-foreground' };
}

export { HOLIDAY_THEMES };
```

- [ ] **Step 4: Append festival CSS to `app/globals.css`**

```css
/* ── Festival calendar cells (spec Part 1.1) ─────────────────────────── */
.festival-cell {
    background: linear-gradient(270deg, #f59e0b, #ec4899, #8b5cf6, #f59e0b);
    background-size: 300% 100%;
}
.festival-emoji { display: inline-block; }
@media (prefers-reduced-motion: no-preference) {
    .festival-cell { animation: festival-shimmer 5s linear infinite; }
    .festival-emoji { animation: festival-bob 2.4s ease-in-out infinite; }
}
@keyframes festival-shimmer {
    0% { background-position: 0% 0; }
    100% { background-position: 300% 0; }
}
@keyframes festival-bob {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-3px) scale(1.15); }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx jest __tests__/calendar-day-style.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 6: Commit**

```bash
git add lib/calendar-day-style.ts app/globals.css __tests__/calendar-day-style.test.ts
git commit -m "feat(calendar): day-cell treatment helper + festival animation CSS"
```

---

### Task 2: Integrate treatments into the calendar grid

**Files:**
- Modify: `app/activity/calendar/page.tsx:613-684` (day-cell render block)

**Interfaces:**
- Consumes: `dayCellTreatment(date, holiday)` from Task 1.

- [ ] **Step 1: Import the helper**

At `app/activity/calendar/page.tsx` after line 29 (`import { holidayTheme } …`):

```ts
import { dayCellTreatment } from '@/lib/calendar-day-style';
```

- [ ] **Step 2: Compute treatment in the day loop**

Inside the `.map(day => …)` (after the existing `const theme = activeHoliday ? …` at line 627), add:

```ts
const treatment = dayCellTreatment(day, holiday ?? null);
```

- [ ] **Step 3: Replace the cell `className` logic (lines 633-642)**

```tsx
className={cn(
    "cursor-pointer transition-colors relative",
    view === 'week' ? 'min-h-[280px]' : 'min-h-[100px]',
    !isCurrentMonth && view === 'month' ? 'bg-muted/20' : '',
    treatment.kind !== 'normal' ? treatment.cellClass :
        todayDay ? 'bg-primary/[0.03]' : 'hover:bg-muted/20',
)}
```

- [ ] **Step 4: Date number + Sunday caption + festival emoji**

Replace the date-number span classes (lines 650-656) with:

```tsx
<span className={cn(
    "w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold",
    todayDay ? 'bg-primary text-white shadow-sm shadow-primary/30' :
    !isCurrentMonth ? 'text-muted-foreground/40' :
    treatment.dateNumClass
)}>
```

Replace the emoji slot (line 645-649) so festivals get the bobbing class:

```tsx
{activeHoliday
    ? <span className="festival-emoji text-sm leading-none select-none" title={activeHoliday.name}>{theme?.emoji}</span>
    : holiday?.isWorkingDay
        ? <span className="text-[8px] font-bold uppercase tracking-wide text-emerald-600/70">Working</span>
        : <span />}
```

After the events `<div className="px-1 pb-1 space-y-0.5">…</div>` closes (line 681), add the Sunday caption:

```tsx
{treatment.caption && (isCurrentMonth || view === 'week') && (
    <span className="absolute bottom-0.5 left-0 right-0 text-center text-[7.5px] font-extrabold uppercase tracking-widest text-rose-400 pointer-events-none">
        {treatment.caption}
    </span>
)}
```

- [ ] **Step 5: Holiday ribbon (lines 663-674)** — change the holiday button to a top ribbon: replace its `className` with:

```tsx
className={cn(
    "w-full flex items-center gap-1 px-1.5 py-1 rounded-md text-[10px] font-bold leading-tight text-left",
    holiday.isWorkingDay ? 'bg-muted text-muted-foreground line-through decoration-1'
        : treatment.ribbonClass ?? 'bg-red-500 text-white',
    !holiday.isWorkingDay && 'shadow-sm'
)}
```

- [ ] **Step 6: Verify**

Run: `npx tsc --noEmit 2>&1 | grep "activity/calendar" ; npx jest __tests__/calendar-day-style.test.ts`
Expected: no tsc output for the file; jest PASS.

- [ ] **Step 7: Commit**

```bash
git add app/activity/calendar/page.tsx
git commit -m "feat(calendar): bright Sunday/holiday/festival day-cell rendering"
```

---

### Task 3: Date/time picker components + duration math

**Files:**
- Create: `components/ui/date-time-picker.tsx`
- Create: `lib/datetime-quick.ts`
- Test: `__tests__/datetime-quick.test.ts`

**Interfaces:**
- Produces: `applyDuration(startLocalISO: string, minutes: number): string` (returns `yyyy-MM-dd'T'HH:mm` end string); `quickDates(now?: Date): { label: string; value: string }[]`; `timeOptions(): string[]` (["00:00","00:15",…]); React components `<DateQuickPick value onChange>` and `<TimeSelect value onChange>`.

- [ ] **Step 1: Write the failing test**

```ts
// __tests__/datetime-quick.test.ts
import { applyDuration, quickDates, timeOptions } from '@/lib/datetime-quick';

describe('datetime-quick', () => {
    it('applyDuration adds minutes within the day', () => {
        expect(applyDuration('2026-07-02T10:00', 60)).toBe('2026-07-02T11:00');
        expect(applyDuration('2026-07-02T10:00', 30)).toBe('2026-07-02T10:30');
    });
    it('applyDuration rolls over midnight', () => {
        expect(applyDuration('2026-07-02T23:30', 60)).toBe('2026-07-03T00:30');
    });
    it('quickDates returns Today, Tomorrow, Next Mon', () => {
        const q = quickDates(new Date('2026-07-02T09:00:00')); // Thursday
        expect(q.map(x => x.label)).toEqual(['Today', 'Tomorrow', 'Next Mon']);
        expect(q[0].value).toBe('2026-07-02');
        expect(q[1].value).toBe('2026-07-03');
        expect(q[2].value).toBe('2026-07-06');
    });
    it('timeOptions is 96 slots of 15 minutes', () => {
        const t = timeOptions();
        expect(t).toHaveLength(96);
        expect(t[0]).toBe('00:00');
        expect(t[37]).toBe('09:15');
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/datetime-quick.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `lib/datetime-quick.ts`**

```ts
// lib/datetime-quick.ts
import { addMinutes, addDays, format, nextMonday } from 'date-fns';

export function applyDuration(startLocalISO: string, minutes: number): string {
    return format(addMinutes(new Date(startLocalISO), minutes), "yyyy-MM-dd'T'HH:mm");
}

export function quickDates(now: Date = new Date()): { label: string; value: string }[] {
    return [
        { label: 'Today', value: format(now, 'yyyy-MM-dd') },
        { label: 'Tomorrow', value: format(addDays(now, 1), 'yyyy-MM-dd') },
        { label: 'Next Mon', value: format(nextMonday(now), 'yyyy-MM-dd') },
    ];
}

export function timeOptions(): string[] {
    return Array.from({ length: 96 }, (_, i) =>
        `${String(Math.floor(i / 4)).padStart(2, '0')}:${String((i % 4) * 15).padStart(2, '0')}`);
}

export const DURATION_CHIPS = [
    { label: '30m', minutes: 30 },
    { label: '1h', minutes: 60 },
    { label: '2h', minutes: 120 },
];
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/datetime-quick.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Implement `components/ui/date-time-picker.tsx`**

```tsx
// components/ui/date-time-picker.tsx
"use client";

import { useState } from 'react';
import {
    format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
    eachDayOfInterval, addMonths, subMonths, isSameMonth, isSameDay, isToday, parseISO,
} from 'date-fns';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';
import { quickDates, timeOptions } from '@/lib/datetime-quick';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

// value: 'yyyy-MM-dd'
export function DateQuickPick({ value, onChange }: { value: string; onChange: (v: string) => void }) {
    const [month, setMonth] = useState(() => (value ? parseISO(value) : new Date()));
    const days = eachDayOfInterval({
        start: startOfWeek(startOfMonth(month), { weekStartsOn: 1 }),
        end: endOfWeek(endOfMonth(month), { weekStartsOn: 1 }),
    });
    return (
        <div className="flex items-center gap-1.5 flex-wrap">
            {quickDates().map(q => (
                <button key={q.label} type="button" onClick={() => onChange(q.value)}
                    className={cn("px-2.5 py-1 rounded-full border text-[11px] font-semibold transition-colors",
                        value === q.value ? 'bg-primary text-white border-primary' : 'border-border text-muted-foreground hover:text-foreground')}>
                    {q.label}
                </button>
            ))}
            <Popover>
                <PopoverTrigger asChild>
                    <button type="button" className={cn(
                        "px-2.5 py-1 rounded-full border text-[11px] font-semibold flex items-center gap-1 transition-colors",
                        value && !quickDates().some(q => q.value === value)
                            ? 'bg-primary text-white border-primary' : 'border-border text-muted-foreground hover:text-foreground')}>
                        <CalendarDays className="w-3 h-3" />
                        {value && !quickDates().some(q => q.value === value) ? format(parseISO(value), 'd MMM yyyy') : 'Pick…'}
                    </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-3" align="start">
                    <div className="flex items-center justify-between mb-2">
                        <button type="button" onClick={() => setMonth(subMonths(month, 1))} className="p-1 rounded hover:bg-muted"><ChevronLeft className="w-4 h-4" /></button>
                        <span className="text-sm font-bold">{format(month, 'MMMM yyyy')}</span>
                        <button type="button" onClick={() => setMonth(addMonths(month, 1))} className="p-1 rounded hover:bg-muted"><ChevronRight className="w-4 h-4" /></button>
                    </div>
                    <div className="grid grid-cols-7 gap-0.5">
                        {['M','T','W','T','F','S','S'].map((d, i) => <div key={i} className="text-center text-[9px] font-bold text-muted-foreground py-1">{d}</div>)}
                        {days.map(day => {
                            const iso = format(day, 'yyyy-MM-dd');
                            return (
                                <button key={iso} type="button" onClick={() => onChange(iso)}
                                    className={cn("h-7 w-7 text-[11px] rounded-full font-medium transition-colors",
                                        !isSameMonth(day, month) ? 'text-muted-foreground/30' :
                                        day.getDay() === 0 ? 'text-rose-500' : 'text-foreground',
                                        value && isSameDay(day, parseISO(value)) ? 'bg-primary text-white font-bold' :
                                        isToday(day) ? 'ring-1 ring-primary' : 'hover:bg-muted')}>
                                    {format(day, 'd')}
                                </button>
                            );
                        })}
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    );
}

// value: 'HH:mm'
export function TimeSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
    return (
        <select value={value} onChange={e => onChange(e.target.value)}
            className="px-2 py-1.5 border border-border rounded-lg text-sm bg-background focus:ring-2 focus:ring-primary/20 outline-none">
            {timeOptions().map(t => <option key={t} value={t}>{t}</option>)}
        </select>
    );
}
```

Note: if `components/ui/popover.tsx` does not exist, check `ls components/ui/`. The project uses Radix (`@radix-ui/react-*` in package.json). If missing, create it with the standard shadcn/ui popover snippet using `@radix-ui/react-popover` — and if that package is absent, fall back to a controlled absolute-positioned div (state `open`, `onBlur` close); do NOT add a dependency.

- [ ] **Step 6: Verify + commit**

Run: `npx tsc --noEmit 2>&1 | grep date-time-picker`
Expected: no output.

```bash
git add lib/datetime-quick.ts components/ui/date-time-picker.tsx __tests__/datetime-quick.test.ts
git commit -m "feat(ui): quick date chips, popover mini-month and 15-min time select"
```

---

### Task 4: Wire pickers + all-day holiday default into both event forms

**Files:**
- Modify: `app/activity/calendar/page.tsx:855-940` (personal + company form date/time fields)

**Interfaces:**
- Consumes: `DateQuickPick`, `TimeSelect` (Task 3), `applyDuration`, `DURATION_CHIPS` (Task 3).

- [ ] **Step 1: Import**

```ts
import { DateQuickPick, TimeSelect } from '@/components/ui/date-time-picker';
import { applyDuration, DURATION_CHIPS } from '@/lib/datetime-quick';
```

- [ ] **Step 2: Personal form (lines ~866-877).** Replace both `datetime-local` inputs with the composed picker. The form state keeps the same `start`/`end` `yyyy-MM-dd'T'HH:mm` strings, so server actions are untouched:

```tsx
{/* Timed / All-day toggle — Holiday type forces all-day (spec 1.2) */}
{(() => {
    const isHoliday = pForm.type === 'Holiday';
    const allDay = isHoliday || pAllDay;
    const [datePart, timePart = '09:00'] = pForm.start.split('T');
    return (
        <div className="space-y-3">
            <div className="inline-flex border border-border rounded-lg overflow-hidden text-xs font-bold">
                {(['Timed', 'All-day'] as const).map(m => (
                    <button key={m} type="button" disabled={isHoliday}
                        onClick={() => setPAllDay(m === 'All-day')}
                        className={cn("px-3 py-1.5 transition-colors",
                            (m === 'All-day') === allDay ? 'bg-primary text-white' : 'text-muted-foreground',
                            isHoliday && 'opacity-60')}>
                        {m === 'Timed' ? '⏰ Timed' : '📅 All-day'}
                    </button>
                ))}
            </div>
            <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Date</Label>
                <DateQuickPick value={datePart}
                    onChange={d => setPForm(f => ({ ...f, start: `${d}T${timePart}`, end: f.end ? `${d}T${f.end.split('T')[1]}` : f.end }))} />
            </div>
            {!allDay && (
                <div className="flex items-center gap-2 flex-wrap">
                    <Label className="text-xs text-muted-foreground">Start</Label>
                    <TimeSelect value={timePart}
                        onChange={t => setPForm(f => ({ ...f, start: `${datePart}T${t}` }))} />
                    {DURATION_CHIPS.map(c => (
                        <button key={c.label} type="button"
                            onClick={() => setPForm(f => ({ ...f, end: applyDuration(f.start, c.minutes) }))}
                            className={cn("px-2 py-1 rounded-full border text-[11px] font-semibold",
                                pForm.end === applyDuration(pForm.start, c.minutes)
                                    ? 'bg-primary text-white border-primary' : 'border-border text-muted-foreground')}>
                            {c.label}
                        </button>
                    ))}
                    <Label className="text-xs text-muted-foreground">End</Label>
                    <TimeSelect value={(pForm.end || applyDuration(pForm.start, 60)).split('T')[1]}
                        onChange={t => setPForm(f => ({ ...f, end: `${datePart}T${t}` }))} />
                </div>
            )}
        </div>
    );
})()}
```

Add the supporting state next to `pForm`: `const [pAllDay, setPAllDay] = useState(false);`
On submit, when `allDay` (Holiday type or toggle), normalize: `start = datePart + 'T00:00'`, `end = ''`.

- [ ] **Step 3: Company form (lines ~908-936).** Same composition; the existing `cForm.isAllDay` switch is replaced by the same segmented toggle, and choosing any holiday `type` (`'National Holiday' | 'State Holiday' | 'Optional Holiday' | 'Office Managed Leave'`) forces `isAllDay: true`:

```ts
const HOLIDAY_TYPES = ['National Holiday', 'State Holiday', 'Optional Holiday', 'Office Managed Leave'];
const cIsHoliday = HOLIDAY_TYPES.includes(cForm.type);
```

In the type `onValueChange`: `setCForm(f => ({ ...f, type: v as CompanyEventType, isAllDay: HOLIDAY_TYPES.includes(v) ? true : f.isAllDay }))`. Toggle disabled when `cIsHoliday`. Date/time fields identical to Step 2 but reading/writing `cForm`.

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit 2>&1 | grep "activity/calendar"` → no output.
Run: `npx jest __tests__/calendar-day-style.test.ts __tests__/datetime-quick.test.ts` → PASS.

- [ ] **Step 5: Commit**

```bash
git add app/activity/calendar/page.tsx
git commit -m "feat(calendar): quick date/time pickers + all-day holiday defaults in event forms"
```

---

### Task 5: Full verification

- [ ] **Step 1:** `npx tsc --noEmit` → zero errors.
- [ ] **Step 2:** `npm run build` → all routes compile.
- [ ] **Step 3:** `npx jest` → full suite green.
- [ ] **Step 4:** Visual check with headless browser (or ask user): July 2026 month view shows rose Sundays with caption; seeded Independence Day shows red ribbon; Diwali (Nov) shows animated gradient; creating a National Holiday defaults to all-day.
- [ ] **Step 5: Commit** anything outstanding: `git commit -m "chore(calendar): verification fixes"` (only if fixes were needed).
