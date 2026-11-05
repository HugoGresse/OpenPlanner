// Shared schema fragments for api-key protected routes.
export const apiKeyQuerystring = {
    type: 'object',
    additionalProperties: false,
    properties: {
        apiKey: { type: 'string', description: 'The API key of the event' },
    },
}

export const eventIdParams = (extra: Record<string, string> = {}) => ({
    type: 'object',
    properties: {
        eventId: { type: 'string', description: 'Event ID' },
        ...Object.fromEntries(
            Object.entries(extra).map(([name, description]) => [name, { type: 'string', description }])
        ),
    },
    required: ['eventId', ...Object.keys(extra)],
})

export const apiKeySecurity = [{ apiKey: [] }]
