"use client";

import { X } from 'lucide-react';
import { useState, useEffect, FormEvent, useCallback } from 'react';
import type { KPIEntryModalProps, User, KPITarget } from '@/types';

export function KPIEntryModal({ isOpen, onClose, onSubmit, subsidiaries = [], metrics = [], users = [], targets = [], goals = [] }: KPIEntryModalProps & { goals?: any[] }) {
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [week, setWeek] = useState("");
    const [sub, setSub] = useState(subsidiaries[1] || "");
    const [metric, setMetric] = useState(metrics[0] || "");
    const [assignee, setAssignee] = useState("");
    const [team, setTeam] = useState("");
    const [target, setTarget] = useState("");
    const [actual, setActual] = useState("");
    const [comment, setComment] = useState("");
    const [isTargetLocked, setIsTargetLocked] = useState(false);
    const [selectedGoalId, setSelectedGoalId] = useState("");

    // Auto-populate from Selected Goal
    useEffect(() => {
        if (selectedGoalId) {
            const goal = goals.find(g => (g._id || g.id) === selectedGoalId);
            if (goal) {
                setSub(goal.subsidiary);
                setMetric(goal.metric || goal.title); // Fallback if metric not separate
                setTarget(goal.targetValue || "");
                setIsTargetLocked(true);
            }
        }
    }, [selectedGoalId, goals]);

    // Auto-calculate Week based on Date
    useEffect(() => {
        if (!date) return;
        const selectedDate = new Date(date);
        const month = selectedDate.getMonth();
        const year = selectedDate.getFullYear();

        let quarterStart;
        if (month >= 3 && month <= 5) quarterStart = new Date(year, 3, 1);
        else if (month >= 6 && month <= 8) quarterStart = new Date(year, 6, 1);
        else if (month >= 9 && month <= 11) quarterStart = new Date(year, 9, 1);
        else quarterStart = new Date(year, 0, 1);

        const diffTime = Math.abs(selectedDate.getTime() - quarterStart.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        const weekNum = Math.ceil(diffDays / 7);

        setWeek(`Week ${weekNum}`);
    }, [date]);

    // Update default metric if metrics prop changes
    useEffect(() => {
        if (metrics.length > 0 && !metric && !selectedGoalId) {
            setMetric(metrics[0]);
        }
    }, [metrics, metric, selectedGoalId]);

    // Auto-populate Team when Assignee is selected
    const updateTeamFromAssignee = useCallback((selectedAssignee: string) => {
        const selectedUser = users.find((u: User) => u.name === selectedAssignee || u.id === selectedAssignee);
        if (selectedUser) {
            setTeam(selectedUser.dept);
        }
    }, [users]);

    useEffect(() => {
        if (assignee) {
            updateTeamFromAssignee(assignee);
        }
    }, [assignee, updateTeamFromAssignee]);

    // Enforce Target logic
    const updateTargetFromSelection = useCallback((selectedAssignee: string, selectedMetric: string) => {
        if (selectedGoalId) return; // Skip if goal is selected
        const assignedTarget = targets.find((t: KPITarget) => t.user === selectedAssignee && t.metric === selectedMetric);
        if (assignedTarget) {
            setTarget(assignedTarget.target);
            setIsTargetLocked(true);
        } else {
            setTarget("");
            setIsTargetLocked(false);
        }
    }, [targets, selectedGoalId]);

    useEffect(() => {
        if (assignee && metric) {
            updateTargetFromSelection(assignee, metric);
        } else if (!selectedGoalId) {
            setIsTargetLocked(false);
        }
    }, [assignee, metric, updateTargetFromSelection, selectedGoalId]);

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        onSubmit({
            week,
            subsidiary: sub,
            metric,
            assignee,
            team,
            target,
            actual,
            comment,
            date,
            goalId: selectedGoalId // Pass goalId
        });
        setTarget(""); setActual(""); setComment(""); setSelectedGoalId("");
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="flex justify-between items-center p-6 border-b border-gray-100">
                    <h3 className="text-lg font-bold text-gray-900">Add KPI Entry</h3>
                    <button aria-label="Close" onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">

                    {goals.length > 0 && (
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 mb-1">Link to Goal (Optional)</label>
                            <select
                                aria-label="Link to Goal (Optional)"
                                className="w-full p-2 border border-gray-200 rounded-lg text-sm bg-white/50"
                                value={selectedGoalId}
                                onChange={e => setSelectedGoalId(e.target.value)}
                            >
                                <option value="">-- Select Goal --</option>
                                {goals.map(g => (
                                    <option key={g._id} value={g._id}>{g.title} ({g.metric})</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 mb-1">Date</label>
                            <input
                                type="date"
                                required
                                aria-label="Select Date"
                                className="w-full p-2 border border-gray-200 rounded-lg text-sm"
                                value={date}
                                onChange={e => setDate(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 mb-1">Week (Auto)</label>
                            <input
                                type="text"
                                readOnly
                                aria-label="Auto-calculated Week"
                                className="w-full p-2 border border-gray-200 rounded-lg text-sm bg-background text-gray-500"
                                value={week}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1">Subsidiary</label>
                        <select
                            aria-label="Select Subsidiary"
                            className={`w-full p-2 border border-gray-200 rounded-lg text-sm ${selectedGoalId ? 'bg-white' : ''}`}
                            value={sub}
                            onChange={e => !selectedGoalId && setSub(e.target.value)}
                            disabled={!!selectedGoalId}
                        >
                            {subsidiaries.filter(s => s !== "All").map(s => (
                                <option key={s} value={s}>{s}</option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 mb-1">Assignee</label>
                            <select
                                aria-label="Select Assignee"
                                className="w-full p-2 border border-gray-200 rounded-lg text-sm"
                                value={assignee}
                                onChange={e => setAssignee(e.target.value)}
                                required
                            >
                                <option value="">Select User</option>
                                {users.map((u: User) => (
                                    <option key={u.id} value={u.id}>{u.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 mb-1">Team</label>
                            <input
                                type="text"
                                required
                                aria-label="Team Name"
                                placeholder="Auto-populated"
                                className="w-full p-2 border border-gray-200 rounded-lg text-sm bg-background"
                                value={team}
                                readOnly
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1">Metric Name</label>
                        <select
                            aria-label="Select Metric"
                            className="w-full p-2 border border-gray-200 rounded-lg text-sm"
                            value={metric}
                            onChange={e => setMetric(e.target.value)}
                        >
                            {metrics.map(m => (
                                <option key={m} value={m}>{m}</option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 mb-1 flex justify-between">
                                Target
                                {isTargetLocked && <span className="text-blue-600 text-[10px] font-bold uppercase tracking-wider">(Locked)</span>}
                            </label>
                            <input
                                type="text"
                                required
                                aria-label="Target Value"
                                placeholder="Value"
                                className={`w-full p-2 border border-gray-200 rounded-lg text-sm ${isTargetLocked ? 'bg-white text-blue-800 font-semibold' : ''}`}
                                value={target}
                                onChange={e => !isTargetLocked && setTarget(e.target.value)}
                                readOnly={isTargetLocked}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 mb-1">Actual</label>
                            <input
                                type="text"
                                required
                                aria-label="Actual Value"
                                placeholder="Value"
                                className="w-full p-2 border border-gray-200 rounded-lg text-sm"
                                value={actual}
                                onChange={e => setActual(e.target.value)}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1">Comments</label>
                        <textarea
                            aria-label="Comments"
                            className="w-full p-2 border border-gray-200 rounded-lg text-sm h-20 resize-none"
                            placeholder="Optional context about result..."
                            value={comment}
                            onChange={e => setComment(e.target.value)}
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-background rounded-lg"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:brightness-[1.08]"
                        >
                            Save Entry
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

