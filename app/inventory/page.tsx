"use client";

import { Package, AlertTriangle, TrendingUp, AlertCircle } from 'lucide-react';
import { PageWrapper, CardWrapper } from '@/components/ui/page-wrapper';
import { StatCard } from '@/components/ui/stat-card';
import { WarehouseLayout } from '@/components/inventory/WarehouseLayout';
import { useState, useEffect } from 'react';
import { getInventoryDashboard } from '@/app/actions/inventory';
import { toast } from 'sonner';

export default function InventoryDashboard() {
    const [stats, setStats] = useState({
        totalProducts: 0,
        lowStockCount: 0,
        outOfStock: 0,
        totalValue: 0
    });
    const [lowStockItems, setLowStockItems] = useState<any[]>([]);
    const [distribution, setDistribution] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const res = await getInventoryDashboard();
            if (res.success && res.data) {
                setStats(res.data.stats);
                setLowStockItems(res.data.lowStockItems);
                setDistribution(res.data.distribution);
            }
        } catch (error) {
            toast.error("Failed to load inventory data");
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="page-loading">Loading Inventory…</div>;

    return (
        <PageWrapper className="space-y-6">
            <div>
                <h1 className="page-title">Inventory Overview</h1>
                <p className="page-subtitle">Manage stock levels, warehouse tracking, and supply chain.</p>
            </div>

            <div className="stat-grid">
                <StatCard index={0} label="Total Products" value={stats.totalProducts.toLocaleString()} sub="Items" icon={Package} iconColor="text-blue-600" />
                <StatCard index={1} label="Low Stock" value={stats.lowStockCount.toLocaleString()} sub="Needs attention" icon={AlertTriangle} iconColor="text-orange-600" trend="down" />
                <StatCard index={2} label="Out of Stock" value={stats.outOfStock.toLocaleString()} sub="Critical" icon={AlertCircle} iconColor="text-red-600" trend="down" />
                <StatCard index={3} label="Total Value" value={`₹${(stats.totalValue / 100000).toFixed(2)} L`} sub="Estimated value" icon={TrendingUp} iconColor="text-green-600" trend="up" />
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                {/* Visual Warehouse Layout */}
                <div className="lg:col-span-3">
                    <CardWrapper delay={0.4}>
                        <WarehouseLayout />
                    </CardWrapper>
                </div>

                {/* Low Stock Alerts */}
                <CardWrapper delay={0.5} className="lg:col-span-2 glass-card p-6 rounded-xl border border-border">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-base font-semibold text-foreground">Low Stock Alerts</h3>
                        <button className="text-sm text-primary font-medium hover:underline">View All</button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-border text-sm text-muted-foreground">
                                    <th className="pb-3 font-medium">Product Name</th>
                                    <th className="pb-3 font-medium">SKU</th>
                                    <th className="pb-3 font-medium">Category</th>
                                    <th className="pb-3 font-medium text-right">Available</th>
                                    <th className="pb-3 font-medium text-right">Min Level</th>
                                    <th className="pb-3 font-medium text-right">Status</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm">
                                {lowStockItems.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="py-4 text-center text-muted-foreground">No low stock items</td>
                                    </tr>
                                )}
                                {lowStockItems.map((item) => (
                                    <tr key={item.id} className="group hover:bg-muted/30 transition-colors">
                                        <td className="py-3 font-medium text-foreground">{item.name}</td>
                                        <td className="py-3 text-muted-foreground">{item.sku}</td>
                                        <td className="py-3 text-muted-foreground">{item.category}</td>
                                        <td className="py-3 text-right font-medium text-red-600">{item.current}</td>
                                        <td className="py-3 text-right text-muted-foreground">{item.min}</td>
                                        <td className="py-3 text-right">
                                            <span className="bg-red-100 text-red-700 text-xs px-2 py-1 rounded-full font-medium">Low</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardWrapper>

                {/* Distribution Summary */}
                <CardWrapper delay={0.6} className="glass-card p-6 rounded-xl border border-border">
                    <h3 className="text-base font-semibold text-foreground mb-4">Distribution</h3>
                    <div className="space-y-3">
                        {distribution.map((dist, idx) => (
                            <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-muted/30">
                                <div className="flex items-center gap-2.5">
                                    <Package className="w-4 h-4 text-primary/60" />
                                    <span className="text-sm font-medium text-foreground">{dist._id}</span>
                                </div>
                                <span className="text-sm font-bold text-foreground tabular-nums">{dist.count}</span>
                            </div>
                        ))}
                        {distribution.length === 0 && <p className="text-sm text-muted-foreground text-center">No products found</p>}
                    </div>
                    <button className="page-btn w-full mt-4 justify-center">
                        Add New Product
                    </button>
                </CardWrapper>
            </div>
        </PageWrapper>
    );
}
