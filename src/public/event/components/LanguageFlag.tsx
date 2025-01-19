import 'flag-icons/css/flag-icons.min.css'
import { Box, SxProps, Theme } from '@mui/material'

interface LanguageFlagProps {
    language: string
    size?: 'sm' | 'md' | 'lg'
    className?: string
}

const isoToCountryCode: Record<string, string> = {
    en: 'gb',
    fr: 'fr',
    de: 'de',
    es: 'es',
    it: 'it',
    pt: 'pt',
    ru: 'ru',
    zh: 'cn',
    ja: 'jp',
    ko: 'kr',
    ar: 'sa',
    hi: 'in',
    nl: 'nl',
    pl: 'pl',
    tr: 'tr',
    vi: 'vn',
}

const languageToCountryCode: Record<string, string> = {
    English: 'gb',
    French: 'fr',
    German: 'de',
    Spanish: 'es',
    Italian: 'it',
    Portuguese: 'pt',
    Russian: 'ru',
    Chinese: 'cn',
    Japanese: 'jp',
    Korean: 'kr',
    Arabic: 'sa',
    Hindi: 'in',
    Dutch: 'nl',
    Polish: 'pl',
    Turkish: 'tr',
    Vietnamese: 'vn',
}

const sizeStyles: Record<string, SxProps<Theme>> = {
    sm: { width: 16, height: 16 },
    md: { width: 24, height: 24 },
    lg: { width: 32, height: 32 },
}

export const LanguageFlag = ({ language, size = 'md', className = '' }: LanguageFlagProps) => {
    // Try to get country code from ISO code first, then fall back to full language name
    const countryCode = isoToCountryCode[language.toLowerCase()] || languageToCountryCode[language] || 'unknown'

    if (countryCode === 'unknown') {
        return null
    }

    return (
        <Box
            component="span"
            className={`fi fi-${countryCode} ${className}`}
            sx={{
                ...sizeStyles[size],
                display: 'inline-block',
                borderRadius: '2px',
                flexShrink: 0,
            }}
            title={language}
            role="img"
            aria-label={`${language} flag`}
        />
    )
}
