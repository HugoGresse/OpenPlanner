import { Command } from 'commander'
import { call, DataOptions, dataOptions, run } from '../context.js'
import { buildBody } from '../input.js'

export const registerSponsors = (program: Command): void => {
    const sponsors = program.command('sponsors').description('Sponsors, sponsor categories and the job board')

    sponsors
        .command('list')
        .description('Sponsor categories with their sponsors')
        .action(call('GET', '/v1/{eventId}/sponsors'))

    dataOptions(sponsors.command('add'))
        .description('Add a sponsor (name, categoryId, categoryName, website, logoUrl). Creates the category if needed')
        .option('--reupload-assets', 'Download logoUrl and re-host it on OpenPlanner storage')
        .action(
            run<DataOptions & { reuploadAssets?: boolean }>((ctx, options) =>
                ctx.client.request({
                    method: 'POST',
                    path: '/v1/{eventId}/sponsors',
                    query: { reUploadAssets: options.reuploadAssets },
                    body: buildBody(options),
                })
            )
        )

    sponsors
        .command('delete <sponsorId>')
        .description('Remove a sponsor from its category (irreversible; the category is kept)')
        .requiredOption('--yes', 'Confirm the deletion')
        .action(
            run((ctx, _options, sponsorId) =>
                ctx.client.request({ method: 'DELETE', path: `/v1/{eventId}/sponsors/${sponsorId}` })
            )
        )

    sponsors
        .command('delete-category <categoryId>')
        .description('Delete a sponsor category and every sponsor in it (irreversible)')
        .requiredOption('--yes', 'Confirm the deletion')
        .action(
            run((ctx, _options, categoryId) =>
                ctx.client.request({ method: 'DELETE', path: `/v1/{eventId}/sponsors/categories/${categoryId}` })
            )
        )

    sponsors
        .command('generate-token')
        .description('Generate the token a sponsor uses to manage its own job posts')
        .requiredOption('--sponsor-id <id>')
        .requiredOption('--category-id <id>')
        .action(
            run<{ sponsorId: string; categoryId: string }>((ctx, options) =>
                ctx.client.request({
                    method: 'POST',
                    path: '/v1/{eventId}/sponsors/generate-token',
                    body: { sponsorId: options.sponsorId, categoryId: options.categoryId },
                })
            )
        )

    const jobs = sponsors.command('job-posts').description('Job board moderation')

    jobs.command('list')
        .description('List job posts')
        .option('--sponsor-id <id>')
        .option('--status <status>', 'pending | approved | rejected')
        .action(
            run<{ sponsorId?: string; status?: string }>((ctx, options) =>
                ctx.client.request({
                    method: 'GET',
                    path: '/v1/{eventId}/sponsors/jobPosts',
                    query: { sponsorId: options.sponsorId, status: options.status },
                })
            )
        )

    jobs.command('get <jobPostId>')
        .description('Get one job post')
        .action(
            run((ctx, _options, id) =>
                ctx.client.request({ method: 'GET', path: `/v1/{eventId}/sponsors/jobPosts/${id}` })
            )
        )

    jobs.command('set-status <jobPostId> <status>')
        .description('Moderate a job post: approved | rejected | pending')
        .action(
            run((ctx, _options, id, status) =>
                ctx.client.request({
                    method: 'PUT',
                    path: `/v1/{eventId}/sponsors/jobPosts/${id}/approval`,
                    body: { status },
                })
            )
        )

    jobs.command('delete <jobPostId>')
        .description('Delete a job post (irreversible)')
        .requiredOption('--yes', 'Confirm the deletion')
        .action(
            run((ctx, _options, id) =>
                ctx.client.request({ method: 'DELETE', path: `/v1/{eventId}/sponsors/jobPosts/${id}` })
            )
        )
}
