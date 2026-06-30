"use client";

import { useState, useEffect, useCallback } from "react";
import {
    format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
    eachDayOfInterval, addMonths, subMonths, addWeeks, subWeeks,
    isSameMonth, isSameDay, isToday, parseISO,
} from "date-fns";
import { ChevronLeft, ChevronRight, Plus, Loader2, Calendar as CalendarIcon, Bell, BellOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getEvents } from "@/app/actions/activity/calendar";
import { getCompanyEventsForUser } from "@/app/actions/company-calendar";
import EventModal from "./EventModal";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const PERSONAL_TYPE_CONFIG: Record<string, { dot: string; bg: string; text: string; border: string; label: string }> = {
    'Meeting':  { label: 'Meeting',  dot: 'bg-sky-500',     bg: 'bg-sky-50',     text: 'text-sky-700',     border: 'border-sky-200' },
    'Task':     { label: 'Task',     dot: 'bg-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
    'Reminder': { label: 'Reminder', dot: 'bg-amber-400',   bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200' },
    'Holiday':  { label: 'Holiday',  dot: 'bg-red-500',     bg: 'bg-red-50',     text: 'text-red-700',     border: 'border-red-200' },
};

const COMPANY_TYPE_STYLE: Record<string, { dot: string; pill: string }> = {
    'National Holiday':     { dot: 'bg-red-500',     pill: 'bg-red-50/80 text-red-600 border-red-200' },
    'State Holiday':        { dot: 'bg-orange-500',  pill: 'bg-orange-50/80 text-orange-700 border-orange-200' },
    'Optional Holiday':     { dot: 'bg-amber-400',   pill: 'bg-amber-50/80 text-amber-700 border-amber-200' },
    'Office Managed Leave': { dot: 'bg-yellow-500',  pill: 'bg-yellow-50/80 text-yellow-700 border-yellow-200' },
    'Client Meeting':       { dot: 'bg-sky-500',     pill: 'bg-sky-50/80 text-sky-700 border-sky-200' },
    'Vendor Meeting':       { dot: 'bg-stone-500',   pill: 'bg-stone-100/80 text-stone-700 border-stone-300' },
    'Internal Meeting':     { dot: 'bg-emerald-500', pill: 'bg-emerald-50/80 text-emerald-700 border-emerald-200' },
    'Leadership Review':    { dot: 'bg-primary',     pill: 'bg-primary/6 text-primary border-primary/20' },
    'Announcement':         { dot: 'bg-yellow-600',  pill: 'bg-yellow-50/80 text-yellow-800 border-yellow-300' },
    'Employee Birthday':    { dot: 'bg-rose-400',    pill: 'bg-rose-50/80 text-rose-700 border-rose-200' },
    'Work Anniversary':     { dot: 'bg-amber-600',   pill: 'bg-amber-50/80 text-amber-800 border-amber-300' },
};

export default function CalendarView() {
    const { data: session } = useSession();
    const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [events, setEvents] = useState<any[]>([]);
    const [companyEvents, setCompanyEvents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
    const [selectedEvent, setSelectedEvent] = useState<any>(undefined);
    const [alertsEnabled, setAlertsEnabled] = useState(true);

    useEffect(() => {
        const saved = localStorage.getItem('earthana_dashboard_alerts');
        if (saved !== null) setAlertsEnabled(saved === 'true');
    }, []);

    const toggleAlerts = () => {
        const next = !alertsEnabled;
        setAlertsEnabled(next);
        localStorage.setItem('earthana_dashboard_alerts', String(next));
        if (next) toast.success("Dashboard notifications enabled");
        else toast.info("Dashboard notifications muted.");
    };

    const fetchEvents = useCallback(async () => {
        setLoading(true);
        let start: Date, end: Date;
        if (viewMode === 'month') {
            start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 });
            end = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 });
        } else {
            start = startOfWeek(currentDate, { weekStartsOn: 1 });
            end = endOfWeek(currentDate, { weekStartsOn: 1 });
        }
        const [res, compRes] = await Promise.all([
            getEvents(start, end),
            session?.user?.id
                ? getCompanyEventsForUser(start, end, session.user.id)
                : Promise.resolve({ success: false, data: [] }),
        ]);
        if (res.success) setEvents(res.data);
        if (compRes.success) setCompanyEvents(compRes.data);
        setLoading(false);
    }, [currentDate, viewMode, session?.user?.id]);

    useEffect(() => { fetchEvents(); }, [fetchEvents]);

    const handleDateClick = (date: Date) => {
        setSelectedDate(date);
        setSelectedEvent(undefined);
        setIsModalOpen(true);
    };

    const handleEventClick = (e: React.MouseEvent, event: any) => {
        e.stopPropagation();
        setSelectedEvent(event);
        setSelectedDate(undefined);
        setIsModalOpen(true);
    };

    // ── Calendar day sets ────────────────────────────────────

    const calendarDays = eachDayOfInterval({
        start: startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 }),
        end: endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 }),
    });

    const weekDays = eachDayOfInterval({
        start: startOfWeek(currentDate, { weekStartsOn: 1 }),
        end: endOfWeek(currentDate, { weekStartsOn: 1 }),
    });

    const displayDays = viewMode === 'month' ? calendarDays : weekDays;

    const getDayEvents = (date: Date) =>
        events.filter(ev => {
            const s = new Date(ev.start);
            const e = ev.end ? new Date(ev.end) : s;
            const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
            const es = new Date(s.getFullYear(), s.getMonth(), s.getDate());
            const ee = new Date(e.getFullYear(), e.getMonth(), e.getDate());
            return d >= es && d <= ee;
        });

    const getDayCompanyEvents = (date: Date) =>
        companyEvents.filter(e => isSameDay(parseISO(e.start), date));

    return (
        <div className="flex flex-col gap-4">

            {/* ── Top bar ── */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                    <CalendarIcon className="w-5 h-5 text-primary" />
                    <div>
                        <h1 className="text-xl font-bold text-foreground leading-tight">My Calendar</h1>
                        <p className="text-xs text-muted-foreground">Tasks · Meetings · Reminders · Company events</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={toggleAlerts}
                        title={alertsEnabled ? "Dashboard Alerts ON" : "Dashboard Alerts OFF"}
                        className={cn(
                            "h-8 w-8 transition-colors",
                            alertsEnabled
                                ? "bg-amber-50 text-amber-600 border-amber-200"
                                : "bg-muted text-muted-foreground border-border"
                        )}
                    >
                        {alertsEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
                    </Button>
                    <div className="flex items-center border border-border rounded-lg overflow-hidden text-xs bg-card h-8">
                        {(['month', 'week'] as const).map(v => (
                            <button
                                key={v}
                                onClick={() => setViewMode(v)}
                                className={cn(
                                    "px-3 h-full capitalize font-medium transition-colors",
                                    viewMode === v ? 'bg-primary text-white' : 'text-muted-foreground hover:text-foreground'
                                )}
                            >
                                {v}
                            </button>
                        ))}
                    </div>
                    <Button
                        onClick={() => handleDateClick(new Date())}
                        size="sm"
                        className="h-8 bg-primary hover:bg-primary/90 shadow-sm shadow-primary/20"
                    >
                        <Plus className="w-3.5 h-3.5 mr-1.5" />New Event
                    </Button>
                </div>
            </div>

            <div className="flex gap-4 items-start">

                {/* ── Left sidebar ── */}
                <div className="w-56 shrink-0 space-y-4">

                    {/* Mini month navigator */}
                    <div className="bg-card border border-border rounded-xl p-3">
                        <div className="flex items-center justify-between mb-3">
                            <button
                                onClick={() => setCurrentDate(subMonths(currentDate, 1))}
                                className="p-1 rounded hover:bg-muted transition-colors"
                            >
                                <ChevronLeft className="w-4 h-4 text-muted-foreground" />
                            </button>
                            <span className="text-sm font-bold text-foreground">{format(currentDate, 'MMMM yyyy')}</span>
                            <button
                                onClick={() => setCurrentDate(addMonths(currentDate, 1))}
                                className="p-1 rounded hover:bg-muted transition-colors"
                            >
                                <ChevronRight className="w-4 h-4 text-muted-foreground" />
                            </button>
                        </div>
                        <div className="grid grid-cols-7 gap-0.5">
                            {DAY_LABELS.map(d => (
                                <div key={d} className="text-center text-[9px] font-bold text-muted-foreground py-1">{d[0]}</div>
                            ))}
                            {calendarDays.map(day => (
                                <button
                                    key={day.toISOString()}
                                    onClick={() => setCurrentDate(day)}
                                    className={cn(
                                        "text-center text-[10px] h-6 w-6 mx-auto rounded-full transition-colors font-medium",
                                        !isSameMonth(day, currentDate) ? 'text-muted-foreground/30' : 'text-foreground',
                                        isToday(day) ? 'bg-primary text-white font-bold' : 'hover:bg-muted',
                                        getDayEvents(day).length > 0 && !isToday(day)
                                            ? 'underline decoration-primary/40 underline-offset-2' : ''
                                    )}
                                >
                                    {format(day, 'd')}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Legend */}
                    <div className="bg-card border border-border rounded-xl p-3">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-2">My Events</p>
                        <div className="space-y-1.5 mb-3">
                            {Object.entries(PERSONAL_TYPE_CONFIG).map(([key, cfg]) => (
                                <div key={key} className="flex items-center gap-2 text-xs text-foreground/80">
                                    <span className={cn("w-2 h-2 rounded-full shrink-0", cfg.dot)} />
                                    <span>{cfg.label}</span>
                                </div>
                            ))}
                        </div>
                        <div className="border-t border-border pt-2.5">
                            <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1.5">Company</p>
                            <p className="text-[10px] text-muted-foreground leading-relaxed">
                                Holidays, meetings &amp; announcements relevant to you appear in muted style.
                            </p>
                        </div>
                    </div>
                </div>

                {/* ── Main calendar grid ── */}
                <div className="flex-1 min-w-0 bg-card border border-border rounded-xl overflow-hidden">

                    {/* Month / week nav header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                        <button
                            onClick={() => viewMode === 'month'
                                ? setCurrentDate(subMonths(currentDate, 1))
                                : setCurrentDate(subWeeks(currentDate, 1))}
                            className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                        >
                            <ChevronLeft className="w-4 h-4 text-muted-foreground" />
                        </button>
                        <div className="text-center">
                            <p className="font-bold text-foreground">
                                {viewMode === 'month'
                                    ? format(currentDate, 'MMMM yyyy')
                                    : `${format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'd MMM')} – ${format(endOfWeek(currentDate, { weekStartsOn: 1 }), 'd MMM yyyy')}`
                                }
                            </p>
                            <button
                                onClick={() => setCurrentDate(new Date())}
                                className="text-[10px] text-primary hover:underline font-medium"
                            >
                                Today
                            </button>
                        </div>
                        <button
                            onClick={() => viewMode === 'month'
                                ? setCurrentDate(addMonths(currentDate, 1))
                                : setCurrentDate(addWeeks(currentDate, 1))}
                            className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                        >
                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        </button>
                    </div>

                    {/* Day-of-week labels */}
                    <div className="grid grid-cols-7 border-b border-border">
                        {DAY_LABELS.map((d, i) => {
                            const isSun = i === 6;
                            return (
                                <div
                                    key={d}
                                    className={cn(
                                        "py-2 text-center text-[10px] font-bold uppercase tracking-wide",
                                        isSun ? 'text-red-400' : 'text-muted-foreground'
                                    )}
                                >
                                    {viewMode === 'week' ? (
                                        <>
                                            <div>{d}</div>
                                            <div className={cn(
                                                "text-base font-bold mt-0.5",
                                                isToday(weekDays[i]) ? 'text-primary' :
                                                isSun ? 'text-red-400' : 'text-foreground'
                                            )}>
                                                {format(weekDays[i], 'd')}
                                            </div>
                                        </>
                                    ) : d}
                                </div>
                            );
                        })}
                    </div>

                    {loading ? (
                        <div className="flex justify-center items-center h-[480px]">
                            <Loader2 className="w-6 h-6 animate-spin text-primary" />
                        </div>
                    ) : (
                        <div className={cn(
                            "grid grid-cols-7",
                            viewMode === 'month' ? 'divide-x divide-y divide-border' : ''
                        )}>
                            {displayDays.map(day => {
                                const dayEvents = getDayEvents(day);
                                const dayCoEvents = getDayCompanyEvents(day);
                                const isCurrentMonth = isSameMonth(day, currentDate);
                                const todayDay = isToday(day);
                                const isSun = day.getDay() === 0;
                                const maxPersonal = viewMode === 'week' ? 6 : 3;

                                return (
                                    <div
                                        key={day.toISOString()}
                                        onClick={() => handleDateClick(day)}
                                        className={cn(
                                            "min-h-[100px] p-1.5 cursor-pointer transition-colors",
                                            viewMode === 'week' ? 'border-r border-b border-border min-h-[300px]' : '',
                                            !isCurrentMonth ? 'bg-muted/20' : 'hover:bg-muted/30',
                                            todayDay ? 'bg-primary/5' : '',
                                            isSun && isCurrentMonth && !todayDay ? 'bg-red-50/30' : '',
                                        )}
                                    >
                                        {/* Date number */}
                                        <div className={cn(
                                            "w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold mb-1 ml-auto",
                                            todayDay ? 'bg-primary text-white' :
                                            !isCurrentMonth ? 'text-muted-foreground/40' :
                                            isSun ? 'text-red-400' : 'text-foreground'
                                        )}>
                                            {format(day, 'd')}
                                        </div>

                                        {/* Events */}
                                        {(isCurrentMonth || viewMode === 'week') && (
                                            <div className="space-y-0.5">
                                                {/* Personal events */}
                                                {dayEvents.slice(0, maxPersonal).map(evt => {
                                                    const cfg = PERSONAL_TYPE_CONFIG[evt.type] || PERSONAL_TYPE_CONFIG['Meeting'];
                                                    return (
                                                        <button
                                                            key={`${evt._id}-${day.toISOString()}`}
                                                            onClick={e => handleEventClick(e, evt)}
                                                            className={cn(
                                                                "w-full text-left text-[10px] font-semibold px-1.5 py-0.5 rounded flex items-center gap-1 truncate border",
                                                                cfg.bg, cfg.text, cfg.border
                                                            )}
                                                            title={evt.title}
                                                        >
                                                            <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", cfg.dot)} />
                                                            <span className="truncate">{evt.title}</span>
                                                        </button>
                                                    );
                                                })}
                                                {dayEvents.length > maxPersonal && (
                                                    <p className="text-[9px] text-muted-foreground pl-1">
                                                        +{dayEvents.length - maxPersonal} more
                                                    </p>
                                                )}
                                                {/* Company events overlay (always show up to 2) */}
                                                {dayCoEvents.slice(0, 2).map(evt => {
                                                    const cfg = COMPANY_TYPE_STYLE[evt.type] || { dot: 'bg-stone-400', pill: 'bg-muted text-muted-foreground border-border' };
                                                    return (
                                                        <div
                                                            key={`co-${evt._id}-${day.toISOString()}`}
                                                            className={cn(
                                                                "text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1 truncate border opacity-75",
                                                                cfg.pill
                                                            )}
                                                            title={`[Company] ${evt.title}`}
                                                        >
                                                            <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", cfg.dot)} />
                                                            <span className="truncate">{evt.title}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            <EventModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                selectedDate={selectedDate}
                event={selectedEvent}
                onRefresh={fetchEvents}
                session={session}
            />
        </div>
    );
}
