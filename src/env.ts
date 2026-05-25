export const API_URL = import.meta.env.VITE_FIREBASE_OPEN_PLANNER_API_URL
// Direct Cloud Functions URL (bypasses Firebase Hosting). Required for the
// chat SSE endpoint because Firebase Hosting buffers streamed responses.
// Falls back to API_URL if not configured (the Hosting-backed URL).
export const FUNCTION_API_URL =
    import.meta.env.VITE_FIREBASE_OPEN_PLANNER_FUNCTION_URL || import.meta.env.VITE_FIREBASE_OPEN_PLANNER_API_URL
export const OpenSponsorsUrl = import.meta.env.VITE_OPEN_SPONSORS_URL
// Endpoint of the self-hosted Cap captcha service used by the public
// speaker self-edit flow. Configurable so each deploy can point at its
// own Cap instance; falls back to the openplanner.fr hosted one for
// backwards compatibility with existing installs.
export const CAP_API_ENDPOINT = import.meta.env.VITE_CAP_API_ENDPOINT || 'https://captcha.openplanner.fr/'
