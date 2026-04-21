"use server";

import { projectService } from "@/services/ProjectService";
import { revalidatePath } from "next/cache";
import connectToDatabase from "@/lib/db";
import Project from "@/models/Project";
import ProjectTemplate from "@/models/ProjectTemplate";
import ProjectStageTask from "@/models/ProjectStageTask";
import ProjectStageMoodBoard from "@/models/ProjectStageMoodBoard";

export const getProjects = async (filters: any) => {
    try {
        const data = await projectService.getProjects(filters);
        return { success: true, data };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

export const getProjectStats = async () => {
    try {
        const data = await projectService.getDashboardStats();
        return { success: true, data };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

export const createProject = async (data: any) => {
    try {
        const project = await projectService.createProject(data);
        revalidatePath('/projects');
        return { success: true, data: project };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

export const updateProject = async (id: string, data: any) => {
    try {
        const project = await projectService.updateProject(id, data);
        revalidatePath('/projects');
        revalidatePath(`/projects/${id}`);
        return { success: true, data: project };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

export const deleteProject = async (id: string) => {
    try {
        await projectService.deleteProject(id);
        // Also delete all stage subtasks for this project
        await connectToDatabase();
        await ProjectStageTask.deleteMany({ projectId: id });
        revalidatePath('/projects');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

export const getProjectById = async (id: string) => {
    try {
        const project = await projectService.getProjectById(id);
        return { success: true, data: project };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

/**
 * Mark a stage as complete — persists to DB and recalculates project progress
 */
export const completeStage = async (projectId: string, stageId: string) => {
    await connectToDatabase();
    try {
        // $addToSet atomically adds stageId only if not already present — never touches other stages
        const updated = await Project.findByIdAndUpdate(
            projectId,
            { $addToSet: { completedStageIds: stageId } },
            { new: true }
        ).lean() as any;

        if (!updated) return { success: false, error: "Project not found" };

        const completedStageIds: string[] = updated.completedStageIds || [];
        const progress = await _calcProgress(projectId, updated.template, completedStageIds);
        await Project.findByIdAndUpdate(projectId, { $set: { progress } });

        revalidatePath(`/projects/${projectId}`);
        revalidatePath('/projects');
        return { success: true, progress, completedStageIds };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

/**
 * Remove a stage from completedStageIds — undo a completion
 */
export const uncompleteStage = async (projectId: string, stageId: string) => {
    await connectToDatabase();
    try {
        const updated = await Project.findByIdAndUpdate(
            projectId,
            { $pull: { completedStageIds: stageId } },
            { new: true }
        ).lean() as any;

        if (!updated) return { success: false, error: "Project not found" };

        const completedStageIds: string[] = updated.completedStageIds || [];
        const progress = await _calcProgress(projectId, updated.template, completedStageIds);
        await Project.findByIdAndUpdate(projectId, { $set: { progress } });

        revalidatePath(`/projects/${projectId}`);
        revalidatePath('/projects');
        return { success: true, progress, completedStageIds };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

/**
 * Recalculate and persist project progress based on subtasks + completed stages
 */
export const recalculateProjectProgress = async (projectId: string) => {
    await connectToDatabase();
    try {
        const project = await Project.findById(projectId).lean() as any;
        if (!project) return { success: false, error: "Project not found" };

        const progress = await _calcProgress(projectId, project.template, project.completedStageIds || []);

        await Project.findByIdAndUpdate(projectId, { $set: { progress } });
        return { success: true, progress };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

/**
 * Add an extra work board module to a specific stage of a project
 */
export const addStageExtraModule = async (projectId: string, stageId: string, moduleName: string) => {
    await connectToDatabase();
    try {
        const project = await Project.findById(projectId).lean() as any;
        if (!project) return { success: false, error: "Project not found" };

        const extraModules: string[] = project.stageExtraModules?.[stageId] || [];
        if (extraModules.includes(moduleName)) return { success: false, error: "Module already added" };

        await Project.findByIdAndUpdate(projectId, {
            $push: { [`stageExtraModules.${stageId}`]: moduleName },
        });

        revalidatePath(`/projects/${projectId}`);
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

/**
 * Remove an extra work board module from a specific stage of a project
 */
export const removeStageExtraModule = async (projectId: string, stageId: string, moduleName: string) => {
    await connectToDatabase();
    try {
        await Project.findByIdAndUpdate(projectId, {
            $pull: { [`stageExtraModules.${stageId}`]: moduleName },
        });

        revalidatePath(`/projects/${projectId}`);
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

async function _calcProgress(projectId: string, templateName: string | undefined, completedStageIds: string[]): Promise<number> {
    if (!templateName) return 0;

    const template = await ProjectTemplate.findOne({ name: templateName, isActive: true }).lean() as any;
    if (!template || !template.stages?.length) return 0;

    const stages = [...template.stages].sort((a: any, b: any) => a.order - b.order);

    // Get all subtasks grouped by stageId
    const allSubtasks = await ProjectStageTask.find({ projectId }).lean() as any[];
    const subtasksByStage: Record<string, any[]> = {};
    for (const t of allSubtasks) {
        if (!subtasksByStage[t.stageId]) subtasksByStage[t.stageId] = [];
        subtasksByStage[t.stageId].push(t);
    }

    // Get all mood board completions grouped by stageId
    const allMoodBoards = await ProjectStageMoodBoard.find({ projectId }).lean() as any[];
    const moodBoardsByStage: Record<string, any[]> = {};
    for (const m of allMoodBoards) {
        if (!moodBoardsByStage[m.stageId]) moodBoardsByStage[m.stageId] = [];
        moodBoardsByStage[m.stageId].push(m);
    }

    let total = 0;
    for (const stage of stages) {
        const tasks = subtasksByStage[stage.id] || [];
        const moodBoards = moodBoardsByStage[stage.id] || [];
        const totalModules = (stage.modules || []).length;

        const totalItems = tasks.length + totalModules;
        const completedItems =
            tasks.filter((t: any) => t.completed).length +
            moodBoards.filter((m: any) => m.completed).length;

        if (totalItems > 0) {
            total += (completedItems / totalItems) * 100;
        } else {
            total += completedStageIds.includes(stage.id) ? 100 : 0;
        }
    }

    return Math.round(total / stages.length);
}
