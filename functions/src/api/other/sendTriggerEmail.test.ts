import { describe, expect, test, vi } from 'vitest'
import { sendTriggerEmail } from './sendTriggerEmail'

const makeFirebaseApp = (addSpy: ReturnType<typeof vi.fn>) =>
    ({
        firestore: () => ({
            collection: vi.fn(() => ({ add: addSpy })),
        }),
    } as unknown as Parameters<typeof sendTriggerEmail>[0])

describe('sendTriggerEmail', () => {
    test('escapes HTML in derived html body', async () => {
        const addSpy = vi.fn(() => Promise.resolve({}))
        const fb = makeFirebaseApp(addSpy)
        await sendTriggerEmail(fb, {
            to: 'jane@example.com',
            subject: 'Edit your profile',
            text: 'Hello <script>alert(1)</script>',
        })
        expect(addSpy).toHaveBeenCalledOnce()
        const doc = addSpy.mock.calls[0][0] as { message: { html: string; text: string } }
        expect(doc.message.html).not.toContain('<script>')
        expect(doc.message.html).toContain('&lt;script&gt;')
        // Plain-text body stays unescaped — that part is fine, MUA renders it as text.
        expect(doc.message.text).toBe('Hello <script>alert(1)</script>')
    })

    test('keeps caller-provided html as-is (caller is trusted)', async () => {
        const addSpy = vi.fn(() => Promise.resolve({}))
        const fb = makeFirebaseApp(addSpy)
        await sendTriggerEmail(fb, {
            to: 'jane@example.com',
            subject: 'X',
            text: 'fallback',
            html: '<p>Trusted <strong>HTML</strong></p>',
        })
        const doc = addSpy.mock.calls[0][0] as { message: { html: string } }
        expect(doc.message.html).toBe('<p>Trusted <strong>HTML</strong></p>')
    })

    test('strips CRLF from subject to block SMTP header injection', async () => {
        const addSpy = vi.fn(() => Promise.resolve({}))
        const fb = makeFirebaseApp(addSpy)
        await sendTriggerEmail(fb, {
            to: 'jane@example.com',
            subject: 'Hi\r\nBcc: attacker@example.com',
            text: 'body',
        })
        const doc = addSpy.mock.calls[0][0] as { message: { subject: string } }
        expect(doc.message.subject).not.toMatch(/[\r\n]/)
        expect(doc.message.subject).toBe('Hi Bcc: attacker@example.com')
    })

    test('caps subject length at 998 chars (RFC 5322)', async () => {
        const addSpy = vi.fn(() => Promise.resolve({}))
        const fb = makeFirebaseApp(addSpy)
        await sendTriggerEmail(fb, {
            to: 'jane@example.com',
            subject: 'x'.repeat(2000),
            text: 'body',
        })
        const doc = addSpy.mock.calls[0][0] as { message: { subject: string } }
        expect(doc.message.subject.length).toBe(998)
    })

    test('newlines become <br> after escaping', async () => {
        const addSpy = vi.fn(() => Promise.resolve({}))
        const fb = makeFirebaseApp(addSpy)
        await sendTriggerEmail(fb, {
            to: 'jane@example.com',
            subject: 'X',
            text: 'line1\nline2',
        })
        const doc = addSpy.mock.calls[0][0] as { message: { html: string } }
        expect(doc.message.html).toBe('line1<br>line2')
    })
})
