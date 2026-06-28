"use client";

import { useState, useEffect } from 'react';
import { Shield, Lock, MapPin, CheckCircle, XCircle, AlertTriangle, Search, Globe, LogIn, Clock, Loader2 } from 'lucide-react';
import { getSecurityData, toggleAdminIpRestriction, releaseAdminIp, updateRequestStatus } from '@/app/actions/admin';
import { toast } from 'sonner';

export default function SecurityDashboard() {
    const [loading, setLoading] = useState(true);
    const [admins, setAdmins] = useState<any[]>([]);
    const [requests, setRequests] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState("users");
    const [selectedAdminForRelease, setSelectedAdminForRelease] = useState<string | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const res = await getSecurityData();
            if (res.success && res.data) {
                setAdmins(res.data.admins);
                setRequests(res.data.requests);
            } else {
                toast.error("Failed to load security data");
            }
        } catch (error) {
            toast.error("Error loading security data");
        } finally {
            setLoading(false);
        }
    };

    const handleToggleRestriction = async (id: string, name: string) => {
        // Optimistic update
        const originalAdmins = [...admins];
        setAdmins(admins.map(a => a.id === id ? { ...a, ipRestriction: !a.ipRestriction } : a));

        try {
            const res = await toggleAdminIpRestriction(id);
            if (res.success) {
                toast.success(`IP restriction ${!admins.find(a => a.id === id)?.ipRestriction ? 'enabled' : 'disabled'} for ${name}`);
            } else {
                throw new Error(res.error);
            }
        } catch (error) {
            setAdmins(originalAdmins);
            toast.error("Failed to update restriction");
        }
    };

    const handleApproveRequest = async (reqId: string) => {
        try {
            const res = await updateRequestStatus(reqId, 'Approved');
            if (res.success) {
                toast.success("Access request approved");
                setRequests(requests.filter(r => r.id !== reqId));
                // Reload admins to see the allowed IP update
                loadData();
            } else {
                toast.error("Failed to approve request");
            }
        } catch (error) {
            toast.error("Error approving request");
        }
    };

    const handleRejectRequest = async (reqId: string) => {
        try {
            const res = await updateRequestStatus(reqId, 'Rejected');
            if (res.success) {
                toast.success("Access request rejected");
                setRequests(requests.filter(r => r.id !== reqId));
            } else {
                toast.error("Failed to reject request");
            }
        } catch (error) {
            toast.error("Error rejecting request");
        }
    };

    const applyTemporaryRelease = async (hours: number) => {
        if (!selectedAdminForRelease) return;

        try {
            const res = await releaseAdminIp(selectedAdminForRelease, hours);
            if (res.success) {
                toast.success(`Restriction lifted for ${hours} hours`);
                loadData(); // Reload to update status
            } else {
                toast.error("Failed to release restriction");
            }
        } catch (error) {
            toast.error("Error releasing restriction");
        } finally {
            setSelectedAdminForRelease(null);
        }
    };

    if (loading) {
        return (
            <div className="flex h-96 items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Shield className="w-6 h-6 text-blue-600" />
                        Security & Access Control
                    </h1>
                    <p className="text-gray-500">Manage IP restrictions and approve temporary access requests.</p>
                </div>
                <div className="flex bg-white p-1 rounded-lg">
                    <button
                        onClick={() => setActiveTab("users")}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === "users" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-900"}`}
                    >
                        Admin Users
                    </button>
                    <button
                        onClick={() => setActiveTab("requests")}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${activeTab === "requests" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-900"}`}
                    >
                        Access Requests
                        {requests.length > 0 && <span className="bg-red-500 text-white text-[10px] px-1.5 rounded-full">{requests.length}</span>}
                    </button>
                </div>
            </div>

            {activeTab === "users" && (
                <div className="glass-card rounded-xl overflow-hidden">
                    <div className="p-4 border-b border-gray-100 bg-background/50 flex items-center gap-4">
                        <div className="relative flex-1 max-w-md">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input type="text" placeholder="Search admins..." className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm min-w-[520px]">
                        <thead className="bg-background text-gray-500">
                            <tr>
                                <th className="p-4 font-medium">Admin User</th>
                                <th className="p-4 font-medium">Role</th>
                                <th className="p-4 font-medium">IP Restriction</th>
                                <th className="p-4 font-medium">Allowed Static IP</th>
                                <th className="p-4 font-medium text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {admins.map((admin) => (
                                <tr key={admin.id} className="hover:bg-background/30">
                                    <td className="p-4">
                                        <div>
                                            <p className="font-semibold text-gray-900">{admin.name}</p>
                                            <p className="text-xs text-gray-500">{admin.email}</p>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${admin.role === 'super-admin' ? 'bg-white text-purple-700' : 'bg-white text-gray-700'}`}>
                                            {admin.role}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <button
                                            onClick={() => handleToggleRestriction(admin.id, admin.name)}
                                            aria-label={`Toggle IP Restriction for ${admin.name}`}
                                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${admin.ipRestriction ? 'bg-blue-600' : 'bg-white'}`}
                                        >
                                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${admin.ipRestriction ? 'translate-x-6' : 'translate-x-1'}`} />
                                        </button>
                                        <span className="ml-2 text-xs text-gray-500">{admin.ipRestriction ? 'Enabled' : 'Disabled'}</span>
                                    </td>
                                    <td className="p-4">
                                        {admin.ipRestriction ? (
                                            <div className="flex items-center gap-2 text-gray-700 font-mono bg-background px-2 py-1 rounded border border-gray-200 w-fit">
                                                <Globe className="w-3 h-3 text-gray-400" />
                                                {admin.allowedIp || 'Not Set'}
                                            </div>
                                        ) : (
                                            <span className="text-gray-400 italic">Any IP Allowed</span>
                                        )}
                                    </td>
                                    <td className="p-4 text-right flex items-center justify-end gap-2">
                                        <button
                                            onClick={() => setSelectedAdminForRelease(admin.id)}
                                            className="text-blue-600 hover:text-blue-700 font-medium text-xs flex items-center gap-1 bg-white px-2 py-1 rounded"
                                            title="Temporarily lift restrictions"
                                        >
                                            <LogIn className="w-3 h-3" /> Release IP
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    </div>
                </div>
            )}

            {activeTab === "requests" && (
                <div className="grid gap-4">
                    {requests.map((req) => (
                        <div key={req.id} className="glass-card p-6 rounded-xl border border-orange-200/70 bg-orange-50/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-white text-orange-600 rounded-full">
                                    <AlertTriangle className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                        Login Blocked: {req.user}
                                        <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs rounded-full font-normal">Pending Approval</span>
                                    </h3>
                                    <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-gray-600">
                                        <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {req.location}</span>
                                        <span className="flex items-center gap-1 font-mono bg-white px-2 rounded"><Globe className="w-3 h-3" /> {req.ip}</span>
                                        <span>{req.time}</span>
                                    </div>
                                    <p className="text-sm text-gray-500 mt-2">
                                        User {req.email} is requesting temporary access from this location.
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => handleRejectRequest(req.id)}
                                    className="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-background font-medium text-sm flex items-center gap-2"
                                >
                                    <XCircle className="w-4 h-4" />
                                    Reject
                                </button>
                                <button
                                    onClick={() => handleApproveRequest(req.id)}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm flex items-center gap-2 shadow-sm"
                                >
                                    <CheckCircle className="w-4 h-4" />
                                    Approve Access
                                </button>
                            </div>
                        </div>
                    ))}

                    {requests.length === 0 && (
                        <div className="text-center p-12 bg-white rounded-xl border border-dashed border-gray-300">
                            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                            <h3 className="text-lg font-medium text-gray-900">All Clear</h3>
                            <p className="text-gray-500">No pending access requests.</p>
                        </div>
                    )}
                </div>
            )}

            {/* Temporary Release Modal Component */}
            {selectedAdminForRelease && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl">
                        <h3 className="text-lg font-bold mb-4">Release IP Restriction</h3>
                        <p className="text-sm text-gray-600 mb-4">
                            Temporarily allow <strong>{admins.find(a => a.id === selectedAdminForRelease)?.name}</strong> to login from ANY location.
                        </p>
                        <div className="space-y-3 mb-6">
                            <button onClick={() => applyTemporaryRelease(1)} className="w-full text-left px-4 py-3 rounded-lg border hover:bg-white hover:border-blue-200 transition-colors flex justify-between items-center group">
                                <span className="text-sm font-medium text-gray-700 group-hover:text-blue-700">1 Hour</span>
                                <Clock className="w-4 h-4 text-gray-400 group-hover:text-blue-500" />
                            </button>
                            <button onClick={() => applyTemporaryRelease(24)} className="w-full text-left px-4 py-3 rounded-lg border hover:bg-white hover:border-blue-200 transition-colors flex justify-between items-center group">
                                <span className="text-sm font-medium text-gray-700 group-hover:text-blue-700">Test (24 Hours)</span>
                                <Clock className="w-4 h-4 text-gray-400 group-hover:text-blue-500" />
                            </button>
                        </div>
                        <button onClick={() => setSelectedAdminForRelease(null)} className="w-full py-2 text-sm text-gray-500 hover:text-gray-900">Cancel</button>
                    </div>
                </div>
            )}
        </div>
    );
}
