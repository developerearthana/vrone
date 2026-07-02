"use client";

import { useState } from 'react';
import { ArrowLeft, Mail, Phone, MapPin, Calendar, Building2, User, FileText, Upload, History, MoreVertical, File, Plus } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

interface Document {
    id: number;
    name: string;
    type: 'Resume' | 'Offer Letter' | 'Relieving Letter' | 'Other';
    date: string;
    size: string;
}

interface Remark {
    id: number;
    text: string;
    date: string;
    author: string;
}

export default function EmployeeDetailsPage() {
    const params = useParams(); // In real app, use id to fetch data

    // Mock Data
    const documents: Document[] = [
        { id: 1, name: "Resume_Amit_Patel.pdf", type: "Resume", date: "2024-05-10", size: "2.4 MB" },
        { id: 2, name: "Offer_Letter_Signed.pdf", type: "Offer Letter", date: "2024-05-15", size: "1.1 MB" },
    ];

    const remarks: Remark[] = [
        { id: 1, text: "Excellent performance in Q4 project delivery.", date: "2025-12-20", author: "Rajesh S. (Admin)" },
        { id: 2, text: "Promoted to Senior Manager.", date: "2025-06-01", author: "System" },
    ];

    return (
        <div className="space-y-6">
            <Link href="/hrm/employees" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors">
                <ArrowLeft className="w-4 h-4" /> Back to Employees
            </Link>

            <div className="grid lg:grid-cols-3 gap-6">
                {/* Profile Card */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="glass-card p-6 rounded-xl flex flex-col items-center text-center">
                        <div className="w-24 h-24 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-2xl font-bold mb-4">
                            AP
                        </div>
                        <h1 className="text-xl font-bold text-gray-900">Amit Patel</h1>
                        <p className="text-gray-500 font-medium">Senior Project Manager</p>
                        <span className="mt-2 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">Active</span>

                        <div className="w-full mt-6 space-y-4 text-left">
                            <div className="flex items-center gap-3 text-sm text-gray-600">
                                <Mail className="w-4 h-4 text-gray-400" /> amit.patel@earthana.com
                            </div>
                            <div className="flex items-center gap-3 text-sm text-gray-600">
                                <Phone className="w-4 h-4 text-gray-400" /> +91 98765 43210
                            </div>
                            <div className="flex items-center gap-3 text-sm text-gray-600">
                                <MapPin className="w-4 h-4 text-gray-400" /> Mumbai, India
                            </div>
                            <div className="flex items-center gap-3 text-sm text-gray-600">
                                <Calendar className="w-4 h-4 text-gray-400" /> Joined May 15, 2024
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Documents Section */}
                    <div className="glass-card p-6 rounded-xl">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                <FileText className="w-5 h-5 text-gray-500" /> Documents
                            </h2>
                            <button className="flex items-center gap-2 text-sm text-primary hover:bg-primary/5 px-3 py-1.5 rounded-lg transition-colors">
                                <Upload className="w-4 h-4" /> Upload
                            </button>
                        </div>
                        <div className="grid gap-3">
                            {documents.map(doc => (
                                <div key={doc.id} className="flex items-center justify-between p-3 border border-gray-100 rounded-lg hover:bg-background/50 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-red-50 text-red-600 rounded-lg">
                                            <File className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-gray-900">{doc.name}</p>
                                            <p className="text-xs text-gray-500">{doc.type} • {doc.size}</p>
                                        </div>
                                    </div>
                                    <span className="text-xs text-gray-400">{doc.date}</span>
                                </div>
                            ))}
                            <button className="w-full flex items-center justify-center gap-2 p-3 border border-dashed border-border rounded-lg text-muted-foreground/60 hover:border-border hover:text-muted-foreground cursor-pointer transition-colors bg-transparent">
                                <Plus className="w-4 h-4" /> Add Relieving / Termination Order
                            </button>
                        </div>
                    </div>

                    {/* Remarks History */}
                    <div className="glass-card p-6 rounded-xl">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                <History className="w-5 h-5 text-gray-500" /> Remark History
                            </h2>
                            <button className="text-sm text-muted-foreground hover:text-foreground">View All</button>
                        </div>
                        <div className="space-y-4">
                            {remarks.map(remark => (
                                <div key={remark.id} className="flex gap-4">
                                    <div className="flex flex-col items-center">
                                        <div className="w-2 h-2 rounded-full bg-blue-500 mt-2"></div>
                                        <div className="w-0.5 h-full bg-background mt-2"></div>
                                    </div>
                                    <div className="pb-4">
                                        <p className="text-sm text-gray-900">{remark.text}</p>
                                        <p className="text-xs text-gray-500 mt-1">
                                            {remark.author} • {remark.date}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
