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

export const lazyWithRetry = <T extends ComponentType<any>>(factory: () => Promise<{ default: T }>) =>
    lazy(async () => {
        try {
            const mod = await factory()
            window.sessionStorage.removeItem(RELOAD_FLAG)
            return mod
        } catch (error) {
            const alreadyTried = window.sessionStorage.getItem(RELOAD_FLAG) === '1'
            if (isChunkLoadError(error) && !alreadyTried) {
                window.sessionStorage.setItem(RELOAD_FLAG, '1')
                window.location.reload()
                return new Promise<{ default: T }>(() => {})
            }
            throw error
        }
    })
