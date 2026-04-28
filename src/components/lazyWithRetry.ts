import { ComponentType, lazy } from 'react'

// After a deploy, the hashed chunk URL referenced by an open tab no longer
// exists on the host. Firebase Hosting then serves index.html for the missing
// JS file (because of the `**` SPA rewrite), which fails to parse as a module
// and rejects the dynamic import — unmounting the tree and showing a blank
// page. We catch that rejection once, hard-reload to pick up the fresh
// index.html (and therefore the fresh chunk URLs), and use a sessionStorage
// flag to avoid looping forever if the failure is genuine.
const RELOAD_FLAG = 'openplanner.chunkReloadAttempted'

const isChunkLoadError = (error: unknown): boolean => {
    if (!(error instanceof Error)) return false
    const message = `${error.name} ${error.message}`
    return (
        /ChunkLoadError/i.test(message) ||
        /Loading chunk \S+ failed/i.test(message) ||
        /Failed to fetch dynamically imported module/i.test(message) ||
        /error loading dynamically imported module/i.test(message) ||
        /Importing a module script failed/i.test(message)
    )
}

const clearReloadFlag = (): void => {
    try {
        window.sessionStorage.removeItem(RELOAD_FLAG)
    } catch {
        // Ignore storage access failures so successful imports still resolve.
    }
}

const hasAlreadyRetried = (): boolean => {
    try {
        return window.sessionStorage.getItem(RELOAD_FLAG) === '1'
    } catch {
        // If storage is unavailable, avoid a reload attempt and surface the original error.
        return true
    }
}

const markReloadAttempted = (): void => {
    try {
        window.sessionStorage.setItem(RELOAD_FLAG, '1')
    } catch {
        // Ignore storage access failures; caller will continue with a safe fallback path.
    }
}

export const lazyWithRetry = <T extends ComponentType<any>>(factory: () => Promise<{ default: T }>) =>
    lazy(async () => {
        try {
            const mod = await factory()
            clearReloadFlag()
            return mod
        } catch (error) {
            const alreadyTried = hasAlreadyRetried()
            if (isChunkLoadError(error) && !alreadyTried) {
                markReloadAttempted()
                window.location.reload()
                return new Promise<{ default: T }>(() => {})
            }
            throw error
        }
    })
