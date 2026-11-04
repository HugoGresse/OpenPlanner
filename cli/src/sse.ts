export type SseEvent = Record<string, unknown>

export const splitSseBlocks = (buffer: string): { events: string[]; rest: string } => {
    const parts = buffer.split('\n\n')
    return { events: parts.slice(0, -1), rest: parts[parts.length - 1] ?? '' }
}

export const parseSseBlock = (block: string): SseEvent | 'done' | null => {
    const payload = block
        .split('\n')
        .filter((line) => line.startsWith('data:'))
        .map((line) => line.slice(5).trim())
        .join('\n')
    if (!payload) return null
    if (payload === '[DONE]') return 'done'
    try {
        return JSON.parse(payload) as SseEvent
    } catch {
        return null
    }
}

export async function* readSse(stream: ReadableStream<Uint8Array>): AsyncGenerator<SseEvent> {
    const decoder = new TextDecoder()
    const reader = stream.getReader()
    let buffer = ''
    while (true) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const { events, rest } = splitSseBlocks(buffer)
        buffer = rest
        for (const block of events) {
            const parsed = parseSseBlock(block)
            if (parsed === 'done') return
            if (parsed) yield parsed
        }
    }
    const trailing = parseSseBlock(buffer)
    if (trailing && trailing !== 'done') yield trailing
}
