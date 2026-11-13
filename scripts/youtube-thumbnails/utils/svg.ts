export const escapeXml = (text: string): string =>
    text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;')

// Rough width estimate for a bold sans-serif glyph, good enough for wrapping
const CHAR_WIDTH_RATIO = 0.55

export const wrapText = (text: string, maxWidth: number, fontSize: number, maxLines: number): string[] => {
    const maxChars = Math.max(8, Math.floor(maxWidth / (fontSize * CHAR_WIDTH_RATIO)))
    const words = text.trim().split(/\s+/)
    const lines: string[] = []
    let current = ''

    for (const word of words) {
        const candidate = current ? `${current} ${word}` : word
        if (candidate.length <= maxChars || !current) {
            current = candidate
        } else {
            lines.push(current)
            current = word
        }
    }
    if (current) {
        lines.push(current)
    }

    if (lines.length > maxLines) {
        const kept = lines.slice(0, maxLines)
        kept[maxLines - 1] = kept[maxLines - 1].slice(0, maxChars - 1).trimEnd() + '…'
        return kept
    }
    return lines
}

// Packs speaker names into ' · '-joined lines that each fit within maxWidth.
// A single name longer than the line stays on its own line (never split mid-name).
export const packNames = (names: string[], maxWidth: number, fontSize: number): string[] => {
    const fits = (text: string) => text.length * fontSize * CHAR_WIDTH_RATIO <= maxWidth
    const lines: string[] = []
    let current = ''

    for (const name of names) {
        const candidate = current ? `${current} · ${name}` : name
        if (!current || fits(candidate)) {
            current = candidate
        } else {
            lines.push(current)
            current = name
        }
    }
    if (current) {
        lines.push(current)
    }
    return lines
}

export const getInitials = (name: string): string =>
    name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? '')
        .join('')
