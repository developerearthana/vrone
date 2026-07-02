# Chat Enhancements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Popup step-flow chat, live WYSIWYG (Tiptap) composer, and reply/reactions/mentions/delete/read-receipt message features.

**Architecture:** `models/Message.ts` gains reply/reactions/mentions/delete/read-receipt fields; `lib/chat-format.ts` owns HTML sanitization + legacy detection; chat server actions enforce sanitization server-side; `components/chat/RichComposer.tsx` (lazy Tiptap) replaces the textarea; `ChatInterface` gains `mode='popup'` step flow consumed by `ChatLauncher`.

**Tech Stack:** Tiptap (`@tiptap/react`, `@tiptap/starter-kit`, extensions), `isomorphic-dompurify` (existing), framer-motion (existing), Mongoose 9, jest.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-02-calendar-chat-enhancements-design.md` Parts 2–3.
- HTML is sanitized **on the server** in send/edit actions; the client renderer sanitizes again before `dangerouslySetInnerHTML` (defense in depth).
- Sanitizer allowlist exactly: tags `b i u s em strong code a br p span`; `span` style only `color`/`background-color`; `a` only http(s) `href` (+ forced `rel="noopener noreferrer" target="_blank"`).
- Legacy messages (not starting with `<`) keep rendering via existing `renderRich`. No data migration.
- `readBy` legacy string entries are upgraded lazily on read — never via a migration script.
- Full page `/activity/chat` keeps its two-pane layout; step flow is popup-only.
- Polling stays at 3s; no websockets.
- Commits: `<type>(<scope>): <description>`, ending with `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.

---

### Task 1: Message schema + sanitization library

**Files:**
- Modify: `models/Message.ts`
- Create: `lib/chat-format.ts`
- Test: `__tests__/chat-format.test.ts`
- Install: `npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-underline @tiptap/extension-text-style @tiptap/extension-color @tiptap/extension-highlight @tiptap/extension-mention @tiptap/extension-placeholder @tiptap/suggestion`

**Interfaces:**
- Produces: `isHtmlContent(content: string): boolean`; `sanitizeChatHtml(html: string): string`; `normalizeReadBy(raw: unknown[]): { user: string; at: Date | null }[]`; `IMessage` with `replyTo?: string; reactions: { emoji: string; users: string[] }[]; mentions: string[]; deletedAt?: Date | null; readBy: { user: string; at?: Date }[] | string[]`.

- [ ] **Step 1: Write the failing test**

```ts
// __tests__/chat-format.test.ts
import { isHtmlContent, sanitizeChatHtml, normalizeReadBy } from '@/lib/chat-format';

describe('chat-format', () => {
    it('detects HTML vs legacy marker content', () => {
        expect(isHtmlContent('<p>hi</p>')).toBe(true);
        expect(isHtmlContent('*bold* legacy')).toBe(false);
        expect(isHtmlContent('  <b>x</b>')).toBe(true);
    });

    it('keeps allowed formatting', () => {
        const html = '<p><b>a</b> <i>b</i> <u>c</u> <s>d</s> <code>e</code> <span style="color: rgb(220, 38, 38);">f</span></p>';
        const out = sanitizeChatHtml(html);
        expect(out).toContain('<b>a</b>');
        expect(out).toContain('color');
    });

    it('strips XSS vectors', () => {
        expect(sanitizeChatHtml('<img src=x onerror=alert(1)>')).not.toContain('img');
        expect(sanitizeChatHtml('<script>alert(1)</script>hi')).toBe('hi');
        expect(sanitizeChatHtml('<a href="javascript:alert(1)">x</a>')).not.toContain('javascript');
        expect(sanitizeChatHtml('<span style="position:fixed">x</span>')).not.toContain('position');
    });

    it('forces safe link attributes', () => {
        const out = sanitizeChatHtml('<a href="https://x.com">x</a>');
        expect(out).toContain('rel="noopener noreferrer"');
        expect(out).toContain('target="_blank"');
    });

    it('normalizeReadBy upgrades legacy strings and keeps objects', () => {
        const out = normalizeReadBy(['u1', { user: 'u2', at: new Date('2026-07-02T10:00:00Z') }]);
        expect(out[0]).toEqual({ user: 'u1', at: null });
        expect(out[1].user).toBe('u2');
        expect(out[1].at).toBeInstanceOf(Date);
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/chat-format.test.ts` → FAIL, module not found.

- [ ] **Step 3: Implement `lib/chat-format.ts`**

```ts
// lib/chat-format.ts
import DOMPurify from 'isomorphic-dompurify';

export function isHtmlContent(content: string): boolean {
    return content.trimStart().startsWith('<');
}

const ALLOWED_TAGS = ['b', 'i', 'u', 's', 'em', 'strong', 'code', 'a', 'br', 'p', 'span'];
const ALLOWED_ATTR = ['href', 'style', 'rel', 'target'];
const ALLOWED_STYLES = /^(color|background-color)\s*:/;

let hooked = false;
function ensureHooks() {
    if (hooked) return;
    hooked = true;
    DOMPurify.addHook('afterSanitizeAttributes', (node) => {
        if (node.tagName === 'A') {
            const href = node.getAttribute('href') || '';
            if (!/^https?:\/\//i.test(href)) node.removeAttribute('href');
            node.setAttribute('rel', 'noopener noreferrer');
            node.setAttribute('target', '_blank');
        }
        const style = node.getAttribute('style');
        if (style) {
            const kept = style.split(';').map(s => s.trim())
                .filter(s => ALLOWED_STYLES.test(s)).join('; ');
            if (kept) node.setAttribute('style', kept);
            else node.removeAttribute('style');
        }
    });
}

export function sanitizeChatHtml(html: string): string {
    ensureHooks();
    return DOMPurify.sanitize(html, { ALLOWED_TAGS, ALLOWED_ATTR });
}

export interface ReadEntry { user: string; at: Date | null }
export function normalizeReadBy(raw: unknown[]): ReadEntry[] {
    return (raw || []).map((r: any) =>
        typeof r === 'string' ? { user: r, at: null } : { user: String(r.user), at: r.at ? new Date(r.at) : null });
}
```

- [ ] **Step 4: Update `models/Message.ts`**

```ts
import mongoose, { Schema, Document } from 'mongoose';

export interface IMessage extends Document {
    conversationId: string;
    sender: string;
    content: string;
    attachments: string[];
    // Mixed for lazy legacy upgrade: strings (old) or { user, at } (new)
    readBy: (string | { user: string; at?: Date })[];
    edited?: boolean;
    editedAt?: Date;
    replyTo?: string | null;
    reactions: { emoji: string; users: string[] }[];
    mentions: string[];
    deletedAt?: Date | null;
}

const MessageSchema: Schema = new Schema(
    {
        conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true },
        sender: { type: String, required: true },
        content: { type: String, required: true },
        attachments: [{ type: String }],
        readBy: [{ type: Schema.Types.Mixed }],
        edited: { type: Boolean, default: false },
        editedAt: { type: Date },
        replyTo: { type: Schema.Types.ObjectId, ref: 'Message', default: null },
        reactions: [{ emoji: { type: String, required: true }, users: [{ type: String }], _id: false }],
        mentions: [{ type: String }],
        deletedAt: { type: Date, default: null },
    },
    { timestamps: true }
);

export default mongoose.models.Message || mongoose.model<IMessage>('Message', MessageSchema);
```

Dev-server note: Mongoose caches models — restart dev server (or rebuild) for schema changes to load.

- [ ] **Step 5: Run tests** → `npx jest __tests__/chat-format.test.ts` → PASS (5 tests).

- [ ] **Step 6: Commit**

```bash
git add models/Message.ts lib/chat-format.ts __tests__/chat-format.test.ts package.json package-lock.json
git commit -m "feat(chat): message schema for reply/reactions/mentions/delete/read-receipts + HTML sanitizer"
```

---

### Task 2: Server actions

**Files:**
- Modify: `app/actions/activity/chat.ts`

**Interfaces:**
- Consumes: `sanitizeChatHtml`, `isHtmlContent`, `normalizeReadBy` (Task 1).
- Produces: `sendMessage(conversationId, content, attachments?, opts?: { replyTo?: string; mentions?: string[] })`; `toggleReaction(messageId: string, emoji: string)`; `deleteMessageForEveryone(messageId: string)`; `markAsRead(conversationId)` now storing `{ user, at }`. All return `{ success: boolean, data?, error? }` matching the file's existing convention (read the file first and mirror its auth/session pattern exactly).

- [ ] **Step 1: Extend `sendMessage`** — read the current implementation, keep its session/auth checks, and change the content handling + payload:

```ts
const clean = isHtmlContent(content) ? sanitizeChatHtml(content) : content;
const msg = await Message.create({
    conversationId, sender: userId, content: clean,
    attachments: attachments || [],
    readBy: [{ user: userId, at: new Date() }],
    replyTo: opts?.replyTo || null,
    mentions: opts?.mentions || [],
});
```

Same sanitization line in `editMessage`.

- [ ] **Step 2: Add `toggleReaction`**

```ts
export async function toggleReaction(messageId: string, emoji: string) {
    try {
        const session = await auth();
        if (!session?.user?.id) return { success: false, error: 'Unauthorized' };
        const userId = session.user.id;
        await connectDB();
        const msg = await Message.findById(messageId);
        if (!msg) return { success: false, error: 'Message not found' };
        const entry = msg.reactions.find((r: any) => r.emoji === emoji);
        if (entry) {
            if (entry.users.includes(userId)) {
                entry.users = entry.users.filter((u: string) => u !== userId);
                if (entry.users.length === 0)
                    msg.reactions = msg.reactions.filter((r: any) => r.emoji !== emoji);
            } else entry.users.push(userId);
        } else msg.reactions.push({ emoji, users: [userId] });
        msg.markModified('reactions');
        await msg.save();
        return { success: true, data: JSON.parse(JSON.stringify(msg.reactions)) };
    } catch (e: any) { return { success: false, error: e.message }; }
}
```

- [ ] **Step 3: Add `deleteMessageForEveryone`**

```ts
export async function deleteMessageForEveryone(messageId: string) {
    try {
        const session = await auth();
        if (!session?.user?.id) return { success: false, error: 'Unauthorized' };
        await connectDB();
        const msg = await Message.findById(messageId);
        if (!msg) return { success: false, error: 'Message not found' };
        if (msg.sender !== session.user.id) return { success: false, error: 'Only the sender can delete' };
        msg.deletedAt = new Date();
        msg.content = '';
        msg.attachments = [];
        await msg.save();
        return { success: true };
    } catch (e: any) { return { success: false, error: e.message }; }
}
```

- [ ] **Step 4: Upgrade `markAsRead`** — find the existing implementation; replace the `$addToSet: { readBy: userId }` (or equivalent) with a lazy-upgrade write:

```ts
const msgs = await Message.find({ conversationId, deletedAt: null });
for (const m of msgs) {
    const entries = normalizeReadBy(m.readBy as any[]);
    if (!entries.some(e => e.user === userId)) {
        m.readBy = [...entries, { user: userId, at: new Date() }] as any;
        m.markModified('readBy');
        await m.save();
    } else if ((m.readBy as any[]).some(r => typeof r === 'string')) {
        m.readBy = entries as any; // lazy upgrade legacy strings
        m.markModified('readBy');
        await m.save();
    }
}
```

(Keep the conversation-level `unreadCounts` reset the function already does.)

- [ ] **Step 5: Verify + commit**

Run: `npx tsc --noEmit 2>&1 | grep "actions/activity/chat"` → no output; `npx jest` → green.

```bash
git add app/actions/activity/chat.ts
git commit -m "feat(chat): reaction, delete-for-everyone and timestamped read-receipt actions"
```

---

### Task 3: RichComposer (Tiptap)

**Files:**
- Create: `components/chat/RichComposer.tsx`

**Interfaces:**
- Produces: `<RichComposer onSend={(html: string, mentions: string[]) => void} members={{id,name}[]} placeholder? disabled? />`. Emits sanitized-ready HTML (server re-sanitizes). Enter sends, Shift+Enter newline.

- [ ] **Step 1: Implement**

```tsx
// components/chat/RichComposer.tsx
"use client";

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextStyle from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import Placeholder from '@tiptap/extension-placeholder';
import Mention from '@tiptap/extension-mention';
import { Bold, Italic, Underline as UnderlineIcon, Strikethrough, Code, Baseline, Highlighter, Send } from 'lucide-react';
import { cn } from '@/lib/utils';

const TEXT_SWATCHES = ['#111827', '#dc2626', '#ea580c', '#ca8a04', '#16a34a', '#0891b2', '#2563eb', '#7c3aed', '#db2777'];
const HIGHLIGHT_SWATCHES = ['#fef08a', '#bbf7d0', '#bfdbfe', '#fbcfe8', '#fed7aa', '#e9d5ff', '#fecaca', '#d9f99d'];

export default function RichComposer({ onSend, members = [], placeholder = 'Type a message…', disabled }: {
    onSend: (html: string, mentions: string[]) => void;
    members?: { id: string; name: string }[];
    placeholder?: string;
    disabled?: boolean;
}) {
    const editor = useEditor({
        immediatelyRender: false,
        extensions: [
            StarterKit.configure({ heading: false, blockquote: false, bulletList: false, orderedList: false, horizontalRule: false }),
            Underline, TextStyle, Color,
            Highlight.configure({ multicolor: true }),
            Placeholder.configure({ placeholder }),
            Mention.configure({
                HTMLAttributes: { class: 'mention' },
                suggestion: {
                    items: ({ query }) => members.filter(m => m.name.toLowerCase().includes(query.toLowerCase())).slice(0, 6),
                    render: mentionDropdown,
                },
            }),
        ],
        editorProps: {
            attributes: { class: 'chat-composer-editor outline-none min-h-[38px] max-h-32 overflow-y-auto px-3 py-2 text-sm' },
            handleKeyDown: (_view, event) => {
                if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); submit(); return true; }
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
    const Btn = ({ active, onClick, children, title }: any) => (
        <button type="button" title={title} onMouseDown={e => e.preventDefault()} onClick={onClick}
            className={cn("p-1.5 rounded-md transition-colors", active ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted')}>
            {children}
        </button>
    );

    return (
        <div className="border border-border rounded-xl bg-card overflow-hidden">
            <div className="flex items-center gap-0.5 px-1.5 pt-1.5 flex-wrap">
                <Btn title="Bold" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}><Bold className="w-3.5 h-3.5" /></Btn>
                <Btn title="Italic" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic className="w-3.5 h-3.5" /></Btn>
                <Btn title="Underline" active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()}><UnderlineIcon className="w-3.5 h-3.5" /></Btn>
                <Btn title="Strikethrough" active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()}><Strikethrough className="w-3.5 h-3.5" /></Btn>
                <Btn title="Code" active={editor.isActive('code')} onClick={() => editor.chain().focus().toggleCode().run()}><Code className="w-3.5 h-3.5" /></Btn>
                <SwatchMenu icon={<Baseline className="w-3.5 h-3.5" />} title="Text colour" swatches={TEXT_SWATCHES}
                    onPick={c => editor.chain().focus().setColor(c).run()} onClear={() => editor.chain().focus().unsetColor().run()} />
                <SwatchMenu icon={<Highlighter className="w-3.5 h-3.5" />} title="Highlight" swatches={HIGHLIGHT_SWATCHES}
                    onPick={c => editor.chain().focus().setHighlight({ color: c }).run()} onClear={() => editor.chain().focus().unsetHighlight().run()} />
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
```

Also in this file: `SwatchMenu` (small popover grid of color buttons using local `useState` open toggle — same pattern as the existing swatch menus in `ChatInterface.tsx`, copy and adapt) and `mentionDropdown` (Tiptap suggestion `render` returning `onStart/onUpdate/onKeyDown/onExit` that portals a simple `<div>` list under the caret using `@tiptap/suggestion`'s `clientRect`; arrow keys + Enter select). Add to `app/globals.css`:

```css
.mention { color: var(--primary); background: color-mix(in oklab, var(--primary) 12%, transparent); border-radius: 4px; padding: 0 3px; font-weight: 600; }
.chat-composer-editor p { margin: 0; }
.chat-composer-editor p.is-editor-empty:first-child::before { color: var(--muted-foreground); content: attr(data-placeholder); float: left; height: 0; pointer-events: none; }
```

- [ ] **Step 2: Verify + commit**

`npx tsc --noEmit 2>&1 | grep RichComposer` → no output.

```bash
git add components/chat/RichComposer.tsx app/globals.css
git commit -m "feat(chat): Tiptap WYSIWYG composer with colors, highlights and mentions"
```

---

### Task 4: Message bubble upgrades in ChatInterface

**Files:**
- Modify: `components/activity/ChatInterface.tsx` (message list ~lines 640-760; composer ~lines 770-910)

**Interfaces:**
- Consumes: `RichComposer` (Task 3), `toggleReaction`, `deleteMessageForEveryone`, extended `sendMessage` (Task 2), `isHtmlContent`, `sanitizeChatHtml`, `normalizeReadBy` (Task 1).

- [ ] **Step 1: HTML rendering path.** Extend `FormattedMessage`:

```tsx
import { isHtmlContent, sanitizeChatHtml } from '@/lib/chat-format';

function FormattedMessage({ content, isMe }: { content: string; isMe: boolean }) {
    if (isHtmlContent(content)) {
        return <span className="chat-html leading-relaxed [&_p]:m-0"
            dangerouslySetInnerHTML={{ __html: sanitizeChatHtml(content) }} />;
    }
    /* …existing legacy marker rendering unchanged… */
}
```

- [ ] **Step 2: Sender avatar + name on every incoming message** (DM and group): in the message map, where group-only sender name renders (~line 691), render for all `!isMe` messages: `<ChatAvatar name={senderName} size="sm" image={senderImage} />` beside the bubble column and the name line above the bubble. Consecutive messages from the same sender within 2 minutes show the avatar only on the first.

- [ ] **Step 3: Reply/quote.** Add `const [replyTo, setReplyTo] = useState<Message | null>(null)`. Bubble hover actions (see Step 4) include "Reply". Above the composer render a cancelable quote bar (title = sender name, one-line preview, X to cancel). Send passes `{ replyTo: replyTo?._id }`. In bubbles with `msg.replyTo`, render a tappable quote block above content that `scrollIntoView`s the original (`id={'msg-' + msg._id}` on each bubble wrapper).

- [ ] **Step 4: Reactions.** Hover toolbar on each bubble (opacity-0 → group-hover:opacity-100): quick emojis `👍 ❤️ 😂 😮 🙏`, Reply, and (own messages) Delete. Click emoji → optimistic update + `toggleReaction(msg._id, emoji)`. Cluster under bubble: distinct emojis + count, highlighted if current user reacted, click toggles.

- [ ] **Step 5: Delete.** Own-message hover → Delete → `confirm()` → `deleteMessageForEveryone`. Render `deletedAt` messages as `<span className="italic text-muted-foreground text-xs">🚫 message deleted</span>` (skip attachments, reactions, edit).

- [ ] **Step 6: Blue ticks + message info.** Compute with `normalizeReadBy(msg.readBy)`: DM read = other participant present; group read = all participants except sender present. Read → `<CheckCheck className="text-sky-400" />`, else existing grey. Click own bubble tick → small popover listing each reader name + `format(at, 'd MMM, h:mm a')` (legacy `at: null` → "read (time unknown)").

- [ ] **Step 7: Swap composer.** Replace the textarea + marker toolbar block with `<RichComposer onSend={handleRichSend} members={groupMembers} />` where:

```ts
const handleRichSend = async (html: string, mentions: string[]) => {
    const res = await sendMessage(activeConversation._id, html, [], { replyTo: replyTo?._id, mentions });
    if (res.success) { setReplyTo(null); refreshMessages(); } else toast.error(res.error);
};
```

Keep the existing attachment (`Paperclip`) and emoji-picker buttons beside the composer (emoji inserts via `editor.commands.insertContent` — expose an `insertText` ref from RichComposer or place the picker inside it). Mention alert: in the poll handler where new incoming messages are detected, if `msg.mentions?.includes(userId)` show `toast('💬 ' + senderName + ' mentioned you', …)` and play the ping even when muted-by-default rules would skip it.

- [ ] **Step 8: Verify + commit**

`npx tsc --noEmit 2>&1 | grep ChatInterface` → no output; `npx jest` → green; manual smoke: send bold/colored message, react, reply, delete, ticks.

```bash
git add components/activity/ChatInterface.tsx
git commit -m "feat(chat): reply, reactions, mentions, delete, blue-tick receipts and WYSIWYG rendering"
```

---

### Task 5: Popup step flow (ChatInterface popup mode + ChatLauncher)

**Files:**
- Modify: `components/activity/ChatInterface.tsx` (root layout render)
- Modify: `components/chat/ChatLauncher.tsx`

**Interfaces:**
- Consumes: everything above.
- Produces: `<ChatInterface mode="popup" />` (default `mode="page"`).

- [ ] **Step 1: Add prop + view state**

```ts
export default function ChatInterface({ mode = 'page' }: { mode?: 'page' | 'popup' }) {
    const [popupView, setPopupView] = useState<'picker' | 'conversation'>('picker');
```

Selecting a conversation in popup mode sets `popupView='conversation'`; a new back handler sets `'picker'` (and clears `activeConversation`).

- [ ] **Step 2: Popup layout.** Where the root renders sidebar + main side-by-side, branch:

```tsx
if (mode === 'popup') {
    return (
        <div className="h-full overflow-hidden relative">
            <AnimatePresence initial={false} mode="popLayout">
                {popupView === 'picker' ? (
                    <motion.div key="picker" className="absolute inset-0"
                        initial={{ x: -40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -40, opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 380, damping: 32 }}>
                        {sidebarContent /* search + Chats/People/Groups tabs — reuse existing sidebar JSX */}
                    </motion.div>
                ) : (
                    <motion.div key="conv" className="absolute inset-0 flex flex-col"
                        initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 40, opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 380, damping: 32 }}>
                        {conversationContent /* existing conversation column + ← back button in header */}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
```

Extract `sidebarContent` and `conversationContent` as variables (not new components — avoids remount state loss). The conversation header in popup mode gets `<button onClick={backToPicker}><ArrowLeft className="w-4 h-4" /></button>` (icon already imported). Incoming message while in picker: flash the row (`animate-pulse` for 2s via a `flashConvId` state set by the poll handler).

- [ ] **Step 3: ChatLauncher.** Render `<ChatInterface mode={view === 'full' ? 'page' : 'popup'} />` — fullscreen gets the two-pane layout per spec Part 2.3. Verify existing spring transition on the panel resize (`layout` prop on the panel `motion.div`; add if missing).

- [ ] **Step 4: Verify + commit**

`npx tsc --noEmit` clean. Manual: bubble → picker → pick person → slide to conversation → back → fullscreen shows two panes → restore returns to popup state.

```bash
git add components/activity/ChatInterface.tsx components/chat/ChatLauncher.tsx
git commit -m "feat(chat): popup step-flow with picker tabs, slide transitions and fullscreen two-pane"
```

---

### Task 6: Full verification + deploy

- [ ] **Step 1:** `npx tsc --noEmit` → zero errors.
- [ ] **Step 2:** `npx jest` → full suite green.
- [ ] **Step 3:** `npm run build` → all routes compile.
- [ ] **Step 4:** Docker rebuild + redeploy to dev.vrone.pro (same procedure as UI8/UI10 in TASKS.md).
- [ ] **Step 5:** Update `TASKS.md` memory: add C13 (calendar visuals), C14 (chat popup), C15 (chat features) as `[x]` / ⏳ awaiting review; append session log.
