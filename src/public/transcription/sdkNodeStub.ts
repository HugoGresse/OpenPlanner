// Empty stub aliased over the @gladiaio/sdk's node-only transports (ws / undici / fs / path).
// In the browser the SDK uses the native WebSocket and fetch; those `await import(...)` branches are
// guarded by `typeof WebSocket`/`process` checks and never run, but the bundler still has to resolve
// the specifiers — pointing them here keeps the browser bundle clean.
export default {}
