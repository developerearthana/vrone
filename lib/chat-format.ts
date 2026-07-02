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
            const kept = style
                .split(';')
                .map((s) => s.trim())
                .filter((s) => ALLOWED_STYLES.test(s))
                .join('; ');
            if (kept) node.setAttribute('style', kept);
            else node.removeAttribute('style');
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
