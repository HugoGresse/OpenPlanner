import sharp, { OverlayOptions } from 'sharp'
import { RenderInput, SpeakerRender } from '../types.js'
import { escapeXml, getInitials, packNames, wrapText } from './svg.js'
import { buildMagicSvg } from './magic.js'

export const WIDTH = 1280
export const HEIGHT = 720
const MARGIN = 60
const LOGO_HEIGHT = 130
const BORDER_INSET = Math.round(MARGIN * 0.55) // must match the frame inset in magic.ts
const LOGO_PADDING = 22 // gap between the frame and the logo
const FONT = 'Arial, Helvetica, sans-serif'

const getAvatarSize = (speakerCount: number): number => (speakerCount > 3 ? 120 : 150)

export const renderThumbnail = async (input: RenderInput): Promise<Buffer> => {
    const base = await buildBase(input)
    const composites: OverlayOptions[] = []

    composites.push({ input: Buffer.from(buildOverlaySvg(input)), top: 0, left: 0 })

    if (input.magicBorder || input.sparkles) {
        const magic = buildMagicSvg({
            width: WIDTH,
            height: HEIGHT,
            margin: MARGIN,
            accent: input.colors.accent,
            seed: input.seed,
            border: input.magicBorder,
            sparkles: input.sparkles,
            sparkleCount: 42,
            clearBandY: [220, 420],
        })
        composites.push({ input: Buffer.from(magic), top: 0, left: 0 })
    }

    if (input.logo) {
        const logo = await sharp(input.logo).resize({ height: LOGO_HEIGHT }).png().toBuffer()
        const logoPos = BORDER_INSET + LOGO_PADDING
        composites.push({ input: logo, top: logoPos, left: logoPos })
    }

    const avatarSize = getAvatarSize(input.speakers.length)
    const avatarY = HEIGHT - MARGIN - avatarSize
    for (const [index, speaker] of input.speakers.entries()) {
        const avatar = await buildAvatar(speaker, avatarSize, input.colors.accent)
        composites.push({ input: avatar, top: avatarY, left: MARGIN + index * (avatarSize + 20) })
    }

    return sharp(base).composite(composites).jpeg({ quality: 90 }).toBuffer()
}

const buildBase = async (input: RenderInput): Promise<Buffer> => {
    if (input.background) {
        return sharp(input.background).resize(WIDTH, HEIGHT, { fit: 'cover' }).png().toBuffer()
    }
    return sharp({
        create: { width: WIDTH, height: HEIGHT, channels: 3, background: input.colors.background },
    })
        .png()
        .toBuffer()
}

// Single SVG layer holding the darkening gradient and every text element
const buildOverlaySvg = (input: RenderInput): string => {
    const { colors, overlayOpacity } = input

    const fontSize = input.title.length > 70 ? Math.round(input.titleFontSize * 0.8) : input.titleFontSize
    const titleLines = wrapText(input.title, WIDTH - 2 * MARGIN, fontSize, 3)
    const lineHeight = Math.round(fontSize * 1.25)
    const titleTop = 320 - ((titleLines.length - 1) * lineHeight) / 2
    const title = titleLines
        .map(
            (line, i) =>
                `<text x="${MARGIN}" y="${
                    titleTop + i * lineHeight
                }" font-family="${FONT}" font-size="${fontSize}" font-weight="bold" fill="${colors.title}">${escapeXml(
                    line
                )}</text>`
        )
        .join('\n')

    const avatarSize = getAvatarSize(input.speakers.length)
    const namesX = MARGIN + input.speakers.length * (avatarSize + 20) + 10
    const avatarCenterY = HEIGHT - MARGIN - avatarSize / 2
    const namesFontSize = input.speakers.length > 2 ? 38 : 46
    const nameLines = packNames(
        input.speakers.map((speaker) => speaker.name),
        WIDTH - namesX - BORDER_INSET - 10,
        namesFontSize
    )
    const nameLineHeight = Math.round(namesFontSize * 1.2)
    const namesTop = avatarCenterY - ((nameLines.length - 1) * nameLineHeight) / 2
    const names = nameLines
        .map(
            (line, i) =>
                `<text x="${namesX}" y="${
                    namesTop + i * nameLineHeight
                }" dominant-baseline="central" font-family="${FONT}" font-size="${namesFontSize}" font-weight="bold" fill="${
                    colors.text
                }">${escapeXml(line)}</text>`
        )
        .join('\n')

    const date = input.dateText
        ? `<text x="${
              WIDTH - MARGIN
          }" y="95" text-anchor="end" font-family="${FONT}" font-size="36" font-weight="bold" fill="${
              colors.text
          }">${escapeXml(input.dateText)}</text>`
        : ''

    return `<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id="darken" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stop-color="#000000" stop-opacity="${overlayOpacity * 0.5}"/>
                <stop offset="0.45" stop-color="#000000" stop-opacity="${overlayOpacity}"/>
                <stop offset="1" stop-color="#000000" stop-opacity="${Math.min(1, overlayOpacity * 1.4)}"/>
            </linearGradient>
        </defs>
        <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#darken)"/>
        ${date}
        ${title}
        ${names}
    </svg>`
}

const buildAvatar = async (speaker: SpeakerRender, size: number, accent: string): Promise<Buffer> => {
    const circleMask = Buffer.from(
        `<svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}"/></svg>`
    )
    if (speaker.avatar) {
        try {
            return await sharp(speaker.avatar)
                .resize(size, size, { fit: 'cover' })
                .composite([{ input: circleMask, blend: 'dest-in' }])
                .png()
                .toBuffer()
        } catch {
            // corrupted/unsupported image: fall through to the initials fallback
        }
    }
    const initials = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
        <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="${accent}"/>
        <text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" font-family="${FONT}" font-size="${Math.round(
        size * 0.4
    )}" font-weight="bold" fill="#ffffff">${escapeXml(getInitials(speaker.name))}</text>
    </svg>`
    return sharp(Buffer.from(initials)).png().toBuffer()
}
