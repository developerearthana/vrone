"use client";

import Link from 'next/link';
import { Lock, FileText, Info, Phone, LogIn } from 'lucide-react';

export default function GuestDashboard() {
    return (
        <div className="space-y-6 max-w-3xl mx-auto">
            <div className="bg-card border border-border rounded-xl p-8 text-center">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Lock className="w-6 h-6 text-primary" />
                </div>
                <h1 className="text-2xl font-bold text-foreground">Welcome to Vrone ERP</h1>
                <p className="text-muted-foreground mt-2 max-w-md mx-auto text-sm">
                    You are viewing this portal as a <strong className="text-foreground">Guest</strong>.
                    Access is restricted to public resources only.
                </p>
                <div className="mt-6 flex justify-center gap-3">
                    <Link
                        href="/login"
                        className="flex items-center gap-2 px-5 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm shadow-primary/20"
                    >
                        <LogIn className="w-4 h-4" /> Sign In
                    </Link>
                    <a
                        href="mailto:hr@earthana.in"
                        className="px-5 py-2 border border-border text-sm font-semibold text-foreground rounded-lg hover:bg-muted transition-colors"
                    >
                        Contact HR
                    </a>
                </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
                {[
                    {
                        icon: FileText,
                        title: 'Company Policies',
                        desc: 'Standard operating procedures, HR policies and code of conduct.',
                        color: 'bg-sky-50 text-sky-600',
                    },
                    {
                        icon: Info,
                        title: 'About Earthana',
                        desc: 'Learn about our mission, capabilities and upcoming roadmap.',
                        color: 'bg-emerald-50 text-emerald-600',
                    },
                    {
                        icon: Phone,
                        title: 'Contact Support',
                        desc: 'Have a query or need system access? Reach out to administration.',
                        color: 'bg-primary/8 text-primary',
                    },
                ].map(({ icon: Icon, title, desc, color }) => (
                    <div key={title} className="bg-card border border-border rounded-xl p-5 hover:border-primary/30 transition-colors">
                        <div className={`p-2.5 rounded-lg w-fit mb-3 ${color}`}>
                            <Icon className="w-5 h-5" />
                        </div>
                        <h3 className="font-semibold text-foreground mb-1">{title}</h3>
                        <p className="text-sm text-muted-foreground">{desc}</p>
                    </div>
                ))}
            </div>

            <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-start gap-3">
                <Lock className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                <p className="text-sm text-amber-800">
                    <strong>Restricted access.</strong> Dashboard widgets, project lists and financial reports require an authorised account.
                    Contact your system administrator to request access.
                </p>
            </div>
        </div>
    );
}
