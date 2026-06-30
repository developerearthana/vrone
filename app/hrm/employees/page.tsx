"use client";

import { useEffect, useState } from 'react';
import { Plus, Search, Mail, Phone, Trash2, User as UserIcon, Loader2, MoreVertical, UserCheck, UserX, ArrowLeft, ArrowRight, Check, Edit, CreditCard, Printer, X } from 'lucide-react';
import { PageWrapper, CardWrapper } from '@/components/ui/page-wrapper';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getAllUsers } from '@/app/actions/user';
import { getDepartments, getCompany } from '@/app/actions/organization';
import { createEmployee, updateEmployee, getEmployees, deleteEmployee, toggleEmployeeStatus } from '@/app/actions/employee';
import { getMasters } from '@/app/actions/masters';
import { toast } from 'sonner';
import Link from 'next/link';
import { ImageUpload } from '@/components/ui/image-upload';

interface Employee {
    _id: string;
    name: string;
    initial?: string;
    dept?: string;
    email?: string;
    phone?: string;
    jobTitle?: string;
    employeeId?: string;
    image?: string;
    bloodGroup?: string;
    fatherName?: string;
    alternatePhone?: string;
    dateOfBirth?: string;
    gender?: string;
    maritalStatus?: string;
    address?: string;
    reportingManager?: string;
    probationEndDate?: string;
    noticePeriod?: number;
    bankDetails?: {
        accountType?: string;
        accountHolderName?: string;
        bankName?: string;
        accountNumber?: string;
        upiId?: string;
        ifscCode?: string;
        bankBranch?: string;
    };
    status: 'Active' | 'Inactive' | 'On Leave';
    gradient?: string;
}

interface Department { _id: string; name: string; }

const gradients = [
    "from-orange-600 to-amber-700",
    "from-emerald-600 to-green-700",
    "from-amber-500 to-yellow-600",
    "from-stone-500 to-stone-700",
    "from-sky-600 to-blue-700",
];

const STEPS = ['Personal Info', 'Other Details'];
const DRAFT_KEY = 'hrm_employee_draft';

const emptyForm = {
    image: '', initial: '', jobTitle: '', dept: '', employeeId: '',
    name: '', email: '', phone: '', fatherName: '', alternatePhone: '', address: '',
    dateOfBirth: '', gender: '', bloodGroup: '', maritalStatus: '',
    reportingTo: '', probationEndDate: '', noticePeriod: '',
    paymentMode: 'bank' as 'upi' | 'bank',
    accountType: '', accountHolderName: '', bankName: '', accountNumber: '', upiId: '', ifscCode: '', bankBranch: '',
};

export default function EmployeesPage() {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [allUsers, setAllUsers] = useState<any[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [jobTitles, setJobTitles] = useState<string[]>([]);
    const [company, setCompany] = useState<any>(null);
    const [showIdCard, setShowIdCard] = useState<Employee | null>(null);
    const [loading, setLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
    const [currentStep, setCurrentStep] = useState(0);
    const [formData, setFormData] = useState(emptyForm);
    const [saving, setSaving] = useState(false);
    const [hasDraft, setHasDraft] = useState(false);
    const [errors, setErrors] = useState<Record<string, boolean>>({});
    const [searchQuery, setSearchQuery] = useState('');
    const [deptFilter, setDeptFilter] = useState('All');
    const [statusFilter, setStatusFilter] = useState('All');
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);

    useEffect(() => {
        loadData();
        // Check for existing draft on mount
        const draft = localStorage.getItem(DRAFT_KEY);
        if (draft) setHasDraft(true);
    }, []);

    // Auto-save draft whenever formData changes (only for new employee, not edit)
    useEffect(() => {
        if (showAddForm && !editingEmployee) {
            const isEmpty = Object.values(formData).every(v => v === '');
            if (!isEmpty) {
                localStorage.setItem(DRAFT_KEY, JSON.stringify({ formData, currentStep }));
            }
        }
    }, [formData, currentStep, showAddForm, editingEmployee]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [empData, usersData, deptData, titlesRes, companyData] = await Promise.all([
                getEmployees(),
                getAllUsers(),
                getDepartments(),
                getMasters('JobTitle'),
                getCompany(),
            ]);
            setEmployees((empData || []).map((e: any, i: number) => ({ ...e, gradient: gradients[i % gradients.length] })));
            setAllUsers(usersData || []);
            setDepartments(deptData || []);
            if (titlesRes.success && titlesRes.data) setJobTitles(titlesRes.data.map((t: any) => t.label));
            if (companyData) setCompany(companyData);
        } catch { toast.error("Failed to load data"); }
        finally { setLoading(false); }
    };

    const clearDraft = () => { localStorage.removeItem(DRAFT_KEY); setHasDraft(false); };

    const openAdd = () => {
        setEditingEmployee(null);
        const draft = localStorage.getItem(DRAFT_KEY);
        if (draft) {
            try {
                const { formData: savedForm, currentStep: savedStep } = JSON.parse(draft);
                setFormData(savedForm);
                setCurrentStep(savedStep || 0);
            } catch {
                setFormData(emptyForm);
                setCurrentStep(0);
            }
        } else {
            setFormData(emptyForm);
            setCurrentStep(0);
        }
        setShowAddForm(true);
    };

    const openEdit = (emp: any) => {
        setEditingEmployee(emp);
        const hasUpi = !!emp.bankDetails?.upiId;
        const hasBank = !!(emp.bankDetails?.bankName || emp.bankDetails?.accountNumber);
        setFormData({
            image: emp.image || '',
            initial: emp.initial || '',
            jobTitle: emp.jobTitle || '',
            dept: emp.dept || '',
            employeeId: emp.employeeId || '',
            name: emp.name || '',
            email: emp.email || '',
            phone: emp.phone || '',
            fatherName: emp.fatherName || '',
            alternatePhone: emp.alternatePhone || '',
            address: emp.address || '',
            dateOfBirth: emp.dateOfBirth ? emp.dateOfBirth.substring(0, 10) : '',
            gender: emp.gender || '',
            bloodGroup: emp.bloodGroup || '',
            maritalStatus: emp.maritalStatus || '',
            reportingTo: emp.reportingManager || '',
            probationEndDate: emp.probationEndDate ? emp.probationEndDate.substring(0, 10) : '',
            noticePeriod: emp.noticePeriod ? String(emp.noticePeriod) : '',
            paymentMode: hasUpi && !hasBank ? 'upi' : 'bank',
            accountType: emp.bankDetails?.accountType || '',
            accountHolderName: emp.bankDetails?.accountHolderName || '',
            bankName: emp.bankDetails?.bankName || '',
            accountNumber: emp.bankDetails?.accountNumber || '',
            upiId: emp.bankDetails?.upiId || '',
            ifscCode: emp.bankDetails?.ifscCode || '',
            bankBranch: emp.bankDetails?.bankBranch || '',
        });
        setCurrentStep(0);
        setOpenMenuId(null);
        setShowAddForm(true);
    };

    const closeAdd = (discardDraft = false) => {
        if (discardDraft) clearDraft();
        setShowAddForm(false);
        setCurrentStep(0);
        setEditingEmployee(null);
    };
    const set = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (errors[field]) setErrors(prev => ({ ...prev, [field]: false }));
    };

    const validateStep = () => {
        if (currentStep === 0) {
            const newErrors: Record<string, boolean> = {};
            if (!formData.name.trim()) newErrors.name = true;
            if (Object.keys(newErrors).length > 0) {
                setErrors(newErrors);
                toast.error("Please fill in all required fields");
                return false;
            }
        }
        setErrors({});
        return true;
    };

    const handleNext = () => { if (validateStep()) setCurrentStep(s => s + 1); };
    const handleBack = () => setCurrentStep(s => s - 1);

    const handleSubmit = async () => {
        if (!validateStep()) return;
        setSaving(true);
        try {
            const payload = {
                ...formData,
                reportingManager: formData.reportingTo,
                noticePeriod: formData.noticePeriod ? Number(formData.noticePeriod) : undefined,
                // Clear payment fields not used by chosen mode
                upiId: formData.paymentMode === 'upi' ? formData.upiId : '',
                accountNumber: formData.paymentMode === 'bank' ? formData.accountNumber : '',
                bankName: formData.paymentMode === 'bank' ? formData.bankName : '',
                accountHolderName: formData.paymentMode === 'bank' ? formData.accountHolderName : '',
                ifscCode: formData.paymentMode === 'bank' ? formData.ifscCode : '',
                bankBranch: formData.paymentMode === 'bank' ? formData.bankBranch : '',
                accountType: formData.paymentMode === 'bank' ? formData.accountType : '',
            };
            const res = editingEmployee
                ? await updateEmployee(editingEmployee._id, payload)
                : await createEmployee(payload);
            if (res.success) {
                toast.success(editingEmployee ? "Employee updated" : "Employee added successfully");
                if (!editingEmployee) clearDraft();
                closeAdd();
                loadData();
            } else {
                toast.error(res.error || "Operation failed");
            }
        } catch { toast.error("An error occurred"); }
        finally { setSaving(false); }
    };

    const handleDelete = async (emp: Employee) => {
        if (!confirm(`Delete ${emp.name}? This cannot be undone.`)) return;
        setOpenMenuId(null);
        const res = await deleteEmployee(emp._id);
        if (res.success) { toast.success("Employee deleted"); loadData(); }
        else toast.error(res.error || "Failed to delete");
    };

    const handleToggleStatus = async (emp: Employee) => {
        setOpenMenuId(null);
        const res = await toggleEmployeeStatus(emp._id, emp.status);
        if (res.success) { toast.success(`Employee ${res.status === 'Active' ? 'activated' : 'deactivated'}`); loadData(); }
        else toast.error("Failed to update status");
    };

    const filtered = employees.filter(emp => {
        const matchSearch = emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (emp.email || '').toLowerCase().includes(searchQuery.toLowerCase());
        const matchDept = deptFilter === 'All' || emp.dept === deptFilter;
        const matchStatus = statusFilter === 'All' || emp.status === statusFilter;
        return matchSearch && matchDept && matchStatus;
    });

    const inputCls = "w-full px-3 py-2.5 border border-border rounded-lg text-sm bg-background text-foreground focus:ring-2 focus:ring-primary/20 outline-none transition-all";
    const selectCls = inputCls + " cursor-pointer";
    const field = (label: string, required: boolean, children: React.ReactNode, hasError = false) => (
        <div className="space-y-1.5">
            <label className={cn("text-xs font-semibold uppercase tracking-wide", hasError ? "text-red-500" : "text-muted-foreground")}>
                {label}{required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <div className={hasError ? "ring-2 ring-red-500 rounded-lg" : ""}>
                {children}
            </div>
            {hasError && <p className="text-xs text-red-500 mt-0.5">This field is required</p>}
        </div>
    );

    // ── Multi-step Add Form Screen ──────────────────────────────────────────
    if (showAddForm) {
        return (
            <div className="h-screen flex flex-col bg-background overflow-hidden">
                {/* Top bar */}
                <div className="shrink-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between shadow-sm z-10">
                    <button onClick={() => closeAdd(false)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                        <ArrowLeft className="w-4 h-4" /> Back to Employees
                    </button>
                    <div className="flex flex-col items-center">
                        <h1 className="font-bold text-foreground text-lg">{editingEmployee ? 'Edit Employee' : 'Add New Employee'}</h1>
                        {!editingEmployee && (
                            <span className="text-xs text-emerald-600 font-medium">● Draft auto-saved</span>
                        )}
                    </div>
                    {!editingEmployee ? (
                        <button
                            onClick={() => closeAdd(true)}
                            className="text-xs text-red-500 hover:text-red-600 font-medium border border-red-200 hover:border-red-300 px-3 py-1.5 rounded-lg transition-colors"
                        >
                            Discard Draft
                        </button>
                    ) : (
                        <div className="w-28" />
                    )}
                </div>

                {/* Step Indicator */}
                <div className="shrink-0 max-w-5xl mx-auto w-full px-6 pt-8 pb-2">
                    <div className="flex items-center">
                        {STEPS.map((step, idx) => (
                            <div key={step} className="flex items-center flex-1">
                                <div className="flex flex-col items-center">
                                    <div className={cn(
                                        "w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all",
                                        idx < currentStep ? "bg-primary border-primary text-white" :
                                            idx === currentStep ? "border-primary text-primary bg-primary/10" :
                                                "border-border text-muted-foreground bg-card"
                                    )}>
                                        {idx < currentStep ? <Check className="w-4 h-4" /> : idx + 1}
                                    </div>
                                    <span className={cn("text-xs mt-1.5 font-medium whitespace-nowrap", idx === currentStep ? "text-primary" : "text-muted-foreground")}>
                                        {step}
                                    </span>
                                </div>
                                {idx < STEPS.length - 1 && (
                                    <div className={cn("flex-1 h-0.5 mx-2 mt-[-12px]", idx < currentStep ? "bg-primary" : "bg-border")} />
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Form Body — wider card */}
                <div className="flex-1 overflow-y-auto">
                <div className="max-w-5xl mx-auto px-6 py-8">
                    <div className="bg-card border border-border rounded-2xl p-8 shadow-sm space-y-6">

                        {/* ── Step 1: Personal Info ── */}
                        {currentStep === 0 && (
                            <>
                                <div>
                                    <h2 className="text-base font-bold text-foreground mb-1">Personal Information</h2>
                                    <p className="text-sm text-muted-foreground">Basic details and personal information of the employee.</p>
                                </div>
                                {/* Two-column layout: fields left, photo right */}
                                <div className="flex flex-col lg:flex-row gap-6">
                                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-5">
                                        {/* Name + Initial side by side */}
                                        <div className="sm:col-span-2 grid grid-cols-3 gap-3">
                                            <div className="col-span-2">
                                                {field("Full Name", true,
                                                    <input className={inputCls} value={formData.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Arjun Sharma" />,
                                                    errors.name
                                                )}
                                            </div>
                                            <div>
                                                {field("Initial", false,
                                                    <input className={inputCls} value={formData.initial} onChange={e => set('initial', e.target.value)} placeholder="e.g. S." />
                                                )}
                                            </div>
                                        </div>
                                        {field("Employee ID", false,
                                            <input className={inputCls} value={formData.employeeId} onChange={e => set('employeeId', e.target.value)} placeholder="e.g. EMP-001" />
                                        )}
                                        {field("Email Address", false,
                                            <input type="email" className={inputCls} value={formData.email} onChange={e => set('email', e.target.value)} placeholder="arjun@example.com" />
                                        )}
                                        {field("Job Title / Designation", false,
                                            <select className={selectCls} value={formData.jobTitle} onChange={e => set('jobTitle', e.target.value)}>
                                                <option value="">Select Job Title</option>
                                                {jobTitles.length > 0
                                                    ? jobTitles.map(t => <option key={t} value={t}>{t}</option>)
                                                    : <option disabled>No titles — add in Masters › Job Titles</option>
                                                }
                                            </select>
                                        )}
                                        {field("Department", false,
                                            <select className={selectCls} value={formData.dept} onChange={e => set('dept', e.target.value)}>
                                                <option value="">Select Department</option>
                                                {departments.map(d => <option key={d._id} value={d.name}>{d.name}</option>)}
                                            </select>
                                        )}
                                        {field("Contact Number", false,
                                            <input className={inputCls} value={formData.phone} onChange={e => set('phone', e.target.value)} placeholder="+91 98765 43210" />
                                        )}
                                        {field("Father / Guardian Name", false,
                                            <input className={inputCls} value={formData.fatherName} onChange={e => set('fatherName', e.target.value)} placeholder="e.g. Ramesh Sharma" />
                                        )}
                                        {field("Father / Guardian Contact", false,
                                            <input className={inputCls} value={formData.alternatePhone} onChange={e => set('alternatePhone', e.target.value)} placeholder="+91 98765 43210" />
                                        )}
                                        {/* DOB + computed age */}
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Date of Birth</label>
                                            <input
                                                type="date"
                                                className={inputCls}
                                                value={formData.dateOfBirth}
                                                onChange={e => set('dateOfBirth', e.target.value)}
                                            />
                                            {formData.dateOfBirth && (() => {
                                                const dob = new Date(formData.dateOfBirth);
                                                const age = Math.floor((Date.now() - dob.getTime()) / (1000 * 60 * 60 * 24 * 365.25));
                                                return age > 0 ? <p className="text-xs text-primary font-semibold">Age: {age} years</p> : null;
                                            })()}
                                        </div>
                                        {field("Blood Group", false,
                                            <select className={selectCls} value={formData.bloodGroup} onChange={e => set('bloodGroup', e.target.value)}>
                                                <option value="">Select Blood Group</option>
                                                {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(bg => <option key={bg} value={bg}>{bg}</option>)}
                                            </select>
                                        )}
                                        {field("Gender", false,
                                            <select className={selectCls} value={formData.gender} onChange={e => set('gender', e.target.value)}>
                                                <option value="">Select Gender</option>
                                                <option>Male</option>
                                                <option>Female</option>
                                                <option>Other</option>
                                                <option>Prefer not to say</option>
                                            </select>
                                        )}
                                        {field("Marital Status", false,
                                            <select className={selectCls} value={formData.maritalStatus} onChange={e => set('maritalStatus', e.target.value)}>
                                                <option value="">Select Status</option>
                                                <option>Single</option>
                                                <option>Married</option>
                                                <option>Divorced</option>
                                                <option>Widowed</option>
                                            </select>
                                        )}
                                        <div className="sm:col-span-2">
                                            {field("Address", false,
                                                <textarea
                                                    className={inputCls + " resize-none"}
                                                    rows={2}
                                                    value={formData.address}
                                                    onChange={e => set('address', e.target.value)}
                                                    placeholder="Street, City, State, PIN"
                                                />
                                            )}
                                        </div>
                                    </div>
                                    {/* Photo — top right */}
                                    <div className="flex flex-col items-center gap-2 lg:w-44 shrink-0 self-start">
                                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide self-start lg:self-center">Photo</p>
                                        <ImageUpload
                                            value={formData.image}
                                            onChange={url => set('image', url)}
                                            variant="circle"
                                            label="Upload Photo"
                                        />
                                    </div>
                                </div>
                            </>
                        )}

                        {/* ── Step 2: Other Details (Employment + Banking) ── */}
                        {currentStep === 1 && (
                            <>
                                {/* Employment Details */}
                                <div>
                                    <h2 className="text-base font-bold text-foreground mb-1">Employment Details</h2>
                                    <p className="text-sm text-muted-foreground">Reporting structure, probation and notice period.</p>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                                    {field("Reporting To", false,
                                        <select className={selectCls} value={formData.reportingTo} onChange={e => set('reportingTo', e.target.value)}>
                                            <option value="">Select</option>
                                            {allUsers.map((u: any) => (
                                                <option key={u._id} value={u.name}>{u.name}{u.jobTitle ? ` — ${u.jobTitle}` : ''}</option>
                                            ))}
                                        </select>
                                    )}
                                    {field("Probation Period End Date", false,
                                        <input type="date" className={inputCls} value={formData.probationEndDate} onChange={e => set('probationEndDate', e.target.value)} />
                                    )}
                                    {field("Notice Period (months)", false,
                                        <input type="number" min="0" max="24" className={inputCls} value={formData.noticePeriod} onChange={e => set('noticePeriod', e.target.value)} placeholder="e.g. 2" />
                                    )}
                                </div>

                                {/* Payment Section */}
                                <div className="border-t border-border pt-6">
                                    <h2 className="text-base font-bold text-foreground mb-1">Payment Details</h2>
                                    <p className="text-sm text-muted-foreground">Payroll payment method for this employee.</p>
                                </div>
                                {/* Payment mode toggle */}
                                <div className="flex gap-3">
                                    {(['bank', 'upi'] as const).map(mode => (
                                        <button
                                            key={mode}
                                            type="button"
                                            onClick={() => set('paymentMode', mode)}
                                            className={cn(
                                                "flex-1 py-2.5 px-4 rounded-lg border-2 text-sm font-semibold transition-all",
                                                formData.paymentMode === mode
                                                    ? "border-primary bg-primary/8 text-primary"
                                                    : "border-border bg-card text-muted-foreground hover:border-primary/40"
                                            )}
                                        >
                                            {mode === 'bank' ? 'Bank Account' : 'UPI'}
                                        </button>
                                    ))}
                                </div>
                                {formData.paymentMode === 'bank' ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                                        {field("Account Holder Name", false,
                                            <input className={inputCls} value={formData.accountHolderName} onChange={e => set('accountHolderName', e.target.value)} placeholder="As per bank records" />
                                        )}
                                        {field("Bank Name", false,
                                            <input className={inputCls} value={formData.bankName} onChange={e => set('bankName', e.target.value)} placeholder="e.g. HDFC Bank" />
                                        )}
                                        {field("Account Number", false,
                                            <input className={inputCls} value={formData.accountNumber} onChange={e => set('accountNumber', e.target.value)} placeholder="Enter account number" />
                                        )}
                                        {field("Account Type", false,
                                            <select className={selectCls} value={formData.accountType} onChange={e => set('accountType', e.target.value)}>
                                                <option value="">Select Type</option>
                                                <option>Savings</option>
                                                <option>Checking</option>
                                            </select>
                                        )}
                                        {field("IFSC Code", false,
                                            <input className={inputCls} value={formData.ifscCode} onChange={e => set('ifscCode', e.target.value.toUpperCase())} placeholder="e.g. HDFC0001234" />
                                        )}
                                        {field("Bank Branch", false,
                                            <input className={inputCls} value={formData.bankBranch} onChange={e => set('bankBranch', e.target.value)} placeholder="Branch name & address" />
                                        )}
                                    </div>
                                ) : (
                                    <div className="max-w-sm">
                                        {field("UPI ID", false,
                                            <input className={inputCls} value={formData.upiId} onChange={e => set('upiId', e.target.value)} placeholder="e.g. arjun@ybl" />
                                        )}
                                    </div>
                                )}
                            </>
                        )}

                    </div>
                </div>

                {/* Navigation — sticky inside scroll */}
                <div className="sticky bottom-0 bg-card border-t border-border px-6 py-4 flex justify-between items-center">
                    <Button variant="outline" onClick={currentStep === 0 ? () => closeAdd() : handleBack} disabled={saving}>
                        {currentStep === 0 ? 'Cancel' : <><ArrowLeft className="w-4 h-4 mr-1.5" />Back</>}
                    </Button>
                    {currentStep < STEPS.length - 1 ? (
                        <Button onClick={handleNext}>
                            Next <ArrowRight className="w-4 h-4 ml-1.5" />
                        </Button>
                    ) : (
                        <Button onClick={handleSubmit} disabled={saving} className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20">
                            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-1.5" />}
                            {editingEmployee ? 'Update Employee' : 'Save Employee'}
                        </Button>
                    )}
                </div>
                </div>
            </div>
        );
    }

    // ── Employees List ──────────────────────────────────────────────────────
    if (loading) return (
        <div className="flex items-center justify-center h-[calc(100vh-200px)]">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
    );

    return (
        <PageWrapper className="space-y-6 max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-primary tracking-tight">Employees</h1>
                    <p className="text-muted-foreground mt-1">{employees.length} employees • {employees.filter(e => e.status === 'Active').length} active</p>
                </div>
                <Button onClick={openAdd} className="shadow-lg shadow-primary/20 hover:scale-105 transition-all w-full sm:w-auto">
                    <Plus className="w-4 h-4 mr-2" />Add Employee
                </Button>
            </div>

            {/* Draft resume banner */}
            {hasDraft && (
                <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                    <div className="flex items-center gap-2">
                        <span className="text-amber-600 text-lg">📝</span>
                        <div>
                            <p className="text-sm font-semibold text-amber-800">You have an unsaved employee draft</p>
                            <p className="text-xs text-amber-600">Your previous form progress was saved. Continue where you left off.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-4">
                        <button onClick={openAdd} className="text-sm font-semibold text-amber-700 bg-amber-100 hover:bg-amber-200 px-3 py-1.5 rounded-lg transition-colors">
                            Continue Draft
                        </button>
                        <button onClick={clearDraft} className="text-xs text-amber-500 hover:text-amber-700 px-2 py-1.5 transition-colors">
                            Discard
                        </button>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="glass-card p-4 rounded-xl flex flex-col md:flex-row gap-3 items-stretch md:items-center border border-border shadow-sm bg-card">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <input type="text" placeholder="Search by name or email..." value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="pl-10 pr-4 py-2 w-full border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 bg-background text-sm text-foreground"
                    />
                </div>
                <div className="flex gap-2 flex-wrap">
                    <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)} className="px-3 py-2 border border-border rounded-lg text-sm text-foreground bg-card focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer">
                        <option value="All">All Depts</option>
                        {departments.map(d => <option key={d._id} value={d.name}>{d.name}</option>)}
                    </select>
                    <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2 border border-border rounded-lg text-sm text-foreground bg-card focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer">
                        <option value="All">All Status</option>
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                        <option value="On Leave">On Leave</option>
                    </select>
                </div>
            </div>

            {filtered.length === 0 && (
                <div className="text-center py-16 text-muted-foreground glass-card rounded-2xl border border-dashed border-border">
                    <UserIcon className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
                    <p className="font-medium">No employees found</p>
                    <p className="text-sm mt-1">Try adjusting filters or add a new employee.</p>
                </div>
            )}

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filtered.map((emp, idx) => (
                    <CardWrapper key={emp._id} delay={idx * 0.04} className="glass-card p-6 rounded-2xl border border-border hover:border-primary/30 hover:shadow-xl transition-all group relative bg-card">
                        <div className="absolute top-3 right-3">
                            <button className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                                onClick={() => setOpenMenuId(openMenuId === emp._id ? null : emp._id)}>
                                <MoreVertical className="w-4 h-4" />
                            </button>
                            {openMenuId === emp._id && (
                                <div className="absolute right-0 top-full mt-1 w-48 bg-popover border border-border rounded-xl shadow-xl z-20 overflow-hidden animate-in fade-in slide-in-from-top-2">
                                    <button onClick={() => openEdit(emp)} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors text-left">
                                        <Edit className="w-3.5 h-3.5" /> Edit Employee
                                    </button>
                                    <button onClick={() => { setShowIdCard(emp); setOpenMenuId(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors text-left">
                                        <CreditCard className="w-3.5 h-3.5" /> Print ID Card
                                    </button>
                                    <button onClick={() => handleToggleStatus(emp)} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors text-left">
                                        {emp.status === 'Active' ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                                        {emp.status === 'Active' ? 'Deactivate' : 'Activate'}
                                    </button>
                                    <div className="h-px bg-border mx-2" />
                                    <button onClick={() => handleDelete(emp)} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-left">
                                        <Trash2 className="w-3.5 h-3.5" /> Delete
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="flex flex-col items-center text-center mb-5">
                            <div className={cn("w-16 h-16 rounded-full mb-3 shadow-lg overflow-hidden", !emp.image && "flex items-center justify-center text-xl font-bold text-white bg-gradient-to-br " + emp.gradient)}>
                                {emp.image
                                    ? <img src={emp.image} alt={emp.name} className="w-full h-full object-cover" />
                                    : emp.name.charAt(0).toUpperCase()
                                }
                            </div>
                            <h3 className="font-bold text-foreground">{emp.name}</h3>
                            <p className="text-xs font-medium text-primary bg-primary/8 px-2 py-0.5 rounded-md mt-1">{emp.jobTitle || '—'}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{emp.dept || '—'}</p>
                            {emp.employeeId && <p className="text-[10px] text-muted-foreground/60 mt-0.5">{emp.employeeId}</p>}
                        </div>

                        <div className="space-y-2 pt-4 border-t border-border">
                            {emp.email && (
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <Mail className="w-3 h-3 shrink-0" /><span className="truncate">{emp.email}</span>
                                </div>
                            )}
                            {emp.phone && (
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <Phone className="w-3 h-3 shrink-0" /><span>{emp.phone}</span>
                                </div>
                            )}
                        </div>

                        <div className="mt-4 pt-3 border-t border-border flex justify-between items-center">
                            <span className={cn(
                                "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                                emp.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800' :
                                    emp.status === 'On Leave' ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800' :
                                        'bg-muted text-muted-foreground border-border'
                            )}>
                                {emp.status}
                            </span>
                        </div>
                    </CardWrapper>
                ))}
            </div>

            {openMenuId && <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)} />}

            {/* ── Employee ID Card Modal ── */}
            {showIdCard && (
                <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setShowIdCard(null)}>
                    <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden" onClick={e => e.stopPropagation()}>
                        {/* Modal header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b">
                            <div className="flex items-center gap-2">
                                <CreditCard className="w-5 h-5 text-primary" />
                                <span className="font-bold text-foreground">Employee ID Card</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => window.print()}
                                    className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors"
                                >
                                    <Printer className="w-4 h-4" /> Print
                                </button>
                                <button onClick={() => setShowIdCard(null)} className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Printable card */}
                        <div className="p-8 flex justify-center">
                            <div
                                id="id-card-print"
                                className="w-[340px] rounded-2xl overflow-hidden shadow-xl border border-gray-200"
                                style={{ fontFamily: 'Manrope, sans-serif' }}
                            >
                                {/* Card header — brand green */}
                                <div className="relative px-6 pt-6 pb-10" style={{ background: 'linear-gradient(135deg, #009846 0%, #005a2b 100%)' }}>
                                    <div className="flex items-center gap-3 mb-4">
                                        {company?.logo
                                            ? <img src={company.logo} alt="Logo" className="h-8 object-contain brightness-0 invert" />
                                            : <span className="text-white font-black text-lg tracking-tight">{company?.name || 'Earthana'}</span>
                                        }
                                    </div>
                                    <p className="text-green-100 text-[11px] font-medium tracking-wide uppercase">Employee Identity Card</p>
                                    {/* Photo circle — overlapping */}
                                    <div className="absolute -bottom-10 left-6">
                                        <div className="w-20 h-20 rounded-full border-4 border-white shadow-lg overflow-hidden bg-gray-100 flex items-center justify-center">
                                            {showIdCard.image
                                                ? <img src={showIdCard.image} alt={showIdCard.name} className="w-full h-full object-cover" />
                                                : <span className="text-2xl font-black text-gray-400">{showIdCard.name.charAt(0)}</span>
                                            }
                                        </div>
                                    </div>
                                </div>

                                {/* Card body */}
                                <div className="bg-white pt-12 pb-5 px-6">
                                    <div className="mb-4">
                                        <h2 className="text-lg font-black text-gray-900 leading-tight">
                                            {showIdCard.initial ? `${showIdCard.initial} ` : ''}{showIdCard.name}
                                        </h2>
                                        <p className="text-sm font-semibold text-primary mt-0.5">{showIdCard.jobTitle || '—'}</p>
                                        <p className="text-xs text-gray-500 mt-0.5">{showIdCard.dept || 'General'}</p>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 border-t border-gray-100 pt-4">
                                        <div>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Employee ID</p>
                                            <p className="text-sm font-bold text-gray-800 mt-0.5">{showIdCard.employeeId || '—'}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Blood Group</p>
                                            <p className="text-sm font-bold text-red-600 mt-0.5">{showIdCard.bloodGroup || '—'}</p>
                                        </div>
                                        {showIdCard.phone && (
                                            <div className="col-span-2">
                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Contact</p>
                                                <p className="text-sm font-semibold text-gray-800 mt-0.5">{showIdCard.phone}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Card footer */}
                                <div className="px-6 py-3 flex items-center justify-between" style={{ background: '#f5f0eb' }}>
                                    <div>
                                        <p className="text-[10px] font-bold text-gray-500">{company?.name || 'Earthana Environmental Solutions Pvt. Ltd.'}</p>
                                        {company?.contactNumber && <p className="text-[10px] text-gray-400">{company.contactNumber}</p>}
                                    </div>
                                    <div className="w-px h-6 bg-gray-300" />
                                    <p className="text-[10px] font-bold" style={{ color: '#934e25' }}>{showIdCard.status}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </PageWrapper>
    );
}
