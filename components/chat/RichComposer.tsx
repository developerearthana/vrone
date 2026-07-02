"use client";

import { useEditor, EditorContent, ReactRenderer } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import Placeholder from '@tiptap/extension-placeholder';
import Mention from '@tiptap/extension-mention';
import { useState } from 'react';
import { Bold, Italic, Underline as UnderlineIcon, Strikethrough, Code, Baseline, Highlighter, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import MentionList, { MentionListHandle, MentionItem } from './MentionList';

const TEXT_SWATCHES = ['#111827', '#dc2626', '#ea580c', '#ca8a04', '#16a34a', '#0891b2', '#2563eb', '#7c3aed', '#db2777'];
const HIGHLIGHT_SWATCHES = ['#fef08a', '#bbf7d0', '#bfdbfe', '#fbcfe8', '#fed7aa', '#e9d5ff', '#fecaca', '#d9f99d'];

interface RichComposerProps {
    onSend: (html: string, mentions: string[]) => void;
    members?: MentionItem[];
    placeholder?: string;
    disabled?: boolean;
}

export default function RichComposer({ onSend, members = [], placeholder = 'Type a message…', disabled }: RichComposerProps) {
    const [swatchMenu, setSwatchMenu] = useState<'text' | 'highlight' | null>(null);

    const editor = useEditor({
        immediatelyRender: false,
        extensions: [
            StarterKit.configure({ heading: false, blockquote: false, bulletList: false, orderedList: false, horizontalRule: false }),
            Underline,
            TextStyle,
            Color,
            Highlight.configure({ multicolor: true }),
            Placeholder.configure({ placeholder }),
            Mention.configure({
                HTMLAttributes: { class: 'mention' },
                suggestion: {
                    items: ({ query }) =>
                        members.filter(m => m.name.toLowerCase().includes(query.toLowerCase())).slice(0, 6),
                    render: () => {
                        let component: ReactRenderer<MentionListHandle, any> | null = null;
                        let unmount: (() => void) | null = null;

                        return {
                            onStart: (props) => {
                                component = new ReactRenderer(MentionList, {
                                    props: { items: props.items, command: props.command },
                                    editor: props.editor,
                                });
                                if (!props.clientRect) return;
                                unmount = props.mount(component.element as HTMLElement);
                            },
                            onUpdate: (props) => {
                                component?.updateProps({ items: props.items, command: props.command });
                            },
                            onKeyDown: (props) => {
                                if (props.event.key === 'Escape') {
                                    unmount?.();
                                    return true;
                                }
                                return component?.ref?.onKeyDown(props) ?? false;
                            },
                            onExit: () => {
                                unmount?.();
                                component?.destroy();
                            },
                        };
                    },
                },
            }),
        ],
        editorProps: {
            attributes: { class: 'chat-composer-editor outline-none min-h-[38px] max-h-32 overflow-y-auto px-3 py-2 text-sm' },
            handleKeyDown: (_view, event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    submit();
                    return true;
                }
                return false;
            },
        },
    });

    function submit() {
        if (!editor || editor.isEmpty) return;
        const html = editor.getHTML();
        const mentions: string[] = [];
        editor.state.doc.descendants(node => {
            if (node.type.name === 'mention' && node.attrs.id) mentions.push(node.attrs.id);
        });
        onSend(html, [...new Set(mentions)]);
        editor.commands.clearContent();
    }

    if (!editor) return null;

    return (
        <div className="border border-border rounded-xl bg-card overflow-hidden">
            <div className="flex items-center gap-0.5 px-1.5 pt-1.5 flex-wrap relative">
                <ToolbarButton title="Bold" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}>
                    <Bold className="w-3.5 h-3.5" />
                </ToolbarButton>
                <ToolbarButton title="Italic" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}>
                    <Italic className="w-3.5 h-3.5" />
                </ToolbarButton>
                <ToolbarButton title="Underline" active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()}>
                    <UnderlineIcon className="w-3.5 h-3.5" />
                </ToolbarButton>
                <ToolbarButton title="Strikethrough" active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()}>
                    <Strikethrough className="w-3.5 h-3.5" />
                </ToolbarButton>
                <ToolbarButton title="Code" active={editor.isActive('code')} onClick={() => editor.chain().focus().toggleCode().run()}>
                    <Code className="w-3.5 h-3.5" />
                </ToolbarButton>

                <ToolbarButton title="Text colour" active={swatchMenu === 'text'} onClick={() => setSwatchMenu(m => m === 'text' ? null : 'text')}>
                    <Baseline className="w-3.5 h-3.5" />
                </ToolbarButton>
                <ToolbarButton title="Highlight" active={swatchMenu === 'highlight'} onClick={() => setSwatchMenu(m => m === 'highlight' ? null : 'highlight')}>
                    <Highlighter className="w-3.5 h-3.5" />
                </ToolbarButton>

                {swatchMenu === 'text' && (
                    <SwatchMenu
                        swatches={TEXT_SWATCHES}
                        label="Text colour"
                        onPick={c => { editor.chain().focus().setColor(c).run(); setSwatchMenu(null); }}
                        onClear={() => { editor.chain().focus().unsetColor().run(); setSwatchMenu(null); }}
                        onClose={() => setSwatchMenu(null)}
                    />
                )}
                {swatchMenu === 'highlight' && (
                    <SwatchMenu
                        swatches={HIGHLIGHT_SWATCHES}
                        label="Highlight"
                        onPick={c => { editor.chain().focus().setHighlight({ color: c }).run(); setSwatchMenu(null); }}
                        onClear={() => { editor.chain().focus().unsetHighlight().run(); setSwatchMenu(null); }}
                        onClose={() => setSwatchMenu(null)}
                    />
                )}
            </div>
            <div className="flex items-end gap-1.5 px-1.5 pb-1.5">
                <div className="flex-1"><EditorContent editor={editor} /></div>
                <button type="button" onClick={submit} disabled={disabled}
                    className="p-2 mb-1 rounded-lg bg-primary text-white hover:brightness-110 disabled:opacity-50 transition-all">
                    <Send className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}

function ToolbarButton({ active, onClick, children, title }: { active?: boolean; onClick: () => void; children: React.ReactNode; title: string }) {
    return (
        <button type="button" title={title} onMouseDown={e => e.preventDefault()} onClick={onClick}
            className={cn("p-1.5 rounded-md transition-colors", active ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted')}>
            {children}
        </button>
    );
}

function SwatchMenu({ swatches, label, onPick, onClear, onClose }: {
    swatches: string[]; label: string; onPick: (c: string) => void; onClear: () => void; onClose: () => void;
}) {
    return (
        <div className="absolute top-9 left-0 z-50 bg-popover border border-border rounded-xl shadow-xl p-2.5 w-[168px]"
            onMouseDown={e => e.preventDefault()}>
            <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1.5">{label}</p>
            <div className="grid grid-cols-5 gap-1.5">
                {swatches.map(c => (
                    <button key={c} type="button" onClick={() => onPick(c)}
                        className="w-6 h-6 rounded-md border border-black/10 hover:scale-110 transition-transform"
                        style={{ backgroundColor: c }} title={c} />
                ))}
                <label className="w-6 h-6 rounded-md border border-dashed border-muted-foreground/40 flex items-center justify-center cursor-pointer hover:bg-muted"
                    title="Custom colour">
                    <span className="text-[9px] font-bold text-muted-foreground">+</span>
                    <input type="color" className="sr-only" onChange={e => onPick(e.target.value)} />
                </label>
            </div>
            <div className="flex gap-2 mt-2">
                <button type="button" onClick={onClear} className="flex-1 text-[10px] text-muted-foreground hover:text-foreground">Clear</button>
                <button type="button" onClick={onClose} className="flex-1 text-[10px] text-muted-foreground hover:text-foreground">Close</button>
            </div>
        </div>
    );
}
