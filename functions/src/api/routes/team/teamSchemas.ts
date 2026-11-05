import Type from 'typebox'

const MAX_STRING_LENGTH = 10000
const NullableString = Type.Union([Type.String({ maxLength: MAX_STRING_LENGTH }), Type.Null()])
const NullableUri = Type.Union([Type.String({ format: 'uri' }), Type.Null()])

export const SocialSchema = Type.Object({
    name: Type.String({ maxLength: MAX_STRING_LENGTH }),
    icon: Type.Optional(Type.String()),
    link: Type.String({ format: 'uri' }),
})

export const TeamMemberSchema = Type.Object({
    id: Type.String(),
    name: Type.String(),
    bio: Type.Optional(NullableString),
    role: Type.Optional(NullableString),
    team: Type.Optional(NullableString),
    order: Type.Optional(Type.Number()),
    teamOrder: Type.Optional(Type.Number()),
    photoUrl: Type.Optional(NullableUri),
    socials: Type.Optional(Type.Array(SocialSchema)),
})

export const TypeBoxCreateTeamMember = Type.Object(
    {
        id: Type.Optional(Type.String({ minLength: 1, maxLength: MAX_STRING_LENGTH })),
        name: Type.String({ minLength: 1, maxLength: MAX_STRING_LENGTH }),
        bio: Type.Optional(NullableString),
        role: Type.Optional(Type.String({ maxLength: MAX_STRING_LENGTH })),
        team: Type.Optional(Type.String({ maxLength: MAX_STRING_LENGTH })),
        order: Type.Optional(Type.Number()),
        teamOrder: Type.Optional(Type.Number()),
        photoUrl: Type.Optional(NullableUri),
        socials: Type.Optional(Type.Array(SocialSchema)),
    },
    { additionalProperties: false }
)
