export const formatBytes = (bytes: number): string => {
    if (bytes >= 1024 * 1024) {
        return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
    }
    if (bytes >= 1024) {
        return `${Math.round(bytes / 1024)} KB`
    }
    return `${bytes} B`
}
