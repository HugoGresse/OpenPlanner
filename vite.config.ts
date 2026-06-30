import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'url'

// @gladiaio/sdk ships isomorphic transports that `await import('ws' | 'undici')` and the prerecorded
// client that `await import('fs' | 'path')`. Those branches are guarded for node and never run in the
// browser, but the bundler still resolves the specifiers — alias them to an empty stub.
const sdkNodeStub = fileURLToPath(new URL('./src/public/transcription/sdkNodeStub.ts', import.meta.url))

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            ws: sdkNodeStub,
            undici: sdkNodeStub,
            fs: sdkNodeStub,
            path: sdkNodeStub,
        },
    },
    server: {
        port: 3000,
    },
})
