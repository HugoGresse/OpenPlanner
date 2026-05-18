import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { setDoc, getDoc, doc, setLogLevel } from 'firebase/firestore'
import { ref, uploadBytes, getBytes } from 'firebase/storage'

const __dirname = dirname(fileURLToPath(import.meta.url))

const PROJECT_ID = 'op-rules-test'
const EVENT_ID = 'evt-1'
const SPEAKER_ID = 'spk-1'
const OWNER_UID = 'admin-owner'
const MEMBER_UID = 'admin-member'
const STRANGER_UID = 'stranger'

const log = (msg) => console.log(`  ✓ ${msg}`)
const fail = (msg, err) => {
    console.error(`  ✗ ${msg}`)
    if (err) console.error(err)
    process.exitCode = 1
}

const main = async () => {
    setLogLevel('error')
    const testEnv = await initializeTestEnvironment({
        projectId: PROJECT_ID,
        firestore: {
            rules: readFileSync(join(__dirname, 'firestore.rules'), 'utf8'),
            host: '127.0.0.1',
            port: 8080,
        },
        storage: {
            rules: readFileSync(join(__dirname, 'firebase.storage.rules'), 'utf8'),
            host: '127.0.0.1',
            port: 9199,
        },
    })

    await testEnv.withSecurityRulesDisabled(async (ctx) => {
        const db = ctx.firestore()
        await setDoc(doc(db, 'events', EVENT_ID), {
            owner: OWNER_UID,
            members: [MEMBER_UID],
            name: 'Test',
        })
        await setDoc(doc(db, 'events', EVENT_ID, 'speakers', SPEAKER_ID), { name: 'Jane' })
        await setDoc(doc(db, 'events', EVENT_ID, 'speakerEditTokens', 'tok-1'), {
            speakerId: SPEAKER_ID,
            tokenHash: 'deadbeef',
        })
        await setDoc(doc(db, 'events', EVENT_ID, 'speakerPendingEdits', 'req-1'), {
            speakerId: SPEAKER_ID,
            status: 'pending',
        })
        await setDoc(doc(db, 'events', EVENT_ID, 'speakerEditRateLimits', 'rl-1'), { count: 1 })
        await setDoc(doc(db, 'mail', 'mail-1'), { to: 'x@example.com' })
    })

    const owner = testEnv.authenticatedContext(OWNER_UID).firestore()
    const member = testEnv.authenticatedContext(MEMBER_UID).firestore()
    const stranger = testEnv.authenticatedContext(STRANGER_UID).firestore()
    const guest = testEnv.unauthenticatedContext().firestore()

    const cases = [
        // speakerEditTokens — no client access regardless of role
        [
            'guest cannot read speakerEditTokens',
            () => assertFails(getDoc(doc(guest, 'events', EVENT_ID, 'speakerEditTokens', 'tok-1'))),
        ],
        [
            'event member cannot read speakerEditTokens',
            () => assertFails(getDoc(doc(member, 'events', EVENT_ID, 'speakerEditTokens', 'tok-1'))),
        ],
        [
            'event owner cannot read speakerEditTokens',
            () => assertFails(getDoc(doc(owner, 'events', EVENT_ID, 'speakerEditTokens', 'tok-1'))),
        ],
        [
            'guest cannot write speakerEditTokens',
            () =>
                assertFails(
                    setDoc(doc(guest, 'events', EVENT_ID, 'speakerEditTokens', 'tok-x'), {
                        speakerId: SPEAKER_ID,
                        tokenHash: 'bad',
                    })
                ),
        ],
        [
            'event member cannot write speakerEditTokens',
            () =>
                assertFails(
                    setDoc(doc(member, 'events', EVENT_ID, 'speakerEditTokens', 'tok-x'), {
                        speakerId: SPEAKER_ID,
                        tokenHash: 'bad',
                    })
                ),
        ],

        // speakerPendingEdits — locked down for everyone
        [
            'guest cannot read speakerPendingEdits',
            () => assertFails(getDoc(doc(guest, 'events', EVENT_ID, 'speakerPendingEdits', 'req-1'))),
        ],
        [
            'event member cannot read speakerPendingEdits',
            () => assertFails(getDoc(doc(member, 'events', EVENT_ID, 'speakerPendingEdits', 'req-1'))),
        ],
        [
            'event owner cannot write speakerPendingEdits',
            () =>
                assertFails(
                    setDoc(doc(owner, 'events', EVENT_ID, 'speakerPendingEdits', 'req-x'), {
                        speakerId: SPEAKER_ID,
                        status: 'pending',
                    })
                ),
        ],

        // speakerEditRateLimits — locked down
        [
            'guest cannot read speakerEditRateLimits',
            () => assertFails(getDoc(doc(guest, 'events', EVENT_ID, 'speakerEditRateLimits', 'rl-1'))),
        ],
        [
            'event member cannot read speakerEditRateLimits',
            () => assertFails(getDoc(doc(member, 'events', EVENT_ID, 'speakerEditRateLimits', 'rl-1'))),
        ],
        [
            'stranger cannot bump rate limit',
            () =>
                assertFails(
                    setDoc(doc(stranger, 'events', EVENT_ID, 'speakerEditRateLimits', 'rl-y'), {
                        count: 99,
                    })
                ),
        ],

        // mail — locked down
        ['guest cannot read mail', () => assertFails(getDoc(doc(guest, 'mail', 'mail-1')))],
        [
            'event owner cannot inject mail doc',
            () => assertFails(setDoc(doc(owner, 'mail', 'spam'), { to: 'x@example.com' })),
        ],
        ['event member cannot read mail', () => assertFails(getDoc(doc(member, 'mail', 'mail-1')))],

        // baseline: speakers collection still works for admins (regression check)
        [
            'event owner can still read speakers',
            () => assertSucceeds(getDoc(doc(owner, 'events', EVENT_ID, 'speakers', SPEAKER_ID))),
        ],
        [
            'stranger cannot read speakers',
            () => assertFails(getDoc(doc(stranger, 'events', EVENT_ID, 'speakers', SPEAKER_ID))),
        ],

        // Storage rules — pending-edit photo path lives under events/{eventId}/
        //
        // Notes: cross-service `firestore.get()` in storage rules cannot be
        // exercised reliably in the emulator-based rules-unit-testing harness
        // (it returns null in the storage rules runtime). So we only assert
        // the deny paths that fail at the `request.auth != null` check or
        // the `in members` check (which short-circuits on a null lookup
        // identically to a real "user not a member" denial). The member-write
        // happy path is exercised by the production `uploadBufferToStorage`
        // calls via the admin SDK, which bypasses these rules entirely.
        [
            'unauth cannot upload pending-edit photo to storage',
            () => {
                const storage = testEnv.unauthenticatedContext().storage()
                const r = ref(storage, `events/${EVENT_ID}/pending-edit-${SPEAKER_ID}-1.png`)
                return assertFails(uploadBytes(r, new Uint8Array([1, 2, 3])))
            },
        ],
        [
            'stranger (auth but not member) cannot upload pending-edit photo',
            () => {
                const storage = testEnv.authenticatedContext(STRANGER_UID).storage()
                const r = ref(storage, `events/${EVENT_ID}/pending-edit-${SPEAKER_ID}-2.png`)
                return assertFails(uploadBytes(r, new Uint8Array([1, 2, 3])))
            },
        ],
        [
            'anyone can read public event storage file',
            async () => {
                await testEnv.withSecurityRulesDisabled(async (ctx) => {
                    const r = ref(ctx.storage(), `events/${EVENT_ID}/readable.png`)
                    await uploadBytes(r, new Uint8Array([1, 2, 3]))
                })
                const r = ref(testEnv.unauthenticatedContext().storage(), `events/${EVENT_ID}/readable.png`)
                return assertSucceeds(getBytes(r))
            },
        ],
    ]

    let failed = 0
    for (const [name, run] of cases) {
        try {
            await run()
            log(name)
        } catch (err) {
            failed += 1
            fail(name, err)
        }
    }

    await testEnv.cleanup()

    if (failed > 0) {
        console.error(`\n${failed} rules test(s) failed`)
        process.exit(1)
    }
    console.log(`\n${cases.length} rules tests passed`)
}

main().catch((err) => {
    console.error(err)
    process.exit(1)
})
