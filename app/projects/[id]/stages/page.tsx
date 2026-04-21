"use client";

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle2, Circle, Clock, Loader2, MoreHorizontal, Plus } from 'lucide-react';
import Link from 'next/link';
import { getProjectById, completeStage, uncompleteStage, recalculateProjectProgress } from '@/app/actions/project';
import { getProjectTemplateByName } from '@/app/actions/project-templates';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function ProjectStagesPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();

    const [project, setProject] = useState<any>(null);
    const [stages, setStages] = useState<any[]>([]);
    const [completedIds, setCompletedIds] = useState<string[]>([]);
    const [progress, setProgress] = useState(0);
    const [loading, setLoading] = useState(true);
    const [completing, setCompleting] = useState<string | null>(null);

    useEffect(() => {
        const load = async () => {
            const projRes = await getProjectById(id);
            if (projRes.success && projRes.data) {
                const proj = projRes.data;
                setProject(proj);
                setCompletedIds(proj.completedStageIds || []);

                if (proj.template) {
                    const tRes = await getProjectTemplateByName(proj.template);
                    if (tRes.success && tRes.data) {
                        const sorted = [...(tRes.data.stages || [])].sort((a, b) => a.order - b.order)
                            // Fallback: ensure every stage has an id (guard against bad template data)
                            .map((s: any, i: number) => ({ ...s, id: s.id || `fallback-${i}` }));
                        setStages(sorted);
                    }
                }

                const progRes = await recalculateProjectProgress(id);
                if (progRes.success) setProgress(progRes.progress ?? proj.progress ?? 0);
                else setProgress(proj.progress ?? 0);
            }
            setLoading(false);
        };
        load();
    }, [id]);

    const handleMarkComplete = async (stageId: string) => {
        setCompleting(stageId);
        // Optimistic: show green immediately
        setCompletedIds(prev => prev.includes(stageId) ? prev : [...prev, stageId]);
        const res = await completeStage(id, stageId);
        if (res.success) {
            if (res.completedStageIds) setCompletedIds(res.completedStageIds);
            setProgress(res.progress ?? progress);
            toast.success("Stage marked as complete");
            router.refresh();
        } else {
            setCompletedIds(prev => prev.filter(s => s !== stageId));
            toast.error("Failed to complete stage");
        }
        setCompleting(null);
    };

    const handleMarkIncomplete = async (stageId: string) => {
        setCompleting(stageId);
        setCompletedIds(prev => prev.filter(s => s !== stageId));
        const res = await uncompleteStage(id, stageId);
        if (res.success) {
            if (res.completedStageIds) setCompletedIds(res.completedStageIds);
            setProgress(res.progress ?? progress);
            toast.success("Stage marked as incomplete");
            router.refresh();
        } else {
            setCompletedIds(prev => prev.includes(stageId) ? prev : [...prev, stageId]);
            toast.error("Failed to update stage");
        }
        setCompleting(null);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-100px)]">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    // Derive current stage index from completedIds
    const currentIdx = stages.findIndex(s => !completedIds.includes(s.id));

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
                <Link href={`/projects/${id}`} className="p-2 hover:bg-background rounded-full transition-colors text-gray-500">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold text-gray-900">Project Stages</h1>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                        <span>{project?.name}</span>
                        {project?.template && <><span>•</span><span className="text-blue-600 font-medium">{project.template}</span></>}
                    </div>
                </div>
                {/* Overall progress */}
                <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className={cn("text-2xl font-bold", progress === 100 ? 'text-green-600' : 'text-blue-600')}>{progress}%</span>
                    <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                            className={cn("h-full rounded-full transition-all duration-500", progress === 100 ? 'bg-green-500' : 'bg-blue-600')}
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <span className="text-xs text-gray-400">Overall Progress</span>
                </div>
            </div>

            {stages.length === 0 && (
                <div className="glass-card p-8 rounded-xl border border-dashed border-gray-300 text-center text-sm text-muted-foreground">
                    No template assigned to this project.
                </div>
            )}

            {/* Timeline */}
            <div className="relative">
                <div className="absolute left-[22px] top-8 bottom-8 w-0.5 bg-gray-100" />
                <div className="space-y-6">
                    {stages.map((stage: any, index: number) => {
                        const isCompleted = completedIds.includes(stage.id);
                        const isCurrent = !isCompleted && index === currentIdx;

                        return (
                            <div key={stage.id} className="relative flex gap-6 group">
                                {/* Status Indicator */}
                                <div className={cn(
                                    "relative z-10 flex items-center justify-center w-12 h-12 rounded-full border-4 transition-colors bg-white",
                                    isCompleted ? 'border-green-400 text-green-600' :
                                    isCurrent ? 'border-blue-400 text-blue-600' :
                                    'border-gray-100 text-gray-300'
                                )}>
                                    {isCompleted ? <CheckCircle2 className="w-6 h-6" /> :
                                        isCurrent ? <Clock className="w-6 h-6 animate-pulse" /> :
                                            <Circle className="w-6 h-6" />}
                                </div>

                                {/* Stage Card */}
                                <div className={cn(
                                    "flex-1 glass-card p-5 rounded-xl border transition-all",
                                    isCompleted ? 'border-green-200 bg-green-50/40' :
                                    isCurrent ? 'border-blue-200 shadow-md ring-1 ring-blue-50' :
                                    'border-gray-200 hover:border-gray-300'
                                )}>
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h3 className={cn(
                                                    "text-lg font-bold",
                                                    isCompleted ? 'text-gray-400 line-through' :
                                                    isCurrent ? 'text-blue-700' : 'text-gray-500'
                                                )}>
                                                    {stage.name}
                                                </h3>
                                                {isCompleted && (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700 border border-green-200">
                                                        <CheckCircle2 className="w-3 h-3" /> Completed
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex flex-wrap gap-2 mt-2">
                                                {(stage.modules || []).map((mod: string) => (
                                                    <span key={mod} className="text-xs font-medium px-2 py-0.5 rounded bg-background text-gray-600 border border-gray-200">
                                                        {mod}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                        <button aria-label="Menu" className="p-1 text-gray-400 hover:text-gray-600 rounded">
                                            <MoreHorizontal className="w-5 h-5" />
                                        </button>
                                    </div>

                                    {/* Actions */}
                                    {isCompleted ? (
                                        <div className="mt-4 p-3 rounded-lg border border-green-100 bg-green-50/50 flex items-center justify-between">
                                            <span className="text-xs text-green-700 font-medium flex items-center gap-1.5">
                                                <CheckCircle2 className="w-3.5 h-3.5" /> This stage is completed
                                            </span>
                                            <button
                                                onClick={() => handleMarkIncomplete(stage.id)}
                                                disabled={completing === stage.id}
                                                className="px-3 py-1.5 bg-white border border-gray-200 text-gray-600 text-xs font-semibold rounded-md shadow-sm hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                                            >
                                                {completing === stage.id
                                                    ? <><Loader2 className="w-3 h-3 animate-spin" /> Updating...</>
                                                    : <>Mark Incomplete</>
                                                }
                                            </button>
                                        </div>
                                    ) : (
                                        <div className={cn(
                                            "mt-4 p-4 rounded-lg border",
                                            isCurrent ? "bg-white/50 border-border" : "bg-gray-50/50 border-gray-200"
                                        )}>
                                            {isCurrent && <p className="text-sm text-blue-800 font-medium mb-3">Active Stage</p>}
                                            <div className="flex gap-2">
                                                <Link
                                                    href={`/projects/${id}/stages/${stage.id}`}
                                                    className={cn(
                                                        "px-3 py-1.5 text-xs font-semibold rounded-md shadow-sm transition-colors",
                                                        isCurrent
                                                            ? "bg-white border border-blue-200 text-blue-700 hover:bg-blue-50"
                                                            : "bg-white border border-gray-200 text-gray-600 hover:bg-background"
                                                    )}
                                                >
                                                    Open Stage
                                                </Link>
                                                <button
                                                    onClick={() => handleMarkComplete(stage.id)}
                                                    disabled={completing === stage.id}
                                                    className="px-3 py-1.5 bg-green-600 text-white text-xs font-semibold rounded-md shadow-sm hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                                                >
                                                    {completing === stage.id
                                                        ? <><Loader2 className="w-3 h-3 animate-spin" /> Completing...</>
                                                        : <><CheckCircle2 className="w-3 h-3" /> Mark Complete</>
                                                    }
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Insert between (hover) */}
                                <div className="absolute -bottom-5 left-[22px] -translate-x-1/2 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button className="p-1 bg-white border border-gray-200 rounded-full text-gray-400 hover:text-blue-600 hover:border-blue-300 shadow-sm" title="Insert Stage Here" aria-label="Insert Stage Here">
                                        <Plus className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
