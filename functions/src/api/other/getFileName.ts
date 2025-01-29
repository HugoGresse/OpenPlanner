export const getFileName = (url: string) => {
    const cleanUrl = url.split('?')[0] // remove query params
    return cleanUrl.substring(cleanUrl.lastIndexOf('/') + 1) || `${Date.now()}.png`
}
