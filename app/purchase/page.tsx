"use client";

import { ShoppingCart, Truck, Clock, IndianRupee, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getDashboardStats, getOrders } from '@/app/actions/purchase';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function PurchaseDashboard() {
    const [stats, setStats] = useState<any>({ openOrders: 0, pendingGrn: 0, overdue: 0, monthlySpend: 0 });
    const [recentOrders, setRecentOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [statsRes, ordersRes] = await Promise.all([getDashboardStats(), getOrders()]);
            if (statsRes.success && statsRes.data) {
                setStats(statsRes.data);
            }
            if (ordersRes.success && ordersRes.data) {
                setRecentOrders(ordersRes.data.slice(0, 5));
            }
        } catch (error) {
            toast.error("Failed to load dashboard data");
        } finally {
            setLoading(false);
        }
    };

    const statCards = [
        { label: "Open Orders", value: stats.openOrders, trend: "Active", isUp: true, icon: ShoppingCart, color: "bg-white", textColor: "text-blue-600", border: "border-border" },
        { label: "Pending GRN", value: stats.pendingGrn, trend: "Needs Action", isUp: false, icon: Truck, color: "bg-white", textColor: "text-orange-600", border: "border-border" },
        { label: "Overdue Delivery", value: stats.overdue, trend: "Delayed", isUp: false, icon: Clock, color: "bg-red-50", textColor: "text-red-600", border: "border-red-100" },
        { label: "Monthly Spend", value: `₹${(stats.monthlySpend / 100000).toFixed(1)} L`, trend: "Current Month", isUp: true, icon: IndianRupee, color: "bg-white", textColor: "text-green-600", border: "border-border" },
    ];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-foreground">Procurement Overview</h1>
                <p className="text-gray-500">Track purchase orders and vendor deliveries.</p>
            </div>

            {/* Stats Grid Standardized */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {statCards.map((stat, idx) => (
                    <div key={idx} className={`glass-card p-5 rounded-xl border ${stat.border} flex flex-col justify-between h-32`}>
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-sm text-gray-500 font-medium">{stat.label}</p>
                                <h3 className="text-2xl font-bold text-foreground mt-1">{stat.value}</h3>
                            </div>
                            <div className={`p-2 rounded-lg ${stat.color}`}>
                                <stat.icon className={`w-5 h-5 ${stat.textColor}`} />
                            </div>
                        </div>
                        <p className="text-xs text-gray-500 flex items-center gap-1">
                            {stat.isUp ? <ArrowUpRight className="w-3 h-3 text-gray-400" /> : <ArrowDownRight className="w-3 h-3 text-red-400" />}
                            {stat.trend}
                        </p>
                    </div>
                ))}
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                {/* Recent Orders List */}
                <div className="lg:col-span-2 glass-card p-6 rounded-xl">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold text-foreground">Recent Purchase Orders</h3>
                        <button className="text-sm text-blue-600 font-medium hover:text-blue-700">View All</button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-gray-100 text-sm text-gray-500">
                                    <th className="pb-3 font-medium">PO Number</th>
                                    <th className="pb-3 font-medium">Vendor</th>
                                    <th className="pb-3 font-medium">Date</th>
                                    <th className="pb-3 font-medium text-right">Items</th>
                                    <th className="pb-3 font-medium text-right">Value</th>
                                    <th className="pb-3 font-medium text-right">Status</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm">
                                {recentOrders.map((order) => (
                                    <tr key={order._id} className="group hover:bg-background transition-colors">
                                        <td className="py-4 font-medium text-blue-600 cursor-pointer">{order.poNumber}</td>
                                        <td className="py-4 font-medium text-foreground">{order.vendor}</td>
                                        <td className="py-4 text-gray-500">{order.date ? format(new Date(order.date), 'MMM d, yyyy') : '—'}</td>
                                        <td className="py-4 text-right text-gray-500">{order.itemsCount}</td>
                                        <td className="py-4 text-right font-medium text-foreground">₹{order.totalValue?.toLocaleString('en-IN')}</td>
                                        <td className="py-4 text-right">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border
                                                ${order.status === 'Sent' ? 'bg-white text-blue-700 border-blue-200' :
                                                    order.status === 'Partially Received' ? 'bg-white text-orange-700 border-orange-200' :
                                                        order.status === 'Overdue' ? 'bg-red-50 text-red-700 border-red-200' :
                                                            'bg-background text-gray-700 border-gray-200'}`}>
                                                {order.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                {recentOrders.length === 0 && !loading && (
                                    <tr>
                                        <td colSpan={6} className="text-center py-6 text-gray-500">No recent orders found.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Pending Actions / Approvals */}
                <div className="glass-card p-6 rounded-xl">
                    <h3 className="text-lg font-bold text-foreground mb-6">Pending Approvals</h3>
                    <div className="space-y-4">
                        {/* Static mock data for now, pending approval workflow logic */}
                        <div className="p-4 rounded-xl border border-gray-100 bg-background/50 hover:bg-white hover:shadow-sm transition-all group">
                            <div className="flex justify-between items-start mb-2">
                                <span className="text-xs font-bold text-purple-600 bg-white px-2 py-0.5 rounded">PO-New</span>
                                <span className="text-xs text-gray-500">2h ago</span>
                            </div>
                            <p className="font-semibold text-foreground text-sm mb-1">Office Supplies Bulk Order</p>
                            <p className="text-xs text-gray-500 mb-3">Requested by: System</p>
                            <div className="flex items-center justify-between">
                                <span className="font-bold text-foreground">₹12,400</span>
                                <button className="text-xs font-medium bg-white text-white px-3 py-1.5 rounded-lg hover:bg-white transition-colors opacity-0 group-hover:opacity-100">Review</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
