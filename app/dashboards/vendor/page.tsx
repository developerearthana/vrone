"use client";

import { Truck, FileText, Package, IndianRupee, Loader2, ChevronRight } from 'lucide-react';
import { getVendorStats, getOrders } from '@/app/actions/purchase';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import Link from 'next/link';
import { format } from 'date-fns';

export default function VendorDashboard() {
    const { data: session } = useSession();
    const vendorName = session?.user?.name || 'Vendor';
    const firstName = vendorName.split(' ')[0];

    const [stats, setStats] = useState<any>({ activeContracts: 0, pendingOrders: 0, pendingValue: 0, performance: 0 });
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!vendorName) return;
        const load = async () => {
            const [statsRes, ordersRes] = await Promise.all([
                getVendorStats(vendorName),
                getOrders({ vendor: vendorName, limit: 5 }),
            ]);
            if (statsRes.success && statsRes.data) setStats(statsRes.data);
            else toast.error('Failed to load vendor stats');
            if (ordersRes.success) setOrders(ordersRes.data || []);
            setLoading(false);
        };
        load();
    }, [vendorName]);

    const statCards = [
        { label: 'Active Contracts', value: stats.activeContracts, icon: FileText, color: 'bg-sky-50 text-sky-600' },
        { label: 'Pending Orders', value: stats.pendingOrders, icon: Package, color: 'bg-amber-50 text-amber-600' },
        { label: 'Pending Value', value: `₹${((stats.pendingValue || 0) / 100000).toFixed(1)}L`, icon: IndianRupee, color: 'bg-emerald-50 text-emerald-600' },
        { label: 'Performance', value: `${stats.performance ?? 0}%`, icon: Truck, color: 'bg-primary/8 text-primary' },
    ];

    const statusColor = (s: string) =>
        s === 'Delivered' ? 'text-emerald-600 bg-emerald-50' :
        s === 'Pending' ? 'text-amber-600 bg-amber-50' :
        s === 'Approved' ? 'text-sky-600 bg-sky-50' :
        'text-muted-foreground bg-muted';

    return (
        <div className="space-y-5">
            <div className="bg-card border border-border rounded-xl p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                    <h1 className="text-xl font-bold text-foreground">Vendor Portal — {firstName}</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">Manage your orders, deliveries and supply chain.</p>
                </div>
                <Link
                    href="/purchase/orders"
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm shadow-primary/20 w-fit"
                >
                    <Package className="w-4 h-4" /> View Orders
                </Link>
            </div>

            {loading ? (
                <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
            ) : (
                <>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {statCards.map(({ label, value, icon: Icon, color }) => (
                            <div key={label} className="bg-card border border-border rounded-xl p-5">
                                <div className="flex items-center justify-between mb-3">
                                    <p className="text-xs font-medium text-muted-foreground">{label}</p>
                                    <div className={`p-2 rounded-lg ${color}`}><Icon className="w-4 h-4" /></div>
                                </div>
                                <p className="text-2xl font-bold text-foreground">{value}</p>
                            </div>
                        ))}
                    </div>

                    <div className="grid md:grid-cols-2 gap-5">
                        <div className="bg-card border border-border rounded-xl overflow-hidden">
                            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                                <h3 className="font-bold text-foreground">Recent Purchase Orders</h3>
                                <Link href="/purchase/orders" className="text-xs text-primary font-semibold flex items-center gap-0.5 hover:underline">
                                    View all <ChevronRight className="w-3.5 h-3.5" />
                                </Link>
                            </div>
                            {orders.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                                    <Package className="w-8 h-8 mb-2 opacity-30" />
                                    <p className="text-sm">No recent orders</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-border">
                                    {orders.map((o: any) => (
                                        <div key={o._id} className="px-5 py-3 flex items-center justify-between gap-4 hover:bg-muted/20 transition-colors">
                                            <div className="min-w-0">
                                                <p className="text-sm font-semibold text-foreground truncate">{o.orderNumber || o._id?.slice(-6)}</p>
                                                <p className="text-xs text-muted-foreground mt-0.5">
                                                    {o.createdAt ? format(new Date(o.createdAt), 'dd MMM yyyy') : '—'}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-3 shrink-0">
                                                <p className="text-sm font-bold text-foreground">₹{((o.totalAmount || 0) / 1000).toFixed(1)}K</p>
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusColor(o.status)}`}>
                                                    {o.status}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="bg-card border border-border rounded-xl overflow-hidden">
                            <div className="px-5 py-4 border-b border-border">
                                <h3 className="font-bold text-foreground">Upcoming Deliveries</h3>
                            </div>
                            {orders.filter((o: any) => o.status === 'Approved' || o.status === 'Pending').length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                                    <Truck className="w-8 h-8 mb-2 opacity-30" />
                                    <p className="text-sm">No pending deliveries</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-border">
                                    {orders.filter((o: any) => o.status === 'Approved' || o.status === 'Pending').map((o: any) => (
                                        <div key={o._id} className="px-5 py-3 flex items-start gap-3 hover:bg-muted/20 transition-colors">
                                            <div className="p-2 bg-primary/8 rounded-lg shrink-0">
                                                <Truck className="w-4 h-4 text-primary" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-semibold text-foreground">{o.orderNumber || `PO-${o._id?.slice(-6)}`}</p>
                                                <p className="text-xs text-muted-foreground mt-0.5">{o.items?.length ?? 0} items · ₹{((o.totalAmount || 0) / 1000).toFixed(1)}K</p>
                                            </div>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ml-auto shrink-0 ${statusColor(o.status)}`}>
                                                {o.status}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
