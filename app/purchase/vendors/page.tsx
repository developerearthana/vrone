"use client";

import { Plus, Search, Building2, Mail, Phone, ExternalLink, Package } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getVendors } from '@/app/actions/purchase';
import { toast } from 'sonner';

export default function VendorRFQPage() {
    // Mock RFQs for now as requested by user to implement Vendor List mainly
    const rfqs = [
        { id: 1, ref: "RFQ-2024-001", items: "Industrial Pumps", vendors: 3, status: "Open", deadline: "2024-03-30" },
        { id: 2, ref: "RFQ-2024-002", items: "Office Laptops", vendors: 5, status: "Closed", deadline: "2024-03-15" },
    ];

    const [activeVendors, setActiveVendors] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        loadVendors();
    }, []);

    const loadVendors = async () => {
        const res = await getVendors();
        if (res.success && res.data) {
            setActiveVendors(res.data);
        } else {
            toast.error("Failed to load vendors");
        }
    };

    const filteredVendors = activeVendors.filter(v =>
        v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.company?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-8">
            {/* Active RFQs Section (Static for context) */}
            <section className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-gray-900">Active RFQs</h2>
                    <button className="text-sm font-medium text-primary hover:bg-primary/5 px-3 py-1.5 rounded-lg transition-colors">
                        View All History
                    </button>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                    {rfqs.map((rfq) => (
                        <div key={rfq.id} className="glass-card p-5 rounded-xl border-l-4 border-l-blue-500 hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="font-bold text-gray-900">{rfq.ref}</h3>
                                <span className={`px-2 py-1 rounded text-xs font-bold ${rfq.status === 'Open' ? 'bg-green-100 text-green-700' : 'bg-white text-gray-600'}`}>
                                    {rfq.status}
                                </span>
                            </div>
                            <p className="text-gray-600 text-sm mb-4">Requesting quotes for: <span className="font-medium text-gray-900">{rfq.items}</span></p>
                            <div className="flex items-center justify-between text-xs text-gray-500 border-t pt-3">
                                <span>Sent to {rfq.vendors} vendors</span>
                                <span>Deadline: {rfq.deadline}</span>
                            </div>
                        </div>
                    ))}
                    <button className="border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center p-6 text-muted-foreground/60 hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition-all gap-2 group">
                        <div className="p-2 bg-muted rounded-full group-hover:bg-primary/10 transition-colors">
                            <Plus className="w-5 h-5" />
                        </div>
                        <span className="font-medium">Create New RFQ</span>
                    </button>
                </div>
            </section>

            {/* Vendor Directory Section */}
            <section className="space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <h2 className="text-xl font-bold text-gray-900">Vendor Directory</h2>
                    <div className="relative w-full md:max-w-xs">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Find vendors..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 pr-4 py-2 w-full border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm bg-white"
                        />
                    </div>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredVendors.map((vendor) => (
                        <div key={vendor._id} className="glass-card p-5 rounded-xl group hover:border-blue-200 transition-colors">
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center text-gray-500">
                                        <Building2 className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900 text-sm">{vendor.name}</h3>
                                        <p className="text-xs text-blue-600 font-medium">{vendor.category || 'General Supply'}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 bg-white text-blue-700 px-2 py-1 rounded text-xs font-bold" title="Open POs">
                                    <Package className="w-3 h-3" /> {vendor.openPOCount || 0}
                                </div>
                            </div>
                            <div className="space-y-2 mb-4">
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <Mail className="w-3.5 h-3.5 text-gray-400" />
                                    <span className="truncate" title={vendor.email}>{vendor.email}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <Phone className="w-3.5 h-3.5 text-gray-400" />
                                    {vendor.phone || 'N/A'}
                                </div>
                            </div>
                            <button className="w-full py-2 border border-border rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors flex items-center justify-center gap-2">
                                View Profile <ExternalLink className="w-3 h-3" />
                            </button>
                        </div>
                    ))}
                    {filteredVendors.length === 0 && (
                        <div className="col-span-full py-8 text-center text-gray-500">
                            No vendors found matching your search.
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}
