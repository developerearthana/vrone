"use server";

import { auth } from "@/auth";
import connectToDatabase from "@/lib/db";
import KPIAssignment from "@/models/KPIAssignment";
import { Team } from "@/models/Organization";
import { revalidatePath } from "next/cache";

function isAdminOrManager(role: string) {
    const r = role.toLowerCase();
    return r === 'admin' || r === 'super-admin' || r === 'manager' || r === 'hr';
}

async function getUserTeamIds(userId: string) {
    const teams = await Team.find({}).select('_id members').lean();
    return teams
        .filter((team: any) => (team.members || []).some((member: any) => String(member) === String(userId)))
        .map((team: any) => team._id);
}

async function hasKPIAccess(kpi: any, userId: string, role: string) {
    if (isAdminOrManager(role || '')) return true;

    const isDirectAssignee = kpi.assignedToUser?.toString() === String(userId);
    if (isDirectAssignee) return true;

    if (kpi.assignedToTeam) {
        const team = await Team.findById(kpi.assignedToTeam).select('members').lean();
        const isTeamMember = (team as any)?.members?.some((m: any) => String(m) === String(userId)) || false;
        if (isTeamMember) return true;
    }

    return false;
}

// ─── CREATE KPI Assignment (admin/manager only) ──────────────────────────────

export async function createKPIAssignment(data: {
    title: string;
    description?: string;
    metric: string;
    unit?: string;
    target: number;
    priority?: 'Low' | 'Medium' | 'High';
    frequency?: string;
    dueDate: string;
    assignedToUser?: string;
    assignedToTeam?: string;
    category?: string;
}) {
    try {
        const session = await auth();
        if (!session?.user?.id) return { success: false, error: "Unauthorized" };
        if (!isAdminOrManager(session.user.role || '')) {
            return { success: false, error: "Only admins/managers can assign KPIs" };
        }
        const assignedToUser = data.assignedToUser?.trim() || undefined;
        const assignedToTeam = data.assignedToTeam?.trim() || undefined;

        if (!assignedToUser && !assignedToTeam) {
            return { success: false, error: "Must assign to a user or a team" };
        }

        await connectToDatabase();
        const kpi = await KPIAssignment.create({
            title: data.title,
            description: data.description,
            metric: data.metric,
            unit: data.unit || 'Count',
            target: data.target,
            priority: data.priority || 'Medium',
            frequency: data.frequency || 'Monthly',
            dueDate: new Date(data.dueDate),
            assignedToUser,
            assignedToTeam,
            assignedBy: session.user.id,
            category: data.category || 'Operations',
            actual: 0,
            progress: 0,
            status: 'Not Started',
        });

        revalidatePath("/masters/teams");
        revalidatePath("/masters/kpi-assignments");
        revalidatePath("/dashboards/manager");
        revalidatePath("/dashboards/employee");
        revalidatePath("/dashboards/super-admin");
        revalidatePath("/goals/kpi");
        revalidatePath("/");

        return { success: true, data: JSON.parse(JSON.stringify(kpi)) };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

// ─── GET KPI Assignments ─────────────────────────────────────────────────────
// Admin/manager: all assignments
// Staff: own assignments + team assignments for teams they belong to

export async function getMyKPIAssignments() {
    try {
        const session = await auth();
        if (!session?.user?.id) return { success: false, data: [] };

        await connectToDatabase();
        const userId = session.user.id;

        if (isAdminOrManager(session.user.role || '')) {
            // Admin sees everything
            const kpis = await KPIAssignment.find({})
                .populate('assignedToUser', 'name email image role dept')
                .populate({
                    path: 'assignedToTeam',
                    populate: { path: 'members', select: 'name image role dept' }
                })
                .populate('contributions.user', 'name image')
                .populate('assignedBy', 'name')
                .sort({ dueDate: 1 })
                .lean();
            return { success: true, data: JSON.parse(JSON.stringify(kpis)) };
        }

        // Staff: find teams they belong to
        const teamIds = await getUserTeamIds(userId);

        const kpis = await KPIAssignment.find({
            $or: [
                { assignedToUser: userId },
                { assignedToTeam: { $in: teamIds } },
            ],
        })
            .populate('assignedToUser', 'name email image role dept')
            .populate({
                path: 'assignedToTeam',
                populate: { path: 'members', select: 'name image role dept' }
            })
            .populate('contributions.user', 'name image')
            .populate('assignedBy', 'name')
            .sort({ dueDate: 1 })
            .lean();

        return { success: true, data: JSON.parse(JSON.stringify(kpis)) };
    } catch (error: any) {
        return { success: false, error: error.message, data: [] };
    }
}

// ─── GET all assignments for admin dashboard ─────────────────────────────────

export async function getAllKPIAssignments() {
    try {
        const session = await auth();
        if (!session?.user?.id) return { success: false, data: [] };
        if (!isAdminOrManager(session.user.role || '')) {
            return { success: false, error: "Unauthorized", data: [] };
        }

        await connectToDatabase();
        const kpis = await KPIAssignment.find({})
            .populate('assignedToUser', 'name email image role dept')
            .populate({
                path: 'assignedToTeam',
                populate: { path: 'members', select: 'name image role dept' }
            })
            .populate('contributions.user', 'name image')
            .populate('assignedBy', 'name')
            .sort({ createdAt: -1 })
            .lean();

        return { success: true, data: JSON.parse(JSON.stringify(kpis)) };
    } catch (error: any) {
        return { success: false, error: error.message, data: [] };
    }
}

// ─── UPDATE KPI Progress (member updates their own / team KPI) ───────────────

export async function updateKPIProgress(data: {
    id: string;
    actual: number;
    notes?: string;
}) {
    try {
        const session = await auth();
        if (!session?.user?.id) return { success: false, error: "Unauthorized" };

        await connectToDatabase();
        const userId = session.user.id;
        const kpi = await KPIAssignment.findById(data.id);
        if (!kpi) return { success: false, error: "KPI not found" };

        // Check permissions: must be assignee, team member, or admin
        const allowed = await hasKPIAccess(kpi, userId, session.user.role || '');
        if (!allowed) {
            return { success: false, error: "You are not assigned to this KPI" };
        }

        const target = kpi.target || 100;
        const previousActual = Number(kpi.actual || 0);
        const actual = Number(data.actual || 0);
        const delta = actual - previousActual;
        const progress = Math.min(100, Math.round((actual / target) * 100));

        // Auto-compute status
        let status: string = kpi.status;
        if (progress >= 100) status = 'Completed';
        else if (progress > 0) status = 'In Progress';

        const updatePayload: any = {
            actual,
            progress,
            status,
            notes: data.notes,
            ...(progress >= 100 ? { completedAt: new Date() } : {}),
        };

        // For team visibility: when a user increases total progress, store their delta as contribution.
        if (delta > 0) {
            updatePayload.$push = {
                contributions: {
                    user: userId,
                    value: delta,
                    date: new Date(),
                    notes: data.notes || "Progress update",
                },
            };
        }

        const updated = await KPIAssignment.findByIdAndUpdate(
            data.id,
            updatePayload,
            { new: true }
        )
            .populate('assignedToUser', 'name email image role dept')
            .populate('assignedToTeam', 'name')
            .populate('assignedBy', 'name');

        revalidatePath("/goals/kpi");
        revalidatePath("/masters/kpi-assignments");
        revalidatePath("/dashboards/manager");
        revalidatePath("/dashboards/employee");
        revalidatePath("/dashboards/super-admin");
        revalidatePath("/");

        return { success: true, data: JSON.parse(JSON.stringify(updated)) };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

// ─── MARK KPI Complete ───────────────────────────────────────────────────────

export async function markKPIComplete(id: string) {
    try {
        const session = await auth();
        if (!session?.user?.id) return { success: false, error: "Unauthorized" };

        await connectToDatabase();
        const userId = session.user.id;
        const kpi = await KPIAssignment.findById(id);
        if (!kpi) return { success: false, error: "KPI not found" };

        const allowed = await hasKPIAccess(kpi, userId, session.user.role || '');
        if (!allowed) {
            return { success: false, error: "Not authorized to complete this KPI" };
        }

        const updated = await KPIAssignment.findByIdAndUpdate(
            id,
            { status: 'Completed', progress: 100, actual: kpi.target, completedAt: new Date() },
            { new: true }
        );

        revalidatePath("/goals/kpi");
        return { success: true, data: JSON.parse(JSON.stringify(updated)) };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

// ─── DELETE KPI Assignment (admin only) ──────────────────────────────────────

export async function deleteKPIAssignment(id: string) {
    try {
        const session = await auth();
        if (!session?.user?.id) return { success: false, error: "Unauthorized" };
        if (!isAdminOrManager(session.user.role || '')) {
            return { success: false, error: "Only admins can delete KPI assignments" };
        }

        await connectToDatabase();
        await KPIAssignment.findByIdAndDelete(id);
        revalidatePath("/goals/kpi");
        revalidatePath("/masters/teams");
        revalidatePath("/masters/kpi-assignments");
        revalidatePath("/dashboards/super-admin");
        revalidatePath("/");

        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

// ─── UPDATE KPI Assignment details (admin only) ──────────────────────────────

export async function updateKPIAssignment(data: {
    id: string;
    title?: string;
    description?: string;
    target?: number;
    dueDate?: string;
    priority?: 'Low' | 'Medium' | 'High';
    status?: string;
}) {
    try {
        const session = await auth();
        if (!session?.user?.id) return { success: false, error: "Unauthorized" };
        if (!isAdminOrManager(session.user.role || '')) {
            return { success: false, error: "Only admins can update KPI assignments" };
        }

        await connectToDatabase();
        const { id, dueDate, ...rest } = data;
        const updated = await KPIAssignment.findByIdAndUpdate(
            id,
            { ...rest, ...(dueDate ? { dueDate: new Date(dueDate) } : {}) },
            { new: true }
        );

        revalidatePath("/goals/kpi");
        return { success: true, data: JSON.parse(JSON.stringify(updated)) };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

// ─── ADD KPI Contribution ────────────────────────────────────────────────────

export async function addKPIContribution(data: {
    kpiId: string;
    value: number;
    notes?: string;
}) {
    try {
        const session = await auth();
        if (!session?.user?.id) return { success: false, error: "Unauthorized" };

        await connectToDatabase();
        const userId = session.user.id;
        const kpi = await KPIAssignment.findById(data.kpiId);
        if (!kpi) return { success: false, error: "KPI not found" };

        const allowed = await hasKPIAccess(kpi, userId, session.user.role || '');
        if (!allowed) {
            return { success: false, error: "You are not assigned to this KPI" };
        }

        // Record the contribution
        const contribution = {
            user: userId,
            value: data.value,
            date: new Date(),
            notes: data.notes
        };

        const updatedActual = (kpi.actual || 0) + data.value;
        const target = kpi.target || 100;
        const progress = Math.min(100, Math.round((updatedActual / target) * 100));

        let status = kpi.status;
        if (progress >= 100) status = 'Completed';
        else if (progress > 0) status = 'In Progress';

        const updated = await KPIAssignment.findByIdAndUpdate(
            data.kpiId,
            {
                $push: { contributions: contribution },
                actual: updatedActual,
                progress,
                status,
                ...(progress >= 100 ? { completedAt: new Date() } : {})
            },
            { new: true }
        ).populate('contributions.user', 'name image');

        revalidatePath("/masters/kpi-assignments");
        revalidatePath("/goals/kpi");
        revalidatePath("/dashboards/manager");
        revalidatePath("/dashboards/employee");
        return { success: true, data: JSON.parse(JSON.stringify(updated)) };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
