"use server";

import connectToDatabase from "@/lib/db";
import Employee from "@/models/Employee";
import User from "@/models/User";
import { revalidatePath } from "next/cache";

function deriveInitial(name: string, explicit?: string): string | undefined {
    if (explicit?.trim()) return explicit.trim();
    const words = name.trim().split(/\s+/);
    if (words.length < 2) return undefined;
    const first = words[0];
    // South-Indian format: single-letter first word is the initial (e.g. "P Dhanakotti")
    if (first.replace(/\./g, '').length === 1) return first.replace(/\./g, '').toUpperCase();
    // Otherwise: last word's first letter is the initial
    return words[words.length - 1].charAt(0).toUpperCase();
}

export async function getEmployees() {
    try {
        await connectToDatabase();
        const employees = await Employee.find({})
            .sort({ name: 1 })
            .lean();
        return JSON.parse(JSON.stringify(employees));
    } catch (error: any) {
        console.error("getEmployees error:", error);
        return [];
    }
}

export interface CreateEmployeeData {
    // Personal Info
    image?: string;
    initial?: string;
    jobTitle?: string;
    dept?: string;
    employeeId?: string;
    name: string;
    email?: string;
    phone?: string;
    fatherName?: string;
    alternatePhone?: string;
    address?: string;
    dateOfBirth?: string;
    gender?: string;
    bloodGroup?: string;
    maritalStatus?: string;
    // Employment Details
    reportingManager?: string;
    probationEndDate?: string;
    noticePeriod?: number;
    // Banking Details
    accountType?: string;
    accountHolderName?: string;
    bankName?: string;
    accountNumber?: string;
    upiId?: string;
    ifscCode?: string;
    bankBranch?: string;
    // Status
    status?: string;
}

export async function createEmployee(data: CreateEmployeeData) {
    try {
        await connectToDatabase();

        const employee = await Employee.create({
            name: data.name,
            initial: data.initial || undefined,
            employeeId: data.employeeId || undefined,
            email: data.email || undefined,
            jobTitle: data.jobTitle || undefined,
            dept: data.dept || 'General',
            phone: data.phone || undefined,
            fatherName: data.fatherName || undefined,
            alternatePhone: data.alternatePhone || undefined,
            address: data.address || undefined,
            dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
            gender: data.gender || undefined,
            bloodGroup: data.bloodGroup || undefined,
            maritalStatus: data.maritalStatus || undefined,
            image: data.image || undefined,
            status: data.status || 'Active',
            reportingManager: data.reportingManager || undefined,
            probationEndDate: data.probationEndDate ? new Date(data.probationEndDate) : undefined,
            noticePeriod: data.noticePeriod || undefined,
            bankDetails: (data.bankName || data.accountNumber || data.accountHolderName || data.upiId) ? {
                accountType: data.accountType || undefined,
                accountHolderName: data.accountHolderName || undefined,
                bankName: data.bankName || undefined,
                accountNumber: data.accountNumber || undefined,
                upiId: data.upiId || undefined,
                ifscCode: data.ifscCode || undefined,
                bankBranch: data.bankBranch || undefined,
            } : undefined,
        });

        // Sync image, name, initial to the linked User account (matched by email)
        if (data.email) {
            const initial = deriveInitial(data.name, data.initial);
            const userSync: any = { name: data.name };
            if (data.image) userSync.image = data.image;
            if (initial) userSync.initial = initial;
            await User.findOneAndUpdate({ email: data.email }, { $set: userSync });
        }

        revalidatePath("/hrm/employees");
        return { success: true, data: JSON.parse(JSON.stringify(employee)) };
    } catch (error: any) {
        console.error("createEmployee error:", error);
        return { success: false, error: error.message || "Failed to create employee" };
    }
}

export async function updateEmployee(id: string, data: CreateEmployeeData) {
    try {
        await connectToDatabase();

        const updateData: any = {
            name: data.name,
            initial: data.initial || undefined,
            employeeId: data.employeeId || undefined,
            email: data.email || undefined,
            jobTitle: data.jobTitle || undefined,
            dept: data.dept || 'General',
            phone: data.phone || undefined,
            fatherName: data.fatherName || undefined,
            alternatePhone: data.alternatePhone || undefined,
            address: data.address || undefined,
            dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
            gender: data.gender || undefined,
            bloodGroup: data.bloodGroup || undefined,
            maritalStatus: data.maritalStatus || undefined,
            image: data.image || undefined,
            status: data.status || 'Active',
            reportingManager: data.reportingManager || undefined,
            probationEndDate: data.probationEndDate ? new Date(data.probationEndDate) : undefined,
            noticePeriod: data.noticePeriod || undefined,
            bankDetails: (data.bankName || data.accountNumber || data.accountHolderName || data.upiId) ? {
                accountType: data.accountType || undefined,
                accountHolderName: data.accountHolderName || undefined,
                bankName: data.bankName || undefined,
                accountNumber: data.accountNumber || undefined,
                upiId: data.upiId || undefined,
                ifscCode: data.ifscCode || undefined,
                bankBranch: data.bankBranch || undefined,
            } : undefined,
        };

        const employee = await Employee.findByIdAndUpdate(id, updateData, { new: true });
        if (!employee) return { success: false, error: "Employee not found" };

        // Sync image, name, initial to the linked User account (matched by email)
        const emailToSync = data.email || (employee as any).email;
        if (emailToSync) {
            const initial = deriveInitial(data.name, data.initial);
            const userSync: any = { name: data.name };
            if (data.image) userSync.image = data.image;
            if (initial !== undefined) userSync.initial = initial;
            await User.findOneAndUpdate({ email: emailToSync }, { $set: userSync });
        }

        revalidatePath("/hrm/employees");
        return { success: true, data: JSON.parse(JSON.stringify(employee)) };
    } catch (error: any) {
        console.error("updateEmployee error:", error);
        return { success: false, error: error.message || "Failed to update employee" };
    }
}

export async function deleteEmployee(id: string) {
    try {
        await connectToDatabase();
        await Employee.findByIdAndDelete(id);
        revalidatePath("/hrm/employees");
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message || "Failed to delete employee" };
    }
}

export async function toggleEmployeeStatus(id: string, currentStatus: string) {
    try {
        await connectToDatabase();
        const newStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';
        await Employee.findByIdAndUpdate(id, { status: newStatus });
        revalidatePath("/hrm/employees");
        return { success: true, status: newStatus };
    } catch (error: any) {
        return { success: false, error: error.message || "Failed to update status" };
    }
}
