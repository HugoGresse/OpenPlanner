import { describe, expect, test } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

// Regression guard: the PUBLIC_FIELDS allowlist in getSelfSpeakerGET must
// NEVER include `customFields`. Custom fields are filtered separately to
// only the IDs flagged `editableBySpeaker` on the event — adding
// `customFields` to PUBLIC_FIELDS would short-circuit that filter and
// leak every custom field value back to the speaker via the magic-link
// endpoint, including admin/private ones.
//
// We read the source file and parse the allowlist literal directly so
// the assertion survives refactors that rename the variable, change the
// loop, or otherwise quietly re-add the key.
describe('getSelfSpeakerGET PUBLIC_FIELDS guard', () => {
    test('PUBLIC_FIELDS does not contain "customFields"', () => {
        const source = readFileSync(join(__dirname, 'getSelfSpeakerGET.ts'), 'utf8')
        const match = source.match(/PUBLIC_FIELDS:\s*\(keyof Speaker\)\[\]\s*=\s*\[([\s\S]*?)\]/)
        expect(match).not.toBeNull()
        const block = match![1]
        const keys = Array.from(block.matchAll(/'([^']+)'/g)).map((m) => m[1])
        expect(keys.length).toBeGreaterThan(0)
        expect(keys).not.toContain('customFields')
    })
})
