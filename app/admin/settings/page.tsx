"use client";

import { Save, Bell, Lock, Database, Globe } from 'lucide-react';
import { useState, useEffect } from 'react';
import { getGlobalSettings, updateGlobalSettings } from '@/app/actions/admin';
import { toast } from 'sonner';

export default function AdminSettingsPage() {
    const [settings, setSettings] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadSettings = async () => {
            const res = await getGlobalSettings();
            if (res.success && res.data) {
                setSettings(res.data);
            }
            setLoading(false);
        };
        loadSettings();
    }, []);

    const handleSave = async () => {
        const toastId = toast.loading("Saving settings...");
        try {
            const res = await updateGlobalSettings(settings);
            if (res.success) {
                toast.success("Configuration saved", { id: toastId });
            } else {
                toast.error("Failed to save settings", { id: toastId });
            }
        } catch (error) {
            toast.error("An error occurred", { id: toastId });
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Loading Settings...</div>;
    if (!settings) return <div className="p-8 text-center text-red-500">Failed to load settings</div>;

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Global Settings</h1>
                <p className="text-gray-500">Configure system-wide parameters and preferences.</p>
            </div>

            <div className="glass-card p-6 rounded-xl space-y-8">
                {/* General Settings */}
                <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <Globe className="w-5 h-5 text-gray-500" />
                        General
                    </h3>
                    <div className="grid md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">System Name</label>
                            <input
                                type="text"
                                aria-label="System Name"
                                value={settings.systemName || ''}
                                onChange={(e) => setSettings({ ...settings, systemName: e.target.value })}
                                className="w-full p-2.5 bg-background border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Time Zone</label>
                            <select
                                aria-label="Time Zone"
                                value={settings.timeZone || 'UTC'}
                                onChange={(e) => setSettings({ ...settings, timeZone: e.target.value })}
                                className="w-full p-2.5 bg-background border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                            >
                                <option>IST (UTC+05:30)</option>
                                <option>UTC (UTC+00:00)</option>
                                <option>EST (UTC-05:00)</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="border-t border-gray-100"></div>

                {/* Security Settings */}
                <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <Lock className="w-5 h-5 text-gray-500" />
                        Security & Access
                    </h3>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-3 bg-background rounded-lg">
                            <div>
                                <h4 className="text-sm font-medium text-gray-900">Two-Factor Authentication</h4>
                                <p className="text-xs text-gray-500">Enforce 2FA for all admin accounts.</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    aria-label="Toggle Two-Factor Authentication"
                                    className="sr-only peer"
                                    checked={settings.security?.twoFactorAuth}
                                    onChange={(e) => setSettings({ ...settings, security: { ...settings.security, twoFactorAuth: e.target.checked } })}
                                />
                                <div className="w-11 h-6 bg-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-background rounded-lg">
                            <div>
                                <h4 className="text-sm font-medium text-gray-900">IP Restriction</h4>
                                <p className="text-xs text-gray-500">Check IP whitelist on login.</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    aria-label="Toggle IP Restriction"
                                    className="sr-only peer"
                                    checked={settings.security?.ipRestriction}
                                    onChange={(e) => setSettings({ ...settings, security: { ...settings.security, ipRestriction: e.target.checked } })}
                                />
                                <div className="w-11 h-6 bg-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                        </div>
                    </div>
                </div>

                <div className="border-t border-gray-100"></div>

                {/* Data & Backup */}
                <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <Database className="w-5 h-5 text-gray-500" />
                        Data & Backup
                    </h3>
                    <div className="grid md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Automated Backup Frequency</label>
                            <select
                                aria-label="Backup Frequency"
                                value={settings.backup?.frequency}
                                onChange={(e) => setSettings({ ...settings, backup: { ...settings.backup, frequency: e.target.value } })}
                                className="w-full p-2.5 bg-background border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                            >
                                <option>Daily (Midnight)</option>
                                <option>Weekly</option>
                                <option>Real-time (High I/O)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Data Retention Policy</label>
                            <select
                                aria-label="Retention Policy"
                                value={settings.backup?.retention}
                                onChange={(e) => setSettings({ ...settings, backup: { ...settings.backup, retention: e.target.value } })}
                                className="w-full p-2.5 bg-background border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                            >
                                <option>1 Year</option>
                                <option>3 Years</option>
                                <option>5 Years (Compliance)</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="pt-6 flex justify-end">
                    <button
                        onClick={handleSave}
                        className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2.5 rounded-lg hover:brightness-[1.08] transition-colors font-medium shadow-sm"
                    >
                        <Save className="w-4 h-4" />
                        Save Configuration
                    </button>
                </div>
            </div>
        </div>
    );
}
