"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { createAsset } from '@/app/actions/asset';
import { toast } from 'sonner';
import { Plus, Loader2 } from 'lucide-react';

export function AddAssetModal() {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        const formData = new FormData(e.currentTarget);

        const data = {
            name: formData.get('name') as string,
            category: formData.get('category') as string,
            modelNo: formData.get('modelNo') as string,
            serialNo: formData.get('serialNo') as string,
            purchaseDate: formData.get('purchaseDate') as string,
            purchasePrice: parseFloat(formData.get('purchasePrice') as string) || 0,
            description: formData.get('description') as string,
        };

        const res = await createAsset(data);
        setLoading(false);

        if (res.success) {
            toast.success("Asset created successfully");
            setOpen(false);
        } else {
            toast.error(res.error || "Failed to create asset");
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <button className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:brightness-[1.08] transition-colors shadow-sm text-sm font-medium">
                    <Plus className="w-4 h-4" />
                    Add Asset
                </button>
            </DialogTrigger>
            <DialogContent className="max-w-xl">
                <DialogHeader>
                    <DialogTitle>Add New Asset</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="text-sm font-medium">Asset Name</label>
                            <input name="name" required className="w-full p-2 border rounded-md" placeholder="e.g. Dell XPS 15" />
                        </div>
                        <div>
                            <label className="text-sm font-medium">Category</label>
                            <select name="category" className="w-full p-2 border rounded-md" aria-label="Asset Category">
                                <option value="Laptop">Laptop</option>
                                <option value="Desktop">Desktop</option>
                                <option value="Monitor">Monitor</option>
                                <option value="Vehicle">Vehicle</option>
                                <option value="Furniture">Furniture</option>
                                <option value="License">License</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-sm font-medium">Model No.</label>
                            <input name="modelNo" className="w-full p-2 border rounded-md" placeholder="Optional" />
                        </div>
                        <div>
                            <label className="text-sm font-medium">Serial No.</label>
                            <input name="serialNo" className="w-full p-2 border rounded-md" placeholder="Optional" />
                        </div>
                        <div>
                            <label className="text-sm font-medium">Purchase Date</label>
                            <input name="purchaseDate" type="date" required className="w-full p-2 border rounded-md" aria-label="Purchase Date" />
                        </div>
                        <div>
                            <label className="text-sm font-medium">Purchase Price</label>
                            <input name="purchasePrice" type="number" min="0" required className="w-full p-2 border rounded-md" placeholder="0.00" />
                        </div>
                    </div>
                    <div>
                        <label className="text-sm font-medium">Description</label>
                        <textarea name="description" className="w-full p-2 border rounded-md h-20" placeholder="Additional details..." />
                    </div>
                    <div className="flex justify-end gap-2 pt-4">
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Create Asset
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
