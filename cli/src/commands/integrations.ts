import { openAsBlob, readFileSync } from 'node:fs'
import { basename } from 'node:path'
import { Command } from 'commander'
import { call, run } from '../context.js'
import { collect } from '../input.js'

export const registerWhatsapp = (program: Command): void => {
    const whatsapp = program.command('whatsapp').description('WhatsApp track management (GreenAPI)')
    const base = '/v1/{eventId}/whatsapp'

    whatsapp
        .command('status')
        .description('Track readiness status')
        .action(call('GET', `${base}/track-management/status`))

    whatsapp
        .command('start')
        .description('Send the "which tracks are ready?" poll to a chat')
        .requiredOption('--chat-id <id>', 'Phone or @g.us group id')
        .action(
            run<{ chatId: string }>((ctx, options) =>
                ctx.client.request({
                    method: 'POST',
                    path: `${base}/track-management/start`,
                    body: { chatId: options.chatId },
                })
            )
        )

    whatsapp
        .command('go')
        .description('Send the GO message (only once every track is ready, unless --force)')
        .option('--force', 'Send even if some tracks are not ready')
        .action(
            run<{ force?: boolean }>((ctx, options) =>
                ctx.client.request({
                    method: 'POST',
                    path: `${base}/track-management/go`,
                    body: options.force ? { force: true } : {},
                })
            )
        )

    whatsapp
        .command('contacts')
        .description('Chats and groups visible to the GreenAPI instance')
        .action(call('GET', `${base}/contacts`))

    whatsapp
        .command('scheduled-tasks')
        .description('Pending reminder tasks')
        .action(call('GET', `${base}/scheduled-tasks`))

    whatsapp
        .command('cancel-task <name>')
        .description('Cancel a pending reminder task by its Cloud Tasks name')
        .action(
            run((ctx, _options, name) =>
                ctx.client.request({ method: 'DELETE', path: `${base}/scheduled-tasks`, body: { name } })
            )
        )

    whatsapp
        .command('send-test')
        .description('Send one WhatsApp message (setup test)')
        .requiredOption('--to <chatId>')
        .requiredOption('--message <text>')
        .action(
            run<{ to: string; message: string }>((ctx, options) =>
                ctx.client.request({
                    method: 'POST',
                    path: `${base}/send-test`,
                    body: { to: options.to, message: options.message },
                })
            )
        )

    whatsapp
        .command('configure-webhook')
        .description('Point the GreenAPI instance at the OpenPlanner webhook (reboots the instance)')
        .option('--webhook-url <url>', 'Defaults to <api-url>/v1/<eventId>/whatsapp/webhook')
        .action(
            run<{ webhookUrl?: string }>((ctx, options) =>
                ctx.client.request({
                    method: 'POST',
                    path: `${base}/configure-webhook`,
                    body: {
                        webhookUrl: options.webhookUrl ?? ctx.client.url({ path: `${base}/webhook`, auth: false }),
                    },
                })
            )
        )
}

type DraftOptions = { profile: string[]; text?: string; contentMap?: string; file: string; thumbnail?: string }

const buildDraftForm = async (options: DraftOptions): Promise<FormData> => {
    if (!options.text && !options.contentMap) throw new Error('Pass --text <text> or --content-map <json>')
    const form = new FormData()
    form.append('profiles', JSON.stringify(options.profile))
    if (options.text) form.append('text', options.text)
    else form.append('contentMap', options.contentMap as string)
    form.append('file', await openAsBlob(options.file), basename(options.file))
    if (options.thumbnail) form.append('thumbnail', await openAsBlob(options.thumbnail), basename(options.thumbnail))
    return form
}

const readPassword = (options: { passwordStdin?: boolean }): string => {
    if (options.passwordStdin) return readFileSync(0, 'utf8').trim()
    const fromEnv = process.env.OPENPLANNER_BUPHER_PASSWORD
    if (!fromEnv) throw new Error('Provide the password with --password-stdin or OPENPLANNER_BUPHER_PASSWORD')
    return fromEnv
}

export const registerBupher = (program: Command): void => {
    const bupher = program.command('bupher').description('Social post scheduling (Bupher)')
    const base = '/v1/{eventId}/bupher'

    bupher
        .command('channels')
        .description('Connected social channels')
        .action(call('GET', `${base}/channels`))
    bupher
        .command('scheduled-posts')
        .description('Scheduled posts')
        .action(call('GET', `${base}/scheduled-posts`))

    bupher
        .command('draft-post')
        .description('Create a draft post with a media file on one or more channels')
        .requiredOption('--profile <id>', 'Bupher profile/channel id (repeatable)', collect)
        .option('--text <text>', 'Same text for every profile')
        .option('--content-map <json>', 'JSON object {profileId: text} for per-profile text')
        .requiredOption('--file <path>', 'Image or video to attach')
        .option('--thumbnail <path>', 'Thumbnail for a video')
        .action(
            run<DraftOptions>(async (ctx, options) =>
                ctx.client.request({ method: 'POST', path: `${base}/draft-post`, form: await buildDraftForm(options) })
            )
        )

    bupher
        .command('login')
        .description(
            'Log the event into Bupher and store the session (password from --password-stdin or OPENPLANNER_BUPHER_PASSWORD)'
        )
        .requiredOption('--email <email>')
        .option('--password-stdin', 'Read the password from stdin')
        .action(
            run<{ email: string; passwordStdin?: boolean }>((ctx, options) =>
                ctx.client.request({
                    method: 'POST',
                    path: `${base}/login`,
                    body: { email: options.email, password: readPassword(options) },
                })
            )
        )
}

export const registerSlack = (program: Command): void => {
    const slack = program.command('slack').description('Slack assistant integration')

    slack
        .command('channels')
        .description('Channels of the connected Slack workspace')
        .action(call('GET', '/v1/{eventId}/slack/channels'))
    slack
        .command('config')
        .description('Whether the official Slack app is available on this server')
        .action(call('GET', '/v1/slack/config', { auth: false }))
    slack
        .command('install-url')
        .description(
            'URL that starts the "Add to Slack" OAuth flow for this event (contains the API key: open it, do not share it)'
        )
        .requiredOption('--return-to <url>', 'OpenPlanner app page to return to after the install')
        .action(
            run<{ returnTo: string }>(async (ctx, options) => ({
                url: ctx.client.url({ path: '/v1/{eventId}/slack/install', query: { returnTo: options.returnTo } }),
            }))
        )
}
