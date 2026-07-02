"use client";

import { Truck, CheckCircle2, ClipboardCheck, ArrowRight } from 'lucide-react';

export default function GRNPage() {
    const pendingGRNs = [
        { id: 1, po: "PO-2024-003", vendor: "Global Steels", items: "Steel Rods (500kg)", expected: "Today", status: "Arriving" },
        { id: 2, po: "PO-2024-004", vendor: "Micro Systems", items: "Motherboards (20pcs)", expected: "Overdue (2 days)", status: "Delayed" },
    ];

    const recentGRNs = [
        { id: 1, grn: "GRN-001", po: "PO-2024-001", date: "2024-03-24", items: 5, received: 5, status: "Verified" },
        { id: 2, grn: "GRN-002", po: "PO-2024-005", date: "2024-03-22", items: 10, received: 10, status: "Verified" },
    ];

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Goods Received (GRN)</h1>
                    <p className="text-gray-500">Track and verify incoming shipments.</p>
                </div>
                <button className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:brightness-[1.08] transition-colors shadow-sm">
                    <ClipboardCheck className="w-4 h-4" />
                    Create New GRN
                </button>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                {/* Pending Arrivals */}
                <div className="lg:col-span-1 space-y-4">
                    <h3 className="font-bold text-gray-900 flex items-center gap-2">
                        <Truck className="w-5 h-5 text-gray-500" />
                        Expecting Arrivals
                    </h3>
                    {pendingGRNs.map((item) => (
                        <div key={item.id} className="glass-card p-4 rounded-xl border border-orange-200/60 bg-orange-50/20">
                            <div className="flex justify-between items-start mb-2">
                                <span className="text-xs font-bold text-blue-600 bg-white px-2 py-0.5 rounded">{item.po}</span>
                                <span className={`text-xs font-bold ${item.status === 'Delayed' ? 'text-red-600' : 'text-green-600'}`}>{item.expected}</span>
                            </div>
                            <h4 className="font-bold text-gray-800 text-sm mb-1">{item.vendor}</h4>
                            <p className="text-xs text-gray-500 mb-3">{item.items}</p>
                            <button className="w-full py-1.5 bg-primary text-primary-foreground text-xs font-medium rounded hover:brightness-[1.08] transition-colors">
                                Receive Goods
                            </button>
                        </div>
                    ))}
                </div>

                {/* Recent GRN History */}
                <div className="lg:col-span-2 glass-card rounded-xl overflow-hidden">
                    <div className="p-4 border-b border-gray-100 bg-background/50 flex justify-between items-center">
                        <h3 className="font-bold text-gray-900">Recent History</h3>
                    </div>
                    <div className="overflow-x-auto">
                    <table className="w-full text-left min-w-[520px]">
                        <thead className="bg-white border-b border-gray-100 text-xs uppercase text-gray-500">
                            <tr>
                                <th className="px-6 py-4">GRN #</th>
                                <th className="px-6 py-4">PO Ref</th>
                                <th className="px-6 py-4">Date Rec.</th>
                                <th className="px-6 py-4 text-center">Qty Match</th>
                                <th className="px-6 py-4 text-right">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-sm">
                            {recentGRNs.map((grn) => (
                                <tr key={grn.id} className="hover:bg-background transition-colors">
                                    <td className="px-6 py-4 font-medium text-gray-900">{grn.grn}</td>
                                    <td className="px-6 py-4 text-blue-600">{grn.po}</td>
                                    <td className="px-6 py-4 text-gray-500">{grn.date}</td>
                                    <td className="px-6 py-4 text-center">
                                        <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold">
                                            {grn.received} / {grn.items}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <span className="inline-flex items-center gap-1 text-green-600 font-medium text-xs">
                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                            {grn.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
