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

    it('scopes style to <span> only, stripping it from other allowed tags', () => {
        expect(sanitizeChatHtml('<code style="color:red">x</code>')).toBe('<code>x</code>');
        expect(sanitizeChatHtml('<p style="color:red">x</p>')).toBe('<p>x</p>');
    });

    it('scopes href/rel/target to <a> only, stripping them from other tags', () => {
        expect(sanitizeChatHtml('<p rel="foo" target="bar">x</p>')).toBe('<p>x</p>');
        expect(sanitizeChatHtml('<b href="https://x.com">x</b>')).toBe('<b>x</b>');
    });

    it('rejects unsafe CSS values even for allowed properties', () => {
        expect(sanitizeChatHtml('<span style="color:expression(alert(1))">x</span>')).toBe('<span>x</span>');
        expect(sanitizeChatHtml('<span style="background-color:url(javascript:alert(1))">x</span>')).toBe('<span>x</span>');
    });

    it('accepts safe CSS colour value forms', () => {
        expect(sanitizeChatHtml('<span style="color:#dc2626">x</span>')).toContain('color: #dc2626');
        expect(sanitizeChatHtml('<span style="color:red">x</span>')).toContain('color: red');
        expect(sanitizeChatHtml('<span style="background-color:hsl(10, 50%, 50%)">x</span>')).toContain('background-color: hsl(10, 50%, 50%)');
    });

    it('treats style property names case-insensitively', () => {
        expect(sanitizeChatHtml('<span style="COLOR: red">x</span>')).toContain('color: red');
    });

    it('normalizeReadBy upgrades legacy strings and keeps objects', () => {
        const out = normalizeReadBy(['u1', { user: 'u2', at: new Date('2026-07-02T10:00:00Z') }]);
        expect(out[0]).toEqual({ user: 'u1', at: null });
        expect(out[1].user).toBe('u2');
        expect(out[1].at).toBeInstanceOf(Date);
    });
});
