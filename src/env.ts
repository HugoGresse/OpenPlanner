export const API_URL = import.meta.env.VITE_FIREBASE_OPEN_PLANNER_API_URL
// Direct Cloud Functions URL (bypasses Firebase Hosting). Required for the
// chat SSE endpoint because Firebase Hosting buffers streamed responses.
// Falls back to API_URL if not configured (the Hosting-backed URL).
export const FUNCTION_API_URL =
    import.meta.env.VITE_FIREBASE_OPEN_PLANNER_FUNCTION_URL || import.meta.env.VITE_FIREBASE_OPEN_PLANNER_API_URL
export const OpenSponsorsUrl = import.meta.env.VITE_OPEN_SPONSORS_URL
