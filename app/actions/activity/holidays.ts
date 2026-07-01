'use server';

import { auth } from '@/auth';
import Holiday from '@/models/Holiday';
import connectToDatabase from '@/lib/db';
import { revalidatePath } from 'next/cache';

function isAdminRole(role?: string) {
    const r = (role || '').toLowerCase();
    return r === 'admin' || r === 'super-admin' || r === 'manager' || r === 'hr';
}

// Store at local midnight so it lands on the correct IST calendar day (matches the app's
// date convention elsewhere and avoids UTC-parse day-shift).
function localDate(y: number, m: number, d: number) {
    return new Date(y, m - 1, d);
}

// Tamil Nadu + National holidays. Fixed-date holidays are exact; lunar festivals use the
// commonly-published 2026 dates and can be adjusted by an admin (add / delete / toggle).
const SEED: Array<{ y: number; m: number; d: number; name: string; type: string; theme: string; region: string }> = [
    // ── 2026 ──
    { y: 2026, m: 1, d: 1, name: "New Year's Day", type: 'National', theme: 'newyear', region: 'National' },
    { y: 2026, m: 1, d: 14, name: 'Bhogi Festival', type: 'State', theme: 'pongal', region: 'Tamil Nadu' },
    { y: 2026, m: 1, d: 15, name: 'Thai Pongal', type: 'State', theme: 'pongal', region: 'Tamil Nadu' },
    { y: 2026, m: 1, d: 16, name: 'Mattu Pongal / Uzhavar Thirunal', type: 'State', theme: 'pongal', region: 'Tamil Nadu' },
    { y: 2026, m: 1, d: 26, name: 'Republic Day', type: 'National', theme: 'republic', region: 'National' },
    { y: 2026, m: 3, d: 3, name: 'Holi', type: 'Optional', theme: 'holi', region: 'National' },
    { y: 2026, m: 4, d: 3, name: 'Good Friday', type: 'National', theme: 'default', region: 'National' },
    { y: 2026, m: 4, d: 14, name: 'Tamil New Year & Dr. Ambedkar Jayanti', type: 'State', theme: 'tamilnewyear', region: 'Tamil Nadu' },
    { y: 2026, m: 5, d: 1, name: 'May Day (Labour Day)', type: 'National', theme: 'default', region: 'National' },
    { y: 2026, m: 8, d: 15, name: 'Independence Day', type: 'National', theme: 'independence', region: 'National' },
    { y: 2026, m: 9, d: 14, name: 'Vinayaka Chaturthi', type: 'State', theme: 'default', region: 'Tamil Nadu' },
    { y: 2026, m: 10, d: 2, name: 'Gandhi Jayanti', type: 'National', theme: 'gandhi', region: 'National' },
    { y: 2026, m: 10, d: 20, name: 'Ayudha Pooja', type: 'State', theme: 'dussehra', region: 'Tamil Nadu' },
    { y: 2026, m: 10, d: 21, name: 'Vijayadashami (Dussehra)', type: 'State', theme: 'dussehra', region: 'Tamil Nadu' },
    { y: 2026, m: 11, d: 8, name: 'Deepavali (Diwali)', type: 'National', theme: 'diwali', region: 'National' },
    { y: 2026, m: 12, d: 25, name: 'Christmas', type: 'National', theme: 'christmas', region: 'National' },
    // ── early 2027 (forward continuity) ──
    { y: 2027, m: 1, d: 1, name: "New Year's Day", type: 'National', theme: 'newyear', region: 'National' },
    { y: 2027, m: 1, d: 14, name: 'Bhogi Festival', type: 'State', theme: 'pongal', region: 'Tamil Nadu' },
    { y: 2027, m: 1, d: 15, name: 'Thai Pongal', type: 'State', theme: 'pongal', region: 'Tamil Nadu' },
    { y: 2027, m: 1, d: 16, name: 'Mattu Pongal / Uzhavar Thirunal', type: 'State', theme: 'pongal', region: 'Tamil Nadu' },
    { y: 2027, m: 1, d: 26, name: 'Republic Day', type: 'National', theme: 'republic', region: 'National' },
];

export async function seedHolidays() {
    try {
        await connectToDatabase();
        const existing = await Holiday.find({}, 'date name').lean();
        const seen = new Set(existing.map((h: any) => `${new Date(h.date).getFullYear()}-${new Date(h.date).getMonth() + 1}-${new Date(h.date).getDate()}-${h.name}`));
        const toInsert = SEED
            .filter(s => !seen.has(`${s.y}-${s.m}-${s.d}-${s.name}`))
            .map(s => ({ date: localDate(s.y, s.m, s.d), name: s.name, type: s.type, theme: s.theme, region: s.region, isWorkingDay: false }));
        if (toInsert.length > 0) await Holiday.insertMany(toInsert);
        return { success: true, inserted: toInsert.length };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function getHolidays(start: Date, end: Date) {
    try {
        await connectToDatabase();
        const session = await auth();
        if (!session?.user?.id) throw new Error('Unauthorized');
        const holidays = await Holiday.find({ date: { $gte: new Date(start), $lte: new Date(end) } })
            .sort({ date: 1 }).lean();
        return { success: true, data: JSON.parse(JSON.stringify(holidays)) };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function setHolidayWorkingDay(id: string, isWorkingDay: boolean) {
    try {
        await connectToDatabase();
        const session = await auth();
        if (!session?.user?.id) throw new Error('Unauthorized');
        if (!isAdminRole(session.user.role)) throw new Error('Only admins can change holiday status');
        await Holiday.findByIdAndUpdate(id, { isWorkingDay });
        revalidatePath('/activity/calendar');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function createHoliday(data: { date: string; name: string; type?: string; theme?: string; region?: string; description?: string }) {
    try {
        await connectToDatabase();
        const session = await auth();
        if (!session?.user?.id) throw new Error('Unauthorized');
        if (!isAdminRole(session.user.role)) throw new Error('Only admins can add holidays');
        const [y, m, d] = data.date.split('-').map(Number);
        const holiday = await Holiday.create({
            date: localDate(y, m, d),
            name: data.name,
            type: data.type || 'Optional',
            theme: data.theme || 'default',
            region: data.region || 'National',
            description: data.description,
            createdBy: session.user.id,
        });
        revalidatePath('/activity/calendar');
        return { success: true, data: JSON.parse(JSON.stringify(holiday)) };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function deleteHoliday(id: string) {
    try {
        await connectToDatabase();
        const session = await auth();
        if (!session?.user?.id) throw new Error('Unauthorized');
        if (!isAdminRole(session.user.role)) throw new Error('Only admins can delete holidays');
        await Holiday.findByIdAndDelete(id);
        revalidatePath('/activity/calendar');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
