"use client";

import { ClipboardList, AlertCircle, CheckSquare, RotateCw, Plus, Filter, MoreVertical, Download, Printer } from 'lucide-react';
import { StatCard } from '@/components/ui/stat-card';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { WorkOrderCreateModal } from '@/components/work-orders/WorkOrderCreateModal';
import { MOCK_SUBSIDIARIES, MOCK_VENDORS } from '@/lib/mock-data';
import { exportToCSV, handlePrint } from '@/lib/export-utils';
import { getWorkOrders, createWorkOrder } from '@/app/actions/work-orders';
import { getProjects } from '@/app/actions/projects';
import { toast } from 'sonner';

export default function WorkOrdersDashboard() {
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [orders, setOrders] = useState<any[]>([]);
    const [projects, setProjects] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [ordersRes, projectsRes] = await Promise.all([
                getWorkOrders(),
                getProjects()
            ]);

            if (ordersRes.success && ordersRes.data) {
                setOrders(ordersRes.data);
            }
            if (projectsRes.success && projectsRes.data) {
                setProjects(projectsRes.data);
            }
        } catch (error) {
            toast.error("Failed to load data");
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (data: any) => {
        try {
            const res = await createWorkOrder(data);
            if (res.success) {
                toast.success("Work Order Created");
                setShowCreateModal(false);
                loadData();
            } else {
                toast.error(res.error || "Failed decrease to create work order");
            }
        } catch (error) {
            toast.error("An error occurred");
        }
    };

    if (loading) return <div className="page-loading">Loading Work Orders…</div>;

    return (
        <div className="space-y-6">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Work Orders</h1>
                    <p className="text-muted-foreground mt-0.5">Track maintenance, internal work, and vendor contracts.</p>
                </div>
                <div className="page-header-actions">
                    <Button variant="outline" size="sm" onClick={() => exportToCSV(orders, 'work-orders')}>
                        <Download className="w-4 h-4" /> Export
                    </Button>
                    <Button variant="outline" size="sm" onClick={handlePrint}>
                        <Printer className="w-4 h-4" /> Print
                    </Button>
                    <Button variant="outline" size="sm">
                        <Filter className="w-4 h-4" /> Filter
                    </Button>
                    <Button size="sm" onClick={() => setShowCreateModal(true)}>
                        <Plus className="w-4 h-4" /> Create Order
                    </Button>
                </div>
            </div>

            <div className="stat-grid">
                <StatCard index={0} label="Open Orders" value={orders.filter(o => o.status === 'Open').length} sub="Total open" icon={ClipboardList} iconColor="text-blue-600" />
                <StatCard index={1} label="In Progress" value={orders.filter(o => o.status === 'In Progress').length} sub="Assigned" icon={RotateCw} iconColor="text-orange-600" />
                <StatCard index={2} label="Completed" value={orders.filter(o => o.status === 'Completed').length} sub="All time" icon={CheckSquare} iconColor="text-green-600" trend="up" />
                <StatCard index={3} label="High Priority" value={orders.filter(o => o.priority === 'High' || o.priority === 'Critical').length} sub="Needs attention" icon={AlertCircle} iconColor="text-red-600" trend="down" />
            </div>

            {/* List */}
            <div className="glass-card rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-muted/40 text-muted-foreground border-b border-border">
                            <tr>
                                <th className="px-6 py-4 font-medium">WO ID & Title</th>
                                <th className="px-6 py-4 font-medium">Type & Project</th>
                                <th className="px-6 py-4 font-medium">Status</th>
                                <th className="px-6 py-4 font-medium">Assignee</th>
                                <th className="px-6 py-4 font-medium">Cost (Est.)</th>
                                <th className="px-6 py-4 font-medium text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {orders.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                                        No work orders found. Create one to get started.
                                    </td>
                                </tr>
                            )}
                            {orders.map((wo) => (
                                <tr key={wo.id} className="hover:bg-muted/30 transition-colors">
                                    <td className="px-6 py-4">
                                        <div>
                                            <div className="font-semibold text-foreground">{wo.title}</div>
                                            <div className="text-xs text-primary font-medium">{wo.id} • {wo.date}</div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div>
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium mb-1 border border-border
                                                ${wo.type === 'Vendor' ? 'bg-card text-orange-700' : 'bg-card text-blue-700'}`}>
                                                {wo.type === 'Vendor' ? 'Vendor Contract' : 'Internal Work'}
                                            </span>
                                            <div className="text-xs text-muted-foreground">{wo.project}</div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`text-xs font-medium
                                            ${wo.status === 'Completed' ? 'text-green-600' :
                                                wo.status === 'In Progress' ? 'text-blue-600' :
                                                    'text-muted-foreground'}`}>
                                            {wo.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-[10px] text-muted-foreground font-bold">
                                                {wo.assignee?.charAt(0) || '?'}
                                            </div>
                                            <span className="text-foreground">{wo.assignee}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-foreground font-medium">
                                        ₹{wo.cost?.toLocaleString() || 0}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <Button variant="ghost" size="icon-sm" aria-label="Work Order Actions">
                                            <MoreVertical className="w-4 h-4" />
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <WorkOrderCreateModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onSubmit={handleCreate}
                projects={projects}
                subsidiaries={MOCK_SUBSIDIARIES}
                vendors={MOCK_VENDORS}
            />
        </div>
    );
}
