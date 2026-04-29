"use server";

import connectToDatabase from "@/lib/db";
import ProjectStageTask from "@/models/ProjectStageTask";
import { revalidatePath } from "next/cache";

export async function getProjectAllSubtasks(projectId: string) {
    await connectToDatabase();
    try {
        const tasks = await ProjectStageTask.find({ projectId }).lean();
        return { success: true, data: JSON.parse(JSON.stringify(tasks)) };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function getStageSubtasks(projectId: string, stageId: string) {
    await connectToDatabase();
    try {
        const tasks = await ProjectStageTask.find({ projectId, stageId })
            .sort({ createdAt: 1 })
            .lean();
        return { success: true, data: JSON.parse(JSON.stringify(tasks)) };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function createStageSubtask(data: {
    projectId: string;
    stageId: string;
    moduleName?: string;
    title: string;
    description?: string;
    attachments?: string[];
}) {
    await connectToDatabase();
    try {
        const task = await ProjectStageTask.create({ ...data, completed: false });
        revalidatePath(`/projects/${data.projectId}/stages/${data.stageId}`);
        return { success: true, data: JSON.parse(JSON.stringify(task)) };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function toggleStageSubtask(id: string, projectId: string, stageId: string) {
    await connectToDatabase();
    try {
        const task = await ProjectStageTask.findById(id);
        if (!task) return { success: false, error: "Task not found" };
        task.completed = !task.completed;
        await task.save();
        revalidatePath(`/projects/${projectId}/stages/${stageId}`);
        return { success: true, data: JSON.parse(JSON.stringify(task)) };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function deleteStageSubtask(id: string, projectId: string, stageId: string) {
    await connectToDatabase();
    try {
        await ProjectStageTask.findByIdAndDelete(id);
        revalidatePath(`/projects/${projectId}/stages/${stageId}`);
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function addAttachmentsToSubtask(id: string, projectId: string, stageId: string, attachments: string[]) {
    await connectToDatabase();
    try {
        const task = await ProjectStageTask.findByIdAndUpdate(
            id,
            { $push: { attachments: { $each: attachments } } },
            { new: true }
        );
        if (!task) return { success: false, error: "Task not found" };
        revalidatePath(`/projects/${projectId}/stages/${stageId}`);
        return { success: true, data: JSON.parse(JSON.stringify(task)) };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
