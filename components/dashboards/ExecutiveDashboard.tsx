"use client";

import { Activity, CreditCard, DollarSign, Users, Calendar, ArrowUpRight, MapPin, Clock, LogIn, LogOut, UserX, TrendingUp, TrendingDown, Target, Zap, FolderDot } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import '@/lib/gsap';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import { PageWrapper, CardWrapper } from '@/components/ui/page-wrapper';
import { KPIEntryModal } from '@/components/goals/KPIEntryModal';
import { KPI_METRICS } from '@/lib/constants';
import { MOCK_USERS, MOCK_KPI_TARGETS } from '@/lib/mock-data';
import { cn } from '@/lib/utils';
import { PermissionGuard } from '@/components/auth/PermissionGuard';
import { KPITrackingGrid } from '@/components/kpi/KPITrackingGrid';

const revenueData = [
    { name: 'Jan', revenue: 4200, expenses: 2400 },
    { name: 'Feb', revenue: 3800, expenses: 1398 },
    { name: 'Mar', revenue: 5100, expenses: 2800 },
    { name: 'Apr', revenue: 4800, expenses: 2100 },
    { name: 'May', revenue: 6200, expenses: 3200 },
    { name: 'Jun', revenue: 5800, expenses: 2900 },
];

const projectStatusData = [
    { name: 'Rudra', value: 85, color: '#10b981' }, // Emerald
    { name: 'Gridwise', value: 65, color: '#3b82f6' }, // Blue
    { name: 'Metrum', value: 45, color: '#f59e0b' }, // Amber
    { name: 'Rite', value: 92, color: '#8b5cf6' }, // Violet
];

export default function ExecutiveDashboard({ user }: { user?: any }) {
    const userPermissions = user?.permissions || [];
    // Attendance State
    const [punchedIn, setPunchedIn] = useState(false);
    const [punchTime, setPunchTime] = useState<string | null>(null);
    const [location, setLocation] = useState<string | null>(null);
    const [currentTime, setCurrentTime] = useState<Date | null>(null);
    const [showKPIModal, setShowKPIModal] = useState(false);
    const kpiGridRef = useRef<HTMLDivElement>(null);

    useGSAP(() => {
        gsap.from(".kpi-mini-icon", {
            scale: 0,
            rotate: -90,
            opacity: 0,
            duration: 0.6,
            stagger: 0.12,
            ease: "back.out(1.7)",
        });
    }, { scope: kpiGridRef });

    // Mock Subsidiaries
    const subsidiaries = ["All", "Rudra Architectural Studio (RAS)", "Gridwise", "Metrum Works", "Rite Hands"];

    const handleKPIAdd = (entry: any) => {
        console.log("Adding KPI from Dashboard:", entry);
        // Ideally use toast here, simple alert for now or mock
        setShowKPIModal(false);
    };

    // Mock User Config
    const userConfig = {
        ipRestrictionEnabled: true,
        allowedIP: "203.0.113.195",
        currentIP: "203.0.113.195",
        ipRestrictionLiftedUntil: null,
    };

    useEffect(() => {
        setCurrentTime(new Date());
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const handlePunch = (type: 'in' | 'out') => {
        // Simulated IP Check logic (simplified for UI demo)
        if (type === 'in') {
            setPunchedIn(true);
            setPunchTime(new Date().toLocaleTimeString());
            setLocation("Head Office, Mumbai (Detected)");
        } else {
            setPunchedIn(false);
            setPunchTime(null);
            setLocation(null);
        }
    };

    return (
        <PageWrapper className="space-y-6 max-w-[1920px] mx-auto">
            {/* Header & Welcome */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-primary tracking-tight">Executive Overview</h1>
                    <p className="text-muted-foreground mt-1">Real-time insights across all Earthana subsidiaries.</p>
                </div>

                {/* Live Attendance Widget */}
                <div className="glass-card px-4 py-2 rounded-xl border border-primary/20 bg-white shadow-sm flex items-center gap-4">
                    <div className="text-right hidden md:block">
                        <p className="text-[10px] uppercase font-bold text-muted-foreground/60 tracking-wider">Current Time</p>
                        <p className="text-lg font-mono font-bold text-foreground leading-none">
                            {currentTime ? currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "--:--"}
                        </p>
                    </div>
                    <div className="h-8 w-px bg-white hidden md:block" />
                    <div className="flex gap-2">
                        {!punchedIn ? (
                            <button onClick={() => handlePunch('in')} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:brightness-[1.08] transition-colors shadow-lg shadow-primary/20">
                                <LogIn className="w-4 h-4" /> Punch In
                            </button>
                        ) : (
                            <button onClick={() => handlePunch('out')} className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-semibold hover:bg-red-600 transition-colors shadow-lg shadow-red-200">
                                <LogOut className="w-4 h-4" /> Punch Out
                            </button>
                        )}
                        <button onClick={() => setShowKPIModal(true)} aria-label="View KPI Stats" className="p-2 bg-card border border-border rounded-lg text-foreground hover:text-primary hover:border-primary/30 transition-colors">
                            <Target className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>

            {/* KPI Stats Grid */}
            <div ref={kpiGridRef} className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {[
                    { label: "Total Revenue", value: "₹45.2 L", trend: "+20.1%", icon: DollarSign, color: "text-primary", bg: "bg-primary/10", chart: revenueData },
                    { label: "Active Projects", value: "12", trend: "On Track", icon: Zap, color: "text-primary", bg: "bg-primary/10", chart: null },
                    { label: "Pipeline Value", value: "₹1.2 Cr", trend: "+5%", icon: TrendingUp, color: "text-primary", bg: "bg-primary/10", chart: null },
                    { label: "Team Strength", value: "128", trend: "+12 New", icon: Users, color: "text-primary", bg: "bg-primary/10", chart: null },
                ].map((stat, i) => (

                    <CardWrapper key={i} delay={i * 0.1} className="glass-card p-5 rounded-xl border border-border bg-card">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-xs font-medium text-muted-foreground">{stat.label}</p>
                                <h3 className="text-2xl font-bold text-foreground mt-2">{stat.value}</h3>
                                <div className={cn("inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-full text-xs font-bold", stat.bg, stat.color)}>
                                    <ArrowUpRight className="w-3 h-3" /> {stat.trend}
                                </div>
                            </div>
                            <div className="kpi-mini-icon p-3 rounded-xl bg-green-600/10 text-green-600">
                                <stat.icon className="w-5 h-5" />
                            </div>
                        </div>
                    </CardWrapper>
                ))}
            </div>

            {/* Main Content Grid */}
            <div className="grid gap-6 md:grid-cols-7">

                {/* Revenue Chart */}

                <PermissionGuard permission="accounting" userPermissions={userPermissions}>
                    <CardWrapper delay={0.2} className="glass-card p-5 rounded-xl col-span-1 md:col-span-4 min-h-[350px] flex flex-col border border-border bg-card">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-lg font-bold text-foreground">Financial Performance</h3>
                                <p className="text-sm text-muted-foreground">Revenue vs Expenses (Q1-Q2)</p>
                            </div>
                            <div className="flex gap-2 text-xs font-semibold">
                                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-primary/40"></span> Revenue</span>
                                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-primary"></span> Profit</span>
                            </div>
                        </div>

                        <div className="flex-1 w-full min-h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={revenueData}>
                                    <defs>
                                        <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#1e293b" stopOpacity={0.1} />
                                            <stop offset="95%" stopColor="#1e293b" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#34d399" stopOpacity={0.1} />
                                            <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--primary)' }} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--primary)' }} tickFormatter={(val) => `₹${val}`} />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '12px', border: '1px solid var(--border)', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.05)', backgroundColor: 'var(--popover)', color: 'var(--foreground)' }}
                                        itemStyle={{ color: 'var(--foreground)' }}
                                        cursor={{ stroke: 'var(--border)' }}
                                    />
                                    <Area type="monotone" dataKey="revenue" stroke="var(--primary)" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                                    <Area type="monotone" dataKey="expenses" stroke="var(--secondary-foreground)" strokeWidth={3} fillOpacity={1} fill="url(#colorExp)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </CardWrapper>
                </PermissionGuard>

                {/* Project Status */}
                <PermissionGuard permission="projects" userPermissions={userPermissions}>
                    <CardWrapper delay={0.3} className="glass-card p-5 rounded-xl col-span-1 md:col-span-3 border border-border bg-card">
                        <div className="mb-4">
                            <h3 className="text-lg font-bold text-foreground">Subsidiary Project Health</h3>
                            <p className="text-sm text-muted-foreground">Completion Ratios</p>
                        </div>
                        <div className="h-[250px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={projectStatusData} layout="vertical" margin={{ left: -20 }}>
                                    <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="var(--border)" />
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={80} tick={{ fontSize: 12, fontWeight: 600, fill: 'var(--primary)' }} />
                                    <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--popover)', color: 'var(--foreground)' }} itemStyle={{ color: 'var(--foreground)' }} />
                                    <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={24}>
                                        {projectStatusData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="mt-4 space-y-3">
                            {[
                                { title: "Gridwise IoT Deployment", sub: "Phase 2 - Mumbai HQA", status: "In Progress", color: "bg-blue-100 text-blue-700" },
                                { title: "RAS Villa Designs", sub: "Waiting Client Approval", status: "Review", color: "bg-amber-100 text-amber-700" }
                            ].map((item, i) => (
                                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-card border border-border">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-muted rounded-lg shadow-sm">
                                            <FolderDot className="w-4 h-4 text-primary" />
                                        </div>
                                        <div>
                                            <h4 className="text-xs font-bold text-foreground">{item.title}</h4>
                                            <p className="text-[10px] text-muted-foreground">{item.sub}</p>
                                        </div>
                                    </div>
                                    <span className={cn("text-[10px] font-bold px-2 py-1 rounded-md", item.color)}>{item.status}</span>
                                </div>
                            ))}
                        </div>
                    </CardWrapper>
                </PermissionGuard>
            </div>

            {/* KPI Performance Operations Grid */}
            <div className="space-y-4 pt-4 border-t border-border/50">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 text-primary rounded-xl">
                        <Target className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-foreground">KPI Operations Status</h2>
                        <p className="text-sm text-muted-foreground">Detailed team performance & individual member contributions</p>
                    </div>
                </div>
                <KPITrackingGrid />
            </div>

            <KPIEntryModal
                isOpen={showKPIModal}
                onClose={() => setShowKPIModal(false)}
                onSubmit={handleKPIAdd}
                subsidiaries={subsidiaries}
                metrics={KPI_METRICS}
                users={MOCK_USERS}
                targets={MOCK_KPI_TARGETS}
            />
        </PageWrapper>
    );
}

