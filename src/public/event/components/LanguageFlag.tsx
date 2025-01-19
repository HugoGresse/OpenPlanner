import 'flag-icons/css/flag-icons.min.css'

interface LanguageFlagProps {
    language: string
    size?: 'sm' | 'md' | 'lg'
    className?: string
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

const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
}

export const LanguageFlag = ({ language, size = 'md', className = '' }: LanguageFlagProps) => {
    const countryCode = languageToCountryCode[language] || 'unknown'

    if (countryCode === 'unknown') {
        return null
    }

    return (
        <span
            className={`fi fi-${countryCode} rounded-sm ${sizeClasses[size]} ${className}`}
            title={language}
            role="img"
            aria-label={`${language} flag`}
        />
    )
}
