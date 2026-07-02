"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createEvent, updateEvent, deleteEvent } from "@/app/actions/activity/calendar";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { Bell, Monitor, LogIn } from "lucide-react";

interface EventModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedDate?: Date;
    event?: any;
    onRefresh: () => void;
    session: any;
}

export default function EventModal({ isOpen, onClose, selectedDate, event, onRefresh, session }: EventModalProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        start: "",
        end: "",
        type: "Meeting",
        recurrence: {
            frequency: "None",
            interval: 1,
            endDate: ""
        },
        alert: false,
        alertType: "Dashboard", // Default
        color: "bg-blue-500"
    });

    useEffect(() => {
        if (event) {
            setFormData({
                title: event.title,
                description: event.description || "",
                start: new Date(event.start).toISOString().slice(0, 16),
                end: event.end ? new Date(event.end).toISOString().slice(0, 16) : "",
                type: event.type || "Meeting",
                recurrence: {
                    frequency: event.recurrence?.frequency || "None",
                    interval: event.recurrence?.interval || 1,
                    endDate: event.recurrence?.endDate ? new Date(event.recurrence.endDate).toISOString().slice(0, 10) : ""
                },
                alert: event.alert || false,
                alertType: event.alertType === 'None' ? 'Dashboard' : (event.alertType || "Dashboard"),
                color: event.color || "bg-blue-500"
            });
        } else if (selectedDate) {
            const start = new Date(selectedDate);
            start.setHours(9, 0, 0, 0);
            const end = new Date(start);
            end.setHours(10, 0, 0, 0);

            const toLocalISO = (d: Date) => {
                const pad = (n: number) => n < 10 ? '0' + n : n;
                return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
            };

            setFormData({
                title: "",
                description: "",
                start: toLocalISO(start),
                end: toLocalISO(end),
                type: "Meeting",
                recurrence: { frequency: "None", interval: 1, endDate: "" },
                alert: false,
                alertType: "Dashboard",
                color: "bg-blue-500"
            });
        }
    }, [event, selectedDate, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const data = {
                ...formData,
                start: new Date(formData.start),
                end: formData.end ? new Date(formData.end) : undefined,
                recurrence: {
                    ...formData.recurrence,
                    endDate: formData.recurrence.endDate ? new Date(formData.recurrence.endDate) : undefined
                }
            };

            if (event) {
                const realId = event.id.includes('-') && event._id ? event._id : event.id;
                const res = await updateEvent(realId, data as any);
                if (!res.success) throw new Error(res.error);
                toast.success('Event updated');
            } else {
                const res = await createEvent(data as any);
                if (!res.success) throw new Error(res.error);
                toast.success('Event created');
            }
            onRefresh();
            onClose();
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!event) return;
        if (!confirm('Are you sure you want to delete this event?')) return;

        setIsLoading(true);
        try {
            const realId = event._id || (event.id.includes('-') ? event.id.split('-')[0] : event.id);
            const res = await deleteEvent(realId);
            if (!res.success) throw new Error(res.error);
            toast.success('Event deleted');
            onRefresh();
            onClose();
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="w-[95vw] max-w-[600px] glass-card border-none text-foreground p-6 rounded-2xl overflow-y-auto max-h-[90vh]">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold">{event ? 'Edit Event' : 'New Event'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-6 pt-4">
                    <div className="grid gap-2">
                        <Label className="text-sm font-semibold text-gray-700">Event Title</Label>
                        <Input
                            required
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            placeholder="e.g. Weekly Team Sync"
                            className="bg-white"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label className="text-sm font-semibold text-gray-700">Start Time</Label>
                            <Input
                                type="datetime-local"
                                required
                                value={formData.start}
                                onChange={(e) => setFormData({ ...formData, start: e.target.value })}
                                className="bg-white"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label className="text-sm font-semibold text-gray-700">End Time</Label>
                            <Input
                                type="datetime-local"
                                value={formData.end}
                                onChange={(e) => setFormData({ ...formData, end: e.target.value })}
                                className="bg-white"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label className="text-sm font-semibold text-gray-700">Event Type</Label>
                            <Select
                                value={formData.type}
                                onValueChange={(v) => setFormData({ ...formData, type: v })}
                            >
                                <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Meeting">Meeting (Blue)</SelectItem>
                                    <SelectItem value="Task">Task (Green)</SelectItem>
                                    <SelectItem value="Reminder">Reminder (Amber)</SelectItem>
                                    {['admin', 'super-admin'].includes(session?.user?.role || '') && (
                                        <SelectItem value="Holiday">Holiday (Purple)</SelectItem>
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label className="text-sm font-semibold text-gray-700">Repeat</Label>
                            <Select
                                value={formData.recurrence.frequency}
                                onValueChange={(v) => setFormData({ ...formData, recurrence: { ...formData.recurrence, frequency: v } })}
                            >
                                <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="None">Never</SelectItem>
                                    <SelectItem value="Daily">Daily</SelectItem>
                                    <SelectItem value="Weekly">Weekly</SelectItem>
                                    <SelectItem value="Monthly">Monthly</SelectItem>
                                    <SelectItem value="Quarterly">Quarterly</SelectItem>
                                    <SelectItem value="Yearly">Yearly</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Alert Settings */}
                    <div className="bg-background/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700 space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className={cn("p-2 rounded-lg transition-colors", formData.alert ? "bg-primary/10 text-primary" : "bg-white text-gray-400")}>
                                    <Bell className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="font-medium text-gray-900">Notifications</p>
                                    <p className="text-xs text-gray-500">Enable alerts for this event</p>
                                </div>
                            </div>
                            <Switch
                                checked={formData.alert}
                                onCheckedChange={(c) => setFormData({ ...formData, alert: c })}
                            />
                        </div>

                        {formData.alert && (
                            <div className="flex p-1 bg-white rounded-lg border border-gray-200">
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, alertType: 'Login' })}
                                    className={cn(
                                        "flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all",
                                        formData.alertType === 'Login' ? "bg-primary/10 text-primary" : "text-gray-500 hover:text-gray-900"
                                    )}
                                >
                                    <LogIn className="w-4 h-4" /> Login Popup
                                </button>
                                <div className="w-px bg-white my-1"></div>
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, alertType: 'Dashboard' })}
                                    className={cn(
                                        "flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all",
                                        formData.alertType === 'Dashboard' ? "bg-primary/10 text-primary" : "text-gray-500 hover:text-gray-900"
                                    )}
                                >
                                    <Monitor className="w-4 h-4" /> Dashboard
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="grid gap-2">
                        <Label className="text-sm font-semibold text-gray-700">Description</Label>
                        <Textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="h-24 bg-white"
                            placeholder="Add details, links, or notes..."
                        />
                    </div>

                    <DialogFooter className="flex justify-between sm:justify-between pt-2">
                        {event ? (
                            <Button type="button" variant="destructive" onClick={handleDelete} disabled={isLoading}>
                                Delete
                            </Button>
                        ) : <div></div>}
                        <div className="flex gap-2">
                            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isLoading} className="bg-primary text-primary-foreground min-w-[100px]">
                                {isLoading ? 'Saving...' : 'Save'}
                            </Button>
                        </div>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

