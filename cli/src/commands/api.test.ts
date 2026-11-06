import { expect, test } from 'vitest'
import { listOperations } from './api.js'

test('listOperations flattens an OpenAPI document', () => {
    const operations = listOperations({
        paths: {
            '/v1/{eventId}/sessions': {
                get: {
                    tags: ['sessions'],
                    summary: 'List sessions',
                    security: [{ apiKey: [] }],
                    parameters: [
                        { in: 'path', name: 'eventId' },
                        { in: 'query', name: 'limit' },
                    ],
                },
            },
        },
    })
    expect(operations).toEqual([
        expect.objectContaining({
            method: 'GET',
            path: '/v1/{eventId}/sessions',
            tags: ['sessions'],
            security: ['apiKey'],
            query: ['limit'],
        }),
    ])
})
