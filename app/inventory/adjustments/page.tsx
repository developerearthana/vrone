"use client";

import { ArrowLeftRight, Calendar, Search } from 'lucide-react';

export default function AdjustmentsPage() {
    const adjustments = [
        { id: 1, date: "2024-03-20", ref: "ADJ-001", type: "Increase", reason: "Opening Stock", items: 120, user: "Admin", status: "Approved" },
        { id: 2, date: "2024-03-21", ref: "ADJ-002", type: "Decrease", reason: "Damaged Goods", items: 5, user: "Store Mgr", status: "Pending" },
        { id: 3, date: "2024-03-22", ref: "ADJ-003", type: "Increase", reason: "Return from Customer", items: 2, user: "Sales Rep", status: "Approved" },
    ];

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Stock Adjustments</h1>
                    <p className="text-gray-500">Record corrections to stock levels.</p>
                </div>
                <button className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:brightness-[1.08] transition-colors shadow-sm">
                    <ArrowLeftRight className="w-4 h-4" />
                    New Adjustment
                </button>
            </div>

            <div className="glass-card rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                <table className="w-full text-left font-medium min-w-[520px]">
                    <thead className="bg-background border-b border-gray-100 text-xs uppercase text-gray-500">
                        <tr>
                            <th className="px-6 py-4">Reference</th>
                            <th className="px-6 py-4">Date</th>
                            <th className="px-6 py-4">Type</th>
                            <th className="px-6 py-4">Reason</th>
                            <th className="px-6 py-4 text-right">Qty</th>
                            <th className="px-6 py-4">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-sm">
                        {adjustments.map((item) => (
                            <tr key={item.id} className="hover:bg-background transition-colors">
                                <td className="px-6 py-4 text-blue-600 cursor-pointer">{item.ref}</td>
                                <td className="px-6 py-4 text-gray-500 flex items-center gap-2">
                                    <Calendar className="w-4 h-4" />
                                    {item.date}
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 rounded-full text-xs border ${item.type === 'Increase' ? 'bg-white text-green-700 border-green-200' : 'bg-white text-orange-700 border-orange-200'}`}>
                                        {item.type}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-gray-600">{item.reason}</td>
                                <td className="px-6 py-4 text-right">{item.items}</td>
                                <td className="px-6 py-4">
                                    <span className={`flex items-center gap-1.5 ${item.status === 'Approved' ? 'text-green-600' : 'text-gray-500'}`}>
                                        <span className={`w-1.5 h-1.5 rounded-full ${item.status === 'Approved' ? 'bg-green-600' : 'bg-white'}`}></span>
                                        {item.status}
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
