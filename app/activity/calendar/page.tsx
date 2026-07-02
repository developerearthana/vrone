"use client";

import { useState, useEffect, useCallback } from 'react';
import {
    format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
    eachDayOfInterval, addMonths, subMonths, isSameMonth, isSameDay,
    isToday, addWeeks, subWeeks, parseISO, addDays, startOfDay,
} from 'date-fns';
import {
    ChevronLeft, ChevronRight, Plus, Loader2, X, Trash2, Edit2,
    Building2, Video, Phone, MapPin, Users, Link2,
    LayoutGrid, List, CalendarRange, Globe, User, Calendar,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/components/ui/toaster';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useSession } from 'next-auth/react';
import { getEvents, createEvent, updateEvent, deleteEvent } from '@/app/actions/activity/calendar';
import {
    getCompanyEvents, getCompanyEventsForUser,
    createCompanyEvent, updateCompanyEvent, deleteCompanyEvent,
} from '@/app/actions/company-calendar';
import { getEmployees } from '@/app/actions/employee';
import { getHolidays, seedHolidays, setHolidayWorkingDay } from '@/app/actions/activity/holidays';
import { holidayTheme } from '@/lib/holiday-themes';
import { dayCellTreatment } from '@/lib/calendar-day-style';
import { DateQuickPick, TimeSelect } from '@/components/ui/date-time-picker';
import { applyDuration, DURATION_CHIPS } from '@/lib/datetime-quick';
import type { CompanyEventType, MeetingMode } from '@/models/CompanyEvent';

// ── Color configs ────────────────────────────────────────────

const PERSONAL_COLORS: Record<string, { label: string; dot: string; bg: string; text: string; border: string }> = {
    'Meeting':  { label: 'Meeting',  dot: 'bg-sky-500',     bg: 'bg-sky-50',     text: 'text-sky-700',     border: 'border-sky-200' },
    'Task':     { label: 'Task',     dot: 'bg-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
    'Reminder': { label: 'Reminder', dot: 'bg-amber-400',   bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200' },
    'Holiday':  { label: 'Holiday',  dot: 'bg-rose-400',    bg: 'bg-rose-50',    text: 'text-rose-600',    border: 'border-rose-200' },
};

const COMPANY_COLORS: Record<string, { label: string; dot: string; bg: string; text: string; border: string }> = {
    'National Holiday':     { label: 'National Holiday',  dot: 'bg-red-500',     bg: 'bg-red-50',     text: 'text-red-700',     border: 'border-red-200' },
    'State Holiday':        { label: 'State Holiday',     dot: 'bg-orange-500',  bg: 'bg-orange-50',  text: 'text-orange-700',  border: 'border-orange-200' },
    'Optional Holiday':     { label: 'Optional Holiday',  dot: 'bg-amber-400',   bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200' },
    'Office Managed Leave': { label: 'OML',               dot: 'bg-yellow-500',  bg: 'bg-yellow-50',  text: 'text-yellow-700',  border: 'border-yellow-200' },
    'Client Meeting':       { label: 'Client Meeting',    dot: 'bg-sky-500',     bg: 'bg-sky-50',     text: 'text-sky-700',     border: 'border-sky-200' },
    'Vendor Meeting':       { label: 'Vendor Meeting',    dot: 'bg-stone-500',   bg: 'bg-stone-100',  text: 'text-stone-700',   border: 'border-stone-300' },
    'Internal Meeting':     { label: 'Internal Meeting',  dot: 'bg-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
    'Leadership Review':    { label: 'Leadership Review', dot: 'bg-primary',     bg: 'bg-primary/8',  text: 'text-primary',     border: 'border-primary/20' },
    'Announcement':         { label: 'Announcement',      dot: 'bg-yellow-600',  bg: 'bg-yellow-50',  text: 'text-yellow-800',  border: 'border-yellow-300' },
    'Employee Birthday':    { label: 'Birthday',          dot: 'bg-rose-400',    bg: 'bg-rose-50',    text: 'text-rose-700',    border: 'border-rose-200' },
    'Work Anniversary':     { label: 'Anniversary',       dot: 'bg-amber-600',   bg: 'bg-amber-50',   text: 'text-amber-800',   border: 'border-amber-300' },
};

const MEETING_TYPES: CompanyEventType[] = ['Client Meeting', 'Vendor Meeting', 'Internal Meeting', 'Leadership Review'];
const HOLIDAY_TYPES: CompanyEventType[] = ['National Holiday', 'State Holiday', 'Optional Holiday', 'Office Managed Leave'];

const MEETING_ICONS: Record<string, React.ReactNode> = {
    'In Person':   <Building2 className="w-3.5 h-3.5" />,
    'Google Meet': <Video className="w-3.5 h-3.5" />,
    'Phone Call':  <Phone className="w-3.5 h-3.5" />,
    'Site Visit':  <MapPin className="w-3.5 h-3.5" />,
};

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const INP = "w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all";

type ViewMode = 'month' | 'week' | 'agenda';

const emptyPersonal = () => ({
    title: '', description: '', type: 'Meeting' as 'Meeting' | 'Task' | 'Reminder' | 'Holiday',
    start: format(new Date(), "yyyy-MM-dd'T'HH:mm"), end: '', location: '',
});

const emptyCompany = () => ({
    title: '', description: '', type: 'Internal Meeting' as CompanyEventType,
    start: format(new Date(), "yyyy-MM-dd'T'HH:mm"), end: '', isAllDay: false,
    meetingMode: 'In Person' as MeetingMode, location: '', meetingLink: '',
    participants: [] as Array<{ refType: 'employee' | 'contact'; refId?: string; name: string; email?: string }>,
});

export default function UnifiedCalendarPage() {
    const { data: session } = useSession();
    const userId = (session?.user as any)?.id as string | undefined;
    const role = ((session?.user as any)?.role || '').toLowerCase();
    const isAdmin = ['admin', 'super-admin', 'manager', 'hr'].some(r => role.includes(r));

    const [view, setView] = useState<ViewMode>('month');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [personalEvents, setPersonalEvents] = useState<any[]>([]);
    const [companyEvents, setCompanyEvents] = useState<any[]>([]);
    const [holidays, setHolidays] = useState<any[]>([]);
    const [employees, setEmployees] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [showPersonal, setShowPersonal] = useState(true);
    const [showCompany, setShowCompany] = useState(true);

    const [detailEvent, setDetailEvent] = useState<any>(null);
    const [showModal, setShowModal] = useState(false);
    const [modalKind, setModalKind] = useState<'personal' | 'company'>('personal');
    const [editingEvent, setEditingEvent] = useState<any>(null);
    const [editingKind, setEditingKind] = useState<'personal' | 'company'>('personal');
    const [saving, setSaving] = useState(false);

    const [pForm, setPForm] = useState(emptyPersonal());
    const [cForm, setCForm] = useState(emptyCompany());
    const [pAllDay, setPAllDay] = useState(false);
    const [pSearch, setPSearch] = useState('');

    // ── Fetch ─────────────────────────────────────────────────

    const fetchAll = useCallback(async () => {
        if (!userId) return;
        setLoading(true);
        const s = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 });
        const e = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 });
        const [pRes, cRes, hRes] = await Promise.all([
            getEvents(s, e),
            isAdmin ? getCompanyEvents(s, e) : getCompanyEventsForUser(s, e, userId),
            getHolidays(s, e),
        ]);
        if (pRes.success) setPersonalEvents(pRes.data);
        if (cRes.success) setCompanyEvents(cRes.data);
        if (hRes.success) setHolidays(hRes.data);
        setLoading(false);
    }, [userId, currentDate, isAdmin]);

    useEffect(() => { fetchAll(); }, [fetchAll]);
    // Seed the Tamil Nadu + National holiday set once, then refresh
    useEffect(() => { seedHolidays().then(r => { if (r.success && r.inserted) fetchAll(); }); }, []); // eslint-disable-line react-hooks/exhaustive-deps
    useEffect(() => { getEmployees().then(e => setEmployees(e || [])).catch(() => setEmployees([])); }, []);

    // ── Day event helpers ──────────────────────────────────────

    const calendarDays = eachDayOfInterval({
        start: startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 }),
        end: endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 }),
    });

    const weekDays = eachDayOfInterval({
        start: startOfWeek(currentDate, { weekStartsOn: 1 }),
        end: endOfWeek(currentDate, { weekStartsOn: 1 }),
    });

    const eventsForDay = (day: Date) => {
        const personal = showPersonal ? personalEvents.filter(ev => {
            const s = startOfDay(new Date(ev.start));
            const e = ev.end ? startOfDay(new Date(ev.end)) : s;
            const d = startOfDay(day);
            return d >= s && d <= e;
        }) : [];
        const company = showCompany ? companyEvents.filter(ev => isSameDay(parseISO(ev.start), day)) : [];
        return { personal, company };
    };

    const holidayForDay = (day: Date) =>
        holidays.find(h => isSameDay(parseISO(h.date), day));

    const toggleHolidayWorking = async (h: any) => {
        const next = !h.isWorkingDay;
        setHolidays(prev => prev.map(x => x._id === h._id ? { ...x, isWorkingDay: next } : x));
        setDetailEvent((d: any) => d && d._id === h._id ? { ...d, isWorkingDay: next } : d);
        const res = await setHolidayWorkingDay(h._id, next);
        if (!res.success) { toast.error(res.error || 'Failed to update'); fetchAll(); }
        else toast.success(next ? `${h.name} marked as a working day` : `${h.name} restored as a holiday`);
    };

    // ── Agenda data ────────────────────────────────────────────

    const agendaDays = eachDayOfInterval({ start: new Date(), end: addDays(new Date(), 60) });
    const agendaItems = agendaDays
        .map(d => ({ day: d, ...eventsForDay(d) }))
        .filter(d => d.personal.length > 0 || d.company.length > 0);

    // ── Modal helpers ──────────────────────────────────────────

    const openCreate = (date?: Date, kind: 'personal' | 'company' = 'personal') => {
        const d = date || new Date();
        const ts = format(d, "yyyy-MM-dd'T'HH:mm");
        setEditingEvent(null);
        setModalKind(kind);
        setPForm({ ...emptyPersonal(), start: ts });
        setCForm({ ...emptyCompany(), start: ts });
        setPAllDay(false);
        setDetailEvent(null);
        setShowModal(true);
    };

    const openEdit = (evt: any, kind: 'personal' | 'company') => {
        setEditingEvent(evt);
        setEditingKind(kind);
        setDetailEvent(null);
        setModalKind(kind);
        if (kind === 'personal') {
            setPForm({
                title: evt.title, description: evt.description || '', type: evt.type || 'Meeting',
                start: evt.start ? format(parseISO(evt.start), "yyyy-MM-dd'T'HH:mm") : format(new Date(), "yyyy-MM-dd'T'HH:mm"),
                end: evt.end ? format(parseISO(evt.end), "yyyy-MM-dd'T'HH:mm") : '',
                location: evt.location || '',
            });
            setPAllDay(!!evt.isAllDay);
        } else {
            setCForm({
                title: evt.title, description: evt.description || '', type: evt.type,
                start: evt.start ? format(parseISO(evt.start), "yyyy-MM-dd'T'HH:mm") : format(new Date(), "yyyy-MM-dd'T'HH:mm"),
                end: evt.end ? format(parseISO(evt.end), "yyyy-MM-dd'T'HH:mm") : '',
                isAllDay: !!evt.isAllDay,
                meetingMode: evt.meetingMode || 'In Person',
                location: evt.location || '', meetingLink: evt.meetingLink || '',
                participants: evt.participants || [],
            });
        }
        setShowModal(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (modalKind === 'personal') {
                const pIsAllDay = pForm.type === 'Holiday' || pAllDay;
                const pStart = pIsAllDay ? `${pForm.start.split('T')[0]}T00:00` : pForm.start;
                const payload: any = {
                    title: pForm.title, description: pForm.description,
                    type: pForm.type, start: pStart,
                    end: pIsAllDay ? undefined : (pForm.end || undefined), location: pForm.location,
                    recurrence: { frequency: 'None', interval: 1 },
                };
                const res = editingEvent && editingKind === 'personal'
                    ? await updateEvent(editingEvent._id, payload)
                    : await createEvent(payload);
                if (res.success) { toast.success(editingEvent ? 'Event updated' : 'Event created'); setShowModal(false); fetchAll(); }
                else toast.error(res.error || 'Failed to save');
            } else {
                const cIsAllDay = HOLIDAY_TYPES.includes(cForm.type) || cForm.isAllDay;
                const cStart = cIsAllDay ? `${cForm.start.split('T')[0]}T00:00` : cForm.start;
                const payload = { ...cForm, isAllDay: cIsAllDay, start: cStart, end: cIsAllDay ? undefined : (cForm.end || undefined) };
                const res = editingEvent && editingKind === 'company'
                    ? await updateCompanyEvent(editingEvent._id, payload)
                    : await createCompanyEvent(payload);
                if (res.success) { toast.success(editingEvent ? 'Event updated' : 'Event created'); setShowModal(false); fetchAll(); }
                else toast.error(res.error || 'Failed to save');
            }
        } catch { toast.error('An error occurred'); }
        setSaving(false);
    };

    const handleDelete = async () => {
        if (!detailEvent) return;
        if (!confirm('Delete this event?')) return;
        const res = detailEvent._isCompany
            ? await deleteCompanyEvent(detailEvent._id)
            : await deleteEvent(detailEvent._id);
        if (res.success) { toast.success('Deleted'); setDetailEvent(null); fetchAll(); }
        else toast.error(res.error || 'Failed');
    };

    const filteredEmployees = employees.filter(emp =>
        pSearch.length > 1 &&
        !cForm.participants.some(p => p.refId === emp._id) &&
        (emp.name.toLowerCase().includes(pSearch.toLowerCase()) ||
            (emp.email || '').toLowerCase().includes(pSearch.toLowerCase()))
    );

    const isMeetingType = (t: string) => MEETING_TYPES.includes(t as CompanyEventType);

    // ── Shared pill renderer ───────────────────────────────────

    const renderPill = (evt: any, isCompany: boolean, dayKey: string) => {
        const cfg = isCompany
            ? (COMPANY_COLORS[evt.type] || { dot: 'bg-stone-400', bg: 'bg-muted', text: 'text-muted-foreground', border: 'border-border' })
            : (PERSONAL_COLORS[evt.type] || PERSONAL_COLORS['Meeting']);
        return (
            <button
                key={`${isCompany ? 'co' : 'pe'}-${evt._id}-${dayKey}`}
                onClick={e => { e.stopPropagation(); setDetailEvent({ ...evt, _isCompany: isCompany }); }}
                className={cn(
                    "w-full text-left text-[10px] font-semibold px-1.5 py-0.5 rounded-md flex items-center gap-1 truncate border transition-all hover:brightness-95",
                    cfg.bg, cfg.text, cfg.border,
                    isCompany ? 'opacity-75' : '',
                )}
                title={evt.title}
            >
                <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", cfg.dot)} />
                <span className="truncate">{evt.title}</span>
            </button>
        );
    };

    // ── Render ─────────────────────────────────────────────────

    return (
        <div className="flex flex-col gap-0 h-full">

            {/* ── Top bar ── */}
            <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
                <div>
                    <h1 className="text-xl font-bold text-foreground leading-tight">Calendar</h1>
                    <p className="text-xs text-muted-foreground mt-0.5">Company · Personal · Meetings · Holidays</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <button
                        onClick={() => setCurrentDate(new Date())}
                        className="h-8 px-3 text-xs font-semibold border border-border rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    >
                        Today
                    </button>
                    <div className="flex items-center border border-border rounded-lg overflow-hidden text-xs bg-card h-8">
                        {([
                            { id: 'month' as ViewMode, icon: LayoutGrid, label: 'Month' },
                            { id: 'week' as ViewMode, icon: CalendarRange, label: 'Week' },
                            { id: 'agenda' as ViewMode, icon: List, label: 'Agenda' },
                        ]).map(({ id, icon: Icon, label }) => (
                            <button
                                key={id}
                                onClick={() => setView(id)}
                                className={cn(
                                    "px-3 h-full flex items-center gap-1.5 font-medium transition-colors",
                                    view === id ? 'bg-primary text-white' : 'text-muted-foreground hover:text-foreground'
                                )}
                            >
                                <Icon className="w-3 h-3" />
                                <span className="hidden sm:inline">{label}</span>
                            </button>
                        ))}
                    </div>
                    {isAdmin && (
                        <Button
                            onClick={() => openCreate(undefined, 'company')}
                            size="sm"
                            variant="outline"
                            className="h-8 border-primary/30 text-primary hover:bg-primary/5"
                        >
                            <Globe className="w-3.5 h-3.5 mr-1.5" />Company Event
                        </Button>
                    )}
                    <Button
                        onClick={() => openCreate()}
                        size="sm"
                        className="h-8 bg-primary hover:bg-primary/90 shadow-sm shadow-primary/20"
                    >
                        <Plus className="w-3.5 h-3.5 mr-1.5" />New Event
                    </Button>
                </div>
            </div>

            <div className="flex gap-4 items-start">

                {/* ── Left sidebar ── */}
                <div className="w-52 shrink-0 space-y-3">

                    {/* Mini month navigator */}
                    <div className="bg-card border border-border rounded-xl p-3">
                        <div className="flex items-center justify-between mb-2.5">
                            <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-1 rounded hover:bg-muted transition-colors">
                                <ChevronLeft className="w-4 h-4 text-muted-foreground" />
                            </button>
                            <span className="text-xs font-bold text-foreground">{format(currentDate, 'MMMM yyyy')}</span>
                            <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-1 rounded hover:bg-muted transition-colors">
                                <ChevronRight className="w-4 h-4 text-muted-foreground" />
                            </button>
                        </div>
                        <div className="grid grid-cols-7 gap-0.5">
                            {DAY_LABELS.map(d => (
                                <div key={d} className="text-center text-[9px] font-bold text-muted-foreground py-0.5">{d[0]}</div>
                            ))}
                            {calendarDays.map(day => {
                                const { personal, company } = eventsForDay(day);
                                const hasEvents = personal.length > 0 || company.length > 0;
                                return (
                                    <button
                                        key={day.toISOString()}
                                        onClick={() => setCurrentDate(day)}
                                        className={cn(
                                            "relative text-center text-[10px] h-6 w-6 mx-auto rounded-full transition-colors font-medium",
                                            !isSameMonth(day, currentDate) ? 'text-muted-foreground/30' : 'text-foreground',
                                            isToday(day) ? 'bg-primary text-white font-bold' : 'hover:bg-muted',
                                        )}
                                    >
                                        {format(day, 'd')}
                                        {hasEvents && !isToday(day) && (
                                            <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary/40" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Layer toggles */}
                    <div className="bg-card border border-border rounded-xl p-3 space-y-2.5">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">My Calendars</p>

                        <button onClick={() => setShowPersonal(v => !v)} className="flex items-center gap-2.5 w-full group">
                            <div className={cn(
                                "w-4 h-4 rounded border-2 flex items-center justify-center transition-all shrink-0",
                                showPersonal ? 'bg-sky-500 border-sky-500' : 'bg-transparent border-muted-foreground/40'
                            )}>
                                {showPersonal && (
                                    <svg viewBox="0 0 10 8" className="w-2.5 h-2.5 text-white">
                                        <path stroke="currentColor" strokeWidth="1.8" fill="none" d="M1 4L4 7L9 1" />
                                    </svg>
                                )}
                            </div>
                            <span className="text-xs text-foreground font-medium group-hover:text-primary transition-colors">My Events</span>
                        </button>

                        <button onClick={() => setShowCompany(v => !v)} className="flex items-center gap-2.5 w-full group">
                            <div className={cn(
                                "w-4 h-4 rounded border-2 flex items-center justify-center transition-all shrink-0",
                                showCompany ? 'bg-red-500 border-red-500' : 'bg-transparent border-muted-foreground/40'
                            )}>
                                {showCompany && (
                                    <svg viewBox="0 0 10 8" className="w-2.5 h-2.5 text-white">
                                        <path stroke="currentColor" strokeWidth="1.8" fill="none" d="M1 4L4 7L9 1" />
                                    </svg>
                                )}
                            </div>
                            <span className="text-xs text-foreground font-medium group-hover:text-primary transition-colors">Company Calendar</span>
                        </button>
                    </div>

                    {/* Legend */}
                    <div className="bg-card border border-border rounded-xl p-3">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-2">Legend</p>
                        <p className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground/60 mb-1.5">Personal</p>
                        <div className="space-y-1.5">
                            {Object.entries(PERSONAL_COLORS).map(([key, cfg]) => (
                                <div key={key} className="flex items-center gap-2 text-xs text-foreground/70">
                                    <span className={cn("w-2 h-2 rounded-full shrink-0", cfg.dot)} />
                                    <span>{cfg.label}</span>
                                </div>
                            ))}
                        </div>
                        <div className="border-t border-border pt-1.5 mt-2">
                            <p className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground/60 mb-1.5">Company</p>
                            <div className="space-y-1.5">
                                {Object.entries(COMPANY_COLORS)
                                    .filter(([k]) => ['National Holiday', 'Internal Meeting', 'Announcement', 'Employee Birthday', 'Leadership Review'].includes(k))
                                    .map(([key, cfg]) => (
                                        <div key={key} className="flex items-center gap-2 text-xs text-foreground/70">
                                            <span className={cn("w-2 h-2 rounded-full shrink-0", cfg.dot)} />
                                            <span className="truncate">{cfg.label}</span>
                                        </div>
                                    ))}
                            </div>
                        </div>
                    </div>

                    {/* Upcoming events */}
                    <div className="bg-card border border-border rounded-xl p-3">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-2.5">Upcoming</p>
                        {(() => {
                            const items = eachDayOfInterval({ start: new Date(), end: addDays(new Date(), 7) })
                                .flatMap(d => {
                                    const { personal, company } = eventsForDay(d);
                                    return [
                                        ...personal.map((ev: any) => ({ ...ev, _day: d, _isCompany: false })),
                                        ...company.map((ev: any) => ({ ...ev, _day: d, _isCompany: true })),
                                    ];
                                })
                                .slice(0, 5);
                            if (items.length === 0) return (
                                <p className="text-[10px] text-muted-foreground text-center py-2">No upcoming events</p>
                            );
                            return (
                                <div className="space-y-2">
                                    {items.map((ev: any, i: number) => {
                                        const cfg = ev._isCompany
                                            ? (COMPANY_COLORS[ev.type] || { dot: 'bg-stone-400' })
                                            : (PERSONAL_COLORS[ev.type] || PERSONAL_COLORS['Meeting']);
                                        return (
                                            <div key={i} className="flex items-start gap-2">
                                                <span className={cn("w-1.5 h-1.5 rounded-full mt-1.5 shrink-0", cfg.dot)} />
                                                <div className="min-w-0">
                                                    <p className="text-[11px] font-semibold text-foreground truncate">{ev.title}</p>
                                                    <p className="text-[9px] text-muted-foreground">
                                                        {format(ev._day, 'EEE d MMM')}
                                                        {!ev.isAllDay && ev.start && ` · ${format(parseISO(ev.start), 'h:mm a')}`}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            );
                        })()}
                    </div>
                </div>

                {/* ── Main area ── */}
                <div className="flex-1 min-w-0">
                    {view === 'agenda' ? (

                        /* ── Agenda view ── */
                        <div className="bg-card border border-border rounded-xl overflow-hidden">
                            <div className="px-4 py-3 border-b border-border">
                                <p className="font-bold text-foreground text-sm">Upcoming — Next 60 days</p>
                            </div>
                            {loading ? (
                                <div className="flex justify-center items-center h-64">
                                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                                </div>
                            ) : agendaItems.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                                    <Calendar className="w-10 h-10 mb-3 opacity-20" />
                                    <p className="text-sm font-medium">No events in the next 60 days</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-border">
                                    {agendaItems.map(({ day, personal, company }) => (
                                        <div key={day.toISOString()} className="flex">
                                            <div className={cn(
                                                "w-20 shrink-0 flex flex-col items-center justify-start py-3 px-2 border-r border-border",
                                                isToday(day) ? 'bg-primary/5' : ''
                                            )}>
                                                <span className={cn("text-[9px] font-bold uppercase tracking-wide", isToday(day) ? 'text-primary' : 'text-muted-foreground')}>
                                                    {format(day, 'EEE')}
                                                </span>
                                                <span className={cn("text-2xl font-bold leading-none mt-0.5", isToday(day) ? 'text-primary' : 'text-foreground')}>
                                                    {format(day, 'd')}
                                                </span>
                                                <span className="text-[9px] text-muted-foreground mt-0.5">{format(day, 'MMM')}</span>
                                            </div>
                                            <div className="flex-1 py-3 px-4 space-y-1.5">
                                                {personal.map((ev: any) => {
                                                    const cfg = PERSONAL_COLORS[ev.type] || PERSONAL_COLORS['Meeting'];
                                                    return (
                                                        <button
                                                            key={ev._id}
                                                            onClick={() => setDetailEvent({ ...ev, _isCompany: false })}
                                                            className={cn("w-full text-left flex items-center gap-3 px-3 py-2 rounded-lg border transition-all hover:brightness-95", cfg.bg, cfg.border)}
                                                        >
                                                            <span className={cn("w-2 h-5 rounded-full shrink-0", cfg.dot)} />
                                                            <div className="min-w-0 flex-1">
                                                                <p className={cn("text-xs font-semibold truncate", cfg.text)}>{ev.title}</p>
                                                                {ev.start && (
                                                                    <p className="text-[10px] text-muted-foreground">
                                                                        {ev.isAllDay ? 'All day' : `${format(parseISO(ev.start), 'h:mm a')}${ev.end ? ` – ${format(parseISO(ev.end), 'h:mm a')}` : ''}`}
                                                                    </p>
                                                                )}
                                                            </div>
                                                            <span className={cn("text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border shrink-0", cfg.bg, cfg.text, cfg.border)}>{cfg.label}</span>
                                                        </button>
                                                    );
                                                })}
                                                {company.map((ev: any) => {
                                                    const cfg = COMPANY_COLORS[ev.type] || { dot: 'bg-stone-400', bg: 'bg-muted', text: 'text-muted-foreground', border: 'border-border', label: ev.type };
                                                    return (
                                                        <button
                                                            key={`co-${ev._id}`}
                                                            onClick={() => setDetailEvent({ ...ev, _isCompany: true })}
                                                            className={cn("w-full text-left flex items-center gap-3 px-3 py-2 rounded-lg border transition-all hover:brightness-95 opacity-80", cfg.bg, cfg.border)}
                                                        >
                                                            <Globe className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                                                            <div className="min-w-0 flex-1">
                                                                <p className={cn("text-xs font-semibold truncate", cfg.text)}>{ev.title}</p>
                                                                {ev.start && !ev.isAllDay && (
                                                                    <p className="text-[10px] text-muted-foreground">
                                                                        {format(parseISO(ev.start), 'h:mm a')}{ev.end ? ` – ${format(parseISO(ev.end), 'h:mm a')}` : ''}
                                                                    </p>
                                                                )}
                                                                {ev.isAllDay && <p className="text-[10px] text-muted-foreground">All day</p>}
                                                            </div>
                                                            <span className={cn("text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border shrink-0", cfg.bg, cfg.text, cfg.border)}>{cfg.label}</span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                    ) : (

                        /* ── Month / Week grid ── */
                        <div className="bg-card border border-border rounded-xl overflow-hidden">
                            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                                <button
                                    onClick={() => view === 'month' ? setCurrentDate(subMonths(currentDate, 1)) : setCurrentDate(subWeeks(currentDate, 1))}
                                    className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                                >
                                    <ChevronLeft className="w-4 h-4 text-muted-foreground" />
                                </button>
                                <p className="font-bold text-foreground text-sm">
                                    {view === 'month'
                                        ? format(currentDate, 'MMMM yyyy')
                                        : `${format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'd MMM')} – ${format(endOfWeek(currentDate, { weekStartsOn: 1 }), 'd MMM yyyy')}`
                                    }
                                </p>
                                <button
                                    onClick={() => view === 'month' ? setCurrentDate(addMonths(currentDate, 1)) : setCurrentDate(addWeeks(currentDate, 1))}
                                    className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                                >
                                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                </button>
                            </div>

                            {/* Day-of-week labels */}
                            <div className="grid grid-cols-7 border-b border-border bg-muted/20">
                                {DAY_LABELS.map((d, i) => (
                                    <div key={d} className="py-2 text-center">
                                        <span className={cn("text-[10px] font-bold uppercase tracking-wide", i === 6 ? 'text-red-400' : 'text-muted-foreground')}>{d}</span>
                                        {view === 'week' && weekDays[i] && (
                                            <div className={cn("text-xl font-bold mt-0.5 leading-none", isToday(weekDays[i]) ? 'text-primary' : i === 6 ? 'text-red-400' : 'text-foreground')}>
                                                {format(weekDays[i], 'd')}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {loading ? (
                                <div className="flex justify-center items-center h-[480px]">
                                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                                </div>
                            ) : (
                                <div className="grid grid-cols-7 divide-x divide-y divide-border">
                                    {(view === 'month' ? calendarDays : weekDays).map(day => {
                                        const { personal, company } = eventsForDay(day);
                                        const isCurrentMonth = isSameMonth(day, currentDate);
                                        const todayDay = isToday(day);
                                        const limit = view === 'week' ? 10 : 3;
                                        const overflow = Math.max(0, (personal.length + company.length) - limit);
                                        const shownPersonal = personal.slice(0, limit);
                                        const shownCompany = company.slice(0, Math.max(0, limit - personal.length));
                                        const dayKey = day.toISOString();

                                        const holiday = holidayForDay(day);
                                        const activeHoliday = holiday && !holiday.isWorkingDay ? holiday : null;
                                        const theme = activeHoliday ? holidayTheme(activeHoliday.theme) : null;
                                        const treatment = dayCellTreatment(day, holiday ?? null);

                                        return (
                                            <div
                                                key={dayKey}
                                                onClick={() => openCreate(day)}
                                                className={cn(
                                                    "cursor-pointer transition-colors relative",
                                                    view === 'week' ? 'min-h-[280px]' : 'min-h-[100px]',
                                                    !isCurrentMonth && view === 'month' ? 'bg-muted/20' : '',
                                                    treatment.kind !== 'normal' ? treatment.cellClass :
                                                        todayDay ? 'bg-primary/[0.03]' : 'hover:bg-muted/20',
                                                )}
                                            >
                                                <div className="flex justify-between items-center p-1.5 pb-0.5">
                                                    {activeHoliday
                                                        ? <span className={cn(treatment.kind === 'festival' && 'festival-emoji', "text-sm leading-none select-none")} title={activeHoliday.name}>{theme?.emoji}</span>
                                                        : holiday?.isWorkingDay
                                                            ? <span className="text-[8px] font-bold uppercase tracking-wide text-emerald-600/70">Working</span>
                                                            : <span />}
                                                    <span className={cn(
                                                        "w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold",
                                                        todayDay ? 'bg-primary text-white shadow-sm shadow-primary/30' :
                                                        !isCurrentMonth ? 'text-muted-foreground/40' :
                                                        treatment.dateNumClass
                                                    )}>
                                                        {format(day, 'd')}
                                                    </span>
                                                </div>
                                                {(isCurrentMonth || view === 'week') && (
                                                    <div className="px-1 pb-1 space-y-0.5">
                                                        {/* Full-day holiday ribbon — spans the cell, distinct from events/todos */}
                                                        {holiday && (
                                                            <button
                                                                onClick={e => { e.stopPropagation(); setDetailEvent({ ...holiday, _isHoliday: true }); }}
                                                                className={cn(
                                                                    "w-full flex items-center gap-1 px-1.5 py-1 rounded-md text-[10px] font-bold leading-tight text-left",
                                                                    holiday.isWorkingDay ? 'bg-muted text-muted-foreground line-through decoration-1'
                                                                        : treatment.ribbonClass ?? 'bg-red-500 text-white',
                                                                    !holiday.isWorkingDay && 'shadow-sm'
                                                                )}
                                                                title={holiday.isWorkingDay ? `${holiday.name} (working day)` : holiday.name}
                                                            >
                                                                <span className="truncate">{holiday.name}</span>
                                                            </button>
                                                        )}
                                                        {shownPersonal.map((ev: any) => renderPill(ev, false, dayKey))}
                                                        {shownCompany.map((ev: any) => renderPill(ev, true, dayKey))}
                                                        {overflow > 0 && (
                                                            <p className="text-[9px] text-muted-foreground pl-2 font-medium">+{overflow} more</p>
                                                        )}
                                                    </div>
                                                )}
                                                {treatment.caption && (isCurrentMonth || view === 'week') && (
                                                    <span className="absolute bottom-0.5 left-0 right-0 text-center text-[7.5px] font-extrabold uppercase tracking-widest text-rose-400 pointer-events-none">
                                                        {treatment.caption}
                                                    </span>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* ── Detail popover ── */}
            {detailEvent && (
                <div className="fixed inset-0 z-40 flex items-center justify-center p-4" onClick={() => setDetailEvent(null)}>
                    <div className="absolute inset-0 bg-black/25 backdrop-blur-[2px]" />
                    <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm p-5 space-y-3" onClick={e => e.stopPropagation()}>
                        {detailEvent._isHoliday ? (() => {
                            const th = holidayTheme(detailEvent.theme);
                            const working = detailEvent.isWorkingDay;
                            return (
                                <>
                                    <div className="flex items-center justify-between">
                                        <span className={cn("inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full text-white", working ? 'bg-emerald-600' : th.chip)}>
                                            {working ? 'Working Day' : `${detailEvent.type} Holiday`}
                                        </span>
                                        <button onClick={() => setDetailEvent(null)} className="p-1 rounded-lg hover:bg-muted text-muted-foreground">
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <div className="flex items-start gap-2.5">
                                        <span className="text-2xl leading-none">{th.emoji}</span>
                                        <div>
                                            <h3 className="font-bold text-foreground text-base leading-snug">{detailEvent.name}</h3>
                                            <p className="text-xs text-muted-foreground mt-0.5">
                                                {format(parseISO(detailEvent.date), 'EEEE, dd MMMM yyyy')} · {detailEvent.region}
                                            </p>
                                        </div>
                                    </div>
                                    {working
                                        ? <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">This holiday has been switched to a regular working day.</p>
                                        : <p className="text-xs text-muted-foreground">🎉 Full-day holiday — office closed.</p>}
                                    {isAdmin ? (
                                        <div className="pt-2 border-t border-border">
                                            <button
                                                onClick={() => toggleHolidayWorking(detailEvent)}
                                                className={cn("w-full text-xs font-semibold py-2 rounded-lg transition-colors",
                                                    working ? 'bg-primary text-white hover:bg-primary/90' : 'bg-emerald-600 text-white hover:bg-emerald-700')}
                                            >
                                                {working ? 'Restore as Holiday' : 'Switch to Working Day'}
                                            </button>
                                        </div>
                                    ) : (
                                        <p className="text-[10px] text-muted-foreground/70 pt-1">Only admins can change holiday status.</p>
                                    )}
                                </>
                            );
                        })() : (() => {
                            const isComp = !!detailEvent._isCompany;
                            const cfg = isComp
                                ? (COMPANY_COLORS[detailEvent.type] || { dot: 'bg-stone-400', bg: 'bg-muted', text: 'text-muted-foreground', border: 'border-border', label: detailEvent.type })
                                : (PERSONAL_COLORS[detailEvent.type] || PERSONAL_COLORS['Meeting']);
                            return (
                                <>
                                    <div className="flex items-center justify-between">
                                        <span className={cn("inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border", cfg.bg, cfg.text, cfg.border)}>
                                            <span className={cn("w-1.5 h-1.5 rounded-full", cfg.dot)} />
                                            {cfg.label}
                                            {isComp && <Globe className="w-2.5 h-2.5 ml-0.5 opacity-60" />}
                                        </span>
                                        <button onClick={() => setDetailEvent(null)} className="p-1 rounded-lg hover:bg-muted text-muted-foreground">
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-foreground text-base leading-snug">{detailEvent.title}</h3>
                                        {detailEvent.description && <p className="text-sm text-muted-foreground mt-1">{detailEvent.description}</p>}
                                    </div>
                                    <div className="text-xs text-muted-foreground space-y-1">
                                        {detailEvent.isAllDay
                                            ? <p>📅 All day</p>
                                            : detailEvent.start && (
                                                <p>{format(parseISO(detailEvent.start), 'EEE, dd MMM yyyy · h:mm a')}{detailEvent.end ? ` → ${format(parseISO(detailEvent.end), 'h:mm a')}` : ''}</p>
                                            )
                                        }
                                        {detailEvent.location && <p>📍 {detailEvent.location}</p>}
                                        {detailEvent.meetingMode && (
                                            <div className="flex items-center gap-1.5">
                                                {MEETING_ICONS[detailEvent.meetingMode]}
                                                <span>{detailEvent.meetingMode}</span>
                                                {detailEvent.meetingLink && (
                                                    <a href={detailEvent.meetingLink} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="ml-1 text-sky-600 hover:underline flex items-center gap-0.5">
                                                        <Link2 className="w-3 h-3" />Join
                                                    </a>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    {detailEvent.participants?.length > 0 && (
                                        <div>
                                            <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1.5">Participants</p>
                                            <div className="flex flex-wrap gap-1.5">
                                                {detailEvent.participants.map((p: any, i: number) => (
                                                    <span key={i} className="inline-flex items-center gap-1 text-xs bg-muted text-foreground px-2 py-0.5 rounded-full">
                                                        <Users className="w-2.5 h-2.5 text-muted-foreground" />{p.name}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    <div className="flex items-center justify-between pt-2 border-t border-border">
                                        {(isAdmin || !detailEvent._isCompany) && (
                                            <button onClick={handleDelete} className="text-xs text-red-600 hover:text-red-700 flex items-center gap-1 font-medium">
                                                <Trash2 className="w-3.5 h-3.5" />Delete
                                            </button>
                                        )}
                                        {(isAdmin || !detailEvent._isCompany) && (
                                            <button
                                                onClick={() => openEdit(detailEvent, detailEvent._isCompany ? 'company' : 'personal')}
                                                className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 font-medium ml-auto"
                                            >
                                                <Edit2 className="w-3.5 h-3.5" />Edit
                                            </button>
                                        )}
                                    </div>
                                </>
                            );
                        })()}
                    </div>
                </div>
            )}

            {/* ── Create / Edit modal ── */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
                    <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" />
                    <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-5 pb-4 border-b border-border sticky top-0 bg-card z-10">
                            <div className="flex items-center gap-2.5">
                                {isAdmin && !editingEvent && (
                                    <div className="flex items-center border border-border rounded-lg overflow-hidden text-xs h-7 bg-muted/30">
                                        <button
                                            onClick={() => setModalKind('personal')}
                                            className={cn("px-2.5 h-full flex items-center gap-1 font-medium transition-colors", modalKind === 'personal' ? 'bg-primary text-white' : 'text-muted-foreground hover:text-foreground')}
                                        >
                                            <User className="w-3 h-3" />Personal
                                        </button>
                                        <button
                                            onClick={() => setModalKind('company')}
                                            className={cn("px-2.5 h-full flex items-center gap-1 font-medium transition-colors", modalKind === 'company' ? 'bg-primary text-white' : 'text-muted-foreground hover:text-foreground')}
                                        >
                                            <Globe className="w-3 h-3" />Company
                                        </button>
                                    </div>
                                )}
                                <h2 className="font-bold text-foreground text-sm">
                                    {editingEvent ? 'Edit Event' : modalKind === 'company' ? 'New Company Event' : 'New Personal Event'}
                                </h2>
                            </div>
                            <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="p-5 space-y-4">
                            {modalKind === 'personal' ? (
                                <>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Type</Label>
                                        <Select value={pForm.type} onValueChange={v => setPForm(f => ({ ...f, type: v as any }))}>
                                            <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                                            <SelectContent className="bg-white">
                                                <SelectItem value="Meeting">🤝 Meeting</SelectItem>
                                                <SelectItem value="Task">✅ Task</SelectItem>
                                                <SelectItem value="Reminder">🔔 Reminder</SelectItem>
                                                <SelectItem value="Holiday">🏖️ Holiday</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Title <span className="text-red-500">*</span></Label>
                                        <Input required value={pForm.title} onChange={e => setPForm(f => ({ ...f, title: e.target.value }))} placeholder="Event title" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Description</Label>
                                        <textarea rows={2} className={INP + " resize-none"} placeholder="Details…" value={pForm.description} onChange={e => setPForm(f => ({ ...f, description: e.target.value }))} />
                                    </div>
                                    {(() => {
                                        const isHoliday = pForm.type === 'Holiday';
                                        const allDay = isHoliday || pAllDay;
                                        const [datePart, timePart = '09:00'] = pForm.start.split('T');
                                        return (
                                            <div className="space-y-3">
                                                <div className="inline-flex border border-border rounded-lg overflow-hidden text-xs font-bold">
                                                    {(['Timed', 'All-day'] as const).map(m => (
                                                        <button key={m} type="button" disabled={isHoliday}
                                                            onClick={() => setPAllDay(m === 'All-day')}
                                                            className={cn("px-3 py-1.5 transition-colors",
                                                                (m === 'All-day') === allDay ? 'bg-primary text-white' : 'text-muted-foreground',
                                                                isHoliday && 'opacity-60')}>
                                                            {m === 'Timed' ? '⏰ Timed' : '📅 All-day'}
                                                        </button>
                                                    ))}
                                                </div>
                                                <div>
                                                    <Label className="text-xs text-muted-foreground mb-1 block">Date</Label>
                                                    <DateQuickPick value={datePart}
                                                        onChange={d => setPForm(f => ({ ...f, start: `${d}T${timePart}`, end: f.end ? `${d}T${f.end.split('T')[1]}` : f.end }))} />
                                                </div>
                                                {!allDay && (
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <Label className="text-xs text-muted-foreground">Start</Label>
                                                        <TimeSelect value={timePart}
                                                            onChange={t => setPForm(f => ({ ...f, start: `${datePart}T${t}` }))} />
                                                        {DURATION_CHIPS.map(c => (
                                                            <button key={c.label} type="button"
                                                                onClick={() => setPForm(f => ({ ...f, end: applyDuration(f.start, c.minutes) }))}
                                                                className={cn("px-2 py-1 rounded-full border text-[11px] font-semibold",
                                                                    pForm.end === applyDuration(pForm.start, c.minutes)
                                                                        ? 'bg-primary text-white border-primary' : 'border-border text-muted-foreground')}>
                                                                {c.label}
                                                            </button>
                                                        ))}
                                                        <Label className="text-xs text-muted-foreground">End</Label>
                                                        <TimeSelect value={(pForm.end || applyDuration(pForm.start, 60)).split('T')[1]}
                                                            onChange={t => setPForm(f => ({ ...f, end: `${datePart}T${t}` }))} />
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })()}
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Location</Label>
                                        <Input value={pForm.location} onChange={e => setPForm(f => ({ ...f, location: e.target.value }))} placeholder="Optional" />
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Event Type</Label>
                                        <Select value={cForm.type} onValueChange={v => setCForm(f => ({ ...f, type: v as CompanyEventType, isAllDay: HOLIDAY_TYPES.includes(v as CompanyEventType) ? true : f.isAllDay }))}>
                                            <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                                            <SelectContent className="bg-white">
                                                <SelectItem value="National Holiday">🇮🇳 National Holiday</SelectItem>
                                                <SelectItem value="State Holiday">🏛️ State Holiday</SelectItem>
                                                <SelectItem value="Optional Holiday">🌿 Optional Holiday</SelectItem>
                                                <SelectItem value="Office Managed Leave">🏢 Office Managed Leave</SelectItem>
                                                <SelectItem value="Client Meeting">🤝 Client Meeting</SelectItem>
                                                <SelectItem value="Vendor Meeting">📦 Vendor Meeting</SelectItem>
                                                <SelectItem value="Internal Meeting">💬 Internal Meeting</SelectItem>
                                                <SelectItem value="Leadership Review">⭐ Leadership Review</SelectItem>
                                                <SelectItem value="Announcement">📢 Announcement</SelectItem>
                                                <SelectItem value="Employee Birthday">🎂 Employee Birthday</SelectItem>
                                                <SelectItem value="Work Anniversary">🏅 Work Anniversary</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Title <span className="text-red-500">*</span></Label>
                                        <Input required value={cForm.title} onChange={e => setCForm(f => ({ ...f, title: e.target.value }))} placeholder="Event title" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Description</Label>
                                        <textarea rows={2} className={INP + " resize-none"} placeholder="Details, agenda…" value={cForm.description} onChange={e => setCForm(f => ({ ...f, description: e.target.value }))} />
                                    </div>
                                    {(() => {
                                        const cIsHoliday = HOLIDAY_TYPES.includes(cForm.type);
                                        const allDay = cIsHoliday || cForm.isAllDay;
                                        const [datePart, timePart = '09:00'] = cForm.start.split('T');
                                        return (
                                            <div className="space-y-3">
                                                <div className="inline-flex border border-border rounded-lg overflow-hidden text-xs font-bold">
                                                    {(['Timed', 'All-day'] as const).map(m => (
                                                        <button key={m} type="button" disabled={cIsHoliday}
                                                            onClick={() => setCForm(f => ({ ...f, isAllDay: m === 'All-day' }))}
                                                            className={cn("px-3 py-1.5 transition-colors",
                                                                (m === 'All-day') === allDay ? 'bg-primary text-white' : 'text-muted-foreground',
                                                                cIsHoliday && 'opacity-60')}>
                                                            {m === 'Timed' ? '⏰ Timed' : '📅 All-day'}
                                                        </button>
                                                    ))}
                                                </div>
                                                <div>
                                                    <Label className="text-xs text-muted-foreground mb-1 block">Date</Label>
                                                    <DateQuickPick value={datePart}
                                                        onChange={d => setCForm(f => ({ ...f, start: `${d}T${timePart}`, end: f.end ? `${d}T${f.end.split('T')[1]}` : f.end }))} />
                                                </div>
                                                {!allDay && (
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <Label className="text-xs text-muted-foreground">Start</Label>
                                                        <TimeSelect value={timePart}
                                                            onChange={t => setCForm(f => ({ ...f, start: `${datePart}T${t}` }))} />
                                                        {DURATION_CHIPS.map(c => (
                                                            <button key={c.label} type="button"
                                                                onClick={() => setCForm(f => ({ ...f, end: applyDuration(f.start, c.minutes) }))}
                                                                className={cn("px-2 py-1 rounded-full border text-[11px] font-semibold",
                                                                    cForm.end === applyDuration(cForm.start, c.minutes)
                                                                        ? 'bg-primary text-white border-primary' : 'border-border text-muted-foreground')}>
                                                                {c.label}
                                                            </button>
                                                        ))}
                                                        <Label className="text-xs text-muted-foreground">End</Label>
                                                        <TimeSelect value={(cForm.end || applyDuration(cForm.start, 60)).split('T')[1]}
                                                            onChange={t => setCForm(f => ({ ...f, end: `${datePart}T${t}` }))} />
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })()}
                                    {isMeetingType(cForm.type) && (
                                        <>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-1.5">
                                                    <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Meeting Mode</Label>
                                                    <Select value={cForm.meetingMode} onValueChange={v => setCForm(f => ({ ...f, meetingMode: v as MeetingMode }))}>
                                                        <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                                                        <SelectContent className="bg-white">
                                                            <SelectItem value="In Person">🏢 In Person</SelectItem>
                                                            <SelectItem value="Google Meet">📹 Google Meet</SelectItem>
                                                            <SelectItem value="Phone Call">📞 Phone Call</SelectItem>
                                                            <SelectItem value="Site Visit">📍 Site Visit</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="space-y-1.5">
                                                    <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Location</Label>
                                                    <Input value={cForm.location} onChange={e => setCForm(f => ({ ...f, location: e.target.value }))} placeholder="Room / address" />
                                                </div>
                                            </div>
                                            {cForm.meetingMode === 'Google Meet' && (
                                                <div className="space-y-1.5">
                                                    <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Meeting Link</Label>
                                                    <Input value={cForm.meetingLink} onChange={e => setCForm(f => ({ ...f, meetingLink: e.target.value }))} placeholder="https://meet.google.com/…" />
                                                </div>
                                            )}
                                            <div className="space-y-2">
                                                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Participants</Label>
                                                {cForm.participants.length > 0 && (
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {cForm.participants.map(p => (
                                                            <span key={p.refId} className="inline-flex items-center gap-1 text-xs bg-primary/8 text-primary border border-primary/20 px-2 py-0.5 rounded-full">
                                                                {p.name}
                                                                <button type="button" onClick={() => setCForm(f => ({ ...f, participants: f.participants.filter(x => x.refId !== p.refId) }))} className="hover:text-red-500 ml-0.5">
                                                                    <X className="w-3 h-3" />
                                                                </button>
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                                <div className="relative">
                                                    <Input placeholder="Search employees to add…" value={pSearch} onChange={e => setPSearch(e.target.value)} />
                                                    {filteredEmployees.length > 0 && (
                                                        <div className="absolute top-full left-0 right-0 z-20 bg-white border border-border rounded-lg shadow-lg mt-1 max-h-36 overflow-y-auto">
                                                            {filteredEmployees.map((emp: any) => (
                                                                <button
                                                                    key={emp._id}
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setCForm(f => ({ ...f, participants: [...f.participants, { refType: 'employee', refId: emp._id, name: emp.name, email: emp.email }] }));
                                                                        setPSearch('');
                                                                    }}
                                                                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted text-sm text-left"
                                                                >
                                                                    <Avatar className="w-6 h-6 shrink-0">
                                                                        <AvatarImage src={emp.image} />
                                                                        <AvatarFallback className="text-[9px]">{emp.name.substring(0, 2)}</AvatarFallback>
                                                                    </Avatar>
                                                                    <div className="min-w-0">
                                                                        <p className="font-medium truncate text-xs">{emp.name}</p>
                                                                        <p className="text-[10px] text-muted-foreground truncate">{emp.jobTitle || emp.dept}</p>
                                                                    </div>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </>
                            )}
                            <div className="flex justify-between items-center pt-3 border-t border-border">
                                <Button type="button" variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
                                <Button type="submit" disabled={saving} className="bg-primary hover:bg-primary/90">
                                    {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                                    {editingEvent ? 'Update Event' : 'Create Event'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
