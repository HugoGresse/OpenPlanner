import { describe, expect, test } from 'vitest'
import { DEFAULT_API_URL, maskSecret, resolveProfileName, resolveSettings, upsertProfile } from './config.js'

const file = {
    current: 'prod',
    profiles: {
        prod: { eventId: 'e-prod', apiKey: 'k-prod' },
        local: { eventId: 'e-local', apiKey: 'k-local', apiUrl: 'http://localhost:3010/' },
    },
}

describe('resolveSettings', () => {
    test('uses the current profile and default API URL', () => {
        expect(resolveSettings({ flags: {}, env: {}, file })).toEqual({
            profile: 'prod',
            apiUrl: DEFAULT_API_URL,
            eventId: 'e-prod',
            apiKey: 'k-prod',
        })
    })

    test('flags beat env, env beats file, trailing slash stripped', () => {
        const settings = resolveSettings({
            flags: { eventId: 'e-flag' },
            env: { OPENPLANNER_EVENT_ID: 'e-env', OPENPLANNER_API_KEY: 'k-env', OPENPLANNER_PROFILE: 'local' },
            file,
        })
        expect(settings).toEqual({
            profile: 'local',
            apiUrl: 'http://localhost:3010',
            eventId: 'e-flag',
            apiKey: 'k-env',
        })
    })

    test('unknown profile leaves credentials undefined', () => {
        expect(resolveSettings({ flags: { profile: 'nope' }, env: {}, file }).apiKey).toBeUndefined()
    })
})

describe('upsertProfile', () => {
    test('merges fields, drops undefined, sets current when asked', () => {
        const next = upsertProfile(file, 'local', { apiKey: 'new', apiUrl: undefined }, true)
        expect(next.current).toBe('local')
        expect(next.profiles.local).toEqual({ eventId: 'e-local', apiKey: 'new', apiUrl: 'http://localhost:3010/' })
    })

    test('first profile becomes current even without --use', () => {
        expect(upsertProfile({ profiles: {} }, 'x', { eventId: '1' }, false).current).toBe('x')
    })
})

test('maskSecret', () => {
    expect(maskSecret(undefined)).toBeUndefined()
    expect(maskSecret('short')).toBe('****')
    expect(maskSecret('abcdefghijkl')).toBe('abcd…ijkl')
})

test('resolveProfileName: flag > env > file.current > default', () => {
    expect(resolveProfileName('x', { OPENPLANNER_PROFILE: 'env' }, file)).toBe('x')
    expect(resolveProfileName(undefined, { OPENPLANNER_PROFILE: 'env' }, file)).toBe('env')
    expect(resolveProfileName(undefined, {}, file)).toBe('prod')
    expect(resolveProfileName(undefined, {}, { profiles: {} })).toBe('default')
})
