"use server";

import connectToDatabase from "@/lib/db";
import ProjectBoardComment from "@/models/ProjectBoardComment";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";

export async function getBoardComments(projectId: string, stageId: string, moduleName: string) {
    await connectToDatabase();
    try {
        const comments = await ProjectBoardComment.find({ projectId, stageId, moduleName })
            .sort({ createdAt: 1 })
            .lean();
        return { success: true, data: JSON.parse(JSON.stringify(comments)) };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function getAllStageBoardComments(projectId: string, stageId: string) {
    await connectToDatabase();
    try {
        const comments = await ProjectBoardComment.find({ projectId, stageId })
            .sort({ createdAt: 1 })
            .lean();
        return { success: true, data: JSON.parse(JSON.stringify(comments)) };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function addBoardComment(data: {
    projectId: string;
    stageId: string;
    moduleName: string;
    text: string;
}) {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Not authenticated" };

    await connectToDatabase();
    try {
        const comment = await ProjectBoardComment.create({
            ...data,
            userId: session.user.id,
            userName: session.user.name || "Unknown",
            userEmail: session.user.email || "",
            userImage: session.user.image || "",
        });
        revalidatePath(`/projects/${data.projectId}/stages/${data.stageId}`);
        return { success: true, data: JSON.parse(JSON.stringify(comment)) };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function deleteBoardComment(commentId: string, projectId: string, stageId: string) {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Not authenticated" };

    await connectToDatabase();
    try {
        const comment = await ProjectBoardComment.findById(commentId);
        if (!comment) return { success: false, error: "Comment not found" };
        if (comment.userId !== session.user.id) return { success: false, error: "Not authorized" };
        await ProjectBoardComment.findByIdAndDelete(commentId);
        revalidatePath(`/projects/${projectId}/stages/${stageId}`);
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
