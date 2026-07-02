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
