import type { LiveV2TranscriptionLanguageCode } from '@gladiaio/sdk'

// All knobs the live caption screen exposes. Mirrors the query-string contract the old gladia.html
// page used, plus the Gladia session tuning (languages, custom vocabulary, endpointing).
export type TranscriptionSettings = {
    fontSize: number
    lineHeight: number
    fontName: string
    backgroundColor: string
    textColor: string
    maxLines: number
    alignment: 'left' | 'center' | 'right'
    languages: LiveV2TranscriptionLanguageCode[]
    customVocabulary: string[]
    endpointing: number
    hideSettings: boolean
}

export const FONT_OPTIONS = ['Arial', 'Comic Sans MS', 'Times New Roman', 'Courier New', 'Georgia', 'Verdana']

// Default custom vocabulary carried over from the previous gladia.html implementation.
const DEFAULT_VOCABULARY = ['Sunny Tech', 'Clever Cloud', 'Gladia', 'Billetweb']

export const DEFAULT_SETTINGS: TranscriptionSettings = {
    fontSize: 40,
    lineHeight: 1,
    fontName: 'Arial',
    backgroundColor: '000000',
    textColor: 'ffffff',
    maxLines: 3,
    alignment: 'left',
    languages: ['fr', 'en'],
    customVocabulary: DEFAULT_VOCABULARY,
    endpointing: 0.2,
    hideSettings: false,
}

// A bare "#rrggbb" or "rrggbb" both work; normalise to a CSS-usable "#rrggbb".
export const toCssColor = (value: string): string => (value.startsWith('#') ? value : `#${value}`)

// Drop a leading "#": we keep colors as bare hex in settings/URLs to match the old contract.
export const toHexColor = (value: string): string => (value.startsWith('#') ? value.slice(1) : value)

// Read settings from a URL query string, falling back to defaults for anything missing/invalid.
export const settingsFromQuery = (search: string): TranscriptionSettings => {
    const q = new URLSearchParams(search)
    const num = (key: string, fallback: number) => {
        const parsed = Number(q.get(key))
        return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
    }
    const csv = (raw: string | null): string[] | null =>
        raw
            ? raw
                  .split(',')
                  .map((s) => s.trim())
                  .filter(Boolean)
            : null

    const alignment = q.get('alignment')
    const languages = csv(q.get('languages')) as LiveV2TranscriptionLanguageCode[] | null

    return {
        fontSize: num('font_size', DEFAULT_SETTINGS.fontSize),
        lineHeight: num('line_height', DEFAULT_SETTINGS.lineHeight),
        fontName: q.get('font_name') || DEFAULT_SETTINGS.fontName,
        backgroundColor: toHexColor(q.get('background_color') || DEFAULT_SETTINGS.backgroundColor),
        textColor: toHexColor(q.get('text_color') || DEFAULT_SETTINGS.textColor),
        maxLines: Math.round(num('max_lines', DEFAULT_SETTINGS.maxLines)),
        alignment: alignment === 'left' || alignment === 'right' ? alignment : DEFAULT_SETTINGS.alignment,
        languages: languages?.length ? languages : DEFAULT_SETTINGS.languages,
        customVocabulary: csv(q.get('custom_vocabulary')) ?? DEFAULT_SETTINGS.customVocabulary,
        endpointing: num('endpointing', DEFAULT_SETTINGS.endpointing),
        hideSettings: q.get('hide_settings') === 'true',
    }
}
