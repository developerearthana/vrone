"use client";

import { PageWrapper } from '@/components/ui/page-wrapper';
import { Plus, Search, Filter, MoreHorizontal, FileText, Eye, Download } from 'lucide-react';
import { useState, useEffect } from 'react';
import { getOrders } from '@/app/actions/purchase';
import { CreatePOModal } from '@/components/purchase/CreatePOModal';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function PurchaseOrdersPage() {
    const [orders, setOrders] = useState<any[]>([]);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState("All");
    const [search, setSearch] = useState("");

    useEffect(() => {
        loadOrders();
    }, [filterStatus, search]); // Reload on filter or search change

    const loadOrders = async () => {
        setLoading(true);
        const res = await getOrders({ status: filterStatus === "All" ? undefined : filterStatus, search: search || undefined });
        if (res.success && res.data) {
            setOrders(res.data);
        } else {
            toast.error("Failed to load orders");
        }
        setLoading(false);
    };

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        loadOrders();
    };

    return (
        <PageWrapper>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Purchase Orders</h1>
                    <p className="text-gray-500">Manage and track your procurement orders.</p>
                </div>
                <button
                    onClick={() => setIsCreateOpen(true)}
                    className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-xl hover:brightness-[1.08] shadow-lg shadow-primary/20 transition-all font-medium"
                >
                    <Plus className="w-4 h-4" />
                    Create Purchase Order
                </button>
            </div>

            {/* Filters */}
            <div className="glass-card p-4 rounded-xl mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
                <form onSubmit={handleSearchSubmit} className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search PO Number or Vendor..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-10 pr-4 py-2 w-full border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm bg-white"
                    />
                </form>
                <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
                    {['All', 'Draft', 'Sent', 'Partially Received', 'Completed', 'Overdue'].map((status) => (
                        <button
                            key={status}
                            onClick={() => setFilterStatus(status)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors
                                ${filterStatus === status
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-background'}`}
                        >
                            {status}
                        </button>
                    ))}
                </div>
            </div>

            {/* Orders List */}
            <div className="glass-card rounded-xl overflow-hidden border border-gray-100">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-background text-gray-500 border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4 font-medium">PO Number</th>
                                <th className="px-6 py-4 font-medium">Vendor</th>
                                <th className="px-6 py-4 font-medium">Date</th>
                                <th className="px-6 py-4 font-medium text-right">Items</th>
                                <th className="px-6 py-4 font-medium text-right">Total Value</th>
                                <th className="px-6 py-4 font-medium text-center">Status</th>
                                <th className="px-6 py-4 font-medium"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {orders.length === 0 && !loading && (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                                        No purchase orders found.
                                    </td>
                                </tr>
                            )}
                            {orders.map((po) => (
                                <tr key={po._id} className="group hover:bg-background transition-colors">
                                    <td className="px-6 py-4 font-medium text-blue-600">{po.poNumber}</td>
                                    <td className="px-6 py-4 font-medium text-gray-900">{po.vendor}</td>
                                    <td className="px-6 py-4 text-gray-500">{format(new Date(po.date), 'MMM d, yyyy')}</td>
                                    <td className="px-6 py-4 text-right text-gray-500">{po.items?.length || 0}</td>
                                    <td className="px-6 py-4 text-right font-medium text-gray-900">₹{po.totalValue?.toLocaleString('en-IN')}</td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                                            ${po.status === 'Completed' ? 'bg-green-100 text-green-800' :
                                                po.status === 'Draft' ? 'bg-white text-gray-800' :
                                                    po.status === 'Overdue' ? 'bg-red-100 text-red-800' :
                                                        'bg-blue-100 text-blue-800'}`}>
                                            {po.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button className="p-1.5 text-muted-foreground hover:text-primary hover:bg-muted rounded-lg transition-colors" title="View Details">
                                                <Eye className="w-4 h-4" />
                                            </button>
                                            <button className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors" title="Download PDF">
                                                <Download className="w-4 h-4" />
                                            </button>
                                            <button aria-label="More Actions" className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors">
                                                <MoreHorizontal className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </PageWrapper>
    );
}
