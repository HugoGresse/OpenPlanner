import { describe, expect, test } from 'vitest'
import { assertKnownFields, normalizeSessionBody } from './create.js'

describe('normalizeSessionBody', () => {
    test('translates session-resource names into the bulk vocabulary', () => {
        expect(
            normalizeSessionBody({
                title: 'T',
                speakers: ['s1'],
                format: 'f',
                category: 'c',
                track: 't',
                dates: { start: 'A', end: 'B' },
            })
        ).toEqual({
            title: 'T',
            speakerIds: ['s1'],
            formatId: 'f',
            categoryId: 'c',
            trackId: 't',
            dateStart: 'A',
            dateEnd: 'B',
        })
    })
    test('keeps bulk names untouched', () => {
        expect(normalizeSessionBody({ speakerIds: ['s'], formatName: 'Talk' })).toEqual({
            speakerIds: ['s'],
            formatName: 'Talk',
        })
    })
})

test('assertKnownFields names the typo and the allowed list', () => {
    expect(() => assertKnownFields({ name: 'A', compnay: 'X' }, ['name', 'company'], 'speaker')).toThrow(
        /compnay.*Allowed: name, company/
    )
    expect(() => assertKnownFields({ name: 'A' }, ['name'], 'speaker')).not.toThrow()
})
