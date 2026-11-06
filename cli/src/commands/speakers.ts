import { Command } from 'commander'
import { DataOptions, dataOptions, run } from '../context.js'
import { buildBody } from '../input.js'
import { createSpeaker } from './create.js'

type ListOptions = { limit?: string; offset?: string; includePrivate?: boolean }
type ReviewOptions = { reviewer?: string; note?: string }

const REVIEWS = {
    approve: 'Approve a request (applies the patch to the speaker)',
    reject: 'Reject a request',
} as const

export const registerSpeakers = (program: Command): void => {
    const speakers = program.command('speakers').description('Speakers of the event')

    speakers
        .command('list')
        .description('List speakers')
        .option('--limit <n>')
        .option('--offset <n>')
        .option('--include-private', 'Include email, phone, note and private custom fields')
        .action(
            run<ListOptions>((ctx, options) =>
                ctx.client.request({
                    method: 'GET',
                    path: '/v1/{eventId}/speakers',
                    query: { limit: options.limit, offset: options.offset, includePrivate: options.includePrivate },
                })
            )
        )

    speakers
        .command('get <speakerId>')
        .description('Get one speaker')
        .option('--include-private', 'Include email, phone, note and private custom fields')
        .action(
            run<ListOptions>((ctx, options, speakerId) =>
                ctx.client.request({
                    method: 'GET',
                    path: `/v1/{eventId}/speakers/${speakerId}`,
                    query: { includePrivate: options.includePrivate },
                })
            )
        )

    dataOptions(speakers.command('update <speakerId>'))
        .description(
            'Partial update (name, bio, company, jobTitle, photoUrl, socials, email, phone, note, customFields)'
        )
        .action(
            run<DataOptions>((ctx, options, speakerId) =>
                ctx.client.request({
                    method: 'PATCH',
                    path: `/v1/{eventId}/speakers/${speakerId}`,
                    body: buildBody(options),
                })
            )
        )

    dataOptions(speakers.command('create'))
        .description('Create one speaker (id generated unless given; an existing id is upserted)')
        .action(run<DataOptions>((ctx, options) => createSpeaker(ctx, options)))

    speakers
        .command('delete <speakerId>')
        .description('Delete a speaker (irreversible)')
        .requiredOption('--yes', 'Confirm the deletion')
        .action(
            run((ctx, _options, speakerId) =>
                ctx.client.request({ method: 'DELETE', path: `/v1/{eventId}/speakers/${speakerId}` })
            )
        )

    const pending = speakers.command('pending-edits').description('Speaker self-edit requests awaiting review')

    pending
        .command('list')
        .description('List pending edit requests')
        .option('--status <status>', 'pending | approved | rejected')
        .action(
            run<{ status?: string }>((ctx, options) =>
                ctx.client.request({
                    method: 'GET',
                    path: '/v1/{eventId}/speaker-pending-edits',
                    query: { status: options.status },
                })
            )
        )

    for (const [action, description] of Object.entries(REVIEWS)) {
        const command = pending.command(`${action} <requestId>`).description(description).option('--reviewer <uid>')
        if (action === 'reject') command.option('--note <text>', 'Review note stored with the rejection')
        command.action(
            run<ReviewOptions>((ctx, options, requestId) =>
                ctx.client.request({
                    method: 'POST',
                    path: `/v1/{eventId}/speaker-pending-edits/${requestId}/${action}`,
                    body: { reviewerUid: options.reviewer, reviewNote: options.note },
                })
            )
        )
    }
}
