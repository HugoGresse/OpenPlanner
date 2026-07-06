// Magic-themed decorations (glowing gold frame + sparkle stars) drawn as one SVG layer
// on top of the background. Sparkle placement is deterministic per session (seeded by id)
// so re-runs produce identical thumbnails.

// Small deterministic PRNG (mulberry32) so a given seed always yields the same layout
const makeRng = (seed: number) => () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

const hashSeed = (text: string): number => {
    let hash = 2166136261
    for (let i = 0; i < text.length; i++) {
        hash ^= text.charCodeAt(i)
        hash = Math.imul(hash, 16777619)
    }
    return hash >>> 0
}

// Four-point sparkle star centered at (cx, cy) with the given outer radius
const sparkle = (cx: number, cy: number, radius: number, opacity: number): string => {
    const inner = radius * 0.26
    const points = [
        [cx, cy - radius],
        [cx + inner, cy - inner],
        [cx + radius, cy],
        [cx + inner, cy + inner],
        [cx, cy + radius],
        [cx - inner, cy + inner],
        [cx - radius, cy],
        [cx - inner, cy - inner],
    ]
        .map((point) => point.map((value) => Math.round(value * 10) / 10).join(','))
        .join(' ')
    return `<polygon points="${points}" fill="url(#sparkleFill)" opacity="${opacity}" filter="url(#sparkleGlow)"/>`
}

interface MagicOptions {
    width: number
    height: number
    margin: number
    accent: string
    seed: string
    border: boolean
    sparkles: boolean
    sparkleCount: number
    // Vertical band (y0..y1) kept clear of sparkles so text stays readable
    clearBandY: [number, number]
}

export const buildMagicSvg = (options: MagicOptions): string => {
    const { width, height, accent } = options
    const rng = makeRng(hashSeed(options.seed))

    const stars: string[] = []
    if (options.sparkles) {
        for (let i = 0; i < options.sparkleCount; i++) {
            const cx = rng() * width
            const cy = rng() * height
            if (cy > options.clearBandY[0] && cy < options.clearBandY[1] && cx < width * 0.72) {
                continue
            }
            stars.push(sparkle(cx, cy, 6 + rng() * 16, 0.35 + rng() * 0.5))
        }
    }

    const frame = options.border ? buildBorder(options) : ''

    return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <radialGradient id="sparkleFill" cx="0.5" cy="0.5" r="0.5">
                <stop offset="0" stop-color="#fff7e0"/>
                <stop offset="0.5" stop-color="${accent}"/>
                <stop offset="1" stop-color="${accent}" stop-opacity="0"/>
            </radialGradient>
            <linearGradient id="frameStroke" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stop-color="${accent}"/>
                <stop offset="0.5" stop-color="#fff2c4"/>
                <stop offset="1" stop-color="${accent}"/>
            </linearGradient>
            <filter id="sparkleGlow" x="-120%" y="-120%" width="340%" height="340%">
                <feGaussianBlur stdDeviation="2.4" result="blur"/>
                <feMerge>
                    <feMergeNode in="blur"/>
                    <feMergeNode in="SourceGraphic"/>
                </feMerge>
            </filter>
            <filter id="frameGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="5" result="blur"/>
                <feMerge>
                    <feMergeNode in="blur"/>
                    <feMergeNode in="SourceGraphic"/>
                </feMerge>
            </filter>
        </defs>
        ${frame}
        ${stars.join('\n')}
    </svg>`
}

const buildBorder = (options: MagicOptions): string => {
    const { width, height, margin, accent } = options
    const inset = Math.round(margin * 0.55)
    const w = width - 2 * inset
    const h = height - 2 * inset
    return `<g filter="url(#frameGlow)">
        <rect x="${inset}" y="${inset}" width="${w}" height="${h}" rx="18" fill="none"
              stroke="url(#frameStroke)" stroke-width="3" opacity="0.9"/>
        <rect x="${inset + 8}" y="${inset + 8}" width="${w - 16}" height="${h - 16}" rx="12" fill="none"
              stroke="${accent}" stroke-width="1" opacity="0.5"/>
    </g>
    ${sparkle(inset, inset, 16, 0.95)}
    ${sparkle(width - inset, inset, 16, 0.95)}
    ${sparkle(inset, height - inset, 16, 0.95)}
    ${sparkle(width - inset, height - inset, 16, 0.95)}`
}
