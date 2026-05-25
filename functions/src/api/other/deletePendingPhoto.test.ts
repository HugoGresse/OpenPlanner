import { describe, expect, test, vi } from 'vitest'
import { deletePendingPhotoFromUrl } from './deletePendingPhoto'

vi.mock('../dao/firebasePlugin', async (importOriginal) => {
    const mod = await importOriginal<typeof import('../dao/firebasePlugin')>()
    return {
        ...mod,
        getStorageBucketName: () => 'test-bucket',
    }
})

const makeApp = (deleteSpy: ReturnType<typeof vi.fn>) =>
    ({
        storage: () => ({
            bucket: (_name: string) => ({
                file: (path: string) => ({
                    delete: (opts: unknown) => deleteSpy(path, opts),
                }),
            }),
        }),
    } as unknown as Parameters<typeof deletePendingPhotoFromUrl>[0])

describe('deletePendingPhotoFromUrl', () => {
    test('does nothing for empty / non-string URL', async () => {
        const deleteSpy = vi.fn()
        const app = makeApp(deleteSpy)
        expect(await deletePendingPhotoFromUrl(app, null)).toEqual({ deleted: false, reason: 'no-url' })
        expect(await deletePendingPhotoFromUrl(app, undefined)).toEqual({ deleted: false, reason: 'no-url' })
        expect(await deletePendingPhotoFromUrl(app, '')).toEqual({ deleted: false, reason: 'no-url' })
        expect(deleteSpy).not.toHaveBeenCalled()
    })

    test('does NOT delete admin/external photos missing the pending-edit marker', async () => {
        const deleteSpy = vi.fn()
        const app = makeApp(deleteSpy)
        const result = await deletePendingPhotoFromUrl(
            app,
            'https://test-bucket.storage.googleapis.com/events/evt-1/abc123_some-photo.png'
        )
        expect(result.deleted).toBe(false)
        expect(result.reason).toBe('not-a-pending-photo')
        expect(deleteSpy).not.toHaveBeenCalled()
    })

    test('deletes a pending-edit photo on the canonical bucket subdomain URL', async () => {
        const deleteSpy = vi.fn(() => Promise.resolve())
        const app = makeApp(deleteSpy)
        const result = await deletePendingPhotoFromUrl(
            app,
            'https://test-bucket.storage.googleapis.com/events/evt-1/abc123_pending-edit-spk-1-1700000000.png'
        )
        expect(result.deleted).toBe(true)
        expect(deleteSpy).toHaveBeenCalledOnce()
        expect(deleteSpy.mock.calls[0][0]).toBe('events/evt-1/abc123_pending-edit-spk-1-1700000000.png')
    })

    test('deletes a pending-edit photo on the path-style storage URL', async () => {
        const deleteSpy = vi.fn(() => Promise.resolve())
        const app = makeApp(deleteSpy)
        const result = await deletePendingPhotoFromUrl(
            app,
            'https://storage.googleapis.com/test-bucket/events/evt-1/x_pending-edit-spk-1-9.png'
        )
        expect(result.deleted).toBe(true)
        expect(deleteSpy.mock.calls[0][0]).toBe('events/evt-1/x_pending-edit-spk-1-9.png')
    })

    test('refuses paths outside events/ even if they carry the marker', async () => {
        const deleteSpy = vi.fn()
        const app = makeApp(deleteSpy)
        const result = await deletePendingPhotoFromUrl(
            app,
            'https://test-bucket.storage.googleapis.com/wrong-root/abc_pending-edit-spk-1-1.png'
        )
        expect(result.deleted).toBe(false)
        expect(result.reason).toBe('unexpected-path')
        expect(deleteSpy).not.toHaveBeenCalled()
    })

    test('swallows storage errors so the surrounding handler still completes', async () => {
        const deleteSpy = vi.fn(() => Promise.reject(new Error('boom')))
        const app = makeApp(deleteSpy)
        const result = await deletePendingPhotoFromUrl(
            app,
            'https://test-bucket.storage.googleapis.com/events/evt-1/x_pending-edit-spk-1-9.png'
        )
        expect(result.deleted).toBe(false)
        expect(result.reason).toBe('storage-error')
    })

    test('rejects malformed URLs gracefully', async () => {
        const deleteSpy = vi.fn()
        const app = makeApp(deleteSpy)
        const result = await deletePendingPhotoFromUrl(app, 'not-a-url-but_pending-edit-x')
        expect(result.deleted).toBe(false)
        expect(['invalid-url', 'unexpected-path']).toContain(result.reason)
    })
})
