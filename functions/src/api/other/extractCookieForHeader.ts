export const extractCookieForHeader = (setCookieStr: string) => {
    return setCookieStr
        .split(',')
        .map((cookie) => cookie.split(';')[0].trim())
        .join('; ')
}
