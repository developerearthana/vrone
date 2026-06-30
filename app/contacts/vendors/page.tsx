"use client";

import { useState, useEffect } from 'react';
import { Plus, Trash2, Loader2, X, Tag, Building2, Edit2, Check } from 'lucide-react';
import { getMasters, createMaster, updateMaster, deleteMaster } from '@/app/actions/masters';
import { getVendors, createVendor, deleteVendor } from '@/app/actions/vendors';
import { toast } from 'sonner';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface Vendor {
    _id: string;
    name: string;
    category?: string;
    address?: string;
    phone?: string;
    gstin?: string;
}

interface VendorCategory {
    _id: string;
    label: string;
    value: string;
    metadata?: { description?: string };
}

export default function VendorsPage() {
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [categories, setCategories] = useState<VendorCategory[]>([]);
    const [loading, setLoading] = useState(true);

    const [showVendorSheet, setShowVendorSheet] = useState(false);
    const [vendorForm, setVendorForm] = useState({ name: '', category: '', address: '', phone: '', gstin: '' });
    const [savingVendor, setSavingVendor] = useState(false);

    const [showCategoryDialog, setShowCategoryDialog] = useState(false);
    const [catName, setCatName] = useState('');
    const [catDesc, setCatDesc] = useState('');
    const [savingCat, setSavingCat] = useState(false);
    const [editCatId, setEditCatId] = useState<string | null>(null);
    const [editCatName, setEditCatName] = useState('');
    const [editCatDesc, setEditCatDesc] = useState('');
    const [savingEditCat, setSavingEditCat] = useState(false);

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        setLoading(true);
        const [vendorRes, catRes] = await Promise.all([getVendors(), getMasters('VendorCategory')]);
        if (vendorRes.success && vendorRes.data) setVendors(vendorRes.data);
        if (catRes.success && catRes.data) setCategories(catRes.data);
        setLoading(false);
    };

    const loadCategories = async () => {
        const catRes = await getMasters('VendorCategory');
        if (catRes.success && catRes.data) setCategories(catRes.data);
    };

    const handleAddVendor = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!vendorForm.name.trim()) return;
        setSavingVendor(true);
        const res = await createVendor({
            name: vendorForm.name.trim(),
            category: vendorForm.category || undefined,
            address: vendorForm.address || undefined,
            phone: vendorForm.phone || undefined,
            gstin: vendorForm.gstin || undefined,
        });
        if (res.success) {
            toast.success('Vendor added');
            setVendorForm({ name: '', category: '', address: '', phone: '', gstin: '' });
            setShowVendorSheet(false);
            loadData();
        } else {
            toast.error(res.error || 'Failed to add vendor');
        }
        setSavingVendor(false);
    };

    const handleAddCategory = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!catName.trim()) return;
        setSavingCat(true);
        const res = await createMaster({ type: 'VendorCategory', label: catName.trim(), value: catName.trim(), isActive: true, metadata: { description: catDesc } } as any);
        if (res.success) {
            toast.success('Category added');
            setCatName(''); setCatDesc(''); setShowCategoryDialog(false);
            await loadCategories();
        } else {
            toast.error(res.error || 'Failed to add category');
        }
        setSavingCat(false);
    };

    const handleEditCatSave = async () => {
        if (!editCatId || !editCatName.trim()) return;
        setSavingEditCat(true);
        const res = await updateMaster(editCatId, { label: editCatName.trim(), value: editCatName.trim(), metadata: { description: editCatDesc } } as any);
        if (res.success) { toast.success('Category updated'); setEditCatId(null); await loadCategories(); }
        else toast.error(res.error || 'Failed to update');
        setSavingEditCat(false);
    };

    const handleDeleteCategory = async (id: string, name: string) => {
        if (!confirm(`Delete category "${name}"?`)) return;
        const res = await deleteMaster(id);
        if (res.success) { toast.success('Category deleted'); await loadCategories(); }
        else toast.error(res.error || 'Failed to delete');
    };

    const handleDeleteVendor = async (id: string, name: string) => {
        if (!confirm(`Delete vendor "${name}"?`)) return;
        const res = await deleteVendor(id);
        if (res.success) { toast.success('Vendor deleted'); setVendors(prev => prev.filter(v => v._id !== id)); }
        else toast.error(res.error || 'Failed to delete vendor');
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Vendors</h1>
                    <p className="text-muted-foreground mt-1 text-sm">Manage all vendors and supplier details.</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowCategoryDialog(true)}
                        className="flex items-center gap-2 border border-border bg-card text-foreground px-4 py-2 rounded-lg hover:bg-muted transition-colors font-medium text-sm"
                    >
                        <Tag className="w-4 h-4" /> Manage Categories
                    </button>
                    <button
                        onClick={() => setShowVendorSheet(true)}
                        className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors font-semibold text-sm shadow-md shadow-primary/20"
                    >
                        <Plus className="w-4 h-4" /> Add Vendor
                    </button>
                </div>
            </div>

            <div className="glass-card rounded-xl overflow-hidden border border-border shadow-sm bg-card">
                {loading ? (
                    <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-muted/40 border-b border-border text-muted-foreground">
                                <tr>
                                    <th className="px-6 py-3 font-semibold w-12">S.No</th>
                                    <th className="px-6 py-3 font-semibold">Vendor Name</th>
                                    <th className="px-6 py-3 font-semibold hidden sm:table-cell">Category</th>
                                    <th className="px-6 py-3 font-semibold hidden md:table-cell">Contact</th>
                                    <th className="px-6 py-3 font-semibold hidden lg:table-cell">GSTIN</th>
                                    <th className="px-6 py-3 font-semibold text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {vendors.map((vendor, index) => (
                                    <tr key={vendor._id} className="group hover:bg-muted/20 transition-colors">
                                        <td className="px-6 py-4 text-muted-foreground font-mono text-xs">{index + 1}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                                    <Building2 className="w-4 h-4 text-primary" />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-foreground">{vendor.name}</p>
                                                    {vendor.address && <p className="text-xs text-muted-foreground truncate max-w-[200px]">{vendor.address}</p>}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 hidden sm:table-cell">
                                            {vendor.category
                                                ? <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium"><Tag className="w-3 h-3" />{vendor.category}</span>
                                                : <span className="text-muted-foreground">—</span>}
                                        </td>
                                        <td className="px-6 py-4 text-muted-foreground hidden md:table-cell">{vendor.phone || '—'}</td>
                                        <td className="px-6 py-4 text-muted-foreground font-mono text-xs hidden lg:table-cell">{vendor.gstin || '—'}</td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => handleDeleteVendor(vendor._id, vendor.name)}
                                                className="p-1.5 text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                                title="Delete vendor"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {vendors.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="p-10 text-center text-muted-foreground">
                                            No vendors added yet. Click "Add Vendor" to get started.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Add Vendor Sheet */}
            <Sheet open={showVendorSheet} onOpenChange={setShowVendorSheet}>
                <SheetContent side="right" className="sm:max-w-lg w-full overflow-y-auto">
                    <SheetHeader className="mb-6">
                        <SheetTitle>Add Vendor</SheetTitle>
                    </SheetHeader>
                    <form onSubmit={handleAddVendor} className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-1.5">Vendor Name <span className="text-red-500">*</span></label>
                            <input type="text" required placeholder="Enter vendor name" value={vendorForm.name}
                                onChange={e => setVendorForm(p => ({ ...p, name: e.target.value }))}
                                className="w-full border border-border rounded-lg px-3 py-2.5 text-sm bg-background text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-colors" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-1.5">Vendor Category</label>
                            <div className="flex gap-2">
                                <select value={vendorForm.category} onChange={e => setVendorForm(p => ({ ...p, category: e.target.value }))}
                                    className="flex-1 border border-border rounded-lg px-3 py-2.5 text-sm bg-background text-foreground focus:ring-2 focus:ring-primary/20 outline-none transition-colors">
                                    <option value="">Select category</option>
                                    {categories.map(cat => <option key={cat._id} value={cat.value}>{cat.label}</option>)}
                                </select>
                                <button type="button" onClick={() => setShowCategoryDialog(true)}
                                    className="shrink-0 px-3 py-2.5 border border-dashed border-primary/50 rounded-lg text-primary text-xs font-medium hover:bg-primary/5 transition-colors" title="Manage categories">
                                    <Tag className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-1.5">Address</label>
                            <textarea placeholder="Enter vendor address" value={vendorForm.address}
                                onChange={e => setVendorForm(p => ({ ...p, address: e.target.value }))} rows={3}
                                className="w-full border border-border rounded-lg px-3 py-2.5 text-sm bg-background text-foreground focus:ring-2 focus:ring-primary/20 outline-none transition-colors resize-none" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-1.5">Contact Number</label>
                            <input type="tel" placeholder="Enter contact number" value={vendorForm.phone}
                                onChange={e => setVendorForm(p => ({ ...p, phone: e.target.value }))}
                                className="w-full border border-border rounded-lg px-3 py-2.5 text-sm bg-background text-foreground focus:ring-2 focus:ring-primary/20 outline-none transition-colors" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-1.5">GSTIN</label>
                            <input type="text" placeholder="e.g. 22AAAAA0000A1Z5" value={vendorForm.gstin}
                                onChange={e => setVendorForm(p => ({ ...p, gstin: e.target.value.toUpperCase() }))} maxLength={15}
                                className="w-full border border-border rounded-lg px-3 py-2.5 text-sm bg-background text-foreground font-mono focus:ring-2 focus:ring-primary/20 outline-none transition-colors" />
                        </div>
                        <div className="flex gap-3 pt-2">
                            <button type="button" onClick={() => setShowVendorSheet(false)}
                                className="flex-1 px-4 py-2.5 border border-border bg-card text-foreground rounded-lg text-sm font-medium hover:bg-muted transition-colors">
                                Cancel
                            </button>
                            <button type="submit" disabled={savingVendor}
                                className="flex-1 px-4 py-2.5 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
                                {savingVendor && <Loader2 className="w-4 h-4 animate-spin" />} Save Vendor
                            </button>
                        </div>
                    </form>
                </SheetContent>
            </Sheet>

            {/* Manage Categories Dialog */}
            <Dialog open={showCategoryDialog} onOpenChange={open => { setShowCategoryDialog(open); if (!open) { setCatName(''); setCatDesc(''); setEditCatId(null); } }}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader><DialogTitle>Manage Vendor Categories</DialogTitle></DialogHeader>
                    {categories.length > 0 && (
                        <div className="border border-border rounded-lg overflow-hidden mb-4 max-h-60 overflow-y-auto">
                            {categories.map(cat => (
                                <div key={cat._id} className="flex items-center gap-2 px-3 py-2.5 border-b border-border last:border-0 group hover:bg-muted/20">
                                    {editCatId === cat._id ? (
                                        <>
                                            <input autoFocus className="flex-1 border border-border rounded px-2 py-1 text-sm bg-background focus:ring-2 focus:ring-primary/20 outline-none"
                                                value={editCatName} onChange={e => setEditCatName(e.target.value)} />
                                            <input className="flex-1 border border-border rounded px-2 py-1 text-sm bg-background focus:ring-2 focus:ring-primary/20 outline-none"
                                                placeholder="Description" value={editCatDesc} onChange={e => setEditCatDesc(e.target.value)} />
                                            <button onClick={handleEditCatSave} disabled={savingEditCat} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded transition-colors disabled:opacity-60">
                                                {savingEditCat ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                            </button>
                                            <button onClick={() => setEditCatId(null)} className="p-1.5 text-muted-foreground hover:bg-muted rounded transition-colors">
                                                <X className="w-4 h-4" />
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <Tag className="w-3.5 h-3.5 text-primary/50 shrink-0" />
                                            <span className="flex-1 text-sm font-medium text-foreground">{cat.label}</span>
                                            <span className="flex-1 text-xs text-muted-foreground truncate">{cat.metadata?.description || ''}</span>
                                            <button onClick={() => { setEditCatId(cat._id); setEditCatName(cat.label); setEditCatDesc(cat.metadata?.description || ''); }}
                                                className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded transition-colors opacity-0 group-hover:opacity-100" title="Edit">
                                                <Edit2 className="w-3.5 h-3.5" />
                                            </button>
                                            <button onClick={() => handleDeleteCategory(cat._id, cat.label)}
                                                className="p-1.5 text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded transition-colors opacity-0 group-hover:opacity-100" title="Delete">
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Add New Category</p>
                    <form onSubmit={handleAddCategory} className="space-y-3">
                        <div className="flex gap-2">
                            <input type="text" required placeholder="Category name" value={catName} onChange={e => setCatName(e.target.value)}
                                className="flex-1 border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:ring-2 focus:ring-primary/20 outline-none transition-colors" />
                            <input type="text" placeholder="Description (optional)" value={catDesc} onChange={e => setCatDesc(e.target.value)}
                                className="flex-1 border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:ring-2 focus:ring-primary/20 outline-none transition-colors" />
                            <button type="submit" disabled={savingCat}
                                className="shrink-0 px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors flex items-center gap-1.5 disabled:opacity-60">
                                {savingCat ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Add
                            </button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
