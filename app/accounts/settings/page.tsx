"use client";

import { Save, AlertCircle, Plus } from 'lucide-react';
import { Button } from "@/components/ui/button";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { getFiscalYears, createFiscalYear, setCurrentFiscalYear, closeFiscalYear } from "@/app/actions/fiscal-year";
import { toast } from "@/components/ui/toaster";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";

export default function AccountsSettings() {
    const [years, setYears] = useState<any[]>([]);
    const [isYearDialogOpen, setIsYearDialogOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    // New FY Form State
    const [newFY, setNewFY] = useState({ name: "", startDate: "", endDate: "" });

    const fetchYears = async () => {
        try {
            const data = await getFiscalYears();
            setYears(data || []);
        } catch { toast.error('Failed to load fiscal years'); }
    };

    useEffect(() => {
        fetchYears();
    }, []);

    const handleCreateFY = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        const res = await createFiscalYear(newFY);
        if (res?.data) {
            toast.success("Fiscal Year created");
            setIsYearDialogOpen(false);
            fetchYears();
        } else {
            toast.error("Failed to create FY");
        }
        setLoading(false);
    };

    const handleSetActive = async (id: string) => {
        const res = await setCurrentFiscalYear({ id });
        if (res?.success) {
            toast.success("Active Fiscal Year Updated");
            fetchYears();
        }
    };

    const handleCloseYear = async (id: string) => {
        if (confirm("Are you sure? This will shift closing balances to the next year.")) {
            const res = await closeFiscalYear({ id });
            if (res?.success) {
                toast.success(res.data?.message || "Fiscal Year Closed");
                fetchYears();
            }
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Accounting Settings</h1>
                <p className="text-gray-500">Configure fiscal years, currencies, and tax rules.</p>
            </div>

            <div className="glass-card p-6 rounded-xl space-y-6">
                <div>
                    <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100">
                        <h3 className="text-lg font-semibold text-gray-900">General Configuration</h3>
                        <a href="/accounts/settings/categories" className="text-sm text-blue-600 hover:underline font-medium">Manage Categories &rarr;</a>
                    </div>
                    <div className="grid md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Fiscal Year Start</label>
                            <select aria-label="Fiscal Year Start" disabled className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none cursor-not-allowed">
                                <option>April 1st (Managed in FY Section)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Base Currency</label>
                            <select aria-label="Base Currency" className="w-full p-2.5 bg-background border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50">
                                <option>Indian Rupee (INR)</option>
                                <option>US Dollar (USD)</option>
                                <option>Euro (EUR)</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-100">Tax Settings</h3>
                    <div className="space-y-4">
                        <div className="flex items-start gap-3 p-4 bg-white rounded-lg border border-border">
                            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                            <div>
                                <h4 className="text-sm font-bold text-blue-800">GST Registration</h4>
                                <p className="text-xs text-blue-600 mt-1">Your organization is registered for GST. Ensure all tax invoices generated include your GSTIN.</p>
                            </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">GSTIN</label>
                                <input aria-label="GSTIN" type="text" defaultValue="27AAAAA0000A1Z5" className="w-full p-2.5 bg-background border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Default Tax Rate</label>
                                <select aria-label="Default Tax Rate" className="w-full p-2.5 bg-background border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50">
                                    <option>GST 18%</option>
                                    <option>GST 12%</option>
                                    <option>GST 5%</option>
                                    <option>Exempt</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="pt-4 flex justify-end">
                    <button className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm">
                        <Save className="w-4 h-4" />
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
}
