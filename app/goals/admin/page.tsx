"use client";

import { useEffect, useState } from 'react';
import { getKPIEntries } from '@/app/actions/kpi';
import { ChevronDown, ChevronRight, User, BarChart, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils'; // Assuming this exists, or I will use utility class

export default function AdminKPIDashboard() {
    const [entries, setEntries] = useState<any[]>([]);
    const [viewMode, setViewMode] = useState<'KPI' | 'Staff'>('KPI');
    const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});

    useEffect(() => {
        const fetchEntries = async () => {
            const res = await getKPIEntries();
            if (res?.success) setEntries(res.data);
        };
        fetchEntries();
    }, []);

    const toggleExpand = (key: string) => {
        setExpandedItems(prev => ({ ...prev, [key]: !prev[key] }));
    };

    // Grouping Logic
    const groupedData = entries.reduce((acc, entry) => {
        const key = viewMode === 'KPI' ? entry.metric : (entry.assigneeName || 'Unassigned');
        if (!acc[key]) acc[key] = [];
        acc[key].push(entry);
        return acc;
    }, {} as Record<string, any[]>);

    const keys = Object.keys(groupedData).sort();

    return (
        <div className="space-y-6 max-w-6xl mx-auto p-6">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Cumulative KPI Administration</h1>
                    <p className="text-gray-500">Overview of all performance indicators across the organization.</p>
                </div>
                <div className="bg-white p-1 rounded-lg flex gap-1 w-fit">
                    <button
                        onClick={() => setViewMode('KPI')}
                        className={cn(
                            "px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2",
                            viewMode === 'KPI' ? "bg-white text-blue-600 shadow-sm" : "text-gray-600 hover:text-gray-900"
                        )}
                    >
                        <BarChart className="w-4 h-4" />
                        By KPI
                    </button>
                    <button
                        onClick={() => setViewMode('Staff')}
                        className={cn(
                            "px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2",
                            viewMode === 'Staff' ? "bg-white text-blue-600 shadow-sm" : "text-gray-600 hover:text-gray-900"
                        )}
                    >
                        <User className="w-4 h-4" />
                        By Staff
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {keys.map((groupKey) => {
                    const groupEntries = groupedData[groupKey];
                    const isExpanded = expandedItems[groupKey];

                    // aggregations
                    const totalTarget = groupEntries.length; // Simplified
                    // const avgProgress... complicated to sum mixed units

                    return (
                        <div key={groupKey} className="border-b border-gray-100 last:border-0">
                            <button
                                onClick={() => toggleExpand(groupKey)}
                                className="w-full flex items-center justify-between p-4 bg-background/50 hover:bg-background transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    {isExpanded ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronRight className="w-5 h-5 text-gray-400" />}
                                    <div className="text-left">
                                        <h3 className="font-semibold text-gray-800">{groupKey}</h3>
                                        <p className="text-xs text-gray-500">{groupEntries.length} entries</p>
                                    </div>
                                </div>
                                <div className="flex gap-4 text-sm text-gray-600">
                                    {/* Summary Stats can go here */}
                                </div>
                            </button>

                            {isExpanded && (
                                <div className="p-4 bg-white animate-in slide-in-from-top-2">
                                    <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left min-w-[520px]">
                                        <thead className="bg-background text-gray-500 border-b border-gray-100">
                                            <tr>
                                                <th className="p-3 font-medium">Date/Week</th>
                                                <th className="p-3 font-medium">{viewMode === 'KPI' ? 'Staff' : 'KPI Metric'}</th>
                                                <th className="p-3 font-medium text-right">Target</th>
                                                <th className="p-3 font-medium text-right">Actual</th>
                                                <th className="p-3 font-medium text-right">Status</th>
                                                <th className="p-3 font-medium">Comments</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {groupEntries.map((entry: any) => (
                                                <tr key={entry._id} className="hover:bg-background/50">
                                                    <td className="p-3 text-gray-900 font-medium">
                                                        {entry.week}
                                                        <div className="text-[10px] text-gray-400">{new Date(entry.date).toLocaleDateString()}</div>
                                                    </td>
                                                    <td className="p-3 text-gray-700">
                                                        {viewMode === 'KPI' ? (
                                                            <div className="flex flex-col">
                                                                <span>{entry.assigneeName}</span>
                                                                <span className="text-[10px] text-gray-400">{entry.subsidiary}</span>
                                                            </div>
                                                        ) : (
                                                            <span>{entry.metric}</span>
                                                        )}
                                                    </td>
                                                    <td className="p-3 text-right text-gray-500">{entry.target}</td>
                                                    <td className="p-3 text-right font-bold text-gray-900">{entry.actual}</td>
                                                    <td className="p-3 text-right">
                                                        <span className={cn(
                                                            "px-2 py-1 rounded-full text-xs border",
                                                            entry.status === 'Met' ? "bg-white text-blue-700 border-blue-200" :
                                                                entry.status === 'Exceeded' ? "bg-white text-green-700 border-green-200" :
                                                                    "bg-red-50 text-red-700 border-red-200"
                                                        )}>
                                                            {entry.status}
                                                        </span>
                                                    </td>
                                                    <td className="p-3 text-gray-500 italic truncate max-w-xs">{entry.comment}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
