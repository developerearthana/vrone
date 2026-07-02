"use client";

import Link from 'next/link';
import { Shield, Briefcase, Users, User, ArrowRight, LayoutDashboard } from 'lucide-react';

export default function SimulationLaunchpad() {
    const personas = [
        {
            id: 'super-admin',
            name: 'Super Administrator',
            desc: 'Full system control, global settings, & sensitive data access.',
            icon: Shield,
            color: 'text-purple-600',
            bg: 'bg-purple-100',
            border: 'hover:border-purple-300',
            link: '/dashboards/super-admin',
            level: 'Level 100'
        },
        {
            id: 'manager',
            name: 'Mid-Level Manager',
            desc: 'Department oversight, approvals, & team performance reporting.',
            icon: Briefcase,
            color: 'text-blue-600',
            bg: 'bg-blue-100',
            border: 'hover:border-blue-300',
            link: '/dashboards/manager',
            level: 'Level 50'
        },
        {
            id: 'employee',
            name: 'Standard Operator',
            desc: 'Daily tasks, my attendance, & self-service modules.',
            icon: Users,
            color: 'text-green-600',
            bg: 'bg-green-100',
            border: 'hover:border-green-300',
            link: '/dashboards/employee',
            level: 'Level 10'
        },
        {
            id: 'guest',
            name: 'Viewer / Guest',
            desc: 'Read-only access to public policies & information.',
            icon: User,
            color: 'text-gray-600',
            bg: 'bg-white',
            border: 'hover:border-gray-300',
            link: '/dashboards/guest',
            level: 'Level 0'
        }
    ];

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Role Simulator Launchpad</h1>
                    <p className="text-gray-500 mt-1">Experience the application from different user perspectives.</p>
                </div>
                <div className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-medium border border-indigo-100">
                    Simulation Mode Active
                </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
                {personas.map((persona) => {
                    const Icon = persona.icon;
                    return (
                        <div key={persona.id} className={`glass-card p-6 rounded-2xl border border-transparent transition-all duration-300 ${persona.border} shadow-sm hover:shadow-md group`}>
                            <div className="flex justify-between items-start mb-6">
                                <div className={`p-3 rounded-xl ${persona.bg} ${persona.color}`}>
                                    <Icon className="w-8 h-8" />
                                </div>
                                <span className={`px-3 py-1 rounded-full text-xs font-bold bg-white border border-gray-100 shadow-sm ${persona.color}`}>
                                    {persona.level}
                                </span>
                            </div>

                            <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-indigo-600 transition-colors">
                                {persona.name}
                            </h3>
                            <p className="text-gray-500 mb-6 h-10">
                                {persona.desc}
                            </p>

                            <Link
                                href={persona.link}
                                className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-xl hover:brightness-[1.08] transition-all font-medium"
                            >
                                <LayoutDashboard className="w-4 h-4" />
                                Launch Dashboard
                                <ArrowRight className="w-4 h-4 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                            </Link>
                        </div>
                    );
                })}
            </div>

            <div className="p-4 rounded-xl bg-white border border-border text-orange-800 text-sm flex gap-3 items-start">
                <span className="text-xl">💡</span>
                <p className="mt-0.5">
                    <strong>Note:</strong> These are sample screens to demonstrate the UI layout and available widgets for each role.
                    In the live environment, these views are automatically served based on the logged-in user's assigned role.
                </p>
            </div>
        </div>
    );
}
