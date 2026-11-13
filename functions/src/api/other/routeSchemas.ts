import Type, { TProperties } from 'typebox'

// Shared schema fragments for api-key protected routes.
export const MAX_STRING_LENGTH = 10000
export const NullableString = Type.Union([Type.String({ maxLength: MAX_STRING_LENGTH }), Type.Null()])
export const NullableUri = Type.Union([Type.String({ format: 'uri' }), Type.Null()])

export const SocialSchema = Type.Object(
    {
        name: Type.String({ maxLength: MAX_STRING_LENGTH }),
        icon: Type.Optional(Type.String()),
        link: Type.String({ format: 'uri' }),
    },
    { additionalProperties: false }
)

export const apiKeyQuerystring = {
    type: 'object',
    additionalProperties: false,
    properties: {
        apiKey: { type: 'string', description: 'The API key of the event' },
    },
}

export const eventIdParams = (extra: TProperties = {}) =>
    Type.Object({ eventId: Type.String({ description: 'Event ID' }), ...extra })

export const apiKeySecurity = [{ apiKey: [] }]
