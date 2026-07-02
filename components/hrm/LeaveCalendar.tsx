"use client";

import { useState } from 'react';
import { motion } from 'framer-motion';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isToday } from 'date-fns';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CardWrapper } from '@/components/ui/page-wrapper';

interface LeaveEvent {
    id: number;
    date: Date;
    type: 'Sick' | 'Casual' | 'Emergency' | 'Holiday';
    status: 'Approved' | 'Pending';
}

const MOCK_LEAVES: LeaveEvent[] = [
    { id: 1, date: new Date(2026, 0, 8), type: 'Sick', status: 'Pending' }, // Jan 8
    { id: 2, date: new Date(2026, 0, 12), type: 'Casual', status: 'Approved' }, // Jan 12
    { id: 3, date: new Date(2026, 0, 26), type: 'Holiday', status: 'Approved' }, // Republic Day
];

export function LeaveCalendar() {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);

    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

    // Fill start padding
    const startDay = monthStart.getDay();
    const paddingDays = Array.from({ length: startDay }).map((_, i) => i);

    const getLeaveStatus = (date: Date) => {
        return MOCK_LEAVES.find(l => isSameDay(l.date, date));
    };

    const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
    const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));

    return (
        <CardWrapper className="glass-card p-6 h-full flex flex-col">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-lg font-bold text-gray-900">My Leave Calendar</h3>
                    <p className="text-sm text-gray-500">Plan and track your time off</p>
                </div>
                <div className="flex items-center gap-2 bg-background rounded-lg p-1 border border-gray-200">
                    <button onClick={handlePrevMonth} aria-label="Previous Month" className="p-1 hover:bg-white hover:shadow-sm rounded transition-all text-gray-500">
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <span className="text-sm font-bold text-gray-900 min-w-[100px] text-center">
                        {format(currentDate, 'MMMM yyyy')}
                    </span>
                    <button onClick={handleNextMonth} aria-label="Next Month" className="p-1 hover:bg-white hover:shadow-sm rounded transition-all text-gray-500">
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
            </div>

            <div className="flex-1">
                {/* Weekday Headers */}
                <div className="grid grid-cols-7 mb-2">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                        <div key={d} className="text-center text-xs font-semibold text-gray-400 uppercase tracking-wider py-2">
                            {d}
                        </div>
                    ))}
                </div>

                {/* Days Grid */}
                <div className="grid grid-cols-7 gap-2">
                    {/* Padding */}
                    {paddingDays.map(p => (
                        <div key={`pad-${p}`} className="aspect-square" />
                    ))}

                    {daysInMonth.map(day => {
                        const leave = getLeaveStatus(day);
                        const isSelected = selectedDate && isSameDay(day, selectedDate);
                        const isCurrentDay = isToday(day);

                        return (
                            <motion.button
                                key={day.toISOString()}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setSelectedDate(day)}
                                className={cn(
                                    "aspect-square rounded-xl border flex flex-col items-center justify-center relative transition-all group",
                                    isSelected
                                        ? "ring-2 ring-primary border-primary bg-primary/5"
                                        : "border-transparent hover:bg-background hover:border-gray-100",
                                    leave?.type === 'Holiday' && "bg-amber-50 border-amber-100",
                                    isCurrentDay && "bg-white/50"
                                )}
                            >
                                <span className={cn(
                                    "text-sm font-medium",
                                    isCurrentDay ? "text-blue-600 font-bold" : "text-gray-700",
                                    leave?.type === 'Holiday' && "text-amber-700"
                                )}>
                                    {format(day, 'd')}
                                </span>

                                {/* Status Dot / Label */}
                                {leave && (
                                    <div className="mt-1 flex flex-col items-center">
                                        <div className={cn(
                                            "w-1.5 h-1.5 rounded-full mb-1",
                                            leave.type === 'Sick' ? "bg-red-500" :
                                                leave.type === 'Casual' ? "bg-blue-500" :
                                                    leave.type === 'Holiday' ? "bg-amber-500" : "bg-white"
                                        )} />
                                        <span className="text-[9px] font-medium text-gray-500 hidden md:block">
                                            {leave.type}
                                        </span>
                                    </div>
                                )}

                                {/* Add Icon on Hover (if no leave) */}
                                {!leave && (
                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Plus className="w-4 h-4 text-primary bg-primary/10 rounded-full p-0.5" />
                                    </div>
                                )}
                            </motion.button>
                        );
                    })}
                </div>
            </div>

            {/* Application Summary / Context */}
            <div className="mt-6 border-t border-gray-100 pt-4 flex justify-between items-center text-sm">
                <div className="flex gap-4">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-blue-500"></div> <span className="text-gray-600">Casual (12)</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-red-500"></div> <span className="text-gray-600">Sick (5)</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-amber-500"></div> <span className="text-gray-600">Holidays</span>
                    </div>
                </div>
                {selectedDate && (
                    <button className="text-xs font-bold text-primary hover:underline">
                        Apply for {format(selectedDate, 'MMM d')}
                    </button>
                )}
            </div>
        </CardWrapper>
    );
}

