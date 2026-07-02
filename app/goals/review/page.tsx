"use client";

import { Calendar, User, FileText, Plus } from 'lucide-react';
import { getUsers } from '@/app/actions/hrm';
import { getAppraisals, createAppraisal } from '@/app/actions/appraisal';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export default function ReviewMeetings() {
    const [meetings, setMeetings] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [newMeeting, setNewMeeting] = useState({
        employeeId: '',
        reviewerId: '',
        period: 'Q1 FY26-27',
        meetingDate: new Date().toISOString().split('T')[0]
    });

    useEffect(() => {
        loadAppraisals();
        loadUsers();
    }, []);

    const loadUsers = async () => {
        const res = await getUsers();
        if (res.success && res.data) {
            setUsers(res.data);
        }
    };

    const loadAppraisals = async () => {
        try {
            const res = await getAppraisals();
            if (res.success && res.data) {
                setMeetings(res.data);
            }
        } catch (error) {
            toast.error("Failed to load reviews");
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async () => {
        if (!newMeeting.employeeId || !newMeeting.reviewerId) {
            toast.error("Please select Employee and Reviewer");
            return;
        }
        setIsCreating(true);
        try {
            const res = await createAppraisal(newMeeting);
            if (res.success) {
                toast.success("Review meeting scheduled");
                setShowModal(false);
                loadAppraisals();
                setNewMeeting({ ...newMeeting, employeeId: '' }); // Reset partial
            } else {
                toast.error(res.error || "Failed to schedule meeting");
            }
        } catch (error) {
            toast.error("An error occurred");
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold text-gray-900">Review Meetings</h2>
                    <p className="text-gray-500">Log and track quarterly performance reviews.</p>
                </div>
                <Dialog open={showModal} onOpenChange={setShowModal}>
                    <DialogTrigger asChild>
                        <button className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:brightness-[1.08] transition-colors shadow-sm">
                            <Plus className="w-4 h-4" />
                            Log New Meeting
                        </button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Schedule Review Meeting</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Employee</label>
                                <select
                                    aria-label="Select Employee"
                                    className="w-full p-2 border rounded-md"
                                    value={newMeeting.employeeId}
                                    onChange={(e) => setNewMeeting({ ...newMeeting, employeeId: e.target.value })}
                                >
                                    <option value="">Select Employee</option>
                                    {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Reviewer</label>
                                <select
                                    aria-label="Select Reviewer"
                                    className="w-full p-2 border rounded-md"
                                    value={newMeeting.reviewerId}
                                    onChange={(e) => setNewMeeting({ ...newMeeting, reviewerId: e.target.value })}
                                >
                                    <option value="">Select Reviewer</option>
                                    {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Period</label>
                                <select
                                    aria-label="Select Period"
                                    className="w-full p-2 border rounded-md"
                                    value={newMeeting.period}
                                    onChange={(e) => setNewMeeting({ ...newMeeting, period: e.target.value })}
                                >
                                    <option value="Q3 FY25-26">Q3 FY25-26</option>
                                    <option value="Q4 FY25-26">Q4 FY25-26</option>
                                    <option value="Q1 FY26-27">Q1 FY26-27</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Meeting Date</label>
                                <input
                                    aria-label="Meeting Date"
                                    type="date"
                                    className="w-full p-2 border rounded-md"
                                    value={newMeeting.meetingDate}
                                    onChange={(e) => setNewMeeting({ ...newMeeting, meetingDate: e.target.value })}
                                />
                            </div>
                            <Button className="w-full" onClick={handleCreate} disabled={isCreating}>
                                {isCreating ? "Scheduling..." : "Schedule Meeting"}
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid gap-6">
                {meetings.length === 0 && !loading && (
                    <div className="text-center py-10 text-gray-500">No review meetings found.</div>
                )}
                {meetings.map((meeting) => (
                    <div key={meeting.id} className="glass-card p-6 rounded-xl hover:shadow-md transition-shadow">
                        <div className="flex flex-col md:flex-row gap-6">
                            <div className="min-w-[200px] flex flex-col gap-2 border-r border-gray-100 pr-6">
                                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">{meeting.period}</span>
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <Calendar className="w-4 h-4" />
                                    <span>{meeting.meetingDate ? new Date(meeting.meetingDate).toLocaleDateString() : 'Not Scheduled'}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <User className="w-4 h-4" />
                                    <span>{meeting.reviewerId?.name || 'Reviewer'}</span>
                                </div>
                                <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-md w-fit mt-2 ${meeting.status === 'Completed' ? 'bg-white text-green-700' :
                                    meeting.status === 'Signed' ? 'bg-white text-blue-700' :
                                        'bg-yellow-50 text-yellow-700'
                                    }`}>
                                    {meeting.status}
                                </span>
                            </div>
                            <div className="flex-1 space-y-3">
                                <h3 className="font-bold text-lg text-gray-900">{meeting.employeeId?.name}'s Review</h3>
                                <div className="prose prose-sm text-gray-600 max-w-none">
                                    <p>{meeting.feedback || "No feedback recorded yet."}</p>
                                    {meeting.goalsScore > 0 && (
                                        <div className="flex gap-4 mt-2">
                                            <span className='text-xs bg-white text-green-700 px-2 py-1 rounded'>Score: {meeting.finalScore}/100</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
