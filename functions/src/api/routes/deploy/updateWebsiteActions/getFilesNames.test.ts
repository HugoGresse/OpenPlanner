import { describe, expect, test, vi } from 'vitest'
import { addPdfFileToEvent } from './getFilesNames'

vi.mock('uuid', () => ({
    v4: vi.fn(() => 'uuid-1'),
}))

describe('addPdfFileToEvent', () => {
    test('creates a new .pdf path when missing', async () => {
        const update = vi.fn().mockResolvedValue(undefined)
        const firebaseApp = {
            firestore: () => ({
                collection: () => ({
                    doc: () => ({
                        update,
                    }),
                }),
            }),
        } as any

        const output = await addPdfFileToEvent(firebaseApp, { id: 'evt-1', files: null } as any)

        expect(output).toBe('events/evt-1/schedule-uuid-1.pdf')
        expect(update).toHaveBeenCalledOnce()
    })

    test('normalizes existing path without extension', async () => {
        const update = vi.fn().mockResolvedValue(undefined)
        const firebaseApp = {
            firestore: () => ({
                collection: () => ({
                    doc: () => ({
                        update,
                    }),
                }),
            }),
        } as any

        const output = await addPdfFileToEvent(
            firebaseApp,
            {
                id: 'evt-1',
                files: {
                    public: 'events/evt-1/a.json',
                    private: 'events/evt-1/b.json',
                    imageFolder: 'events/evt-1/',
                    openfeedback: 'events/evt-1/c.json',
                    voxxrin: null,
                    pdf: 'events/evt-1/schedule-uuid-1',
                },
            } as any
        )

        expect(output).toBe('events/evt-1/schedule-uuid-1.pdf')
        expect(update).toHaveBeenCalledOnce()
    })
})
