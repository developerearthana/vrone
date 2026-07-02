'use client';

import { createRole, updateRole } from '@/app/actions/role';
import { MODULE_GROUPS, ACTIONS, ROLE_TEMPLATES } from '@/lib/permissions';
import { Check, Loader2, Info, Copy } from 'lucide-react';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { PermissionMatrix } from './PermissionMatrix';

interface RoleFormProps {
    initialData?: {
        _id: string;
        name: string;
        description?: string;
        permissions: string[];
    };
    isEditing?: boolean;
    readOnly?: boolean;
}

export function RoleForm({ initialData, isEditing = false, readOnly = false }: RoleFormProps) {
    const [isPending, startTransition] = useTransition();
    const router = useRouter();
    const [selectedPermissions, setSelectedPermissions] = useState<string[]>(
        initialData?.permissions || []
    );
    const [templateValue, setTemplateValue] = useState<string>('');

    // Load template permissions
    const loadTemplate = (templateKey: string) => {
        setTemplateValue(templateKey);
        if (!templateKey) return;

        const template = ROLE_TEMPLATES[templateKey];
        if (template && confirm(`Replace current permissions with ${template.label} template?`)) {
            setSelectedPermissions([...template.permissions]);
        }
    };

    const handleSubmit = async (formData: FormData) => {
        if (readOnly) return;
        startTransition(async () => {
            selectedPermissions.forEach(p => formData.append('permissions', p));

            if (isEditing && initialData) {
                await updateRole(initialData._id, formData);
            } else {
                await createRole(formData);
            }
        });
    };

    return (
        <form action={handleSubmit} className="space-y-8 max-w-6xl">
            <div className="grid gap-6 md:grid-cols-3">
                {/* Role Details Column */}
                <div className="md:col-span-1 space-y-4">
                    <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm space-y-4 sticky top-6">
                        <h3 className="font-semibold text-gray-900 border-b pb-2">Role Details</h3>
                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Role Name</label>
                            <input
                                type="text"
                                name="name"
                                id="name"
                                defaultValue={initialData?.name}
                                required
                                disabled={readOnly}
                                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm px-4 py-2 border disabled:bg-background disabled:text-gray-500"
                                placeholder="e.g. Sales Manager"
                            />
                        </div>
                        <div>
                            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                            <textarea
                                name="description"
                                id="description"
                                defaultValue={initialData?.description}
                                rows={4}
                                disabled={readOnly}
                                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm px-4 py-2 border disabled:bg-background disabled:text-gray-500"
                                placeholder="Describe the responsibilities..."
                            />
                        </div>

                        {/* Template Selector - Only show in Edit mode (and not readOnly) */}
                        {isEditing && !readOnly && (
                            <div className="bg-white/50 p-3 rounded-lg border border-border">
                                <label htmlFor="template" className="block text-xs font-bold text-blue-800 mb-1 flex items-center gap-1">
                                    <Copy className="w-3 h-3" />
                                    Load from Template
                                </label>
                                <select
                                    id="template"
                                    className="w-full text-sm rounded-md border-gray-300 focus:border-blue-500 focus:ring-blue-500 p-1.5 bg-white"
                                    value={templateValue}
                                    onChange={(e) => loadTemplate(e.target.value)}
                                >
                                    <option value="">Select a template...</option>
                                    {Object.entries(ROLE_TEMPLATES).map(([key, tpl]) => (
                                        <option key={key} value={key}>{tpl.label}</option>
                                    ))}
                                </select>
                                <p className="text-[10px] text-blue-600 mt-1 leading-tight">
                                    This will replace current permissions. You can still manually edit after loading.
                                </p>
                            </div>
                        )}

                        <div className="pt-2 text-xs text-gray-500">
                            <p className="flex gap-2">
                                <Info className="w-4 h-4 text-blue-500 flex-shrink-0" />
                                <span>Note: Granular permissions allow you to define exactly what users can see (Page Level) and do (Button Level) within each module.</span>
                            </p>
                        </div>
                    </div>
                </div>

                {/* Permissions Matrix Column */}
                <div className="md:col-span-2 space-y-6">
                    <div className="flex items-center gap-2 mb-3">
                        <label className="block text-sm font-medium text-gray-700">Permissions</label>
                        {/* Legend/Help - Hide in readOnly? Maybe keep for context */}
                        <div className="group relative">
                            <Info className="w-4 h-4 text-gray-400 hover:text-primary cursor-help" />
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute left-6 top-0 w-64 bg-foreground text-background text-xs p-2.5 rounded shadow-lg pointer-events-none z-50">
                                <p className="font-semibold mb-1">Granular Control</p>
                                <p>Select specific actions for each module. Selecting an action (Create/Edit/etc) automatically grants View access.</p>
                            </div>
                        </div>
                    </div>

                    <PermissionMatrix
                        selectedPermissions={selectedPermissions}
                        onToggle={setSelectedPermissions}
                        readOnly={readOnly}
                    />
                </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                    type="button"
                    onClick={() => router.back()}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-background"
                >
                    {readOnly ? 'Back' : 'Cancel'}
                </button>
                {!readOnly && (
                    <button
                        type="submit"
                        disabled={isPending}
                        className="flex items-center gap-2 px-6 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-primary/20"
                    >
                        {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                        {isEditing ? 'Update Role Template' : 'Create Role Template'}
                    </button>
                )}
            </div>
        </form>
    );
}

