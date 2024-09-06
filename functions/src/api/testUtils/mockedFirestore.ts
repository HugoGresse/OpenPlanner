import { vi } from 'vitest'

export const getMockedFirestore = (docData: Record<string, unknown>, otherMocks = {}) =>
    ({
        collection: vi.fn(() => ({
            doc: vi.fn(() => ({
                get: () =>
                    Promise.resolve({
                        data: () => docData,
                        exists: true,
                    }),
                collection: vi.fn(() => ({
                    doc: vi.fn(() => ({
                        get: () =>
                            Promise.resolve({
                                data: () => docData,
                                exists: true,
                            }),
                        set: (data: Record<string, unknown>, options: Record<string, unknown>) => {
                            return Promise.resolve(data)
                        },
                    })),
                })),
            })),
            ...otherMocks,
        })),
    } as unknown as FirebaseFirestore.Firestore)
