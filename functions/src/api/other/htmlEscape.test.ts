import { describe, expect, test } from 'vitest'
import { escapeHtml } from './htmlEscape'

describe('escapeHtml', () => {
    test('escapes &, <, >, ", \', /', () => {
        expect(escapeHtml('&')).toBe('&amp;')
        expect(escapeHtml('<')).toBe('&lt;')
        expect(escapeHtml('>')).toBe('&gt;')
        expect(escapeHtml('"')).toBe('&quot;')
        expect(escapeHtml("'")).toBe('&#39;')
        expect(escapeHtml('/')).toBe('&#x2F;')
    })

    test('escapes & first to avoid double-encoding', () => {
        expect(escapeHtml('&amp;')).toBe('&amp;amp;')
        // ^^ if & weren't escaped first, this would erroneously become &amp;
    })

    test('escapes script injection inside a speaker name', () => {
        const malicious = '<script>alert(1)</script>'
        const escaped = escapeHtml(malicious)
        expect(escaped).not.toContain('<script>')
        expect(escaped).toBe('&lt;script&gt;alert(1)&lt;&#x2F;script&gt;')
    })

    test('passes plain text through unchanged', () => {
        expect(escapeHtml('Hello world')).toBe('Hello world')
        expect(escapeHtml('Jane Doe')).toBe('Jane Doe')
    })
})
