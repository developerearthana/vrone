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
