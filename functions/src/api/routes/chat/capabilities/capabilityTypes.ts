// Single source of truth of what an event admin can do, and through which surface: REST route, `openplanner`
// CLI command, chat assistant tool (in-app chat and Slack bot share it). Tools point at a capability id
// (`capability` in tools/*.ts), the system prompt lists the gaps, and the CLI skill embeds the rendered matrix.
// capabilities.test.ts fails when a route or a tool is added without an entry here.

export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'

export type RouteRef = { method: HttpMethod; path: string }

export type CapabilityDomain =
    | 'event'
    | 'publish'
    | 'exports'
    | 'sessions'
    | 'speakers'
    | 'pending edits'
    | 'sponsors'
    | 'job posts'
    | 'team'
    | 'faq'
    | 'files'
    | 'import'
    | 'day-of'
    | 'whatsapp'
    | 'bupher'
    | 'slack'
    | 'chat'

export type Capability = {
    id: string
    domain: CapabilityDomain
    summary: string
    route?: RouteRef
    // Command path as typed after `openplanner`.
    cli?: string
    // Why the assistant has no tool for it. Required exactly when no tool implements the capability.
    assistantGap?: string
}

export const r = (method: HttpMethod, path: string): RouteRef => ({ method, path: `/v1/:eventId${path}` })

export const WEB_ADMIN_ONLY = 'Only in the web admin, there is no API route for it yet.'
export const NOT_IN_ASSISTANT = 'Not in the assistant yet; use the CLI command or the web admin.'
