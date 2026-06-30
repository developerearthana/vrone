"use server";

import { z } from "zod";
import { createJSONAction } from "@/lib/safe-action";
import { auth } from "@/auth";
import { Company, Subsidiary, Department, Team } from "@/models/Organization";
import connectToDatabase from "@/lib/db";
import { revalidatePath, revalidateTag, unstable_cache } from "next/cache";

// --- Company Actions ---

const UpdateCompanySchema = z.object({
    name: z.string().min(1, "Name is required"),
    address: z.string().optional(),
    contactNumber: z.string().optional(),
    registrationNumber: z.string().optional(),
    website: z.string().optional(),
    logo: z.string().optional(),
    fullLogo: z.string().optional(),
    iconLogo: z.string().optional(),
});

const _fetchCompany = async () => {
    try {
        await connectToDatabase();
        let company = await Company.findOne().lean();
        if (!company) {
            company = await Company.create({
                name: 'Earthana India Pvt Ltd',
                address: '1201, Cyber One, Business Park, Vashi, Mumbai - 400703, Maharashtra',
                registrationNumber: '27AABCU9603R1Z2',
            });
            return JSON.parse(JSON.stringify(company));
        }
        return JSON.parse(JSON.stringify(company));
    } catch (e) {
        return { name: "Earthana (Offline Mode)" };
    }
};

export const getCompany = unstable_cache(_fetchCompany, ['company-data'], {
    revalidate: 3600,
    tags: ['company'],
});

export const updateCompany = createJSONAction(UpdateCompanySchema, async (data) => {
    try {
        const session = await auth();
        // Add robust role checking here if needed
        if (!session?.user) throw new Error("Unauthorized");

        await connectToDatabase();
        const company = await Company.findOneAndUpdate({}, { $set: data }, { new: true, upsert: true });

        revalidatePath("/masters/company");
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        revalidateTag("company");
        return { success: true, company: JSON.parse(JSON.stringify(company)) };
    } catch (error: any) {
        return { error: error.message || "Failed to update company" };
    }
});

// --- Subsidiary Actions ---

const SubsidiarySchema = z.object({
    id: z.string().optional(), // For updates
    name: z.string().min(1, "Name is required"),
    location: z.string().min(1, "Location is required"),
    address: z.string().optional(),
    contactNumber: z.string().optional(),
    headOfOperation: z.string().optional(),
    description: z.string().optional(), // Not in model but in UI, we might need to add it or ignore
    logo: z.string().optional(),
});

export const getSubsidiaries = async () => {
    await connectToDatabase();
    await getCompany(); // Ensure company exists
    const mainCompany = await Company.findOne();

    // Ensure "Earthana" (parent entity) always exists as a subsidiary
    const earthanaExists = await Subsidiary.findOne({ companyId: mainCompany._id, name: "Earthana" });
    if (!earthanaExists) {
        await Subsidiary.create({
            companyId: mainCompany._id,
            name: "Earthana",
            location: "Corporate",
            address: mainCompany.address,
            description: "Parent Company Entity"
        });
    }

    const subsidiaries = await Subsidiary.find({ companyId: mainCompany._id });
    return JSON.parse(JSON.stringify(subsidiaries));
};

export const createSubsidiary = createJSONAction(SubsidiarySchema, async (data) => {
    await connectToDatabase();
    const mainCompany = await Company.findOne();
    if (!mainCompany) throw new Error("Main company not found");

    const newSub = await Subsidiary.create({
        companyId: mainCompany._id,
        name: data.name,
        location: data.location,
        address: data.address,
        contactNumber: data.contactNumber,
        headOfOperation: data.headOfOperation,
        description: data.description,
        logo: data.logo
    });

    revalidatePath("/masters/subsidiaries");
    return { success: true, subsidiary: JSON.parse(JSON.stringify(newSub)) };
});

export const updateSubsidiary = createJSONAction(SubsidiarySchema, async (data) => {
    await connectToDatabase();
    if (!data.id) throw new Error("ID required for update");
    const sub = await Subsidiary.findByIdAndUpdate(
        data.id,
        { name: data.name, location: data.location, address: data.address, contactNumber: data.contactNumber, headOfOperation: data.headOfOperation, description: data.description, logo: data.logo },
        { new: true }
    );
    revalidatePath("/masters/subsidiaries");
    return { success: true, subsidiary: JSON.parse(JSON.stringify(sub)) };
});
export const deleteSubsidiary = createJSONAction(z.object({ id: z.string() }), async (data) => {
    await connectToDatabase();
    if (!data.id) throw new Error("ID required for deletion");
    await Subsidiary.findByIdAndDelete(data.id);
    revalidatePath("/masters/subsidiaries");
    return { success: true };
});

// --- Department Actions ---

const DepartmentSchema = z.object({
    id: z.string().optional(),
    subsidiaryId: z.string().min(1, "Subsidiary is required"),
    name: z.string().min(1, "Name is required"),
    code: z.string().min(1, "Code is required"),
    headOfDepartment: z.string().optional(),
    employees: z.array(z.string()).optional(),
});

export const getDepartments = async () => {
    await connectToDatabase();
    // Populate subsidiary info for display
    const departments = await Department.find()
        .populate('subsidiaryId', 'name')
        .populate('employees', 'name email image jobTitle')
        .sort({ createdAt: -1 });
    return JSON.parse(JSON.stringify(departments));
};

export const createDepartment = createJSONAction(DepartmentSchema, async (data) => {
    await connectToDatabase();
    const newDept = await Department.create({
        subsidiaryId: data.subsidiaryId,
        name: data.name,
        code: data.code,
        headOfDepartment: data.headOfDepartment,
        employees: data.employees || []
    });

    revalidatePath("/masters/departments");
    return { success: true, department: JSON.parse(JSON.stringify(newDept)) };
});

export const updateDepartment = createJSONAction(DepartmentSchema, async (data) => {
    await connectToDatabase();
    if (!data.id) throw new Error("ID required for update");
    const dept = await Department.findByIdAndUpdate(
        data.id,
        { subsidiaryId: data.subsidiaryId, name: data.name, code: data.code, headOfDepartment: data.headOfDepartment, employees: data.employees || [] },
        { new: true }
    );
    revalidatePath("/masters/departments");
    return { success: true, department: JSON.parse(JSON.stringify(dept)) };
});

export const deleteDepartment = createJSONAction(z.object({ id: z.string() }), async (data) => {
    await connectToDatabase();
    if (!data.id) throw new Error("ID required for deletion");

    await Department.findByIdAndDelete(data.id);

    revalidatePath("/masters/departments");
    return { success: true };
});

// --- Team Actions ---

const TeamSchema = z.object({
    id: z.string().optional(),
    name: z.string().min(1, "Name is required"),
    teamLead: z.string().optional(),
    members: z.array(z.string()).optional()
});

export const getTeams = async () => {
    try {
        await connectToDatabase();
        // Populate team lead and members from User model
        const teams = await Team.find()
            .populate('teamLead', 'name role dept jobTitle image')
            .populate('members', 'name role dept jobTitle image')
            .sort({ createdAt: -1 })
            .lean();
        return JSON.parse(JSON.stringify(teams));
    } catch (error) {
        console.error("Error fetching teams:", error);
        return [];
    }
};

export const createTeam = createJSONAction(TeamSchema, async (data) => {
    await connectToDatabase();
    const newTeam = await Team.create({
        name: data.name,
        teamLead: data.teamLead || undefined,
        members: data.members || []
    });
    revalidatePath("/masters/teams");
    return { success: true, team: JSON.parse(JSON.stringify(newTeam)) };
});

export const updateTeam = createJSONAction(TeamSchema, async (data) => {
    await connectToDatabase();
    if (!data.id) throw new Error("ID required for update");
    const team = await Team.findByIdAndUpdate(
        data.id,
        { name: data.name, teamLead: data.teamLead || undefined, members: data.members || [] },
        { new: true }
    );
    revalidatePath("/masters/teams");
    return { success: true, team: JSON.parse(JSON.stringify(team)) };
});

export const deleteTeam = createJSONAction(z.object({ id: z.string() }), async (data) => {
    await connectToDatabase();
    if (!data.id) throw new Error("ID required for deletion");
    await Team.findByIdAndDelete(data.id);
    revalidatePath("/masters/teams");
    return { success: true };
});

export const seedDefaults = async () => {
    try {
        await connectToDatabase();

        // 1. Ensure Company
        const companyRes = await getCompany();
        const companyId = companyRes._id;

        // 2. Ensure Subsidiary
        // 2. Ensure "Earthana" (Parent Entity) exists as a Subsidiary
        // This allows Departments to belong to the Parent Company directly
        let parentSub = await Subsidiary.findOne({ name: "Earthana" });
        if (!parentSub) {
            const newParentSub = await createSubsidiary({
                name: "Earthana",
                location: "Corporate",
                address: companyRes.address,
                description: "Parent Company Entity"
            });
            if (newParentSub.data?.subsidiary) {
                parentSub = newParentSub.data.subsidiary;
            }
        }

        const subs = await getSubsidiaries();
        let subId = subs.length > 0 ? subs[0]._id : null;
        if (!subId) {
            const newSubRes = await createSubsidiary({
                name: "Headquarters",
                location: "Mumbai",
                address: companyRes.address,
            });
            if (newSubRes.data?.subsidiary) {
                subId = newSubRes.data.subsidiary._id;
            }
        }

        if (!subId) throw new Error("Could not create/find subsidiary");

        // 3. Departments
        const deptNames = ["Administration", "Human Resources", "Finance", "Sales", "IT"];
        const existingDepts = await Department.find({ subsidiaryId: subId });

        const createdDepts = [];
        for (const name of deptNames) {
            if (!existingDepts.find(d => d.name === name)) {
                const code = name.substring(0, 3).toUpperCase();
                const d = await Department.create({
                    subsidiaryId: subId,
                    name,
                    code
                });
                createdDepts.push(d);
            }
        }

        revalidatePath("/masters/departments");
        return { success: true, createdData: createdDepts.length };
    } catch (error: any) {
        console.error("Seeding failed:", error);
        return { success: false, error: error.message };
    }
};
