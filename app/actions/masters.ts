"use server";

import Master, { IMaster } from "@/models/Master";
import User from "@/models/User";
import Employee from "@/models/Employee";
import connectToDatabase from "@/lib/db";
import { revalidatePath } from "next/cache";

/**
 * Get all masters grouped by type or filtered by type
 */
export async function getMasters(type?: string) {
    await connectToDatabase();
    const query = type ? { type, isActive: true } : { isActive: true };
    const masters = await Master.find(query).sort({ order: 1, label: 1 }).lean();
    return { success: true, data: JSON.parse(JSON.stringify(masters)) };
}

/**
 * Create a new master entry
 */
export async function createMaster(data: Partial<IMaster>) {
    await connectToDatabase();
    try {
        const master = await Master.create(data);
        revalidatePath("/masters/kpi-metrics");
        revalidatePath("/masters/vendor-categories");
        revalidatePath("/masters/vendors");
        return { success: true, data: JSON.parse(JSON.stringify(master)) };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

/**
 * Update a master entry. For JobTitle type, cascades the rename to User + Employee records
 * so existing records always reflect the current label without manual intervention.
 */
export async function updateMaster(id: string, data: Partial<IMaster>) {
    await connectToDatabase();
    try {
        const old = await Master.findById(id).lean() as any;
        const master = await Master.findByIdAndUpdate(id, data, { new: true });

        if (old?.type === 'JobTitle' && data.label && old.label !== data.label) {
            await Promise.all([
                User.updateMany({ jobTitle: old.label }, { $set: { jobTitle: data.label } }),
                Employee.updateMany({ jobTitle: old.label }, { $set: { jobTitle: data.label } }),
            ]);
        }

        revalidatePath("/masters/kpi-metrics");
        revalidatePath("/masters/vendor-categories");
        revalidatePath("/masters/vendors");
        return { success: true, data: JSON.parse(JSON.stringify(master)) };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

/**
 * Delete (soft delete) a master entry
 */
export async function deleteMaster(id: string) {
    await connectToDatabase();
    try {
        await Master.findByIdAndDelete(id);
        revalidatePath("/masters/kpi-metrics");
        revalidatePath("/masters/vendor-categories");
        revalidatePath("/masters/vendors");
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

/**
 * Seed initial masters if they don't exist, checking per-type to avoid blocking new types
 */
export async function seedMasters() {
    await connectToDatabase();

    const seeded: string[] = [];

    // ContactType
    const contactTypeCount = await Master.countDocuments({ type: 'ContactType' });
    if (contactTypeCount === 0) {
        await Master.insertMany([
            { type: "ContactType", label: "Client", value: "Client", order: 1, color: "bg-blue-50 text-blue-700 border-blue-100", isActive: true },
            { type: "ContactType", label: "Vendor", value: "Vendor", order: 2, color: "bg-purple-50 text-purple-700 border-purple-100", isActive: true },
            { type: "ContactType", label: "Lead", value: "Lead", order: 3, color: "bg-orange-50 text-orange-700 border-orange-100", isActive: true },
            { type: "ContactType", label: "Partner", value: "Partner", order: 4, color: "bg-green-50 text-green-700 border-green-100", isActive: true },
            { type: "ContactType", label: "Consultant", value: "Consultant", order: 5, color: "bg-gray-50 text-gray-700 border-gray-100", isActive: true },
        ]);
        seeded.push('ContactType');
    }

    // VendorCategory
    const vendorCategoryCount = await Master.countDocuments({ type: 'VendorCategory' });
    if (vendorCategoryCount === 0) {
        await Master.insertMany([
            { type: "VendorCategory", label: "Manpower", value: "Manpower", order: 1, isActive: true },
            { type: "VendorCategory", label: "Carpenter", value: "Carpenter", order: 2, isActive: true },
            { type: "VendorCategory", label: "Plumbing", value: "Plumbing", order: 3, isActive: true },
            { type: "VendorCategory", label: "Civil Works", value: "Civil Works", order: 4, isActive: true },
            { type: "VendorCategory", label: "Electrical", value: "Electrical", order: 5, isActive: true },
            { type: "VendorCategory", label: "Service Provider", value: "Service Provider", order: 6, isActive: true },
            { type: "VendorCategory", label: "Material Supplier", value: "Material Supplier", order: 7, isActive: true },
        ]);
        seeded.push('VendorCategory');
    }

    // LeadStatus
    const leadStatusCount = await Master.countDocuments({ type: 'LeadStatus' });
    if (leadStatusCount === 0) {
        await Master.insertMany([
            { type: "LeadStatus", label: "New", value: "New", order: 1, color: "bg-blue-50 text-blue-700 border-blue-100", isDefault: true, isActive: true },
            { type: "LeadStatus", label: "Contacted", value: "Contacted", order: 2, color: "bg-amber-50 text-amber-700 border-amber-100", isActive: true },
            { type: "LeadStatus", label: "Qualified", value: "Qualified", order: 3, color: "bg-emerald-50 text-emerald-700 border-emerald-100", isActive: true },
            { type: "LeadStatus", label: "Lost", value: "Lost", order: 4, color: "bg-red-50 text-red-700 border-red-100", isActive: true },
            { type: "LeadStatus", label: "Converted", value: "Converted", order: 5, color: "bg-green-50 text-green-700 border-green-100", isActive: true },
        ]);
        seeded.push('LeadStatus');
    }

    // ContactStatus
    const contactStatusCount = await Master.countDocuments({ type: 'ContactStatus' });
    if (contactStatusCount === 0) {
        await Master.insertMany([
            { type: "ContactStatus", label: "Active", value: "Active", order: 1, color: "bg-emerald-500", isDefault: true, isActive: true },
            { type: "ContactStatus", label: "Inactive", value: "Inactive", order: 2, color: "bg-gray-300", isActive: true },
            { type: "ContactStatus", label: "New", value: "New", order: 3, color: "bg-blue-500", isActive: true },
        ]);
        seeded.push('ContactStatus');
    }

    // JobTitle
    const jobTitleCount = await Master.countDocuments({ type: 'JobTitle' });
    if (jobTitleCount === 0) {
        const jobTitles = [
            'Founder Director', 'MD (Managing Director)', 'Head', 'Director', 'Manager',
            'Supervisor', 'Senior', 'Junior', 'Executive', 'CEO', 'CTO', 'COO',
            'HR Executive', 'Project Manager', 'Site Engineer', 'Accountant', 'Architect',
        ];
        await Master.insertMany(jobTitles.map((label, index) => ({
            type: 'JobTitle',
            label,
            value: label,
            order: index + 1,
            isActive: true,
        })));
        seeded.push('JobTitle');
    }

    // CompanySettings
    const settingsCount = await Master.countDocuments({ type: 'CompanySettings' });
    if (settingsCount === 0) {
        await Master.insertMany([
            { type: 'CompanySettings', label: 'Timezone', value: 'Asia/Kolkata', order: 1, isActive: true, metadata: { description: 'IANA timezone identifier', group: 'General' } },
            { type: 'CompanySettings', label: 'Currency', value: 'INR', order: 2, isActive: true, metadata: { symbol: '₹', description: 'ISO 4217 currency code', group: 'General' } },
            { type: 'CompanySettings', label: 'Date Format', value: 'DD/MM/YYYY', order: 3, isActive: true, metadata: { description: 'Display format for dates', group: 'General' } },
            { type: 'CompanySettings', label: 'Time Format', value: '24h', order: 4, isActive: true, metadata: { description: '12h or 24h clock display', group: 'General' } },
            { type: 'CompanySettings', label: 'Work Start Time', value: '09:00', order: 5, isActive: true, metadata: { description: 'Official office start time (HH:mm)', group: 'Attendance' } },
            { type: 'CompanySettings', label: 'Work End Time', value: '18:00', order: 6, isActive: true, metadata: { description: 'Official office end time (HH:mm)', group: 'Attendance' } },
            { type: 'CompanySettings', label: 'Late Threshold', value: '10:00', order: 7, isActive: true, metadata: { description: 'Punch-in after this time is marked Late (HH:mm)', group: 'Attendance' } },
            { type: 'CompanySettings', label: 'Min Work Hours', value: '8', order: 8, isActive: true, metadata: { description: 'Minimum hours for a full working day', group: 'Attendance' } },
            { type: 'CompanySettings', label: 'Half Day Hours', value: '4', order: 9, isActive: true, metadata: { description: 'Hours threshold for Half-Day status', group: 'Attendance' } },
            { type: 'CompanySettings', label: 'Country', value: 'India', order: 10, isActive: true, metadata: { code: 'IN', group: 'General' } },
            { type: 'CompanySettings', label: 'Financial Year Start', value: 'April', order: 11, isActive: true, metadata: { description: 'Month the financial year begins', group: 'Finance' } },
            { type: 'CompanySettings', label: 'PF Rate', value: '12', order: 12, isActive: true, metadata: { description: 'Employee PF contribution % of basic salary', group: 'Finance' } },
            { type: 'CompanySettings', label: 'PT Applicable', value: 'Yes', order: 13, isActive: true, metadata: { description: 'Whether Professional Tax is applicable', group: 'Finance' } },
        ]);
        seeded.push('CompanySettings');
    }

    if (seeded.length === 0) {
        return { success: true, message: 'Masters already seeded' };
    }

    return { success: true, message: `Seeded: ${seeded.join(', ')}` };
}

export async function getCompanySettings(): Promise<Record<string, string>> {
    await connectToDatabase();
    const settings = await Master.find({ type: 'CompanySettings', isActive: true }).lean();
    return Object.fromEntries(settings.map(s => [s.label, s.value]));
}
