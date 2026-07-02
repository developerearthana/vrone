"use client";

import { PageWrapper } from '@/components/ui/page-wrapper';
import { Search, Filter, ShieldAlert, FileCheck, AlertTriangle, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState, useEffect } from 'react';
import { getAuditLogs, getComplianceStats } from '@/app/actions/audit';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { StatCard } from '@/components/ui/stat-card';

export default function AuditDashboard() {
    const [logs, setLogs] = useState<any[]>([]);
    const [stats, setStats] = useState<any>({ securityAlerts: 0, expiredDocuments: 0, complianceScore: 100 });
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 1 });
    const [filters, setFilters] = useState({ action: "", resource: "" });

    // Detail View
    const [selectedLog, setSelectedLog] = useState<any>(null);

    useEffect(() => {
        loadData();
    }, [pagination.page]); // Reload on page change

    const loadData = async () => {
        setLoading(true);
        const [logsRes, statsRes] = await Promise.all([
            getAuditLogs(filters, pagination.page),
            getComplianceStats()
        ]);

        if (logsRes.success && logsRes.data) {
            setLogs(logsRes.data.logs);
            setPagination(logsRes.data.pagination);
        } else {
            toast.error("Failed to load audit logs");
        }

        if (statsRes.success && statsRes.data) {
            setStats(statsRes.data);
        }
        setLoading(false);
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setPagination({ ...pagination, page: 1 }); // Reset to page 1
        loadData();
    };

    return (
        <PageWrapper>
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900">Compliance & Audit</h1>
                <p className="text-gray-500">System-wide audit trails and security monitoring.</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                {[
                    { label: "Security Alerts (24h)", value: stats.securityAlerts, icon: ShieldAlert, iconColor: "text-red-600" },
                    { label: "Expired Documents", value: stats.expiredDocuments, icon: AlertTriangle, iconColor: "text-amber-600" },
                    { label: "System Compliance Score", value: `${stats.complianceScore}%`, icon: FileCheck, iconColor: "text-emerald-600" },
                ].map((stat, idx) => (
                    <StatCard key={stat.label} index={idx} {...stat} />
                ))}
            </div>

            {/* Logs Table */}
            <div className="space-y-4">
                <div className="glass-card p-4 rounded-xl flex items-center justify-between gap-4">
                    <form onSubmit={handleSearch} className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search actions or resources..."
                            value={filters.action}
                            onChange={(e) => setFilters({ ...filters, action: e.target.value })}
                            className="pl-10 pr-4 py-2 w-full border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm"
                        />
                    </form>
                    {/* Add more filters as needed */}
                </div>

                <div className="glass-card rounded-xl overflow-hidden border border-gray-100">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-background text-gray-500 border-b border-gray-100">
                                <tr>
                                    <th className="px-6 py-4 font-medium">Timestamp</th>
                                    <th className="px-6 py-4 font-medium">User</th>
                                    <th className="px-6 py-4 font-medium">Action</th>
                                    <th className="px-6 py-4 font-medium">Resource</th>
                                    <th className="px-6 py-4 font-medium">Status</th>
                                    <th className="px-6 py-4 font-medium"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {logs.map((log) => (
                                    <tr key={log._id} className="hover:bg-background/50 transition-colors">
                                        <td className="px-6 py-4 text-gray-500 font-mono text-xs">
                                            {(() => {
                                                try {
                                                    const date = new Date(log.timestamp);
                                                    return isNaN(date.getTime()) ? 'Invalid Date' : format(date, 'yyyy-MM-dd HH:mm:ss');
                                                } catch (e) {
                                                    return 'Invalid Date';
                                                }
                                            })()}
                                        </td>
                                        <td className="px-6 py-4 text-gray-900 font-medium">
                                            {log.userName}
                                            <span className="block text-xs text-gray-500 font-normal">{log.userEmail}</span>
                                        </td>
                                        <td className="px-6 py-4 text-gray-700">{log.action}</td>
                                        <td className="px-6 py-4 text-gray-500">{log.resource}</td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold uppercase
                                                ${log.status === 'success' ? 'bg-green-100 text-green-700' :
                                                    log.status === 'failure' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                                {log.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => setSelectedLog(log)}
                                                className="text-blue-600 hover:text-blue-700 p-2 hover:bg-white rounded"
                                                aria-label="View Details"
                                            >
                                                <Eye className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {logs.length === 0 && !loading && (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                            No audit logs found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    {/* Pagination */}
                    <div className="p-4 border-t border-gray-100 flex items-center justify-between">
                        <span className="text-sm text-gray-500">
                            Page {pagination.page} of {pagination.pages}
                        </span>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
                                disabled={pagination.page <= 1}
                                className="p-2 border rounded hover:bg-background disabled:opacity-50"
                                aria-label="Previous Page"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
                                disabled={pagination.page >= pagination.pages}
                                className="p-2 border rounded hover:bg-background disabled:opacity-50"
                                aria-label="Next Page"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Log Details Modal */}
            <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Audit Log Details</DialogTitle>
                    </DialogHeader>
                    {selectedLog && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span className="font-medium text-gray-500 block">User</span>
                                    {selectedLog.userName} ({selectedLog.userEmail})
                                </div>
                                <div>
                                    <span className="font-medium text-gray-500 block">Timestamp</span>
                                    {format(new Date(selectedLog.timestamp), 'PPpp')}
                                </div>
                                <div>
                                    <span className="font-medium text-gray-500 block">Action</span>
                                    {selectedLog.action}
                                </div>
                                <div>
                                    <span className="font-medium text-gray-500 block">Resource</span>
                                    {selectedLog.resource} / {selectedLog.resourceId}
                                </div>
                            </div>
                            <div className="mt-4">
                                <span className="font-medium text-gray-500 block mb-2">Details (JSON)</span>
                                <pre className="bg-background p-4 rounded-lg overflow-x-auto text-xs font-mono">
                                    {JSON.stringify(selectedLog.details, null, 2)}
                                </pre>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </PageWrapper>
    );
}
