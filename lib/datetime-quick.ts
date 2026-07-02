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
