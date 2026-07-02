"use server";

import { adminService } from "@/services/AdminService";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import connectToDatabase from "@/lib/db";
import mongoose from "mongoose";
import User from "@/models/User";
import AuditLog from "@/models/AuditLog";

// System Health Actions

const READY_STATES: Record<number, string> = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
};

export const getSystemHealth = async () => {
    const session = await auth();
    const role = session?.user?.role?.toLowerCase() || '';
    if (!role.includes('admin')) {
        return { success: false, error: 'Unauthorized' };
    }

    try {
        const dbStart = Date.now();
        await connectToDatabase();
        const dbLatencyMs = Date.now() - dbStart;
        const dbState = READY_STATES[mongoose.connection.readyState] || 'unknown';

        const [totalUsers, activeUsers, recentAuditCount] = await Promise.all([
            User.countDocuments({}),
            User.countDocuments({ status: { $ne: 'Inactive' } }),
            AuditLog.countDocuments({ timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } }).catch(() => 0),
        ]);

        return {
            success: true,
            data: {
                db: { state: dbState, latencyMs: dbLatencyMs },
                uptimeSeconds: Math.floor(process.uptime()),
                nodeVersion: process.version,
                env: process.env.NODE_ENV || 'development',
                totalUsers,
                activeUsers,
                recentAuditCount,
                checkedAt: new Date().toISOString(),
            },
        };
    } catch (error: any) {
        return { success: false, error: error.message || 'Health check failed' };
    }
};

export const getAdminDashboardData = async () => {
    try {
        const stats = await adminService.getDashboardStats();
        const logs = await adminService.getRecentLogs();
        return { success: true, data: { stats, logs } };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

export const getGlobalSettings = async () => {
    try {
        const settings = await adminService.getSettings();
        return { success: true, data: settings };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

export const updateGlobalSettings = async (data: any) => {
    try {
        await adminService.updateSettings(data);
        revalidatePath("/admin/settings");
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};


// ARA Actions
export const analyzeRisks = async () => {
    try {
        const report = await adminService.analyzeAccessRisks();
        return { success: true, data: report };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

// Security Actions
export const getSecurityData = async () => {
    try {
        const [admins, requests] = await Promise.all([
            adminService.getAdminUsers(),
            adminService.getAccessRequests()
        ]);
        return { success: true, data: { admins, requests } };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

export const toggleAdminIpRestriction = async (userId: string) => {
    try {
        await adminService.toggleIpRestriction(userId);
        revalidatePath("/admin/security");
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

export const releaseAdminIp = async (userId: string, hours: number) => {
    try {
        await adminService.releaseIpRestriction(userId, hours);
        revalidatePath("/admin/security");
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

export const updateRequestStatus = async (requestId: string, status: 'Approved' | 'Rejected') => {
    try {
        await adminService.updateAccessRequestStatus(requestId, status);
        revalidatePath("/admin/security");
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};
