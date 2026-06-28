import connectToDatabase from '@/lib/db';
import Campaign from '@/models/Campaign';
import { sanitizeObject } from '@/lib/sanitize';

export class MarketingService {
    async getCampaigns() {
        await connectToDatabase();
        const campaigns = await Campaign.find({}).sort({ startDate: -1 }).lean();
        return JSON.parse(JSON.stringify(campaigns)).map((c: any) => ({
            id: c._id.toString(),
            name: c.name,
            type: c.type,
            status: c.status,
            budget: `₹${c.budget.toLocaleString('en-IN')}`,
            spent: `₹${c.spent.toLocaleString('en-IN')}`,
            roi: `${c.metrics?.roi || 0}%`,
            clicks: c.metrics?.clicks ? (c.metrics.clicks > 1000 ? `${(c.metrics.clicks / 1000).toFixed(1)}k` : c.metrics.clicks) : '-'
        }));
    }

    async getCampaignsSummary() {
        await connectToDatabase();
        const campaigns = await Campaign.find({}).lean();

        const totalBudget = campaigns.reduce((s, c) => s + (c.budget || 0), 0);
        const totalSpent = campaigns.reduce((s, c) => s + (c.spent || 0), 0);
        const activeCampaigns = campaigns.filter(c => c.status === 'Active');
        const endingSoon = activeCampaigns.filter(c => {
            if (!c.endDate) return false;
            const days = (new Date(c.endDate).getTime() - Date.now()) / 86400000;
            return days >= 0 && days <= 7;
        }).length;
        const totalImpressions = campaigns.reduce((s, c) => s + (c.metrics?.impressions || 0), 0);
        const roiValues = campaigns.filter(c => (c.metrics?.roi || 0) > 0).map(c => c.metrics!.roi!);
        const avgRoi = roiValues.length > 0 ? roiValues.reduce((s, v) => s + v, 0) / roiValues.length : 0;

        // Budget by campaign type
        const byType: Record<string, number> = {};
        for (const c of campaigns) {
            byType[c.type] = (byType[c.type] || 0) + (c.budget || 0);
        }
        const budgetAllocation = Object.entries(byType).map(([type, budget]) => ({
            type,
            budget,
            pct: totalBudget > 0 ? Math.round((budget / totalBudget) * 100) : 0,
        })).sort((a, b) => b.budget - a.budget);

        return {
            totalBudget,
            totalSpent,
            activeCampaigns: activeCampaigns.length,
            endingSoon,
            totalImpressions,
            avgRoi: parseFloat(avgRoi.toFixed(1)),
            budgetAllocation,
            recentCampaigns: JSON.parse(JSON.stringify(campaigns))
                .sort((a: any, b: any) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
                .slice(0, 5)
                .map((c: any) => ({
                    id: c._id.toString(),
                    name: c.name,
                    type: c.type,
                    status: c.status,
                    budget: c.budget,
                    spent: c.spent,
                })),
        };
    }

    async createCampaign(data: any) {
        await connectToDatabase();
        const sanitized = sanitizeObject(data);
        const campaign = await Campaign.create(sanitized);
        return JSON.parse(JSON.stringify(campaign));
    }
}

export const marketingService = new MarketingService();
