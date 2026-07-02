"use client";

import { useRef } from 'react';
import { Download, Printer, Share2, Building2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { CardWrapper } from '@/components/ui/page-wrapper';

interface PayslipData {
    id: string;
    month: string;
    year: number;
    employee: {
        name: string;
        id: string;
        designation: string;
        department: string;
        pan: string;
        uan: string;
        bankAccount: string;
    };
    earnings: { label: string; amount: number }[];
    deductions: { label: string; amount: number }[];
    netPay: number;
    daysPayable: number;
}

interface PayslipViewerProps {
    data?: any;
}

export function PayslipViewer({ data }: PayslipViewerProps) {
    if (!data) {
        return (
            <CardWrapper className="w-full max-w-4xl mx-auto h-[600px] flex items-center justify-center bg-background border border-dashed border-gray-300 rounded-xl">
                <div className="text-center text-gray-400">
                    <Building2 className="w-16 h-16 mx-auto mb-4 opacity-20" />
                    <p>Select a payslip to view details</p>
                </div>
            </CardWrapper>
        );
    }

    // Transform backend data to match UI needs if necessary, or use directly
    // Assuming backend returns structure matching or we map it here
    const { employeeName, month, salary, deductions, netPay } = data;
    const earningsList = [
        { label: "Basic Salary", amount: salary?.basic || 0 },
        { label: "House Rent Allowance (HRA)", amount: salary?.hra || 0 },
        { label: "Special Allowances", amount: salary?.allowances || 0 },
    ];

    const deductionsList = [
        { label: "Provident Fund (PF)", amount: deductions?.pf || 0 },
        { label: "Professional Tax", amount: deductions?.tax || 0 },
        { label: "Other / LOP", amount: deductions?.other || 0 },
    ];

    return (
        <CardWrapper className="w-full max-w-4xl mx-auto space-y-4">
            {/* Action Bar */}
            <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-gray-200 shadow-sm print:hidden">
                <span className="font-bold text-gray-700">Payslip Preview</span>
                <div className="flex gap-2">
                    <button
                        onClick={() => window.print()}
                        className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-gray-600 hover:bg-background border rounded-lg transition-colors"
                    >
                        <Printer className="w-4 h-4" /> Print
                    </button>
                    <button
                        onClick={() => window.print()}
                        className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-primary-foreground bg-primary hover:brightness-[1.08] rounded-lg transition-colors shadow-lg shadow-primary/20"
                    >
                        <Download className="w-4 h-4" /> Download PDF
                    </button>
                </div>
            </div>

            {/* Visual Payslip Paper */}
            <div className="bg-white p-8 md:p-12 rounded-none md:rounded-xl shadow-xl border border-gray-100 relative overflow-hidden print:shadow-none print:border-none">
                {/* Watermark */}
                <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none">
                    <Building2 size={400} />
                </div>

                {/* Header */}
                <div className="flex justify-between border-b-2 border-gray-800 pb-6 mb-8 relative z-10">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center text-white">
                            <Building2 className="w-7 h-7" />
                        </div>
                        <div>
                            <h1 className="text-xl font-black text-gray-900 uppercase tracking-wide">Earthana Infrastructure</h1>
                            <p className="text-xs text-gray-500">Regd. Office: 42, Business Bay, Mumbai - 400051</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <h2 className="text-2xl font-light text-gray-400">PAYSLIP</h2>
                        <p className="text-sm font-bold text-gray-900">{month}</p>
                    </div>
                </div>

                {/* Employee Info Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 bg-background p-6 rounded-lg mb-8 relative z-10 text-sm">
                    <div>
                        <p className="text-gray-400 text-xs uppercase font-bold tracking-wider mb-1">Employee Name</p>
                        <p className="font-bold text-gray-900">{employeeName}</p>
                    </div>

                    <div>
                        <p className="text-gray-400 text-xs uppercase font-bold tracking-wider mb-1">Month</p>
                        <p className="text-gray-900">{month}</p>
                    </div>
                </div>

                {/* Calculation Table */}
                <div className="grid md:grid-cols-2 gap-8 mb-8 relative z-10 border-b border-gray-200 pb-8">
                    {/* Earnings */}
                    <div>
                        <h3 className="text-sm font-bold text-emerald-700 uppercase tracking-wider border-b border-emerald-100 pb-2 mb-4">Earnings</h3>
                        <div className="space-y-2">
                            {earningsList.map(item => (
                                <div key={item.label} className="flex justify-between text-sm">
                                    <span className="text-gray-600">{item.label}</span>
                                    <span className="font-medium text-gray-900">₹{item.amount.toLocaleString('en-IN')}</span>
                                </div>
                            ))}
                            <div className="pt-4 mt-4 border-t border-dashed border-gray-200 flex justify-between font-bold text-emerald-800">
                                <span>Total Earnings (A)</span>
                                <span>₹{salary?.gross?.toLocaleString('en-IN')}</span>
                            </div>
                        </div>
                    </div>

                    {/* Deductions */}
                    <div>
                        <h3 className="text-sm font-bold text-red-700 uppercase tracking-wider border-b border-red-100 pb-2 mb-4">Deductions</h3>
                        <div className="space-y-2">
                            {deductionsList.map(item => (
                                <div key={item.label} className="flex justify-between text-sm">
                                    <span className="text-gray-600">{item.label}</span>
                                    <span className="font-medium text-gray-900">₹{item.amount.toLocaleString('en-IN')}</span>
                                </div>
                            ))}
                            <div className="pt-4 mt-4 border-t border-dashed border-gray-200 flex justify-between font-bold text-red-800">
                                <span>Total Deductions (B)</span>
                                <span>₹{deductions?.total?.toLocaleString('en-IN')}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Net Pay */}
                <div className="bg-foreground text-background p-6 rounded-xl flex justify-between items-center relative z-10">
                    <div>
                        <p className="text-sm text-background/70 uppercase tracking-wider font-bold">Net Salary Payable</p>
                        <p className="text-xs text-background/50 mt-1">(Total Earnings - Total Deductions)</p>
                    </div>
                    <div className="text-right">
                        <span className="text-3xl font-mono font-bold">₹{netPay?.toLocaleString('en-IN')}</span>
                    </div>
                </div>

                <div className="mt-8 text-center text-[10px] text-gray-400 relative z-10">
                    This is a computer-generated document and does not require a signature.
                </div>
            </div>
        </CardWrapper>
    );
}

