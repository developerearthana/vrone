"use client";

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import {
    Plus, Search, LayoutGrid, List, Loader2, Shield, Building2, KeyRound,
    Edit2, Trash2, AtSign, X, UserCheck2, Lock, Eye, EyeOff, Camera,
    Users as UsersIcon, UserCircle, ChevronDown,
} from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "@/components/ui/select";
import { cn } from '@/lib/utils';
import { toast } from '@/components/ui/toaster';
import { getAllUsers, createUser, updateUser, deleteUser, toggleUserStatus } from '@/app/actions/user';
import { getDepartments } from '@/app/actions/organization';
import { getRoles } from '@/app/actions/role';
import { getEmployees } from '@/app/actions/employee';
import { getMasters } from '@/app/actions/masters';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PasswordResetModal } from '@/components/admin/PasswordResetModal';
import { useViewPreference } from '@/hooks/useViewPreference';

interface Department { _id: string; name: string; }
interface Role { _id: string; name: string; description?: string; }
interface JobTitle { _id: string; label: string; value: string; }

interface User {
    _id?: string;
    id?: string;
    name: string;
    email: string;
    companyEmails?: string[];
    role: string;
    dept: string;
    jobTitle?: string;
    image?: string;
    status: 'Active' | 'Inactive' | 'On Leave';
    customRole?: string;
}

const STATUS_STYLES: Record<string, string> = {
    Active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    Inactive: 'bg-gray-100 text-gray-500 border-gray-200',
    'On Leave': 'bg-amber-50 text-amber-700 border-amber-200',
};

const CUSTOM_JOB_TITLE = '__custom__';

export default function UsersMaster() {
    const { data: session, update: updateSession } = useSession();
    const [users, setUsers] = useState<User[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [employees, setEmployees] = useState<any[]>([]);
    const [jobTitles, setJobTitles] = useState<JobTitle[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useViewPreference<'grid' | 'list'>('usersViewMode', 'grid');
    const [statusFilter, setStatusFilter] = useState('All');

    const [resetModalOpen, setResetModalOpen] = useState(false);
    const [selectedUserForReset, setSelectedUserForReset] = useState<{ id: string; name: string } | null>(null);

    // Selected employee for prefill
    const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
    // Whether to use the employee's photo or a custom upload
    const [useEmployeePhoto, setUseEmployeePhoto] = useState(true);
    const [employeePhoto, setEmployeePhoto] = useState('');
    const [customPhoto, setCustomPhoto] = useState('');
    // Job title: selected value from dropdown ('__custom__' means free-text)
    const [jobTitleSelect, setJobTitleSelect] = useState('');

    const [formData, setFormData] = useState({
        name: '', email: '', password: '', role: 'user',
        dept: '', jobTitle: '', status: 'Active' as const, customRole: '', image: '',
    });
    const [companyEmails, setCompanyEmails] = useState<string[]>([]);
    const [companyEmailInput, setCompanyEmailInput] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [selectedRoleValue, setSelectedRoleValue] = useState<string>('system:user');
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        setLoading(true);
        const [usersData, deptsData, rolesData, empData, titlesData] = await Promise.all([
            getAllUsers(),
            getDepartments(),
            getRoles(),
            getEmployees(),
            getMasters('JobTitle'),
        ]);
        setUsers(usersData || []);
        setDepartments(deptsData || []);
        setRoles(rolesData || []);
        setEmployees(empData || []);
        setJobTitles(titlesData?.data || []);
        setLoading(false);
    };

    // Resolve active photo (employee photo or custom upload)
    const activePhoto = useEmployeePhoto ? employeePhoto : customPhoto;

    const handleOpenSheet = (user?: User) => {
        if (user) {
            setCurrentUser(user);
            const isCustom = user.customRole && roles.some(r => r._id === user.customRole);
            const jt = user.jobTitle || '';
            const matchedTitle = jobTitles.find(t => t.label === jt || t.value === jt);
            setFormData({
                name: user.name, email: user.email, password: '', role: user.role,
                dept: user.dept || '', jobTitle: jt, status: user.status as any,
                customRole: user.customRole || '', image: user.image || '',
            });
            setJobTitleSelect(matchedTitle ? matchedTitle.value : (jt ? CUSTOM_JOB_TITLE : ''));
            setCompanyEmails((user as any).companyEmails || []);
            setSelectedRoleValue(isCustom ? `custom:${user.customRole}` : `system:${user.role}`);
            setEmployeePhoto(user.image || '');
            setCustomPhoto('');
            setUseEmployeePhoto(true);
            setSelectedEmployeeId('');
        } else {
            setCurrentUser(null);
            setFormData({ name: '', email: '', password: '', role: 'user', dept: '', jobTitle: '', status: 'Active', customRole: '', image: '' });
            setJobTitleSelect('');
            setCompanyEmails([]);
            setSelectedRoleValue('system:user');
            setSelectedEmployeeId('');
            setEmployeePhoto('');
            setCustomPhoto('');
            setUseEmployeePhoto(true);
        }
        setCompanyEmailInput('');
        setConfirmPassword('');
        setShowPassword(false);
        setShowConfirm(false);
        setIsSheetOpen(true);
    };

    const handleRoleChange = (val: string) => {
        setSelectedRoleValue(val);
        if (val.startsWith('system:')) {
            setFormData(f => ({ ...f, role: val.split(':')[1], customRole: '' }));
        } else if (val.startsWith('custom:')) {
            setFormData(f => ({ ...f, role: 'user', customRole: val.split(':')[1] }));
        }
    };

    const handleEmployeeSelect = (empId: string) => {
        setSelectedEmployeeId(empId);
        const emp = employees.find((e: any) => e._id === empId);
        if (!emp) return;
        // Prefill form
        const jt = emp.jobTitle || '';
        const matchedTitle = jobTitles.find(t => t.label === jt || t.value === jt);
        setFormData(prev => ({
            ...prev,
            name: emp.name || prev.name,
            email: emp.email || prev.email,
            dept: emp.dept || prev.dept,
            jobTitle: jt,
            image: emp.image || prev.image,
        }));
        setJobTitleSelect(matchedTitle ? matchedTitle.value : (jt ? CUSTOM_JOB_TITLE : ''));
        // Set the employee's photo as the default
        setEmployeePhoto(emp.image || '');
        setUseEmployeePhoto(true);
    };

    const handleJobTitleSelect = (val: string) => {
        setJobTitleSelect(val);
        if (val !== CUSTOM_JOB_TITLE) {
            const t = jobTitles.find(jt => jt.value === val);
            setFormData(f => ({ ...f, jobTitle: t?.label || val }));
        } else {
            setFormData(f => ({ ...f, jobTitle: '' }));
        }
    };

    const handleCustomPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) { toast.error('Image must be under 2 MB'); return; }
        const reader = new FileReader();
        reader.onload = () => {
            setCustomPhoto(reader.result as string);
            setUseEmployeePhoto(false);
        };
        reader.readAsDataURL(file);
    };

    const addCompanyEmail = () => {
        const val = companyEmailInput.trim().toLowerCase();
        if (!val) return;
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) { toast.error('Enter a valid email address'); return; }
        if (companyEmails.includes(val)) { toast.error('Already added'); return; }
        setCompanyEmails(prev => [...prev, val]);
        setCompanyEmailInput('');
    };

    const removeCompanyEmail = (email: string) => setCompanyEmails(prev => prev.filter(e => e !== email));

    const getRoleLabel = (user: User) => {
        if (user.customRole) {
            const r = roles.find(r => r._id === user.customRole);
            if (r) return r.name;
        }
        return user.role;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (formData.password && formData.password !== confirmPassword) {
            toast.error('Passwords do not match'); return;
        }
        // Resolve final image: active photo (never a data: URI from employee — already guarded in auth.ts)
        const finalImage = activePhoto;
        setIsSaving(true);
        try {
            const payload = { ...formData, image: finalImage, companyEmails };
            let res;
            if (currentUser && (currentUser._id || currentUser.id)) {
                res = await updateUser({ ...payload, id: currentUser._id || currentUser.id });
            } else {
                res = await createUser(payload);
            }
            if (res.success) {
                toast.success(currentUser ? 'User updated' : 'User created');
                const editedId = currentUser?._id || currentUser?.id;
                if (editedId && editedId === session?.user?.id && finalImage !== session?.user?.image) {
                    await updateSession({ image: finalImage });
                }
                setIsSheetOpen(false);
                loadData();
            } else {
                toast.error(res.error || 'Operation failed');
            }
        } catch { toast.error('An error occurred'); }
        setIsSaving(false);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this user? This cannot be undone.')) return;
        const res = await deleteUser({ id });
        if (res.success) { toast.success('User deleted'); loadData(); }
        else toast.error(res.error || 'Failed to delete');
    };

    const handleStatusToggle = async (user: User) => {
        const uid = user._id || user.id!;
        const next = user.status === 'Active' ? 'Inactive' : 'Active';
        setUsers(prev => prev.map(u => (u._id === uid || u.id === uid) ? { ...u, status: next as any } : u));
        try {
            await toggleUserStatus(uid, user.status);
            toast.success(`${user.name} ${next === 'Active' ? 'activated' : 'deactivated'}`);
        } catch { loadData(); toast.error('Failed to update status'); }
    };

    const filteredUsers = users.filter(u => {
        const q = searchQuery.toLowerCase();
        const matchQ = u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
            || (u.companyEmails || []).some(e => e.toLowerCase().includes(q));
        return matchQ && (statusFilter === 'All' || u.status === statusFilter);
    });

    const inputCls = "w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:ring-2 focus:ring-primary/20 outline-none";

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Users</h1>
                    <p className="text-muted-foreground text-sm mt-0.5">
                        ERP login accounts for selected staff. Create an employee record first, then add a user here to grant ERP access.
                    </p>
                </div>
                <Button onClick={() => handleOpenSheet()} className="bg-primary hover:bg-primary/90 shadow-md shadow-primary/20 w-full md:w-auto">
                    <Plus className="w-4 h-4 mr-2" /> Add User
                </Button>
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-3 bg-card p-4 rounded-xl border border-border shadow-sm items-center">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search by name, login email or company email…" value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)} className="pl-9 text-sm" />
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-[130px] bg-background text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-white">
                            <SelectItem value="All">All Status</SelectItem>
                            <SelectItem value="Active">Active</SelectItem>
                            <SelectItem value="Inactive">Inactive</SelectItem>
                            <SelectItem value="On Leave">On Leave</SelectItem>
                        </SelectContent>
                    </Select>
                    <div className="flex items-center border border-border rounded-lg overflow-hidden bg-card">
                        <button onClick={() => setViewMode('grid')} className={cn("p-2.5 transition-colors", viewMode === 'grid' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground')}>
                            <LayoutGrid className="w-4 h-4" />
                        </button>
                        <div className="w-px h-6 bg-border" />
                        <button onClick={() => setViewMode('list')} className={cn("p-2.5 transition-colors", viewMode === 'list' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground')}>
                            <List className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 animate-spin text-primary" /></div>
            ) : filteredUsers.length === 0 ? (
                <div className="text-center text-muted-foreground py-16 border border-dashed border-border rounded-xl bg-card">
                    <UserCheck2 className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
                    <p className="font-medium">No users found</p>
                    <p className="text-sm mt-1">Try adjusting the search or add a new user.</p>
                </div>
            ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredUsers.map(user => (
                        <div key={user._id || user.id} className="bg-card border border-border rounded-xl p-5 hover:shadow-md hover:border-primary/30 transition-all group flex flex-col">
                            <div className="flex items-center gap-3 mb-4">
                                <Avatar className="w-10 h-10 shrink-0">
                                    <AvatarImage src={user.image} />
                                    <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm">{user.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                    <p className="font-semibold text-foreground text-sm truncate">{user.name}</p>
                                    <p className="text-xs text-muted-foreground truncate">{user.jobTitle || getRoleLabel(user)}</p>
                                </div>
                            </div>
                            <div className="space-y-1.5 mb-3">
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                    <Lock className="w-3 h-3 shrink-0 text-primary/50" />
                                    <span className="truncate font-medium text-foreground/80">{user.email}</span>
                                </div>
                                {(user.companyEmails || []).length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-1.5">
                                        {(user.companyEmails || []).map(ce => (
                                            <span key={ce} className="inline-flex items-center gap-1 text-[10px] font-medium bg-primary/8 text-primary px-1.5 py-0.5 rounded-md border border-primary/20">
                                                <AtSign className="w-2.5 h-2.5" />{ce}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="flex items-center gap-2 flex-wrap mb-4 mt-auto">
                                {user.dept && (
                                    <span className="text-[10px] font-semibold bg-muted text-muted-foreground px-2 py-0.5 rounded-md flex items-center gap-1">
                                        <Building2 className="w-3 h-3" />{user.dept}
                                    </span>
                                )}
                                <span className="text-[10px] font-semibold bg-primary/8 text-primary px-2 py-0.5 rounded-md flex items-center gap-1 capitalize">
                                    <Shield className="w-3 h-3" />{getRoleLabel(user)}
                                </span>
                                <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full border ml-auto", STATUS_STYLES[user.status] || '')}>
                                    {user.status}
                                </span>
                            </div>
                            <div className="flex items-center justify-between pt-3 border-t border-border">
                                <button onClick={() => handleStatusToggle(user)} className="flex items-center gap-2">
                                    <span className={cn("relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200", user.status === 'Active' ? 'bg-primary' : 'bg-muted')}>
                                        <span className={cn("inline-block h-4 w-4 rounded-full bg-white shadow transition-transform duration-200", user.status === 'Active' ? 'translate-x-4' : 'translate-x-0')} />
                                    </span>
                                    <span className={cn("text-xs font-semibold", user.status === 'Active' ? 'text-emerald-600' : 'text-muted-foreground')}>
                                        {user.status === 'Active' ? 'Active' : user.status}
                                    </span>
                                </button>
                                <div className="flex items-center gap-1">
                                    <Button variant="ghost" size="sm" className="h-7 px-2 text-muted-foreground hover:text-foreground"
                                        onClick={() => { setSelectedUserForReset({ id: user._id || user.id!, name: user.name }); setResetModalOpen(true); }}>
                                        <KeyRound className="w-3.5 h-3.5" />
                                    </Button>
                                    <Button variant="ghost" size="sm" className="h-7 px-2 text-amber-600 hover:bg-amber-50" onClick={() => handleOpenSheet(user)}>
                                        <Edit2 className="w-3.5 h-3.5 mr-1" />Edit
                                    </Button>
                                    <Button variant="ghost" size="sm" className="h-7 px-2 text-red-600 hover:bg-red-50" onClick={() => handleDelete(user._id || user.id!)}>
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-muted-foreground uppercase bg-muted/40 border-b border-border">
                            <tr>
                                <th className="px-4 py-3 font-semibold">User</th>
                                <th className="px-4 py-3 font-semibold hidden sm:table-cell">Login Email</th>
                                <th className="px-4 py-3 font-semibold hidden md:table-cell">Company Emails</th>
                                <th className="px-4 py-3 font-semibold hidden md:table-cell">Role</th>
                                <th className="px-4 py-3 font-semibold text-center">Active</th>
                                <th className="px-4 py-3 font-semibold text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {filteredUsers.map(user => (
                                <tr key={user._id || user.id} className="hover:bg-muted/20 transition-colors">
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2.5">
                                            <Avatar className="w-8 h-8 shrink-0">
                                                <AvatarImage src={user.image} />
                                                <AvatarFallback className="text-xs bg-primary/10 text-primary font-bold">{user.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <p className="font-semibold text-foreground">{user.name}</p>
                                                <p className="text-xs text-muted-foreground">{user.dept || '—'}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 hidden sm:table-cell text-xs text-muted-foreground">
                                        <div className="flex items-center gap-1">
                                            <Lock className="w-3 h-3 text-primary/50 shrink-0" />
                                            <span className="truncate max-w-[160px]">{user.email}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 hidden md:table-cell">
                                        <div className="flex flex-wrap gap-1">
                                            {(user.companyEmails || []).length > 0
                                                ? (user.companyEmails || []).map(ce => (
                                                    <span key={ce} className="text-[10px] bg-primary/8 text-primary px-1.5 py-0.5 rounded border border-primary/20 font-medium">{ce}</span>
                                                ))
                                                : <span className="text-xs text-muted-foreground/50">—</span>}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 hidden md:table-cell">
                                        <span className="text-xs font-semibold bg-primary/8 text-primary px-2 py-0.5 rounded-full capitalize">{getRoleLabel(user)}</span>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <button onClick={() => handleStatusToggle(user)}
                                            className={cn("relative inline-flex h-5 w-9 cursor-pointer rounded-full border-2 border-transparent transition-colors", user.status === 'Active' ? 'bg-primary' : 'bg-muted')}>
                                            <span className={cn("inline-block h-4 w-4 rounded-full bg-white shadow transition-transform", user.status === 'Active' ? 'translate-x-4' : 'translate-x-0')} />
                                        </button>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground rounded-lg"
                                                onClick={() => { setSelectedUserForReset({ id: user._id || user.id!, name: user.name }); setResetModalOpen(true); }}>
                                                <KeyRound className="w-4 h-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-amber-600 hover:bg-amber-50 rounded-lg" onClick={() => handleOpenSheet(user)}>
                                                <Edit2 className="w-4 h-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:bg-red-50 rounded-lg" onClick={() => handleDelete(user._id || user.id!)}>
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* ── Create / Edit Sheet ── */}
            <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
                    <SheetHeader className="pb-4 border-b border-border mb-6">
                        <SheetTitle className="text-lg font-bold">{currentUser ? 'Edit User' : 'Add New User'}</SheetTitle>
                        <p className="text-sm text-muted-foreground">
                            {currentUser
                                ? 'Update ERP account details, role and email assignments.'
                                : 'Grant ERP access to a staff member. Select their employee record to auto-fill details.'}
                        </p>
                    </SheetHeader>

                    <form onSubmit={handleSubmit} className="space-y-7">

                        {/* ── Step 1: Select Employee (new user only) ── */}
                        {!currentUser && (
                            <div className="rounded-xl border-2 border-primary/30 bg-primary/5 overflow-hidden">
                                <div className="px-4 py-3 bg-primary/10 border-b border-primary/20 flex items-center gap-2">
                                    <UsersIcon className="w-4 h-4 text-primary" />
                                    <p className="text-sm font-bold text-primary">Step 1 — Select Employee</p>
                                </div>
                                <div className="p-4 space-y-3">
                                    <p className="text-xs text-muted-foreground">
                                        All staff should have an <strong>Employee</strong> record (HRM → Employees).
                                        <br />Select one below to grant them ERP access — details will auto-fill.
                                    </p>
                                    {employees.length === 0 ? (
                                        <p className="text-xs text-amber-600 font-medium bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                                            No employee records found. Create employees in HRM → Employees first.
                                        </p>
                                    ) : (
                                        <Select value={selectedEmployeeId} onValueChange={handleEmployeeSelect}>
                                            <SelectTrigger className="bg-background text-sm font-medium">
                                                <SelectValue placeholder="Choose an employee…" />
                                            </SelectTrigger>
                                            <SelectContent className="bg-white max-h-[260px]">
                                                {employees.map((emp: any) => (
                                                    <SelectItem key={emp._id} value={emp._id}>
                                                        <div className="flex flex-col">
                                                            <span className="font-medium">{emp.name}</span>
                                                            {(emp.jobTitle || emp.dept) && (
                                                                <span className="text-xs text-muted-foreground">
                                                                    {[emp.jobTitle, emp.dept].filter(Boolean).join(' · ')}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}
                                    {selectedEmployeeId && (
                                        <p className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                                            Employee selected — identity details are locked and sourced from the HR record.
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* ── Identity & ERP Access ── */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 pb-1 border-b border-border">
                                <Lock className="w-4 h-4 text-primary" />
                                <h3 className="text-sm font-bold text-foreground">
                                    {currentUser ? 'Identity & ERP Access' : 'Step 2 — Identity & ERP Access'}
                                </h3>
                            </div>

                            {/* Profile Photo */}
                            <div className="space-y-3">
                                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Profile Photo</Label>
                                <div className="flex items-start gap-4">
                                    {/* Preview */}
                                    <div className="w-16 h-16 rounded-full border-2 border-border overflow-hidden bg-muted flex items-center justify-center shrink-0">
                                        {activePhoto
                                            ? <img src={activePhoto} alt="Profile" className="w-full h-full object-cover" />
                                            : <UserCircle className="w-8 h-8 text-muted-foreground/40" />}
                                    </div>
                                    <div className="flex-1 space-y-2">
                                        {/* If employee photo exists, let user choose */}
                                        {employeePhoto ? (
                                            <div className="space-y-2">
                                                <div className="flex gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => setUseEmployeePhoto(true)}
                                                        className={cn(
                                                            "flex-1 text-xs font-semibold px-3 py-2 rounded-lg border transition-colors",
                                                            useEmployeePhoto
                                                                ? "bg-primary text-white border-primary"
                                                                : "bg-background text-muted-foreground border-border hover:border-primary/40"
                                                        )}
                                                    >
                                                        Use Employee Photo
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => { setUseEmployeePhoto(false); fileInputRef.current?.click(); }}
                                                        className={cn(
                                                            "flex-1 text-xs font-semibold px-3 py-2 rounded-lg border transition-colors",
                                                            !useEmployeePhoto
                                                                ? "bg-primary text-white border-primary"
                                                                : "bg-background text-muted-foreground border-border hover:border-primary/40"
                                                        )}
                                                    >
                                                        Upload Different
                                                    </button>
                                                </div>
                                                <p className="text-[11px] text-muted-foreground">
                                                    {useEmployeePhoto ? "Using photo from employee record." : "Upload a different photo for ERP login."}
                                                </p>
                                            </div>
                                        ) : (
                                            <div>
                                                <button
                                                    type="button"
                                                    onClick={() => fileInputRef.current?.click()}
                                                    className="flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-lg border border-dashed border-border hover:border-primary/50 hover:bg-primary/5 text-muted-foreground hover:text-primary transition-colors"
                                                >
                                                    <Camera className="w-4 h-4" /> Upload Photo
                                                </button>
                                                <p className="text-[11px] text-muted-foreground mt-1">Max 2 MB · Shown in ERP header</p>
                                            </div>
                                        )}
                                        {activePhoto && (
                                            <button type="button"
                                                onClick={() => { setCustomPhoto(''); setEmployeePhoto(''); setUseEmployeePhoto(true); }}
                                                className="text-[11px] text-red-500 hover:text-red-600 font-medium">
                                                Remove photo
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleCustomPhotoUpload} />
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Full Name <span className="text-red-500">*</span></Label>
                                {(selectedEmployeeId !== '' || currentUser !== null) ? (
                                    <div className="bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground font-medium flex items-center gap-2">
                                        <Lock className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
                                        {formData.name || 'Not selected yet'}
                                    </div>
                                ) : (
                                    <Input required value={formData.name} onChange={e => setFormData(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Arjun Sharma" />
                                )}
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                    Personal Email — Login ID <span className="text-red-500">*</span>
                                </Label>
                                <p className="text-[11px] text-muted-foreground -mt-0.5">Used to log in to Vrone ERP. Usually the personal email, not the company email.</p>
                                {(selectedEmployeeId !== '' || currentUser !== null) ? (
                                    <div className="bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground font-medium flex items-center gap-2">
                                        <Lock className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
                                        {formData.email || 'Not selected yet'}
                                    </div>
                                ) : (
                                    <Input required type="email" value={formData.email}
                                        onChange={e => setFormData(f => ({ ...f, email: e.target.value }))}
                                        placeholder="personal@gmail.com" />
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                        {currentUser ? 'New Password' : 'Password'}{' '}
                                        {currentUser && <span className="normal-case font-normal text-muted-foreground/60">(blank = keep)</span>}
                                    </Label>
                                    <div className="relative">
                                        <Input type={showPassword ? 'text' : 'password'} value={formData.password}
                                            onChange={e => setFormData(f => ({ ...f, password: e.target.value }))}
                                            placeholder={currentUser ? '••••••••' : 'Set password'}
                                            required={!currentUser} autoComplete="new-password" className="pr-9" />
                                        <button type="button" tabIndex={-1} onClick={() => setShowPassword(v => !v)}
                                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Confirm Password</Label>
                                    <div className="relative">
                                        <Input type={showConfirm ? 'text' : 'password'} value={confirmPassword}
                                            onChange={e => setConfirmPassword(e.target.value)}
                                            placeholder="Re-enter password"
                                            required={!currentUser || !!formData.password} autoComplete="new-password"
                                            className={cn("pr-9",
                                                confirmPassword && formData.password !== confirmPassword ? "border-red-400" : "",
                                                confirmPassword && formData.password === confirmPassword ? "border-emerald-400" : ""
                                            )} />
                                        <button type="button" tabIndex={-1} onClick={() => setShowConfirm(v => !v)}
                                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                                            {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                    {confirmPassword && formData.password !== confirmPassword && (
                                        <p className="text-[10px] text-red-500 font-medium">Passwords don't match</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* ── Role & Department ── */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 pb-1 border-b border-border">
                                <Shield className="w-4 h-4 text-primary" />
                                <h3 className="text-sm font-bold text-foreground">
                                    {currentUser ? 'Role & Department' : 'Step 3 — Role & Department'}
                                </h3>
                            </div>

                            {/* Department — frozen when employee selected or in edit mode */}
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Department</Label>
                                {(selectedEmployeeId !== '' || currentUser !== null) ? (
                                    <div className="bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground font-medium flex items-center gap-2">
                                        <Lock className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
                                        {formData.dept || <span className="text-muted-foreground/50 font-normal">Not set</span>}
                                    </div>
                                ) : (
                                    <Select value={formData.dept} onValueChange={v => setFormData(f => ({ ...f, dept: v }))}>
                                        <SelectTrigger className="text-sm"><SelectValue placeholder="Select department" /></SelectTrigger>
                                        <SelectContent className="bg-white">
                                            {departments.length === 0
                                                ? <SelectItem value="" disabled>No departments — add in Masters › Depts</SelectItem>
                                                : departments.map(d => <SelectItem key={d._id} value={d.name}>{d.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                )}
                            </div>

                            {/* Job Title — frozen when employee selected or in edit mode */}
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Job Title</Label>
                                {(selectedEmployeeId !== '' || currentUser !== null) ? (
                                    <div className="bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground font-medium flex items-center gap-2">
                                        <Lock className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
                                        {formData.jobTitle || <span className="text-muted-foreground/50 font-normal">Not set</span>}
                                    </div>
                                ) : (
                                    jobTitles.length > 0 ? (
                                        <div className="space-y-2">
                                            <Select value={jobTitleSelect} onValueChange={handleJobTitleSelect}>
                                                <SelectTrigger className="text-sm"><SelectValue placeholder="Select job title" /></SelectTrigger>
                                                <SelectContent className="bg-white max-h-[240px]">
                                                    {jobTitles.map(jt => (
                                                        <SelectItem key={jt._id} value={jt.value}>{jt.label}</SelectItem>
                                                    ))}
                                                    <SelectItem value={CUSTOM_JOB_TITLE}>
                                                        <span className="italic text-muted-foreground">Enter custom title…</span>
                                                    </SelectItem>
                                                </SelectContent>
                                            </Select>
                                            {jobTitleSelect === CUSTOM_JOB_TITLE && (
                                                <Input
                                                    autoFocus
                                                    value={formData.jobTitle}
                                                    onChange={e => setFormData(f => ({ ...f, jobTitle: e.target.value }))}
                                                    placeholder="e.g. Senior Developer"
                                                />
                                            )}
                                        </div>
                                    ) : (
                                        <Input value={formData.jobTitle}
                                            onChange={e => setFormData(f => ({ ...f, jobTitle: e.target.value }))}
                                            placeholder="e.g. Senior Developer" />
                                    )
                                )}
                                {!selectedEmployeeId && !currentUser && jobTitles.length === 0 && (
                                    <p className="text-[11px] text-muted-foreground">Add standard titles in Masters › Job Titles for dropdown selection.</p>
                                )}
                            </div>

                            {/* Employee Details Panel — shown after employee selection or in edit mode */}
                            {(() => {
                                let emp: any = null;
                                if (selectedEmployeeId) {
                                    emp = employees.find((e: any) => e._id === selectedEmployeeId);
                                } else if (currentUser) {
                                    emp = employees.find((e: any) => e.email === currentUser.email || e.name === currentUser.name);
                                }
                                if (!emp) return null;
                                return (
                                    <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
                                        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                            <UserCircle className="w-3.5 h-3.5" /> Employee Details (from HR record)
                                        </p>
                                        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                                            {[
                                                ['Employee ID', emp.employeeId],
                                                ['Phone', emp.phone],
                                                ['Gender', emp.gender],
                                                ['Date of Birth', emp.dateOfBirth ? new Date(emp.dateOfBirth).toLocaleDateString('en-IN') : null],
                                                ['Blood Group', emp.bloodGroup],
                                                ['Marital Status', emp.maritalStatus],
                                                ['Status', emp.status],
                                                ['Reporting Manager', emp.reportingManager],
                                            ].filter(([, v]) => v).map(([label, val]) => (
                                                <div key={label as string}>
                                                    <span className="text-muted-foreground">{label}: </span>
                                                    <span className="font-medium text-foreground">{val as string}</span>
                                                </div>
                                            ))}
                                            {emp.address && (
                                                <div className="col-span-2">
                                                    <span className="text-muted-foreground">Address: </span>
                                                    <span className="font-medium text-foreground">{emp.address}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })()}

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">ERP User Role</Label>
                                    <Select value={selectedRoleValue} onValueChange={handleRoleChange}>
                                        <SelectTrigger className="text-sm"><SelectValue placeholder="Select Role" /></SelectTrigger>
                                        <SelectContent className="bg-white max-h-[300px]">
                                            <SelectGroup>
                                                <SelectLabel>System Roles</SelectLabel>
                                                <SelectItem value="system:super-admin">Super Admin</SelectItem>
                                                <SelectItem value="system:admin">Admin</SelectItem>
                                                <SelectItem value="system:manager">Manager</SelectItem>
                                                <SelectItem value="system:staff">Staff</SelectItem>
                                                <SelectItem value="system:vendor">Vendor</SelectItem>
                                            </SelectGroup>
                                            {roles.length > 0 && (
                                                <SelectGroup>
                                                    <SelectLabel>Custom ERP Roles</SelectLabel>
                                                    {roles.map(r => (
                                                        <SelectItem key={r._id} value={`custom:${r._id}`}>{r.name}</SelectItem>
                                                    ))}
                                                </SelectGroup>
                                            )}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</Label>
                                    <Select value={formData.status} onValueChange={(v: any) => setFormData(f => ({ ...f, status: v }))}>
                                        <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                                        <SelectContent className="bg-white">
                                            <SelectItem value="Active">Active</SelectItem>
                                            <SelectItem value="Inactive">Inactive</SelectItem>
                                            <SelectItem value="On Leave">On Leave</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>

                        {/* ── Company Emails ── */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 pb-1 border-b border-border">
                                <AtSign className="w-4 h-4 text-primary" />
                                <h3 className="text-sm font-bold text-foreground">Company Email Assignments</h3>
                            </div>
                            <p className="text-xs text-muted-foreground -mt-2">
                                Company emails this user monitors — for routing only, not used for login.
                            </p>
                            {companyEmails.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                    {companyEmails.map(ce => (
                                        <span key={ce} className="inline-flex items-center gap-1.5 text-xs font-medium bg-primary/8 text-primary border border-primary/20 px-2.5 py-1 rounded-full">
                                            <AtSign className="w-3 h-3" />{ce}
                                            <button type="button" onClick={() => removeCompanyEmail(ce)}
                                                className="ml-0.5 text-primary/50 hover:text-red-500 transition-colors">
                                                <X className="w-3 h-3" />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            )}
                            <div className="flex gap-2">
                                <input type="email" className={inputCls + " flex-1"} placeholder="e.g. sales@earthana.in"
                                    value={companyEmailInput} onChange={e => setCompanyEmailInput(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCompanyEmail(); } }} />
                                <button type="button" onClick={addCompanyEmail}
                                    className="px-3 py-2 bg-primary/10 text-primary hover:bg-primary/20 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap">
                                    + Add
                                </button>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex justify-between items-center pt-2 border-t border-border">
                            <Button type="button" variant="outline" onClick={() => setIsSheetOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={isSaving} className="bg-primary hover:bg-primary/90 shadow-md shadow-primary/20">
                                {isSaving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                                {currentUser ? 'Update User' : 'Create User'}
                            </Button>
                        </div>
                    </form>
                </SheetContent>
            </Sheet>

            {selectedUserForReset && (
                <PasswordResetModal
                    isOpen={resetModalOpen}
                    onClose={() => { setResetModalOpen(false); setSelectedUserForReset(null); }}
                    userId={selectedUserForReset.id}
                    userName={selectedUserForReset.name}
                />
            )}
        </div>
    );
}
