"use server";

import { auth } from '@/auth';
import connectToDatabase from '@/lib/db';
import HRMRequest from '@/models/HRMRequest';
import User from '@/models/User';
import type { HRMRequestCategory, HRMRequestStatus, LeaveSubType } from '@/models/HRMRequest';
import { revalidatePath } from 'next/cache';

const PATHS = ['/hrm/leave', '/dashboards/super-admin'];

function serial(doc: any) {
    return JSON.parse(JSON.stringify(doc));
}

// ── Employee: submit a new request ───────────────────────────────────────────

export async function createHRMRequest(data: {
    category: HRMRequestCategory;
    leaveSubType?: LeaveSubType;
    startDate: string;
    endDate: string;
    halfDay?: boolean;
    reason: string;
    location?: string;
    destination?: string;
}) {
    try {
        const session = await auth();
        if (!session?.user?.id) return { success: false, error: 'Not authenticated' };

        await connectToDatabase();
        const user = await User.findById(session.user.id).select('name image dept').lean() as any;

        const doc = await HRMRequest.create({
            userId: session.user.id,
            userName: session.user.name || user?.name || 'Unknown',
            userImage: (user as any)?.image,
            dept: (user as any)?.dept,
            ...data,
            startDate: new Date(data.startDate),
            endDate: new Date(data.endDate),
        });

        PATHS.forEach(p => revalidatePath(p));
        return { success: true, data: serial(doc) };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

// ── Employee: own request history ────────────────────────────────────────────

export async function getMyHRMRequests(category?: HRMRequestCategory) {
    try {
        const session = await auth();
        if (!session?.user?.id) return { success: false, error: 'Not authenticated', data: [] };

        await connectToDatabase();
        const filter: any = { userId: session.user.id };
        if (category) filter.category = category;

        const docs = await HRMRequest.find(filter).sort({ createdAt: -1 }).lean();
        return { success: true, data: serial(docs) };
    } catch (e: any) {
        return { success: false, error: e.message, data: [] };
    }
}

// ── Employee: cancel own pending request ─────────────────────────────────────

export async function cancelHRMRequest(id: string) {
    try {
        const session = await auth();
        if (!session?.user?.id) return { success: false, error: 'Not authenticated' };

        await connectToDatabase();
        const doc = await HRMRequest.findOne({ _id: id, userId: session.user.id, status: 'Pending' });
        if (!doc) return { success: false, error: 'Request not found or already processed' };

        doc.status = 'Cancelled';
        await doc.save();

        PATHS.forEach(p => revalidatePath(p));
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

// ── Admin: all requests with filters ─────────────────────────────────────────

export async function getAllHRMRequests(opts?: {
    category?: HRMRequestCategory | 'All';
    status?: HRMRequestStatus | 'All';
    limit?: number;
}) {
    try {
        const session = await auth();
        if (!session?.user?.id) return { success: false, error: 'Not authenticated', data: [] };

        await connectToDatabase();
        const filter: any = {};
        if (opts?.category && opts.category !== 'All') filter.category = opts.category;
        if (opts?.status && opts.status !== 'All') filter.status = opts.status;

        const docs = await HRMRequest.find(filter)
            .sort({ createdAt: -1 })
            .limit(opts?.limit || 200)
            .lean();
        return { success: true, data: serial(docs) };
    } catch (e: any) {
        return { success: false, error: e.message, data: [] };
    }
}

// ── Admin: approve or reject ──────────────────────────────────────────────────

export async function updateHRMRequestStatus(
    id: string,
    status: 'Approved' | 'Rejected',
    adminNote?: string
) {
    try {
        const session = await auth();
        if (!session?.user?.id) return { success: false, error: 'Not authenticated' };

        await connectToDatabase();
        const doc = await HRMRequest.findByIdAndUpdate(
            id,
            {
                status,
                adminNote: adminNote || '',
                approverId: session.user.id,
                approverName: session.user.name,
            },
            { new: true }
        );
        if (!doc) return { success: false, error: 'Request not found' };

        PATHS.forEach(p => revalidatePath(p));
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

// ── Dashboard: pending counts by category ────────────────────────────────────

export async function getPendingRequestsSummary() {
    try {
        await connectToDatabase();
        const results = await HRMRequest.aggregate([
            { $match: { status: 'Pending' } },
            { $group: { _id: '$category', count: { $sum: 1 } } },
        ]);
        const summary: Record<string, number> = {
            Leave: 0, WFH: 0, 'On Duty': 0, Travel: 0, Other: 0,
        };
        results.forEach((r: any) => { summary[r._id] = r.count; });
        const total = Object.values(summary).reduce((a, b) => a + b, 0);
        return { success: true, data: { summary, total } };
    } catch (e: any) {
        return { success: false, error: e.message, data: { summary: {}, total: 0 } };
    }
}
