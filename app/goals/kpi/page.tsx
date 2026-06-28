"use client";

import { AlertCircle, CheckCircle, TrendingUp, Filter, Plus, User as UserIcon } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { KPIEntryModal } from '@/components/goals/KPIEntryModal';
import { getUsers } from '@/app/actions/hrm';
import { getKPIEntries, createKPIEntry } from '@/app/actions/kpi';
import { getGoals } from '@/app/actions/goal';
import { getKPITemplates } from '@/app/actions/kpi';
import { toast } from 'sonner';
import { User } from '@/types';

const ALL_OPTION = 'All';

export default function WeeklyKPI() {
    const [selectedSubsidiary, setSelectedSubsidiary] = useState(ALL_OPTION);
    const [selectedTeam, setSelectedTeam] = useState(ALL_OPTION);
    const [selectedPeriod, setSelectedPeriod] = useState(ALL_OPTION);
    const [showModal, setShowModal] = useState(false);
    const [entries, setEntries] = useState<any[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [goals, setGoals] = useState<any[]>([]);
    const [metrics, setMetrics] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);

    const loadData = async () => {
        const [usersRes, entriesRes, goalsRes, templatesRes] = await Promise.all([
            getUsers(),
            getKPIEntries(),
            getGoals(),
            getKPITemplates(),
        ]);

        if (usersRes?.success && usersRes.data) {
            setUsers(usersRes.data);
        }

        if (entriesRes?.success && entriesRes.data) {
            setEntries(entriesRes.data);
        }

        if (goalsRes?.success && goalsRes.data) {
            setGoals(goalsRes.data);
        }

        const templateMetrics = templatesRes?.success && templatesRes.data
            ? templatesRes.data.map((template: any) => template.name)
            : [];
        const entryMetrics = entriesRes?.success && entriesRes.data
            ? entriesRes.data.map((entry: any) => entry.metric)
            : [];
        setMetrics(Array.from(new Set([...templateMetrics, ...entryMetrics])).sort());
    };

    useEffect(() => {
        const fetchData = async () => {
            try {
                await loadData();
            } catch (error) {
                console.error("Failed to fetch data", error);
                toast.error("Failed to load KPI data");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const handleAddEntry = async (entry: any) => {
        try {
            const result = await createKPIEntry(entry);

            if (result.success) {
                toast.success("KPI entry added");
                setShowModal(false);
                await loadData();
            } else {
                toast.error(result.error || "Failed to add entry");
            }
        } catch (_error) {
            toast.error("An unexpected error occurred");
        }
    };

    const subsidiaries = useMemo(() => (
        [ALL_OPTION, ...Array.from(new Set([
            ...goals.map((goal) => goal.subsidiary),
            ...entries.map((entry) => entry.subsidiary),
        ].filter(Boolean))).sort()]
    ), [goals, entries]);

    const teams = useMemo(() => (
        [ALL_OPTION, ...Array.from(new Set([
            ...users.map((user) => user.dept),
            ...entries.map((entry) => entry.team),
        ].filter(Boolean))).sort()]
    ), [users, entries]);

    const periods = useMemo(() => (
        [ALL_OPTION, ...Array.from(new Set(goals.map((goal) => goal.fiscalPeriod).filter(Boolean))).sort()]
    ), [goals]);

    const targets = useMemo(() => {
        return goals
            .filter((goal) => goal.metric && goal.targetValue)
            .map((goal) => ({
                user: goal.assignedTo?.name || '',
                metric: goal.metric,
                target: goal.targetValue,
            }))
            .filter((target) => target.user && target.metric);
    }, [goals]);

    const filteredEntries = useMemo(() => {
        return entries.filter((entry) => {
            const matchSub = selectedSubsidiary === ALL_OPTION || entry.subsidiary === selectedSubsidiary;
            const matchTeam = selectedTeam === ALL_OPTION || entry.team === selectedTeam;
            const entryPeriod = entry.goalId?.fiscalPeriod || ALL_OPTION;
            const matchPeriod = selectedPeriod === ALL_OPTION || entryPeriod === selectedPeriod;
            return matchSub && matchTeam && matchPeriod;
        });
    }, [entries, selectedSubsidiary, selectedTeam, selectedPeriod]);

    if (loading) {
        return <div className="p-8 text-center text-gray-500">Loading KPI data...</div>;
    }

    return (
        <div className="space-y-6 relative">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold text-gray-900">Weekly KPI Tracker</h2>
                    <p className="text-gray-500">Monitor weekly performance against key metrics.</p>
                </div>
                <div className="flex gap-2 items-center flex-wrap">
                    <div className="relative">
                        <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                        <select
                            aria-label="Filter by Subsidiary"
                            className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={selectedSubsidiary}
                            onChange={(e) => setSelectedSubsidiary(e.target.value)}
                        >
                            {subsidiaries.map((sub) => (
                                <option key={sub} value={sub}>{sub}</option>
                            ))}
                        </select>
                    </div>

                    <div className="relative">
                        <UserIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                        <select
                            aria-label="Filter by Team"
                            className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={selectedTeam}
                            onChange={(e) => setSelectedTeam(e.target.value)}
                        >
                            {teams.map((team) => (
                                <option key={team} value={team}>{team}</option>
                            ))}
                        </select>
                    </div>

                    <select
                        aria-label="Select Date Range"
                        className="p-2 border border-gray-200 rounded-lg text-sm"
                        value={selectedPeriod}
                        onChange={(e) => setSelectedPeriod(e.target.value)}
                    >
                        {periods.map((period) => (
                            <option key={period} value={period}>{period}</option>
                        ))}
                    </select>
                    <button
                        onClick={() => setShowModal(true)}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        Add Entry
                    </button>
                </div>
            </div>

            <div className="glass-card rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                <table className="w-full text-left text-sm min-w-[540px]">
                    <thead>
                        <tr className="bg-background/50 border-b border-gray-100 text-gray-500">
                            <th className="p-4 font-medium">Week</th>
                            <th className="p-4 font-medium">Metric</th>
                            <th className="p-4 font-medium">Assignee / Team</th>
                            <th className="p-4 font-medium text-right">Target</th>
                            <th className="p-4 font-medium text-right">Actual</th>
                            <th className="p-4 font-medium text-right">Variance</th>
                            <th className="p-4 font-medium">Status</th>
                            <th className="p-4 font-medium">Comments</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filteredEntries.map((entry) => (
                            <tr key={entry.id} className="hover:bg-background/50">
                                <td className="p-4 font-medium text-gray-900">
                                    {entry.week}
                                    <div className="text-xs text-gray-500 font-normal">{entry.goalId?.fiscalPeriod || entry.subsidiary}</div>
                                </td>
                                <td className="p-4 text-gray-600 font-medium">{entry.metric}</td>
                                <td className="p-4">
                                    <div className="font-medium text-gray-900">{entry.assigneeName || entry.assignee?.name || entry.assignee}</div>
                                    <div className="text-xs text-gray-500">{entry.team}</div>
                                </td>
                                <td className="p-4 text-right text-gray-600 font-medium">{entry.target}</td>
                                <td className="p-4 text-right text-gray-900 font-bold">{entry.actual}</td>
                                <td className={`p-4 text-right font-medium ${entry.variance?.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
                                    {entry.variance}
                                </td>
                                <td className="p-4">
                                    <div className="flex items-center gap-2">
                                        {entry.status === 'Exceeded' && <TrendingUp className="w-4 h-4 text-green-500" />}
                                        {entry.status === 'Met' && <CheckCircle className="w-4 h-4 text-blue-500" />}
                                        {entry.status === 'Missed' && <AlertCircle className="w-4 h-4 text-red-500" />}
                                        <span className={`text-xs px-2 py-0.5 rounded-full border
                                            ${entry.status === 'Exceeded' ? 'bg-white border-green-200 text-green-700' :
                                                entry.status === 'Met' ? 'bg-white border-blue-200 text-blue-700' :
                                                    'bg-red-50 border-red-200 text-red-700'}`}>
                                            {entry.status}
                                        </span>
                                    </div>
                                </td>
                                <td className="p-4 text-gray-500 italic max-w-xs truncate" title={entry.comment}>
                                    "{entry.comment}"
                                </td>
                            </tr>
                        ))}
                        {filteredEntries.length === 0 && (
                            <tr>
                                <td colSpan={8} className="p-8 text-center text-gray-500">
                                    No KPI entries found for the current filters.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
                </div>
            </div>

            <KPIEntryModal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                onSubmit={handleAddEntry}
                subsidiaries={subsidiaries}
                metrics={metrics}
                users={users}
                targets={targets}
                goals={goals}
            />
        </div>
    );
}
