"use server";

import { z } from "zod";
import { createJSONAction } from "@/lib/safe-action";
import connectToDatabase from "@/lib/db";
import FiscalYear from "@/models/FiscalYear";
import { revalidatePath } from "next/cache";
import { fiscalYearService } from "@/services/FiscalYearService";
import { auth } from "@/auth";

// --- VALIDATION ---
const FiscalYearSchema = z.object({
    name: z.string().min(1, "Name is required (e.g. FY 2024-25)"),
    startDate: z.string(), // YYYY-MM-DD
    endDate: z.string(),
    isCurrent: z.boolean().default(false),
});

// --- ACTIONS ---

export const createFiscalYear = createJSONAction(FiscalYearSchema, async (data) => {
    const session = await auth();
    const userId = session?.user?.id;

    try {
        const newFY = await fiscalYearService.createFiscalYear(
            {
                name: data.name,
                startDate: new Date(data.startDate),
                endDate: new Date(data.endDate),
                isCurrent: data.isCurrent,
            },
            userId
        );

        revalidatePath("/accounts/settings");
        return { success: true, data: newFY };
    } catch (error: any) {
        return { error: error.message || "Failed to create Fiscal Year" };
    }
});

export const getFiscalYears = async () => {
    try {
        await connectToDatabase();
        const years = await FiscalYear.find({}).sort({ startDate: -1 }).lean();
        return JSON.parse(JSON.stringify(years));
    } catch {
        return [];
    }
};

export const setCurrentFiscalYear = createJSONAction(z.object({ id: z.string() }), async ({ id }) => {
    const session = await auth();
    const userId = session?.user?.id;

    try {
        await fiscalYearService.setCurrentFiscalYear(id, userId);
        revalidatePath("/accounts/settings");
        return { success: true };
    } catch (error: any) {
        return { error: error.message || "Failed to set active year" };
    }
});

export const closeFiscalYear = createJSONAction(z.object({ id: z.string() }), async ({ id }) => {
    const session = await auth();
    const userId = session?.user?.id;

    try {
        const result = await fiscalYearService.closeFiscalYear(id, userId);
        revalidatePath("/accounts/settings");
        return { success: true, message: result.message };
    } catch (error: any) {
        return { error: error.message || "Failed to close year" };
    }
});
