export const SLACK_BOT_SCOPES = [
    'app_mentions:read',
    'chat:write',
    'channels:history',
    'channels:read',
    'groups:history',
    'groups:read',
    'im:history',
    'mpim:history',
] as const

export type SlackAppConfig = {
    clientId: string
    clientSecret: string
    signingSecret: string
}

export const getSlackAppConfig = (env: NodeJS.ProcessEnv = process.env): SlackAppConfig | null => {
    const clientId = env.SLACK_CLIENT_ID?.trim()
    const clientSecret = env.SLACK_CLIENT_SECRET?.trim()
    const signingSecret = env.SLACK_SIGNING_SECRET?.trim()
    if (!clientId || !clientSecret || !signingSecret) return null
    return { clientId, clientSecret, signingSecret }
}

export const isOfficialSlackAppEnabled = (env: NodeJS.ProcessEnv = process.env) => getSlackAppConfig(env) !== null

export const buildSlackAuthorizeUrl = (clientId: string, state: string) => {
    const url = new URL('https://slack.com/oauth/v2/authorize')
    url.searchParams.set('client_id', clientId)
    url.searchParams.set('scope', SLACK_BOT_SCOPES.join(','))
    url.searchParams.set('state', state)
    return url.toString()
}

const LOCALHOST_RETURN = /^http:\/\/localhost(:\d+)?\//

export const isAllowedReturnTo = (returnTo: string, publicAppUrl: string | undefined): boolean => {
    if (LOCALHOST_RETURN.test(returnTo)) return true
    const base = (publicAppUrl ?? '').replace(/\/+$/, '')
    return base.length > 0 && (returnTo === base || returnTo.startsWith(`${base}/`))
}
