import { describe, expect, test } from 'vitest'
import { parseSseBlock, readSse, splitSseBlocks } from './sse.js'
import { foldChatEvents, shellQuote } from './commands/chat.js'

const toStream = (chunks: string[]): ReadableStream<Uint8Array> =>
    new ReadableStream({
        start(controller) {
            for (const chunk of chunks) controller.enqueue(new TextEncoder().encode(chunk))
            controller.close()
        },
    })

describe('sse parsing', () => {
    test('splitSseBlocks keeps the incomplete tail', () => {
        expect(splitSseBlocks('data: 1\n\ndata: 2\n\nda')).toEqual({ events: ['data: 1', 'data: 2'], rest: 'da' })
    })
    test('parseSseBlock handles json, done and junk', () => {
        expect(parseSseBlock('data: {"type":"content","delta":"hi"}')).toEqual({ type: 'content', delta: 'hi' })
        expect(parseSseBlock('data: [DONE]')).toBe('done')
        expect(parseSseBlock(': comment')).toBeNull()
    })
    test('readSse reassembles events split across chunks and stops at DONE', async () => {
        const stream = toStream([
            'data: {"type":"content","del',
            'ta":"a"}\n\ndata: {"type":"content","delta":"b"}\n\ndata: [DONE]\n\ndata: {"type":"content","delta":"ignored"}\n\n',
        ])
        const events = []
        for await (const event of readSse(stream)) events.push(event)
        expect(events).toEqual([
            { type: 'content', delta: 'a' },
            { type: 'content', delta: 'b' },
        ])
    })
})

test('foldChatEvents builds answer, proposals and apply commands', () => {
    const result = foldChatEvents([
        { type: 'eventSummary', event: { id: 'e' }, model: 'm' },
        { type: 'content', delta: 'Hel' },
        { type: 'content', delta: 'lo' },
        { type: 'toolCall', id: '1', name: 'listSessions', arguments: { limit: 5 } },
        {
            type: 'proposal',
            id: 'p1',
            proposal: {
                summary: 'Rename',
                endpoint: { method: 'PATCH', path: '/v1/e/sessions/s1', body: { title: 'New' } },
                diff: {},
            },
        },
    ])
    expect(result.answer).toBe('Hello')
    expect(result.model).toBe('m')
    expect(result.toolCalls).toEqual([{ name: 'listSessions', arguments: { limit: 5 } }])
    expect(result.proposals[0].applyCommand).toBe(`openplanner api PATCH '/v1/e/sessions/s1' --data '{"title":"New"}'`)
})

test('shellQuote survives apostrophes', () => {
    expect(shellQuote(`{"title":"L'IA"}`)).toBe(`'{"title":"L'\\''IA"}'`)
})
