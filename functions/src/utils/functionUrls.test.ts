import { describe, expect, test } from 'vitest'
import { functionBaseUrl, isDev } from './functionUrls'

describe('functionBaseUrl', () => {
    test('emulator wins over NODE_ENV and falls back to GCLOUD_PROJECT', () => {
        const env = { FUNCTIONS_EMULATOR: 'true', NODE_ENV: 'development', PORT: '/tmp/x.sock', GCLOUD_PROJECT: 'proj' }
        expect(functionBaseUrl('api', env)).toBe('http://localhost:5001/proj/europe-west1/api')
        expect(functionBaseUrl('serviceApi', { ...env, G_FIREBASE_PROJECT_ID: 'configured' })).toBe(
            'http://localhost:5001/configured/europe-west1/serviceApi'
        )
        expect(isDev(env)).toBe(true)
    })

    test('dev server only applies to the api function', () => {
        expect(functionBaseUrl('api', { NODE_ENV: 'development', PORT: '3011' })).toBe('http://localhost:3011')
        expect(functionBaseUrl('api', { NODE_ENV: 'development' })).toBe('http://localhost:3010')
        expect(functionBaseUrl('serviceApi', { NODE_ENV: 'development' })).toBe('https://serviceapi.openplanner.fr')
    })

    test('production otherwise', () => {
        expect(functionBaseUrl('api', { NODE_ENV: 'test' })).toBe('https://api.openplanner.fr')
        expect(isDev({})).toBe(false)
    })
})
