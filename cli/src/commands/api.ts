import { Command } from 'commander'
import { call, DATA_HELP, run } from '../context.js'
import { collect, parseData, parsePairs } from '../input.js'

type ApiOptions = { data?: string; query?: string[]; header?: string[]; auth: boolean }

type Operation = {
    method: string
    path: string
    tags: string[]
    summary: string
    security: string[]
    query: string[]
    body?: unknown
    responses?: unknown
}

type OpenApiDocument = {
    paths: Record<string, Record<string, OpenApiOperation>>
}

type OpenApiOperation = {
    tags?: string[]
    summary?: string
    description?: string
    security?: Array<Record<string, unknown>>
    parameters?: Array<{ in: string; name: string }>
    requestBody?: { content?: Record<string, { schema?: unknown }> }
    responses?: unknown
}

export const listOperations = (document: OpenApiDocument): Operation[] =>
    Object.entries(document.paths).flatMap(([path, methods]) =>
        Object.entries(methods).map(([method, op]) => ({
            method: method.toUpperCase(),
            path,
            tags: op.tags ?? [],
            summary: op.summary ?? op.description ?? '',
            security: (op.security ?? []).flatMap((scheme) => Object.keys(scheme)),
            query: (op.parameters ?? [])
                .filter((parameter) => parameter.in === 'query')
                .map((parameter) => parameter.name),
            body: Object.values(op.requestBody?.content ?? {})[0]?.schema,
            responses: op.responses,
        }))
    )

const formatOperationLine = (op: Operation): string => {
    const auth = op.security.length ? ` [${op.security.join(',')}]` : ' [public]'
    const query = op.query.length ? ` ?${op.query.join('&')}` : ''
    return `${op.method} ${op.path}${auth}${query} — ${op.summary}`
}

export const registerApi = (program: Command): void => {
    program
        .command('api <method> <path>')
        .description('Call any API endpoint. {eventId} in the path is replaced, the API key is added unless --no-auth')
        .option('-d, --data <json>', DATA_HELP)
        .option('-q, --query <key=value>', 'Query string parameter (repeatable)', collect)
        .option('-H, --header <key:value>', 'Extra request header (repeatable)', collect)
        .option('--no-auth', 'Do not append the event API key')
        .action(
            run<ApiOptions>((ctx, options, method, path) =>
                ctx.client.request({
                    method: method.toUpperCase(),
                    path,
                    query: parsePairs(options.query),
                    headers: parsePairs(options.header, ':'),
                    body: parseData(options.data),
                    auth: options.auth,
                })
            )
        )

    program
        .command('openapi')
        .description('Discover the API: one line per operation, or details of one with --operation')
        .option(
            '--tag <tag>',
            'Only operations with this tag (event, sessions, speakers, sponsors, faq, files, deploy…)'
        )
        .option('--operation <"METHOD /path">', 'Show request/response schemas of one operation')
        .option('--full', 'Print the raw OpenAPI document')
        .action(
            run<{ tag?: string; operation?: string; full?: boolean }>(async (ctx, options) => {
                const document = await ctx.client.request<OpenApiDocument>({
                    method: 'GET',
                    path: '/openapi.json',
                    auth: false,
                })
                if (options.full) return document
                const operations = listOperations(document)
                if (options.operation) {
                    const [method, path] = options.operation.trim().split(/\s+/)
                    const found = operations.find((op) => op.method === method?.toUpperCase() && op.path === path)
                    if (!found)
                        throw new Error(
                            `Unknown operation "${options.operation}". Run \`openplanner openapi\` to list them.`
                        )
                    return found
                }
                return operations
                    .filter((op) => !options.tag || op.tags.includes(options.tag))
                    .map(formatOperationLine)
                    .join('\n')
            })
        )

    program
        .command('hello')
        .description('Ping the API (no auth)')
        .action(call('GET', '/hello', { auth: false }))
}
