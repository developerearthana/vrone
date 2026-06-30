"use client";

import { useRef, useEffect, useState } from 'react';
import { Calendar as CalendarIcon, Clock, ChevronLeft, ChevronRight, Edit3, FileText, Download, Filter, Loader2 } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, addMonths, subMonths } from 'date-fns';
import { PageWrapper, CardWrapper } from '@/components/ui/page-wrapper';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession } from 'next-auth/react';
import { getAttendance, punchIn, punchOut } from '@/app/actions/hrm';
import { toast } from 'sonner';

export default function AttendancePage() {
    const { data: session } = useSession();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [isLoading, setIsLoading] = useState(true);
    const [isPunchLoading, setIsPunchLoading] = useState(false); // action in-progress
    const [isPunchedIn, setIsPunchedIn] = useState(false);
    const [punchInTime, setPunchInTime] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'calendar' | 'reports'>('calendar');
    const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
    const [clockNow, setClockNow] = useState(new Date());

    // Tick the clock every second
    useEffect(() => {
        const id = setInterval(() => setClockNow(new Date()), 1000);
        return () => clearInterval(id);
    }, []);

    // Load on mount AND whenever month changes.
    // Don't gate on session.user.id — the server action reads session itself.
    useEffect(() => {
        loadAttendance();
    }, [currentDate]);

    const loadAttendance = async () => {
        setIsLoading(true);
        try {
            const res = await getAttendance(undefined, currentDate.getMonth(), currentDate.getFullYear());
            if (res.success) {
                setAttendanceRecords(res.data);
                // Check if already punched in today
                const todayRecord = res.data.find((r: any) => isToday(new Date(r.date)));
                if (todayRecord && todayRecord.punchIn && !todayRecord.punchOut) {
                    setIsPunchedIn(true);
                    setPunchInTime(format(new Date(todayRecord.punchIn), 'HH:mm'));
                } else {
                    setIsPunchedIn(false);
                    setPunchInTime(null);
                }
            }
        } catch (error) {
            toast.error("Failed to load attendance");
        } finally {
            setIsLoading(false);
        }
    };

    const getLocation = (): Promise<{ lat: number; lng: number } | undefined> =>
        new Promise(resolve => {
            if (!navigator.geolocation) return resolve(undefined);
            navigator.geolocation.getCurrentPosition(
                pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
                () => resolve(undefined),
                { timeout: 5000 }
            );
        });

    const handlePunch = async () => {
        setIsPunchLoading(true);
        try {
            if (!isPunchedIn) {
                const location = await getLocation();
                const res = await punchIn(undefined, 'Office', location);
                if (res.success) {
                    setIsPunchedIn(true);
                    setPunchInTime(format(new Date(res.data.punchIn), 'HH:mm'));
                    toast.success(location ? 'Punched in with location ✅' : 'Punched in successfully ✅');
                    loadAttendance();
                } else {
                    toast.error(res.error || 'Punch in failed');
                }
            } else {
                const res = await punchOut();
                if (res.success) {
                    setIsPunchedIn(false);
                    setPunchInTime(null);
                    toast.success('Punched out successfully');
                    loadAttendance();
                } else {
                    toast.error(res.error || 'Punch out failed');
                }
            }
        } catch (error) {
            toast.error('An error occurred');
        } finally {
            setIsPunchLoading(false);
        }
    };

    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

    // Format attendance records for fast lookup
    const attendanceMap = attendanceRecords.reduce((acc: any, rec: any) => {
        const key = format(new Date(rec.date), 'yyyy-MM-dd');
        acc[key] = rec;
        return acc;
    }, {});

    // Mock Calendar Data
    const calendarEvents: Record<string, { type: string, color: string }> = {
        '2026-01-01': { type: 'Holiday', color: 'bg-red-100 text-red-600 border-red-200' },
        '2026-01-26': { type: 'Holiday', color: 'bg-red-100 text-red-600 border-red-200' },
    };


    return (
        <PageWrapper className="space-y-6 max-w-7xl mx-auto p-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-primary tracking-tight">Attendance</h1>
                    <p className="text-muted-foreground mt-1">Track work hours, leaves, and team presence.</p>
                </div>

                <div className="glass-card p-1 rounded-xl flex items-center gap-1 bg-white/50 border border-gray-200">
                    <button
                        onClick={() => setActiveTab('calendar')}
                        className={cn("flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all", activeTab === 'calendar' ? 'bg-white shadow-sm text-primary' : 'text-gray-500 hover:text-gray-900')}
                    >
                        <CalendarIcon className="w-4 h-4" /> Calendar
                    </button>
                    <div className="w-px h-6 bg-white mx-1" />
                    <button
                        onClick={() => setActiveTab('reports')}
                        className={cn("flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all", activeTab === 'reports' ? 'bg-white shadow-sm text-primary' : 'text-gray-500 hover:text-gray-900')}
                    >
                        <FileText className="w-4 h-4" /> Reports
                    </button>
                </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
                {/* Punch Card */}
                <CardWrapper className="glass-card p-6 rounded-2xl flex flex-col justify-between relative overflow-hidden bg-gradient-to-br from-white to-gray-50 border-white/60 shadow-lg">
                    <div className="absolute top-0 right-0 p-8 opacity-5 text-primary">
                        <Clock className="w-40 h-40" />
                    </div>

                    <div className="relative z-10">
                        <div className="flex justify-between items-start">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">Mark Attendance</h2>
                                <p className="text-sm text-gray-500 font-medium mt-1">{format(new Date(), 'EEEE, d MMMM yyyy')}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-3xl font-mono font-bold text-gray-900 tracking-tight">{format(clockNow, 'HH:mm')}</p>
                            </div>
                        </div>

                        <div className="my-10 flex justify-center">
                            <motion.button
                                whileTap={isLoading || isPunchLoading ? {} : { scale: 0.95 }}
                                whileHover={isLoading || isPunchLoading ? {} : { scale: 1.05 }}
                                onClick={handlePunch}
                                disabled={isLoading || isPunchLoading}
                                className={cn(
                                    "w-48 h-48 rounded-full border-[6px] flex flex-col items-center justify-center transition-all shadow-2xl relative group",
                                    isLoading || isPunchLoading
                                        ? "border-gray-200 bg-gray-50 text-gray-400 cursor-wait shadow-gray-100"
                                        : isPunchedIn
                                            ? "border-red-100 bg-gradient-to-br from-red-50 to-red-100 text-red-600 shadow-red-500/20"
                                            : "border-emerald-100 bg-gradient-to-br from-emerald-50 to-emerald-100 text-emerald-600 shadow-emerald-500/20"
                                )}
                            >
                                <span className="absolute inset-0 rounded-full bg-white opacity-0 group-hover:opacity-20 transition-opacity" />
                                {isLoading || isPunchLoading ? (
                                    <>
                                        <Loader2 className="w-10 h-10 animate-spin mb-1" />
                                        <span className="text-xs uppercase font-bold tracking-[0.2em] opacity-60">Loading…</span>
                                    </>
                                ) : (
                                    <>
                                        <span className="text-4xl font-black mb-1 tracking-wider">{isPunchedIn ? 'STOP' : 'START'}</span>
                                        <span className="text-xs uppercase font-bold tracking-[0.2em] opacity-80">{isPunchedIn ? 'Punch Out' : 'Punch In'}</span>
                                    </>
                                )}
                            </motion.button>
                        </div>

                        <AnimatePresence>
                            {isPunchedIn && (
                                <motion.div
                                    key="punch-status"
                                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 10 }}
                                    className="bg-emerald-50/80 backdrop-blur-sm p-4 rounded-xl flex items-center gap-4 border border-emerald-100"
                                >
                                    <div className="p-2 bg-emerald-100 rounded-full text-emerald-600">
                                        <Clock className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-emerald-600 font-bold uppercase tracking-wide">Currently Active</p>
                                        <p className="text-sm font-medium text-emerald-800">Started at <span className="font-bold">{punchInTime}</span></p>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </CardWrapper>

                {/* Calendar Grid */}
                <CardWrapper delay={0.1} className="glass-card p-6 rounded-2xl md:col-span-2 border-white/40 shadow-xl bg-white/40 backdrop-blur-md">
                    <div className="flex items-center justify-between mb-8">
                        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                            {format(currentDate, 'MMMM yyyy')}
                        </h2>
                        <div className="flex gap-2">
                            <Button variant="ghost" size="icon" onClick={() => setCurrentDate(subMonths(currentDate, 1))}>
                                <ChevronLeft className="w-5 h-5" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => setCurrentDate(addMonths(currentDate, 1))}>
                                <ChevronRight className="w-5 h-5" />
                            </Button>
                        </div>
                    </div>

                    <div className="grid grid-cols-7 gap-px bg-white/50 rounded-lg overflow-hidden border border-gray-200/50">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                            <div key={day} className="text-center text-xs font-bold text-gray-500 uppercase tracking-wider py-3 bg-background/80">
                                {day}
                            </div>
                        ))}

                        {Array.from({ length: monthStart.getDay() }).map((_, i) => (
                            <div key={`empty-${i}`} className="h-24 bg-background/30" />
                        ))}

                        {calendarDays.map((day) => {
                            const dateStr = format(day, 'yyyy-MM-dd');
                            const event = calendarEvents[dateStr];
                            const attendance = attendanceMap[dateStr];
                            const isCurrentDay = isToday(day);

                            return (
                                <div key={dateStr} className={cn(
                                    "h-24 p-2 relative bg-white transition-colors hover:bg-background flex flex-col justify-between",
                                    isCurrentDay && "bg-white/30 ring-inset ring-2 ring-primary/20 z-10"
                                )}>
                                    <div className="flex justify-between items-start">
                                        <span className={cn("text-sm font-semibold", isCurrentDay ? "text-primary" : "text-gray-700")}>
                                            {format(day, 'd')}
                                        </span>
                                    </div>

                                    <div className="space-y-1">
                                        {event && (
                                            <div className={cn("text-[10px] px-1.5 py-0.5 rounded font-medium truncate border", event.color)}>
                                                {event.type}
                                            </div>
                                        )}
                                        {attendance && (
                                            <div className={cn("text-[10px] px-1.5 py-0.5 rounded font-medium truncate flex justify-between",
                                                attendance.status === 'Present' ? "bg-emerald-100 text-emerald-700" :
                                                    attendance.status === 'WFH' ? "bg-purple-100 text-purple-700" :
                                                        attendance.status === 'Absent' ? "bg-red-50 text-red-700" : "bg-white"
                                            )}>
                                                <span>{attendance.status === 'Present' ? 'P' : attendance.status === 'WFH' ? 'WFH' : 'A'}</span>
                                                {attendance.punchIn && <span className="opacity-70">{format(new Date(attendance.punchIn), 'HH:mm')}</span>}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </CardWrapper>
            </div>
        </PageWrapper>
    );
}
