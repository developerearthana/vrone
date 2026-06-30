"use server";

import { z } from "zod";
import { createJSONAction } from "@/lib/safe-action";
import { userService } from "@/services/UserService";
import { hrmService } from "@/services/HRMService";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";

// --- User Actions ---

export const getHRMDashboardStats = async () => {
    try {
        const data = await hrmService.getDashboardStats();
        return { success: true, data };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

export const getUsers = async () => {
    try {
        const users = await userService.getAllUsers();
        return { success: true, data: users };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

const UpdateUserSchema = z.object({
    id: z.string(),
    name: z.string().min(1).optional(),
    email: z.string().email().optional(),
    role: z.string().optional(),
    dept: z.string().optional(),
    status: z.string().optional(),
    customRole: z.string().optional(),
    customPermissions: z.array(z.string()).optional(),
    salaryStructure: z.object({
        basic: z.number().optional(),
        hra: z.number().optional(),
        allowances: z.number().optional(),
        deductions: z.object({
            pf: z.number().optional(),
            tax: z.number().optional(),
            other: z.number().optional(),
        }).optional()
    }).optional(),
});

export const updateUser = createJSONAction(UpdateUserSchema, async (data) => {
    const { id, ...updateData } = data;
    await userService.updateUser(id, updateData);
    revalidatePath("/hrm/employees");
    revalidatePath("/hrm/employees/[id]/salary");
    return { success: true };
});

export const toggleUserStatus = async (id: string, currentStatus: string) => {
    try {
        const newStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';
        await userService.updateUser(id, { status: newStatus });
        revalidatePath("/admin/users");
        return { success: true, newStatus };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

export const resetUserPassword = async (id: string, newPassword: string) => {
    try {
        if (!newPassword || newPassword.length < 6) {
            return { success: false, error: "Password must be at least 6 characters" };
        }
        await userService.updatePassword(id, newPassword);
        revalidatePath("/admin/users");
        revalidatePath("/hrm/employees");
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export const adminResetPassword = async (id: string, newPassword: string) => {
    try {
        await userService.updatePassword(id, newPassword);
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

// --- Attendance Actions ---

export const getAttendance = async (userId?: string, month?: number, year?: number) => {
    try {
        const session = await auth();
        if (!session?.user?.id) return { success: false, error: 'Unauthorized', data: [] };
        // Use server-session ID; only admin can pass a different userId
        const role = session.user.role?.toLowerCase() || '';
        const isAdmin = role.includes('admin') || role.includes('manager') || role.includes('hr');
        const resolvedUserId = (isAdmin && userId) ? userId : session.user.id;
        const data = await hrmService.getAttendance(resolvedUserId, month, year);
        return { success: true, data };
    } catch (error: any) {
        return { success: false, error: error.message, data: [] };
    }
};

export const punchIn = async (_clientUserId?: string, workMode: 'Office' | 'Remote' = 'Office', location?: { lat: number; lng: number }) => {
    try {
        const session = await auth();
        if (!session?.user?.id) return { success: false, error: 'You must be logged in to punch in.' };
        const userId = session.user.id;
        const data = await hrmService.punchIn(userId, workMode, location);
        revalidatePath("/hrm/attendance");
        return { success: true, data };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

export const adminAdjustAttendance = async (payload: {
    userId: string;
    date: string;
    punchIn?: string;
    punchOut?: string;
    status: string;
    workMode: string;
    remarks?: string;
}) => {
    try {
        const session = await auth();
        if (!session?.user?.id) return { success: false, error: 'Unauthorized' };
        const role = session.user.role?.toLowerCase() || '';
        if (!role.includes('admin') && !role.includes('manager') && !role.includes('hr')) {
            return { success: false, error: 'Access denied' };
        }
        const data = await hrmService.adminAdjustAttendance(payload);
        revalidatePath("/hrm/attendance-report");
        return { success: true, data };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

export const punchOut = async (_clientUserId?: string) => {
    try {
        // Always use server-side session — never trust client-passed userId
        const session = await auth();
        if (!session?.user?.id) return { success: false, error: 'You must be logged in to punch out.' };
        const userId = session.user.id;
        const data = await hrmService.punchOut(userId);
        revalidatePath("/hrm/attendance");
        return { success: true, data };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

// --- Leave Actions ---

export const getAllAttendance = async (dateStr?: string) => {
    try {
        const date = dateStr ? new Date(dateStr) : new Date();
        const data = await hrmService.getAllAttendance(date);
        return { success: true, data };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

export const getAttendanceReport = async (month: number, year: number) => {
    try {
        const data = await hrmService.getAttendanceReport(month, year);
        return { success: true, data };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

export const getAbsentees = async (dateStr?: string) => {
    try {
        const date = dateStr ? new Date(dateStr) : new Date();
        const data = await hrmService.getAbsentees(date);
        return { success: true, data };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

export const getLiveUsers = async () => {
    try {
        const data = await hrmService.getLiveUsers();
        return { success: true, data };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

export const getLeaves = async () => {
    try {
        const session = await auth();
        if (!session?.user?.id) throw new Error("Unauthorized");

        const filter: any = {};
        const r = session.user.role?.toLowerCase() || '';
        const isAdminOrHR = r.includes('admin') || r.includes('manager') || r.includes('hr');

        if (!isAdminOrHR) {
            filter.userId = session.user.id;
        }

        const data = await hrmService.getLeaveRequests(filter);
        return { success: true, data };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

const LeaveRequestSchema = z.object({
    userId: z.string(),
    userName: z.string(),
    type: z.enum(['Sick', 'Casual', 'Festival', 'Emergency', 'Other']),
    startDate: z.string(),
    endDate: z.string(),
    reason: z.string().min(1),
});

export const requestLeave = createJSONAction(LeaveRequestSchema, async (data) => {
    await hrmService.createLeaveRequest(data);
    revalidatePath("/hrm/leave");
    return { success: true };
});

export const approveLeave = async (id: string, status: 'Approved' | 'Rejected') => {
    try {
        const session = await auth();
        if (!session?.user?.id) throw new Error("Unauthorized");

        const approverName = session.user.name || "Administrator";
        const approverRole = session.user.role || "Admin";
        await hrmService.updateLeaveStatus(id, status, session.user.id, approverName, approverRole);
        revalidatePath("/hrm/leave");
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

// --- Payroll Actions ---

export const getPayslips = async (employeeId?: string) => {
    try {
        const data = await hrmService.getPayslips(employeeId || "");
        return { success: true, data };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

export const generateMonthlyPayroll = async (month: string, year: number) => {
    try {
        await hrmService.generatePayroll(month, year);
        revalidatePath("/hrm/payroll");
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

export const generatePayrollForEmployee = async (employeeId: string, month: string, year: number) => {
    try {
        const data = await hrmService.generatePayrollForEmployee(employeeId, month, year);
        revalidatePath("/hrm/payroll");
        return { success: true, data };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

export const getAllPayrollForMonth = async (month: string, year: number) => {
    try {
        const data = await hrmService.getAllPayrollForMonth(month, year);
        return { success: true, data };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

export const markPayrollPaid = async (payrollId: string) => {
    try {
        const data = await hrmService.markPayrollPaid(payrollId);
        revalidatePath("/hrm/payroll");
        return { success: true, data };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};
