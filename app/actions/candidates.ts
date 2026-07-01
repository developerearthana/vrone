"use server";

import connectToDatabase from "@/lib/db";
import Candidate from "@/models/Candidate";
import { revalidatePath } from "next/cache";

const STAGES = ['Applied', 'Screening', 'Interview', 'Selected', 'Rejected'] as const;
type Stage = typeof STAGES[number];

export async function getCandidates() {
    try {
        await connectToDatabase();
        const candidates = await Candidate.find({}).sort({ createdAt: -1 }).lean();
        return { success: true, data: JSON.parse(JSON.stringify(candidates)) };
    } catch (error: any) {
        console.error("getCandidates error:", error);
        return { success: false, error: error.message, data: [] };
    }
}

export interface CreateCandidateData {
    name: string;
    email: string;
    phone?: string;
    positionApplied: string;
    status?: Stage;
    resumeUrl?: string;
    interviewDate?: string;
    interviewTime?: string;
    interviewer?: string;
}

export async function createCandidate(data: CreateCandidateData) {
    try {
        await connectToDatabase();
        const candidate = await Candidate.create({
            name: data.name,
            email: data.email,
            phone: data.phone || 'N/A',
            positionApplied: data.positionApplied,
            status: data.status || 'Applied',
            resumeUrl: data.resumeUrl || undefined,
            interviewSchedule: data.interviewDate ? {
                date: new Date(data.interviewDate),
                time: data.interviewTime || '',
                interviewer: data.interviewer || '',
            } : undefined,
        });
        revalidatePath("/hrm/interview");
        revalidatePath("/hrm");
        return { success: true, data: JSON.parse(JSON.stringify(candidate)) };
    } catch (error: any) {
        console.error("createCandidate error:", error);
        return { success: false, error: error.message || "Failed to add candidate" };
    }
}

export async function updateCandidateStage(id: string, status: Stage) {
    try {
        await connectToDatabase();
        const candidate = await Candidate.findByIdAndUpdate(id, { status }, { new: true });
        if (!candidate) return { success: false, error: "Candidate not found" };
        revalidatePath("/hrm/interview");
        revalidatePath("/hrm");
        return { success: true, data: JSON.parse(JSON.stringify(candidate)) };
    } catch (error: any) {
        return { success: false, error: error.message || "Failed to update stage" };
    }
}

export async function deleteCandidate(id: string) {
    try {
        await connectToDatabase();
        await Candidate.findByIdAndDelete(id);
        revalidatePath("/hrm/interview");
        revalidatePath("/hrm");
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message || "Failed to delete candidate" };
    }
}
