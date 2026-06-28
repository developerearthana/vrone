import { BarChart3, TrendingUp, Target, Eye, Megaphone } from 'lucide-react';
import { StatCard } from '@/components/ui/stat-card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { getCampaignsSummary } from '@/app/actions/marketing';

function formatINR(amount: number) {
    if (amount >= 10_00_000) return `₹${(amount / 10_00_000).toFixed(2)} L`;
    if (amount >= 1_000) return `₹${(amount / 1_000).toFixed(1)}K`;
    return `₹${amount.toLocaleString('en-IN')}`;
}

function formatReach(n: number) {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return n.toString();
}

const STATUS_COLORS: Record<string, string> = {
    Active: 'bg-green-100 text-green-700',
    Scheduled: 'bg-blue-100 text-blue-700',
    Completed: 'bg-muted text-muted-foreground',
    Paused: 'bg-yellow-100 text-yellow-700',
};

export default async function MarketingDashboard() {
    const result = await getCampaignsSummary();
    const summary = result.success ? result.data! : null;

    if (!summary) {
        return (
            <div className="space-y-5">
                <div className="page-header">
                    <h1 className="page-title">Marketing Overview</h1>
                </div>
                <div className="glass-card p-10 rounded-xl text-center text-muted-foreground">
                    <p>Failed to load marketing data.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-5">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Marketing Overview</h1>
                    <p className="page-subtitle">Campaigns, budget and performance at a glance.</p>
                </div>
                <Button asChild size="sm">
                    <Link href="/marketing/campaigns">Manage Campaigns</Link>
                </Button>
            </div>

            <div className="stat-grid">
                <StatCard
                    label="Total Budget"
                    value={formatINR(summary.totalBudget)}
                    sub={summary.totalBudget > 0 ? `${formatINR(summary.totalSpent)} spent` : 'No budget set'}
                    icon={BarChart3}
                    iconColor="text-blue-600"
                />
                <StatCard
                    label="Active Campaigns"
                    value={summary.activeCampaigns.toString()}
                    sub={summary.endingSoon > 0 ? `${summary.endingSoon} ending this week` : 'None ending soon'}
                    icon={Target}
                    iconColor="text-primary"
                />
                <StatCard
                    label="Total Reach"
                    value={formatReach(summary.totalImpressions)}
                    sub="Total impressions"
                    icon={Eye}
                    iconColor="text-orange-600"
                />
                <StatCard
                    label="Avg. ROI"
                    value={summary.avgRoi > 0 ? `${summary.avgRoi}x` : '—'}
                    sub="Across all campaigns"
                    icon={TrendingUp}
                    iconColor="text-green-600"
                />
            </div>

            <div className="grid gap-5 lg:grid-cols-3">
                <div className="lg:col-span-2 glass-card p-5 rounded-xl">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-base font-semibold text-foreground">Recent Campaigns</h3>
                        <Button asChild variant="ghost" size="sm" className="text-xs">
                            <Link href="/marketing/campaigns">View All</Link>
                        </Button>
                    </div>

                    {summary.recentCampaigns.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
                            <Megaphone className="w-8 h-8 mb-2 opacity-30" />
                            <p className="text-sm">No campaigns yet</p>
                            <Button asChild size="sm" className="mt-3">
                                <Link href="/marketing/campaigns">Create first campaign</Link>
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {summary.recentCampaigns.map((c: any) => (
                                <div key={c.id} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-primary/10 text-primary">
                                            <Megaphone className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-sm text-foreground">{c.name}</p>
                                            <p className="text-xs text-muted-foreground">{c.type}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-sm text-muted-foreground tabular-nums">{formatINR(c.budget)}</span>
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[c.status] ?? 'bg-muted text-muted-foreground'}`}>
                                            {c.status}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="glass-card p-5 rounded-xl">
                    <h3 className="text-base font-semibold text-foreground mb-4">Budget by Type</h3>

                    {summary.budgetAllocation.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                            <p className="text-sm">No budget data</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {summary.budgetAllocation.map((item: any) => (
                                <div key={item.type} className="space-y-1">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">{item.type}</span>
                                        <span className="font-medium text-foreground">{item.pct}%</span>
                                    </div>
                                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-primary rounded-full transition-all"
                                            style={{ width: `${item.pct}%` }}
                                        />
                                    </div>
                                    <p className="text-xs text-muted-foreground">{formatINR(item.budget)}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
