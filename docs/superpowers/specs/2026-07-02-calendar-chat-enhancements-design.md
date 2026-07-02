# Calendar & Chat Enhancements — Design Spec

**Date:** 2026-07-02
**Status:** Approved by user (sections reviewed individually in brainstorming session)
**Scope:** `app/activity/calendar/page.tsx`, `components/chat/ChatLauncher.tsx`, `components/activity/ChatInterface.tsx`, `models/Message` schema, chat server actions.

Mockups reviewed in the visual companion session (`.superpowers/brainstorm/18149-*/content/`):
user selected **A's Sunday treatment**, **C's festival animation**, **A+B combined date/time picker**, **A step-flow chat popup**.

---

## Part 1 — Calendar

### 1.1 Day-cell treatments (month + week views)

Target: `app/activity/calendar/page.tsx`. (`components/activity/CalendarView.tsx` is
orphaned — not imported anywhere — and is NOT part of this work.)

| Day kind | Treatment |
|---|---|
| **Sunday** | Whole-cell rose wash (`bg-rose-100`), date number `text-rose-600`, small centered caption `WEEKEND HOLIDAY` at cell bottom. Data-independent. |
| **Govt/company holiday** (National / State / Optional / Office Managed Leave) | Solid colored ribbon strip across the top of the cell (holiday name + emoji), bright wash below. Type-colored: National=red, State=orange, Optional=amber, OML=yellow. |
| **Festival** (`festive: true` keys in `lib/holiday-themes.ts`) | Animated flowing gradient background (`background-position` keyframes, ~5s loop), white text, bobbing emoji. Palette per festival from `holiday-themes.ts`. |
| **Sunday + holiday collision** | Holiday treatment wins (more specific information). |

Accessibility: all animations wrapped in `@media (prefers-reduced-motion: no-preference)`;
reduced-motion users see static gradients. Text contrast on gradient cells uses white text
with a subtle text-shadow.

### 1.2 All-day default

- Selecting any Holiday event type in the form forces `isAllDay: true` and hides time fields.
- Other event types remain time-specific (timed by default).
- `CompanyEvent.isAllDay` already exists — no schema change.

### 1.3 Event form date & time picker (A+B combined)

- Segmented toggle at top: **⏰ Timed / 📅 All-day**.
- Date row: quick chips **Today / Tomorrow / Next Mon** + **Pick…** opening a popover
  mini-month calendar (date-fns; reuse existing mini-calendar grid pattern; no new dependency).
- Time row: start-time dropdown with 15-minute intervals + duration chips **30m / 1h / 2h**
  that auto-fill end time. Manual end-time selection still possible.
- Applies to both personal and company event forms on the activity calendar page.

---

## Part 2 — Chat popup flow (ChatLauncher)

`ChatInterface` gains a `mode: 'page' | 'popup'` prop. Popup mode adds internal
`view: 'picker' | 'conversation'` state (step flow). The full page `/activity/chat`
keeps the existing two-pane layout.

1. **Bubble → picker.** Bubble click springs open the panel showing: search field,
   tabs **Chats** (recent conversations + unread badges) / **People** / **Groups**.
2. **Picker → conversation.** Selection slides picker out left, conversation in from
   right (framer-motion `AnimatePresence`, spring). Conversation takes full panel width.
   Header: **← back**, avatar, name, ⛶ fullscreen, ─ minimize.
3. **Fullscreen ⛶** expands to near-viewport with spring scale; two-pane layout returns
   in fullscreen. Restore returns to popup preserving step-flow state.
4. **Minimize ─** collapses to bubble. Kept: unread badge, ping sound, pulse animation,
   toast cards while collapsed. New: incoming message while picker is open flashes that
   conversation row.

---

## Part 3 — Composer & message features

### 3.1 Composer: Tiptap (decision)

Chosen over hand-rolled contenteditable (bug farm) and marker-syntax-with-preview
(still WhatsApp-style). Live WYSIWYG: select text → click Bold → bold in composer.

- Extensions: StarterKit (bold/italic/strike/code), Underline, TextStyle+Color,
  Highlight, Mention, Placeholder.
- Lazy-loaded so the bundle cost (~50KB gz) is paid only when a composer mounts.
- Toolbar: existing icons + swatches carried over; now applying live formatting.

### 3.2 Storage & rendering

- New messages stored as **sanitized HTML**: `isomorphic-dompurify` (existing dependency)
  with strict allowlist — `b i u s em strong code a br p span`, `span` style limited to
  `color` / `background-color` (values validated), `a` limited to http(s) href.
  Sanitize on the server in `sendMessage` / `editMessage` (never trust client HTML).
- **Legacy compatibility:** messages starting with `<` render as sanitized HTML;
  everything else renders through the existing `renderRich` marker pipeline. No migration.

### 3.3 Message schema & actions

| Feature | Schema | Behavior |
|---|---|---|
| Reply/quote | `replyTo: ObjectId \| null` | Quoted preview above bubble; click scrolls to original. |
| Reactions | `reactions: [{ emoji: string, users: ObjectId[] }]` | Hover/long-press quick-react bar (👍❤️😂😮🙏 + picker); cluster under bubble. Actions: `toggleReaction`. |
| @mentions | `mentions: ObjectId[]` | Tiptap mention dropdown of group members; mentioned users get highlighted toast; name highlighted in bubble. |
| Delete/unsend | `deletedAt: Date \| null` | Soft delete; bubble becomes italic "message deleted" stub for everyone. Action: `deleteMessageForEveryone` (sender only). |
| Read receipts | `readBy: [{ user: ObjectId, at: Date }]` (was `string[]`) | Grey ✓✓ sent, blue ✓✓ read by all. "Message info" shows per-person read time. Legacy string entries wrapped lazily on next read — no migration script. |
| Sender identity | — | Avatar + name shown above every incoming message in DMs and groups. |

### 3.4 Alerts

Existing kept: ping sound, bubble pulse, toast cards while collapsed, unread badges.
Additions covered in Part 2 (picker row flash) and 3.3 (mention toast).

---

## Non-goals

- `components/activity/CalendarView.tsx` and `components/dashboards/ExecutiveDashboard.tsx`
  (orphaned components) — untouched.
- Super-admin calendar page (`app/dashboards/super-admin/calendar/page.tsx`, task DB7) —
  separate task.
- Real-time transport (websockets) — polling stays at 3s; out of scope.
- Message search, voice notes, pinned messages — not selected this round.

## Testing

- Unit: sanitizer allowlist (XSS vectors rejected, allowed styles kept), HTML-vs-legacy
  render detection, `readBy` legacy-entry upgrade, duration-chip end-time math.
- Manual QA on dev.vrone.pro: calendar month/week rendering (Sunday, National Holiday,
  Diwali festival cells), all-day default, picker popover, popup step flow, fullscreen /
  minimize, reply/react/mention/delete/read-tick flows in both DM and group.

## Rollout

Single feature branch; `tsc --noEmit` + `npm run build` clean; Docker rebuild +
redeploy to dev.vrone.pro; user UAT against TASKS.md (append as new tasks under
MODULE 13 — C13 calendar visuals, C14 chat popup, C15 chat features).
