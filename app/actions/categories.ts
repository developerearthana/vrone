"use server";

import ExpenseCategory from "@/models/ExpenseCategory";
import connectToDatabase from "@/lib/db";
import { revalidatePath } from "next/cache";
import { sanitizeObject } from "@/lib/sanitize";

export async function getCategories() {
    try {
        await connectToDatabase();
        const categories = await ExpenseCategory.find({}).sort({ name: 1 }).lean();
        return JSON.parse(JSON.stringify(categories));
    } catch {
        return [];
    }
}

export async function createCategory(data: any) {
    await connectToDatabase();
    try {
        const sanitized = sanitizeObject(data);
        const category = await ExpenseCategory.create(sanitized);
        revalidatePath("/accounts/settings/categories");
        return { success: true, data: JSON.parse(JSON.stringify(category)) };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function updateCategory(data: any) {
    await connectToDatabase();
    try {
        const { id, ...updateData } = data;
        if (!id) throw new Error("ID required");

        const sanitized = sanitizeObject(updateData);
        const category = await ExpenseCategory.findByIdAndUpdate(id, sanitized, { new: true });
        revalidatePath("/accounts/settings/categories");
        return { success: true, data: JSON.parse(JSON.stringify(category)) };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function deleteCategory(data: { id: string }) {
    await connectToDatabase();
    try {
        await ExpenseCategory.findByIdAndDelete(data.id);
        revalidatePath("/accounts/settings/categories");
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
