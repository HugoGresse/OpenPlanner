import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'url'

// @gladiaio/sdk ships isomorphic transports that `await import('ws' | 'undici')`. Those branches are
// guarded for node and never run in the browser, but the bundler still resolves the specifiers — alias
// them to an empty stub for the browser build. Scoped to non-test mode: vitest (including the functions
// project, which climbs up to this config) must keep the real node builtins so `path`/`fs` work.
const sdkNodeStub = fileURLToPath(new URL('./src/public/transcription/sdkNodeStub.ts', import.meta.url))

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
    plugins: [react()],
    resolve: {
        alias: mode === 'test' ? {} : { ws: sdkNodeStub, undici: sdkNodeStub },
    },
    server: {
        port: 3000,
    },
}))
