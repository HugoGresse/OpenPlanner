import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { parseArgs } from 'node:util'
import path from 'node:path'
import { PromisePool } from '@supercharge/promise-pool'
import { JsonData, JsonSession, ThumbnailConfig } from './types.js'
import { fetchImage } from './utils/fetchImage.js'
import { renderThumbnail } from './utils/renderThumbnail.js'

/**
 * Generates one YouTube thumbnail (1280x720 jpg) per session from an OpenPlanner public JSON url.
 * Layout: background image, dark gradient, event logo, event date, session title, speaker avatars + names.
 *
 * Usage:
 * - cd scripts && npm install
 * - npx tsx youtube-thumbnails/generateThumbnails.ts --json <dataUrl> [--config youtube-thumbnails/config.json]
 *   [--out youtube-thumbnails/output] [--only-video] [--session <sessionId>]
 *
 * Everything visual falls back to the event JSON (logoUrl, backgroundUrl, dateStart, color) and can be
 * overridden per year through the config file — see config.example.json and types.ts (ThumbnailConfig).
 */

const { values: args } = parseArgs({
    options: {
        json: { type: 'string' },
        config: { type: 'string' },
        out: { type: 'string' },
        session: { type: 'string' },
        'only-video': { type: 'boolean', default: false },
        concurrency: { type: 'string', default: '5' },
    },
})

const main = async () => {
    if (!args.json) {
        console.error(
            'Missing --json <url>. Tip: it is the dataUrl returned by https://api.openplanner.fr/v1/<eventId>/event'
        )
        process.exit(1)
    }

    const config: ThumbnailConfig = args.config ? JSON.parse(await readFile(args.config, 'utf-8')) : {}
    const data = (await (await fetch(args.json + '?d=' + Date.now())).json()) as JsonData
    const { event, speakers } = data

    let sessions = data.sessions.filter((session) => session.title)
    if (args.session) {
        sessions = sessions.filter((session) => session.id === args.session)
    }
    if (args['only-video']) {
        sessions = sessions.filter((session) => session.videoLink)
    }
    console.log(`Event "${event.name}" — generating ${sessions.length} thumbnail(s)`)

    const outputDir = args.out ?? config.outputDir ?? path.join(import.meta.dirname, 'output', event.id)
    await mkdir(outputDir, { recursive: true })

    const [logo, background] = await Promise.all([
        fetchImage(config.logoUrl ?? event.logoUrl),
        fetchImage(config.backgroundUrl ?? event.backgroundUrl),
    ])
    const colors = {
        title: config.colors?.title ?? '#ffffff',
        text: config.colors?.text ?? '#ffffff',
        accent: config.colors?.accent ?? event.color ?? '#00B19D',
        background: config.colors?.background ?? event.colorBackground ?? '#1a1a2e',
    }
    const dateText = config.dateText ?? formatDate(event.dateStart, config.locale)

    const { errors } = await PromisePool.withConcurrency(Number(args.concurrency))
        .for(sessions)
        .process(async (session: JsonSession) => {
            const sessionSpeakers = session.speakerIds
                .map((id) => speakers.find((speaker) => speaker.id === id))
                .filter((speaker) => !!speaker)
            const speakersRender = await Promise.all(
                sessionSpeakers.map(async (speaker) => ({
                    name: speaker.name,
                    avatar: await fetchImage(speaker.photoUrl),
                }))
            )
            const image = await renderThumbnail({
                title: session.title,
                dateText,
                background,
                logo,
                speakers: speakersRender,
                colors,
                overlayOpacity: config.overlayOpacity ?? 0.6,
                titleFontSize: config.titleFontSize ?? 64,
                magicBorder: config.magicBorder ?? true,
                sparkles: config.sparkles ?? true,
                seed: session.id,
            })
            const filePath = path.join(outputDir, `${session.id}.jpg`)
            await writeFile(filePath, image)
            console.log(`✓ ${filePath} (${session.title})`)
        })

    for (const error of errors) {
        console.error(`✗ Failed for session ${error.item.id}: ${error.message}`)
    }
    console.log(`Done: ${sessions.length - errors.length}/${sessions.length} thumbnails in ${outputDir}`)
}

const formatDate = (isoDate: string | undefined, locale = 'en-US'): string => {
    if (!isoDate) {
        return ''
    }
    return new Date(isoDate).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' })
}

main()
