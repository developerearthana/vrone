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
