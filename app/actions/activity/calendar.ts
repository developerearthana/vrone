'use server';

import { auth } from '@/auth';
import Event, { IEvent } from '@/models/Event';
import { revalidatePath } from 'next/cache';
import connectToDatabase from '@/lib/db';

export async function createEvent(data: Partial<IEvent>) {
    try {
        await connectToDatabase();
        const session = await auth();
        if (!session?.user?.id) throw new Error('Unauthorized');

        const newEvent = new Event({
            ...data,
            createdBy: session.user.id,
        });

        const savedEvent = await newEvent.save();
        revalidatePath('/activity/calendar');
        return { success: true, data: JSON.parse(JSON.stringify(savedEvent)) };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function updateEvent(id: string, data: Partial<IEvent>) {
    try {
        await connectToDatabase();
        const session = await auth();
        if (!session?.user?.id) throw new Error('Unauthorized');

        const event = await Event.findByIdAndUpdate(id, data, { new: true });
        revalidatePath('/activity/calendar');
        return { success: true, data: JSON.parse(JSON.stringify(event)) };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function deleteEvent(id: string) {
    try {
        await connectToDatabase();
        const session = await auth();
        if (!session?.user?.id) throw new Error('Unauthorized');

        await Event.findByIdAndDelete(id);
        revalidatePath('/activity/calendar');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}


import { addDays, addWeeks, addMonths, addQuarters, addYears, isBefore, isAfter, startOfDay, endOfDay } from 'date-fns';

export async function getEvents(start: Date, end: Date) {
    try {
        await connectToDatabase();
        const session = await auth();
        if (!session?.user?.id) throw new Error('Unauthorized');

        const queryStart = new Date(start);
        const queryEnd = new Date(end);

        // 1. Fetch non-recurring events in range
        const directEvents = await Event.find({
            createdBy: session.user.id,
            'recurrence.frequency': 'None',
            start: { $gte: queryStart, $lte: queryEnd }
        });

        // 2. Fetch recurring events that *could* overlap
        // (Start date is before range end AND (No end date OR end date is after range start))
        const recurringEvents = await Event.find({
            createdBy: session.user.id,
            'recurrence.frequency': { $ne: 'None' },
            start: { $lte: queryEnd },
            $or: [
                { 'recurrence.endDate': { $exists: false } },
                { 'recurrence.endDate': { $gte: queryStart } }
            ]
        });

        const expandedEvents: any[] = [];

        // Clone a recurring event and place it at a specific date
        const createInstance = (evt: any, date: Date) => {
            const instance = evt.toObject();
            // Guard: evt.end may be undefined for all-day/open-ended events
            const duration = (evt.end && evt.start)
                ? new Date(evt.end).getTime() - new Date(evt.start).getTime()
                : 60 * 60 * 1000; // default 1 hour
            instance.start = new Date(date);
            instance.end = new Date(date.getTime() + duration);
            instance.id = `${evt._id}-${date.toISOString()}`;
            return instance;
        };

        // Step-size in ms for fast-forwarding to queryStart
        const intervalMs = (freq: string, interval: number): number => {
            const MS = { Daily: 86400000, Weekly: 604800000 };
            return (MS as any)[freq] ? (MS as any)[freq] * interval : 0;
        };

        recurringEvents.forEach(evt => {
            const freq = evt.recurrence.frequency;
            const interval = evt.recurrence.interval || 1;
            const recurEnd = evt.recurrence.endDate ? new Date(evt.recurrence.endDate) : addYears(new Date(), 1);
            const effectiveEnd = isBefore(recurEnd, queryEnd) ? recurEnd : queryEnd;

            let current = new Date(evt.start);

            // Fast-forward: skip historical occurrences that predate queryStart
            const ms = intervalMs(freq, interval);
            if (ms > 0 && isBefore(current, queryStart)) {
                const steps = Math.floor((queryStart.getTime() - current.getTime()) / ms);
                if (steps > 0) {
                    switch (freq) {
                        case 'Daily': current = addDays(current, steps * interval); break;
                        case 'Weekly': current = addWeeks(current, steps * interval); break;
                    }
                }
            }

            // Emit only instances within [queryStart, effectiveEnd]
            while (!isAfter(current, effectiveEnd)) {
                if (!isBefore(current, queryStart)) {
                    expandedEvents.push(createInstance(evt, current));
                }
                switch (freq) {
                    case 'Daily': current = addDays(current, interval); break;
                    case 'Weekly': current = addWeeks(current, interval); break;
                    case 'Monthly': current = addMonths(current, interval); break;
                    case 'Quarterly': current = addQuarters(current, interval); break;
                    case 'Yearly': current = addYears(current, interval); break;
                    default: break;
                }
                if (current.getFullYear() > queryEnd.getFullYear() + 2) break;
            }
        });

        const allEvents = [...directEvents, ...expandedEvents].sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

        return { success: true, data: JSON.parse(JSON.stringify(allEvents)) };
    } catch (error: any) {
        console.error('Error fetching events:', error);
        return { success: false, error: error.message };
    }
}

export async function getUpcomingAlerts() {
    try {
        await connectToDatabase();
        const session = await auth();
        if (!session?.user?.id) throw new Error('Unauthorized');

        const now = new Date();
        // Use start of today so events from earlier in the day are included
        const rangeStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0); // startOfDay
        const rangeEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 23, 59, 59, 999); // endOfTomorrow

        const response = await getEvents(rangeStart, rangeEnd);
        if (!response.success) throw new Error(response.error);

        const events = response.data;
        // Only show events with alert enabled
        const alertEvents = events.filter((e: any) => e.alert === true);

        return { success: true, data: alertEvents };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
