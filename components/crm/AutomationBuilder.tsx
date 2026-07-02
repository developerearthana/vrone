"use client";

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Zap, Plus, ArrowRight, Mail, Bell, CheckCircle, Trash2, Sliders } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CardWrapper } from '@/components/ui/page-wrapper';

interface Rule {
    id: number;
    name: string;
    trigger: string;
    condition: string;
    action: string;
    active: boolean;
}

const MOCK_RULES: Rule[] = [
    { id: 1, name: "High Value Alert", trigger: "New Deal Created", condition: "Value > ₹5,00,000", action: "Email Manager", active: true },
    { id: 2, name: "Stagnant Deal Warning", trigger: "Deal Stage Unchanged", condition: "Duration > 10 Days", action: "Slack Notification", active: true },
];

export function AutomationBuilder() {
    const [rules, setRules] = useState<Rule[]>(MOCK_RULES);
    const [showBuilder, setShowBuilder] = useState(false);

    return (
        <CardWrapper className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <Zap className="w-5 h-5 text-amber-500 fill-amber-500" />
                        Automation Rules
                    </h3>
                    <p className="text-sm text-gray-500">Automate your sales workflow with simple rules.</p>
                </div>
                <button onClick={() => setShowBuilder(!showBuilder)} className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-bold shadow-lg hover:brightness-[1.08] transition-all flex items-center gap-2">
                    <Plus className="w-4 h-4" /> New Rule
                </button>
            </div>

            {/* Builder UI */}
            {showBuilder && (
                <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    className="bg-background border border-gray-200 rounded-xl p-6 overflow-hidden"
                >
                    <div className="flex flex-col md:flex-row items-center gap-4 text-sm">
                        <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm w-full md:w-auto">
                            <span className="block text-xs font-bold text-gray-400 mb-1 uppercase">When</span>
                            <select aria-label="Trigger Event" className="bg-transparent font-bold text-gray-900 outline-none w-full">
                                <option>Deal Stage Changes</option>
                                <option>New Lead Added</option>
                            </select>
                        </div>

                        <ArrowRight className="text-gray-400 rotate-90 md:rotate-0" />

                        <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm w-full md:w-auto">
                            <span className="block text-xs font-bold text-gray-400 mb-1 uppercase">If</span>
                            <div className="flex gap-2">
                                <select aria-label="Condition Field" className="bg-transparent font-bold text-gray-900 outline-none"><option>Value</option><option>Probability</option></select>
                                <select aria-label="Condition Operator" className="bg-transparent text-gray-600 outline-none bg-background rounded px-1"><option>is greater than</option></select>
                                <input type="text" aria-label="Condition Value" placeholder="10000" className="w-20 border-b border-gray-300 focus:border-primary outline-none" />
                            </div>
                        </div>

                        <ArrowRight className="text-gray-400 rotate-90 md:rotate-0" />

                        <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm w-full md:w-auto">
                            <span className="block text-xs font-bold text-gray-400 mb-1 uppercase">Then</span>
                            <select aria-label="Action" className="bg-transparent font-bold text-purple-600 outline-none w-full">
                                <option>Send Email</option>
                                <option>Create Task</option>
                                <option>Update Probability</option>
                            </select>
                        </div>

                        <div className="ml-auto flex gap-2 w-full md:w-auto mt-4 md:mt-0">
                            <button onClick={() => setShowBuilder(false)} className="px-4 py-2 text-gray-500 font-medium hover:bg-white rounded-lg flex-1 md:flex-none">Cancel</button>
                            <button className="px-4 py-2 bg-primary text-white font-bold rounded-lg shadow-md hover:bg-primary/90 flex-1 md:flex-none">Save Rule</button>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Rules List */}
            <div className="space-y-3">
                {rules.map(rule => (
                    <div key={rule.id} className="group bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className={cn("p-2 rounded-lg", rule.active ? "bg-emerald-50 text-emerald-600" : "bg-white text-gray-400")}>
                                <Zap className="w-5 h-5 fill-current" />
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-900">{rule.name}</h4>
                                <p className="text-xs text-gray-500 font-medium flex items-center gap-2 mt-1">
                                    <span className="bg-white px-2 py-0.5 rounded text-gray-600">WHEN {rule.trigger}</span>
                                    <ArrowRight className="w-3 h-3 text-gray-300" />
                                    <span className="bg-white px-2 py-0.5 rounded text-blue-600 border border-border">IF {rule.condition}</span>
                                    <ArrowRight className="w-3 h-3 text-gray-300" />
                                    <span className="bg-white px-2 py-0.5 rounded text-purple-600 border border-border">THEN {rule.action}</span>
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" aria-label="Activate Rule" checked={rule.active} onChange={() => { }} className="sr-only peer" />
                                <div className="w-11 h-6 bg-white peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                            </label>
                            <button aria-label="Delete Rule" className="text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </CardWrapper>
    );
}

