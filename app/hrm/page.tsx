"use client";

import { Users, UserCheck, CalendarDays, UserPlus, Cake, Loader2, Building2, Home, Plane, ArrowRight } from 'lucide-react';
import { AttendanceHeatmap } from '@/components/hrm/AttendanceHeatmap';
import { PageWrapper, CardWrapper } from '@/components/ui/page-wrapper';
import { StatCard } from '@/components/ui/stat-card';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getHRMDashboardStats } from '@/app/actions/hrm';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

const PIPELINE_STAGES = [
    { key: 'Applied', color: 'text-slate-600' },
    { key: 'Screening', color: 'text-blue-600' },
    { key: 'Interview', color: 'text-purple-600' },
    { key: 'Selected', color: 'text-emerald-600' },
] as const;

export default function HRMDashboard() {
    const [stats, setStats] = useState<any>({
        totalEmployees: 0,
        onLeaveToday: 0,
        checkedInToday: 0,
        newJoiners: 0,
        workMode: { office: 0, wfh: 0 },
        pipeline: { Applied: 0, Screening: 0, Interview: 0, Selected: 0, Rejected: 0 },
        lists: { employees: [], absentees: [], checkedIn: [], newJoiners: [], onLeave: [], birthdays: [] }
    });

    const [activeList, setActiveList] = useState<{ title: string, data: any[] } | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => { loadStats(); }, []);

    const loadStats = async () => {
        try {
            const res = await getHRMDashboardStats();
            if (res.success && res.data) setStats(res.data);
        } catch {
            toast.error("Failed to load dashboard data");
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-100px)]">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    const { workMode, pipeline, lists } = stats;
    const birthdays: any[] = lists.birthdays || [];
    const attendanceRate = stats.totalEmployees > 0
        ? Math.round((stats.checkedInToday / stats.totalEmployees) * 100)
        : 0;
    const totalPipeline = Object.values(pipeline).reduce((a: number, b: any) => a + b, 0);

    return (
        <PageWrapper className="space-y-6">
            <div>
                <h1 className="page-title">HR Dashboard</h1>
                <p className="page-subtitle">Manage workforce, attendance and payroll.</p>
            </div>

            <div className="stat-grid">
                <StatCard label="Total Employees" value={stats.totalEmployees} sub="Active staff" icon={Users} iconColor="text-primary" onClick={() => setActiveList({ title: "Total Employees", data: lists.employees })} />
                <StatCard label="Checked In" value={stats.checkedInToday} sub={`${attendanceRate}% attendance today`} icon={UserCheck} iconColor="text-emerald-500" onClick={() => setActiveList({ title: "Checked In", data: lists.checkedIn })} />
                <StatCard label="Absentees" value={lists.absentees.length || 0} sub="Not punched in" icon={CalendarDays} iconColor="text-amber-500" onClick={() => setActiveList({ title: "Absentees", data: lists.absentees })} />
                <StatCard label="On Leave" value={stats.onLeaveToday} sub="Approved today" icon={Plane} iconColor="text-blue-500" onClick={() => setActiveList({ title: "On Leave", data: lists.onLeave })} />
            </div>

            {/* Work mode micro-info + New joiners */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <MicroCard
                    icon={Building2} iconClass="text-indigo-600 bg-indigo-50"
                    label="In Office" value={workMode.office}
                    onClick={() => setActiveList({ title: "In Office", data: lists.checkedIn.filter((c: any) => c.workMode !== 'Remote') })}
                />
                <MicroCard
                    icon={Home} iconClass="text-teal-600 bg-teal-50"
                    label="Work From Home" value={workMode.wfh}
                    onClick={() => setActiveList({ title: "Work From Home", data: lists.checkedIn.filter((c: any) => c.workMode === 'Remote') })}
                />
                <MicroCard
                    icon={UserPlus} iconClass="text-green-600 bg-green-50"
                    label="New Joiners" value={stats.newJoiners} sub="This month"
                    onClick={() => setActiveList({ title: "New Joiners", data: lists.newJoiners })}
                />
                <MicroCard
                    icon={Cake} iconClass="text-pink-600 bg-pink-50"
                    label="Upcoming Birthdays" value={birthdays.length} sub="Next 30 days"
                    onClick={() => birthdays.length && setActiveList({ title: "Upcoming Birthdays", data: birthdays })}
                />
            </div>

            <Sheet open={!!activeList} onOpenChange={(open) => !open && setActiveList(null)}>
                <SheetContent className="w-full sm:w-[400px] md:w-[540px] overflow-y-auto">
                    <SheetHeader>
                        <SheetTitle>{activeList?.title}</SheetTitle>
                        <SheetDescription>
                            {activeList?.data.length} {activeList?.data.length === 1 ? 'person' : 'people'}
                        </SheetDescription>
                    </SheetHeader>
                    <div className="mt-6 space-y-2.5">
                        {activeList?.data.length === 0 ? (
                            <p className="text-center text-sm text-muted-foreground p-4 bg-muted/40 rounded-lg">No records found.</p>
                        ) : (
                            activeList?.data.map((user: any, i: number) => (
                                <div key={user._id || i} className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg">
                                    <Avatar className="w-10 h-10">
                                        <AvatarImage src={user.image} />
                                        <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">{user.name?.substring(0, 2).toUpperCase()}</AvatarFallback>
                                    </Avatar>
                                    <div className="min-w-0">
                                        <p className="font-semibold text-sm text-foreground truncate">{user.name}</p>
                                        <p className="text-xs text-muted-foreground truncate">{user.jobTitle || user.email}</p>
                                    </div>
                                    <div className="ml-auto flex items-center gap-2 shrink-0">
                                        {user.days !== undefined ? (
                                            <span className="text-[10px] font-bold bg-pink-50 text-pink-600 px-2 py-0.5 rounded-full">
                                                {user.days === 0 ? 'Today 🎉' : user.days === 1 ? 'Tomorrow' : `in ${user.days}d`}
                                            </span>
                                        ) : user.workMode ? (
                                            <span className={cn("text-[10px] uppercase font-bold px-2 py-0.5 rounded-full",
                                                user.workMode === 'Remote' ? 'bg-teal-50 text-teal-600' : 'bg-indigo-50 text-indigo-600')}>
                                                {user.workMode === 'Remote' ? 'WFH' : 'Office'}
                                            </span>
                                        ) : (
                                            <span className="text-[10px] uppercase font-bold bg-muted px-2 py-0.5 rounded text-muted-foreground">
                                                {user.dept || 'General'}
                                            </span>
                                        )}
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
                {/* Recruitment Pipeline — real data */}
                <CardWrapper delay={0.5} className="lg:col-span-2 glass-card p-6 rounded-xl border border-border">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold text-foreground">Recruitment Pipeline</h3>
                        <Link href="/hrm/interview" className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
                            Manage <ArrowRight className="w-3 h-3" />
                        </Link>
                    </div>
                    {totalPipeline === 0 ? (
                        <div className="py-8 text-center border border-dashed border-border rounded-xl">
                            <p className="text-sm text-muted-foreground mb-2">No candidates in the pipeline yet.</p>
                            <Link href="/hrm/interview" className="text-xs font-semibold text-primary hover:underline">Add your first candidate →</Link>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 text-center">
                            {PIPELINE_STAGES.map(stage => (
                                <Link key={stage.key} href="/hrm/interview"
                                    className="p-4 rounded-lg bg-card border border-border hover:bg-primary/5 hover:border-primary/30 transition-all group">
                                    <div className={cn("text-2xl font-bold mb-1 group-hover:scale-110 transition-transform", stage.color)}>
                                        {pipeline[stage.key] || 0}
                                    </div>
                                    <div className="text-xs font-semibold text-muted-foreground uppercase">{stage.key}</div>
                                </Link>
                            ))}
                        </div>
                    )}
                </CardWrapper>

                {/* Upcoming Birthdays — real data */}
                <CardWrapper delay={0.6} className="glass-card p-6 rounded-xl border border-border">
                    <h3 className="text-lg font-bold text-foreground mb-6">Upcoming Birthdays</h3>
                    <div className="space-y-3">
                        {birthdays.length === 0 ? (
                            <div className="p-4 rounded-lg border border-dashed border-border text-center text-xs text-muted-foreground">
                                No birthdays in the next 30 days
                            </div>
                        ) : birthdays.slice(0, 5).map((b: any, i: number) => (
                            <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:bg-muted transition-colors">
                                <div className="p-2 bg-pink-50 text-pink-600 rounded-lg shrink-0">
                                    <Cake className="w-4 h-4" />
                                </div>
                                <div className="min-w-0">
                                    <p className="font-semibold text-foreground text-sm truncate">{b.name}</p>
                                    <p className="text-xs text-muted-foreground truncate">
                                        {b.jobTitle || b.dept} • {new Date(b.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                                    </p>
                                </div>
                                <span className="ml-auto text-[10px] font-bold bg-pink-50 text-pink-600 px-2 py-0.5 rounded-full shrink-0">
                                    {b.days === 0 ? 'Today' : b.days === 1 ? 'Tomorrow' : `${b.days}d`}
                                </span>
                            </div>
                        ))}
                    </div>
                </CardWrapper>
            </div>
        </PageWrapper>
    );
}

function MicroCard({ icon: Icon, iconClass, label, value, sub, onClick }: {
    icon: any; iconClass: string; label: string; value: number; sub?: string; onClick?: () => void;
}) {
    return (
        <button onClick={onClick}
            className="glass-card p-4 rounded-xl border border-border hover:shadow-md hover:border-primary/30 transition-all text-left flex items-center gap-3">
            <div className={cn("p-2.5 rounded-xl shrink-0", iconClass)}>
                <Icon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
                <p className="text-2xl font-bold text-foreground leading-none">{value}</p>
                <p className="text-xs font-medium text-muted-foreground mt-1 truncate">{label}</p>
                {sub && <p className="text-[10px] text-muted-foreground/70 truncate">{sub}</p>}
            </div>
        </button>
    );
}
