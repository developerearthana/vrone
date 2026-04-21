"use client";

import { useState, useRef, useEffect } from 'react';
import { Plus, Trash2, Layers, GripVertical, Save, X, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import {
    getProjectTemplates,
    createProjectTemplate,
    updateProjectTemplate,
    deleteProjectTemplate,
} from '@/app/actions/project-templates';
import { getMasters } from '@/app/actions/masters';

interface Stage {
    id: string;
    name: string;
    order: number;
    modules: string[];
}

interface Template {
    _id: string;
    name: string;
    description: string;
    stages: Stage[];
}

export default function ProjectTemplatesMaster() {
    const [templates, setTemplates] = useState<Template[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
    const [newStageName, setNewStageName] = useState("");
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
    const dragIndex = useRef<number | null>(null);

    // Mood board options
    const [moodBoardOptions, setMoodBoardOptions] = useState<string[]>([]);
    // Per-stage dropdown open state
    const [openDropdown, setOpenDropdown] = useState<string | null>(null);

    // Create template dialog
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [newTemplateName, setNewTemplateName] = useState("");
    const [newTemplateDesc, setNewTemplateDesc] = useState("");
    const [creating, setCreating] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => { loadTemplates(); loadMoodBoard(); }, []);

    // Close dropdown on outside click
    useEffect(() => {
        if (!openDropdown) return;
        const handler = () => setOpenDropdown(null);
        document.addEventListener('click', handler);
        return () => document.removeEventListener('click', handler);
    }, [openDropdown]);

    async function loadTemplates() {
        setLoading(true);
        const result = await getProjectTemplates();
        if (result.success) setTemplates(result.data);
        setLoading(false);
    }

    async function loadMoodBoard() {
        const res = await getMasters('ProjectMoodBoard');
        if (res.success && res.data) setMoodBoardOptions(res.data.map((d: any) => d.label));
    }

    const handleEdit = (template: Template) => {
        setEditingTemplate({ ...template, stages: template.stages.map(s => ({ ...s, modules: [...s.modules] })) });
        setOpenDropdown(null);
    };

    const handleSave = async () => {
        if (!editingTemplate) return;
        setSaving(true);
        const result = await updateProjectTemplate(editingTemplate._id, {
            name: editingTemplate.name,
            description: editingTemplate.description,
            stages: editingTemplate.stages.map((s, i) => ({ ...s, order: i })),
        });
        setSaving(false);
        if (result.success) {
            setTemplates(templates.map(t => t._id === editingTemplate._id ? result.data : t));
            setEditingTemplate(null);
            toast.success("Template saved.");
        } else {
            toast.error("Failed to save template.");
        }
    };

    const handleCreate = async () => {
        if (!newTemplateName.trim()) return;
        setCreating(true);
        const result = await createProjectTemplate({ name: newTemplateName.trim(), description: newTemplateDesc.trim() });
        setCreating(false);
        if (result.success) {
            setTemplates([...templates, result.data]);
            setShowCreateDialog(false);
            setNewTemplateName("");
            setNewTemplateDesc("");
            setEditingTemplate(result.data);
            toast.success("Template created.");
        } else {
            toast.error("Failed to create template.");
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this template?")) return;
        const result = await deleteProjectTemplate(id);
        if (result.success) {
            setTemplates(templates.filter(t => t._id !== id));
            if (editingTemplate?._id === id) setEditingTemplate(null);
            toast.success("Template deleted.");
        } else {
            toast.error("Failed to delete template.");
        }
    };

    // ── Stage helpers ──
    const updateStages = (stages: Stage[]) => {
        if (!editingTemplate) return;
        setEditingTemplate({ ...editingTemplate, stages });
    };

    const addStage = () => {
        if (!newStageName.trim() || !editingTemplate) return;
        updateStages([...editingTemplate.stages, { id: `s-${Date.now()}`, name: newStageName.trim(), order: editingTemplate.stages.length, modules: [] }]);
        setNewStageName("");
    };

    const removeStage = (stageId: string) => {
        if (!editingTemplate) return;
        updateStages(editingTemplate.stages.filter(s => s.id !== stageId));
    };

    // ── Module helpers ──
    const addModule = (stageId: string, val: string) => {
        if (!val.trim() || !editingTemplate) return;
        updateStages(editingTemplate.stages.map(s =>
            s.id === stageId && !s.modules.includes(val.trim())
                ? { ...s, modules: [...s.modules, val.trim()] }
                : s
        ));
        setOpenDropdown(null);
    };

    const removeModule = (stageId: string, mod: string) => {
        if (!editingTemplate) return;
        updateStages(editingTemplate.stages.map(s =>
            s.id === stageId ? { ...s, modules: s.modules.filter(m => m !== mod) } : s
        ));
    };

    // ── Drag & drop ──
    const onDragStart = (index: number) => { dragIndex.current = index; };
    const onDragOver = (e: React.DragEvent, index: number) => { e.preventDefault(); setDragOverIndex(index); };
    const onDrop = (e: React.DragEvent, dropIndex: number) => {
        e.preventDefault();
        if (dragIndex.current === null || dragIndex.current === dropIndex || !editingTemplate) { setDragOverIndex(null); return; }
        const stages = [...editingTemplate.stages];
        const [moved] = stages.splice(dragIndex.current, 1);
        stages.splice(dropIndex, 0, moved);
        updateStages(stages);
        dragIndex.current = null;
        setDragOverIndex(null);
    };
    const onDragEnd = () => { dragIndex.current = null; setDragOverIndex(null); };

    return (
        <div className="max-w-6xl mx-auto space-y-6 py-4">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Project Templates</h1>
                    <p className="text-gray-500">Define standard phase workflows for different project types.</p>
                </div>
                <button
                    onClick={() => setShowCreateDialog(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" />
                    New Template
                </button>
            </div>

            {/* Create Template Dialog */}
            {showCreateDialog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-bold text-gray-900">Create Template</h2>
                            <button onClick={() => setShowCreateDialog(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Template Name *</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Architectural Design Flow"
                                    className="w-full p-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                    value={newTemplateName}
                                    onChange={e => setNewTemplateName(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleCreate()}
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                <input
                                    type="text"
                                    placeholder="Brief description of this template"
                                    className="w-full p-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                    value={newTemplateDesc}
                                    onChange={e => setNewTemplateDesc(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="flex gap-2 mt-6">
                            <button onClick={() => setShowCreateDialog(false)} className="flex-1 px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 rounded-lg">
                                Cancel
                            </button>
                            <button
                                onClick={handleCreate}
                                disabled={!newTemplateName.trim() || creating}
                                className="flex-1 px-4 py-2 text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 rounded-lg disabled:opacity-50"
                            >
                                {creating ? "Creating..." : "Create"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid lg:grid-cols-3 gap-6">
                {/* Template List */}
                <div className="lg:col-span-1 space-y-3">
                    {loading ? (
                        <div className="text-sm text-gray-400 py-8 text-center">Loading...</div>
                    ) : templates.length === 0 ? (
                        <div className="text-sm text-gray-400 py-8 text-center border border-dashed border-gray-200 rounded-xl">
                            No templates yet. Create one to get started.
                        </div>
                    ) : (
                        templates.map(template => (
                            <div
                                key={template._id}
                                onClick={() => handleEdit(template)}
                                className={`group p-4 rounded-xl border cursor-pointer transition-all ${editingTemplate?._id === template._id
                                    ? 'bg-white border-blue-200 ring-1 ring-blue-300'
                                    : 'bg-white border-gray-200 hover:border-blue-300 hover:shadow-sm'
                                    }`}
                            >
                                <div className="flex items-start justify-between mb-2">
                                    <div className="p-2 bg-white rounded-lg border border-gray-100">
                                        <Layers className="w-5 h-5 text-blue-600" />
                                    </div>
                                    <div className="flex items-center gap-1">
                                        {editingTemplate?._id === template._id && (
                                            <span className="text-xs font-bold text-blue-600 bg-blue-100 px-2 py-1 rounded">Editing</span>
                                        )}
                                        <button
                                            onClick={e => { e.stopPropagation(); handleDelete(template._id); }}
                                            className="p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                                <h3 className="font-semibold text-gray-900">{template.name}</h3>
                                {template.description && (
                                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">{template.description}</p>
                                )}
                                <div className="mt-3 text-xs font-medium text-gray-400">
                                    {template.stages.length} Stage{template.stages.length !== 1 ? 's' : ''} Defined
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Editor */}
                <div className="lg:col-span-2">
                    {editingTemplate ? (
                        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                            {/* Header */}
                            <div className="p-6 border-b border-gray-100 flex justify-between items-start bg-background/50">
                                <div className="flex-1 mr-4 space-y-2">
                                    <input
                                        className="text-lg font-bold text-gray-900 w-full border-b border-transparent hover:border-gray-200 focus:border-blue-400 focus:outline-none bg-transparent"
                                        value={editingTemplate.name}
                                        onChange={e => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                                    />
                                    <input
                                        className="text-sm text-gray-500 w-full border-b border-transparent hover:border-gray-200 focus:border-blue-400 focus:outline-none bg-transparent"
                                        placeholder="Add a description..."
                                        value={editingTemplate.description}
                                        onChange={e => setEditingTemplate({ ...editingTemplate, description: e.target.value })}
                                    />
                                </div>
                                <div className="flex gap-2 flex-shrink-0">
                                    <button onClick={() => setEditingTemplate(null)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg">
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSave}
                                        disabled={saving}
                                        className="px-4 py-2 text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 rounded-lg flex items-center gap-2 disabled:opacity-50"
                                    >
                                        <Save className="w-4 h-4" />
                                        {saving ? "Saving..." : "Save"}
                                    </button>
                                </div>
                            </div>

                            <div className="p-6 space-y-3">
                                {editingTemplate.stages.length === 0 && (
                                    <p className="text-sm text-gray-400 text-center py-4">No stages yet. Add your first stage below.</p>
                                )}

                                {editingTemplate.stages.map((stage, index) => (
                                    <div
                                        key={stage.id}
                                        draggable
                                        onDragStart={() => onDragStart(index)}
                                        onDragOver={e => onDragOver(e, index)}
                                        onDrop={e => onDrop(e, index)}
                                        onDragEnd={onDragEnd}
                                        className={`border rounded-xl transition-all
                                            ${dragOverIndex === index ? 'border-blue-400 shadow-md scale-[1.01]' : 'border-gray-200'}
                                            ${dragIndex.current === index ? 'opacity-40' : 'opacity-100'}
                                        `}
                                    >
                                        {/* Stage header row */}
                                        <div className="group flex items-center gap-3 px-3 py-3 select-none">
                                            <div className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 touch-none flex-shrink-0">
                                                <GripVertical className="w-5 h-5" />
                                            </div>
                                            <div className="w-6 h-6 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
                                                {index + 1}
                                            </div>
                                            <span className="flex-1 font-semibold text-gray-900 text-sm">{stage.name}</span>
                                            <button
                                                onClick={() => removeStage(stage.id)}
                                                className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>

                                        {/* Modules row */}
                                        <div className="px-4 pb-3 flex flex-wrap items-center gap-1.5" onClick={e => e.stopPropagation()}>
                                            {stage.modules.map(mod => (
                                                <span
                                                    key={mod}
                                                    className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-full"
                                                >
                                                    {mod}
                                                    <button
                                                        onClick={() => removeModule(stage.id, mod)}
                                                        className="hover:text-red-500 transition-colors"
                                                        title={`Remove ${mod}`}
                                                    >
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </span>
                                            ))}

                                            {/* Dropdown add module */}
                                            <div className="relative inline-block">
                                                <button
                                                    onClick={() => setOpenDropdown(openDropdown === stage.id ? null : stage.id)}
                                                    className="inline-flex items-center gap-1 text-xs text-gray-400 border border-dashed border-gray-300 hover:border-blue-400 hover:text-blue-500 rounded-full px-2 py-0.5 transition-colors"
                                                >
                                                    <Plus className="w-3 h-3" />
                                                    Add item
                                                    <ChevronDown className="w-3 h-3" />
                                                </button>
                                                {openDropdown === stage.id && (
                                                    <div className="absolute left-0 top-full mt-1 z-20 bg-white border border-gray-200 rounded-xl shadow-lg min-w-[180px] max-h-52 overflow-y-auto">
                                                        {moodBoardOptions.filter(opt => !stage.modules.includes(opt)).length === 0 ? (
                                                            <p className="text-xs text-gray-400 px-3 py-3 text-center">
                                                                No options available.<br />Add them in Project Work Board.
                                                            </p>
                                                        ) : (
                                                            moodBoardOptions
                                                                .filter(opt => !stage.modules.includes(opt))
                                                                .map(opt => (
                                                                    <button
                                                                        key={opt}
                                                                        onClick={() => addModule(stage.id, opt)}
                                                                        className="w-full text-left text-sm px-3 py-2 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                                                                    >
                                                                        {opt}
                                                                    </button>
                                                                ))
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {/* Add Stage */}
                                <div className="flex gap-2 pt-3 border-t border-gray-100">
                                    <input
                                        type="text"
                                        placeholder="New Stage Name (e.g. Quality Check)"
                                        className="flex-1 p-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                        value={newStageName}
                                        onChange={e => setNewStageName(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && addStage()}
                                    />
                                    <button
                                        onClick={addStage}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-2"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Add Stage
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center p-12 text-center text-gray-400 border border-dashed border-gray-200 rounded-xl bg-background/50 min-h-[300px]">
                            <Layers className="w-12 h-12 mb-4 opacity-20" />
                            <p>Select a template to configure its stages and items.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
