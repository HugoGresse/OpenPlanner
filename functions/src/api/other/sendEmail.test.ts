import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

// Mock nodemailer BEFORE importing sendEmail so the module-level
// `createTransport` reference picks up the mock. vi.hoisted ensures the
// shared spies survive vi.restoreAllMocks() between cases.
const nodemailerMocks = vi.hoisted(() => ({
    sendMail: vi.fn(),
    createTransport: vi.fn(),
}))
vi.mock('nodemailer', () => ({
    default: { createTransport: nodemailerMocks.createTransport },
    createTransport: nodemailerMocks.createTransport,
}))

import { sendEmail, __resetEmailTransporterForTests } from './sendEmail'

const makeFirebaseApp = (setSpy: ReturnType<typeof vi.fn>, addSpy: ReturnType<typeof vi.fn>) =>
    ({
        firestore: () => ({
            collection: vi.fn(() => ({
                add: vi.fn(async (data: unknown) => {
                    addSpy(data)
                    return { id: 'doc-1', set: setSpy }
                }),
            })),
        }),
    } as unknown as Parameters<typeof sendEmail>[0])

describe('sendEmail', () => {
    beforeEach(() => {
        __resetEmailTransporterForTests()
        nodemailerMocks.sendMail.mockReset()
        nodemailerMocks.createTransport.mockReset()
        nodemailerMocks.createTransport.mockReturnValue({ sendMail: nodemailerMocks.sendMail })
        process.env.MAILGUN_SMTP_HOST = 'smtp.example.com'
        process.env.MAILGUN_SMTP_PORT = '465'
        process.env.MAILGUN_SMTP_USER = 'postmaster@mg.example.com'
        process.env.MAILGUN_SMTP_PASSWORD = 'secret'
        process.env.MAIL_FROM = 'OpenPlanner <noreply@mg.example.com>'
    })

    afterEach(() => {
        delete process.env.MAILGUN_SMTP_HOST
        delete process.env.MAILGUN_SMTP_PORT
        delete process.env.MAILGUN_SMTP_USER
        delete process.env.MAILGUN_SMTP_PASSWORD
        delete process.env.MAIL_FROM
    })

    test('writes an audit row, sends via nodemailer, then marks delivery SUCCESS', async () => {
        const setSpy = vi.fn(() => Promise.resolve())
        const addSpy = vi.fn()
        nodemailerMocks.sendMail.mockResolvedValueOnce({ messageId: 'mid-1', response: '250 OK' })

        await sendEmail(makeFirebaseApp(setSpy, addSpy), {
            to: 'jane@example.com',
            subject: 'Hello',
            text: 'Body <script>x</script>',
        })

        expect(addSpy).toHaveBeenCalledOnce()
        const pendingDoc = addSpy.mock.calls[0][0]
        expect(pendingDoc.delivery.state).toBe('PENDING')
        expect(pendingDoc.message.html).not.toContain('<script>')
        expect(pendingDoc.message.html).toContain('&lt;script&gt;')

        expect(nodemailerMocks.sendMail).toHaveBeenCalledOnce()
        const sendArg = nodemailerMocks.sendMail.mock.calls[0][0]
        expect(sendArg).toMatchObject({
            from: 'OpenPlanner <noreply@mg.example.com>',
            to: 'jane@example.com',
            subject: 'Hello',
        })

        const successUpdate = setSpy.mock.calls.find((c) => (c[0] as Record<string, unknown>)?.delivery)
        expect(successUpdate).toBeDefined()
        const delivery = (successUpdate![0] as { delivery: { state: string } }).delivery
        expect(delivery.state).toBe('SUCCESS')
    })

    test('marks delivery ERROR and rethrows when nodemailer fails', async () => {
        const setSpy = vi.fn(() => Promise.resolve())
        const addSpy = vi.fn()
        nodemailerMocks.sendMail.mockRejectedValueOnce(new Error('connect ECONNREFUSED'))

        await expect(
            sendEmail(makeFirebaseApp(setSpy, addSpy), {
                to: 'jane@example.com',
                subject: 'Hello',
                text: 'Body',
            })
        ).rejects.toThrow(/ECONNREFUSED/)

        const errorUpdate = setSpy.mock.calls.find((c) => (c[0] as Record<string, unknown>)?.delivery)
        expect(errorUpdate).toBeDefined()
        const delivery = (errorUpdate![0] as { delivery: { state: string; error: string } }).delivery
        expect(delivery.state).toBe('ERROR')
        expect(delivery.error).toMatch(/ECONNREFUSED/)
    })

    test('throws if Mailgun SMTP env vars are missing', async () => {
        delete process.env.MAILGUN_SMTP_HOST
        const setSpy = vi.fn(() => Promise.resolve())
        const addSpy = vi.fn()
        await expect(
            sendEmail(makeFirebaseApp(setSpy, addSpy), {
                to: 'a@b.c',
                subject: 'X',
                text: 'X',
            })
        ).rejects.toThrow(/MAILGUN_SMTP_HOST/)
    })

    test('builds the nodemailer transport with discrete host/port/user/pass options', async () => {
        const setSpy = vi.fn(() => Promise.resolve())
        const addSpy = vi.fn()
        nodemailerMocks.sendMail.mockResolvedValueOnce({ messageId: 'mid-3', response: '250 OK' })

        await sendEmail(makeFirebaseApp(setSpy, addSpy), {
            to: 'jane@example.com',
            subject: 'Hello',
            text: 'body',
        })
        expect(nodemailerMocks.createTransport).toHaveBeenCalledOnce()
        const opts = nodemailerMocks.createTransport.mock.calls[0][0]
        expect(opts).toMatchObject({
            host: 'smtp.example.com',
            port: 465,
            secure: true,
            auth: { user: 'postmaster@mg.example.com', pass: 'secret' },
            pool: true,
        })
    })

    test('uses STARTTLS (secure=false) with requireTLS on port 587', async () => {
        __resetEmailTransporterForTests()
        process.env.MAILGUN_SMTP_PORT = '587'
        const setSpy = vi.fn(() => Promise.resolve())
        const addSpy = vi.fn()
        nodemailerMocks.sendMail.mockResolvedValueOnce({ messageId: 'mid-4', response: '250 OK' })

        await sendEmail(makeFirebaseApp(setSpy, addSpy), {
            to: 'jane@example.com',
            subject: 'Hi',
            text: 'body',
        })
        const opts = nodemailerMocks.createTransport.mock.calls[0][0]
        // requireTLS forces the STARTTLS upgrade — without it nodemailer
        // would silently fall back to plaintext if the server does not
        // advertise STARTTLS, leaking the SMTP credentials.
        expect(opts).toMatchObject({ port: 587, secure: false, requireTLS: true })
    })

    test('omits requireTLS on the implicit-TLS port (465 already secure)', async () => {
        const setSpy = vi.fn(() => Promise.resolve())
        const addSpy = vi.fn()
        nodemailerMocks.sendMail.mockResolvedValueOnce({ messageId: 'mid-5', response: '250 OK' })

        await sendEmail(makeFirebaseApp(setSpy, addSpy), {
            to: 'jane@example.com',
            subject: 'Hi',
            text: 'body',
        })
        const opts = nodemailerMocks.createTransport.mock.calls[0][0]
        expect(opts).toMatchObject({ port: 465, secure: true, requireTLS: false })
    })

    test.each([
        ['empty string', ''],
        ['non-numeric', 'abc'],
        ['decimal', '587.5'],
        ['zero', '0'],
        ['too large', '70000'],
        ['negative', '-1'],
    ])('rejects an invalid MAILGUN_SMTP_PORT (%s)', async (_label, value) => {
        __resetEmailTransporterForTests()
        process.env.MAILGUN_SMTP_PORT = value
        const setSpy = vi.fn(() => Promise.resolve())
        const addSpy = vi.fn()
        if (value === '') {
            // empty string falls back to the default 465 path, so a send
            // should succeed — verify rather than assert a throw.
            nodemailerMocks.sendMail.mockResolvedValueOnce({ messageId: 'x', response: '250' })
            await sendEmail(makeFirebaseApp(setSpy, addSpy), {
                to: 'a@b.c',
                subject: 'x',
                text: 'x',
            })
            expect(nodemailerMocks.createTransport.mock.calls[0][0]).toMatchObject({ port: 465 })
            return
        }
        await expect(
            sendEmail(makeFirebaseApp(setSpy, addSpy), {
                to: 'a@b.c',
                subject: 'x',
                text: 'x',
            })
        ).rejects.toThrow(/MAILGUN_SMTP_PORT/)
    })

    test('writes ERROR delivery when MAIL_FROM is missing', async () => {
        delete process.env.MAIL_FROM
        const setSpy = vi.fn(() => Promise.resolve())
        const addSpy = vi.fn()
        await expect(
            sendEmail(makeFirebaseApp(setSpy, addSpy), {
                to: 'a@b.c',
                subject: 'X',
                text: 'X',
            })
        ).rejects.toThrow(/MAIL_FROM/)
        expect(nodemailerMocks.sendMail).not.toHaveBeenCalled()
        const errorUpdate = setSpy.mock.calls.find((c) => (c[0] as Record<string, unknown>)?.delivery)
        expect((errorUpdate![0] as { delivery: { error: string } }).delivery.error).toMatch(/MAIL_FROM/)
    })

    test('strips CRLF from subject and caps it at 998 chars', async () => {
        const setSpy = vi.fn(() => Promise.resolve())
        const addSpy = vi.fn()
        nodemailerMocks.sendMail.mockResolvedValueOnce({ messageId: 'mid-2', response: '250 OK' })

        await sendEmail(makeFirebaseApp(setSpy, addSpy), {
            to: 'a@b.c',
            subject: 'X\r\nBcc: x@y.z' + 'x'.repeat(2000),
            text: 'body',
        })
        const sendArg = nodemailerMocks.sendMail.mock.calls[0][0]
        expect(sendArg.subject).not.toMatch(/[\r\n]/)
        expect(sendArg.subject.length).toBeLessThanOrEqual(998)
    })

    test('reuses the cached transporter across calls (pool)', async () => {
        const setSpy = vi.fn(() => Promise.resolve())
        const addSpy = vi.fn()
        nodemailerMocks.sendMail.mockResolvedValue({ messageId: 'x', response: '250' })

        const app = makeFirebaseApp(setSpy, addSpy)
        await sendEmail(app, { to: 'a@b.c', subject: 'A', text: 'a' })
        await sendEmail(app, { to: 'a@b.c', subject: 'B', text: 'b' })
        await sendEmail(app, { to: 'a@b.c', subject: 'C', text: 'c' })

        expect(nodemailerMocks.createTransport).toHaveBeenCalledOnce()
        expect(nodemailerMocks.sendMail).toHaveBeenCalledTimes(3)
    })
})
