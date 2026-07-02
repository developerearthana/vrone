"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus, ArrowLeft, Loader2, Pencil, Trash2, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useActionState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createCategory, updateCategory, deleteCategory, getCategories } from "@/app/actions/categories";
import { toast } from "@/components/ui/toaster";

const formSchema = z.object({
    id: z.string().optional(),
    name: z.string().min(1, "Name is required"),
    description: z.string().optional(),
    type: z.enum(["Expense", "Income"]),
    isActive: z.boolean(),
});

export default function CategoriesPage() {
    const router = useRouter();
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<any>(null);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: "",
            description: "",
            type: "Expense",
            isActive: true,
        }
    });

    const fetchCategories = async () => {
        setLoading(true);
        try {
            const data = await getCategories();
            setCategories(data || []);
        } catch { toast.error('Failed to load categories'); }
        finally { setLoading(false); }
    };

    useEffect(() => {
        fetchCategories();
    }, []);

    const handleCreate = async (values: z.infer<typeof formSchema>) => {
        const res = await createCategory(values);
        if (res?.data) {
            toast.success("Category created successfully");
            setIsDialogOpen(false);
            form.reset();
            fetchCategories();
        } else if (res?.error) {
            toast.error(res.error);
        }
    };

    const handleUpdate = async (values: z.infer<typeof formSchema>) => {
        // @ts-ignore
        if (!values.id) return;
        // @ts-ignore
        const res = await updateCategory(values);
        if (res?.data) {
            toast.success("Category updated successfully");
            setIsDialogOpen(false);
            setEditingCategory(null);
            form.reset();
            fetchCategories();
        } else if (res?.error) {
            toast.error(res.error);
        }
    };

    const onSubmit = (values: z.infer<typeof formSchema>) => {
        if (editingCategory) {
            handleUpdate({ ...values, id: editingCategory._id });
        } else {
            handleCreate(values);
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm("Are you sure you want to delete this category?")) {
            const res = await deleteCategory({ id });
            if (res?.success) {
                toast.success("Category deleted");
                fetchCategories();
            } else {
                toast.error("Failed to delete");
            }
        }
    };

    const openEdit = (cat: any) => {
        setEditingCategory(cat);
        form.setValue("name", cat.name);
        form.setValue("description", cat.description || "");
        form.setValue("type", cat.type);
        form.setValue("isActive", cat.isActive);
        setIsDialogOpen(true);
    };

    const openNew = () => {
        setEditingCategory(null);
        form.reset({
            name: "",
            description: "",
            type: "Expense",
            isActive: true,
        });
        setIsDialogOpen(true);
    };

    return (
        <div className="max-w-5xl mx-auto space-y-6 p-6">
            <div className="flex items-center justify-between">
                <div>
                    <Button variant="ghost" onClick={() => router.back()} className="mb-2 -ml-2 text-gray-500">
                        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Settings
                    </Button>
                    <h1 className="text-2xl font-bold text-gray-900">Expense Categories</h1>
                    <p className="text-gray-500">Manage categories for income and expenses.</p>
                </div>
                <Button onClick={openNew} className="bg-primary text-white hover:bg-primary/90">
                    <Plus className="w-4 h-4 mr-2" /> Add Category
                </Button>
            </div>

            <div className="glass-card rounded-xl border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100 bg-background/50 flex items-center justify-between">
                    <div className="relative w-72">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Search categories..." className="pl-9 h-9 bg-white" />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-background text-gray-600 font-medium border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-3">Name</th>
                                <th className="px-6 py-3">Type</th>
                                <th className="px-6 py-3">Description</th>
                                <th className="px-6 py-3">Status</th>
                                <th className="px-6 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="text-center py-8 text-gray-500">
                                        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                                        Loading...
                                    </td>
                                </tr>
                            ) : categories.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="text-center py-8 text-gray-500">No categories found.</td>
                                </tr>
                            ) : (
                                categories.map((cat) => (
                                    <tr key={cat._id} className="hover:bg-background/50 group">
                                        <td className="px-6 py-3 font-medium text-gray-900">{cat.name}</td>
                                        <td className="px-6 py-3">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${cat.type === 'Income' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                                {cat.type}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3 text-gray-500">{cat.description || '-'}</td>
                                        <td className="px-6 py-3">
                                            <span className={`w-2 h-2 rounded-full inline-block mr-2 ${cat.isActive ? 'bg-blue-500' : 'bg-white'}`}></span>
                                            {cat.isActive ? 'Active' : 'Inactive'}
                                        </td>
                                        <td className="px-6 py-3 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:bg-white" onClick={() => openEdit(cat)}>
                                                    <Pencil className="w-4 h-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:bg-red-50" onClick={() => handleDelete(cat._id)}>
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Dialog Form */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingCategory ? 'Edit Category' : 'New Category'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Category Name</label>
                            <Input {...form.register("name")} placeholder="e.g. Travel, Office Supplies" />
                            <p className="text-xs text-red-500">{form.formState.errors.name?.message}</p>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Type</label>
                            <div className="flex gap-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="radio" value="Expense" {...form.register("type")} className="text-primary" />
                                    <span className="text-sm">Expense</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="radio" value="Income" {...form.register("type")} className="text-primary" />
                                    <span className="text-sm">Income</span>
                                </label>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Description</label>
                            <Textarea {...form.register("description")} placeholder="Optional description..." className="resize-none" />
                        </div>

                        <div className="space-y-2">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" {...form.register("isActive")} className="rounded text-primary focus:ring-primary" />
                                <span className="text-sm font-medium">Active</span>
                            </label>
                        </div>

                        <div className="flex justify-end gap-3 pt-4">
                            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={form.formState.isSubmitting}>
                                {form.formState.isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                Save Category
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
