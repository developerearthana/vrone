"use client";

import { Plus, Search, Folder, ChevronRight, MoreHorizontal } from 'lucide-react';

export default function CategoriesPage() {
    const categories = [
        { id: 1, name: "Heavy Machinery", count: 145, value: "₹45.2 L", subcategories: ["Pumps", "Motors", "Compressors"] },
        { id: 2, name: "Electronics", count: 850, value: "₹22.5 L", subcategories: ["Sensors", "Controllers", "Displays"] },
        { id: 3, name: "Raw Materials", count: 1200, value: "₹12.0 L", subcategories: ["Metals", "Polymers", "Chemicals"] },
        { id: 4, name: "Components", count: 3500, value: "₹5.5 L", subcategories: ["Fasteners", "Connectors"] },
    ];

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
                    <p className="text-gray-500">Organize products into hierarchical groups.</p>
                </div>
                <button className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:brightness-[1.08] transition-colors shadow-sm">
                    <Plus className="w-4 h-4" />
                    Add Category
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {categories.map((cat) => (
                    <div key={cat.id} className="glass-card hover:shadow-md transition-shadow group p-0 overflow-hidden">
                        <div className="p-6">
                            <div className="flex items-start justify-between mb-4">
                                <div className="p-3 bg-white text-blue-600 rounded-xl">
                                    <Folder className="w-6 h-6" />
                                </div>
                                <button aria-label="Options" className="text-gray-400 hover:text-gray-600 p-1 rounded-md hover:bg-white">
                                    <MoreHorizontal className="w-5 h-5" />
                                </button>
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 mb-1">{cat.name}</h3>
                            <div className="flex items-center gap-4 text-sm text-gray-500 mb-6">
                                <span>{cat.count} Items</span>
                                <span>•</span>
                                <span>{cat.value}</span>
                            </div>

                            <div className="space-y-3">
                                {cat.subcategories.map((sub, idx) => (
                                    <div key={idx} className="flex items-center justify-between text-sm py-1 border-b border-gray-50 last:border-0 hover:bg-background px-2 -mx-2 rounded">
                                        <span className="text-gray-600">{sub}</span>
                                        <ChevronRight className="w-4 h-4 text-gray-300" />
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="bg-background/80 p-3 border-t border-gray-100 flex justify-center">
                            <button className="text-sm font-medium text-blue-600 hover:text-blue-700">View All Subcategories</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
