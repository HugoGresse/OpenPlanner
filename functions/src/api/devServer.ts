import './other/typeBoxAdditionalsFormats'
import { setupFastify } from './setupFastify'

// Standalone Fastify server for local development (`npm run dev:emulator`).
// Pair it with the Firebase Emulator Suite: the *_EMULATOR_HOST env vars set in
// the npm script make firebase-admin target the local emulators instead of the
// live project.
const start = async () => {
    const fastify = setupFastify()
    const port = Number(process.env.PORT || 3010)
    await fastify.listen({ port, host: '127.0.0.1' })
    console.log(`OpenPlanner API dev server: http://localhost:${port} (swagger UI at /)`)
}

start().catch((error) => {
    console.error(error)
    process.exit(1)
})
