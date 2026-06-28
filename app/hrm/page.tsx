"use client";

import { Users, UserCheck, CalendarDays, UserPlus, Cake, Loader2 } from 'lucide-react';
import { AttendanceHeatmap } from '@/components/hrm/AttendanceHeatmap';
import { PageWrapper, CardWrapper } from '@/components/ui/page-wrapper';
import { StatCard } from '@/components/ui/stat-card';
import { useState, useEffect } from 'react';
import { getHRMDashboardStats } from '@/app/actions/hrm';
import { toast } from 'sonner';

import { Settings, X } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

export default function HRMDashboard() {
    const [stats, setStats] = useState({
        totalEmployees: 0,
        onLeaveToday: 0,
        checkedInToday: 0,
        newJoiners: 0,
        lists: {
            employees: [] as any[],
            absentees: [] as any[],
            checkedIn: [] as any[],
            newJoiners: [] as any[]
        }
    });

    const [activeList, setActiveList] = useState<{ title: string, data: any[] } | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadStats();
    }, []);

    const loadStats = async () => {
        try {
            const res = await getHRMDashboardStats();
            if (res.success && res.data) {
                setStats(res.data);
            }
        } catch (error) {
            toast.error("Failed to load dashboard data");
        } finally {
            setLoading(false);
        }
    };

    const upcomingBirthdays = [
        { id: 1, name: "Rahul Sharma", date: "26 Mar", role: "Sales Manager" },
        { id: 2, name: "Priya Singh", date: "2 Apr", role: "Developer" },
    ];

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-100px)]">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <PageWrapper className="space-y-6">
            <div>
                <h1 className="page-title">HR Dashboard</h1>
                <p className="page-subtitle">Manage workforce, attendance and payroll.</p>
            </div>

            <div className="stat-grid">
                <StatCard label="Total Employees" value={stats.totalEmployees} sub="Active staff" icon={Users} iconColor="text-primary" onClick={() => setActiveList({ title: "Total Employees", data: stats.lists.employees })} />
                <StatCard label="Absentees" value={stats.lists.absentees.length || 0} sub="Not punched in" icon={CalendarDays} iconColor="text-muted-foreground" onClick={() => setActiveList({ title: "Absentees", data: stats.lists.absentees })} />
                <StatCard label="Checked In" value={stats.checkedInToday} sub="Present today" icon={UserCheck} iconColor="text-primary" onClick={() => setActiveList({ title: "Check-in", data: stats.lists.checkedIn })} />
                <StatCard label="New Joiners" value={stats.newJoiners} sub="This month" icon={UserPlus} iconColor="text-green-500" trend="up" onClick={() => setActiveList({ title: "New Joiners", data: stats.lists.newJoiners })} />
            </div>

            <Sheet open={!!activeList} onOpenChange={(open) => !open && setActiveList(null)}>
                <SheetContent className="w-full sm:w-[400px] md:w-[540px]">
                    <SheetHeader>
                        <SheetTitle>{activeList?.title}</SheetTitle>
                        <SheetDescription>
                            Detailed view of {activeList?.title.toLowerCase()} ({activeList?.data.length} found)
                        </SheetDescription>
                    </SheetHeader>
                    <div className="mt-6 space-y-4 max-h-[80vh] overflow-y-auto custom-scrollbar">
                        {activeList?.data.length === 0 ? (
                            <p className="text-center text-sm text-gray-500 p-4 bg-gray-50 rounded-lg">No records found.</p>
                        ) : (
                            activeList?.data.map((user: any, i: number) => (
                                <div key={user._id || i} className="flex items-center gap-3 p-3 bg-white border rounded-lg shadow-sm">
                                    <Avatar className="w-10 h-10">
                                        <AvatarImage src={user.image} />
                                        <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">{user.name?.substring(0, 2).toUpperCase()}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="font-bold text-sm text-gray-900">{user.name}</p>
                                        <p className="text-xs text-gray-500">{user.email}</p>
                                    </div>
                                    <div className="ml-auto flex items-center gap-2">
                                        <span className="text-[10px] uppercase font-bold bg-gray-100 px-2 py-0.5 rounded text-gray-600">
                                            {user.dept || 'General'}
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </SheetContent>
            </Sheet>

            <CardWrapper delay={0.4}>
                <AttendanceHeatmap />
            </CardWrapper>

            <div className="grid gap-6 lg:grid-cols-3">
                {/* Recruitment Pipeline Placeholder */}
                <CardWrapper delay={0.5} className="lg:col-span-2 glass-card p-6 rounded-xl border border-border">
                    <h3 className="text-lg font-bold text-foreground mb-6">Recruitment Pipeline</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 text-center">
                        <div className="p-4 rounded-lg bg-card border border-border hover:bg-primary/5 transition-colors cursor-pointer group">
                            <div className="text-2xl font-bold text-primary mb-1 group-hover:scale-110 transition-transform">12</div>
                            <div className="text-xs font-semibold text-muted-foreground uppercase">Applied</div>
                        </div>
                        <div className="p-4 rounded-lg bg-card border border-border hover:bg-primary/5 transition-colors cursor-pointer group">
                            <div className="text-2xl font-bold text-primary mb-1 group-hover:scale-110 transition-transform">5</div>
                            <div className="text-xs font-semibold text-muted-foreground uppercase">Screening</div>
                        </div>
                        <div className="p-4 rounded-lg bg-card border border-border hover:bg-primary/5 transition-colors cursor-pointer group">
                            <div className="text-2xl font-bold text-primary mb-1 group-hover:scale-110 transition-transform">3</div>
                            <div className="text-xs font-semibold text-muted-foreground uppercase">Interview</div>
                        </div>
                        <div className="p-4 rounded-lg bg-card border border-border hover:bg-primary/5 transition-colors cursor-pointer group">
                            <div className="text-2xl font-bold text-secondary-foreground mb-1 group-hover:scale-110 transition-transform">1</div>
                            <div className="text-xs font-semibold text-muted-foreground uppercase">Offer</div>
                        </div>
                    </div>
                </CardWrapper>

                {/* Upcoming Events / Birthdays */}
                <CardWrapper delay={0.6} className="glass-card p-6 rounded-xl border border-border">
                    <h3 className="text-lg font-bold text-foreground mb-6">Upcoming Events</h3>
                    <div className="space-y-4">
                        {upcomingBirthdays.map((bday) => (
                            <div key={bday.id} className="flex items-center gap-4 p-3 rounded-lg border border-border bg-card hover:bg-muted transition-colors">
                                <div className="p-2 bg-muted text-primary rounded-lg">
                                    <Cake className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="font-semibold text-foreground text-sm">{bday.name}</p>
                                    <p className="text-xs text-muted-foreground">{bday.role} • {bday.date}</p>
                                </div>
                            </div>
                        ))}
                        <div className="p-3 rounded-lg border border-dashed border-border text-center text-xs text-muted-foreground">
                            No other events this week
                        </div>
                    </div>
                </CardWrapper>
            </div>
        </PageWrapper>
    );
}
