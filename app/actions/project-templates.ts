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
    },
    {
        name: "Software Development",
        description: "End-to-end software project lifecycle from discovery to deployment.",
        stages: [
            { id: "sd1", name: "Discovery & Requirements", order: 0, modules: ["Docs", "Stakeholder Interviews", "User Stories"] },
            { id: "sd2", name: "System Design & Architecture", order: 1, modules: ["Tech Stack", "DB Schema", "API Design", "Wireframes"] },
            { id: "sd3", name: "UI/UX Design", order: 2, modules: ["Figma", "Prototypes", "Design Review"] },
            { id: "sd4", name: "Frontend Development", order: 3, modules: ["React", "Components", "Responsive UI"] },
            { id: "sd5", name: "Backend Development", order: 4, modules: ["API", "Database", "Auth", "Business Logic"] },
            { id: "sd6", name: "Integration & Testing", order: 5, modules: ["Unit Tests", "QA", "Bug Fixes", "UAT"] },
            { id: "sd7", name: "Deployment & DevOps", order: 6, modules: ["CI/CD", "Hosting", "Domain", "SSL"] },
            { id: "sd8", name: "Go Live & Handover", order: 7, modules: ["Training", "Docs", "Support Handover"] },
        ]
    },
    {
        name: "Mobile App Development",
        description: "iOS and Android app development workflow.",
        stages: [
            { id: "ma1", name: "Concept & Scope", order: 0, modules: ["Docs", "User Personas", "Feature List"] },
            { id: "ma2", name: "UX Research & Wireframes", order: 1, modules: ["User Flows", "Wireframes", "Competitor Analysis"] },
            { id: "ma3", name: "UI Design", order: 2, modules: ["Figma", "Style Guide", "Prototype"] },
            { id: "ma4", name: "Development Sprint 1", order: 3, modules: ["Core Features", "Auth", "Navigation"] },
            { id: "ma5", name: "Development Sprint 2", order: 4, modules: ["Feature Modules", "API Integration", "Push Notifications"] },
            { id: "ma6", name: "QA & Beta Testing", order: 5, modules: ["Testing", "Bug Fixes", "Performance"] },
            { id: "ma7", name: "App Store Submission", order: 6, modules: ["Play Store", "App Store", "Review Compliance"] },
            { id: "ma8", name: "Launch & Support", order: 7, modules: ["Marketing", "Analytics", "Support"] },
        ]
    },
    {
        name: "Digital Marketing Campaign",
        description: "Full campaign lifecycle from strategy to reporting.",
        stages: [
            { id: "dm1", name: "Strategy & Brief", order: 0, modules: ["Goals", "Target Audience", "Budget"] },
            { id: "dm2", name: "Content Planning", order: 1, modules: ["Content Calendar", "Keywords", "Creatives"] },
            { id: "dm3", name: "Creative Production", order: 2, modules: ["Graphics", "Videos", "Copywriting"] },
            { id: "dm4", name: "Campaign Setup", order: 3, modules: ["Google Ads", "Meta Ads", "Email", "SEO"] },
            { id: "dm5", name: "Campaign Live", order: 4, modules: ["Monitoring", "A/B Testing", "Optimization"] },
            { id: "dm6", name: "Reporting & Analysis", order: 5, modules: ["Analytics", "ROI Report", "Learnings"] },
        ]
    },
    {
        name: "HR Project Flow",
        description: "HR initiatives such as policy rollout, hiring drives, or training programs.",
        stages: [
            { id: "hr1", name: "Requirement & Planning", order: 0, modules: ["Headcount Plan", "JD Creation", "Approvals"] },
            { id: "hr2", name: "Sourcing & Screening", order: 1, modules: ["Job Posting", "Resume Review", "Initial Screen"] },
            { id: "hr3", name: "Interviews & Assessment", order: 2, modules: ["Technical Round", "HR Round", "Assignment"] },
            { id: "hr4", name: "Offer & Onboarding", order: 3, modules: ["Offer Letter", "Background Check", "Joining Formalities"] },
            { id: "hr5", name: "Induction & Training", order: 4, modules: ["Orientation", "Role Training", "Tool Access"] },
            { id: "hr6", name: "Closure & Reporting", order: 5, modules: ["MIS", "Feedback", "Report"] },
        ]
    },
    {
        name: "Event Management",
        description: "Corporate events, seminars, product launches, or client events.",
        stages: [
            { id: "ev1", name: "Event Planning & Brief", order: 0, modules: ["Objectives", "Budget", "Guest List"] },
            { id: "ev2", name: "Venue & Logistics", order: 1, modules: ["Venue Booking", "Catering", "AV Setup"] },
            { id: "ev3", name: "Promotions & Invitations", order: 2, modules: ["Invites", "Social Media", "Email Blast"] },
            { id: "ev4", name: "Event Execution", order: 3, modules: ["On-site Coordination", "Registration", "Agenda"] },
            { id: "ev5", name: "Post Event", order: 4, modules: ["Feedback", "Report", "Thank You Notes"] },
        ]
    },
    {
        name: "Procurement & Vendor Management",
        description: "End-to-end procurement from requirement to purchase order closure.",
        stages: [
            { id: "pv1", name: "Requirement Identification", order: 0, modules: ["Indent", "Specs", "Budget Approval"] },
            { id: "pv2", name: "Vendor Identification", order: 1, modules: ["RFQ", "Vendor List", "Shortlisting"] },
            { id: "pv3", name: "Quotation & Negotiation", order: 2, modules: ["Quotes", "Comparison", "Negotiation"] },
            { id: "pv4", name: "Purchase Order", order: 3, modules: ["PO Creation", "Approval", "Dispatch"] },
            { id: "pv5", name: "Delivery & Inspection", order: 4, modules: ["GRN", "Quality Check", "Invoice"] },
            { id: "pv6", name: "Payment & Closure", order: 5, modules: ["Payment", "Docs Archival", "Vendor Rating"] },
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

    // Insert any seed templates that don't exist by name yet
    const existingNames = new Set(
        (await ProjectTemplate.find({}, 'name').lean()).map((t: any) => t.name)
    );
    const toInsert = SEED_TEMPLATES.filter(t => !existingNames.has(t.name));
    if (toInsert.length > 0) {
        await ProjectTemplate.insertMany(toInsert);
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

// Merges stages from multiple templates into a new custom template and returns its name.
// Used when a project is created with multiple workflows selected.
export async function createMergedTemplate(projectName: string, templateNames: string[]): Promise<string> {
    await connectToDatabase();
    const templates = await ProjectTemplate.find({ name: { $in: templateNames }, isActive: true }).lean() as any[];

    // Merge stages in selection order, re-numbering globally
    let order = 0;
    const mergedStages: any[] = [];
    for (const tName of templateNames) {
        const t = templates.find((x: any) => x.name === tName);
        if (!t) continue;
        const sorted = [...(t.stages || [])].sort((a: any, b: any) => a.order - b.order);
        for (const s of sorted) {
            mergedStages.push({ ...s, id: `m-${order}-${s.id || s.name.replace(/\s+/g, '-').toLowerCase()}`, order: order++ });
        }
    }

    const mergedName = `${projectName} — Custom Workflow`;
    // Upsert: if a merged template with this name already exists, update it
    await ProjectTemplate.findOneAndUpdate(
        { name: mergedName },
        { name: mergedName, description: `Combined workflow: ${templateNames.join(', ')}`, stages: mergedStages, isActive: true },
        { upsert: true, new: true }
    );
    return mergedName;
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
