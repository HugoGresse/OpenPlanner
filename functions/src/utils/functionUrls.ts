export type OpenPlannerFunction = 'api' | 'serviceApi'

const REGION = 'europe-west1'
const DEV_SERVER_PORT = 3010
const PRODUCTION_URLS: Record<OpenPlannerFunction, string> = {
    api: 'https://api.openplanner.fr',
    serviceApi: 'https://serviceapi.openplanner.fr',
}

export const isDev = (env: NodeJS.ProcessEnv = process.env) => env.FUNCTIONS_EMULATOR === 'true'

// Base URL of a deployed function for the current runtime: Firebase emulator, the
// standalone dev server (api only, `npm run dev:emulator`), or production.
export const functionBaseUrl = (name: OpenPlannerFunction, env: NodeJS.ProcessEnv = process.env): string => {
    if (isDev(env)) {
        const projectId = env.G_FIREBASE_PROJECT_ID || env.GCLOUD_PROJECT || ''
        return `http://localhost:5001/${projectId}/${REGION}/${name}`
    }
    if (env.NODE_ENV === 'development' && name === 'api') return `http://localhost:${env.PORT || DEV_SERVER_PORT}`
    return PRODUCTION_URLS[name]
}
