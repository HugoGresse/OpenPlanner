import { Command } from 'commander'
import { Context, run } from '../context.js'
import { parseData } from '../input.js'
import { readSse, SseEvent } from '../sse.js'

type ChatOptions = { model?: string; history?: string; stream?: boolean; events?: boolean }

type Proposal = {
    id: string
    summary: string
    rationale?: string
    endpoint: { method: string; path: string; body?: unknown }
    diff: unknown
}

type ChatResult = {
    answer?: string
    model?: string
    eventSummary?: unknown
    toolCalls: Array<{ name: string; arguments: unknown }>
    proposals: Array<Proposal & { applyCommand: string }>
    error?: string
}

export const shellQuote = (value: string): string => `'${value.replaceAll("'", `'\\''`)}'`

const applyCommand = (proposal: Proposal): string => {
    const body = proposal.endpoint.body ? ` --data ${shellQuote(JSON.stringify(proposal.endpoint.body))}` : ''
    return `openplanner api ${proposal.endpoint.method} ${shellQuote(proposal.endpoint.path)}${body}`
}

export const foldChatEvents = (events: SseEvent[]): ChatResult => {
    const result: ChatResult = { answer: '', toolCalls: [], proposals: [] }
    for (const event of events) {
        switch (event.type) {
            case 'eventSummary':
                result.eventSummary = event.event
                result.model = event.model as string | undefined
                break
            case 'content':
                result.answer += event.delta as string
                break
            case 'toolCall':
                result.toolCalls.push({ name: event.name as string, arguments: event.arguments })
                break
            case 'proposal': {
                const proposal = { id: event.id as string, ...(event.proposal as Omit<Proposal, 'id'>) }
                result.proposals.push({ ...proposal, applyCommand: applyCommand(proposal) })
                break
            }
            case 'error':
                result.error = event.error as string
                break
        }
    }
    return result
}

const buildMessages = (message: string, history?: string) => {
    const previous = (parseData(history) as Array<{ role: string; content: string }> | undefined) ?? []
    return [...previous, { role: 'user', content: message }]
}

const streamChat = async (ctx: Context, message: string, options: ChatOptions): Promise<unknown> => {
    const stream = await ctx.client.stream({
        method: 'POST',
        path: '/v1/{eventId}/chat',
        body: { messages: buildMessages(message, options.history), model: options.model },
    })
    const events: SseEvent[] = []
    for await (const event of readSse(stream)) {
        events.push(event)
        if (options.events) process.stdout.write(JSON.stringify(event) + '\n')
        else if (options.stream && event.type === 'content') process.stdout.write(event.delta as string)
    }
    if (options.events) return undefined
    const result = foldChatEvents(events)
    if (!options.stream) return result
    process.stdout.write('\n')
    const { answer: _answer, ...rest } = result
    return rest.proposals.length || rest.error ? rest : undefined
}

export const registerChat = (program: Command): void => {
    program
        .command('chat <message>')
        .description(
            'Ask the event AI assistant (needs an OpenRouter key on the event). Write proposals are returned, never applied: run the applyCommand to apply one'
        )
        .option('--model <model>', 'OpenRouter model id')
        .option('--history <json>', 'Previous messages [{role,content}] as JSON, @file or -')
        .option('--stream', 'Print the answer text as it streams; proposals/errors still follow as JSON')
        .option('--events', 'Print every raw SSE event as JSON lines')
        .action(run<ChatOptions>((ctx, options, message) => streamChat(ctx, message, options)))
}
