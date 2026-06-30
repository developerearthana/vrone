"use client";

import { useState, useEffect } from 'react';
import { format, subDays, addDays, isToday } from 'date-fns';
import { getAllAttendance, getAttendanceReport, adminAdjustAttendance, deleteAttendanceRecord } from '@/app/actions/hrm';
import { getAllUsers } from '@/app/actions/user';
import { getCompanySettings } from '@/app/actions/masters';
import { PageWrapper } from '@/components/ui/page-wrapper';
import { Clock, Users, CheckCircle, XCircle, ChevronLeft, ChevronRight, Download, Filter, Loader2, Calendar, BarChart3, Wifi, Plus, X, PenLine, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface AttendanceRecord {
    _id: string;
    userId: { _id: string; name: string; email: string; dept: string; role: string; image?: string };
    date: string;
    punchIn?: string;
    punchOut?: string;
    status: string;
    workMode: string;
    hoursWorked: number;
    adminAdjusted?: boolean;
}

const STATUS_COLORS: Record<string, string> = {
    Present: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400',
    WFH: 'bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400',
    Absent: 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400',
    Leave: 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400',
    'Half-Day': 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
};

type ViewMode = 'daily' | 'monthly';

const EMPTY_FORM = {
    userId: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    punchIn: '',
    punchOut: '',
    status: 'Present',
    workMode: 'Office',
    remarks: '',
};

export default function HRMAttendanceAdminPage() {
    const [viewMode, setViewMode] = useState<ViewMode>('daily');
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    const [records, setRecords] = useState<AttendanceRecord[]>([]);
    const [allUsers, setAllUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [lateThresholdHour, setLateThresholdHour] = useState(10); // configurable via CompanySettings

    // Manual entry state
    const [showEntryPanel, setShowEntryPanel] = useState(false);
    const [entryForm, setEntryForm] = useState(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    useEffect(() => {
        loadData();
    }, [viewMode, selectedDate, selectedMonth, selectedYear]);

    useEffect(() => {
        getAllUsers().then(u => setAllUsers(Array.isArray(u) ? u : []));
        getCompanySettings().then(s => {
            const threshold = s['Late Threshold']; // e.g. "10:00"
            if (threshold) {
                const [h] = threshold.split(':').map(Number);
                if (!isNaN(h)) setLateThresholdHour(h);
            }
        });
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            if (viewMode === 'daily') {
                const res = await getAllAttendance(format(selectedDate, 'yyyy-MM-dd'));
                if (res.success) setRecords(res.data || []);
                else toast.error('Failed to load attendance');
            } else {
                const res = await getAttendanceReport(selectedMonth, selectedYear);
                if (res.success) setRecords(res.data || []);
                else toast.error('Failed to load report');
            }
        } catch {
            toast.error('An error occurred');
        }
        setLoading(false);
    };

    const openEntryForRecord = (record: AttendanceRecord) => {
        setEntryForm({
            userId: record.userId?._id || '',
            date: format(new Date(record.date), 'yyyy-MM-dd'),
            punchIn: record.punchIn ? format(new Date(record.punchIn), "yyyy-MM-dd'T'HH:mm") : '',
            punchOut: record.punchOut ? format(new Date(record.punchOut), "yyyy-MM-dd'T'HH:mm") : '',
            status: record.status,
            workMode: record.workMode,
            remarks: '',
        });
        setShowEntryPanel(true);
    };

    const handleSaveEntry = async () => {
        if (!entryForm.userId) return toast.error('Please select an employee');
        if (!entryForm.date) return toast.error('Please select a date');
        setSaving(true);
        try {
            const res = await adminAdjustAttendance({
                userId: entryForm.userId,
                date: entryForm.date,
                punchIn: entryForm.punchIn || undefined,
                punchOut: entryForm.punchOut || undefined,
                status: entryForm.status,
                workMode: entryForm.workMode,
                remarks: entryForm.remarks || undefined,
            });
            if (res.success) {
                toast.success('Attendance updated successfully');
                setShowEntryPanel(false);
                setEntryForm(EMPTY_FORM);
                loadData();
            } else {
                toast.error(res.error || 'Failed to save');
            }
        } catch {
            toast.error('An error occurred');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteRecord = async (id: string) => {
        if (!confirm('Delete this attendance record? This cannot be undone.')) return;
        setDeletingId(id);
        try {
            const res = await deleteAttendanceRecord(id);
            if (res.success) {
                toast.success('Record deleted');
                setRecords(prev => prev.filter(r => r._id !== id));
            } else {
                toast.error(res.error || 'Failed to delete');
            }
        } catch {
            toast.error('An error occurred');
        } finally {
            setDeletingId(null);
        }
    };

    const stats = {
        present: records.filter(r => r.status === 'Present' || r.status === 'WFH').length,
        absent: records.filter(r => r.status === 'Absent').length,
        late: records.filter(r => r.punchIn && new Date(r.punchIn).getHours() >= lateThresholdHour).length,
        wfh: records.filter(r => r.workMode === 'Remote').length,
    };

    const filteredRecords = records.filter(r => {
        if (!r.userId) return false;
        const matchSearch = !search || r.userId.name?.toLowerCase().includes(search.toLowerCase()) || r.userId.dept?.toLowerCase().includes(search.toLowerCase());
        const matchStatus = statusFilter === 'All' || r.status === statusFilter;
        return matchSearch && matchStatus;
    });

    const exportCSV = () => {
        const headers = ['Employee', 'Department', 'Date', 'Punch In', 'Punch Out', 'Status', 'Work Mode', 'Hours', 'Admin Adjusted'];
        const rows = filteredRecords.map(r => [
            r.userId?.name || 'Unknown',
            r.userId?.dept || '',
            format(new Date(r.date), 'dd/MM/yyyy'),
            r.punchIn ? format(new Date(r.punchIn), 'HH:mm') : '—',
            r.punchOut ? format(new Date(r.punchOut), 'HH:mm') : '—',
            r.status,
            r.workMode,
            r.hoursWorked?.toFixed(1) || '0',
            r.adminAdjusted ? 'Yes' : 'No',
        ]);
        const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = viewMode === 'monthly'
            ? `attendance-${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}.csv`
            : `attendance-${format(selectedDate, 'yyyy-MM-dd')}.csv`;
        a.click();
    };

    const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    return (
        <PageWrapper className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Attendance Report</h1>
                    <p className="text-muted-foreground text-sm mt-1">Track and correct employee punch in/out times.</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center bg-muted rounded-lg p-1 text-sm">
                        <button
                            onClick={() => setViewMode('daily')}
                            className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-all', viewMode === 'daily' ? 'bg-card shadow text-primary' : 'text-muted-foreground hover:text-foreground')}
                        >
                            <Calendar className="w-3.5 h-3.5" /> Daily
                        </button>
                        <button
                            onClick={() => setViewMode('monthly')}
                            className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-all', viewMode === 'monthly' ? 'bg-card shadow text-primary' : 'text-muted-foreground hover:text-foreground')}
                        >
                            <BarChart3 className="w-3.5 h-3.5" /> Monthly
                        </button>
                    </div>
                    <button
                        onClick={() => { setEntryForm(EMPTY_FORM); setShowEntryPanel(true); }}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold bg-primary text-primary-foreground hover:brightness-110 transition-all"
                    >
                        <Plus className="w-4 h-4" /> Manual Entry
                    </button>
                    <button
                        onClick={exportCSV}
                        className="flex items-center gap-2 px-3 py-2 border border-border rounded-lg text-sm bg-card hover:bg-muted transition-colors text-foreground"
                    >
                        <Download className="w-4 h-4" /> Export
                    </button>
                </div>
            </div>

            {/* Date Selector */}
            <div className="glass-card rounded-xl p-4 border border-border bg-card flex flex-col sm:flex-row sm:items-center gap-4">
                {viewMode === 'daily' ? (
                    <div className="flex items-center gap-3">
                        <button onClick={() => setSelectedDate(subDays(selectedDate, 1))} className="p-2 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-foreground">
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <div className="text-center">
                            <p className="font-bold text-foreground">{format(selectedDate, 'EEEE, d MMMM yyyy')}</p>
                            {isToday(selectedDate) && <span className="text-xs text-primary font-semibold">Today</span>}
                        </div>
                        <button onClick={() => setSelectedDate(addDays(selectedDate, 1))} className="p-2 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-foreground" disabled={isToday(selectedDate)}>
                            <ChevronRight className="w-4 h-4" />
                        </button>
                        <button onClick={() => setSelectedDate(new Date())} className="text-xs text-primary hover:underline font-medium ml-2">Today</button>
                    </div>
                ) : (
                    <div className="flex items-center gap-3">
                        <select value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))} className="border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:ring-2 focus:ring-primary/20 outline-none" aria-label="Month">
                            {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
                        </select>
                        <select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))} className="border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:ring-2 focus:ring-primary/20 outline-none" aria-label="Year">
                            {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                    </div>
                )}
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                    { label: 'Present / WFH', value: stats.present, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
                    { label: 'Absent', value: stats.absent, icon: XCircle, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/20' },
                    { label: 'Late Arrivals', value: stats.late, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20' },
                    { label: 'Work From Home', value: stats.wfh, icon: Wifi, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20' },
                ].map(stat => (
                    <div key={stat.label} className="glass-card rounded-xl p-4 border border-border bg-card">
                        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center mb-3', stat.bg)}>
                            <stat.icon className={cn('w-5 h-5', stat.color)} />
                        </div>
                        <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                        <p className="text-xs text-muted-foreground font-medium mt-0.5">{stat.label}</p>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search by name or department..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 border border-border rounded-xl text-sm bg-background text-foreground focus:ring-2 focus:ring-primary/20 outline-none"
                    />
                </div>
                <select
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                    className="border border-border rounded-xl px-4 py-2.5 text-sm bg-background text-foreground focus:ring-2 focus:ring-primary/20 outline-none min-w-[140px]"
                    aria-label="Status filter"
                >
                    <option value="All">All Statuses</option>
                    <option value="Present">Present</option>
                    <option value="WFH">WFH</option>
                    <option value="Absent">Absent</option>
                    <option value="Leave">On Leave</option>
                    <option value="Half-Day">Half-Day</option>
                </select>
            </div>

            {/* Attendance Table */}
            <div className="glass-card rounded-2xl border border-border overflow-hidden bg-card shadow-sm">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-7 h-7 animate-spin text-primary" />
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-muted/40 border-b border-border">
                                <tr>
                                    <th className="px-5 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Employee</th>
                                    <th className="px-5 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden sm:table-cell">Department</th>
                                    {viewMode === 'monthly' && (
                                        <th className="px-5 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Date</th>
                                    )}
                                    <th className="px-5 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Punch In</th>
                                    <th className="px-5 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Punch Out</th>
                                    <th className="px-5 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden sm:table-cell">Hours</th>
                                    <th className="px-5 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                                    <th className="px-5 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">Mode</th>
                                    <th className="px-5 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Adjust</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {filteredRecords.map(record => {
                                    const user = record.userId;
                                    const initials = user?.name?.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase();
                                    const punchInLate = record.punchIn && new Date(record.punchIn).getHours() >= lateThresholdHour;
                                    return (
                                        <tr key={record._id} className="hover:bg-muted/20 transition-colors group">
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                                                        {initials || '?'}
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-foreground flex items-center gap-1.5">
                                                            {user?.name || 'Unknown'}
                                                            {record.adminAdjusted && (
                                                                <span className="text-[10px] bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded font-semibold">ADJUSTED</span>
                                                            )}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground sm:hidden">{user?.dept || '—'}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-5 py-4 text-muted-foreground hidden sm:table-cell">{user?.dept || '—'}</td>
                                            {viewMode === 'monthly' && (
                                                <td className="px-5 py-4 text-foreground font-medium">{format(new Date(record.date), 'dd MMM')}</td>
                                            )}
                                            <td className="px-5 py-4">
                                                {record.punchIn ? (
                                                    <span className={cn('font-mono font-semibold text-sm', punchInLate ? 'text-amber-600' : 'text-emerald-600')}>
                                                        {format(new Date(record.punchIn), 'HH:mm')}
                                                        {punchInLate && <span className="ml-1 text-[10px] bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 px-1 rounded">LATE</span>}
                                                    </span>
                                                ) : <span className="text-muted-foreground/50">—</span>}
                                            </td>
                                            <td className="px-5 py-4">
                                                {record.punchOut ? (
                                                    <span className="font-mono font-semibold text-sm text-foreground">{format(new Date(record.punchOut), 'HH:mm')}</span>
                                                ) : record.punchIn ? (
                                                    <span className="text-xs text-amber-600 font-medium animate-pulse">Active ●</span>
                                                ) : <span className="text-muted-foreground/50">—</span>}
                                            </td>
                                            <td className="px-5 py-4 text-foreground hidden sm:table-cell">
                                                {record.hoursWorked > 0 ? `${record.hoursWorked.toFixed(1)}h` : '—'}
                                            </td>
                                            <td className="px-5 py-4">
                                                <span className={cn('px-2.5 py-1 rounded-full text-xs font-semibold', STATUS_COLORS[record.status] || 'bg-gray-100 text-gray-600')}>
                                                    {record.status}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4 hidden md:table-cell">
                                                <span className={cn('flex items-center gap-1.5 text-xs font-medium', record.workMode === 'Remote' ? 'text-purple-600' : 'text-muted-foreground')}>
                                                    {record.workMode === 'Remote' ? <Wifi className="w-3.5 h-3.5" /> : <Users className="w-3.5 h-3.5" />}
                                                    {record.workMode}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        onClick={() => openEntryForRecord(record)}
                                                        className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-primary"
                                                        title="Adjust attendance"
                                                    >
                                                        <PenLine className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteRecord(record._id)}
                                                        disabled={deletingId === record._id}
                                                        className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-muted-foreground hover:text-red-600 disabled:opacity-40"
                                                        title="Delete record"
                                                    >
                                                        {deletingId === record._id
                                                            ? <Loader2 className="w-4 h-4 animate-spin" />
                                                            : <Trash2 className="w-4 h-4" />}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {filteredRecords.length === 0 && (
                                    <tr>
                                        <td colSpan={9} className="px-5 py-14 text-center">
                                            <Clock className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                                            <p className="text-muted-foreground font-medium">No attendance records for this date</p>
                                            <p className="text-xs text-muted-foreground/60 mt-1">Employees haven't punched in yet, or no data exists.</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Manual Entry Panel */}
            {showEntryPanel && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={e => { if (e.target === e.currentTarget) setShowEntryPanel(false); }}>
                    <div className="w-full max-w-md bg-card rounded-2xl border border-border shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-200">
                        {/* Panel header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30">
                            <div className="flex items-center gap-2">
                                <PenLine className="w-4 h-4 text-primary" />
                                <h2 className="font-bold text-foreground">Manual Attendance Entry</h2>
                            </div>
                            <button onClick={() => setShowEntryPanel(false)} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Form */}
                        <div className="px-6 py-5 space-y-4">
                            <div>
                                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Employee</label>
                                <select
                                    value={entryForm.userId}
                                    onChange={e => setEntryForm(f => ({ ...f, userId: e.target.value }))}
                                    className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background text-foreground focus:ring-2 focus:ring-primary/20 outline-none"
                                    aria-label="Employee"
                                >
                                    <option value="">Select employee…</option>
                                    {allUsers.map(u => (
                                        <option key={u._id} value={u._id}>{`${u.name}${u.dept ? ` — ${u.dept}` : ''}`}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Date</label>
                                <input
                                    type="date"
                                    value={entryForm.date}
                                    max={format(new Date(), 'yyyy-MM-dd')}
                                    onChange={e => setEntryForm(f => ({ ...f, date: e.target.value }))}
                                    className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background text-foreground focus:ring-2 focus:ring-primary/20 outline-none"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Punch In</label>
                                    <input
                                        type="datetime-local"
                                        value={entryForm.punchIn}
                                        onChange={e => setEntryForm(f => ({ ...f, punchIn: e.target.value }))}
                                        className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background text-foreground focus:ring-2 focus:ring-primary/20 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Punch Out</label>
                                    <input
                                        type="datetime-local"
                                        value={entryForm.punchOut}
                                        onChange={e => setEntryForm(f => ({ ...f, punchOut: e.target.value }))}
                                        className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background text-foreground focus:ring-2 focus:ring-primary/20 outline-none"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Status</label>
                                    <select
                                        value={entryForm.status}
                                        onChange={e => setEntryForm(f => ({ ...f, status: e.target.value }))}
                                        className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background text-foreground focus:ring-2 focus:ring-primary/20 outline-none"
                                        aria-label="Status"
                                    >
                                        <option value="Present">Present</option>
                                        <option value="WFH">WFH</option>
                                        <option value="Half-Day">Half-Day</option>
                                        <option value="Leave">On Leave</option>
                                        <option value="Absent">Absent</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Work Mode</label>
                                    <select
                                        value={entryForm.workMode}
                                        onChange={e => setEntryForm(f => ({ ...f, workMode: e.target.value }))}
                                        className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background text-foreground focus:ring-2 focus:ring-primary/20 outline-none"
                                        aria-label="Work Mode"
                                    >
                                        <option value="Office">Office</option>
                                        <option value="Remote">Remote</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Remarks</label>
                                <input
                                    type="text"
                                    placeholder="Reason for adjustment…"
                                    value={entryForm.remarks}
                                    onChange={e => setEntryForm(f => ({ ...f, remarks: e.target.value }))}
                                    className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background text-foreground focus:ring-2 focus:ring-primary/20 outline-none"
                                />
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3 px-6 pb-6">
                            <button
                                onClick={() => setShowEntryPanel(false)}
                                className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-semibold text-foreground hover:bg-muted transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveEntry}
                                disabled={saving}
                                className="flex-1 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:brightness-110 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                                {saving ? 'Saving…' : 'Save Entry'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </PageWrapper>
    );
}
