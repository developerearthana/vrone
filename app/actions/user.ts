"use server";

import connectToDatabase from "@/lib/db";
import User, { IUser } from "@/models/User";
import { z } from "zod";
import { createJSONAction } from "@/lib/safe-action";
import { revalidatePath } from "next/cache";

export async function getDashboardUsers() {
    await connectToDatabase();

    const users = await User.find({})
        .select('name image role email')
        .lean();

    const grouped = {
        admins: [] as any[],
        managers: [] as any[],
        staff: [] as any[],
        vendors: [] as any[],
        clients: [] as any[]
    };

    users.forEach((user: any) => {
        const u = {
            id: user._id.toString(),
            name: user.name,
            image: user.image,
            email: user.email
        };

        switch (user.role) {
            case 'super-admin':
            case 'admin':
                grouped.admins.push(u);
                break;
            case 'manager':
                grouped.managers.push(u);
                break;
            case 'staff':
            case 'user': // Assuming 'user' is general staff
                grouped.staff.push(u);
                break;
            case 'vendor':
                grouped.vendors.push(u);
                break;
            case 'customer':
                grouped.clients.push(u);
                break;
        }
    });

    return grouped;
}

export async function getAllUsers() {
    try {
        await connectToDatabase();
        const users = await User.find({})
            .select('name role dept image jobTitle email companyEmails status phone')
            .sort({ name: 1 })
            .lean();
        return JSON.parse(JSON.stringify(users));
    } catch {
        return [];
    }
}

import bcrypt from "bcryptjs";

// ... CRUD Actions ...

const UserSchema = z.object({
    id: z.string().optional(),
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Invalid email address"),
    companyEmails: z.array(z.string().email()).optional().default([]),
    role: z.string().min(1, "Role is required"),
    dept: z.string().optional(),
    phone: z.string().optional(),
    jobTitle: z.string().optional(),
    status: z.enum(['Active', 'Inactive', 'On Leave']).default('Active'),
    password: z.string().optional().or(z.literal('')),
    customRole: z.string().optional(),
    image: z.string().optional(),
});


export const createUser = createJSONAction(UserSchema, async (data) => {
    await connectToDatabase();

    const existing = await User.findOne({ email: data.email });
    if (existing) throw new Error("Email already exists");

    const rawPassword = data.password || 'password123';
    const hashedPassword = await bcrypt.hash(rawPassword, 10);

    const newUser = await User.create({
        name: data.name,
        email: data.email,
        companyEmails: data.companyEmails || [],
        password: hashedPassword,
        role: data.role,
        dept: data.dept || '',
        jobTitle: data.jobTitle,
        status: data.status,
        provider: 'credentials',
        customRole: data.customRole || undefined,
        image: data.image || undefined,
    });

    revalidatePath("/masters/users");
    return { success: true, user: JSON.parse(JSON.stringify(newUser)) };
});

export const updateUser = createJSONAction(UserSchema, async (data) => {
    await connectToDatabase();
    if (!data.id) throw new Error("ID required for update");

    const updateData: any = {
        name: data.name,
        email: data.email,
        companyEmails: data.companyEmails || [],
        role: data.role,
        dept: data.dept || '',
        phone: data.phone,
        jobTitle: data.jobTitle,
        status: data.status,
        customRole: data.customRole || undefined,
    };
    if (data.image !== undefined) updateData.image = data.image;
    if (data.password) {
        updateData.password = await bcrypt.hash(data.password, 10);
    }

    const user = await User.findByIdAndUpdate(data.id, updateData, { new: true });
    revalidatePath("/masters/users");
    revalidatePath("/hrm/employees");
    return { success: true, user: JSON.parse(JSON.stringify(user)) };
});

export const deleteUser = createJSONAction(z.object({ id: z.string() }), async (data) => {
    await connectToDatabase();
    if (!data.id) throw new Error("ID required for deletion");
    await User.findByIdAndDelete(data.id);
    revalidatePath("/masters/users");
    return { success: true };
});

export const toggleUserStatus = async (id: string, currentStatus: string) => {
    await connectToDatabase();
    const newStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';
    await User.findByIdAndUpdate(id, { status: newStatus });
    revalidatePath("/masters/users");
    return { success: true, status: newStatus };
};
