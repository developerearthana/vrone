"use client";

import { useState, useEffect } from 'react';
import { PageWrapper } from '@/components/ui/page-wrapper';
import { getAllUsers } from '@/app/actions/user';
import { getAttendanceReport, getAllPayrollForMonth, generatePayrollForEmployee, markPayrollPaid } from '@/app/actions/hrm';
import {
    Zap, Check, Clock, Users, DollarSign, AlertCircle,
    Loader2, ChevronDown, TrendingUp, Calendar, FileText, CreditCard, BarChart3
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { StatCard } from '@/components/ui/stat-card';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

interface PayrollRecord {
    _id: string;
    employeeId: string;
    employeeName: string;
    month: string;
    status: 'Paid' | 'Pending' | 'Processing';
    salary: { basic: number; hra: number; allowances: number; gross: number };
    deductions: { pf: number; tax: number; lop: number; other: number; total: number };
    netPay: number;
    attendanceSummary?: { presentDays: number; absentDays: number; workedHours: number };
}

interface Employee {
    _id: string;
    name: string;
    dept: string;
    role: string;
    email: string;
    status: string;
}

const STATUS_STYLES: Record<string, string> = {
    Paid: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400',
    Pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400',
    Processing: 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
};

export default function EnhancedPayrollPage() {
    const now = new Date();
    const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
    const [selectedYear, setSelectedYear] = useState(now.getFullYear());

    const [employees, setEmployees] = useState<Employee[]>([]);
    const [payrolls, setPayrolls] = useState<PayrollRecord[]>([]);
    const [attendanceMap, setAttendanceMap] = useState<Record<string, { present: number; absent: number; hours: number }>>({});
    const [loading, setLoading] = useState(true);
    const [generatingId, setGeneratingId] = useState<string | null>(null);
    const [generatingAll, setGeneratingAll] = useState(false);
    const [selectedPayroll, setSelectedPayroll] = useState<PayrollRecord | null>(null);

    useEffect(() => { loadAll(); }, [selectedMonth, selectedYear]);

    const loadAll = async () => {
        setLoading(true);
        const monthName = MONTHS[selectedMonth];
        const [empData, payrollRes, attRes] = await Promise.all([
            getAllUsers(),
            getAllPayrollForMonth(monthName, selectedYear),
            getAttendanceReport(selectedMonth, selectedYear),
        ]);

        setEmployees(empData || []);
        setPayrolls(payrollRes.success ? payrollRes.data || [] : []);

        // Build attendance map per employee
        if (attRes.success && attRes.data) {
            const map: Record<string, { present: number; absent: number; hours: number }> = {};
            attRes.data.forEach((rec: any) => {
                const uid = rec.userId?._id || rec.userId;
                if (!uid) return;
                if (!map[uid]) map[uid] = { present: 0, absent: 0, hours: 0 };
                if (rec.status === 'Present' || rec.status === 'WFH' || rec.status === 'Half-Day') map[uid].present++;
                if (rec.status === 'Absent') map[uid].absent++;
                map[uid].hours += rec.hoursWorked || 0;
            });
            setAttendanceMap(map);
        }
        setLoading(false);
    };

    const getPayroll = (empId: string) => payrolls.find(p => String(p.employeeId) === String(empId));

    const handleGenerateOne = async (emp: Employee) => {
        setGeneratingId(emp._id);
        const res = await generatePayrollForEmployee(emp._id, MONTHS[selectedMonth], selectedYear);
        if (res.success) {
            toast.success(`Payroll generated for ${emp.name}`);
            loadAll();
        } else {
            toast.error(res.error || 'Failed to generate payroll');
        }
        setGeneratingId(null);
    };

    const handleGenerateAll = async () => {
        if (!confirm(`Generate payroll for ALL employees for ${MONTHS[selectedMonth]} ${selectedYear}?`)) return;
        setGeneratingAll(true);
        const active = employees.filter(e => e.status === 'Active');
        const results = await Promise.allSettled(
            active.map(emp => generatePayrollForEmployee(emp._id, MONTHS[selectedMonth], selectedYear))
        );
        const succeeded = results.filter(r => r.status === 'fulfilled' && (r.value as any)?.success).length;
        const failed = active.length - succeeded;
        if (failed > 0) {
            toast.error(`${succeeded} generated, ${failed} failed`);
        } else {
            toast.success(`Payroll generated for ${succeeded} employees`);
        }
        setGeneratingAll(false);
        loadAll();
    };

    const handleMarkPaid = async (payroll: PayrollRecord) => {
        if (!confirm(`Mark ${payroll.employeeName}'s payroll as Paid?`)) return;
        const res = await markPayrollPaid(payroll._id);
        if (res.success) {
            toast.success('Marked as Paid');
            loadAll();
        } else {
            toast.error('Failed to mark as paid');
        }
    };

    const totalGross = payrolls.reduce((s, p) => s + p.salary.gross, 0);
    const totalNet = payrolls.reduce((s, p) => s + p.netPay, 0);
    const totalDeductions = payrolls.reduce((s, p) => s + p.deductions.total, 0);
    const paidCount = payrolls.filter(p => p.status === 'Paid').length;

    return (
        <PageWrapper className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Payroll Management</h1>
                    <p className="text-muted-foreground text-sm mt-1">Generate and manage employee salaries based on attendance.</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <select
                        value={selectedMonth}
                        onChange={e => setSelectedMonth(Number(e.target.value))}
                        className="border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground outline-none focus:ring-2 focus:ring-primary/20"
                        aria-label="Month"
                    >
                        {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
                    </select>
                    <select
                        value={selectedYear}
                        onChange={e => setSelectedYear(Number(e.target.value))}
                        className="border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground outline-none focus:ring-2 focus:ring-primary/20"
                        aria-label="Year"
                    >
                        {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                    <Button onClick={handleGenerateAll} disabled={generatingAll}>
                        {generatingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                        Generate All
                    </Button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                    { label: 'Total Gross', value: `₹${totalGross.toLocaleString()}`, icon: DollarSign, iconColor: 'text-primary' },
                    { label: 'Total Net Pay', value: `₹${totalNet.toLocaleString()}`, icon: TrendingUp, iconColor: 'text-emerald-600' },
                    { label: 'Deductions', value: `₹${totalDeductions.toLocaleString()}`, icon: AlertCircle, iconColor: 'text-red-500' },
                    { label: 'Paid', value: `${paidCount}/${payrolls.length}`, icon: Check, iconColor: 'text-emerald-600' },
                ].map((s, idx) => (
                    <StatCard key={s.label} index={idx} {...s} />
                ))}
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
                {/* Employee Payroll Table */}
                <div className="lg:col-span-2">
                    <div className="glass-card rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
                        <div className="px-5 py-4 border-b border-border bg-muted/30 flex items-center justify-between">
                            <h3 className="font-semibold text-foreground flex items-center gap-2">
                                <Users className="w-4 h-4 text-primary" /> Employee Payroll — {MONTHS[selectedMonth]} {selectedYear}
                            </h3>
                            <span className="text-xs text-muted-foreground">{employees.filter(e => e.status === 'Active').length} active employees</span>
                        </div>

                        {loading ? (
                            <div className="flex items-center justify-center py-20">
                                <Loader2 className="w-7 h-7 animate-spin text-primary" />
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-muted/20 border-b border-border">
                                        <tr>
                                            <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Employee</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden sm:table-cell">Attendance</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Net Pay</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                                            <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {employees.filter(e => e.status === 'Active').map(emp => {
                                            const payroll = getPayroll(emp._id);
                                            const att = attendanceMap[emp._id];
                                            const isGenerating = generatingId === emp._id;
                                            const initials = emp.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

                                            return (
                                                <tr
                                                    key={emp._id}
                                                    onClick={() => payroll && setSelectedPayroll(payroll)}
                                                    className={cn('hover:bg-muted/20 transition-colors', payroll && 'cursor-pointer')}
                                                >
                                                    <td className="px-5 py-3.5">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0">{initials}</div>
                                                            <div>
                                                                <p className="font-semibold text-foreground text-sm">{emp.name}</p>
                                                                <p className="text-xs text-muted-foreground">{emp.dept}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3.5 hidden sm:table-cell">
                                                        {att ? (
                                                            <div className="flex items-center gap-2 text-xs">
                                                                <span className="text-emerald-600 font-semibold">{att.present}P</span>
                                                                <span className="text-red-500">{att.absent}A</span>
                                                                <span className="text-muted-foreground">{Math.round(att.hours)}h</span>
                                                            </div>
                                                        ) : <span className="text-xs text-muted-foreground/40">No data</span>}
                                                    </td>
                                                    <td className="px-4 py-3.5">
                                                        {payroll ? (
                                                            <span className="font-bold text-foreground">₹{payroll.netPay.toLocaleString()}</span>
                                                        ) : <span className="text-muted-foreground/40 text-xs">—</span>}
                                                    </td>
                                                    <td className="px-4 py-3.5">
                                                        {payroll ? (
                                                            <span className={cn('px-2 py-0.5 rounded-full text-xs font-semibold', STATUS_STYLES[payroll.status])}>
                                                                {payroll.status}
                                                            </span>
                                                        ) : (
                                                            <span className="text-xs text-muted-foreground/50">Not Generated</span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3.5 text-right">
                                                        <div className="flex items-center justify-end gap-1.5">
                                                            {!payroll ? (
                                                                <Button
                                                                    size="sm"
                                                                    onClick={e => { e.stopPropagation(); handleGenerateOne(emp); }}
                                                                    disabled={isGenerating}
                                                                >
                                                                    {isGenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                                                                    Generate
                                                                </Button>
                                                            ) : payroll.status !== 'Paid' ? (
                                                                <Button
                                                                    size="sm"
                                                                    onClick={e => { e.stopPropagation(); handleMarkPaid(payroll); }}
                                                                    className="bg-emerald-600 text-white hover:bg-emerald-700"
                                                                >
                                                                    <Check className="w-3 h-3" /> Mark Paid
                                                                </Button>
                                                            ) : (
                                                                <span className="flex items-center gap-1 text-xs text-emerald-600 font-semibold">
                                                                    <Check className="w-3.5 h-3.5" /> Paid
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {employees.filter(e => e.status === 'Active').length === 0 && (
                                            <tr>
                                                <td colSpan={5} className="px-5 py-12 text-center text-muted-foreground text-sm">
                                                    No active employees found.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>

                {/* Payslip Detail Panel */}
                <div>
                    {selectedPayroll ? (
                        <div className="glass-card rounded-2xl border border-border bg-card shadow-sm overflow-hidden sticky top-6">
                            {/* Header */}
                            <div className="p-5 bg-primary text-white">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs font-semibold uppercase tracking-widest opacity-80">Payslip</span>
                                    <span className={cn('px-2 py-0.5 rounded-full text-xs font-bold', selectedPayroll.status === 'Paid' ? 'bg-white/20 text-white' : 'bg-amber-400/20 text-amber-200')}>
                                        {selectedPayroll.status}
                                    </span>
                                </div>
                                <h3 className="text-xl font-bold">{selectedPayroll.employeeName}</h3>
                                <p className="text-sm opacity-80 mt-0.5">{selectedPayroll.month}</p>
                            </div>

                            <div className="p-5 space-y-4">
                                {/* Attendance Summary */}
                                {selectedPayroll.attendanceSummary && (
                                    <div className="rounded-xl bg-muted/30 p-4 space-y-2 border border-border">
                                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                                            <Calendar className="w-3.5 h-3.5" /> Attendance
                                        </p>
                                        <div className="grid grid-cols-3 gap-2 text-center">
                                            <div>
                                                <p className="text-lg font-bold text-emerald-600">{selectedPayroll.attendanceSummary.presentDays}</p>
                                                <p className="text-xs text-muted-foreground">Present</p>
                                            </div>
                                            <div>
                                                <p className="text-lg font-bold text-red-500">{selectedPayroll.attendanceSummary.absentDays}</p>
                                                <p className="text-xs text-muted-foreground">Absent</p>
                                            </div>
                                            <div>
                                                <p className="text-lg font-bold text-foreground">{selectedPayroll.attendanceSummary.workedHours}h</p>
                                                <p className="text-xs text-muted-foreground">Hours</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Earnings */}
                                <div>
                                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2 flex items-center gap-1.5">
                                        <TrendingUp className="w-3.5 h-3.5" /> Earnings
                                    </p>
                                    <div className="space-y-1.5">
                                        {[
                                            { label: 'Basic', val: selectedPayroll.salary.basic },
                                            { label: 'HRA', val: selectedPayroll.salary.hra },
                                            { label: 'Allowances', val: selectedPayroll.salary.allowances },
                                        ].map(r => (
                                            <div key={r.label} className="flex justify-between text-sm">
                                                <span className="text-muted-foreground">{r.label}</span>
                                                <span className="font-medium text-foreground">₹{r.val.toLocaleString()}</span>
                                            </div>
                                        ))}
                                        <div className="flex justify-between text-sm font-bold border-t border-border pt-1.5 mt-1">
                                            <span className="text-foreground">Gross</span>
                                            <span className="text-primary">₹{selectedPayroll.salary.gross.toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Deductions */}
                                <div>
                                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2 flex items-center gap-1.5">
                                        <AlertCircle className="w-3.5 h-3.5" /> Deductions
                                    </p>
                                    <div className="space-y-1.5">
                                        {[
                                            { label: 'PF', val: selectedPayroll.deductions.pf },
                                            { label: 'Tax (TDS)', val: selectedPayroll.deductions.tax },
                                            { label: 'LOP (Absent)', val: selectedPayroll.deductions.lop },
                                            { label: 'Other', val: selectedPayroll.deductions.other },
                                        ].filter(r => r.val > 0).map(r => (
                                            <div key={r.label} className="flex justify-between text-sm">
                                                <span className="text-muted-foreground">{r.label}</span>
                                                <span className="font-medium text-red-500">-₹{r.val.toLocaleString()}</span>
                                            </div>
                                        ))}
                                        <div className="flex justify-between text-sm font-bold border-t border-border pt-1.5 mt-1">
                                            <span className="text-foreground">Total Deductions</span>
                                            <span className="text-red-500">-₹{selectedPayroll.deductions.total.toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Net Pay */}
                                <div className="rounded-xl bg-gradient-to-r from-primary to-primary/80 p-4 text-white flex items-center justify-between">
                                    <div>
                                        <p className="text-xs font-semibold opacity-80 uppercase tracking-wide">Net Pay</p>
                                        <p className="text-2xl font-black mt-0.5">₹{selectedPayroll.netPay.toLocaleString()}</p>
                                    </div>
                                    <CreditCard className="w-8 h-8 opacity-40" />
                                </div>

                                {selectedPayroll.status !== 'Paid' && (
                                    <Button
                                        onClick={() => handleMarkPaid(selectedPayroll)}
                                        className="w-full bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl"
                                    >
                                        <Check className="w-4 h-4" /> Mark as Paid
                                    </Button>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="glass-card rounded-2xl border border-dashed border-border bg-card/50 flex flex-col items-center justify-center py-20 text-center px-6">
                            <FileText className="w-12 h-12 text-muted-foreground/20 mb-3" />
                            <p className="font-semibold text-foreground text-sm">Select an Employee</p>
                            <p className="text-xs text-muted-foreground mt-1">Click any employee row to view their payslip breakdown.</p>
                        </div>
                    )}
                </div>
            </div>
        </PageWrapper>
    );
}
