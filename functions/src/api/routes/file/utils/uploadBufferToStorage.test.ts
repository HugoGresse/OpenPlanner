import { describe, expect, test, vi } from 'vitest'
import { uploadBufferToStorage } from './uploadBufferToStorage'

vi.mock('../../../other/checkFileTypes', () => ({
    checkFileTypes: vi.fn().mockResolvedValue({ mime: 'image/png', extension: 'png' }),
}))

vi.mock('../../../dao/firebasePlugin', () => ({
    getStorageBucketName: vi.fn().mockReturnValue('test-bucket'),
}))

vi.mock('uuid', () => ({
    v4: vi.fn().mockReturnValue('test-uuid'),
}))

describe('uploadBufferToStorage', () => {
    test('adds detected extension when filename has none', async () => {
        const save = vi.fn().mockResolvedValue(undefined)
        const makePublic = vi.fn().mockResolvedValue(undefined)
        const file = vi.fn().mockImplementation((path: string) => ({
            name: path,
            bucket: { name: 'test-bucket' },
            save,
            makePublic,
        }))
        const firebase = {
            storage: () => ({
                bucket: () => ({ file }),
            }),
        } as any

        const [success, url] = await uploadBufferToStorage(firebase, Buffer.from('x'), 'evt-1', 'speaker-photo')

        expect(success).toBe(true)
        expect(file).toHaveBeenCalledWith('events/evt-1/test-uuid_speaker-photo.png')
        expect(url).toBe('https://test-bucket.storage.googleapis.com/events/evt-1/test-uuid_speaker-photo.png')
    })

    test('replaces existing extension with detected one', async () => {
        const save = vi.fn().mockResolvedValue(undefined)
        const makePublic = vi.fn().mockResolvedValue(undefined)
        const file = vi.fn().mockImplementation((path: string) => ({
            name: path,
            bucket: { name: 'test-bucket' },
            save,
            makePublic,
        }))
        const firebase = {
            storage: () => ({
                bucket: () => ({ file }),
            }),
        } as any

        const [success] = await uploadBufferToStorage(firebase, Buffer.from('x'), 'evt-1', 'logo.jpeg')

        expect(success).toBe(true)
        expect(file).toHaveBeenCalledWith('events/evt-1/test-uuid_logo.png')
    })
})
