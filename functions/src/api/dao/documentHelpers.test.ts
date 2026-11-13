import { describe, expect, test, vi } from 'vitest'
import { NotFoundError } from '../other/Errors'
import { deleteDocumentOr404 } from './documentHelpers'

const refRejecting = (error: unknown) => ({ delete: vi.fn().mockRejectedValue(error) } as any)

describe('deleteDocumentOr404', () => {
    test('deletes with the exists precondition', async () => {
        const ref = { delete: vi.fn().mockResolvedValue(undefined) } as any
        await deleteDocumentOr404(ref, 'Thing not found')
        expect(ref.delete).toHaveBeenCalledWith({ exists: true })
    })

    test('maps a NOT_FOUND / FAILED_PRECONDITION rejection to NotFoundError', async () => {
        for (const code of [5, 9]) {
            const error = Object.assign(new Error('missing'), { code })
            await expect(deleteDocumentOr404(refRejecting(error), 'Thing not found')).rejects.toThrow(NotFoundError)
        }
    })

    test('rethrows any other failure', async () => {
        const error = Object.assign(new Error('quota'), { code: 8 })
        await expect(deleteDocumentOr404(refRejecting(error), 'Thing not found')).rejects.toBe(error)
    })
})
