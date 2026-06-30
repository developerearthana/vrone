"use server";

import { auth } from '@/auth';
import connectToDatabase from '@/lib/db';
import CompanyEvent, { CompanyEventType, MeetingMode } from '@/models/CompanyEvent';
import Attendance from '@/models/Attendance';
import Employee from '@/models/Employee';
import User from '@/models/User';
import { revalidatePath } from 'next/cache';
import { startOfDay, endOfDay } from 'date-fns';

// ── Event CRUD ──────────────────────────────────────────────

export async function getCompanyEvents(start: Date, end: Date) {
    try {
        await connectToDatabase();
        const session = await auth();
        if (!session?.user?.id) throw new Error('Unauthorized');

        const events = await CompanyEvent.find({
            start: { $gte: new Date(start), $lte: new Date(end) },
        }).sort({ start: 1 }).lean();

        return { success: true, data: JSON.parse(JSON.stringify(events)) };
    } catch (e: any) {
        return { success: false, error: e.message, data: [] };
    }
}

export async function getCompanyEventsForUser(start: Date, end: Date, userId: string) {
    try {
        await connectToDatabase();
        const session = await auth();
        if (!session?.user?.id) throw new Error('Unauthorized');

        const HOLIDAY_TYPES: CompanyEventType[] = [
            'National Holiday', 'State Holiday', 'Optional Holiday',
            'Office Managed Leave', 'Announcement', 'Employee Birthday', 'Work Anniversary',
        ];

        const events = await CompanyEvent.find({
            start: { $gte: new Date(start), $lte: new Date(end) },
            $or: [
                { type: { $in: HOLIDAY_TYPES } },
                { 'participants.refId': userId },
            ],
        }).sort({ start: 1 }).lean();

        return { success: true, data: JSON.parse(JSON.stringify(events)) };
    } catch (e: any) {
        return { success: false, error: e.message, data: [] };
    }
}

export async function createCompanyEvent(data: {
    title: string;
    description?: string;
    type: CompanyEventType;
    start: string;
    end?: string;
    isAllDay: boolean;
    participants?: Array<{ refType: 'employee' | 'contact'; refId?: string; name: string; email?: string }>;
    meetingMode?: MeetingMode;
    location?: string;
}) {
    try {
        await connectToDatabase();
        const session = await auth();
        if (!session?.user?.id) throw new Error('Unauthorized');

        const event = await CompanyEvent.create({
            ...data,
            start: new Date(data.start),
            end: data.end ? new Date(data.end) : undefined,
            createdBy: session.user.id,
        });

        revalidatePath('/dashboards/super-admin/calendar');
        revalidatePath('/activity/calendar');
        return { success: true, data: JSON.parse(JSON.stringify(event)) };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function updateCompanyEvent(id: string, data: Partial<{
    title: string;
    description: string;
    type: CompanyEventType;
    start: string;
    end: string;
    isAllDay: boolean;
    participants: Array<{ refType: 'employee' | 'contact'; refId?: string; name: string; email?: string }>;
    meetingMode: MeetingMode;
    meetingLink: string;
    location: string;
}>) {
    try {
        await connectToDatabase();
        const session = await auth();
        if (!session?.user?.id) throw new Error('Unauthorized');

        const update: any = { ...data };
        if (data.start) update.start = new Date(data.start);
        if (data.end) update.end = new Date(data.end);

        const event = await CompanyEvent.findByIdAndUpdate(id, update, { new: true });
        revalidatePath('/dashboards/super-admin/calendar');
        revalidatePath('/activity/calendar');
        return { success: true, data: JSON.parse(JSON.stringify(event)) };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function deleteCompanyEvent(id: string) {
    try {
        await connectToDatabase();
        const session = await auth();
        if (!session?.user?.id) throw new Error('Unauthorized');

        await CompanyEvent.findByIdAndDelete(id);
        revalidatePath('/dashboards/super-admin/calendar');
        revalidatePath('/activity/calendar');
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

// ── Today's Resource Status ──────────────────────────────────

export async function getTodayResourceStatus() {
    try {
        await connectToDatabase();
        const session = await auth();
        if (!session?.user?.id) throw new Error('Unauthorized');

        const today = new Date();
        const dayStart = startOfDay(today);
        const dayEnd = endOfDay(today);

        const [employees, users, attendanceRecords] = await Promise.all([
            Employee.find({ status: 'Active' }, 'name image jobTitle dept email').lean(),
            User.find({}, '_id email').lean(),
            Attendance.find({ date: { $gte: dayStart, $lte: dayEnd } }).lean(),
        ]);

        // Bridge: employee email → user _id → attendance record
        const emailToUserId = new Map<string, string>(
            (users as any[]).map((u: any) => [u.email, u._id.toString()])
        );
        const attendanceMap = new Map<string, any>(
            (attendanceRecords as any[]).map((a: any) => [a.userId.toString(), a])
        );

        const resources = employees.map((emp: any) => {
            const userId = emp.email ? emailToUserId.get(emp.email) : undefined;
            const att = userId ? attendanceMap.get(userId) : undefined;
            let status = 'No Record';
            if (att) {
                if (att.status === 'Leave') status = 'On Leave';
                else if (att.status === 'WFH') status = 'WFH';
                else if (att.status === 'Present' && att.workMode === 'Remote') status = 'WFH';
                else if (att.status === 'Present') status = 'In Office';
                else if (att.status === 'Absent') status = 'Absent';
                else if (att.status === 'Half-Day') status = 'Half Day';
                // On Field / On Duty come from remarks
                if (att.remarks === 'On Field') status = 'On Field';
                if (att.remarks === 'On Duty') status = 'On Duty';
            }
            return {
                _id: emp._id.toString(),
                name: emp.name,
                image: emp.image,
                jobTitle: emp.jobTitle,
                dept: emp.dept,
                status,
            };
        });

        return { success: true, data: resources };
    } catch (e: any) {
        return { success: false, error: e.message, data: [] };
    }
}
