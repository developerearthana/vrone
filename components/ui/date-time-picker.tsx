"use client";

import { useState } from 'react';
import {
    format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
    eachDayOfInterval, addMonths, subMonths, isSameMonth, isSameDay, isToday, parseISO,
} from 'date-fns';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';
import { quickDates, timeOptions } from '@/lib/datetime-quick';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

// value: 'yyyy-MM-dd'
export function DateQuickPick({ value, onChange }: { value: string; onChange: (v: string) => void }) {
    const [month, setMonth] = useState(() => (value ? parseISO(value) : new Date()));
    const days = eachDayOfInterval({
        start: startOfWeek(startOfMonth(month), { weekStartsOn: 1 }),
        end: endOfWeek(endOfMonth(month), { weekStartsOn: 1 }),
    });
    const qd = quickDates();
    const isCustomDate = value && !qd.some(q => q.value === value);
    return (
        <div className="flex items-center gap-1.5 flex-wrap">
            {qd.map(q => (
                <button key={q.label} type="button" onClick={() => onChange(q.value)}
                    className={cn("px-2.5 py-1 rounded-full border text-[11px] font-semibold transition-colors",
                        value === q.value ? 'bg-primary text-white border-primary' : 'border-border text-muted-foreground hover:text-foreground')}>
                    {q.label}
                </button>
            ))}
            <Popover>
                <PopoverTrigger asChild>
                    <button type="button" className={cn(
                        "px-2.5 py-1 rounded-full border text-[11px] font-semibold flex items-center gap-1 transition-colors",
                        isCustomDate ? 'bg-primary text-white border-primary' : 'border-border text-muted-foreground hover:text-foreground')}>
                        <CalendarDays className="w-3 h-3" />
                        {isCustomDate ? format(parseISO(value), 'd MMM yyyy') : 'Pick...'}
                    </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-3" align="start">
                    <div className="flex items-center justify-between mb-2">
                        <button type="button" onClick={() => setMonth(subMonths(month, 1))} className="p-1 rounded hover:bg-muted"><ChevronLeft className="w-4 h-4" /></button>
                        <span className="text-sm font-bold">{format(month, 'MMMM yyyy')}</span>
                        <button type="button" onClick={() => setMonth(addMonths(month, 1))} className="p-1 rounded hover:bg-muted"><ChevronRight className="w-4 h-4" /></button>
                    </div>
                    <div className="grid grid-cols-7 gap-0.5">
                        {['M','T','W','T','F','S','S'].map((d, i) => <div key={i} className="text-center text-[9px] font-bold text-muted-foreground py-1">{d}</div>)}
                        {days.map(day => {
                            const iso = format(day, 'yyyy-MM-dd');
                            return (
                                <button key={iso} type="button" onClick={() => onChange(iso)}
                                    className={cn("h-7 w-7 text-[11px] rounded-full font-medium transition-colors",
                                        !isSameMonth(day, month) ? 'text-muted-foreground/30' :
                                        day.getDay() === 0 ? 'text-rose-500' : 'text-foreground',
                                        value && isSameDay(day, parseISO(value)) ? 'bg-primary text-white font-bold' :
                                        isToday(day) ? 'ring-1 ring-primary' : 'hover:bg-muted')}>
                                    {format(day, 'd')}
                                </button>
                            );
                        })}
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    );
}

// value: 'HH:mm'
export function TimeSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
    return (
        <select value={value} onChange={e => onChange(e.target.value)}
            className="px-2 py-1.5 border border-border rounded-lg text-sm bg-background focus:ring-2 focus:ring-primary/20 outline-none">
            {timeOptions().map(t => <option key={t} value={t}>{t}</option>)}
        </select>
    );
}
