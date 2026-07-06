import { readFile } from 'node:fs/promises'

const cache = new Map<string, Promise<Buffer | null>>()

// Loads an image from a http(s) url or a local file path. Returns null on failure so a
// missing avatar/logo never aborts the whole batch.
export const fetchImage = (source: string | null | undefined): Promise<Buffer | null> => {
    if (!source) {
        return Promise.resolve(null)
    }
    const existing = cache.get(source)
    if (existing) {
        return existing
    }
    const promise = loadImage(source).catch((error: unknown) => {
        console.warn(`⚠️  Failed to load image ${source}: ${error instanceof Error ? error.message : error}`)
        return null
    })
    cache.set(source, promise)
    return promise
}

const loadImage = async (source: string): Promise<Buffer> => {
    if (source.startsWith('http://') || source.startsWith('https://')) {
        const response = await fetch(source)
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`)
        }
        return Buffer.from(await response.arrayBuffer())
    }
    return readFile(source)
}
