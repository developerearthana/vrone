"use client";

import { Building2, Layers, Users, Network, Briefcase, ArrowRight, Tag, Grid2X2, LayoutGrid, Bell } from 'lucide-react';
import { getUpcomingAlerts } from '@/app/actions/activity/calendar';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useViewPreference } from '@/hooks/useViewPreference';

export default function MastersDashboard() {
    const cards = [
        { name: 'Company',             desc: 'Company details & branding',           href: '/masters/company',             icon: Building2, color: 'text-blue-600' },
        { name: 'Subsidiaries',        desc: 'Branch offices & entities',            href: '/masters/subsidiaries',        icon: Layers,    color: 'text-purple-600' },
        { name: 'Departments',         desc: 'Functional units (HR, IT…)',           href: '/masters/departments',         icon: Briefcase, color: 'text-orange-600' },
        { name: 'Teams',               desc: 'Workforce groups',                     href: '/masters/teams',               icon: Network,   color: 'text-green-600' },
        { name: 'Users',               desc: 'Manage access & roles',                href: '/masters/users',               icon: Users,     color: 'text-primary' },
        { name: 'Vendors',             desc: 'Vendor & supplier details',            href: '/masters/vendors',             icon: Tag,       color: 'text-teal-600' },
        { name: 'Project Templates',   desc: 'Stage workflows',                      href: '/masters/project-templates',   icon: Layers,    color: 'text-indigo-600' },
        { name: 'Employee Categories', desc: 'Employment types (Full-time, Contract…)', href: '/masters/employee-categories', icon: Briefcase, color: 'text-rose-600' },
    ];

    const [viewMode, setViewMode] = useViewPreference<'grid-sm' | 'grid-md' | 'list'>('mastersViewMode', 'grid-md');
    const [alerts, setAlerts] = useState<any[]>([]);

    useEffect(() => {
        const loadAlerts = async () => {
            const res = await getUpcomingAlerts();
            if (res.success) setAlerts(res.data);
        };
        loadAlerts();
    }, []);

    return (
        <div className="space-y-5">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Masters Configuration</h1>
                    <p className="page-subtitle">Organisational structure and system settings.</p>
                </div>
                <div className="view-toggle" role="group" aria-label="View mode">
                    <button
                        onClick={() => setViewMode('list')}
                        className={`view-toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
                        aria-label="List view" aria-pressed={viewMode === 'list'}
                    >
                        <Layers className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => setViewMode('grid-sm')}
                        className={`view-toggle-btn ${viewMode === 'grid-sm' ? 'active' : ''}`}
                        aria-label="Compact grid" aria-pressed={viewMode === 'grid-sm'}
                    >
                        <LayoutGrid className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => setViewMode('grid-md')}
                        className={`view-toggle-btn ${viewMode === 'grid-md' ? 'active' : ''}`}
                        aria-label="Default grid" aria-pressed={viewMode === 'grid-md'}
                    >
                        <Grid2X2 className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {alerts.length > 0 && (
                <div className="flex flex-col gap-2">
                    {alerts.map((alert: any) => (
                        <div key={alert._id || alert.id}
                            className="flex items-center justify-between bg-amber-50 border border-amber-200 p-3.5 rounded-xl">
                            <div className="flex items-center gap-3">
                                <div className="p-1.5 bg-amber-100 text-amber-600 rounded-lg shrink-0">
                                    <Bell className="w-4 h-4" />
                                </div>
                                <div>
                                    <p className="font-semibold text-amber-900 text-sm">{alert.title}</p>
                                    <p className="text-amber-700 text-xs">
                                        {format(new Date(alert.start), 'HH:mm')} · {format(new Date(alert.start), 'MMM d')}
                                    </p>
                                </div>
                            </div>
                            <Button variant="ghost" size="sm"
                                className="text-amber-700 hover:bg-amber-100 shrink-0"
                                onClick={() => setAlerts(prev => prev.filter(a => (a._id || a.id) !== (alert._id || alert.id)))}>
                                Dismiss
                            </Button>
                        </div>
                    ))}
                </div>
            )}

            <div className={
                viewMode === 'list'    ? 'flex flex-col gap-2' :
                viewMode === 'grid-sm' ? 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3' :
                                         'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'
            }>
                {cards.map((card) => {
                    const Icon = card.icon;

                    if (viewMode === 'list') {
                        return (
                            <Link key={card.name} href={card.href} className="group block">
                                <div className="glass-card px-4 py-3 flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-muted shrink-0">
                                            <Icon className={`w-4 h-4 ${card.color}`} />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-semibold text-foreground text-sm leading-snug">{card.name}</p>
                                            <p className="text-xs text-muted-foreground truncate">{card.desc}</p>
                                        </div>
                                    </div>
                                    <ArrowRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-primary shrink-0 transition-colors" />
                                </div>
                            </Link>
                        );
                    }

                    return (
                        <Link key={card.name} href={card.href} className="group block">
                            <div className={`glass-card h-full flex flex-col gap-3 ${viewMode === 'grid-sm' ? 'p-4' : 'p-5'}`}>
                                <div className="flex items-start justify-between">
                                    <div className="p-2 rounded-lg bg-muted">
                                        <Icon className={`${viewMode === 'grid-sm' ? 'w-4 h-4' : 'w-5 h-5'} ${card.color}`} />
                                    </div>
                                    <ArrowRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-primary transition-colors mt-0.5" />
                                </div>
                                <div>
                                    <p className={`font-semibold text-foreground leading-snug ${viewMode === 'grid-sm' ? 'text-sm' : 'text-base'}`}>
                                        {card.name}
                                    </p>
                                    <p className={`text-muted-foreground mt-0.5 ${viewMode === 'grid-sm' ? 'text-xs line-clamp-2' : 'text-sm'}`}>
                                        {card.desc}
                                    </p>
                                </div>
                            </div>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
