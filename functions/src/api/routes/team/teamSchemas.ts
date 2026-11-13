import Type from 'typebox'
import { MAX_STRING_LENGTH, NullableString, NullableUri, SocialSchema } from '../../other/routeSchemas'

const StoredString = Type.Union([Type.String(), Type.Null()])

// Read side: no `format` constraints, Firestore documents written by the web admin may hold '' for photoUrl.
export const TeamMemberSchema = Type.Object({
    id: Type.String(),
    name: Type.String(),
    bio: Type.Optional(StoredString),
    role: Type.Optional(StoredString),
    team: Type.Optional(StoredString),
    order: Type.Optional(Type.Number()),
    teamOrder: Type.Optional(Type.Number()),
    photoUrl: Type.Optional(StoredString),
    socials: Type.Optional(
        Type.Array(Type.Object({ name: Type.String(), icon: Type.Optional(Type.String()), link: Type.String() }))
    ),
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

const { id: _id, name: _name, ...patchableMemberFields } = TypeBoxCreateTeamMember.properties

export const TypeBoxPatchTeamMember = Type.Object(
    { ...patchableMemberFields, name: Type.Optional(Type.String({ minLength: 1, maxLength: MAX_STRING_LENGTH })) },
    { additionalProperties: false, minProperties: 1 }
)
