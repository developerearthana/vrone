"use server";

import connectToDatabase from "@/lib/db";
import ProjectTemplate, { IStage } from "@/models/ProjectTemplate";
import Master from "@/models/Master";
import { revalidatePath } from "next/cache";

const REVALIDATE_PATH = "/masters/project-templates";

const SEED_TEMPLATES = [
    {
        name: "Architectural Design Flow",
        description: "Standard flow for architectural projects from lead to handover.",
        stages: [
            { id: "s1", name: "Lead & Followup", order: 0, modules: ["CRM", "Communication"] },
            { id: "s2", name: "Site Inspection & Meetings", order: 1, modules: ["Schedule", "Maps"] },
            { id: "s3", name: "Documentations & Agreements", order: 2, modules: ["Docs", "Signatures"] },
            { id: "s4", name: "Architectural Planning", order: 3, modules: ["Blueprints", "CAD"] },
            { id: "s5", name: "Construction Management", order: 4, modules: ["Civil Work", "Electrical Work", "Plumbing Work"] },
            { id: "s6", name: "Interior Designing", order: 5, modules: ["MoodBoards", "Procurement"] },
            { id: "s7", name: "Client Communication", order: 6, modules: ["Chat", "Updates"] },
            { id: "s8", name: "Handover & Feedback", order: 7, modules: ["Signoff", "Surveys"] },
        ]
    },
    {
        name: "Construction Execution Flow",
        description: "Detailed construction execution workflow.",
        stages: [
            { id: "ce1", name: "Project Approval & Work Order", order: 0, modules: ["Approvals", "Docs"] },
            { id: "ce2", name: "Working Drawings", order: 1, modules: ["Blueprints", "CAD"] },
            { id: "ce3", name: "Civil Works Exec", order: 2, modules: ["Civil Work"] },
            { id: "ce4", name: "Structure & Roofing", order: 3, modules: ["Structure", "Roofing"] },
            { id: "ce5", name: "MEP Works (Mech, Elec, Plumbing)", order: 4, modules: ["Electrical Work", "Plumbing Work"] },
            { id: "ce6", name: "Finishing & Plastering", order: 5, modules: ["Plastering", "Flooring", "Painting"] },
            { id: "ce7", name: "Final Handover", order: 6, modules: ["Signoff"] },
        ]
    },
    {
        name: "Interior Design Flow",
        description: "Focused interior design and fit-out workflow.",
        stages: [
            { id: "id1", name: "Concept & Mood Board", order: 0, modules: ["MoodBoards"] },
            { id: "id2", name: "3D Visuals & Approval", order: 1, modules: ["3D Models", "Approvals"] },
            { id: "id3", name: "Material Selection", order: 2, modules: ["Material Board", "Inventory"] },
            { id: "id4", name: "Fit-out Execution", order: 3, modules: ["Carpentry", "Civil Work"] },
            { id: "id5", name: "Lighting & Decor", order: 4, modules: ["Electrical Work", "Decor"] },
            { id: "id6", name: "Handover", order: 5, modules: ["Signoff"] },
        ]
    },
    {
        name: "Re-Engineering / Renovation",
        description: "For renovation and restructuring projects.",
        stages: [
            { id: "re1", name: "Site Survey & Analysis", order: 0, modules: ["Survey", "Docs"] },
            { id: "re2", name: "Demolition Planning", order: 1, modules: ["Demolition", "Safety"] },
            { id: "re3", name: "Structural Reinforcement", order: 2, modules: ["Structure", "Civil Work"] },
            { id: "re4", name: "Re-construction", order: 3, modules: ["Construction", "MEP"] },
            { id: "re5", name: "Finishing", order: 4, modules: ["Finishing"] },
        ]
    }
];

export async function seedMoodBoardItems() {
    await connectToDatabase();
    await seedMoodBoardIfEmpty();
}

async function seedMoodBoardIfEmpty() {
    const allModules = Array.from(new Set(
        SEED_TEMPLATES.flatMap(t => t.stages.flatMap(s => s.modules))
    ));
    const existingMoodBoard = await Master.find({ type: 'ProjectMoodBoard' }).lean();
    const existingLabels = new Set(existingMoodBoard.map((m: any) => m.label));
    const toInsert = allModules
        .filter(mod => !existingLabels.has(mod))
        .map((mod, i) => ({ type: 'ProjectMoodBoard', label: mod, value: mod, order: i, isActive: true }));
    if (toInsert.length > 0) {
        await Master.insertMany(toInsert);
    }
}

export async function getProjectTemplates() {
    await connectToDatabase();

    // Always seed missing mood board items
    await seedMoodBoardIfEmpty();

    const count = await ProjectTemplate.countDocuments({ isActive: true });
    if (count === 0) {
        await ProjectTemplate.insertMany(SEED_TEMPLATES);
    }
    const templates = await ProjectTemplate.find({ isActive: true }).sort({ createdAt: 1 }).lean() as any[];

    // Auto-fix missing stage ids across all templates
    for (const t of templates) {
        const needsFix = t.stages?.some((s: any) => !s.id);
        if (needsFix) {
            const fixed = (t.stages || []).map((s: any, i: number) => ({
                ...s,
                id: s.id || `s-${s.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${i}`,
            }));
            await ProjectTemplate.findByIdAndUpdate(t._id, { $set: { stages: fixed } });
            t.stages = fixed;
        }
    }

    return { success: true, data: JSON.parse(JSON.stringify(templates)) };
}

export async function createProjectTemplate(data: { name: string; description?: string }) {
    await connectToDatabase();
    try {
        const template = await ProjectTemplate.create({
            name: data.name,
            description: data.description || "",
            stages: [],
        });
        revalidatePath(REVALIDATE_PATH);
        return { success: true, data: JSON.parse(JSON.stringify(template)) };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function updateProjectTemplate(id: string, data: { name?: string; description?: string; stages?: IStage[] }) {
    await connectToDatabase();
    try {
        const template = await ProjectTemplate.findByIdAndUpdate(id, data, { new: true });
        revalidatePath(REVALIDATE_PATH);
        return { success: true, data: JSON.parse(JSON.stringify(template)) };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function deleteProjectTemplate(id: string) {
    await connectToDatabase();
    try {
        await ProjectTemplate.findByIdAndUpdate(id, { isActive: false });
        revalidatePath(REVALIDATE_PATH);
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function getProjectTemplateByName(name: string) {
    await connectToDatabase();
    try {
        const template = await ProjectTemplate.findOne({ name, isActive: true }).lean() as any;
        if (!template) return { success: true, data: null };

        // Auto-fix: stages missing an id get a stable id generated from their name+order
        // This runs once and saves to DB so IDs are stable going forward
        const needsFix = template.stages?.some((s: any) => !s.id);
        if (needsFix) {
            const fixed = (template.stages || []).map((s: any, i: number) => ({
                ...s,
                id: s.id || `s-${s.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${i}`,
            }));
            await ProjectTemplate.findByIdAndUpdate(template._id, { $set: { stages: fixed } });
            template.stages = fixed;
        }

        return { success: true, data: JSON.parse(JSON.stringify(template)) };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
