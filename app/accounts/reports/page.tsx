"use client";

import { FileBarChart, Download, Calendar } from 'lucide-react';

export default function ReportsPage() {
    const reports = [
        { name: "Profit & Loss", desc: "Income vs Expenses summary", period: "This Financial Year", lastUpdated: "Today" },
        { name: "Balance Sheet", desc: "Assets, Liabilities & Equity", period: "As of Mar 24", lastUpdated: "Today" },
        { name: "Cash Flow Statement", desc: "Inflow & Outflow details", period: "This Month", lastUpdated: "Yesterday" },
        { name: "Tax Summary (GST)", desc: "Input/Output Tax liability", period: "Feb 2024", lastUpdated: "1 Mar 2024" },
    ];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Financial Reports</h1>
                <p className="text-gray-500">Generate and download financial statements.</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
                {reports.map((report) => (
                    <div key={report.name} className="glass-card p-6 rounded-xl hover:shadow-md transition-shadow relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 transition-transform">
                            <FileBarChart className="w-24 h-24" />
                        </div>
                        <div className="relative z-10">
                            <h3 className="text-xl font-bold text-gray-900 mb-1">{report.name}</h3>
                            <p className="text-gray-500 text-sm mb-4">{report.desc}</p>

                            <div className="flex items-center gap-4 text-xs font-medium text-gray-400 mb-6">
                                <span className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    {report.period}
                                </span>
                                <span>Updated: {report.lastUpdated}</span>
                            </div>

                            <div className="flex gap-3">
                                <button className="flex-1 bg-primary text-primary-foreground py-2 rounded-lg text-sm font-medium hover:brightness-[1.08] transition-colors shadow-sm">
                                    View Report
                                </button>
                                <button className="px-3 py-2 border border-gray-200 text-gray-600 rounded-lg hover:bg-background hover:text-gray-900 transition-colors" title="Download PDF">
                                    <Download className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
