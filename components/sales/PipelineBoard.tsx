"use client";

import { useState, useEffect } from 'react';
import { MoreHorizontal, Plus, Briefcase, DollarSign, Calendar, User, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
    DndContext,
    DragOverlay,
    closestCorners,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragStartEvent,
    DragOverEvent,
    DragEndEvent,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { getDeals } from '@/app/actions/sales';
import { toast } from 'sonner';

export type StageId = 'Qualified' | 'Proposal' | 'Negotiation' | 'Closed Won' | 'Closed Lost';

export interface Deal {
    _id: string; // Changed to _id to match MongoDB
    id?: string; // For DnD compatibility
    title: string;
    client: string;
    value: number;
    stage: StageId;
    owner: string;
    dueDate: string;
    probability: number;
}

import { differenceInDays, isPast } from 'date-fns';
import { AlertCircle } from 'lucide-react';

const stages: { id: StageId; label: string; color: string }[] = [
    { id: 'Qualified', label: 'Qualified', color: 'border-blue-500 bg-white text-blue-700' },
    { id: 'Proposal', label: 'Proposal', color: 'border-purple-500 bg-white text-purple-700' },
    { id: 'Negotiation', label: 'Negotiation', color: 'border-orange-500 bg-white text-orange-700' },
    { id: 'Closed Won', label: 'Won', color: 'border-emerald-500 bg-emerald-50 text-emerald-700' },
];

// --- Sortable Item Component ---
function SortableDeal({ deal }: { deal: Deal }) {
    // Map _id to id for dnd-kit
    const dndId = deal._id || deal.id;

    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: dndId!, data: { ...deal, id: dndId } });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    const isRotting = deal.dueDate ? isPast(new Date(deal.dueDate)) && deal.stage !== 'Closed Won' : false;
    const daysOverdue = deal.dueDate ? differenceInDays(new Date(), new Date(deal.dueDate)) : 0;

    return (
        <div
            ref={setNodeRef}
            {...{ style }}
            {...attributes}
            {...listeners}
            className={cn(
                "group bg-white p-4 rounded-xl border shadow-sm hover:shadow-md transition-all cursor-grab active:cursor-grabbing relative",
                isDragging ? "opacity-50 z-50 ring-2 ring-primary rotate-2" : "opacity-100",
                isRotting ? "border-red-200 bg-red-50/20" : "border-gray-100"
            )}
        >
            <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground line-clamp-1">{deal.client}</span>
                <button aria-label="Deal Actions" className="text-gray-300 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity">
                    <MoreHorizontal className="w-4 h-4" />
                </button>
            </div>

            <div className="flex items-start justify-between gap-2 mb-3">
                <h4 className="font-bold text-gray-900 text-sm line-clamp-2">{deal.title || 'Untitled Deal'}</h4>
                {isRotting && (
                    <div className="flex-shrink-0 text-red-500" title={`Overdue by ${daysOverdue} days`}>
                        <AlertCircle className="w-4 h-4" />
                    </div>
                )}
            </div>

            <div className="flex items-center gap-2 mb-3">
                <div className="flex-1 h-1.5 bg-white rounded-full overflow-hidden">
                    <motion.div
                        className={cn("h-full rounded-full",
                            (deal.probability || 0) >= 80 ? "bg-emerald-500" :
                                (deal.probability || 0) >= 50 ? "bg-blue-500" : "bg-amber-500"
                        )}
                        initial={{ width: 0 }}
                        animate={{ width: `${deal.probability || 0}%` }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                    />
                </div>
                <span className="text-[10px] font-medium text-gray-500">{deal.probability || 0}%</span>
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-gray-50">
                <span className="text-sm font-bold text-gray-800">
                    ₹ {((deal.value || 0) / 100000).toFixed(1)} L
                </span>
                <div className={cn(
                    "flex items-center gap-1.5 text-xs px-2 py-1 rounded-md",
                    isRotting ? "bg-red-100 text-red-700 font-bold" : "bg-background text-gray-500"
                )}>
                    {isRotting ? `${daysOverdue}d Late` : (
                        <>
                            <User className="w-3 h-3" />
                            {(deal.owner || 'Unassigned').split(' ')[0]}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function PipelineBoard() {
    const [deals, setDeals] = useState<Deal[]>([]);
    const [activeId, setActiveId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    useEffect(() => {
        loadDeals();
    }, []);

    const loadDeals = async () => {
        try {
            const res = await getDeals();
            if (res.success && res.data) {
                // Ensure IDs are strings for DnD
                const mappedDeals = res.data.map((d: any) => ({
                    ...d,
                    id: d._id.toString()
                }));
                setDeals(mappedDeals);
            }
        } catch (error) {
            toast.error("Failed to load deals");
        } finally {
            setLoading(false);
        }
    };

    const getDealsByStage = (stage: StageId) => deals.filter((deal) => deal.stage === stage);

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string);
    };

    const handleDragOver = (event: DragOverEvent) => {
        const { active, over } = event;
        if (!over) return;
        // Logic for drag over (visuals only) can be added here if needed
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveId(null);

        if (!over) return;

        const activeId = active.id as string;
        const overId = over.id as string;

        const activeDeal = deals.find(d => (d._id === activeId || d.id === activeId));
        if (!activeDeal) return;

        let newStage: StageId = activeDeal.stage;

        if (stages.some(s => s.id === overId)) {
            newStage = overId as StageId;
        } else {
            const overDeal = deals.find(d => (d._id === overId || d.id === overId));
            if (overDeal) {
                newStage = overDeal.stage;
            }
        }

        if (activeDeal.stage !== newStage) {
            // Optimistic update
            const updatedDeals = deals.map(d =>
                (d._id === activeId || d.id === activeId) ? { ...d, stage: newStage } : d
            );
            setDeals(updatedDeals);

            // Here you would call an API to update the deal stage in DB
            toast.success(`Deal moved to ${newStage}`);
        }
    };

    const totalPipelineValue = deals.reduce((sum, deal) => sum + (deal.value || 0), 0);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6 h-full flex flex-col">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="glass-card p-4 rounded-xl flex items-center gap-4 border border-border bg-white/30">
                    <div className="p-3 bg-blue-100 rounded-full text-blue-600"><DollarSign className="w-5 h-5" /></div>
                    <div><p className="text-xs font-bold text-muted-foreground uppercase">Total Pipeline</p><h3 className="text-xl font-bold text-gray-900">₹ {(totalPipelineValue / 100000).toFixed(2)} L</h3></div>
                </div>
                <div className="glass-card p-4 rounded-xl flex items-center gap-4 border border-emerald-100 bg-emerald-50/30">
                    <div className="p-3 bg-emerald-100 rounded-full text-emerald-600"><Briefcase className="w-5 h-5" /></div>
                    <div><p className="text-xs font-bold text-muted-foreground uppercase">Active Deals</p><h3 className="text-xl font-bold text-gray-900">{deals.length}</h3></div>
                </div>
            </div>

            <DndContext
                sensors={sensors}
                collisionDetection={closestCorners}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
            >
                <div className="flex gap-6 overflow-x-auto pb-4 h-full min-w-[1024px]">
                    {stages.map((stage) => {
                        const stageDeals = getDealsByStage(stage.id);
                        const stageValue = stageDeals.reduce((sum, d) => sum + (d.value || 0), 0);

                        return (
                            <div key={stage.id} className="flex-1 flex flex-col min-w-[280px]">
                                <div className={cn("glass-card p-3 rounded-xl mb-3 flex flex-col gap-1 border-t-4 shadow-sm", stage.color)}>
                                    <div className="flex justify-between items-center">
                                        <h3 className="font-bold text-sm text-gray-900">{stage.label}</h3>
                                        <span className="text-xs bg-white/50 px-2 py-0.5 rounded-full font-bold shadow-sm">{stageDeals.length}</span>
                                    </div>
                                    <p className="text-[10px] font-semibold opacity-80">₹ {(stageValue / 100000).toFixed(1)} L</p>
                                </div>

                                <SortableContext id={stage.id} items={stageDeals.map(d => d._id || d.id!)} strategy={verticalListSortingStrategy}>
                                    <div className="flex-1 space-y-3 overflow-y-auto pr-2 pb-2">
                                        {stageDeals.map(deal => (
                                            <SortableDeal key={deal._id || deal.id} deal={deal} />
                                        ))}
                                        <Button variant="ghost" className="w-full border-2 border-dashed border-gray-200 text-gray-400 hover:text-gray-600 hover:border-gray-300">
                                            <Plus className="w-4 h-4 mr-2" /> Add Deal
                                        </Button>
                                    </div>
                                </SortableContext>
                            </div>
                        );
                    })}
                </div>

                <DragOverlay>
                    {activeId ? (
                        <div className="bg-white p-4 rounded-xl border border-primary/50 shadow-2xl rotate-2 cursor-grabbing w-[280px]">
                            {(() => {
                                const d = deals.find(d => (d._id === activeId || d.id === activeId));
                                return d ? (
                                    <>
                                        <h4 className="font-bold text-gray-900 mb-2">{d.title}</h4>
                                        <div className="h-2 w-full bg-white rounded-full overflow-hidden"><div className="h-full bg-primary w-2/3"></div></div>
                                    </>
                                ) : null;
                            })()}
                        </div>
                    ) : null}
                </DragOverlay>
            </DndContext>
        </div>
    );
}

