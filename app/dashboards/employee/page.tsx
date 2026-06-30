"use client";

import { Calendar, UserCheck, Briefcase, Clock, LogIn, LogOut, Loader2, ChevronRight } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { punchIn, punchOut, getAttendance } from '@/app/actions/hrm';
import { getCompanyEventsForUser } from '@/app/actions/company-calendar';
import { toast } from 'sonner';
import { isToday, format, parseISO } from 'date-fns';
import Link from 'next/link';
import MyKPIs from '@/components/kpi/MyKPIs';
import QuickRequestPanel from '@/components/hrm/QuickRequestPanel';

function getGreeting() {
    const h = new Date().getHours();
    if (h < 12) return 'Good Morning';
    if (h < 17) return 'Good Afternoon';
    return 'Good Evening';
}

export default function EmployeeDashboard() {
    const { data: session } = useSession();
    const userName = session?.user?.name || 'Employee';
    const firstName = userName.split(' ')[0];

    const [greeting, setGreeting] = useState('');
    const [todayLabel, setTodayLabel] = useState('');
    const [isPunchedIn, setIsPunchedIn] = useState(false);
    const [punchTime, setPunchTime] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [attendanceCount, setAttendanceCount] = useState({ present: 0, total: 0 });
    const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);

    useEffect(() => {
        setGreeting(getGreeting());
        setTodayLabel(format(new Date(), 'EEEE, d MMMM yyyy'));
    }, []);
    useEffect(() => { loadData(); }, [session?.user?.id]);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const now = new Date();
            const start = now;
            const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);

            const [attRes, eventsRes] = await Promise.all([
                getAttendance(undefined, now.getMonth(), now.getFullYear()),
                session?.user?.id
                    ? getCompanyEventsForUser(start, end, session.user.id)
                    : Promise.resolve({ success: false, data: [] }),
            ]);

            if (attRes.success && attRes.data) {
                const todayRec = attRes.data.find((r: any) => isToday(new Date(r.date)));
                setIsPunchedIn(!!(todayRec?.punchIn && !todayRec?.punchOut));
                setPunchTime(todayRec?.punchIn ? format(new Date(todayRec.punchIn), 'HH:mm') : null);
                const presentDays = attRes.data.filter((r: any) => r.status === 'Present' || r.punchIn).length;
                setAttendanceCount({ present: presentDays, total: attRes.data.length });
            }

            if (eventsRes.success) {
                const upcoming = eventsRes.data
                    .filter((e: any) => new Date(e.start) >= now)
                    .slice(0, 3);
                setUpcomingEvents(upcoming);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    const handlePunch = async () => {
        setActionLoading(true);
        try {
            const res = isPunchedIn ? await punchOut() : await punchIn();
            if (res.success) {
                if (!isPunchedIn) {
                    setIsPunchedIn(true);
                    setPunchTime(format(new Date((res as any).data.punchIn), 'HH:mm'));
                    toast.success('Punched in successfully');
                } else {
                    setIsPunchedIn(false);
                    setPunchTime(null);
                    toast.success('Punched out successfully');
                }
            } else {
                toast.error((res as any).error || 'Punch failed');
            }
        } catch {
            toast.error('An error occurred');
        } finally {
            setActionLoading(false);
        }
    };

    return (
        <div className="space-y-4">

            {/* ── Header ── */}
            <div className="bg-card border border-border rounded-xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-xl font-bold text-foreground">{greeting}{greeting ? ', ' : ''}{firstName}</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">{todayLabel}</p>
                </div>
                <div className="flex items-center gap-3 bg-muted/50 p-2 rounded-lg">
                    {punchTime && (
                        <div className="text-right hidden md:block">
                            <p className="text-xs text-muted-foreground">Punched in at</p>
                            <p className="font-mono font-bold text-sm text-foreground">{punchTime}</p>
                        </div>
                    )}
                    {punchTime && <div className="h-8 w-px bg-border hidden md:block" />}
                    <button
                        onClick={handlePunch}
                        disabled={actionLoading || isLoading}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-colors disabled:opacity-60 ${isPunchedIn ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-primary text-white hover:bg-primary/90'}`}
                    >
                        {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> :
                            isPunchedIn ? <><LogOut className="w-4 h-4" />Punch Out</> :
                                <><LogIn className="w-4 h-4" />Punch In</>}
                    </button>
                </div>
            </div>

            {/* ── Quick Stats ── */}
            <div className="grid grid-cols-3 gap-3">
                <Link href="/hrm/attendance"
                    className="bg-card border border-border p-4 rounded-xl flex flex-col items-center justify-center text-center hover:border-primary/40 transition-colors group">
                    <div className="p-2.5 bg-sky-50 text-sky-600 rounded-xl mb-2 group-hover:scale-110 transition-transform">
                        <UserCheck className="w-5 h-5" />
                    </div>
                    <p className="text-xs font-semibold text-foreground">Attendance</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                        {isLoading ? '…' : `${attendanceCount.present} days this month`}
                    </p>
                </Link>
                <Link href="/hrm/leave"
                    className="bg-card border border-border p-4 rounded-xl flex flex-col items-center justify-center text-center hover:border-primary/40 transition-colors group">
                    <div className="p-2.5 bg-primary/10 text-primary rounded-xl mb-2 group-hover:scale-110 transition-transform">
                        <Briefcase className="w-5 h-5" />
                    </div>
                    <p className="text-xs font-semibold text-foreground">Requests</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Leave · WFH · Travel</p>
                </Link>
                <Link href="/activity/calendar"
                    className="bg-card border border-border p-4 rounded-xl flex flex-col items-center justify-center text-center hover:border-primary/40 transition-colors group">
                    <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl mb-2 group-hover:scale-110 transition-transform">
                        <Calendar className="w-5 h-5" />
                    </div>
                    <p className="text-xs font-semibold text-foreground">Calendar</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Tasks &amp; events</p>
                </Link>
            </div>

            {/* ── Main content ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

                {/* Left: KPIs */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="bg-card border border-border p-5 rounded-xl">
                        <h3 className="font-bold text-foreground mb-4">My Targets &amp; KPIs</h3>
                        <MyKPIs />
                    </div>
                </div>

                {/* Right: Quick Request + Company Events */}
                <div className="space-y-4">

                    {/* Quick Request Panel */}
                    <QuickRequestPanel />

                    {/* Upcoming company events */}
                    <div className="bg-card border border-border rounded-xl p-4">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                                <Clock className="w-4 h-4 text-primary" />
                                Upcoming Events
                            </h3>
                            <Link href="/dashboards/super-admin/calendar" className="text-[10px] text-primary hover:underline flex items-center gap-0.5">
                                View all <ChevronRight className="w-3 h-3" />
                            </Link>
                        </div>
                        {isLoading ? (
                            <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-primary" /></div>
                        ) : upcomingEvents.length === 0 ? (
                            <p className="text-xs text-muted-foreground text-center py-3">No upcoming events</p>
                        ) : (
                            <div className="space-y-2">
                                {upcomingEvents.map((evt: any) => (
                                    <div key={evt._id} className="flex items-start gap-3">
                                        <div className="text-center bg-primary/8 border border-primary/15 rounded-lg p-2 w-10 shrink-0">
                                            <span className="block text-[9px] font-bold text-muted-foreground uppercase">{format(parseISO(evt.start), 'MMM')}</span>
                                            <span className="block text-sm font-bold text-foreground">{format(parseISO(evt.start), 'd')}</span>
                                        </div>
                                        <div className="min-w-0 pt-1">
                                            <p className="text-xs font-semibold text-foreground truncate">{evt.title}</p>
                                            <p className="text-[10px] text-muted-foreground">{evt.type}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
