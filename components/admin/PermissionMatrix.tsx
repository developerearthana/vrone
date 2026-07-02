'use client';

import { MODULE_GROUPS, ACTIONS } from "@/lib/permissions";
import { Check, ChevronDown, ChevronRight, Info } from "lucide-react";
import { useState, Fragment } from "react";

interface PermissionMatrixProps {
    selectedPermissions: string[];
    onToggle: (permissions: string[]) => void;
    readOnly?: boolean;
}

export function PermissionMatrix({ selectedPermissions, onToggle, readOnly = false }: PermissionMatrixProps) {
    // Auto-expand modules that have any permission selected
    const [expandedModules, setExpandedModules] = useState<string[]>(() => {
        const expanded = new Set<string>();
        MODULE_GROUPS.forEach(group => {
            group.modules.forEach(module => {
                // Check if any permission in this module is selected
                const hasSelected = selectedPermissions.some(p => p.startsWith(module.code));
                if (hasSelected) {
                    expanded.add(module.code);
                }
            });
        });
        return Array.from(expanded);
    });

    const toggleExpanded = (moduleCode: string) => {
        setExpandedModules(prev =>
            prev.includes(moduleCode) ? prev.filter(c => c !== moduleCode) : [...prev, moduleCode]
        );
    };

    const getPermId = (moduleCode: string, actionCode?: string, subModuleCode?: string) => {
        // Format: module (view) or module.action
        // With Submodule: module.submodule (view) or module.submodule.action
        let id = moduleCode;
        if (subModuleCode) id += `.${subModuleCode}`;
        if (actionCode && actionCode !== 'view') id += `.${actionCode}`;
        return id;
    };

    const isPermSelected = (permId: string) => selectedPermissions.includes(permId);

    const togglePermission = (moduleCode: string, actionCode: string, subModuleCode?: string) => {
        if (readOnly) return;

        const permId = getPermId(moduleCode, actionCode, subModuleCode);
        const isSelected = isPermSelected(permId);
        let newPermissions = [...selectedPermissions];

        if (isSelected) {
            // Deselecting
            newPermissions = newPermissions.filter(p => p !== permId);

            // If view is deselected, remove all actions for this module/submodule
            if (actionCode === 'view') {
                const prefix = subModuleCode ? `${moduleCode}.${subModuleCode}` : moduleCode;
                newPermissions = newPermissions.filter(p => !p.startsWith(prefix + '.'));
            }
        } else {
            // Selecting
            newPermissions.push(permId);

            // If action is selected, ensure view is also selected
            if (actionCode !== 'view') {
                const viewPermId = getPermId(moduleCode, 'view', subModuleCode);
                if (!newPermissions.includes(viewPermId)) {
                    newPermissions.push(viewPermId);
                }
            }
        }

        onToggle(newPermissions);
    };

    return (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-700 uppercase bg-background border-b">
                    <tr>
                        <th className="px-4 py-3 font-medium w-1/3 min-w-[200px]">Module / Feature</th>
                        {ACTIONS.map(action => (
                            <th key={action.code} className="px-2 py-3 text-center font-medium w-24">
                                <div className="flex flex-col items-center group cursor-help">
                                    <span>{action.label}</span>
                                    <span className="opacity-0 group-hover:opacity-100 absolute -mt-8 bg-foreground text-background text-[10px] px-2 py-1 rounded transition-opacity normal-case">
                                        {action.description}
                                    </span>
                                </div>
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {MODULE_GROUPS.map((group) => (
                        <Fragment key={group.category}>
                            {/* Category Header */}
                            <tr>
                                <td colSpan={ACTIONS.length + 1} className="bg-background/50 px-4 py-2 text-xs font-bold text-gray-500 uppercase tracking-wider border-y border-gray-100">
                                    {group.category}
                                </td>
                            </tr>

                            {/* Modules */}
                            {group.modules.map(module => {
                                const hasSubModules = module.subModules && module.subModules.length > 0;
                                const isExpanded = expandedModules.includes(module.code);

                                return (
                                    <Fragment key={module.code}>
                                        {/* Main Module Row */}
                                        <tr className="bg-white hover:bg-background/50 transition-colors">
                                            <td className="px-4 py-3 font-medium text-gray-900 border-r border-gray-50">
                                                <div className="flex items-center gap-2">
                                                    {hasSubModules && (
                                                        <button
                                                            onClick={(e) => { e.preventDefault(); toggleExpanded(module.code); }}
                                                            className="p-0.5 rounded hover:bg-white text-gray-400"
                                                        >
                                                            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                                        </button>
                                                    )}
                                                    <span className={!hasSubModules ? "ml-6" : ""}>{module.label}</span>
                                                </div>
                                            </td>
                                            {ACTIONS.map(action => {
                                                const permId = getPermId(module.code, action.code);
                                                const isSelected = isPermSelected(permId);

                                                return (
                                                    <td key={action.code} className="px-2 py-3 border-r border-gray-50/50">
                                                        <button
                                                            type="button"
                                                            onClick={() => togglePermission(module.code, action.code)}
                                                            aria-label={`Toggle ${action.label} permission for ${module.label}`}
                                                            disabled={readOnly}
                                                            className={`
                                                                w-5 h-5 rounded border flex items-center justify-center transition-all mx-auto
                                                                ${isSelected
                                                                    ? 'bg-primary border-primary text-white'
                                                                    : 'bg-white border-gray-300 text-transparent hover:border-gray-400'
                                                                }
                                                                ${readOnly ? 'cursor-not-allowed opacity-60' : ''}
                                                            `}
                                                        >
                                                            <Check className="w-3.5 h-3.5" strokeWidth={3} />
                                                        </button>
                                                    </td>
                                                );
                                            })}
                                        </tr>

                                        {/* Sub Modules Rows */}
                                        {hasSubModules && isExpanded && module.subModules!.map(sub => (
                                            <tr key={sub.code} className="bg-background/30">
                                                <td className="px-4 py-2 pl-12 font-normal text-gray-600 text-sm border-r border-gray-50 flex items-center gap-2">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
                                                    {sub.label}
                                                </td>
                                                {ACTIONS.map(action => {
                                                    const permId = getPermId(module.code, action.code, sub.code);
                                                    const isSelected = isPermSelected(permId);

                                                    return (
                                                        <td key={action.code} className="px-2 py-2 border-r border-gray-50/50">
                                                            <button
                                                                type="button"
                                                                onClick={() => togglePermission(module.code, action.code, sub.code)}
                                                                aria-label={`Toggle ${sub.label} ${action.label}`}
                                                                disabled={readOnly}
                                                                className={`
                                                                    w-4 h-4 rounded border flex items-center justify-center transition-all mx-auto
                                                                    ${isSelected
                                                                        ? 'bg-primary border-primary text-white'
                                                                        : 'bg-white border-gray-300 text-transparent hover:border-gray-400'
                                                                    }
                                                                    ${readOnly ? 'cursor-not-allowed opacity-60' : ''}
                                                                `}
                                                            >
                                                                <Check className="w-2.5 h-2.5" strokeWidth={3} />
                                                            </button>
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        ))}
                                    </Fragment>
                                );
                            })}
                        </Fragment>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

