const cookieAttributes = new Set([
    'expires',
    'max-age',
    'domain',
    'path',
    'secure',
    'httponly',
    'samesite',
    'priority',
    'partitioned',
])

export const extractCookieForHeader = (setCookieStr: string) => {
    const parts = setCookieStr.split(';').flatMap((part) => part.split(','))
    const cookies: string[] = []
    for (const part of parts) {
        const trimmed = part.trim()
        const eqIndex = trimmed.indexOf('=')
        if (eqIndex === -1) continue
        const name = trimmed.substring(0, eqIndex).trim()
        if (!name || cookieAttributes.has(name.toLowerCase())) continue
        cookies.push(trimmed)
    }
    return cookies.join('; ')
}
