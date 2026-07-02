"use client";

import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { Users } from 'lucide-react';

export interface MentionItem {
    id: string;
    name: string;
}

export interface MentionListHandle {
    onKeyDown: (props: { event: KeyboardEvent }) => boolean;
}

interface MentionListProps {
    items: MentionItem[];
    command: (item: { id: string; label: string }) => void;
}

// Keyboard-navigable @mention dropdown, mounted by Tiptap's Suggestion plugin
// via ReactRenderer. Exposes onKeyDown through a ref so the plugin can forward
// ArrowUp/ArrowDown/Enter without the dropdown needing DOM focus itself.
const MentionList = forwardRef<MentionListHandle, MentionListProps>(({ items, command }, ref) => {
    const [selected, setSelected] = useState(0);

    useEffect(() => setSelected(0), [items]);

    const select = (index: number) => {
        const item = items[index];
        if (item) command({ id: item.id, label: item.name });
    };

    useImperativeHandle(ref, () => ({
        onKeyDown: ({ event }) => {
            if (event.key === 'ArrowUp') {
                setSelected(i => (i + items.length - 1) % items.length);
                return true;
            }
            if (event.key === 'ArrowDown') {
                setSelected(i => (i + 1) % items.length);
                return true;
            }
            if (event.key === 'Enter') {
                select(selected);
                return true;
            }
            return false;
        },
    }), [items, selected]);

    if (items.length === 0) {
        return (
            <div className="bg-popover border border-border rounded-xl shadow-xl p-2 text-xs text-muted-foreground w-48">
                No matching members
            </div>
        );
    }

    return (
        <div className="bg-popover border border-border rounded-xl shadow-xl p-1 w-48 max-h-56 overflow-y-auto">
            {items.map((item, i) => (
                <button key={item.id} type="button" onClick={() => select(i)}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-xs font-medium transition-colors ${
                        i === selected ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-muted'
                    }`}>
                    <span className="w-5 h-5 rounded-full bg-primary/15 text-primary flex items-center justify-center text-[9px] font-bold shrink-0">
                        {item.name.substring(0, 2).toUpperCase()}
                    </span>
                    <span className="truncate">{item.name}</span>
                </button>
            ))}
        </div>
    );
});

MentionList.displayName = 'MentionList';

export default MentionList;
