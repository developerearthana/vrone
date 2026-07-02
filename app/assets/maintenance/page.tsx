"use client";

import { Wrench, CheckCircle, Clock, AlertTriangle, Plus } from 'lucide-react';

export default function MaintenancePage() {
    const records = [
        { id: 1, asset: "Canon ImageRunner", issue: "Paper Jam / Roller replacement", priority: "High", requestedBy: "Admin", date: "Today", status: "In Progress" },
        { id: 2, asset: "Dell Latitude 5420", issue: "Battery not charging", priority: "Medium", requestedBy: "Rajesh K.", date: "Yesterday", status: "Scheduled" },
        { id: 3, asset: "Office AC - Server Room", issue: "Annual Servicing", priority: "Critical", requestedBy: "System", date: "22 Mar 2024", status: "Completed" },
    ];

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Maintenance</h1>
                    <p className="text-gray-500">Track repairs and scheduled servicing.</p>
                </div>
                <button className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:brightness-[1.08] transition-colors shadow-sm">
                    <Plus className="w-4 h-4" />
                    Report Issue
                </button>
            </div>

            <div className="grid gap-4">
                {records.map((record) => (
                    <div key={record.id} className="glass-card p-6 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 group hover:shadow-md transition-shadow">
                        <div className="flex items-start gap-4">
                            <div className={`p-3 rounded-xl flex-shrink-0
                                ${record.priority === 'Critical' ? 'bg-red-100 text-red-600' :
                                    record.priority === 'High' ? 'bg-orange-100 text-orange-600' :
                                        'bg-blue-100 text-blue-600'}`}>
                                <Wrench className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">{record.issue}</h3>
                                <p className="text-sm text-gray-500 font-medium">{record.asset}</p>
                                <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                                    <span>Req: {record.requestedBy}</span>
                                    <span>•</span>
                                    <span>{record.date}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end border-t md:border-0 border-gray-100 pt-4 md:pt-0">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide
                                ${record.status === 'Completed' ? 'bg-green-100 text-green-700' :
                                    record.status === 'In Progress' ? 'bg-blue-100 text-blue-700' :
                                        'bg-white text-gray-700'}`}>
                                {record.status}
                            </span>

                            {record.status !== 'Completed' && (
                                <button className="text-sm font-medium text-blue-600 hover:underline">
                                    Update Status
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
