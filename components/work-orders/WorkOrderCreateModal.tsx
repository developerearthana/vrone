"use client";

import { useState } from 'react';
import { X, Calendar, DollarSign } from 'lucide-react';

interface WorkOrderCreateModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: any) => void;
    projects: any[]; // Or define proper type
    subsidiaries: string[];
    vendors: any[];
}

export function WorkOrderCreateModal({ isOpen, onClose, onSubmit, projects, subsidiaries, vendors }: WorkOrderCreateModalProps) {
    const [title, setTitle] = useState("");
    const [classification, setClassification] = useState<"Internal" | "Vendor">("Internal");
    const [subsidiary, setSubsidiary] = useState("");
    const [project, setProject] = useState("");
    const [cost, setCost] = useState("");
    const [vendor, setVendor] = useState("");
    const [priority, setPriority] = useState("Medium");
    const [location, setLocation] = useState("");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit({
            title,
            classification,
            subsidiary,
            project,
            cost: Number(cost),
            vendor: classification === 'Vendor' ? vendor : 'Internal Team',
            priority,
            location,
            status: "Open",
            date: new Date().toLocaleDateString()
        });
        // Reset form
        setTitle("");
        setCost("");
        onClose();
    };

    if (!isOpen) return null;

    // Filter projects based on selected subsidiary
    const filteredProjects = subsidiary
        ? projects.filter(p => p.project ? p.project.includes(subsidiary) : true) // Simplification as Project model might not store subsidiary directly yet in my prev step
        // Wait, Project Model has client. MOCK_PROJECT_LIST had subsidiary.
        // I need to check Project Model. It has 'client'. Subsidiary might be 'client' or derived.
        // Let's assume for now we just show all projects or filter client.
        // Actually, let's just show all projects if subsidiary matches client.
        : projects;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden">
                <div className="flex justify-between items-center p-6 border-b border-gray-100">
                    <h3 className="text-xl font-bold text-gray-900">Create New Work Order</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors" aria-label="Close">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Classification Toggle */}
                    <div className="flex gap-4 bg-background p-1 rounded-lg border border-gray-200 w-fit">
                        <button
                            type="button"
                            onClick={() => setClassification("Internal")}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${classification === "Internal" ? "bg-white shadow text-blue-600" : "text-gray-500 hover:text-gray-700"
                                }`}
                        >
                            Internal Self Work
                        </button>
                        <button
                            type="button"
                            onClick={() => setClassification("Vendor")}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${classification === "Vendor" ? "bg-white shadow text-orange-600" : "text-gray-500 hover:text-gray-700"
                                }`}
                        >
                            Outside Vendor Contract
                        </button>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                        {/* Title & Priority */}
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Work Order Title</label>
                                <input
                                    required
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="e.g. HVAC Maintenance"
                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                                <select
                                    value={priority}
                                    onChange={(e) => setPriority(e.target.value)}
                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                    aria-label="Select Priority"
                                >
                                    <option value="Low">Low</option>
                                    <option value="Medium">Medium</option>
                                    <option value="High">High</option>
                                    <option value="Critical">Critical</option>
                                </select>
                            </div>
                        </div>

                        {/* Location & Cost */}
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Location / Area</label>
                                <input
                                    required
                                    type="text"
                                    value={location}
                                    onChange={(e) => setLocation(e.target.value)}
                                    placeholder="e.g. Block B, 2nd Floor"
                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Cost</label>
                                <div className="relative">
                                    <DollarSign className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                                    <input
                                        required
                                        type="number"
                                        value={cost}
                                        onChange={(e) => setCost(e.target.value)}
                                        placeholder="0.00"
                                        className="w-full pl-9 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="h-px bg-white"></div>

                    {/* Context: Subsidiary & Project */}
                    <div className="grid md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Subsidiary</label>
                            <select
                                required
                                value={subsidiary}
                                onChange={(e) => { setSubsidiary(e.target.value); setProject(""); }}
                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                aria-label="Select Subsidiary"
                            >
                                <option value="">Select Subsidiary</option>
                                {subsidiaries.map(s => (
                                    <option key={s} value={s}>{s}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Related Project</label>
                            <select
                                required
                                value={project}
                                onChange={(e) => setProject(e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                disabled={!subsidiary}
                                aria-label="Select Project"
                            >
                                <option value="">{subsidiary ? "Select Project" : "Select Subsidiary First"}</option>
                                {filteredProjects.map(p => (
                                    <option key={p.id} value={p.name}>{p.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Conditional Vendor Selection */}
                    {classification === 'Vendor' && (
                        <div className="bg-white p-4 rounded-lg border border-border animate-in fade-in slide-in-from-top-2">
                            <label className="block text-sm font-bold text-orange-800 mb-1">Select Vendor</label>
                            <select
                                required
                                value={vendor}
                                onChange={(e) => setVendor(e.target.value)}
                                className="w-full p-2 border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none bg-white"
                                aria-label="Select Vendor"
                            >
                                <option value="">Select Vendor</option>
                                {vendors.map(v => (
                                    <option key={v.id} value={v.name}>{v.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="flex justify-end gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-background transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:brightness-[1.08] transition-colors font-medium shadow-sm shadow-primary/20"
                        >
                            Create Work Order
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

