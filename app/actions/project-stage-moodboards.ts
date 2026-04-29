"use server";

import connectToDatabase from "@/lib/db";
import ProjectStageMoodBoard from "@/models/ProjectStageMoodBoard";
import { revalidatePath } from "next/cache";

export async function getStageMoodBoards(projectId: string, stageId: string) {
    await connectToDatabase();
    try {
        const boards = await ProjectStageMoodBoard.find({ projectId, stageId }).lean();
        return { success: true, data: JSON.parse(JSON.stringify(boards)) };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function toggleStageMoodBoard(projectId: string, stageId: string, moduleName: string) {
    await connectToDatabase();
    try {
        const existing = await ProjectStageMoodBoard.findOne({ projectId, stageId, moduleName });
        if (existing) {
            existing.completed = !existing.completed;
            await existing.save();
            return { success: true, data: JSON.parse(JSON.stringify(existing)) };
        } else {
            // First interaction — create as completed
            const created = await ProjectStageMoodBoard.create({
                projectId, stageId, moduleName, completed: true,
            });
            return { success: true, data: JSON.parse(JSON.stringify(created)) };
        }
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function updateStageMoodBoard(
    projectId: string,
    stageId: string,
    moduleName: string,
    data: { description?: string; attachments?: string[]; status?: string }
) {
    await connectToDatabase();
    try {
        const board = await ProjectStageMoodBoard.findOneAndUpdate(
            { projectId, stageId, moduleName },
            { $set: { ...data, updatedAt: new Date() } },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );
        revalidatePath(`/projects/${projectId}/stages/${stageId}`);
        return { success: true, data: JSON.parse(JSON.stringify(board)) };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function getProjectAllMoodBoards(projectId: string) {
    await connectToDatabase();
    try {
        const boards = await ProjectStageMoodBoard.find({ projectId }).lean();
        return { success: true, data: JSON.parse(JSON.stringify(boards)) };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
