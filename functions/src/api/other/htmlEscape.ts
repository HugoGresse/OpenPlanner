// Minimal HTML escaping for outgoing email bodies. Keep this list synchronous
// with the OWASP "Encode for HTML" guidance — &, <, >, ", ', /.
const ENTITY_MAP: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '/': '&#x2F;',
}

export const escapeHtml = (input: string): string => input.replace(/[&<>"'/]/g, (ch) => ENTITY_MAP[ch] || ch)
