import { Command } from 'commander'
import { call, Context, DataOptions, dataOptions, run } from '../context.js'
import { buildBody } from '../input.js'

const PUBLIC_EVENT_PATH = '/v1/{eventId}/event'

export const fetchPublicData = async (ctx: Context): Promise<unknown> => {
    const pointer = await ctx.client.request<{ dataUrl: string }>({
        method: 'GET',
        path: PUBLIC_EVENT_PATH,
        auth: false,
    })
    const response = await fetch(pointer.dataUrl)
    if (!response.ok) throw new Error(`Public data fetch failed (${response.status}) for ${pointer.dataUrl}`)
    return response.json()
}

export const registerEvent = (program: Command): void => {
    const event = program.command('event').description('Event settings, usage, deploy and exports')

    event
        .command('get')
        .description('Event settings: tracks, formats, categories, custom fields, dates, branding (needs API key)')
        .action(call('GET', '/v1/{eventId}/event/details'))

    event
        .command('public')
        .description('Public event JSON as last exported by "Update website" (sessions, speakers, sponsors, faq…)')
        .option('--url-only', 'Only print the public JSON pointer, do not download it')
        .action(
            run<{ urlOnly?: boolean }>((ctx, options) =>
                options.urlOnly
                    ? ctx.client.request({ method: 'GET', path: PUBLIC_EVENT_PATH, auth: false })
                    : fetchPublicData(ctx)
            )
        )

    dataOptions(event.command('update'))
        .description('Partial update of event fields (name, dates, tracks, formats, categories, timezone…)')
        .action(
            run<DataOptions>((ctx, options) =>
                ctx.client.request({ method: 'PATCH', path: '/v1/{eventId}/event', body: buildBody(options) })
            )
        )

    event
        .command('usage')
        .description('Storage and network usage of the event')
        .action(call('GET', '/v1/{eventId}/usage'))

    event
        .command('deploy')
        .description('Regenerate the public/private JSON exports ("Update website") and trigger webhooks')
        .option('--no-webhooks', 'Skip webhook calls')
        .action(
            run<{ webhooks: boolean }>((ctx, options) =>
                ctx.client.request({
                    method: 'POST',
                    path: '/v1/{eventId}/deploy',
                    query: { triggerWebhooks: options.webhooks },
                })
            )
        )

    event
        .command('files')
        .description('Storage paths of the exported files (public, private, openfeedback, voxxrin, pdf)')
        .action(call('GET', '/v1/{eventId}/deploy/files'))

    event
        .command('export-pdf')
        .description('Render the schedule as a PDF and return its public URL')
        .action(call('POST', '/v1/{eventId}/event/export-pdf'))

    event
        .command('pdf-metadata')
        .description('Last generated schedule PDF metadata')
        .action(call('GET', '/v1/{eventId}/event/pdf-metadata'))
}
