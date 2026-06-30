"use client";

import { useEffect, useState, useMemo } from 'react';
import { getKPIEntries } from '@/app/actions/kpi';
import { getGoals } from '@/app/actions/goal';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, BarChart, Bar, Legend, AreaChart, Area } from 'recharts';
import { TrendingUp, Users, Target, Building2, Filter } from 'lucide-react';

export default function KPIBoard() {
    const [entries, setEntries] = useState<any[]>([]);
    const [goals, setGoals] = useState<any[]>([]);
    const [selectedMetric, setSelectedMetric] = useState<string>("");

    useEffect(() => {
        const loadData = async () => {
            const [eRes, gRes] = await Promise.all([getKPIEntries(), getGoals()]);
            if (eRes?.success) setEntries(eRes.data ?? []);
            if (gRes?.success) setGoals(gRes.data ?? []);
        };
        loadData();
    }, []);

    // Extract unique metrics
    const metrics = useMemo(() => Array.from(new Set(entries.map(e => e.metric))), [entries]);

    useEffect(() => {
        if (metrics.length > 0 && !selectedMetric) {
            setSelectedMetric(metrics[0]);
        }
    }, [metrics, selectedMetric]);

    // Filter data for selected Metric
    const metricData = useMemo(() => {
        return entries.filter(e => e.metric === selectedMetric);
    }, [entries, selectedMetric]);

    // Prepare Trend Data (aggregated by Week)
    const trendData = useMemo(() => {
        const weeks = Array.from(new Set(metricData.map(e => e.week))).sort();
        return weeks.map(week => {
            const weekEntries = metricData.filter(e => e.week === week);
            const totalActual = weekEntries.reduce((acc, curr) => acc + (parseFloat(curr.actual) || 0), 0);
            const totalTarget = weekEntries.reduce((acc, curr) => acc + (parseFloat(curr.target) || 0), 0);
            return {
                name: week,
                Actual: totalActual,
                Target: totalTarget,
                date: weekEntries[0]?.date // for sorting if needed
            };
        });
    }, [metricData]);

    // Prepare Subsidiary Comparison Data
    const subData = useMemo(() => {
        const subs = Array.from(new Set(metricData.map(e => e.subsidiary)));
        return subs.map(sub => {
            const subEntries = metricData.filter(e => e.subsidiary === sub);
            const totalActual = subEntries.reduce((acc, curr) => acc + (parseFloat(curr.actual) || 0), 0);
            const totalTarget = subEntries.reduce((acc, curr) => acc + (parseFloat(curr.target) || 0), 0);
            return {
                name: sub,
                Actual: totalActual,
                Target: totalTarget,
                Percentage: totalTarget ? Math.round((totalActual / totalTarget) * 100) : 0
            };
        });
    }, [metricData]);

    // Calculate Summary Stats
    const totalActual = metricData.reduce((acc, curr) => acc + (parseFloat(curr.actual) || 0), 0);
    const totalTarget = metricData.reduce((acc, curr) => acc + (parseFloat(curr.target) || 0), 0);
    const performance = totalTarget ? ((totalActual / totalTarget) * 100).toFixed(1) : 0;

    return (
        <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-8">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">KPI Analytics Board</h1>
                    <p className="text-gray-500">Deep dive into performance metrics.</p>
                </div>
                <div className="flex items-center gap-3 bg-white p-2 rounded-lg border border-gray-200 shadow-sm">
                    <Filter className="w-4 h-4 text-gray-400 ml-2" />
                    <select
                        aria-label="Select Metric"
                        className="p-2 text-sm font-medium bg-transparent focus:outline-none min-w-[200px]"
                        value={selectedMetric}
                        onChange={(e) => setSelectedMetric(e.target.value)}
                    >
                        {metrics.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                </div>
            </div>

            {/* Top Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-6 rounded-xl border border-border shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <TrendingUp className="w-16 h-16 text-blue-600" />
                    </div>
                    <p className="text-sm font-medium text-gray-500">Overall Performance</p>
                    <h3 className="text-3xl font-bold text-gray-900 mt-2">{performance}%</h3>
                    <p className="text-xs text-blue-600 font-medium mt-1">
                        {Number(performance) >= 100 ? 'Exceeding Expectations' : 'Need Improvement'}
                    </p>
                </div>

                <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm relative overflow-hidden">
                    <p className="text-sm font-medium text-gray-500">Total Actual</p>
                    <h3 className="text-3xl font-bold text-gray-900 mt-2">{totalActual.toLocaleString()}</h3>
                    <p className="text-xs text-gray-400 mt-1">Cumulative Value</p>
                </div>

                <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm relative overflow-hidden">
                    <p className="text-sm font-medium text-gray-500">Total Target</p>
                    <h3 className="text-3xl font-bold text-gray-900 mt-2">{totalTarget.toLocaleString()}</h3>
                    <p className="text-xs text-gray-400 mt-1">Set Objective</p>
                </div>

                <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm relative overflow-hidden">
                    <p className="text-sm font-medium text-gray-500">Data Points</p>
                    <h3 className="text-3xl font-bold text-gray-900 mt-2">{metricData.length}</h3>
                    <p className="text-xs text-gray-400 mt-1">Entries Recorded</p>
                </div>
            </div>

            {/* Charts Area */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Trend Chart */}
                <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                    <h3 className="font-bold text-gray-900 mb-6 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-gray-500" />
                        Performance Trend
                    </h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={trendData}>
                                <defs>
                                    <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis fontSize={12} tickLine={false} axisLine={false} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    cursor={{ stroke: '#9ca3af', strokeWidth: 1, strokeDasharray: '3 3' }}
                                />
                                <Legend />
                                <Area type="monotone" dataKey="Actual" stroke="#2563eb" strokeWidth={3} fillOpacity={1} fill="url(#colorActual)" />
                                <Area type="monotone" dataKey="Target" stroke="#9ca3af" strokeWidth={2} strokeDasharray="3 3" fill="none" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Subsidiary Comparison */}
                <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                    <h3 className="font-bold text-gray-900 mb-6 flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-gray-500" />
                        Subsidiary Breakdown
                    </h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={subData} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f3f4f6" />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" width={100} fontSize={12} tickLine={false} axisLine={false} />
                                <Tooltip cursor={{ fill: '#f3f4f6' }} />
                                <Legend />
                                <Bar dataKey="Actual" fill="#2563eb" radius={[0, 4, 4, 0]} barSize={20} />
                                <Bar dataKey="Target" fill="#e5e7eb" radius={[0, 4, 4, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Individual Records Table */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                    <h3 className="font-bold text-gray-900">Detailed Records</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-background text-gray-500">
                            <tr>
                                <th className="p-4 font-medium">Date</th>
                                <th className="p-4 font-medium">Assignee</th>
                                <th className="p-4 font-medium">Subsidiary</th>
                                <th className="p-4 font-medium text-right">Target</th>
                                <th className="p-4 font-medium text-right">Actual</th>
                                <th className="p-4 font-medium">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {metricData.map((entry) => (
                                <tr key={entry._id} className="hover:bg-background/50">
                                    <td className="p-4">{new Date(entry.date).toLocaleDateString()}</td>
                                    <td className="p-4 font-medium">{entry.assigneeName}</td>
                                    <td className="p-4 text-gray-500">{entry.subsidiary}</td>
                                    <td className="p-4 text-right text-gray-500">{entry.target}</td>
                                    <td className="p-4 text-right font-bold text-gray-900">{entry.actual}</td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium 
                                            ${entry.status === 'Met' ? 'bg-blue-100 text-blue-700' :
                                                entry.status === 'Exceeded' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                            {entry.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
