import { Command } from 'commander'
import { DataOptions, dataOptions, run } from '../context.js'
import { buildBody, parseData } from '../input.js'
import { createSession } from './create.js'

type ListOptions = {
    track?: string
    category?: string
    format?: string
    language?: string
    limit?: string
    offset?: string
}

export const registerSessions = (program: Command): void => {
    const sessions = program.command('sessions').description('Sessions (talks) of the event')

    sessions
        .command('list')
        .description('List sessions, optionally filtered')
        .option('--track <trackId>')
        .option('--category <categoryId>')
        .option('--format <formatId>')
        .option('--language <code>')
        .option('--limit <n>')
        .option('--offset <n>')
        .action(
            run<ListOptions>((ctx, options) =>
                ctx.client.request({
                    method: 'GET',
                    path: '/v1/{eventId}/sessions',
                    query: {
                        trackId: options.track,
                        categoryId: options.category,
                        format: options.format,
                        language: options.language,
                        limit: options.limit,
                        offset: options.offset,
                    },
                })
            )
        )

    sessions
        .command('get <sessionId>')
        .description('Get one session')
        .action(
            run((ctx, _options, sessionId) =>
                ctx.client.request({ method: 'GET', path: `/v1/{eventId}/sessions/${sessionId}` })
            )
        )

    dataOptions(sessions.command('update <sessionId>'))
        .description('Partial update (title, abstract, dates, speakers, trackId, format, category, tags, note…)')
        .action(
            run<DataOptions>((ctx, options, sessionId) =>
                ctx.client.request({
                    method: 'PATCH',
                    path: `/v1/{eventId}/sessions/${sessionId}`,
                    body: buildBody(options),
                })
            )
        )

    dataOptions(sessions.command('create'))
        .description(
            'Create one session (id generated unless given; an existing id is upserted). Accepts speakers/format/category/dates or speakerIds/formatId/categoryId/dateStart/dateEnd; *Name fields auto-create tracks, formats, categories'
        )
        .action(run<DataOptions>((ctx, options) => createSession(ctx, options)))

    sessions
        .command('check-media <urls...>')
        .description('Check that media URLs (images, videos, slides) are reachable')
        .action(
            run((ctx, _options, ...urls) =>
                ctx.client.request({ method: 'POST', path: '/v1/{eventId}/check-media', body: { urls } })
            )
        )

    dataOptions(sessions.command('shortvid <sessionId>'), { required: true })
        .description(
            'Generate the session announcement video via shortvid.io (body: shortVidType, updateSession, settings…)'
        )
        .action(
            run<DataOptions>((ctx, options, sessionId) =>
                ctx.client.request({
                    method: 'POST',
                    path: `/v1/{eventId}/sessions/${sessionId}/shortvid`,
                    body: parseData(options.data),
                })
            )
        )
}
