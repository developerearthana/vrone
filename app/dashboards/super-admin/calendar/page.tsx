"use client";

import { useState, useEffect, useCallback } from 'react';
import {
    format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
    eachDayOfInterval, addMonths, subMonths, isSameMonth, isSameDay,
    isToday, addWeeks, subWeeks, parseISO,
} from 'date-fns';
import {
    ChevronLeft, ChevronRight, Plus, Loader2, Users, MapPin,
    Video, Phone, Building2, X, Trash2, Edit2, Link2, CalendarRange,
    ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/components/ui/toaster';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getCompanyEvents, createCompanyEvent, updateCompanyEvent, deleteCompanyEvent, getTodayResourceStatus } from '@/app/actions/company-calendar';
import { getEmployees } from '@/app/actions/employee';
import type { CompanyEventType, MeetingMode } from '@/models/CompanyEvent';

// ── Color palette per event type (brand-safe, no purple/violet/cyan) ─────────
const TYPE_CONFIG: Record<string, { label: string; dot: string; bg: string; text: string; border: string }> = {
    'National Holiday':   { label: 'National Holiday',   dot: 'bg-red-500',      bg: 'bg-red-50',     text: 'text-red-700',     border: 'border-red-200' },
    'State Holiday':      { label: 'State Holiday',      dot: 'bg-orange-500',   bg: 'bg-orange-50',  text: 'text-orange-700',  border: 'border-orange-200' },
    'Optional Holiday':   { label: 'Optional Holiday',   dot: 'bg-amber-400',    bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200' },
    'Office Managed Leave': { label: 'OML',              dot: 'bg-yellow-500',   bg: 'bg-yellow-50',  text: 'text-yellow-700',  border: 'border-yellow-200' },
    'Client Meeting':     { label: 'Client Meeting',     dot: 'bg-sky-500',      bg: 'bg-sky-50',     text: 'text-sky-700',     border: 'border-sky-200' },
    'Vendor Meeting':     { label: 'Vendor Meeting',     dot: 'bg-stone-500',    bg: 'bg-stone-100',  text: 'text-stone-700',   border: 'border-stone-300' },
    'Internal Meeting':   { label: 'Internal Meeting',   dot: 'bg-emerald-500',  bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
    'Leadership Review':  { label: 'Leadership Review',  dot: 'bg-primary',      bg: 'bg-primary/8',  text: 'text-primary',     border: 'border-primary/20' },
    'Announcement':       { label: 'Announcement',       dot: 'bg-yellow-600',   bg: 'bg-yellow-50',  text: 'text-yellow-800',  border: 'border-yellow-300' },
    'Employee Birthday':  { label: 'Birthday',           dot: 'bg-rose-400',     bg: 'bg-rose-50',    text: 'text-rose-700',    border: 'border-rose-200' },
    'Work Anniversary':   { label: 'Anniversary',        dot: 'bg-amber-600',    bg: 'bg-amber-50',   text: 'text-amber-800',   border: 'border-amber-300' },
};

const HOLIDAY_TYPES: CompanyEventType[] = ['National Holiday', 'State Holiday', 'Optional Holiday', 'Office Managed Leave'];
const MEETING_TYPES: CompanyEventType[] = ['Client Meeting', 'Vendor Meeting', 'Internal Meeting', 'Leadership Review'];

const RESOURCE_STATUS_CONFIG: Record<string, { bg: string; text: string; dot: string }> = {
    'In Office':  { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
    'WFH':        { bg: 'bg-sky-50',     text: 'text-sky-700',     dot: 'bg-sky-500' },
    'On Field':   { bg: 'bg-amber-50',   text: 'text-amber-700',   dot: 'bg-amber-500' },
    'On Duty':    { bg: 'bg-orange-50',  text: 'text-orange-700',  dot: 'bg-orange-500' },
    'On Leave':   { bg: 'bg-red-50',     text: 'text-red-700',     dot: 'bg-red-500' },
    'Half Day':   { bg: 'bg-yellow-50',  text: 'text-yellow-700',  dot: 'bg-yellow-500' },
    'Absent':     { bg: 'bg-gray-100',   text: 'text-gray-500',    dot: 'bg-gray-400' },
    'No Record':  { bg: 'bg-muted',      text: 'text-muted-foreground', dot: 'bg-muted-foreground/30' },
};

const MEETING_MODE_ICONS: Record<string, React.ReactNode> = {
    'In Person':   <Building2 className="w-3.5 h-3.5" />,
    'Google Meet': <Video className="w-3.5 h-3.5" />,
    'Phone Call':  <Phone className="w-3.5 h-3.5" />,
    'Site Visit':  <MapPin className="w-3.5 h-3.5" />,
};

const emptyForm = () => ({
    title: '',
    description: '',
    type: 'Internal Meeting' as CompanyEventType,
    start: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    end: '',
    isAllDay: false,
    meetingMode: 'In Person' as MeetingMode,
    location: '',
    meetingLink: '',
    participants: [] as Array<{ refType: 'employee' | 'contact'; refId?: string; name: string; email?: string }>,
});

export default function CompanyCalendarPage() {
    const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [events, setEvents] = useState<any[]>([]);
    const [resources, setResources] = useState<any[]>([]);
    const [employees, setEmployees] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [resourceLoading, setResourceLoading] = useState(true);

    const [showModal, setShowModal] = useState(false);
    const [editingEvent, setEditingEvent] = useState<any>(null);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [detailEvent, setDetailEvent] = useState<any>(null);

    const [form, setForm] = useState(emptyForm());
    const [saving, setSaving] = useState(false);
    const [typeFilter, setTypeFilter] = useState<string>('All');
    const [participantSearch, setParticipantSearch] = useState('');

    // ── Fetch ────────────────────────────────────────────────

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
        const res = await getCompanyEvents(start, end);
        if (res.success) setEvents(res.data);
        setLoading(false);
    }, [currentDate, viewMode]);

    useEffect(() => { fetchEvents(); }, [fetchEvents]);

    useEffect(() => {
        getTodayResourceStatus().then(r => {
            if (r.success) setResources(r.data);
            setResourceLoading(false);
        });
        getEmployees().then(e => setEmployees(e || []));
    }, []);

    // ── Calendar grid helpers ────────────────────────────────

    const calendarDays = (() => {
        const s = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 });
        const e = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 });
        return eachDayOfInterval({ start: s, end: e });
    })();

    const weekDays = (() => {
        const s = startOfWeek(currentDate, { weekStartsOn: 1 });
        const e = endOfWeek(currentDate, { weekStartsOn: 1 });
        return eachDayOfInterval({ start: s, end: e });
    })();

    const eventsForDay = (day: Date) => {
        const filtered = typeFilter === 'All'
            ? events
            : events.filter(e => e.type === typeFilter);
        return filtered.filter(e => isSameDay(parseISO(e.start), day));
    };

    // ── Modal helpers ────────────────────────────────────────

    const openCreate = (date?: Date) => {
        setEditingEvent(null);
        const d = date || new Date();
        setForm({ ...emptyForm(), start: format(d, "yyyy-MM-dd'T'HH:mm") });
        setDetailEvent(null);
        setShowModal(true);
    };

    const openEdit = (evt: any) => {
        setEditingEvent(evt);
        setDetailEvent(null);
        setForm({
            title: evt.title,
            description: evt.description || '',
            type: evt.type,
            start: format(parseISO(evt.start), "yyyy-MM-dd'T'HH:mm"),
            end: evt.end ? format(parseISO(evt.end), "yyyy-MM-dd'T'HH:mm") : '',
            isAllDay: evt.isAllDay,
            meetingMode: evt.meetingMode || 'In Person',
            location: evt.location || '',
            meetingLink: evt.meetingLink || '',
            participants: evt.participants || [],
        });
        setShowModal(true);
    };

    const addParticipant = (emp: any) => {
        if (form.participants.some(p => p.refId === emp._id)) return;
        setForm(f => ({
            ...f,
            participants: [...f.participants, { refType: 'employee', refId: emp._id, name: emp.name, email: emp.email }],
        }));
        setParticipantSearch('');
    };

    const removeParticipant = (refId?: string) => {
        setForm(f => ({ ...f, participants: f.participants.filter(p => p.refId !== refId) }));
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const payload = {
                ...form,
                end: form.end || undefined,
            };
            let res;
            if (editingEvent) {
                res = await updateCompanyEvent(editingEvent._id, payload);
            } else {
                res = await createCompanyEvent(payload);
            }
            if (res.success) {
                toast.success(editingEvent ? 'Event updated' : 'Event created');
                setShowModal(false);
                fetchEvents();
            } else {
                toast.error(res.error || 'Failed to save');
            }
        } catch { toast.error('An error occurred'); }
        setSaving(false);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this event?')) return;
        const res = await deleteCompanyEvent(id);
        if (res.success) { toast.success('Deleted'); setDetailEvent(null); fetchEvents(); }
        else toast.error(res.error || 'Failed');
    };

    // ── Resource grouping ────────────────────────────────────

    const resourceGroups = resources.reduce((acc: Record<string, any[]>, r) => {
        if (!acc[r.status]) acc[r.status] = [];
        acc[r.status].push(r);
        return acc;
    }, {});

    const STATUS_ORDER = ['In Office', 'WFH', 'On Field', 'On Duty', 'Half Day', 'On Leave', 'Absent', 'No Record'];

    const isMeeting = (type: string) => MEETING_TYPES.includes(type as CompanyEventType);
    const isHoliday = (type: string) => HOLIDAY_TYPES.includes(type as CompanyEventType);

    const filteredEmployees = employees.filter(emp =>
        participantSearch.length > 1 &&
        !form.participants.some(p => p.refId === emp._id) &&
        (emp.name.toLowerCase().includes(participantSearch.toLowerCase()) ||
            (emp.email || '').toLowerCase().includes(participantSearch.toLowerCase()))
    );

    const inputCls = "w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all";

    // ── Render ───────────────────────────────────────────────

    const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    return (
        <div className="flex flex-col gap-0 h-full">

            {/* ── Top bar ── */}
            <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
                <div className="flex items-center gap-3">
                    <CalendarRange className="w-5 h-5 text-primary" />
                    <div>
                        <h1 className="text-xl font-bold text-foreground leading-tight">Company Calendar</h1>
                        <p className="text-xs text-muted-foreground">Holidays · Meetings · Resource availability</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    {/* Type filter */}
                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                        <SelectTrigger className="h-8 text-xs w-[160px] bg-card">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-white text-xs">
                            <SelectItem value="All">All Event Types</SelectItem>
                            <SelectItem value="National Holiday">National Holiday</SelectItem>
                            <SelectItem value="State Holiday">State Holiday</SelectItem>
                            <SelectItem value="Optional Holiday">Optional Holiday</SelectItem>
                            <SelectItem value="Office Managed Leave">OML</SelectItem>
                            <SelectItem value="Client Meeting">Client Meeting</SelectItem>
                            <SelectItem value="Vendor Meeting">Vendor Meeting</SelectItem>
                            <SelectItem value="Internal Meeting">Internal Meeting</SelectItem>
                            <SelectItem value="Leadership Review">Leadership Review</SelectItem>
                            <SelectItem value="Announcement">Announcement</SelectItem>
                        </SelectContent>
                    </Select>
                    {/* View toggle */}
                    <div className="flex items-center border border-border rounded-lg overflow-hidden text-xs bg-card h-8">
                        {(['month', 'week'] as const).map(v => (
                            <button key={v} onClick={() => setViewMode(v)} className={cn("px-3 h-full capitalize font-medium transition-colors", viewMode === v ? 'bg-primary text-white' : 'text-muted-foreground hover:text-foreground')}>
                                {v}
                            </button>
                        ))}
                    </div>
                    <Button onClick={() => openCreate()} size="sm" className="h-8 bg-primary hover:bg-primary/90 shadow-sm shadow-primary/20">
                        <Plus className="w-3.5 h-3.5 mr-1.5" />Add Event
                    </Button>
                </div>
            </div>

            <div className="flex gap-4 items-start">

                {/* ── Left sidebar ── */}
                <div className="w-60 shrink-0 space-y-4">

                    {/* Month nav */}
                    <div className="bg-card border border-border rounded-xl p-3">
                        <div className="flex items-center justify-between mb-3">
                            <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-1 rounded hover:bg-muted transition-colors">
                                <ChevronLeft className="w-4 h-4 text-muted-foreground" />
                            </button>
                            <span className="text-sm font-bold text-foreground">{format(currentDate, 'MMMM yyyy')}</span>
                            <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-1 rounded hover:bg-muted transition-colors">
                                <ChevronRight className="w-4 h-4 text-muted-foreground" />
                            </button>
                        </div>
                        <div className="grid grid-cols-7 gap-0.5">
                            {DAY_LABELS.map(d => <div key={d} className="text-center text-[9px] font-bold text-muted-foreground py-1">{d[0]}</div>)}
                            {calendarDays.map(day => (
                                <button
                                    key={day.toISOString()}
                                    onClick={() => setCurrentDate(day)}
                                    className={cn(
                                        "text-center text-[10px] h-6 w-6 mx-auto rounded-full transition-colors font-medium",
                                        !isSameMonth(day, currentDate) ? 'text-muted-foreground/30' : 'text-foreground',
                                        isToday(day) ? 'bg-primary text-white font-bold' : 'hover:bg-muted',
                                        eventsForDay(day).length > 0 && !isToday(day) ? 'font-bold underline decoration-primary/40 underline-offset-2' : ''
                                    )}
                                >
                                    {format(day, 'd')}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Legend */}
                    <div className="bg-card border border-border rounded-xl p-3 space-y-2">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-2">Legend</p>
                        {Object.entries(TYPE_CONFIG).map(([key, cfg]) => (
                            <div key={key} className="flex items-center gap-2 text-xs text-foreground/80">
                                <span className={cn("w-2 h-2 rounded-full shrink-0", cfg.dot)} />
                                <span className="truncate">{cfg.label}</span>
                            </div>
                        ))}
                    </div>

                    {/* Today's resource status */}
                    <div className="bg-card border border-border rounded-xl p-3">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-2.5">
                            Today — {format(new Date(), 'dd MMM')}
                        </p>
                        {resourceLoading ? (
                            <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-primary" /></div>
                        ) : resources.length === 0 ? (
                            <p className="text-xs text-muted-foreground text-center py-3">No employee data</p>
                        ) : (
                            <div className="space-y-2.5">
                                {STATUS_ORDER.filter(s => resourceGroups[s]?.length > 0).map(status => {
                                    const cfg = RESOURCE_STATUS_CONFIG[status] || RESOURCE_STATUS_CONFIG['No Record'];
                                    const group = resourceGroups[status] || [];
                                    return (
                                        <div key={status}>
                                            <div className="flex items-center gap-1.5 mb-1">
                                                <span className={cn("w-1.5 h-1.5 rounded-full", cfg.dot)} />
                                                <span className={cn("text-[10px] font-bold uppercase tracking-wide", cfg.text)}>{status}</span>
                                                <span className="text-[10px] text-muted-foreground ml-auto">{group.length}</span>
                                            </div>
                                            <div className="flex flex-wrap gap-1 pl-3">
                                                {group.slice(0, 6).map((r: any) => (
                                                    <Avatar key={r._id} className="w-6 h-6" title={r.name}>
                                                        <AvatarImage src={r.image} />
                                                        <AvatarFallback className={cn("text-[8px] font-bold", cfg.bg, cfg.text)}>{r.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                                                    </Avatar>
                                                ))}
                                                {group.length > 6 && <span className="text-[9px] text-muted-foreground self-center">+{group.length - 6}</span>}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Google Calendar sync scaffold */}
                    <div className="bg-card border border-border rounded-xl p-3">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-2">Google Calendar</p>
                        <p className="text-[10px] text-muted-foreground leading-relaxed mb-2.5">
                            Sync company events with Google Calendar and auto-schedule Google Meet links.
                        </p>
                        <button
                            onClick={() => toast.info("Add GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET and enable the Calendar API scope to activate Google sync.")}
                            className="w-full flex items-center justify-center gap-1.5 text-[10px] font-semibold text-muted-foreground border border-dashed border-border rounded-lg py-2 hover:border-primary/40 hover:text-primary transition-colors"
                        >
                            <ExternalLink className="w-3 h-3" /> Connect Google Calendar
                        </button>
                    </div>
                </div>

                {/* ── Main calendar grid ── */}
                <div className="flex-1 min-w-0 bg-card border border-border rounded-xl overflow-hidden">

                    {/* Month / week nav header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                        <button
                            onClick={() => viewMode === 'month' ? setCurrentDate(subMonths(currentDate, 1)) : setCurrentDate(subWeeks(currentDate, 1))}
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
                        </div>
                        <button
                            onClick={() => viewMode === 'month' ? setCurrentDate(addMonths(currentDate, 1)) : setCurrentDate(addWeeks(currentDate, 1))}
                            className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                        >
                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        </button>
                    </div>

                    {/* Day labels */}
                    <div className="grid grid-cols-7 border-b border-border">
                        {DAY_LABELS.map(d => (
                            <div key={d} className="py-2 text-center text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                                {d}
                            </div>
                        ))}
                    </div>

                    {loading ? (
                        <div className="flex justify-center items-center h-[480px]">
                            <Loader2 className="w-6 h-6 animate-spin text-primary" />
                        </div>
                    ) : (
                        <div className={cn("grid grid-cols-7", viewMode === 'month' ? 'divide-x divide-y divide-border' : '')}>
                            {(viewMode === 'month' ? calendarDays : weekDays).map(day => {
                                const dayEvents = eventsForDay(day);
                                const isCurrentMonth = isSameMonth(day, currentDate);
                                const todayDay = isToday(day);
                                const isHol = dayEvents.some(e => isHoliday(e.type));

                                return (
                                    <div
                                        key={day.toISOString()}
                                        onClick={() => { setSelectedDate(day); openCreate(day); }}
                                        className={cn(
                                            "min-h-[100px] p-1.5 cursor-pointer transition-colors",
                                            viewMode === 'week' ? 'border-r border-b border-border min-h-[300px]' : '',
                                            !isCurrentMonth ? 'bg-muted/20' : 'hover:bg-muted/30',
                                            todayDay ? 'bg-primary/5' : '',
                                            isHol ? 'bg-red-50/40' : '',
                                        )}
                                    >
                                        {/* Date number */}
                                        <div className={cn(
                                            "w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold mb-1 ml-auto",
                                            todayDay ? 'bg-primary text-white' : !isCurrentMonth ? 'text-muted-foreground/40' : 'text-foreground'
                                        )}>
                                            {format(day, 'd')}
                                        </div>

                                        {/* Events */}
                                        <div className="space-y-0.5">
                                            {dayEvents.slice(0, viewMode === 'week' ? 8 : 3).map(evt => {
                                                const cfg = TYPE_CONFIG[evt.type] || TYPE_CONFIG['Internal Meeting'];
                                                return (
                                                    <button
                                                        key={evt._id}
                                                        onClick={e => { e.stopPropagation(); setDetailEvent(evt); }}
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
                                            {dayEvents.length > (viewMode === 'week' ? 8 : 3) && (
                                                <p className="text-[9px] text-muted-foreground pl-1">+{dayEvents.length - (viewMode === 'week' ? 8 : 3)} more</p>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* ── Event Detail Popover ── */}
            {detailEvent && (
                <div className="fixed inset-0 z-40 flex items-center justify-center p-4" onClick={() => setDetailEvent(null)}>
                    <div className="absolute inset-0 bg-black/20 backdrop-blur-[1px]" />
                    <div
                        className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm p-5 space-y-3"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Type badge */}
                        {(() => {
                            const cfg = TYPE_CONFIG[detailEvent.type] || TYPE_CONFIG['Internal Meeting'];
                            return (
                                <span className={cn("inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border", cfg.bg, cfg.text, cfg.border)}>
                                    <span className={cn("w-1.5 h-1.5 rounded-full", cfg.dot)} />{cfg.label}
                                </span>
                            );
                        })()}

                        <div>
                            <h3 className="font-bold text-foreground text-base">{detailEvent.title}</h3>
                            {detailEvent.description && <p className="text-sm text-muted-foreground mt-0.5">{detailEvent.description}</p>}
                        </div>

                        <div className="text-xs text-muted-foreground space-y-1">
                            <p>{detailEvent.isAllDay ? '📅 All day' : `${format(parseISO(detailEvent.start), 'dd MMM yyyy, h:mm a')}${detailEvent.end ? ` → ${format(parseISO(detailEvent.end), 'h:mm a')}` : ''}`}</p>
                            {detailEvent.location && <p>📍 {detailEvent.location}</p>}
                            {detailEvent.meetingMode && (
                                <div className="flex items-center gap-1">
                                    {MEETING_MODE_ICONS[detailEvent.meetingMode]}
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
                                <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1.5">Participants ({detailEvent.participants.length})</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {detailEvent.participants.map((p: any, i: number) => (
                                        <span key={i} className="inline-flex items-center gap-1 text-xs bg-muted text-foreground px-2 py-0.5 rounded-full">
                                            <Users className="w-2.5 h-2.5 text-muted-foreground" />{p.name}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="flex justify-between pt-2 border-t border-border">
                            <button onClick={() => handleDelete(detailEvent._id)} className="text-xs text-red-600 hover:text-red-700 flex items-center gap-1 font-medium">
                                <Trash2 className="w-3.5 h-3.5" />Delete
                            </button>
                            <div className="flex gap-2">
                                <button onClick={() => setDetailEvent(null)} className="text-xs text-muted-foreground hover:text-foreground font-medium">Close</button>
                                <button onClick={() => openEdit(detailEvent)} className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 font-medium">
                                    <Edit2 className="w-3.5 h-3.5" />Edit
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Create / Edit Modal ── */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
                    <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" />
                    <div
                        className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between p-5 border-b border-border">
                            <h2 className="font-bold text-foreground">{editingEvent ? 'Edit Event' : 'Add Company Event'}</h2>
                            <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="p-5 space-y-4">

                            {/* Type */}
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Event Type</Label>
                                <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v as CompanyEventType }))}>
                                    <SelectTrigger className="text-sm">
                                        <SelectValue />
                                    </SelectTrigger>
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

                            {/* Title */}
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Title <span className="text-red-500">*</span></Label>
                                <Input required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Event title" />
                            </div>

                            {/* Description */}
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Description</Label>
                                <textarea
                                    rows={2}
                                    className={inputCls + " resize-none"}
                                    placeholder="Details, agenda, notes…"
                                    value={form.description}
                                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                                />
                            </div>

                            {/* All day toggle + dates */}
                            <div className="space-y-2">
                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                    <button
                                        type="button"
                                        onClick={() => setForm(f => ({ ...f, isAllDay: !f.isAllDay }))}
                                        className={cn("relative inline-flex h-5 w-9 rounded-full border-2 border-transparent transition-colors", form.isAllDay ? 'bg-primary' : 'bg-muted')}
                                    >
                                        <span className={cn("inline-block h-4 w-4 rounded-full bg-white shadow transition-transform", form.isAllDay ? 'translate-x-4' : 'translate-x-0')} />
                                    </button>
                                    <span className="text-sm text-foreground font-medium">All day</span>
                                </label>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <Label className="text-xs text-muted-foreground">{form.isAllDay ? 'Date' : 'Start'}</Label>
                                        <input
                                            type={form.isAllDay ? 'date' : 'datetime-local'}
                                            required
                                            className={inputCls}
                                            value={form.isAllDay ? form.start.split('T')[0] : form.start}
                                            onChange={e => setForm(f => ({ ...f, start: form.isAllDay ? e.target.value + 'T00:00' : e.target.value }))}
                                        />
                                    </div>
                                    {!form.isAllDay && (
                                        <div className="space-y-1">
                                            <Label className="text-xs text-muted-foreground">End</Label>
                                            <input
                                                type="datetime-local"
                                                className={inputCls}
                                                value={form.end}
                                                onChange={e => setForm(f => ({ ...f, end: e.target.value }))}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Meeting-specific fields */}
                            {isMeeting(form.type) && (
                                <>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Meeting Mode</Label>
                                            <Select value={form.meetingMode} onValueChange={v => setForm(f => ({ ...f, meetingMode: v as MeetingMode }))}>
                                                <SelectTrigger className="text-sm">
                                                    <SelectValue />
                                                </SelectTrigger>
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
                                            <Input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="Room / address" />
                                        </div>
                                    </div>

                                    {form.meetingMode === 'Google Meet' && (
                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Google Meet Link</Label>
                                            <div className="flex gap-2">
                                                <Input value={form.meetingLink} onChange={e => setForm(f => ({ ...f, meetingLink: e.target.value }))} placeholder="https://meet.google.com/…" className="flex-1" />
                                                <button
                                                    type="button"
                                                    onClick={() => toast.info("Connect Google Calendar to auto-generate Meet links.")}
                                                    className="shrink-0 px-3 py-2 bg-muted text-muted-foreground rounded-lg text-xs font-medium hover:bg-muted/80 transition-colors whitespace-nowrap flex items-center gap-1"
                                                >
                                                    <Video className="w-3.5 h-3.5" />Auto
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Participants */}
                                    <div className="space-y-2">
                                        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Participants</Label>

                                        {form.participants.length > 0 && (
                                            <div className="flex flex-wrap gap-1.5">
                                                {form.participants.map(p => (
                                                    <span key={p.refId} className="inline-flex items-center gap-1 text-xs bg-primary/8 text-primary border border-primary/20 px-2 py-0.5 rounded-full">
                                                        {p.name}
                                                        <button type="button" onClick={() => removeParticipant(p.refId)} className="hover:text-red-500 transition-colors ml-0.5">
                                                            <X className="w-3 h-3" />
                                                        </button>
                                                    </span>
                                                ))}
                                            </div>
                                        )}

                                        <div className="relative">
                                            <Input
                                                placeholder="Search employees to add…"
                                                value={participantSearch}
                                                onChange={e => setParticipantSearch(e.target.value)}
                                            />
                                            {filteredEmployees.length > 0 && (
                                                <div className="absolute top-full left-0 right-0 z-10 bg-white border border-border rounded-lg shadow-lg mt-1 max-h-40 overflow-y-auto">
                                                    {filteredEmployees.map(emp => (
                                                        <button
                                                            key={emp._id}
                                                            type="button"
                                                            onClick={() => addParticipant(emp)}
                                                            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted transition-colors text-sm text-left"
                                                        >
                                                            <Avatar className="w-6 h-6 shrink-0">
                                                                <AvatarImage src={emp.image} />
                                                                <AvatarFallback className="text-[9px]">{emp.name.substring(0, 2)}</AvatarFallback>
                                                            </Avatar>
                                                            <div className="min-w-0">
                                                                <p className="font-medium truncate">{emp.name}</p>
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

                            <div className="flex justify-between items-center pt-2 border-t border-border">
                                <Button type="button" variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
                                <Button type="submit" disabled={saving} className="bg-primary hover:bg-primary/90">
                                    {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                                    {editingEvent ? 'Update Event' : 'Add to Calendar'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
