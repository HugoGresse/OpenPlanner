import { Capability, RouteRef } from './capabilityTypes'
import { CONTENT_CAPABILITIES } from './contentCapabilities'
import { COMMUNITY_CAPABILITIES } from './communityCapabilities'
import { INTEGRATION_CAPABILITIES } from './integrationCapabilities'

export * from './capabilityTypes'

export const CAPABILITIES = [...CONTENT_CAPABILITIES, ...COMMUNITY_CAPABILITIES, ...INTEGRATION_CAPABILITIES] as const

export type CapabilityId = (typeof CAPABILITIES)[number]['id']

// Registered routes that are not event-admin capabilities, with the reason.
export const NON_CAPABILITY_ROUTES: Record<string, string> = {
    'OPTIONS /*': 'CORS preflight',
    'GET /hello': 'health check',
    'GET /v1/admin/usage': 'super admin only',
    'POST /v1/:eventId/speakers/request-edit-link': 'speaker self-service',
    'GET /v1/:eventId/speakers/:speakerId/self': 'speaker self-service',
    'POST /v1/:eventId/speakers/:speakerId/self/submit': 'speaker self-service',
    'POST /v1/:eventId/speakers/:speakerId/self/photo': 'speaker self-service',
    'POST /v1/:eventId/sponsors/jobPosts': 'sponsor self-service (event private id)',
    'POST /v1/:eventId/sponsors/job-posts': 'sponsor self-service (sponsor token)',
    'GET /v1/:eventId/sponsors/job-posts': 'sponsor self-service (sponsor token)',
    'PUT /v1/:eventId/sponsors/job-posts/:jobPostId': 'sponsor self-service (sponsor token)',
    'DELETE /v1/:eventId/sponsors/job-posts/:jobPostId': 'sponsor self-service (sponsor token)',
    'POST /v1/:eventId/sponsors/jobPosts/track-click': 'public click tracking',
    'POST /v1/:eventId/whatsapp/webhook': 'inbound GreenAPI webhook',
    'POST /v1/:eventId/slack/events': 'inbound Slack webhook',
    'POST /v1/:eventId/slack/interactions': 'inbound Slack webhook',
    'POST /v1/slack/events': 'inbound Slack webhook',
    'POST /v1/slack/interactions': 'inbound Slack webhook',
    'POST /v1/slack/work': 'internal Slack worker',
    'GET /v1/slack/oauth/callback': 'Slack OAuth redirect',
}

export const routeKey = ({ method, path }: RouteRef): string => `${method} ${path}`

export const getCapability = (id: CapabilityId): Capability => {
    const capability = (CAPABILITIES as readonly Capability[]).find((item) => item.id === id)
    if (!capability) throw new Error(`Unknown capability: ${id}`)
    return capability
}
