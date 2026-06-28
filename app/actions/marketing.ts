"use server";

import { z } from "zod";
import { createJSONAction } from "@/lib/safe-action";
import { marketingService } from "@/services/MarketingService";
import { revalidatePath } from "next/cache";

export const getCampaigns = async () => {
    try {
        const data = await marketingService.getCampaigns();
        return { success: true, data };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

export const getCampaignsSummary = async () => {
    try {
        const data = await marketingService.getCampaignsSummary();
        return { success: true, data };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

const CreateCampaignSchema = z.object({
    name: z.string().min(1, "Name is required"),
    type: z.enum(['Social Media', 'Email', 'PPC', 'Content', 'Offline']),
    budget: z.number().min(0),
    startDate: z.string().optional(),
    status: z.enum(['Active', 'Scheduled', 'Completed', 'Paused']).optional(),
});

export const createCampaign = createJSONAction(CreateCampaignSchema, async (data) => {
    try {
        await marketingService.createCampaign(data);
        revalidatePath("/marketing/campaigns");
        return { success: true };
    } catch (error: any) {
        return { error: error.message || "Failed to create campaign" };
    }
});
