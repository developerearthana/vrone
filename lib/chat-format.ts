import DOMPurify from 'isomorphic-dompurify';

/**
 * Returns true when message content is rich-text HTML (new chat composer)
 * rather than legacy plain/marker-formatted text.
 */
export function isHtmlContent(content: string): boolean {
    return content.trimStart().startsWith('<');
}

const ALLOWED_TAGS = ['b', 'i', 'u', 's', 'em', 'strong', 'code', 'a', 'br', 'p', 'span'];
const ALLOWED_ATTR = ['href', 'style', 'rel', 'target'];

// Property name AND value both validated: only color/background-color, and only
// safe value forms (hex, rgb()/rgba(), hsl()/hsla(), or a short alphabetic named
// colour) — rejects expression()/url()/anything else outright rather than
// passing an unchecked value through.
const SAFE_COLOR_VALUE =
    /^(#[0-9a-f]{3,8}|rgba?\(\s*\d{1,3}%?\s*,\s*\d{1,3}%?\s*,\s*\d{1,3}%?\s*(,\s*[\d.]+\s*)?\)|hsla?\(\s*\d{1,3}\s*,\s*\d{1,3}%\s*,\s*\d{1,3}%\s*(,\s*[\d.]+\s*)?\)|[a-z]{3,20})$/i;

function safeStyleDeclarations(style: string): string {
    return style
        .split(';')
        .map((s) => s.trim())
        .filter(Boolean)
        .map((decl): string | null => {
            const m = /^(color|background-color)\s*:\s*(.+)$/i.exec(decl);
            if (!m) return null;
            const prop = m[1].toLowerCase();
            const value = m[2].trim();
            if (!SAFE_COLOR_VALUE.test(value)) return null;
            return `${prop}: ${value}`;
        })
        .filter((d): d is string => d !== null)
        .join('; ');
}

let hooked = false;
function ensureHooks() {
    if (hooked) return;
    hooked = true;
    DOMPurify.addHook('afterSanitizeAttributes', (node) => {
        const isAnchor = node.tagName === 'A';
        const isSpan = node.tagName === 'SPAN';

        // href/rel/target are legal only on <a>; strip them everywhere else.
        if (isAnchor) {
            const href = node.getAttribute('href') || '';
            if (!/^https?:\/\//i.test(href)) node.removeAttribute('href');
            node.setAttribute('rel', 'noopener noreferrer');
            node.setAttribute('target', '_blank');
        } else {
            node.removeAttribute('href');
            node.removeAttribute('rel');
            node.removeAttribute('target');
        }

        // style is legal only on <span>, and only with validated color values.
        const style = node.getAttribute('style');
        if (style) {
            if (!isSpan) {
                node.removeAttribute('style');
            } else {
                const kept = safeStyleDeclarations(style);
                if (kept) node.setAttribute('style', kept);
                else node.removeAttribute('style');
            }
        }
    });
}

/**
 * Sanitizes chat message HTML: keeps a minimal set of formatting tags/attrs,
 * strips XSS vectors (scripts, event handlers, javascript: links, unsafe
 * inline styles), and forces safe attributes on links.
 */
export function sanitizeChatHtml(html: string): string {
    ensureHooks();
    return DOMPurify.sanitize(html, { ALLOWED_TAGS, ALLOWED_ATTR });
}

/**
 * Strips rich-text HTML down to a flat string for list-preview contexts
 * (conversation subtitles, notifications) where tags must not be visible.
 * Legacy plain/marker-formatted content passes through untouched.
 */
export function toPreviewText(content: string): string {
    if (!content || !isHtmlContent(content)) return content || '';
    // Turn block/line boundaries into spaces before stripping tags, so
    // adjacent paragraphs don't collapse into one run-on word.
    const withBreaks = content.replace(/<\/(p|div|li|h[1-6])>|<br\s*\/?>/gi, ' ');
    const text = DOMPurify.sanitize(withBreaks, { ALLOWED_TAGS: [] });
    return text.replace(/\s+/g, ' ').trim();
}

export interface ReadEntry {
    user: string;
    at: Date | null;
}

/**
 * Normalizes readBy entries, lazily upgrading legacy string user-ids to the
 * new { user, at } shape without a data migration.
 */
export function normalizeReadBy(raw: unknown[]): ReadEntry[] {
    return (raw || []).map((r: any) =>
        typeof r === 'string'
            ? { user: r, at: null }
            : { user: String(r.user), at: r.at ? new Date(r.at) : null }
    );
}
