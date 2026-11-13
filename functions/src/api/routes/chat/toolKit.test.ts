import { afterEach, describe, expect, test, vi } from 'vitest'
import Type from 'typebox'
import { SessionDao } from '../../dao/sessionDao'
import { expectRejected, propose } from '../../testUtils/chatTools'
import { TypeBoxPatchTeamMember } from '../team/teamSchemas'
import { checkDateBounds, matchesRoute, parseBody, proposed, toJsonSchema } from './toolKit'

describe('toolKit', () => {
    afterEach(() => vi.restoreAllMocks())

    test('parseBody rejects unknown fields instead of dropping them, and types the value', () => {
        expect(parseBody(TypeBoxPatchTeamMember, { role: 'Lead' })).toEqual({ value: { role: 'Lead' } })
        expect(parseBody(TypeBoxPatchTeamMember, { rol: 'Lead' }).error).toMatch(
            /^Unknown field\(s\) "rol"\. Allowed: .*role/
        )
        expect(parseBody(TypeBoxPatchTeamMember, {}, { nonEmpty: true }).error).toBe(
            'patch must contain at least one field'
        )
        expect(parseBody(TypeBoxPatchTeamMember, ['x']).error).toBe('Expected a JSON object')
        expect(parseBody(TypeBoxPatchTeamMember, { order: '2' }).error).toBe('Invalid body: /order must be number')
        // Loose route schemas (no additionalProperties: false) still reject unknown keys.
        const loose = Type.Object({ name: Type.String() })
        expect(parseBody(loose, { name: 'a', nmae: 'b' }).error).toMatch(/Unknown field\(s\) "nmae"/)
        expect(parseBody(loose, { id: 'x', name: 'a' }, { omit: ['id'] })).toEqual({ value: { name: 'a' } })
    })

    test('toJsonSchema drops the generic length cap and spells nullable fields as type arrays', () => {
        const schema = toJsonSchema(
            Type.Object({
                bio: Type.Union([Type.String({ maxLength: 10000 }), Type.Null()]),
                site: Type.Union([Type.String({ format: 'uri' }), Type.Null()]),
                note: Type.String({ maxLength: 2000 }),
                id: Type.String(),
            }),
            ['id']
        )
        expect(schema.properties).toEqual({
            bio: { type: ['string', 'null'] },
            site: { type: ['string', 'null'], format: 'uri' },
            note: { type: 'string', maxLength: 2000 },
        })
        expect(schema.required).toEqual(['bio', 'site', 'note'])
    })

    test('checkDateBounds wants parseable ISO 8601 with an offset', () => {
        expect(checkDateBounds({ start: '2026-06-01T09:00:00Z', end: '2026-06-01T10:00:00+02:00' })).toBeNull()
        expect(checkDateBounds({ start: null, end: '' })).toBeNull()
        expect(checkDateBounds(undefined)).toBeNull()
        expect(checkDateBounds({ start: '2026-06-01T09:00:00' })).toMatch(
            /dates.start must be ISO 8601 with a UTC offset/
        )
        expect(checkDateBounds({ end: 'TBD' })).toMatch(/dates.end must be ISO 8601/)
    })

    test('proposed drops undefined values (Firestore rejects them) and fits the audit log limits', () => {
        const result = proposed(
            {},
            {
                summary: 's'.repeat(1200),
                endpoint: { method: 'PATCH', path: '/v1/evt/event' },
                target: { id: 'i'.repeat(300), label: 'l'.repeat(600) },
                diff: { before: { categories: [{ id: 'c', color: undefined }] }, after: { name: 'x' } },
            }
        )
        if (!result.ok) throw new Error(result.error)
        expect(result.draft).not.toHaveProperty('rationale')
        expect(result.draft.diff.before).toEqual({ categories: [{ id: 'c' }] })
        expect(result.draft.summary).toHaveLength(1000)
        expect(result.draft.target.id).toHaveLength(200)
        expect(result.draft.target.label).toHaveLength(500)
    })

    test('matchesRoute checks the method and the path template', () => {
        const route = { method: 'DELETE' as const, path: '/v1/:eventId/team/:memberId' }
        expect(matchesRoute(route, { method: 'DELETE', path: '/v1/evt/team/ada' })).toBe(true)
        expect(matchesRoute(route, { method: 'PATCH', path: '/v1/evt/team/ada' })).toBe(false)
        expect(matchesRoute(route, { method: 'DELETE', path: '/v1/evt/team' })).toBe(false)
    })

    test('an error thrown while building a proposal becomes a rejection the model can fix', async () => {
        vi.spyOn(SessionDao, 'doesSessionExist').mockRejectedValue(new Error('Path must be a non-empty string'))
        expectRejected(
            await propose('proposeDeleteSession', { sessionId: 's1', expectedSessionTitle: 'x' }),
            'Path must be a non-empty string'
        )
    })
})
