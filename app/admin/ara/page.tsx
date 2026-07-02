"use client";

import { useState, useEffect } from 'react';
import { AlertTriangle, ShieldAlert, CheckCircle, Search, RefreshCw, Loader2 } from 'lucide-react';
import { analyzeRisks } from '@/app/actions/admin';
import { toast } from 'sonner';

interface RiskScenario {
    id: string;
    name: string;
    description: string;
    conflictingPermissions: string[];
    riskLevel: 'High' | 'Medium' | 'Low';
}

const SOD_RULES: RiskScenario[] = [
    {
        id: 'SOD-001',
        name: 'Maker-Checker Violation (HR)',
        description: 'User can both Create and Approve Leave Requests.',
        conflictingPermissions: ['hrm:leaves:manage', 'hrm:leaves:approve'],
        riskLevel: 'High'
    },
    {
        id: 'SOD-002',
        name: 'Payroll Self-Approval',
        description: 'User can Process Payroll and Approve payouts.',
        conflictingPermissions: ['hrm:payroll:process', 'hrm:payroll:approve'],
        riskLevel: 'High'
    },
    {
        id: 'SOD-003',
        name: 'User Admin Abuse',
        description: 'User can View Users and Delete Users without audit override.',
        conflictingPermissions: ['users:view', 'users:delete'],
        riskLevel: 'Medium'
    }
];

export default function FRADashboard() {
    const [analyzing, setAnalyzing] = useState(false);
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        runAnalysis();
    }, []);

    const runAnalysis = async () => {
        setAnalyzing(true);
        try {
            const res = await analyzeRisks();
            if (res.success && res.data) {
                setResults(res.data);
                if (!loading) toast.success('Risk analysis updated');
            } else {
                toast.error('Failed to analyze risks');
            }
        } catch (error) {
            toast.error('An error occurred during analysis');
        } finally {
            setAnalyzing(false);
            setLoading(false);
        }
    };

    const stats = {
        high: results.filter(r => r.violations.some((v: string) => SOD_RULES.find(rule => rule.id === v)?.riskLevel === 'High')).length,
        medium: results.filter(r => r.violations.some((v: string) => SOD_RULES.find(rule => rule.id === v)?.riskLevel === 'Medium')).length,
        clean: results.filter(r => r.violations.length === 0).length
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Access Risk Analysis (ARA)</h1>
                    <p className="text-gray-500">Detect Separation of Duties (SoD) conflicts and security risks.</p>
                </div>
                <button
                    onClick={runAnalysis}
                    disabled={analyzing}
                    className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:brightness-[1.08] transition-colors shadow-sm disabled:opacity-70"
                >
                    <RefreshCw className={`w-4 h-4 ${analyzing ? 'animate-spin' : ''}`} />
                    {analyzing ? 'Analyzing...' : 'Run Risk Analysis'}
                </button>
            </div>

            {/* Risk Rules Summary */}
            <div className="grid md:grid-cols-3 gap-6">
                <div className="bg-red-50 p-4 rounded-xl border border-red-100 flex items-start gap-4">
                    <div className="p-2 bg-white rounded-lg shadow-sm text-red-600">
                        <ShieldAlert className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-red-900 mb-1">High Risks Found</h3>
                        <p className="text-sm text-red-700">{stats.high} Roles have critical SoD violations.</p>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-border flex items-start gap-4">
                    <div className="p-2 bg-white rounded-lg shadow-sm text-orange-600">
                        <AlertTriangle className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-orange-900 mb-1">Warnings</h3>
                        <p className="text-sm text-orange-700">{stats.medium} Potential privilege escalations.</p>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-border flex items-start gap-4">
                    <div className="p-2 bg-white rounded-lg shadow-sm text-green-600">
                        <CheckCircle className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-green-900 mb-1">Clean Roles</h3>
                        <p className="text-sm text-green-700">{stats.clean} Roles are compliant.</p>
                    </div>
                </div>
            </div>

            {/* Analysis Results Table */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-100 bg-background/50 flex items-center justify-between">
                    <h3 className="font-bold text-gray-900">Role Risk Matrix</h3>
                    <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search roles..."
                            className="pl-9 pr-4 py-1.5 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500/20 outline-none"
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="p-12 text-center text-gray-400 flex flex-col items-center">
                        <Loader2 className="w-8 h-8 animate-spin mb-2" />
                        <p>Loading analysis...</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-gray-500 uppercase bg-background border-b border-gray-100">
                                <tr>
                                    <th className="px-6 py-3 font-medium">Role Name</th>
                                    <th className="px-6 py-3 font-medium">Risk Status</th>
                                    <th className="px-6 py-3 font-medium">Violations Detected</th>
                                    <th className="px-6 py-3 font-medium text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {results.map((role) => {
                                    const hasViolations = role.violations.length > 0;
                                    return (
                                        <tr key={role.id} className="hover:bg-background/50">
                                            <td className="px-6 py-4 font-medium text-gray-900">{role.name}</td>
                                            <td className="px-6 py-4">
                                                {hasViolations ? (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                                                        At Risk
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                                         <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                                                         Secure
                                                     </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                {hasViolations ? (
                                                    <div className="flex flex-col gap-1">
                                                        {role.violations.map((vId: string) => {
                                                            const rule = SOD_RULES.find(r => r.id === vId);
                                                            return (
                                                                <div key={vId} className="group relative flex items-center gap-1 text-red-600">
                                                                    <AlertTriangle className="w-3 h-3" />
                                                                    <span className="text-xs font-medium">{rule?.name || vId}</span>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-400">-</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button className="text-indigo-600 hover:text-indigo-800 font-medium text-xs hover:underline">
                                                    Mitigate
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
