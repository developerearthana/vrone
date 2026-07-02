"use client";

import { TrendingUp, Users, ShoppingBag, CreditCard, ArrowUpRight, ArrowDownRight, BarChart3, LayoutDashboard, Sparkles, AlertTriangle } from 'lucide-react';
import { StatCard } from '@/components/ui/stat-card';
import { useState, useEffect } from 'react';
import { getSalesDashboardData, getAtRiskDeals, getRevenueForecast } from '@/app/actions/sales';
import { toast } from 'sonner';
import { PageWrapper, CardWrapper } from '@/components/ui/page-wrapper';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from 'recharts';
import { cn } from '@/lib/utils';
import { PermissionGuard } from '@/components/auth/PermissionGuard';
import { AtRiskDeals } from '@/components/sales/AtRiskDeals';

export default function SalesDashboard() {
    const [stats, setStats] = useState({
        revenue: 0,
        activeDeals: 0,
        pipelineValue: 0,
        newLeads: 0
    });
    const [recentDeals, setRecentDeals] = useState<any[]>([]);
    const [funnelData, setFunnelData] = useState<any[]>([]);
    const [atRiskDeals, setAtRiskDeals] = useState<any[]>([]);
    const [forecast, setForecast] = useState({ next30: 0, next60: 0, next90: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const res = await getSalesDashboardData();
            if (res.success && res.data) {
                setStats(res.data);
                setRecentDeals(res.data.recentDeals || []);

                // Process Funnel Data for Chart
                // Ensure default stages exist even if count is 0
                const stagesList = ['Qualified', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost'];
                const rawStages = res.data.funnel?.stages || [];

                const processData = stagesList.map(stage => {
                    const found = rawStages.find((s: any) => s._id === stage);
                    return {
                        name: stage,
                        value: found ? found.count : 0,
                        fill: stage === 'Closed Won' ? '#10b981' : stage === 'Closed Lost' ? '#ef4444' : '#3b82f6'
                    };
                });

                // Add Leads at front
                const finalChartData = [
                    { name: 'Leads', value: res.data.funnel?.leads || 0, fill: '#6366f1' },
                    ...processData
                ];

                setFunnelData(finalChartData);
            }

            // Load AI data in parallel
            const [riskRes, forecastRes] = await Promise.all([
                getAtRiskDeals(),
                getRevenueForecast()
            ]);

            if (riskRes.success) setAtRiskDeals(riskRes.data || []);
            if (forecastRes.success) setForecast(forecastRes.data || { next30: 0, next60: 0, next90: 0 });
        } catch (error) {
            toast.error("Failed to load sales data");
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="page-loading">Loading Sales…</div>;

    return (
        <PageWrapper className="space-y-6">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Sales Overview</h1>
                    <p className="page-subtitle">Real-time pipeline performance and revenue tracking.</p>
                </div>
            </div>

            <div className="stat-grid">
                <StatCard index={0} label="Total Revenue" value={`₹${(stats.revenue / 100000).toFixed(2)} L`} sub="Closed won" icon={TrendingUp} iconColor="text-emerald-600" trend="up" />
                <StatCard index={1} label="Active Deals" value={stats.activeDeals} sub="In progress" icon={ShoppingBag} iconColor="text-blue-600" />
                <StatCard index={2} label="Pipeline Value" value={`₹${(stats.pipelineValue / 100000).toFixed(2)} L`} sub="Potential" icon={CreditCard} iconColor="text-primary" />
                <StatCard index={3} label="New Leads" value={stats.newLeads} sub="Top of funnel" icon={Users} iconColor="text-orange-600" />
            </div>

            {/* Main Content */}
            <div className="grid gap-6 md:grid-cols-5">
                {/* Sales Funnel Chart */}
                <CardWrapper delay={0.2} className="glass-card p-6 rounded-2xl col-span-1 md:col-span-3 min-h-[400px]">
                    <div className="mb-6 flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-bold text-foreground">Sales Funnel Visualization</h3>
                            <p className="text-sm text-muted-foreground">Distribution of deals across stages</p>
                        </div>
                        <LayoutDashboard className="w-5 h-5 text-muted-foreground" />
                    </div>

                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={funnelData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                                <Tooltip
                                    cursor={{ fill: '#f8fafc' }}
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={40}>
                                    {funnelData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </CardWrapper>

                {/* Recent Deals List */}
                <CardWrapper delay={0.3} className="glass-card p-0 rounded-2xl col-span-1 md:col-span-2 overflow-hidden flex flex-col">
                    <div className="p-6 border-b border-border bg-card/30">
                        <h3 className="text-lg font-bold text-foreground">Recent Deals</h3>
                        <p className="text-sm text-muted-foreground">Latest activity from your team</p>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-2">
                        {recentDeals.length === 0 && (
                            <div className="text-center py-8 text-gray-500 text-sm">No recent activity</div>
                        )}
                        {recentDeals.map((deal) => (
                            <div key={deal.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-card hover:shadow-sm transition-all border border-transparent hover:border-border group">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-primary font-bold text-xs uppercase">
                                        {deal.client.substring(0, 2)}
                                    </div>
                                    <div>
                                        <p className="font-semibold text-foreground text-sm group-hover:text-primary transition-colors">{deal.client}</p>
                                        <p className="text-xs text-muted-foreground">{deal.date}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-foreground text-sm">₹{deal.value?.toLocaleString()}</p>
                                    <span className={cn(
                                        "text-[10px] px-2 py-0.5 rounded-full font-medium",
                                        deal.stage === 'Closed Won' ? "bg-green-100 text-green-700" :
                                            deal.stage === 'Closed Lost' ? "bg-red-100 text-red-700" :
                                                "bg-blue-100 text-blue-700"
                                    )}>
                                        {deal.stage}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="p-4 border-t border-border bg-card/30">
                        <button className="w-full py-2 text-xs font-bold text-muted-foreground uppercase tracking-wider hover:text-primary transition-colors">
                            View All Activity
                        </button>
                    </div>
                </CardWrapper>
            </div>

            {/* AI Insights Row */}
            <div className="grid gap-6 md:grid-cols-2">
                {/* At-Risk Deals */}
                <AtRiskDeals deals={atRiskDeals} />

                {/* AI Forecast Widget */}
                <CardWrapper delay={0.4} className="glass-card p-6 rounded-2xl">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="p-2 bg-muted rounded-lg">
                            <Sparkles className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <h3 className="font-bold text-foreground">AI Revenue Forecast</h3>
                            <p className="text-xs text-muted-foreground">Projected based on pipeline probability</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        <div className="text-center p-3.5 bg-muted/50 rounded-xl border border-border">
                            <p className="text-xs text-muted-foreground mb-1">Next 30 Days</p>
                            <p className="text-xl font-bold text-foreground tabular-nums">
                                ₹{(forecast.next30 / 100000).toFixed(1)}L
                            </p>
                        </div>
                        <div className="text-center p-3.5 bg-muted/50 rounded-xl border border-border">
                            <p className="text-xs text-muted-foreground mb-1">Next 60 Days</p>
                            <p className="text-xl font-bold text-foreground tabular-nums">
                                ₹{(forecast.next60 / 100000).toFixed(1)}L
                            </p>
                        </div>
                        <div className="text-center p-3.5 bg-muted/50 rounded-xl border border-border">
                            <p className="text-xs text-muted-foreground mb-1">Next 90 Days</p>
                            <p className="text-xl font-bold text-foreground tabular-nums">
                                ₹{(forecast.next90 / 100000).toFixed(1)}L
                            </p>
                        </div>
                    </div>

                    <p className="text-[10px] text-gray-400 text-center mt-4">
                        Forecast updated based on current pipeline stage velocity
                    </p>
                </CardWrapper>
            </div>
        </PageWrapper>
    );
}
