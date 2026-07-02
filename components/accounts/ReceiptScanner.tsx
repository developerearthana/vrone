"use client";

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Scan, FileText, Check, Loader2, RefreshCw, DollarSign, Calendar, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CardWrapper } from '@/components/ui/page-wrapper';

export function ReceiptScanner() {
    const [state, setState] = useState<'idle' | 'scanning' | 'review'>('idle');
    const [scannedData, setScannedData] = useState<any>(null);

    const handleUpload = () => {
        setState('scanning');
        // Simulate OCR process
        setTimeout(() => {
            setScannedData({
                merchant: "Shell Petrol Pump",
                date: "2026-01-08",
                total: "2500.00",
                location: "Mumbai, MH",
                category: "Transport",
                items: ["Fuel - Diesel"]
            });
            setState('review');
        }, 2000);
    };

    return (
        <div className="grid md:grid-cols-2 gap-6 items-start">
            {/* Upload Area */}
            <CardWrapper className="p-0 border-2 border-dashed border-gray-200 rounded-xl hover:border-primary/50 transition-colors bg-background/50">
                <div className="p-8 flex flex-col items-center justify-center text-center min-h-[300px]">
                    {state === 'idle' ? (
                        <>
                            <div className="w-16 h-16 bg-white text-blue-500 rounded-full flex items-center justify-center mb-4">
                                <Upload className="w-8 h-8" />
                            </div>
                            <h3 className="font-bold text-gray-900 mb-2">Upload Receipt</h3>
                            <p className="text-sm text-gray-500 max-w-[200px] mb-6">Drag & drop your invoice image here or click to browse</p>
                            <button
                                onClick={handleUpload}
                                className="px-6 py-2 bg-primary text-primary-foreground rounded-lg font-bold text-sm hover:brightness-[1.08] transition-all shadow-lg"
                            >
                                Select Image
                            </button>
                        </>
                    ) : state === 'scanning' ? (
                        <div className="relative w-full h-full flex flex-col items-center justify-center">
                            <motion.div
                                className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/10 to-transparent"
                                animate={{ top: ['-100%', '100%'] }}
                                transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                            />
                            <Scan className="w-16 h-16 text-primary mb-4" />
                            <p className="font-bold text-gray-900 animate-pulse">Analyzing with OCR...</p>
                            <p className="text-xs text-gray-500 mt-2">Extracting Merchant, Date & Total</p>
                        </div>
                    ) : (
                        <div className="relative w-full">
                            <div className="absolute top-2 right-2 z-10">
                                <button onClick={() => setState('idle')} aria-label="Reset Scanner" className="p-2 bg-white/90 rounded-lg text-gray-600 hover:text-red-500 shadow-sm border">
                                    <RefreshCw className="w-4 h-4" />
                                </button>
                            </div>
                            {/* Placeholder for uploaded image */}
                            <div className="w-full h-[300px] bg-white rounded-lg flex items-center justify-center text-gray-400 font-bold tracking-widest uppercase">
                                Receipt Image Preview
                            </div>
                        </div>
                    )}
                </div>
            </CardWrapper>

            {/* Extracted Data Form */}
            <CardWrapper delay={0.2} className="glass-card p-6 border border-gray-200 rounded-xl relative overflow-hidden">
                <AnimatePresence mode="popLayout">
                    {state === 'review' ? (
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="space-y-4"
                        >
                            <div className="flex items-center gap-2 mb-6 text-emerald-600 bg-emerald-50 w-fit px-3 py-1 rounded-full text-xs font-bold">
                                <Check className="w-3 h-3" /> OCR Scan Successful
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase">Merchant</label>
                                    <input type="text" aria-label="Merchant Name" defaultValue={scannedData.merchant} className="w-full font-bold text-lg text-gray-900 bg-transparent border-b border-gray-200 focus:border-primary outline-none py-1" />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1"><Calendar className="w-3 h-3" /> Date</label>
                                        <input type="date" aria-label="Transaction Date" defaultValue={scannedData.date} className="w-full font-medium text-gray-900 bg-transparent border-b border-gray-200 focus:border-primary outline-none py-1" />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1"><DollarSign className="w-3 h-3" /> Total</label>
                                        <input type="text" aria-label="Total Amount" defaultValue={scannedData.total} className="w-full font-bold text-gray-900 bg-transparent border-b border-gray-200 focus:border-primary outline-none py-1" />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1"><MapPin className="w-3 h-3" /> Location</label>
                                    <input type="text" aria-label="Location" defaultValue={scannedData.location} className="w-full font-medium text-gray-900 bg-transparent border-b border-gray-200 focus:border-primary outline-none py-1" />
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase">Category</label>
                                    <select aria-label="Expense Category" className="w-full font-medium text-gray-900 bg-transparent border-b border-gray-200 focus:border-primary outline-none py-1">
                                        <option>Transport</option>
                                        <option>Meals</option>
                                        <option>Office Supplies</option>
                                    </select>
                                </div>
                            </div>

                            <div className="pt-6 mt-6 border-t border-gray-100 flex gap-3">
                                <button className="flex-1 py-3 bg-white text-gray-600 font-bold rounded-xl hover:bg-white transition-colors">Discard</button>
                                <button className="flex-1 py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-colors shadow-lg shadow-primary/25">Verify & Save</button>
                            </div>
                        </motion.div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-center opacity-50 p-8 min-h-[300px]">
                            <FileText className="w-12 h-12 text-gray-300 mb-4" />
                            <h4 className="font-bold text-gray-400">Waiting for Receipt</h4>
                            <p className="text-sm text-gray-400">Scan data will appear here automatically.</p>
                        </div>
                    )}
                </AnimatePresence>
            </CardWrapper>
        </div>
    );
}

