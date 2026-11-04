import { openAsBlob } from 'node:fs'
import { basename } from 'node:path'
import { Command } from 'commander'
import { DataOptions, dataOptions, run } from '../context.js'
import { buildBody, parseData } from '../input.js'

const MAX_UPLOAD_FILES = 5

export const checkUploadPaths = (paths: string[]): void => {
    if (paths.length > MAX_UPLOAD_FILES)
        throw new Error(`At most ${MAX_UPLOAD_FILES} files per upload, got ${paths.length}`)
    const names = paths.map((path) => basename(path))
    const duplicate = names.find((name, index) => names.indexOf(name) !== index)
    if (duplicate) throw new Error(`Duplicate file name "${duplicate}": the server keys uploads by file name`)
}

export const buildUploadForm = async (paths: string[]): Promise<FormData> => {
    checkUploadPaths(paths)
    const form = new FormData()
    for (const path of paths) {
        const name = basename(path)
        form.append(name.replace(/\.[^.]+$/, ''), await openAsBlob(path), name)
    }
    return form
}

export const registerFaq = (program: Command): void => {
    const faq = program.command('faq').description('FAQ categories and questions')

    faq.command('get <privateId>')
        .description('One private FAQ category by its private id (public FAQ: `event public -f faq`)')
        .action(
            run((ctx, _options, privateId) =>
                ctx.client.request({ method: 'GET', path: `/v1/{eventId}/faq/${privateId}`, auth: false })
            )
        )

    dataOptions(faq.command('add'))
        .description(
            'Add or update (same id) a question: categoryId, categoryName, question, answer, order, categoryOrder'
        )
        .action(
            run<DataOptions>((ctx, options) =>
                ctx.client.request({ method: 'POST', path: '/v1/{eventId}/faq', body: buildBody(options) })
            )
        )
}

export const registerFiles = (program: Command): void => {
    const files = program.command('files').description('Upload files to the event storage')

    files
        .command('upload <paths...>')
        .description(`Upload up to ${MAX_UPLOAD_FILES} local files (10 MB each), returns their public URLs`)
        .action(
            run(async (ctx, _options, ...paths) =>
                ctx.client.request({ method: 'POST', path: '/v1/{eventId}/files', form: await buildUploadForm(paths) })
            )
        )

    files
        .command('reupload <url>')
        .description('Download a remote image and re-host it on the event storage')
        .option('--filename <name>')
        .action(
            run<{ filename?: string }>((ctx, options, url) =>
                ctx.client.request({
                    method: 'POST',
                    path: '/v1/{eventId}/files/download-reupload',
                    body: { url, filename: options.filename },
                })
            )
        )
}

export const registerImport = (program: Command): void => {
    dataOptions(program.command('import'), { required: true })
        .description('Bulk upsert sessions and speakers ({"speakers":[…],"sessions":[…]}, each item needs an id)')
        .action(
            run<DataOptions>((ctx, options) =>
                ctx.client.request({
                    method: 'POST',
                    path: '/v1/{eventId}/sessions-speakers',
                    body: parseData(options.data),
                })
            )
        )
}

const SCREENS = {
    transcription: 'Transcription screen data (Gladia key, sessions); protected by the event transcription password',
    intermission: 'Intermission screen data; password only needed when the event sets one',
} as const

export const registerLive = (program: Command): void => {
    const live = program.command('live').description('Day-of screens: transcription and intermission')

    for (const [screen, description] of Object.entries(SCREENS)) {
        live.command(screen)
            .description(description)
            .option('--password <password>', 'Screen password (or OPENPLANNER_SCREEN_PASSWORD)')
            .action(
                run<{ password?: string }>((ctx, options) => {
                    const password = options.password ?? process.env.OPENPLANNER_SCREEN_PASSWORD
                    return ctx.client.request({
                        method: 'GET',
                        path: `/v1/{eventId}/${screen}`,
                        auth: false,
                        headers: password ? { password } : {},
                    })
                })
            )
    }
}
